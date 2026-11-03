package desk

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

var runtimeAsset = regexp.MustCompile(`^llama-b\d+-bin-win-cpu-x64\.zip$`)

type progressFn func(received, total int64)

func (a *App) offlineStatus() map[string]any {
	exe := a.findServer()
	model := a.findModel("")
	a.mu.Lock()
	running := a.llama != nil && a.llama.ProcessState == nil
	port := a.port
	a.mu.Unlock()
	return map[string]any{
		"runtime":   exe != "",
		"runtimeAt": exe,
		"modelFile": filepath.Base(model),
		"modelPath": model,
		"running":   running,
		"port":      port,
	}
}

func (a *App) runningPort() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.llama != nil && a.llama.ProcessState == nil && a.port != 0 {
		return a.port
	}
	return 0
}

func (a *App) findServer() string {
	root := filepath.Join(a.root, "runtime")
	found := ""
	_ = filepath.WalkDir(root, func(path string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return nil
		}
		if strings.EqualFold(entry.Name(), "llama-server.exe") {
			found = path
			return io.EOF
		}
		return nil
	})
	return found
}

func (a *App) findModel(preferred string) string {
	if preferred != "" {
		path := filepath.Join(a.root, "models", filepath.Base(preferred))
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			return path
		}
	}
	settings := a.loadSettings()
	if settings.ModelFile != "" {
		path := filepath.Join(a.root, "models", filepath.Base(settings.ModelFile))
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			return path
		}
	}
	matches, _ := filepath.Glob(filepath.Join(a.root, "models", "*.gguf"))
	if len(matches) == 0 {
		return ""
	}
	return matches[0]
}

func (a *App) downloadRuntime(report progressFn) error {
	catalog := a.loadCatalog()
	url := ""
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=15", nil)
	if err == nil {
		req.Header.Set("User-Agent", "Keel")
		req.Header.Set("Accept", "application/vnd.github+json")
		res, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
		if err == nil {
			defer res.Body.Close()
			var releases []struct {
				Assets []struct {
					Name string `json:"name"`
					URL  string `json:"browser_download_url"`
				} `json:"assets"`
			}
			if json.NewDecoder(res.Body).Decode(&releases) == nil {
				for _, release := range releases {
					for _, asset := range release.Assets {
						if runtimeAsset.MatchString(asset.Name) {
							url = asset.URL
							break
						}
					}
					if url != "" {
						break
					}
				}
			}
		}
	}
	if url == "" {
		url = catalog.RuntimeFallback
	}
	if url == "" {
		return fmt.Errorf("couldn't find the Windows llama.cpp build")
	}
	destDir := filepath.Join(a.root, "runtime", "llama")
	zipPath := filepath.Join(a.root, "runtime", "llama.zip")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return err
	}
	if err := downloadFile(url, zipPath, report); err != nil {
		return err
	}
	if err := unzip(zipPath, destDir); err != nil {
		return err
	}
	_ = os.Remove(zipPath)
	if a.findServer() == "" {
		return fmt.Errorf("the download unpacked, but llama-server.exe was not inside")
	}
	return nil
}

func (a *App) downloadModel(id string, report progressFn) (string, error) {
	catalog := a.loadCatalog()
	var chosen *catalogModel
	for i := range catalog.Models {
		if catalog.Models[i].ID == id || (id == "" && i == 0) {
			chosen = &catalog.Models[i]
			break
		}
	}
	if chosen == nil {
		return "", fmt.Errorf("that model isn't in models/catalog.json")
	}
	if !strings.HasPrefix(chosen.URL, "https://") {
		return "", fmt.Errorf("model URLs must be https")
	}
	name := filepath.Base(chosen.File)
	if name == "." || name == "" || strings.Contains(name, "..") {
		return "", fmt.Errorf("bad model filename")
	}
	dest := filepath.Join(a.root, "models", name)
	if err := downloadFile(chosen.URL, dest, report); err != nil {
		return "", err
	}
	settings := a.loadSettings()
	settings.ModelFile = name
	settings.ProviderID = "offline"
	settings.Model = "local"
	_ = writeJSON(filepath.Join(a.root, "settings", "settings.json"), settings)
	return name, nil
}

func downloadFile(url, dest string, report progressFn) error {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Keel")
	client := &http.Client{Timeout: 45 * time.Minute}
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("download failed")
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("download returned %d", res.StatusCode)
	}
	part := dest + ".part"
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	file, err := os.Create(part)
	if err != nil {
		return err
	}
	buf := make([]byte, 256*1024)
	var received int64
	total := res.ContentLength
	for {
		n, readErr := res.Body.Read(buf)
		if n > 0 {
			if _, err := file.Write(buf[:n]); err != nil {
				_ = file.Close()
				_ = os.Remove(part)
				return err
			}
			received += int64(n)
			if report != nil {
				report(received, total)
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			_ = file.Close()
			_ = os.Remove(part)
			return readErr
		}
	}
	if err := file.Close(); err != nil {
		return err
	}
	return os.Rename(part, dest)
}

func unzip(zipPath, dest string) error {
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer reader.Close()
	for _, file := range reader.File {
		name := filepath.Clean(file.Name)
		if strings.HasPrefix(name, "..") || filepath.IsAbs(name) {
			continue
		}
		target := filepath.Join(dest, name)
		rel, err := filepath.Rel(dest, target)
		if err != nil || strings.HasPrefix(rel, "..") {
			continue
		}
		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		in, err := file.Open()
		if err != nil {
			return err
		}
		out, err := os.Create(target)
		if err != nil {
			_ = in.Close()
			return err
		}
		_, err = io.Copy(out, in)
		_ = in.Close()
		_ = out.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func (a *App) startOffline() error {
	exe := a.findServer()
	if exe == "" {
		return fmt.Errorf("download the offline runner first")
	}
	model := a.findModel("")
	if model == "" {
		return fmt.Errorf("download a model first")
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.llama != nil && a.llama.ProcessState == nil {
		return nil
	}
	settings := a.loadSettings()
	port := settings.OfflinePort
	if port == 0 {
		port = 17890
	}
	logFile, err := os.OpenFile(filepath.Join(a.root, "runtime", "llama.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	cmd := exec.Command(exe, "-m", model, "--host", "127.0.0.1", "--port", fmt.Sprint(port), "-c", "2048")
	cmd.Dir = filepath.Dir(exe)
	cmd.Stdout = logFile
	cmd.Stderr = logFile
	hideWindow(cmd)
	if err := cmd.Start(); err != nil {
		_ = logFile.Close()
		return err
	}
	a.llama = cmd
	a.port = port
	a.logFile = logFile
	go func() {
		_ = cmd.Wait()
		a.mu.Lock()
		if a.logFile != nil {
			_ = a.logFile.Close()
			a.logFile = nil
		}
		a.mu.Unlock()
	}()
	return nil
}

func (a *App) stopOffline() {
	a.mu.Lock()
	cmd := a.llama
	a.llama = nil
	a.mu.Unlock()
	if cmd != nil && cmd.Process != nil {
		_ = cmd.Process.Kill()
	}
}
