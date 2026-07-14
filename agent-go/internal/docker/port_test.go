package docker

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectPortFromSource(t *testing.T) {
	dir := t.TempDir()

	t.Run("empty directory", func(t *testing.T) {
		if port := DetectPortFromSource(dir); port != 0 {
			t.Errorf("DetectPortFromSource() = %d, want 0", port)
		}
	})

	t.Run("detects port from app.listen(5000)", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "server.ts"), []byte("app.listen(5000);"), 0600)
		if port := DetectPortFromSource(d); port != 5000 {
			t.Errorf("DetectPortFromSource() = %d, want 5000", port)
		}
	})

	t.Run("detects port from process.env.PORT || 3000", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "index.js"), []byte("const port = process.env.PORT || 3000;"), 0600)
		if port := DetectPortFromSource(d); port != 3000 {
			t.Errorf("DetectPortFromSource() = %d, want 3000", port)
		}
	})

	t.Run("returns 0 for ports below 1024", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "server.js"), []byte("app.listen(80);"), 0600)
		if port := DetectPortFromSource(d); port != 0 {
			t.Errorf("DetectPortFromSource() = %d, want 0", port)
		}
	})

	t.Run("skips node_modules", func(t *testing.T) {
		d := t.TempDir()
		os.MkdirAll(filepath.Join(d, "node_modules"), 0755)
		os.WriteFile(filepath.Join(d, "node_modules", "server.js"), []byte("app.listen(5000);"), 0600)
		if port := DetectPortFromSource(d); port != 0 {
			t.Errorf("DetectPortFromSource() = %d, want 0", port)
		}
	})

	t.Run("finds port in nested src dir", func(t *testing.T) {
		d := t.TempDir()
		os.MkdirAll(filepath.Join(d, "src"), 0755)
		os.WriteFile(filepath.Join(d, "src", "server.ts"), []byte("const port = process.env.PORT || 8080;"), 0600)
		if port := DetectPortFromSource(d); port != 8080 {
			t.Errorf("DetectPortFromSource() = %d, want 8080", port)
		}
	})

	t.Run("returns first port found", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "a.js"), []byte("app.listen(3000);"), 0600)
		os.WriteFile(filepath.Join(d, "b.js"), []byte("app.listen(4000);"), 0600)
		if port := DetectPortFromSource(d); port != 3000 {
			t.Errorf("DetectPortFromSource() = %d, want 3000", port)
		}
	})
}
