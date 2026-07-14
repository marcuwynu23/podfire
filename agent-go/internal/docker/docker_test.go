package docker

import (
	"testing"
)

func TestSanitizeForDocker(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"lowercases", "MyApp", "myapp"},
		{"replaces special chars", "hello world!", "hello-world"},
		{"collapses hyphens", "a---b", "a-b"},
		{"trims leading/trailing hyphens", "-app-", "app"},
		{"empty becomes app", "!@#$", "app"},
		{"mixed case and special", "My_Cool-App_v2.0", "my-cool-app-v2-0"},
		{"preserves hyphens", "my-app", "my-app"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SanitizeForDocker(tt.input)
			if got != tt.want {
				t.Errorf("SanitizeForDocker(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestUseLocalOnly(t *testing.T) {
	orig := GetEnv
	defer func() { GetEnv = orig }()

	t.Run("empty registry", func(t *testing.T) {
		GetEnv = func(key string) string { return "" }
		if !UseLocalOnly() {
			t.Error("UseLocalOnly() = false, want true")
		}
	})

	t.Run("set registry", func(t *testing.T) {
		GetEnv = func(key string) string { return "myregistry.io" }
		if UseLocalOnly() {
			t.Error("UseLocalOnly() = true, want false")
		}
	})

	t.Run("whitespace registry", func(t *testing.T) {
		GetEnv = func(key string) string { return "  myregistry.io  " }
		if UseLocalOnly() {
			t.Error("UseLocalOnly() = true, want false")
		}
	})
}

func TestGetImageTag(t *testing.T) {
	orig := GetEnv
	defer func() { GetEnv = orig }()

	t.Run("local tag", func(t *testing.T) {
		GetEnv = func(key string) string { return "" }
		got := GetImageTag("myapp", "abc123")
		want := "myapp:abc123"
		if got != want {
			t.Errorf("GetImageTag() = %q, want %q", got, want)
		}
	})

	t.Run("registry tag", func(t *testing.T) {
		GetEnv = func(key string) string { return "registry.io" }
		got := GetImageTag("myapp", "latest")
		want := "registry.io/myapp:latest"
		if got != want {
			t.Errorf("GetImageTag() = %q, want %q", got, want)
		}
	})

	t.Run("sanitizes service name", func(t *testing.T) {
		GetEnv = func(key string) string { return "" }
		got := GetImageTag("My App!", "v1")
		want := "my-app:v1"
		if got != want {
			t.Errorf("GetImageTag() = %q, want %q", got, want)
		}
	})
}

func TestDetectExposedPort(t *testing.T) {
	// This calls docker, so just test that it doesn't panic on bad input
	port, ok := DetectExposedPort("nonexistent-image:latest")
	if ok {
		t.Errorf("DetectExposedPort() = (%d, true), want (0, false)", port)
	}
}
