//go:build windows

package main

import (
	"os"
	"path/filepath"
	"syscall"
	"unsafe"

	"github.com/jchv/go-webview2"

	"keel/internal/desk"
)

func exeRoot() string {
	path, err := os.Executable()
	if err != nil {
		return "."
	}
	if resolved, err := filepath.EvalSymlinks(path); err == nil {
		path = resolved
	}
	return filepath.Dir(path)
}

func main() {
	root := exeRoot()
	_ = os.MkdirAll(filepath.Join(root, "webview-data"), 0o755)
	syscall.NewLazyDLL("user32.dll").NewProc("SetProcessDPIAware").Call()

	app, addr, err := desk.Start(root)
	if err != nil {
		fail(root, "Keel couldn't start", err.Error())
		return
	}
	defer app.Close()

	view := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  filepath.Join(root, "webview-data"),
		WindowOptions: webview2.WindowOptions{
			Title:  app.Title(),
			Width:  1200,
			Height: 800,
			Center: true,
		},
	})
	if view == nil {
		fail(root, "Keel needs WebView2", "Install the Microsoft Edge WebView2 Runtime, then open Keel again.")
		return
	}
	defer view.Destroy()
	applyIcon(uintptr(view.Window()), filepath.Join(root, "icon.ico"))
	view.Navigate("http://" + addr + "/")
	view.Run()
}

func applyIcon(hwnd uintptr, path string) {
	if hwnd == 0 {
		return
	}
	user32 := syscall.NewLazyDLL("user32.dll")
	ptr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return
	}
	handle, _, _ := user32.NewProc("LoadImageW").Call(0, uintptr(unsafe.Pointer(ptr)), 1, 32, 32, 0x0010)
	if handle == 0 {
		return
	}
	user32.NewProc("SendMessageW").Call(hwnd, 0x0080, 1, handle)
	user32.NewProc("SendMessageW").Call(hwnd, 0x0080, 0, handle)
}

func fail(root, title, text string) {
	t, _ := syscall.UTF16PtrFromString(title)
	b, _ := syscall.UTF16PtrFromString(text)
	syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW").Call(0, uintptr(unsafe.Pointer(b)), uintptr(unsafe.Pointer(t)), 0x10)
	_ = os.WriteFile(filepath.Join(root, "keel-error.log"), []byte(title+"\n"+text+"\n"), 0o644)
}
