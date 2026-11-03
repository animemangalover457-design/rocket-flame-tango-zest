//go:build windows

package desk

import "os/exec"

func reveal(root string) {
	_ = exec.Command("explorer.exe", root).Start()
}
