package framework

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectFramework(t *testing.T) {
	t.Run("empty directory returns node", func(t *testing.T) {
		d := t.TempDir()
		if f := DetectFramework(d); f != FrameworkNode {
			t.Errorf("DetectFramework() = %q, want %q", f, FrameworkNode)
		}
	})

	t.Run("next.config.js detects nextjs", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "next.config.js"), []byte{}, 0600)
		if f := DetectFramework(d); f != FrameworkNextjs {
			t.Errorf("DetectFramework() = %q, want %q", f, FrameworkNextjs)
		}
	})

	t.Run("next.config.mjs detects nextjs", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "next.config.mjs"), []byte{}, 0600)
		if f := DetectFramework(d); f != FrameworkNextjs {
			t.Errorf("DetectFramework() = %q, want %q", f, FrameworkNextjs)
		}
	})

	t.Run("next.config.ts detects nextjs", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "next.config.ts"), []byte{}, 0600)
		if f := DetectFramework(d); f != FrameworkNextjs {
			t.Errorf("DetectFramework() = %q, want %q", f, FrameworkNextjs)
		}
	})

	t.Run("vite.config.ts detects vite", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "vite.config.ts"), []byte{}, 0600)
		if f := DetectFramework(d); f != FrameworkVite {
			t.Errorf("DetectFramework() = %q, want %q", f, FrameworkVite)
		}
	})

	t.Run("vite.config.js detects vite", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "vite.config.js"), []byte{}, 0600)
		if f := DetectFramework(d); f != FrameworkVite {
			t.Errorf("DetectFramework() = %q, want %q", f, FrameworkVite)
		}
	})

	t.Run("server.js detects express", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "server.js"), []byte{}, 0600)
		if f := DetectFramework(d); f != FrameworkExpress {
			t.Errorf("DetectFramework() = %q, want %q", f, FrameworkExpress)
		}
	})

	t.Run("app.js detects express", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "app.js"), []byte{}, 0600)
		if f := DetectFramework(d); f != FrameworkExpress {
			t.Errorf("DetectFramework() = %q, want %q", f, FrameworkExpress)
		}
	})

	t.Run("Dockerfile overrides other indicators", func(t *testing.T) {
		d := t.TempDir()
		os.WriteFile(filepath.Join(d, "Dockerfile"), []byte{}, 0600)
		os.WriteFile(filepath.Join(d, "next.config.js"), []byte{}, 0600)
		if f := DetectFramework(d); f != FrameworkCustom {
			t.Errorf("DetectFramework() = %q, want %q", f, FrameworkCustom)
		}
	})
}
