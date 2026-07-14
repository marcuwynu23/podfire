package template

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/marcuwynu23/podfire/agent-go/internal/framework"
)

func TestCopyTemplateToRepo(t *testing.T) {
	t.Run("writes express Dockerfile", func(t *testing.T) {
		dir := t.TempDir()
		if err := CopyTemplateToRepo(dir, framework.FrameworkExpress, nil); err != nil {
			t.Fatal(err)
		}
		content, err := os.ReadFile(filepath.Join(dir, "Dockerfile"))
		if err != nil {
			t.Fatal(err)
		}
		s := string(content)
		if !strings.Contains(s, "EXPOSE 3000") {
			t.Error("missing EXPOSE 3000")
		}
		if !strings.Contains(s, `CMD ["node", "server.js"]`) {
			t.Error("missing CMD")
		}
	})

	t.Run("writes nextjs Dockerfile", func(t *testing.T) {
		dir := t.TempDir()
		if err := CopyTemplateToRepo(dir, framework.FrameworkNextjs, nil); err != nil {
			t.Fatal(err)
		}
		content, err := os.ReadFile(filepath.Join(dir, "Dockerfile"))
		if err != nil {
			t.Fatal(err)
		}
		s := string(content)
		if !strings.Contains(s, "EXPOSE 3000") {
			t.Error("missing EXPOSE 3000")
		}
		if !strings.Contains(s, `CMD ["npx", "next", "start"]`) {
			t.Error("missing next start CMD")
		}
	})

	t.Run("writes vite Dockerfile", func(t *testing.T) {
		dir := t.TempDir()
		if err := CopyTemplateToRepo(dir, framework.FrameworkVite, nil); err != nil {
			t.Fatal(err)
		}
		content, err := os.ReadFile(filepath.Join(dir, "Dockerfile"))
		if err != nil {
			t.Fatal(err)
		}
		s := string(content)
		if !strings.Contains(s, "EXPOSE 3000") {
			t.Error("missing EXPOSE 3000")
		}
		if !strings.Contains(s, `CMD ["serve"`) {
			t.Error("missing serve CMD")
		}
	})

	t.Run("substitutes build command", func(t *testing.T) {
		dir := t.TempDir()
		opts := &Options{BuildCommand: "npm run custom:build"}
		if err := CopyTemplateToRepo(dir, framework.FrameworkVite, opts); err != nil {
			t.Fatal(err)
		}
		content, err := os.ReadFile(filepath.Join(dir, "Dockerfile"))
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(content), "npm run custom:build") {
			t.Error("build command not substituted")
		}
	})

	t.Run("substitutes entry command", func(t *testing.T) {
		dir := t.TempDir()
		opts := &Options{EntryCommand: "node index.js"}
		if err := CopyTemplateToRepo(dir, framework.FrameworkExpress, opts); err != nil {
			t.Fatal(err)
		}
		content, err := os.ReadFile(filepath.Join(dir, "Dockerfile"))
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(content), `CMD ["node","index.js"]`) {
			t.Error("entry command not substituted")
		}
	})

	t.Run("substitutes output directory", func(t *testing.T) {
		dir := t.TempDir()
		opts := &Options{OutputDirectory: "build"}
		if err := CopyTemplateToRepo(dir, framework.FrameworkVite, opts); err != nil {
			t.Fatal(err)
		}
		content, err := os.ReadFile(filepath.Join(dir, "Dockerfile"))
		if err != nil {
			t.Fatal(err)
		}
		s := string(content)
		if !strings.Contains(s, `COPY --from=builder /app/build ./build`) {
			t.Error("output directory not substituted")
		}
	})

	t.Run("custom framework returns nil", func(t *testing.T) {
		dir := t.TempDir()
		if err := CopyTemplateToRepo(dir, framework.FrameworkCustom, nil); err != nil {
			t.Fatal(err)
		}
		// Should not write a Dockerfile
		if _, err := os.Stat(filepath.Join(dir, "Dockerfile")); err == nil {
			t.Error("custom framework should not write Dockerfile")
		}
	})
}
