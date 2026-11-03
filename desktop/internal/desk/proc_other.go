//go:build !windows

package desk

import "os/exec"

func hideWindow(cmd *exec.Cmd) {}
