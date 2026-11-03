package desk

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"testing"
)

func TestBootstrapAndChatGuard(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "interface"), 0o755); err != nil {
		t.Fatal(err)
	}
	html := []byte("<!doctype html><title>Keel</title><p>desk</p>")
	if err := os.WriteFile(filepath.Join(dir, "interface", "index.html"), html, 0o644); err != nil {
		t.Fatal(err)
	}
	app, addr, err := Start(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Close)

	res, err := http.Get("http://" + addr + "/")
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != 200 {
		t.Fatalf("index %d", res.StatusCode)
	}
	_ = res.Body.Close()

	res, err = http.Get("http://" + addr + "/api/bootstrap")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["settings"] == nil {
		t.Fatal("missing settings")
	}

	req, _ := http.NewRequest(http.MethodPost, "http://"+addr+"/api/chat", http.NoBody)
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode < 400 {
		t.Fatalf("empty chat should fail, got %d", res.StatusCode)
	}
}
