package desk

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

type turn struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func publicHTTPS(raw string) (string, error) {
	if strings.HasPrefix(raw, "http://127.0.0.1:") || strings.HasPrefix(raw, "http://localhost:") {
		return "", fmt.Errorf("local endpoints are only for the offline model")
	}
	if !strings.HasPrefix(raw, "https://") {
		return "", fmt.Errorf("endpoints must use https")
	}
	host := raw
	if i := strings.Index(raw[8:], "/"); i >= 0 {
		host = raw[8 : 8+i]
	} else {
		host = raw[8:]
	}
	if colon := strings.LastIndex(host, ":"); colon > 0 && !strings.Contains(host, "]") {
		host = host[:colon]
	}
	host = strings.Trim(host, "[]")
	if blockedHost(host) {
		return "", fmt.Errorf("that endpoint is blocked")
	}
	if ip := net.ParseIP(host); ip != nil {
		if isPrivateIP(ip) {
			return "", fmt.Errorf("that endpoint is blocked")
		}
		return strings.TrimRight(raw, "/"), nil
	}
	ips, err := net.LookupIP(host)
	if err != nil || len(ips) == 0 {
		return "", fmt.Errorf("could not resolve that endpoint")
	}
	for _, ip := range ips {
		if isPrivateIP(ip) {
			return "", fmt.Errorf("that endpoint points at a private network")
		}
	}
	return strings.TrimRight(raw, "/"), nil
}

func (a *App) complete(messages []turn) (string, error) {
	if len(messages) == 0 || len(messages) > 30 {
		return "", fmt.Errorf("send between 1 and 30 messages")
	}
	last := messages[len(messages)-1]
	if last.Role != "user" || strings.TrimSpace(last.Content) == "" {
		return "", fmt.Errorf("the last message has to be yours")
	}
	settings := a.loadSettings()
	providers := a.loadProviders()
	var provider *Provider
	for i := range providers {
		if providers[i].ID == settings.ProviderID {
			provider = &providers[i]
			break
		}
	}
	if provider == nil {
		return "", fmt.Errorf("unknown provider %q — check api/providers.json", settings.ProviderID)
	}
	keys := a.loadKeys()
	model := settings.Model
	base := provider.BaseURL
	if provider.ID == "custom" {
		if strings.TrimSpace(settings.CustomBaseURL) == "" {
			return "", fmt.Errorf("add a base URL for the custom endpoint")
		}
		base = settings.CustomBaseURL
	}
	if provider.Local {
		if port := a.runningPort(); port != 0 {
			base = fmt.Sprintf("http://127.0.0.1:%d/v1", port)
		}
		if !strings.HasPrefix(base, "http://127.0.0.1:") && !strings.HasPrefix(base, "http://localhost:") {
			return "", fmt.Errorf("the offline provider must point at this PC")
		}
	} else {
		safe, err := publicHTTPS(base)
		if err != nil {
			return "", err
		}
		base = safe
	}
	key := strings.TrimSpace(keys[provider.ID])
	if !provider.Local && key == "" {
		return "", fmt.Errorf("add an API key for %s in the Key tab or settings/keys.json", provider.Label)
	}
	maxTokens := settings.MaxTokens
	if maxTokens < 16 {
		maxTokens = 16
	}
	if maxTokens > 4096 {
		maxTokens = 4096
	}
	temp := settings.Temperature
	if temp < 0 {
		temp = 0
	}
	if temp > 2 {
		temp = 2
	}
	system := strings.TrimSpace(a.personality())
	kind := provider.Kind
	if kind == "" {
		kind = "openai"
	}
	url, body, headers, err := buildUpstream(kind, base, key, model, temp, maxTokens, system, messages)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	client := &http.Client{Timeout: 90 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return fmt.Errorf("redirect refused")
	}}
	res, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("couldn't reach the model")
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		snippet, _ := io.ReadAll(io.LimitReader(res.Body, 4000))
		return "", fmt.Errorf("%s", scrub(clipAPI(snippet), key))
	}
	text, err := readModel(res, kind)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(text) == "" {
		return "", fmt.Errorf("the model returned nothing")
	}
	return text, nil
}

func buildUpstream(kind, base, key, model string, temp float64, maxTokens int, system string, messages []turn) (string, []byte, map[string]string, error) {
	headers := map[string]string{"Content-Type": "application/json"}
	switch kind {
	case "anthropic":
		payload := map[string]any{
			"model": model, "max_tokens": maxTokens, "temperature": temp, "stream": true,
			"messages": messages,
		}
		if system != "" {
			payload["system"] = system
		}
		body, _ := json.Marshal(payload)
		headers["x-api-key"] = key
		headers["anthropic-version"] = "2023-06-01"
		return base + "/v1/messages", body, headers, nil
	case "gemini":
		contents := make([]map[string]any, 0, len(messages))
		for _, message := range messages {
			role := "user"
			if message.Role == "assistant" {
				role = "model"
			}
			contents = append(contents, map[string]any{
				"role":  role,
				"parts": []map[string]string{{"text": message.Content}},
			})
		}
		payload := map[string]any{
			"contents": contents,
			"generationConfig": map[string]any{
				"temperature": temp, "maxOutputTokens": maxTokens,
			},
		}
		if system != "" {
			payload["systemInstruction"] = map[string]any{
				"parts": []map[string]string{{"text": system}},
			}
		}
		body, _ := json.Marshal(payload)
		return fmt.Sprintf("%s/models/%s:streamGenerateContent?alt=sse&key=%s", strings.TrimRight(base, "/"), model, key), body, headers, nil
	default:
		chat := make([]map[string]string, 0, len(messages)+1)
		if system != "" {
			chat = append(chat, map[string]string{"role": "system", "content": system})
		}
		for _, message := range messages {
			chat = append(chat, map[string]string{"role": message.Role, "content": message.Content})
		}
		payload := map[string]any{
			"model": model, "temperature": temp, "stream": true, "messages": chat,
		}
		if strings.Contains(base, "api.openai.com") {
			payload["max_completion_tokens"] = maxTokens
		} else {
			payload["max_tokens"] = maxTokens
		}
		body, _ := json.Marshal(payload)
		if key != "" {
			headers["Authorization"] = "Bearer " + key
		}
		if strings.Contains(base, "openrouter.ai") {
			headers["HTTP-Referer"] = "https://keel.desk"
			headers["X-Title"] = "Keel"
		}
		return strings.TrimRight(base, "/") + "/chat/completions", body, headers, nil
	}
}

func readModel(res *http.Response, kind string) (string, error) {
	ctype := res.Header.Get("Content-Type")
	if strings.Contains(ctype, "application/json") && !strings.Contains(ctype, "stream") {
		body, err := io.ReadAll(io.LimitReader(res.Body, 2_000_000))
		if err != nil {
			return "", err
		}
		return extractFull(body, kind), nil
	}
	scanner := bufio.NewScanner(res.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	var b strings.Builder
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "" || data == "[DONE]" {
			continue
		}
		b.WriteString(extractDelta([]byte(data), kind))
	}
	return b.String(), scanner.Err()
}

func extractDelta(raw []byte, kind string) string {
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return ""
	}
	switch kind {
	case "anthropic":
		delta, _ := payload["delta"].(map[string]any)
		text, _ := delta["text"].(string)
		return text
	case "gemini":
		return geminiText(payload)
	default:
		choices, _ := payload["choices"].([]any)
		if len(choices) == 0 {
			return ""
		}
		choice, _ := choices[0].(map[string]any)
		delta, _ := choice["delta"].(map[string]any)
		return textOf(delta["content"])
	}
}

func extractFull(raw []byte, kind string) string {
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return ""
	}
	if kind == "gemini" {
		return geminiText(payload)
	}
	if kind == "anthropic" {
		return textOf(payload["content"])
	}
	choices, _ := payload["choices"].([]any)
	if len(choices) == 0 {
		return ""
	}
	choice, _ := choices[0].(map[string]any)
	message, _ := choice["message"].(map[string]any)
	return textOf(message["content"])
}

func geminiText(payload map[string]any) string {
	candidates, _ := payload["candidates"].([]any)
	if len(candidates) == 0 {
		return ""
	}
	candidate, _ := candidates[0].(map[string]any)
	content, _ := candidate["content"].(map[string]any)
	return textOf(content["parts"])
}

func textOf(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case []any:
		var b strings.Builder
		for _, part := range typed {
			switch item := part.(type) {
			case string:
				b.WriteString(item)
			case map[string]any:
				if text, ok := item["text"].(string); ok {
					b.WriteString(text)
				}
			}
		}
		return b.String()
	default:
		return ""
	}
}

func clipAPI(raw []byte) string {
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err == nil {
		switch errBody := payload["error"].(type) {
		case string:
			return errBody
		case map[string]any:
			if message, ok := errBody["message"].(string); ok {
				return message
			}
		}
		if message, ok := payload["message"].(string); ok {
			return message
		}
	}
	text := strings.Join(strings.Fields(string(raw)), " ")
	if len(text) > 400 {
		text = text[:400]
	}
	if text == "" {
		return "the model refused the request"
	}
	return text
}

func scrub(message, key string) string {
	message = strings.Join(strings.Fields(message), " ")
	if key != "" {
		message = strings.ReplaceAll(message, key, "…")
	}
	if len(message) > 400 {
		message = message[:400]
	}
	return message
}
