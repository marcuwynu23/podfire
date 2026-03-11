package framework

import (
	"os"
	"path/filepath"
)

// Framework is the detected app type.
type Framework string

const (
	FrameworkCustom   Framework = "custom"
	FrameworkNextjs   Framework = "nextjs"
	FrameworkVite     Framework = "vite"
	FrameworkExpress  Framework = "express"
	FrameworkNode     Framework = "node"
)

var frameworkFiles = []struct {
	file      string
	framework Framework
}{
	{"Dockerfile", FrameworkCustom},
	{"next.config.js", FrameworkNextjs},
	{"next.config.mjs", FrameworkNextjs},
	{"next.config.ts", FrameworkNextjs},
	{"vite.config.js", FrameworkVite},
	{"vite.config.ts", FrameworkVite},
	{"server.js", FrameworkExpress},
	{"app.js", FrameworkExpress},
}

// DetectFramework scans the repo directory and returns the framework.
func DetectFramework(repoPath string) Framework {
	for _, f := range frameworkFiles {
		p := filepath.Join(repoPath, f.file)
		if _, err := os.Stat(p); err == nil {
			return f.framework
		}
	}
	return FrameworkNode
}
