package docker

import (
	"regexp"
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
