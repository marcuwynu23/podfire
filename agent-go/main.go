package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/marcuwynu23/podfire/agent-go/internal/diagnostics"
	"github.com/marcuwynu23/podfire/agent-go/internal/docker"
	"github.com/marcuwynu23/podfire/agent-go/internal/framework"
	"github.com/marcuwynu23/podfire/agent-go/internal/port"
	"github.com/marcuwynu23/podfire/agent-go/internal/run"
	"github.com/marcuwynu23/podfire/agent-go/internal/stack"
	"github.com/marcuwynu23/podfire/agent-go/internal/template"
)

const (
	agentKeyFile = ".agent-key"
	heartbeatDur = 30 * time.Second
)

func main() {
	// Inject env getter into packages
	getEnv := func(key string) string { return os.Getenv(key) }
	docker.GetEnv = getEnv
	stack.SetGetEnv(getEnv)
	diagnostics.SetGetEnv(getEnv)

	secret, isNew := getOrCreateAgentSecret()
	if isNew {
		log.Println("[podfire-agent] Generated agent key. You must confirm it before connecting.")
		log.Println("[podfire-agent] Key:", secret)
		log.Println("[podfire-agent] Add this key in the app (Dashboard → Agents → Add Agent), then run the agent again.")
		os.Exit(0)
	}

	gatewayURL := getEnv("AGENT_GATEWAY_URL")
	if gatewayURL == "" {
		gatewayURL = "http://localhost:3001"
	}
	wsURL := strings.Replace(gatewayURL, "http://", "ws://", 1)
	wsURL = strings.Replace(wsURL, "https://", "wss://", 1)
	wsURL = strings.TrimSuffix(wsURL, "/") + "/ws/agent"

	agentName := getEnv("AGENT_NAME")
	if agentName == "" {
		agentName = "podfire-agent"
	}

	log.Println("[podfire-agent] Started. Connecting to", wsURL, "as", agentName)
	for {
		connectAndRun(wsURL, secret, agentName)
		log.Println("[podfire-agent] Disconnected. Reconnecting in 5s...")
		time.Sleep(5 * time.Second)
	}
}

func getOrCreateAgentSecret() (secret string, isNew bool) {
	cwd, _ := os.Getwd()
	keyPath := filepath.Join(cwd, agentKeyFile)
	data, err := os.ReadFile(keyPath)
	if err == nil {
		s := strings.TrimSpace(string(data))
		if len(s) >= 16 {
			return s, false
		}
	}
	secret = randomHex(32)
	_ = os.WriteFile(keyPath, []byte(secret), 0600)
	return secret, true
}

func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func connectAndRun(wsURL, secret, name string) {
	dialer := websocket.Dialer{HandshakeTimeout: 10 * time.Second}
	conn, _, err := dialer.Dial(wsURL, nil)
	if err != nil {
		log.Printf("[podfire-agent] WebSocket dial error: %v", err)
		return
	}
	defer conn.Close()

	// Register
	conn.WriteJSON(map[string]string{
		"type":   "register",
		"secret": secret,
		"name":   name,
	})

	var wg sync.WaitGroup
	stopHeartbeat := make(chan struct{})
	wg.Add(1)
	go func() {
		defer wg.Done()
		ticker := time.NewTicker(heartbeatDur)
		defer ticker.Stop()
		for {
			select {
			case <-stopHeartbeat:
				return
			case <-ticker.C:
				conn.WriteJSON(map[string]string{"type": "heartbeat"})
			}
		}
	}()

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var msg map[string]interface{}
		if json.Unmarshal(data, &msg) != nil {
			continue
		}
		typ, _ := msg["type"].(string)
		switch typ {
		case "register-failed":
			if e, _ := msg["error"].(string); e != "" {
				log.Println("[podfire-agent]", e)
			}
			close(stopHeartbeat)
			return
		case "registered":
			log.Println("[podfire-agent] Registered with id:", msg["agentId"])
		case "deploy":
			handleDeploy(conn, msg)
		case "update-stack-labels":
			handleUpdateStackLabels(conn, msg)
		case "deploy-traefik":
			handleDeployTraefik(conn, msg)
		case "remove-traefik":
			handleRemoveTraefik(conn)
		case "get-traefik-status":
			handleTraefikStatus(conn, msg)
		case "get-available-port":
			handleAvailablePort(conn, msg)
		case "get-service-logs":
			handleServiceLogs(conn, msg)
		case "get-service-status":
			handleServiceStatus(conn, msg)
		case "diagnose-service":
			handleDiagnoseService(conn, msg)
		case "service-rollback":
			handleServiceRollback(conn, msg)
		case "service-scale":
			handleServiceScale(conn, msg)
		}
	}
	close(stopHeartbeat)
	wg.Wait()
}

func send(conn *websocket.Conn, v interface{}) {
	conn.WriteJSON(v)
}

func handleDeploy(conn *websocket.Conn, msg map[string]interface{}) {
	payload := parseDeployPayload(msg)
	if payload == nil {
		return
	}
	log.Println("[podfire-agent] Received deploy job", payload.DeploymentID)
	go runDeployFromJob(conn, payload)
}

func parseDeployPayload(msg map[string]interface{}) *DeployPayload {
	p := &DeployPayload{}
	p.DeploymentID, _ = msg["deploymentId"].(string)
	p.ServiceID, _ = msg["serviceId"].(string)
	p.RepoURL, _ = msg["repoUrl"].(string)
	p.Branch, _ = msg["branch"].(string)
	p.CloneURL, _ = msg["cloneUrl"].(string)
	p.ServiceName, _ = msg["serviceName"].(string)
	p.StackName, _ = msg["stackName"].(string)
	if d, ok := msg["domain"]; ok && d != nil {
		p.Domain, _ = d.(string)
	}
	if port, ok := msg["port"].(float64); ok {
		p.Port = int(port)
	} else {
		p.Port = 80
	}
	if r, ok := msg["replicas"].(float64); ok {
		p.Replicas = int(r)
	}
	if c, ok := msg["cpuLimit"]; ok && c != nil {
		p.CPULimit, _ = c.(string)
	}
	if m, ok := msg["memoryLimit"]; ok && m != nil {
		p.MemoryLimit, _ = m.(string)
	}
	if e, ok := msg["entryCommand"]; ok && e != nil {
		p.EntryCommand, _ = e.(string)
	}
	if b, ok := msg["buildCommand"]; ok && b != nil {
		p.BuildCommand, _ = b.(string)
	}
	if o, ok := msg["outputDirectory"]; ok && o != nil {
		p.OutputDirectory, _ = o.(string)
	}
	if env, ok := msg["env"].(map[string]interface{}); ok {
		p.Env = make(map[string]string)
		for k, v := range env {
			if s, ok := v.(string); ok {
				p.Env[k] = s
			}
		}
	}
	return p
}

type DeployPayload struct {
	DeploymentID    string
	ServiceID       string
	RepoURL         string
	Branch          string
	CloneURL        string
	ServiceName     string
	StackName       string
	Domain          string
	Port            int
	Replicas        int
	CPULimit        string
	MemoryLimit     string
	EntryCommand    string
	BuildCommand    string
	OutputDirectory string
	Env             map[string]string
}

func runDeployFromJob(conn *websocket.Conn, p *DeployPayload) {
	deploymentID := p.DeploymentID
	sendLog := func(line string) { send(conn, map[string]interface{}{"type": "log", "deploymentId": deploymentID, "line": line}) }
	sendStatus := func(status string) { send(conn, map[string]interface{}{"type": "status", "deploymentId": deploymentID, "status": status}) }
	sendPhase := func(phase string, duration float64) {
		send(conn, map[string]interface{}{"type": "phase", "deploymentId": deploymentID, "phase": phase, "durationSeconds": duration})
	}

	imageTag := docker.GetImageTag(docker.SanitizeForDocker(p.ServiceName), "latest")
	tmpDir := filepath.Join(os.TempDir(), "podfire-agent-"+p.ServiceID+"-"+strconv.FormatInt(time.Now().UnixMilli(), 10))
	defer func() {
		os.RemoveAll(tmpDir)
	}()

	startTime := time.Now()
	phaseStart := startTime

	sendLog("========================================")
	sendLog("  DEPLOYMENT STARTED (verbose)")
	sendLog("========================================")
	sendLog("  deploymentId: " + deploymentID)
	sendLog("  serviceName:  " + p.ServiceName)
	sendLog("  stackName:    " + p.StackName)
	sendLog("  branch:       " + p.Branch)
	sendLog("  cloneUrl:     " + p.CloneURL)
	sendLog("  port:         " + strconv.Itoa(p.Port))
	sendLog("  imageTag:     " + imageTag)
	sendLog("  tempDir:      " + tmpDir)
	sendLog("----------------------------------------")

	sendStatus("building")
	sendLog("")
	sendLog("=== PHASE 1: CLONE REPOSITORY ===")
	os.MkdirAll(tmpDir, 0755)
	sendLog("Running: git clone --depth 1 --branch \"" + p.Branch + "\" \"" + p.CloneURL + "\" repo")
	res := run.RunGitClone(p.Branch, p.CloneURL, tmpDir)
	sendLog(run.FormatOutput(res))
	if !res.Success {
		sendPhase("clone", time.Since(phaseStart).Seconds())
		sendLog("Error: git clone failed.")
		sendStatus("failed")
		return
	}
	sendPhase("clone", time.Since(phaseStart).Seconds())
	sendLog("Clone completed successfully.")
	sendLog("")

	repoPath := filepath.Join(tmpDir, "repo")
	sendLog("=== PHASE 2: DETECT FRAMEWORK ===")
	fw := framework.DetectFramework(repoPath)
	sendLog("Detected framework: " + string(fw))
	sendLog("")

	if fw != framework.FrameworkCustom {
		sendLog("=== PHASE 3: COPY DOCKER TEMPLATE ===")
		opts := &template.Options{
			BuildCommand:   p.BuildCommand,
			EntryCommand:   p.EntryCommand,
			OutputDirectory: p.OutputDirectory,
		}
		if err := template.CopyTemplateToRepo(repoPath, fw, opts); err != nil {
			sendLog("Error copying template: " + err.Error())
			sendStatus("failed")
			return
		}
		sendLog("Copied: Dockerfile")
		sendLog("")
	} else {
		sendLog("=== PHASE 3: CUSTOM (no template) ===")
		sendLog("Using existing Dockerfile in repository.")
		sendLog("")
	}

	phaseStart = time.Now()
	sendLog("=== PHASE 4: BUILD DOCKER IMAGE ===")
	buildCmd := "docker build --progress=plain -t " + imageTag + " ."
	success, exitCode := run.RunStream(buildCmd, repoPath, func(line string) { sendLog(line) })
	if !success {
		sendPhase("build", time.Since(phaseStart).Seconds())
		sendLog("Error: docker build failed.")
		sendStatus("failed")
		return
	}
	sendLog("----------------------------------------")
	sendLog("Build process exited with code: " + run.ExitCodeString(exitCode))
	sendPhase("build", time.Since(phaseStart).Seconds())
	sendLog("Build completed successfully.")
	sendLog("")

	if docker.UseLocalOnly() {
		sendLog("=== PHASE 5: SKIP PUSH (local only) ===")
		sendPhase("push", 0)
		sendLog("")
	} else {
		phaseStart = time.Now()
		sendStatus("pushing")
		sendLog("=== PHASE 5: PUSH IMAGE TO REGISTRY ===")
		pushCmd := "docker push " + imageTag
		success, _ := run.RunStream(pushCmd, "", func(line string) { sendLog(line) })
		if !success {
			sendPhase("push", time.Since(phaseStart).Seconds())
			sendLog("Error: docker push failed.")
			sendStatus("failed")
			return
		}
		sendPhase("push", time.Since(phaseStart).Seconds())
		sendLog("Push completed successfully.")
		sendLog("")
	}

	phaseStart = time.Now()
	sendStatus("deploying")
	stackName := p.StackName
	if stackName == "" {
		stackName = stack.SanitizeStackName(p.ServiceName)
	}
	opts := &stack.StackOptions{
		Env:         p.Env,
		Replicas:    p.Replicas,
		Domain:      p.Domain,
		CPULimit:    p.CPULimit,
		MemoryLimit: p.MemoryLimit,
	}
	if opts.Replicas < 1 {
		opts.Replicas = 1
	}
	yaml := stack.GenerateStackYaml(stackName, imageTag, p.Port, opts)
	if err := stack.DeployStack(stackName, yaml); err != nil {
		sendLog("Error: " + err.Error())
		sendPhase("deploy", time.Since(phaseStart).Seconds())
		sendStatus("failed")
		return
	}
	sendPhase("deploy", time.Since(phaseStart).Seconds())
	sendLog("Stack deploy command completed.")
	sendLog("")

	elapsed := time.Since(startTime).Seconds()
	sendLog("========================================")
	sendLog("  DEPLOYMENT COMPLETE (" + strconv.FormatFloat(elapsed, 'f', 1, 64) + "s)")
	sendLog("========================================")
	sendStatus("running")
	log.Println("[podfire-agent] Finished deployment", deploymentID)
}

func handleUpdateStackLabels(conn *websocket.Conn, msg map[string]interface{}) {
	stackName, _ := msg["stackName"].(string)
	serviceName, _ := msg["serviceName"].(string)
	stackName = strings.TrimSpace(stackName)
	serviceName = strings.TrimSpace(serviceName)
	if stackName == "" || serviceName == "" {
		log.Println("[podfire-agent] update-stack-labels: stackName and serviceName required")
		return
	}
	port := 80
	if p, ok := msg["port"].(float64); ok && p >= 1 && p <= 65535 {
		port = int(p)
	}
	domain, _ := msg["domain"].(string)
	domain = strings.TrimSpace(domain)
	replicas := 1
	if r, ok := msg["replicas"].(float64); ok && r >= 1 && r <= 32 {
		replicas = int(r)
	}
	var env map[string]string
	if e, ok := msg["env"].(map[string]interface{}); ok {
		env = make(map[string]string)
		for k, v := range e {
			if s, ok := v.(string); ok {
				env[k] = s
			}
		}
	}
	imageTag := docker.GetImageTag(docker.SanitizeForDocker(serviceName), "latest")
	opts := &stack.StackOptions{Env: env, Replicas: replicas, Domain: domain}
	yaml := stack.GenerateStackYaml(stackName, imageTag, port, opts)
	if err := stack.DeployStack(stackName, yaml); err != nil {
		log.Println("[podfire-agent] update-stack-labels error:", err)
		return
	}
	log.Println("[podfire-agent] Stack labels updated for", stackName)
}

func handleDeployTraefik(conn *websocket.Conn, msg map[string]interface{}) {
	yaml, _ := msg["yaml"].(string)
	log.Println("[podfire-agent] Deploy Traefik")
	if err := stack.DeployTraefikStack(yaml); err != nil {
		log.Println("[podfire-agent] Traefik deploy error:", err)
		return
	}
	log.Println("[podfire-agent] Traefik deployed")
}

func handleRemoveTraefik(conn *websocket.Conn) {
	log.Println("[podfire-agent] Remove Traefik")
	if err := stack.RemoveTraefikStack(); err != nil {
		log.Println("[podfire-agent] Traefik remove error:", err)
		return
	}
	log.Println("[podfire-agent] Traefik removed")
}

func handleTraefikStatus(conn *websocket.Conn, msg map[string]interface{}) {
	requestID, _ := msg["requestId"].(string)
	running := stack.IsTraefikRunning()
	send(conn, map[string]interface{}{"type": "traefik-status", "requestId": requestID, "running": running})
}

func handleAvailablePort(conn *websocket.Conn, msg map[string]interface{}) {
	requestID, _ := msg["requestId"].(string)
	p, err := port.GetAvailablePort()
	if err != nil {
		send(conn, map[string]interface{}{"type": "available-port", "requestId": requestID, "port": 0})
		return
	}
	send(conn, map[string]interface{}{"type": "available-port", "requestId": requestID, "port": p})
}

func handleServiceLogs(conn *websocket.Conn, msg map[string]interface{}) {
	requestID, _ := msg["requestId"].(string)
	stackName, _ := msg["stackName"].(string)
	stackName = strings.TrimSpace(stackName)
	safe := docker.SanitizeForDocker(stackName)
	svcName := safe + "_app"
	res := run.Run("docker service logs "+svcName+" --tail 1000 2>&1", "")
	logs := strings.TrimSpace(res.Stdout + "\n" + res.Stderr)
	if logs == "" {
		logs = "(no logs)"
	}
	send(conn, map[string]interface{}{"type": "service-logs", "requestId": requestID, "logs": logs})
}

func handleServiceStatus(conn *websocket.Conn, msg map[string]interface{}) {
	requestID, _ := msg["requestId"].(string)
	stackName, _ := msg["stackName"].(string)
	stackName = strings.TrimSpace(stackName)
	safe := docker.SanitizeForDocker(stackName)
	svcName := safe + "_app"
	res := run.Run("docker service ps "+svcName+" --no-trunc 2>&1", "")
	out := res.Stdout + res.Stderr
	notFound := !res.Success && (strings.Contains(out, "nothing found") || strings.Contains(out, "No such service"))
	running := res.Success && strings.Contains(out, "Running")
	send(conn, map[string]interface{}{"type": "service-status", "requestId": requestID, "running": !notFound && running})
}

func handleDiagnoseService(conn *websocket.Conn, msg map[string]interface{}) {
	requestID, _ := msg["requestId"].(string)
	stackName, _ := msg["stackName"].(string)
	stackName = strings.TrimSpace(stackName)
	port := 3000
	if p, ok := msg["port"].(float64); ok && p >= 1 && p <= 65535 {
		port = int(p)
	}
	domain, _ := msg["domain"].(string)
	diag, err := diagnostics.RunServiceDiagnostics(stackName, port, domain)
	if err != nil {
		send(conn, map[string]interface{}{"type": "service-diagnostics", "requestId": requestID, "error": err.Error()})
		return
	}
	// Send as JSON-serializable map
	b, _ := json.Marshal(diag)
	var m map[string]interface{}
	json.Unmarshal(b, &m)
	send(conn, map[string]interface{}{"type": "service-diagnostics", "requestId": requestID, "diagnostics": m})
}

func handleServiceRollback(conn *websocket.Conn, msg map[string]interface{}) {
	requestID, _ := msg["requestId"].(string)
	stackName, _ := msg["stackName"].(string)
	stackName = strings.TrimSpace(stackName)
	steps := 1
	if s, ok := msg["steps"].(float64); ok {
		n := int(s)
		if n < 1 {
			n = 1
		}
		if n > 10 {
			n = 10
		}
		steps = n
	}
	safe := docker.SanitizeForDocker(stackName)
	svcName := safe + "_app"
	var lastSuccess bool
	var outputs []string
	for i := 0; i < steps; i++ {
		res := run.Run("docker service rollback "+svcName+" 2>&1", "")
		out := strings.TrimSpace(res.Stdout + "\n" + res.Stderr)
		if out != "" {
			outputs = append(outputs, out)
		}
		lastSuccess = res.Success
	}
	output := strings.Join(outputs, "\n\n")
	if output == "" {
		output = "(no output)"
	}
	send(conn, map[string]interface{}{"type": "service-rollback-done", "requestId": requestID, "success": lastSuccess, "output": output})
}

func handleServiceScale(conn *websocket.Conn, msg map[string]interface{}) {
	requestID, _ := msg["requestId"].(string)
	stackName, _ := msg["stackName"].(string)
	stackName = strings.TrimSpace(stackName)
	replicas, ok := msg["replicas"].(float64)
	if !ok {
		return
	}
	n := int(replicas)
	if n < 1 {
		n = 1
	}
	if n > 32 {
		n = 32
	}
	safe := docker.SanitizeForDocker(stackName)
	svcName := safe + "_app"
	res := run.Run("docker service scale "+svcName+"="+strconv.Itoa(n)+" 2>&1", "")
	output := strings.TrimSpace(res.Stdout + "\n" + res.Stderr)
	if output == "" {
		output = "(no output)"
	}
	send(conn, map[string]interface{}{"type": "service-scale-done", "requestId": requestID, "success": res.Success, "output": output})
}
