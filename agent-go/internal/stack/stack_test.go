package stack

import (
	"strings"
	"testing"
)

func TestEnvToYaml(t *testing.T) {
	t.Run("empty map returns empty string", func(t *testing.T) {
		if s := envToYaml(nil); s != "" {
			t.Errorf("envToYaml(nil) = %q, want %q", s, "")
		}
		if s := envToYaml(map[string]string{}); s != "" {
			t.Errorf("envToYaml({}) = %q, want %q", s, "")
		}
	})

	t.Run("includes env lines", func(t *testing.T) {
		out := envToYaml(map[string]string{"PORT": "8080", "NODE_ENV": "production"})
		if !strings.Contains(out, "environment:") {
			t.Error("output missing 'environment:' header")
		}
		if !strings.Contains(out, "PORT: 8080") {
			t.Error("output missing PORT: 8080")
		}
		if !strings.Contains(out, "NODE_ENV: production") {
			t.Error("output missing NODE_ENV: production")
		}
	})

	t.Run("skips empty values", func(t *testing.T) {
		out := envToYaml(map[string]string{"PORT": "", "NODE_ENV": "prod"})
		if strings.Contains(out, "PORT:") {
			t.Error("should skip empty value")
		}
		if !strings.Contains(out, "NODE_ENV: prod") {
			t.Error("should include non-empty value")
		}
	})

	t.Run("quotes values with colons", func(t *testing.T) {
		out := envToYaml(map[string]string{"VAR": "a:b"})
		if !strings.Contains(out, `"a:b"`) {
			t.Errorf("expected quoted value, got: %s", out)
		}
	})
}

func TestResourcesBlock(t *testing.T) {
	t.Run("empty returns empty", func(t *testing.T) {
		if s := resourcesBlock("", ""); s != "" {
			t.Errorf("resourcesBlock('','') = %q, want %q", s, "")
		}
	})

	t.Run("cpu limit only", func(t *testing.T) {
		out := resourcesBlock("1.5", "")
		if !strings.Contains(out, `cpus: "1.5"`) {
			t.Errorf("expected CPU limit, got: %s", out)
		}
		if strings.Contains(out, "memory:") {
			t.Error("should not include memory")
		}
	})

	t.Run("memory limit only", func(t *testing.T) {
		out := resourcesBlock("", "512m")
		if !strings.Contains(out, "memory: 512m") {
			t.Errorf("expected memory limit, got: %s", out)
		}
		if strings.Contains(out, "cpus:") {
			t.Error("should not include cpus")
		}
	})

	t.Run("both limits", func(t *testing.T) {
		out := resourcesBlock("2", "1g")
		if !strings.Contains(out, `cpus: "2"`) {
			t.Errorf("expected CPU limit, got: %s", out)
		}
		if !strings.Contains(out, "memory: 1g") {
			t.Errorf("expected memory limit, got: %s", out)
		}
	})
}

func TestGenerateStackYaml(t *testing.T) {
	t.Run("basic YAML with defaults", func(t *testing.T) {
		yaml := GenerateStackYaml("myapp", "myapp:latest", 80, nil)
		if !strings.Contains(yaml, "image: myapp:latest") {
			t.Error("missing image line")
		}
		if !strings.Contains(yaml, "myapp.localhost") {
			t.Error("missing host")
		}
		if !strings.Contains(yaml, "replicas: 1") {
			t.Error("missing replicas")
		}
		if strings.Contains(yaml, "environment:") {
			t.Error("should not have environment block")
		}
		if strings.Contains(yaml, "resources:") {
			t.Error("should not have resources block")
		}
	})

	t.Run("custom port in Traefik label", func(t *testing.T) {
		yaml := GenerateStackYaml("myapp", "img:1", 5000, nil)
		if !strings.Contains(yaml, "loadbalancer.server.port=5000") {
			t.Error("missing port in Traefik label")
		}
	})

	t.Run("uses domain instead of localhost", func(t *testing.T) {
		yaml := GenerateStackYaml("myapp", "img:1", 80, &StackOptions{Domain: "example.com"})
		if !strings.Contains(yaml, "myapp.example.com") {
			t.Error("missing custom domain")
		}
		if strings.Contains(yaml, "myapp.localhost") {
			t.Error("should not use localhost when domain is set")
		}
	})

	t.Run("includes environment variables", func(t *testing.T) {
		yaml := GenerateStackYaml("myapp", "img:1", 80, &StackOptions{
			Env: map[string]string{"PORT": "8080", "NODE_ENV": "production"},
		})
		if !strings.Contains(yaml, "environment:") {
			t.Error("missing environment block")
		}
		if !strings.Contains(yaml, "PORT: 8080") {
			t.Error("missing PORT env")
		}
		if !strings.Contains(yaml, "NODE_ENV: production") {
			t.Error("missing NODE_ENV env")
		}
	})

	t.Run("replicas above 32 default to 1", func(t *testing.T) {
		yaml := GenerateStackYaml("myapp", "img:1", 80, &StackOptions{Replicas: 100})
		if !strings.Contains(yaml, "replicas: 1") {
			t.Error("replicas above 32 should default to 1")
		}
	})

	t.Run("ensures at least 1 replica", func(t *testing.T) {
		yaml := GenerateStackYaml("myapp", "img:1", 80, &StackOptions{Replicas: 0})
		if !strings.Contains(yaml, "replicas: 1") {
			t.Error("replicas should be at least 1")
		}
	})

	t.Run("includes CPU and memory limits", func(t *testing.T) {
		yaml := GenerateStackYaml("myapp", "img:1", 80, &StackOptions{
			CPULimit:    "1.5",
			MemoryLimit: "512m",
		})
		if !strings.Contains(yaml, `cpus: "1.5"`) {
			t.Error("missing CPU limit")
		}
		if !strings.Contains(yaml, "memory: 512m") {
			t.Error("missing memory limit")
		}
	})

	t.Run("sanitizes stack name", func(t *testing.T) {
		yaml := GenerateStackYaml("My App!", "img:1", 3000, nil)
		if !strings.Contains(yaml, "my-app.localhost") {
			t.Errorf("expected sanitized host, got: %s", yaml)
		}
	})
}
