package desk

import (
	"net"
	"path/filepath"
	"strings"
)

func isPrivateIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return true
	}
	return false
}

func blockedHost(host string) bool {
	name := strings.TrimSuffix(strings.ToLower(strings.TrimSpace(host)), ".")
	switch name {
	case "localhost", "localhost.localdomain", "metadata", "metadata.google.internal", "metadata.internal":
		return true
	}
	if strings.HasSuffix(name, ".local") || strings.HasSuffix(name, ".localhost") || strings.HasSuffix(name, ".internal") {
		return true
	}
	if name != "" && strings.Trim(name, "0123456789") == "" {
		return true
	}
	if ip := net.ParseIP(name); ip != nil && isPrivateIP(ip) {
		return true
	}
	return false
}

func safeJoin(root, rel string) (string, error) {
	clean := filepath.Clean(rel)
	if clean == "." || strings.HasPrefix(clean, "..") || filepath.IsAbs(clean) {
		return "", errForbidden
	}
	full := filepath.Join(root, clean)
	relBack, err := filepath.Rel(root, full)
	if err != nil || relBack == ".." || strings.HasPrefix(relBack, ".."+string(filepath.Separator)) {
		return "", errForbidden
	}
	return full, nil
}

var writable = map[string]bool{
	"settings/settings.json": true,
	"settings/keys.json":     true,
	"personality/active.txt": true,
	"chats/history.json":     true,
	"interface/theme.css":    true,
	"api/providers.json":     true,
	"models/catalog.json":    true,
}

func writablePath(root, rel string) (string, error) {
	rel = filepath.ToSlash(filepath.Clean(rel))
	if !writable[rel] {
		return "", errForbidden
	}
	return safeJoin(root, filepath.FromSlash(rel))
}
