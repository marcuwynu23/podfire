package docker

import (
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

var portPatterns = []*regexp.Regexp{
	regexp.MustCompile(`\.listen\((?:\s*\w+\s*,)?\s*['"` + "`" + `]?(\d{2,5})['"` + "`" + `]?\s*[),]`),
	regexp.MustCompile(`process\.env\.PORT\s*\|\|\s*['"` + "`" + `]?(\d{2,5})['"` + "`" + `]?`),
	regexp.MustCompile(`PORT\s*\|\|\s*['"` + "`" + `]?(\d{2,5})['"` + "`" + `]?`),
	regexp.MustCompile(`port\s*\|\|\s*['"` + "`" + `]?(\d{2,5})['"` + "`" + `]?`),
	regexp.MustCompile(`["'` + "`" + `]PORT["'` + "`" + `]\s*[:=]\s*['"` + "`" + `]?(\d{2,5})['"` + "`" + `]?`),
	regexp.MustCompile(`["'` + "`" + `]port["'` + "`" + `]\s*[:=]\s*['"` + "`" + `]?(\d{2,5})['"` + "`" + `]?`),
	regexp.MustCompile(`--port[= ](\d{2,5})`),
	regexp.MustCompile(`["']port["']\s*:\s*(\d{2,5})`),
}

var excludeDirs = map[string]bool{
	"node_modules": true,
	"dist":         true,
	".next":        true,
	"build":        true,
	".git":         true,
	"out":          true,
	".vercel":      true,
}

var sourceExts = map[string]bool{
	".js":  true,
	".ts":  true,
	".mjs": true,
	".cjs": true,
	".mts": true,
	".cts": true,
	".json": true,
}

func scanFileForPort(filePath string) (int, bool) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return 0, false
	}
	content := string(data)
	for _, pat := range portPatterns {
		matches := pat.FindStringSubmatch(content)
		if len(matches) >= 2 {
			port, err := strconv.Atoi(matches[1])
			if err == nil && port >= 1024 && port <= 65535 {
				return port, true
			}
		}
	}
	return 0, false
}

func walkDirForPort(dir string, depth int) (int, bool) {
	if depth > 10 {
		return 0, false
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 0, false
	}
	for _, entry := range entries {
		name := entry.Name()
		fullPath := filepath.Join(dir, name)
		if entry.IsDir() {
			if excludeDirs[name] {
				continue
			}
			if port, ok := walkDirForPort(fullPath, depth+1); ok {
				return port, true
			}
		} else {
			ext := strings.ToLower(filepath.Ext(name))
			if !sourceExts[ext] {
				continue
			}
			if port, ok := scanFileForPort(fullPath); ok {
				return port, true
			}
		}
	}
	return 0, false
}

// DetectPortFromSource walks the repository directory and scans JS/TS source
// files for common port patterns (e.g. .listen(5000), PORT || 3000).
// Returns the first port found (1024-65535), or 0 if none found.
func DetectPortFromSource(repoPath string) int {
	port, ok := walkDirForPort(repoPath, 0)
	if !ok {
		return 0
	}
	return port
}
