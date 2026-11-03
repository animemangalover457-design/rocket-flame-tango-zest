package desk

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Settings struct {
	ProviderID    string  `json:"providerId"`
	Model         string  `json:"model"`
	CustomBaseURL string  `json:"customBaseUrl"`
	Temperature   float64 `json:"temperature"`
	MaxTokens     int     `json:"maxTokens"`
	ActivePreset  string  `json:"activePreset"`
	WindowTitle   string  `json:"windowTitle"`
	OfflinePort   int     `json:"offlinePort"`
	ModelFile     string  `json:"modelFile"`
}

type Provider struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Kind    string   `json:"kind"`
	BaseURL string   `json:"baseUrl"`
	Models  []string `json:"models"`
	KeyHint string   `json:"keyHint"`
	Blurb   string   `json:"blurb"`
	Local   bool     `json:"local"`
}

type providerFile struct {
	Providers []Provider `json:"providers"`
}

type catalogModel struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	URL   string `json:"url"`
	File  string `json:"file"`
	Note  string `json:"note"`
}

type catalogFile struct {
	RuntimeFallback string         `json:"runtimeFallback"`
	Models          []catalogModel `json:"models"`
}

func defaultSettings() Settings {
	return Settings{
		ProviderID:   "openai",
		Model:        "gpt-4o-mini",
		Temperature:  0.7,
		MaxTokens:    1200,
		ActivePreset: "plain",
		WindowTitle:  "Keel",
		OfflinePort:  17890,
	}
}

func readJSON(path string, dest any) error {
	body, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, dest)
}

func writeJSON(path string, value any) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	body, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	body = append(body, '\n')
	return os.WriteFile(path, body, 0o644)
}

func (a *App) loadSettings() Settings {
	settings := defaultSettings()
	path := filepath.Join(a.root, "settings", "settings.json")
	if err := readJSON(path, &settings); err != nil {
		_ = writeJSON(path, settings)
	}
	if settings.WindowTitle == "" {
		settings.WindowTitle = "Keel"
	}
	if settings.OfflinePort == 0 {
		settings.OfflinePort = 17890
	}
	if settings.MaxTokens == 0 {
		settings.MaxTokens = 1200
	}
	if settings.ProviderID == "" {
		settings.ProviderID = "openai"
	}
	if settings.Model == "" {
		settings.Model = "gpt-4o-mini"
	}
	return settings
}

func (a *App) loadProviders() []Provider {
	var file providerFile
	_ = readJSON(filepath.Join(a.root, "api", "providers.json"), &file)
	return file.Providers
}

func (a *App) loadKeys() map[string]string {
	keys := map[string]string{}
	_ = readJSON(filepath.Join(a.root, "settings", "keys.json"), &keys)
	if keys == nil {
		keys = map[string]string{}
	}
	return keys
}

func (a *App) loadCatalog() catalogFile {
	var file catalogFile
	_ = readJSON(filepath.Join(a.root, "models", "catalog.json"), &file)
	return file
}

func (a *App) personality() string {
	body, err := os.ReadFile(filepath.Join(a.root, "personality", "active.txt"))
	if err != nil {
		return "You are a clear, direct assistant. Answer in plain language."
	}
	return string(body)
}
