package docker

import (
	"encoding/json"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

var (
	nonAlphaRe = regexp.MustCompile(`[^a-z0-9-]+`)
	dashRe     = regexp.MustCompile(`-+`)
)

// GetEnv returns the env getter (set from main with os.Getenv).
var GetEnv = func(key string) string { return "" }

// UseLocalOnly returns true when no registry is configured (skip push).
func UseLocalOnly() bool {
	return strings.TrimSpace(GetEnv("DOCKER_REGISTRY")) == ""
}

// GetImageTag returns the full image tag (registry/name:tag or name:tag).
func GetImageTag(serviceName, commitOrTag string) string {
	safe := SanitizeForDocker(serviceName)
	r := strings.TrimSpace(GetEnv("DOCKER_REGISTRY"))
	if r == "" {
		return safe + ":" + commitOrTag
	}
	return r + "/" + safe + ":" + commitOrTag
}

// DetectExposedPort checks the image for EXPOSE directives and returns the first port.
func DetectExposedPort(imageTag string) (int, bool) {
	cmd := exec.Command("docker", "image", "inspect", imageTag,
		"--format", "{{json .ContainerConfig.ExposedPorts}}")
	out, err := cmd.Output()
	if err != nil {
		return 0, false
	}
	trimmed := strings.TrimSpace(string(out))
	if trimmed == "" || trimmed == "null" || trimmed == "<no value>" {
		return 0, false
	}
	var ports map[string]interface{}
	if err := json.Unmarshal([]byte(trimmed), &ports); err != nil {
		return 0, false
	}
	for key := range ports {
		parts := strings.SplitN(key, "/", 2)
		p, err := strconv.Atoi(parts[0])
		if err == nil {
			return p, true
		}
	}
	return 0, false
}

// SanitizeForDocker normalizes a name for Docker (lowercase, alphanumeric and hyphens).
func SanitizeForDocker(name string) string {
	s := strings.ToLower(name)
	s = nonAlphaRe.ReplaceAllString(s, "-")
	s = dashRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		return "app"
	}
	return s
}
