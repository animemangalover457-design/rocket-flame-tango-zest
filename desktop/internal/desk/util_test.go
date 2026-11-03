package desk

import "testing"

func TestBlockedHost(t *testing.T) {
	if !blockedHost("localhost") || !blockedHost("127.0.0.1") || !blockedHost("10.1.2.3") {
		t.Fatal("private hosts should be blocked")
	}
	if blockedHost("api.openai.com") {
		t.Fatal("public host blocked")
	}
}

func TestWritablePath(t *testing.T) {
	if _, err := writablePath("/tmp/keel", "settings/keys.json"); err != nil {
		t.Fatal(err)
	}
	if _, err := writablePath("/tmp/keel", "../Keel.exe"); err == nil {
		t.Fatal("path escape allowed")
	}
	if _, err := writablePath("/tmp/keel", "interface/app.js"); err == nil {
		t.Fatal("app.js should be edited by hand, not the writer")
	}
}
