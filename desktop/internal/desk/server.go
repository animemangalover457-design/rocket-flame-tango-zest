package desk

import (
	"encoding/json"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type App struct {
	root    string
	http    *http.Server
	mu      sync.Mutex
	llama   *exec.Cmd
	port    int
	logFile *os.File
	busy    bool
}

func Start(root string) (*App, string, error) {
	app := &App{root: root}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, "", err
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/bootstrap", app.handleBootstrap)
	mux.HandleFunc("/api/state", app.handleState)
	mux.HandleFunc("/api/file", app.handleFile)
	mux.HandleFunc("/api/chat", app.handleChat)
	mux.HandleFunc("/api/offline", app.handleOffline)
	mux.HandleFunc("/api/offline/runtime", app.handleRuntime)
	mux.HandleFunc("/api/offline/model", app.handleModel)
	mux.HandleFunc("/api/offline/start", app.handleStart)
	mux.HandleFunc("/api/offline/stop", app.handleStop)
	mux.HandleFunc("/api/reveal", app.handleReveal)
	mux.HandleFunc("/", app.handleStatic)
	app.http = &http.Server{
		Handler:           localOnly(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}
	go func() { _ = app.http.Serve(listener) }()
	return app, listener.Addr().String(), nil
}

func (a *App) Title() string {
	return a.loadSettings().WindowTitle
}

func (a *App) Close() {
	a.stopOffline()
	if a.http != nil {
		_ = a.http.Close()
	}
}

func localOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			http.Error(w, "local only", http.StatusForbidden)
			return
		}
		ip := net.ParseIP(host)
		if ip == nil || !ip.IsLoopback() {
			http.Error(w, "local only", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) handleStatic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	if r.URL.Path == "/icon.ico" {
		http.ServeFile(w, r, filepath.Join(a.root, "icon.ico"))
		return
	}
	rel := strings.TrimPrefix(r.URL.Path, "/")
	if rel == "" {
		rel = "index.html"
	}
	full, err := safeJoin(filepath.Join(a.root, "interface"), rel)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	http.ServeFile(w, r, full)
}

func (a *App) handleBootstrap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	history := json.RawMessage("[]")
	if body, err := os.ReadFile(filepath.Join(a.root, "chats", "history.json")); err == nil && json.Valid(body) {
		history = body
	}
	presets := a.presets()
	writeJSONResponse(w, map[string]any{
		"settings":    a.loadSettings(),
		"keys":        a.loadKeys(),
		"providers":   a.loadProviders(),
		"personality": a.personality(),
		"presets":     presets,
		"history":     history,
		"offline":     a.offlineStatus(),
		"catalog":     a.loadCatalog(),
	})
}

func (a *App) presets() []map[string]string {
	dir := filepath.Join(a.root, "personality", "presets")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	out := make([]map[string]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".txt") {
			continue
		}
		body, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			continue
		}
		text := string(body)
		name := strings.TrimSuffix(entry.Name(), ".txt")
		if strings.HasPrefix(text, "# ") {
			line, rest, _ := strings.Cut(text, "\n")
			name = strings.TrimPrefix(line, "# ")
			text = rest
		}
		out = append(out, map[string]string{
			"id":   strings.TrimSuffix(entry.Name(), ".txt"),
			"name": strings.TrimSpace(name),
			"text": strings.TrimSpace(text),
		})
	}
	return out
}

func (a *App) handleState(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 1_500_000))
	if err != nil {
		http.Error(w, "read", http.StatusBadRequest)
		return
	}
	var payload struct {
		Settings    *Settings         `json:"settings"`
		Keys        map[string]string `json:"keys"`
		Personality *string           `json:"personality"`
		History     json.RawMessage   `json:"history"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if payload.Settings != nil {
		if err := writeJSON(filepath.Join(a.root, "settings", "settings.json"), payload.Settings); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}
	if payload.Keys != nil {
		if err := writeJSON(filepath.Join(a.root, "settings", "keys.json"), payload.Keys); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}
	if payload.Personality != nil {
		path := filepath.Join(a.root, "personality", "active.txt")
		if err := os.WriteFile(path, []byte(*payload.Personality), 0o644); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}
	if len(payload.History) > 0 && json.Valid(payload.History) {
		path := filepath.Join(a.root, "chats", "history.json")
		if err := os.WriteFile(path, append(payload.History, '\n'), 0o644); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}
	writeJSONResponse(w, map[string]any{"ok": true})
}

func (a *App) handleFile(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		full, err := writablePath(a.root, r.URL.Query().Get("path"))
		if err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.ServeFile(w, r, full)
	case http.MethodPost:
		var payload struct {
			Path string `json:"path"`
			Text string `json:"text"`
		}
		if err := json.NewDecoder(io.LimitReader(r.Body, 1_500_000)).Decode(&payload); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		full, err := writablePath(a.root, payload.Path)
		if err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := os.WriteFile(full, []byte(payload.Text), 0o644); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSONResponse(w, map[string]any{"ok": true})
	default:
		http.Error(w, "method", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		Messages []turn `json:"messages"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1_500_000)).Decode(&payload); err != nil {
		writeJSONResponseCode(w, http.StatusBadRequest, map[string]string{"error": "bad json"})
		return
	}
	text, err := a.complete(payload.Messages)
	if err != nil {
		writeJSONResponseCode(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
		return
	}
	writeJSONResponse(w, map[string]string{"text": text})
}

func (a *App) handleOffline(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	writeJSONResponse(w, a.offlineStatus())
}

func (a *App) claim() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.busy {
		return false
	}
	a.busy = true
	return true
}

func (a *App) release() {
	a.mu.Lock()
	a.busy = false
	a.mu.Unlock()
}

func (a *App) handleRuntime(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	if !a.claim() {
		writeJSONResponseCode(w, http.StatusConflict, map[string]string{"error": "a download is already running"})
		return
	}
	defer a.release()
	streamProgress(w, func(report progressFn) error {
		return a.downloadRuntime(report)
	})
}

func (a *App) handleModel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		ID string `json:"id"`
	}
	_ = json.NewDecoder(io.LimitReader(r.Body, 4000)).Decode(&payload)
	if !a.claim() {
		writeJSONResponseCode(w, http.StatusConflict, map[string]string{"error": "a download is already running"})
		return
	}
	defer a.release()
	streamProgress(w, func(report progressFn) error {
		_, err := a.downloadModel(payload.ID, report)
		return err
	})
}

func streamProgress(w http.ResponseWriter, run func(progressFn) error) {
	w.Header().Set("Content-Type", "application/x-ndjson")
	flusher, _ := w.(http.Flusher)
	enc := json.NewEncoder(w)
	err := run(func(received, total int64) {
		_ = enc.Encode(map[string]any{"received": received, "total": total})
		if flusher != nil {
			flusher.Flush()
		}
	})
	if err != nil {
		_ = enc.Encode(map[string]any{"error": err.Error()})
		return
	}
	_ = enc.Encode(map[string]any{"done": true})
}

func (a *App) handleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	if err := a.startOffline(); err != nil {
		writeJSONResponseCode(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSONResponse(w, a.offlineStatus())
}

func (a *App) handleStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	a.stopOffline()
	writeJSONResponse(w, a.offlineStatus())
}

func (a *App) handleReveal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	reveal(a.root)
	writeJSONResponse(w, map[string]any{"ok": true})
}

func writeJSONResponse(w http.ResponseWriter, value any) {
	writeJSONResponseCode(w, http.StatusOK, value)
}

func writeJSONResponseCode(w http.ResponseWriter, code int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(value)
}
