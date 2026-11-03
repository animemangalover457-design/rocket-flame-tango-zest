//go:build !windows

package main

import "fmt"

func main() {
	fmt.Println("Keel.exe is a Windows program. Build it with GOOS=windows GOARCH=amd64.")
}
