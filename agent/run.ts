import "dotenv/config";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import WebSocket from "ws";
import { detectFramework } from "./lib/framework-detector";
import { copyTemplateToRepo } from "./lib/template-loader";
import { getImageTag, sanitizeForDocker, useLocalOnly } from "./lib/docker";
import { generateStackYaml, deployStack, sanitizeStackName, deployTraefikStack, removeTraefikStack, isTraefikRunning } from "./lib/stack";
import { runCommand, runCommandStream, formatOutput } from "./lib/run-command";
import { getAvailablePort } from "./lib/available-port";
import { runServiceDiagnostics } from "./lib/service-diagnostics";

type DeployPayload = {
  deploymentId: string;
  serviceId: string;
  repoUrl: string;
  branch: string;
  cloneUrl: string;
  serviceName: string;
  stackName: string;
  port?: number;
  hostPort?: number | null;
  replicas?: number | null;
  entryCommand?: string | null;
  buildCommand?: string | null;
  env?: Record<string, string> | null;
};

function runDeployFromJob(
  payload: DeployPayload,
  send: (msg: object) => void
): Promise<void> {
  const { deploymentId, cloneUrl, branch, serviceName, stackName } = payload;
  const port = payload.port ?? 80;
  const sendLog = (line: string) => send({ type: "log", deploymentId, line });
  const sendStatus = (status: string) => send({ type: "status", deploymentId, status });

  const imageTag = getImageTag(sanitizeForDocker(serviceName), "latest");
  const tmpDir = path.join(os.tmpdir(), `dockly-agent-${payload.serviceId}-${Date.now()}`);

  return (async () => {
    const startTime = Date.now();
    try {
      sendLog("========================================");
      sendLog("  DEPLOYMENT STARTED (verbose)");
      sendLog("========================================");
      sendLog(`  deploymentId: ${deploymentId}`);
      sendLog(`  serviceName:  ${serviceName}`);
      sendLog(`  stackName:    ${stackName ?? "(will use sanitized service name)"}`);
      sendLog(`  branch:       ${branch}`);
      sendLog(`  cloneUrl:     ${cloneUrl}`);
      sendLog(`  port:         ${port}`);
      sendLog(`  imageTag:     ${imageTag}`);
      sendLog(`  tempDir:      ${tmpDir}`);
      sendLog("----------------------------------------");

      sendStatus("building");
      sendLog("");
      sendLog("=== PHASE 1: CLONE REPOSITORY ===");
      sendLog(`Creating directory: ${tmpDir}`);
      fs.mkdirSync(tmpDir, { recursive: true });
      const cloneCmd = `git clone --depth 1 --branch "${branch}" "${cloneUrl}" repo`;
      sendLog(`Command: ${cloneCmd}`);
      sendLog(`Cwd:     ${tmpDir}`);
      sendLog("Running git clone...");
      const cloneResult = runCommand(cloneCmd, { cwd: tmpDir });
      sendLog(formatOutput(cloneResult));
      if (!cloneResult.success) {
        sendLog("Error: git clone failed.");
        sendStatus("failed");
        return;
      }
      sendLog("Clone completed successfully.");
      sendLog("");

      const repoPath = path.join(tmpDir, "repo");
      sendLog("=== PHASE 2: DETECT FRAMEWORK ===");
      sendLog(`Scanning repository at: ${repoPath}`);
      try {
        const topLevel = fs.readdirSync(repoPath);
        sendLog(`Top-level files: ${topLevel.join(", ")}`);
      } catch {
        sendLog("(could not list directory)");
      }
      const framework = detectFramework(repoPath);
      sendLog(`Detected framework: ${framework}`);
      sendLog("");

      if (framework !== "custom") {
        sendLog("=== PHASE 3: COPY DOCKER TEMPLATE ===");
        sendLog(`Applying ${framework} template (buildCommand: ${payload.buildCommand ?? "default"}, entryCommand: ${payload.entryCommand ?? "default"})`);
        copyTemplateToRepo(repoPath, framework, {
          buildCommand: payload.buildCommand ?? undefined,
          entryCommand: payload.entryCommand ?? undefined,
        });
        const copied = fs.readdirSync(repoPath).filter((f) => f === "Dockerfile" || f === ".dockerignore");
        sendLog(`Copied: ${copied.join(", ") || "Dockerfile"}`);
        sendLog("");
      } else {
        sendLog("=== PHASE 3: CUSTOM (no template) ===");
        sendLog("Using existing Dockerfile in repository.");
        sendLog("");
      }

      sendLog("=== PHASE 4: BUILD DOCKER IMAGE ===");
      const buildCmd = `docker build --progress=plain -t ${imageTag} .`;
      sendLog(`Command: ${buildCmd}`);
      sendLog(`Cwd:     ${repoPath}`);
      sendLog("Streaming build output (--progress=plain):");
      sendLog("----------------------------------------");
      const buildStream = await runCommandStream(buildCmd, (line: string) => sendLog(line), { cwd: repoPath });
      sendLog("----------------------------------------");
      sendLog(`Build process exited with code: ${buildStream.exitCode ?? "null"}`);
      if (!buildStream.success) {
        sendLog("Error: docker build failed.");
        sendStatus("failed");
        return;
      }
      sendLog("Build completed successfully.");
      sendLog("");

      if (useLocalOnly()) {
        sendLog("=== PHASE 5: SKIP PUSH (local only) ===");
        sendLog("Using local image (no registry push).");
        sendLog("");
      } else {
        sendStatus("pushing");
        sendLog("=== PHASE 5: PUSH IMAGE TO REGISTRY ===");
        const pushCmd = `docker push ${imageTag}`;
        sendLog(`Command: ${pushCmd}`);
        sendLog("Streaming push output:");
        sendLog("----------------------------------------");
        const pushStream = await runCommandStream(pushCmd, (line: string) => sendLog(line));
        sendLog("----------------------------------------");
        sendLog(`Push process exited with code: ${pushStream.exitCode ?? "null"}`);
        if (!pushStream.success) {
          sendLog("Error: docker push failed.");
          sendStatus("failed");
          return;
        }
        sendLog("Push completed successfully.");
        sendLog("");
      }

      sendStatus("deploying");
      const stack = stackName ?? sanitizeStackName(serviceName);
      const env = payload.env && typeof payload.env === "object" ? payload.env : undefined;
      const replicas = payload.replicas != null && payload.replicas >= 1 ? payload.replicas : undefined;
      sendLog("=== PHASE 6: DEPLOY STACK ===");
      sendLog(`Stack name:  ${stack}`);
      sendLog(`Image:       ${imageTag}`);
      sendLog(`Replicas:    ${replicas ?? 1}`);
      sendLog(`Env vars:    ${env ? Object.keys(env).join(", ") || "none" : "none"}`);
      const yaml = generateStackYaml(stack, imageTag, port, { env, replicas });
      sendLog("Generated stack YAML; running: docker stack deploy -c - " + stack);
      deployStack(stack, yaml);
      sendLog("Stack deploy command completed.");
      sendLog("");

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      sendLog("========================================");
      sendLog(`  DEPLOYMENT COMPLETE (${elapsed}s)`);
      sendLog("========================================");
      sendStatus("running");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      sendLog(`Error: ${message}`);
      if (err instanceof Error && err.stack) sendLog(err.stack);
      sendStatus("failed");
    } finally {
      try {
        sendLog("");
        sendLog("Cleaning up temporary directory: " + tmpDir);
        fs.rmSync(tmpDir, { recursive: true, force: true });
        sendLog("Cleanup done.");
      } catch (e) {
        sendLog("Cleanup warning: " + (e instanceof Error ? e.message : String(e)));
      }
    }
  })();
}

function connect(): WebSocket {
  // Connect to the agent gateway (default port 3001), not the main app
  const gatewayUrl = process.env.AGENT_GATEWAY_URL ?? "http://localhost:3001";
  const wsUrl = gatewayUrl.replace(/^http/, "ws") + "/ws/agent";
  const name = process.env.AGENT_NAME ?? "dockly-agent";
  console.log("[dockly-agent] Connecting to", wsUrl, "as", name);

  const ws = new WebSocket(wsUrl);

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "register", name }));
  });

  ws.on("message", async (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString()) as Record<string, unknown>;
      if (msg.type === "registered") {
        console.log("[dockly-agent] Registered with id:", msg.agentId);
      } else if (msg.type === "deploy") {
        const payload = msg as unknown as DeployPayload;
        console.log("[dockly-agent] Received deploy job", payload.deploymentId);
        const send = (obj: object) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
        };
        runDeployFromJob(payload, send).then(() => {
          console.log("[dockly-agent] Finished deployment", payload.deploymentId);
        });
      } else if (msg.type === "deploy-traefik") {
        const yaml = typeof msg.yaml === "string" ? msg.yaml : "";
        console.log("[dockly-agent] Deploy Traefik");
        try {
          deployTraefikStack(yaml);
          console.log("[dockly-agent] Traefik deployed");
        } catch (err) {
          console.error("[dockly-agent] Traefik deploy error:", err);
        }
      } else if (msg.type === "remove-traefik") {
        console.log("[dockly-agent] Remove Traefik");
        try {
          removeTraefikStack();
          console.log("[dockly-agent] Traefik removed");
        } catch (err) {
          console.error("[dockly-agent] Traefik remove error:", err);
        }
      } else if (msg.type === "get-traefik-status" && msg.requestId != null) {
        const requestId = msg.requestId as string;
        const running = isTraefikRunning();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "traefik-status", requestId, running }));
        }
      } else if (msg.type === "get-available-port" && msg.requestId != null) {
        const requestId = msg.requestId as string;
        getAvailablePort()
          .then((port: number) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "available-port", requestId, port }));
            }
          })
          .catch((_err: unknown) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "available-port", requestId, port: 0 }));
            }
          });
      } else if (msg.type === "get-service-logs" && msg.requestId != null && typeof msg.stackName === "string") {
        const requestId = msg.requestId as string;
        const stackName = String(msg.stackName).trim();
        const safe = sanitizeForDocker(stackName);
        const serviceName = `${safe}_app`;
        const result = runCommand(`docker service logs ${serviceName} --tail 1000 2>&1`);
        const logs = [result.stdout, result.stderr].filter(Boolean).join("\n").trim() || "(no logs)";
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "service-logs", requestId, logs }));
        }
      } else if (msg.type === "diagnose-service" && msg.requestId != null && typeof msg.stackName === "string") {
        const requestId = msg.requestId as string;
        const stackName = String(msg.stackName).trim();
        const port = typeof msg.port === "number" && msg.port >= 1 && msg.port <= 65535 ? msg.port : 3000;
        try {
          const diagnostics = await runServiceDiagnostics(stackName, port);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "service-diagnostics", requestId, diagnostics }));
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "service-diagnostics", requestId, error: message }));
          }
        }
      } else if (msg.type === "service-rollback" && msg.requestId != null && typeof msg.stackName === "string") {
        const requestId = msg.requestId as string;
        const stackName = String(msg.stackName).trim();
        const steps = typeof msg.steps === "number" ? Math.min(10, Math.max(1, Math.floor(msg.steps))) : 1;
        const safe = sanitizeForDocker(stackName);
        const serviceName = `${safe}_app`;
        let lastSuccess = true;
        const outputs: string[] = [];
        for (let i = 0; i < steps; i++) {
          const result = runCommand(`docker service rollback ${serviceName} 2>&1`);
          const out = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
          if (out) outputs.push(out);
          if (!result.success) lastSuccess = false;
        }
        const output = outputs.join("\n\n").trim() || "(no output)";
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "service-rollback-done", requestId, success: lastSuccess, output }));
        }
      } else if (msg.type === "service-scale" && msg.requestId != null && typeof msg.stackName === "string" && typeof msg.replicas === "number") {
        const requestId = msg.requestId as string;
        const stackName = String(msg.stackName).trim();
        const replicas = Math.min(32, Math.max(1, Math.floor(msg.replicas)));
        const safe = sanitizeForDocker(stackName);
        const serviceName = `${safe}_app`;
        const result = runCommand(`docker service scale ${serviceName}=${replicas} 2>&1`);
        const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim() || "(no output)";
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "service-scale-done", requestId, success: result.success, output }));
        }
      }
    } catch (err) {
      console.error("[dockly-agent] Message error:", err);
    }
  });

  ws.on("close", () => {
    console.log("[dockly-agent] Disconnected. Reconnecting in 5s...");
    setTimeout(connect, 5000);
  });

  ws.on("error", (err) => {
    console.error("[dockly-agent] WebSocket error:", err.message);
  });

  return ws;
}

console.log("[dockly-agent] Started. Register with the app via WebSocket.");
connect();
