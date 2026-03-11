package template

import (
	"embed"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"github.com/marcuwynu23/podfire/agent-go/internal/framework"
)

//go:embed all:templates
var templatesFS embed.FS

const templateDir = "templates"

var templateMap = map[framework.Framework]string{
	framework.FrameworkNextjs:  "nextjs.Dockerfile",
	framework.FrameworkVite:    "vite.Dockerfile",
	framework.FrameworkExpress: "express.Dockerfile",
	framework.FrameworkNode:   "express.Dockerfile",
}

var defaultBuild = map[framework.Framework]string{
	framework.FrameworkNextjs:  "npm run build 2>/dev/null || npx next build",
	framework.FrameworkVite:   "npm run build 2>/dev/null || npx vite build",
	framework.FrameworkExpress: "true",
	framework.FrameworkNode:   "true",
}

var defaultEntryCmd = map[framework.Framework]string{
	framework.FrameworkNextjs:  `["npx", "next", "start"]`,
	framework.FrameworkVite:   `["serve", "-s", "dist", "-l", "0.0.0.0:3000"]`,
	framework.FrameworkExpress: `["node", "server.js"]`,
	framework.FrameworkNode:   `["node", "server.js"]`,
}

// Options for CopyTemplateToRepo.
type Options struct {
	BuildCommand   string
	EntryCommand   string
	OutputDirectory string
}

func entryCommandToJSON(entry string) string {
	entry = strings.TrimSpace(entry)
	if entry == "" {
		return `["node", "server.js"]`
	}
	parts := splitQuoted(entry)
	out, _ := json.Marshal(parts)
	return string(out)
}

func splitQuoted(s string) []string {
	var parts []string
	var cur strings.Builder
	inQuote := false
	var q rune
	for _, r := range s {
		if inQuote {
			if r == q {
				inQuote = false
				parts = append(parts, cur.String())
				cur.Reset()
			} else {
				cur.WriteRune(r)
			}
			continue
		}
		if r == '"' || r == '\'' {
			inQuote = true
			q = r
			continue
		}
		if r == ' ' || r == '\t' {
			if cur.Len() > 0 {
				parts = append(parts, cur.String())
				cur.Reset()
			}
			continue
		}
		cur.WriteRune(r)
	}
	if cur.Len() > 0 {
		parts = append(parts, cur.String())
	}
	return parts
}

// CopyTemplateToRepo writes the Dockerfile for the given framework into repoPath.
func CopyTemplateToRepo(repoPath string, fw framework.Framework, opts *Options) error {
	name, ok := templateMap[fw]
	if !ok {
		return nil // custom or unknown, caller uses repo Dockerfile
	}
	data, err := templatesFS.ReadFile(filepath.Join(templateDir, name))
	if err != nil {
		return err
	}
	content := string(data)

	buildCmd := defaultBuild[fw]
	entryCmd := defaultEntryCmd[fw]
	outputDir := ""
	if opts != nil {
		if strings.TrimSpace(opts.BuildCommand) != "" {
			buildCmd = strings.TrimSpace(opts.BuildCommand)
		}
		if strings.TrimSpace(opts.OutputDirectory) != "" {
			outputDir = strings.TrimSpace(opts.OutputDirectory)
		} else {
			if fw == framework.FrameworkVite {
				outputDir = "dist"
			} else if fw == framework.FrameworkNextjs {
				outputDir = ".next"
			}
		}
		if strings.TrimSpace(opts.EntryCommand) != "" {
			entryCmd = entryCommandToJSON(strings.TrimSpace(opts.EntryCommand))
		} else if fw == framework.FrameworkVite && outputDir != "" {
			arr := []string{"serve", "-s", outputDir, "-l", "0.0.0.0:3000"}
			b, _ := json.Marshal(arr)
			entryCmd = string(b)
		}
	}

	if outputDir != "" && strings.Contains(content, "__OUTPUT_DIR__") {
		content = strings.ReplaceAll(content, "__OUTPUT_DIR__", outputDir)
	}
	if strings.Contains(content, "__BUILD_RUN__") {
		runLine := "RUN true"
		if buildCmd != "true" {
			runLine = "RUN " + buildCmd
		}
		content = strings.Replace(content, "__BUILD_RUN__", runLine, 1)
	}
	if strings.Contains(content, "__BUILD_COMMAND__") {
		content = strings.Replace(content, "__BUILD_COMMAND__", buildCmd, 1)
	}
	if strings.Contains(content, "__ENTRY_CMD__") {
		content = strings.Replace(content, "__ENTRY_CMD__", entryCmd, 1)
	}

	dockerfilePath := filepath.Join(repoPath, "Dockerfile")
	return os.WriteFile(dockerfilePath, []byte(content), 0600)
}
