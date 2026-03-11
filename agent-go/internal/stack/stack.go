package stack

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/marcuwynu23/podfire/agent-go/internal/docker"
	"github.com/marcuwynu23/podfire/agent-go/internal/run"
)

var getEnv = func(key string) string { return "" }

// SetGetEnv sets the env getter (from main).
func SetGetEnv(fn func(string) string) {
	getEnv = fn
}

func network() string {
	n := getEnv("TRAEFIK_NETWORK")
	if n != "" {
		return n
	}
	return "web"
}

func envToYaml(env map[string]string) string {
	if len(env) == 0 {
		return ""
	}
	var lines []string
	for k, v := range env {
		if v == "" {
			continue
		}
		// Quote if contains newline, colon, or #
		if strings.ContainsAny(v, "\n:#") {
			v = strconv.Quote(v)
		}
		lines = append(lines, "      "+k+": "+v)
	}
	if len(lines) == 0 {
		return ""
	}
	return "    environment:\n" + strings.Join(lines, "\n") + "\n"
}

func resourcesBlock(cpuLimit, memoryLimit string) string {
	c := strings.TrimSpace(cpuLimit)
	m := strings.TrimSpace(memoryLimit)
	if c == "" && m == "" {
		return ""
	}
	var parts []string
	if c != "" {
		parts = append(parts, `        cpus: "`+c+`"`)
	}
	if m != "" {
		parts = append(parts, "        memory: "+m)
	}
	if len(parts) == 0 {
		return ""
	}
	return "      resources:\n        limits:\n" + strings.Join(parts, "\n") + "\n"
}

// GenerateStackYaml produces the Docker Stack YAML for the app service.
func GenerateStackYaml(stackName, imageTag string, port int, opts *StackOptions) string {
	safe := docker.SanitizeForDocker(stackName)
	domain := ""
	if opts != nil && opts.Domain != "" {
		domain = strings.TrimSpace(opts.Domain)
	}
	host := safe + ".localhost"
	if domain != "" {
		host = safe + "." + domain
	}
	envBlock := ""
	if opts != nil && len(opts.Env) > 0 {
		envBlock = envToYaml(opts.Env)
	}
	replicas := 1
	if opts != nil && opts.Replicas >= 1 && opts.Replicas <= 32 {
		replicas = opts.Replicas
	}
	cpuLimit := ""
	memoryLimit := ""
	if opts != nil {
		cpuLimit = opts.CPULimit
		memoryLimit = opts.MemoryLimit
	}
	resources := resourcesBlock(cpuLimit, memoryLimit)
	traefikServiceName := safe + "_app"
	net := network()
	hostRule := "Host(`" + host + "`)"
	return `version: "3.9"

networks:
  ` + net + `:
    external: true

services:
  app:
    image: ` + imageTag + `
` + envBlock + `    networks:
      - ` + net + `
    deploy:
      replicas: ` + strconv.Itoa(replicas) + `
` + resources + `      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=` + net + `"
        - "traefik.http.routers.` + safe + `.rule=` + hostRule + `"
        - "traefik.http.routers.` + safe + `.entrypoints=web"
        - "traefik.http.routers.` + safe + `.service=` + traefikServiceName + `"
        - "traefik.http.services.` + traefikServiceName + `.loadbalancer.server.port=` + strconv.Itoa(port) + `"
`
}

// StackOptions for GenerateStackYaml.
type StackOptions struct {
	Env         map[string]string
	Replicas    int
	Domain      string
	CPULimit    string
	MemoryLimit string
}

func ensureSwarmNetwork() {
	net := network()
	res := run.Run("docker network create --driver overlay --attachable "+net, "")
	if !res.Success && !strings.Contains(res.Stderr, "already exists") {
		// log warning
	}
}

// DeployStack writes yaml to a temp file and runs docker stack deploy.
func DeployStack(stackName, yamlContent string) error {
	ensureSwarmNetwork()
	dir := filepath.Join(".", ".stack-tmp")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	safe := docker.SanitizeForDocker(stackName)
	file := filepath.Join(dir, safe+"-stack.yml")
	if err := os.WriteFile(file, []byte(yamlContent), 0600); err != nil {
		return err
	}
	defer os.Remove(file)
	res := run.Run(`docker stack deploy -c "`+file+`" `+safe, "")
	if !res.Success {
		return fmt.Errorf("docker stack deploy failed:\n%s", run.FormatOutput(res))
	}
	return nil
}

// SanitizeStackName returns a Docker-safe stack name.
func SanitizeStackName(name string) string {
	return docker.SanitizeForDocker(name)
}

const traefikStackName = "traefik"

// DeployTraefikStack deploys the Traefik stack.
func DeployTraefikStack(yamlContent string) error {
	ensureSwarmNetwork()
	dir := filepath.Join(".", ".stack-tmp")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	file := filepath.Join(dir, "traefik-stack.yml")
	if err := os.WriteFile(file, []byte(yamlContent), 0600); err != nil {
		return err
	}
	defer os.Remove(file)
	res := run.Run("docker stack deploy -c "+file+" "+traefikStackName, "")
	if !res.Success {
		return fmt.Errorf("traefik deploy failed:\n%s", run.FormatOutput(res))
	}
	return nil
}

// RemoveTraefikStack removes the Traefik stack.
func RemoveTraefikStack() error {
	res := run.Run("docker stack rm "+traefikStackName, "")
	if !res.Success && !strings.Contains(res.Stderr, "Nothing found") {
		return fmt.Errorf("traefik remove failed:\n%s", run.FormatOutput(res))
	}
	return nil
}

// IsTraefikRunning returns true if the traefik stack has running tasks.
func IsTraefikRunning() bool {
	res := run.Run("docker stack ps traefik --no-trunc -q", "")
	if !res.Success {
		return false
	}
	return strings.TrimSpace(res.Stdout) != ""
}

// ParseEnvMap converts a JSON object to map[string]string (for stack options).
func ParseEnvMap(data []byte) (map[string]string, error) {
	var m map[string]string
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	return m, nil
}
