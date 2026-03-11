package diagnostics

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/marcuwynu23/podfire/agent-go/internal/docker"
	"github.com/marcuwynu23/podfire/agent-go/internal/run"
)

var getEnv = func(key string) string { return "" }

// SetGetEnv sets the env getter.
func SetGetEnv(fn func(string) string) {
	getEnv = fn
}

const (
	traefikService  = "traefik_traefik"
	curlImage       = "curlimages/curl:latest"
	defaultHTTPPort = 80
)

// Verdict is the diagnostic result.
type Verdict string

const (
	VerdictOK                  Verdict = "ok"
	VerdictContainerNotServing Verdict = "container_not_serving"
	VerdictTraefikRouting      Verdict = "traefik_routing"
	VerdictServiceNotFound    Verdict = "service_not_found"
	VerdictUnknown             Verdict = "unknown"
)

// ServiceDiagnostics holds the full diagnostic result.
type ServiceDiagnostics struct {
	StackName             string  `json:"stackName"`
	ServiceName           string  `json:"serviceName"`
	ExpectedPort          int     `json:"expectedPort"`
	ExpectedHost          string  `json:"expectedHost"`
	ServiceExists         bool    `json:"serviceExists"`
	ServiceTasksSummary   string  `json:"serviceTasksSummary"`
	ServiceInspectSnippet string  `json:"serviceInspectSnippet"`
	ContainerReachable    bool    `json:"containerReachable"`
	ContainerHTTPStatus   *int    `json:"containerHttpStatus,omitempty"`
	ContainerCurlError    *string `json:"containerCurlError,omitempty"`
	TraefikLogs           string  `json:"traefikLogs"`
	TraefikMentionsService bool   `json:"traefikMentionsService"`
	Verdict               Verdict `json:"verdict"`
	Summary               string  `json:"summary"`
}

func traefikHTTPPort() int {
	p := getEnv("TRAEFIK_HTTP_PORT")
	if p == "" {
		return defaultHTTPPort
	}
	n, _ := strconv.Atoi(p)
	if n >= 1 && n <= 65535 {
		return n
	}
	return defaultHTTPPort
}

func network() string {
	n := getEnv("TRAEFIK_NETWORK")
	if n != "" {
		return n
	}
	return "web"
}

func runCmd(cmd string) (success bool, out string) {
	r := run.Run(cmd, "")
	out = strings.TrimSpace(r.Stdout + "\n" + r.Stderr)
	return r.Success, out
}

func fetchStatusFromHost(port int, timeout time.Duration, host, hostHeader string) (statusCode int, errMsg string) {
	url := fmt.Sprintf("http://%s:%d/", host, port)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return 0, err.Error()
	}
	if hostHeader != "" {
		req.Host = hostHeader
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err.Error()
	}
	defer resp.Body.Close()
	return resp.StatusCode, ""
}

func fetchViaTraefik(expectedHost string, timeout time.Duration) (statusCode int, errMsg string) {
	port := traefikHTTPPort()
	addr := fmt.Sprintf("127.0.0.1:%d", port)
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return 0, err.Error()
	}
	conn.Close()
	// HTTP GET with Host header
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return 0, err.Error()
	}
	req.Host = expectedHost
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err.Error()
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	return resp.StatusCode, ""
}

// RunServiceDiagnostics runs the full diagnostic for a deployed service.
func RunServiceDiagnostics(stackName string, containerPort int, domain string) (*ServiceDiagnostics, error) {
	safe := docker.SanitizeForDocker(stackName)
	svcName := safe + "_app"
	expectedHost := safe + ".localhost"
	if strings.TrimSpace(domain) != "" {
		expectedHost = safe + "." + strings.TrimSpace(domain)
	}

	result := &ServiceDiagnostics{
		StackName:             stackName,
		ServiceName:           svcName,
		ExpectedPort:          containerPort,
		ExpectedHost:          expectedHost,
		Verdict:               VerdictUnknown,
	}

	// 1. Service exists and tasks
	ok, out := runCmd("docker service ps " + svcName + " --no-trunc 2>&1")
	if !ok && (strings.Contains(out, "nothing found") || strings.Contains(out, "No such service")) {
		result.ServiceTasksSummary = "Service not found (stack may not be deployed or name mismatch)."
		result.Verdict = VerdictServiceNotFound
		result.Summary = "Service " + svcName + " not found. Deploy the stack first."
		return result, nil
	}
	result.ServiceExists = true
	if len(out) > 1500 {
		out = out[:1500]
	}
	result.ServiceTasksSummary = out

	_, inspectOut := runCmd("docker service inspect " + svcName + " 2>&1")
	if len(inspectOut) > 2000 {
		inspectOut = inspectOut[:2000]
	}
	result.ServiceInspectSnippet = inspectOut

	// 2. Probe via Traefik
	timeout := 10 * time.Second
	code, errMsg := fetchViaTraefik(expectedHost, timeout)
	if errMsg != "" {
		code, errMsg = fetchStatusFromHost(traefikHTTPPort(), timeout, "host.docker.internal", expectedHost)
	}
	if errMsg == "" && code > 0 {
		result.ContainerReachable = true
		result.ContainerHTTPStatus = &code
	}

	if !result.ContainerReachable {
		netName := network()
		curlURL := fmt.Sprintf("http://%s:%d/", svcName, containerPort)
		curlCmd := fmt.Sprintf("docker run --rm --network %s %s -s -o /dev/null -w \"%%{http_code}\" --connect-timeout 8 --max-time 15 \"%s\" 2>&1", netName, curlImage, curlURL)
		_, curlOut := runCmd(curlCmd)
		curlOut = strings.TrimSpace(curlOut)
		if len(curlOut) >= 3 {
			if c, err := strconv.Atoi(curlOut[:3]); err == nil && c >= 100 && c <= 599 {
				result.ContainerHTTPStatus = &c
				result.ContainerReachable = true
			}
		}
		if !result.ContainerReachable {
			traefikURL := "http://localhost"
			if traefikHTTPPort() != 80 {
				traefikURL = fmt.Sprintf("http://localhost:%d", traefikHTTPPort())
			}
			errStr := "Traefik probe failed (fetch " + traefikURL + " with Host: " + expectedHost + "). "
			if strings.Contains(curlOut, "not manually attachable") {
				errStr += "In-network curl skipped (overlay network '" + netName + "' is not attachable from this host)."
			} else {
				if len(curlOut) > 350 {
					curlOut = curlOut[:350]
				}
				errStr += curlOut
			}
			result.ContainerCurlError = &errStr
		}
	}

	// 3. Traefik logs
	_, traefikLogs := runCmd("docker service logs " + traefikService + " --tail 80 2>&1")
	if len(traefikLogs) > 4000 {
		traefikLogs = traefikLogs[:4000]
	}
	result.TraefikLogs = traefikLogs
	result.TraefikMentionsService = strings.Contains(traefikLogs, safe) ||
		strings.Contains(traefikLogs, svcName) ||
		strings.Contains(traefikLogs, expectedHost)

	// 4. Verdict and summary
	traefikURL := "http://localhost"
	if traefikHTTPPort() != 80 {
		traefikURL = fmt.Sprintf("http://localhost:%d", traefikHTTPPort())
	}
	if !result.ContainerReachable {
		result.Verdict = VerdictContainerNotServing
		result.Summary = fmt.Sprintf("Container is not responding on port %d (Traefik label port). Check: (1) App listens on 0.0.0.0 (not 127.0.0.1). (2) App listens on the same port as the service config (default 80). (3) Server is bound to that port and correct root/proxy.", containerPort)
	} else if !result.TraefikMentionsService && result.TraefikLogs != "" {
		result.Verdict = VerdictTraefikRouting
		result.Summary = "Container responds to direct curl, but Traefik may not have discovered the service or Host header may not match. Check Traefik logs above; ensure labels (traefik.enable, Host rule, loadbalancer.server.port) match and Traefik is on the same Swarm network."
	} else if result.ContainerReachable && (result.ContainerHTTPStatus != nil && (*result.ContainerHTTPStatus == 200 || *result.ContainerHTTPStatus == 304)) {
		result.Verdict = VerdictOK
		result.Summary = fmt.Sprintf("Reached via Traefik (fetch %s with Host: %s). Open http://%s in the browser.", traefikURL, expectedHost, expectedHost)
	} else if result.ContainerReachable {
		result.Verdict = VerdictOK
		status := 0
		if result.ContainerHTTPStatus != nil {
			status = *result.ContainerHTTPStatus
		}
		result.Summary = fmt.Sprintf("Reached via Traefik: HTTP %d. Open http://%s. For 2xx on /, check app root or server config.", status, expectedHost)
	} else {
		result.Verdict = VerdictTraefikRouting
		result.Summary = fmt.Sprintf("Could not reach container on port %d. Ensure the service is on network '%s', Traefik label loadbalancer.server.port=%d, and the app listens on 0.0.0.0:%d.", containerPort, network(), containerPort, containerPort)
	}

	return result, nil
}

// ToJSON returns the diagnostics as JSON for the gateway response.
func ToJSON(d *ServiceDiagnostics) ([]byte, error) {
	return json.Marshal(d)
}
