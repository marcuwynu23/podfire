/**
 * Standalone agent gateway on port 3001.
 * Agents connect via WebSocket; app (Next.js on 3000) calls /agents and /dispatch over HTTP.
 * This keeps Next.js "next dev" (so HMR works) and gives a single place for agent state.
 */
require("dotenv").config();
const http = require("http");
const WebSocket = require("ws");
const { PrismaClient } = require("@prisma/client");
const {
  registerAgent,
  unregisterAgent,
  getAgent,
  listAgents,
  dispatchJob,
  getFirstAgent,
} = require("./lib/agent-connections.js");

const traefikStatusPending = new Map();
const availablePortPending = new Map();
const serviceLogsPending = new Map();
const serviceDiagnosticsPending = new Map();
const serviceRollbackPending = new Map();
const serviceScalePending = new Map();
const TRAEFIK_STATUS_TIMEOUT_MS = 12000;
const AVAILABLE_PORT_TIMEOUT_MS = 5000;
const SERVICE_LOGS_TIMEOUT_MS = 8000;
const SERVICE_DIAGNOSTICS_TIMEOUT_MS = 60000;
const SERVICE_ACTION_TIMEOUT_MS = 30000;
const SERVICE_SCALE_TIMEOUT_MS = 60000;

const prisma = new PrismaClient();
const port = parseInt(process.env.AGENT_GATEWAY_PORT || "3001", 10);

// Registration is only allowed if the key was confirmed in the app (Dashboard → Agents → Add Agent). No auto-connect.
const agentRegistrationKey = prisma.agentRegistrationKey;
if (typeof agentRegistrationKey?.findUnique !== "function") {
  console.error("[gateway] Prisma client missing agentRegistrationKey. Run: npx prisma generate && npx prisma db push. Restart the gateway.");
  process.exit(1);
}

// Optional: only for app→gateway HTTP. If set, app must send Authorization: Bearer <this>. If unset, HTTP is allowed (no auth). Agent never uses this — agent generates its own key.
const GATEWAY_API_SECRET = process.env.GATEWAY_API_SECRET?.trim() || "";

function checkGatewayAuth(req, res) {
  if (!GATEWAY_API_SECRET) return true; // no secret configured = allow (agent key is the only auth, for WebSocket)
  const auth = req.headers?.authorization;
  const token = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== GATEWAY_API_SECRET) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing or invalid authorization." }));
    return false;
  }
  return true;
}

// Batch deployment log writes to avoid SQLite lock timeouts (app and gateway share the same DB)
const LOG_FLUSH_MS = 400;
const LOG_FLUSH_THRESHOLD = 15;
const logBuffers = new Map(); // deploymentId -> { lines: string[], timeoutId: ReturnType<setTimeout> }

function flushDeploymentLog(deploymentId) {
  const buf = logBuffers.get(deploymentId);
  if (!buf || buf.lines.length === 0) return Promise.resolve();
  const lines = buf.lines.splice(0, buf.lines.length);
  if (buf.timeoutId) {
    clearTimeout(buf.timeoutId);
    buf.timeoutId = null;
  }
  const append = lines.map((l) => l + "\n").join("");
  return prisma.deployment
    .findUnique({ where: { id: deploymentId }, select: { logs: true } })
    .then((d) =>
      prisma.deployment.update({
        where: { id: deploymentId },
        data: { logs: (d?.logs ?? "") + append },
      })
    )
    .catch((err) => {
      console.error("[gateway] appendDeploymentLog flush error:", err?.message ?? err);
    });
}

function appendDeploymentLog(deploymentId, line) {
  let buf = logBuffers.get(deploymentId);
  if (!buf) {
    buf = { lines: [], timeoutId: null };
    logBuffers.set(deploymentId, buf);
  }
  buf.lines.push(line);
  if (buf.lines.length >= LOG_FLUSH_THRESHOLD) {
    return flushDeploymentLog(deploymentId);
  }
  if (!buf.timeoutId) {
    buf.timeoutId = setTimeout(() => {
      buf.timeoutId = null;
      flushDeploymentLog(deploymentId);
    }, LOG_FLUSH_MS);
  }
  return Promise.resolve();
}

async function setDeploymentStatus(deploymentId, status) {
  const deployment = await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status },
    select: { serviceId: true, commitSha: true },
  });
  if (status === "running" && deployment.commitSha) {
    await prisma.service.update({
      where: { id: deployment.serviceId },
      data: { lastDeployedCommitSha: deployment.commitSha },
    });
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || "/", "http://localhost");
  const pathname = u.pathname;

  if (!checkGatewayAuth(req, res)) return;

  if (req.method === "GET" && pathname === "/agents") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ agents: listAgents(), connected: listAgents().length }));
    return;
  }

  if (req.method === "POST" && pathname === "/dispatch") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const sent = dispatchJob(payload);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: sent }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: String(err.message) }));
      }
    });
    return;
  }

  if (req.method === "GET" && pathname === "/traefik/status") {
    const conn = getFirstAgent();
    if (!conn) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ running: false, error: "No agent connected" }));
      return;
    }
    const requestId = "ts-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    const promise = new Promise((resolve, reject) => {
      traefikStatusPending.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (traefikStatusPending.has(requestId)) {
          traefikStatusPending.delete(requestId);
          reject(new Error("timeout"));
        }
      }, TRAEFIK_STATUS_TIMEOUT_MS);
    });
    try {
      conn.ws.send(JSON.stringify({ type: "get-traefik-status", requestId }));
      const running = await promise;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ running: !!running }));
    } catch (err) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ running: false, error: err.message || "timeout" }));
    }
    return;
  }

  if (req.method === "POST" && pathname === "/traefik/deploy") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const yaml = payload.yaml;
        if (typeof yaml !== "string" || !yaml.trim()) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "yaml required" }));
          return;
        }
        const sent = dispatchJob({ type: "deploy-traefik", yaml });
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: sent, error: sent ? null : "No agent connected" }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: String(err.message) }));
      }
    });
    return;
  }

  if (req.method === "GET" && pathname === "/agent/available-port") {
    const conn = getFirstAgent();
    if (!conn) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "No agent connected", port: null }));
      return;
    }
    const requestId = "ap-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    const promise = new Promise((resolve, reject) => {
      availablePortPending.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (availablePortPending.has(requestId)) {
          availablePortPending.delete(requestId);
          reject(new Error("timeout"));
        }
      }, AVAILABLE_PORT_TIMEOUT_MS);
    });
    try {
      conn.ws.send(JSON.stringify({ type: "get-available-port", requestId }));
      const port = await promise;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ port: Number(port) }));
    } catch (err) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "timeout", port: null }));
    }
    return;
  }

  if (req.method === "POST" && pathname === "/traefik/remove") {
    const sent = dispatchJob({ type: "remove-traefik" });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: sent, error: sent ? null : "No agent connected" }));
    return;
  }

  if (req.method === "GET" && pathname === "/service-diagnostics") {
    const stackName = u.searchParams.get("stackName");
    const portParam = u.searchParams.get("port");
    const port = portParam ? parseInt(portParam, 10) : 80;
    if (!stackName || !String(stackName).trim()) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "stackName required" }));
      return;
    }
    const conn = getFirstAgent();
    if (!conn) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "No agent connected", diagnostics: null }));
      return;
    }
    const requestId = "sd-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    const promise = new Promise((resolve, reject) => {
      serviceDiagnosticsPending.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (serviceDiagnosticsPending.has(requestId)) {
          serviceDiagnosticsPending.delete(requestId);
          reject(new Error("timeout"));
        }
      }, SERVICE_DIAGNOSTICS_TIMEOUT_MS);
    });
    try {
      conn.ws.send(JSON.stringify({ type: "diagnose-service", requestId, stackName: String(stackName).trim(), port: Number.isFinite(port) ? port : 80 }));
      const payload = await promise;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "timeout", diagnostics: null }));
    }
    return;
  }

  if (req.method === "POST" && pathname === "/service-rollback") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      (async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const stackName = payload.stackName && String(payload.stackName).trim();
          if (!stackName) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "stackName required" }));
            return;
          }
          const conn = getFirstAgent();
          if (!conn) {
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "No agent connected" }));
            return;
          }
          const steps = typeof payload.steps === "number" ? Math.min(10, Math.max(1, Math.floor(payload.steps))) : 1;
          const requestId = "rb-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
          const promise = new Promise((resolve, reject) => {
            serviceRollbackPending.set(requestId, { resolve, reject });
            setTimeout(() => {
              if (serviceRollbackPending.has(requestId)) {
                serviceRollbackPending.delete(requestId);
                reject(new Error("timeout"));
              }
            }, SERVICE_ACTION_TIMEOUT_MS);
          });
          conn.ws.send(JSON.stringify({ type: "service-rollback", requestId, stackName, steps }));
          const result = await promise;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message || "timeout" }));
        }
      })();
    });
    return;
  }

  if (req.method === "POST" && pathname === "/service-scale") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      (async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const stackName = payload.stackName && String(payload.stackName).trim();
          const replicas = typeof payload.replicas === "number" ? Math.min(32, Math.max(1, Math.floor(payload.replicas))) : null;
          if (!stackName || replicas == null) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "stackName and replicas (1-32) required" }));
            return;
          }
          const conn = getFirstAgent();
          if (!conn) {
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "No agent connected" }));
            return;
          }
          const requestId = "sc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
          const promise = new Promise((resolve, reject) => {
            serviceScalePending.set(requestId, { resolve, reject });
            setTimeout(() => {
              if (serviceScalePending.has(requestId)) {
                serviceScalePending.delete(requestId);
                reject(new Error("timeout"));
              }
            }, SERVICE_SCALE_TIMEOUT_MS);
          });
          conn.ws.send(JSON.stringify({ type: "service-scale", requestId, stackName, replicas }));
          const result = await promise;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message || "timeout" }));
        }
      })();
    });
    return;
  }

  if (req.method === "GET" && pathname === "/service-logs") {
    const stackName = u.searchParams.get("stackName");
    if (!stackName || !String(stackName).trim()) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "stackName required" }));
      return;
    }
    const conn = getFirstAgent();
    if (!conn) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "No agent connected", logs: null }));
      return;
    }
    const requestId = "sl-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    const promise = new Promise((resolve, reject) => {
      serviceLogsPending.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (serviceLogsPending.has(requestId)) {
          serviceLogsPending.delete(requestId);
          reject(new Error("timeout"));
        }
      }, SERVICE_LOGS_TIMEOUT_MS);
    });
    try {
      conn.ws.send(JSON.stringify({ type: "get-service-logs", requestId, stackName: String(stackName).trim() }));
      const { logs, error } = await promise;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ logs: logs ?? null, error: error ? true : null }));
    } catch (err) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "timeout", logs: null }));
    }
    return;
  }

  if (req.method === "POST" && pathname === "/agent/disconnect") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      const send = (code, obj) => {
        res.statusCode = code;
        res.end(JSON.stringify(obj));
      };
      (async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const agentId = typeof payload.agentId === "string" ? payload.agentId.trim() : "";
          if (!agentId) {
            send(200, { ok: true });
            return;
          }
          const conn = getAgent(agentId);
          if (conn) {
            try { conn.ws.close(); } catch (_) {}
            unregisterAgent(agentId);
          }
          send(200, { ok: true });
        } catch (err) {
          send(400, { error: String(err?.message || err) });
        }
      })().catch((err) => {
        send(500, { error: String(err?.message || err) });
      });
    });
    return;
  }

  res.statusCode = 404;
  res.end("Not found");
});

const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws) => {
  let agentId = null;
  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "register") {
        const secret = typeof msg.secret === "string" ? msg.secret.trim() : "";
        if (!secret) {
          console.log("[gateway] Registration rejected: missing secret.");
          ws.send(JSON.stringify({ type: "register-failed", error: "Missing secret. Agent must send the generated key." }));
          ws.close();
          return;
        }
        const key = await prisma.agentRegistrationKey.findUnique({ where: { secret } }).catch((err) => {
          console.error("[gateway] DB error checking key:", err?.message || err);
          return null;
        });
        if (!key || !key.id) {
          console.log("[gateway] Registration rejected: key not confirmed. Add the key in the app (Dashboard → Agents → Add Agent) first.");
          ws.send(JSON.stringify({ type: "register-failed", error: "Key not confirmed. Add this key in the app (Dashboard → Agents → Add Agent) first, then restart the agent." }));
          ws.close();
          return;
        }
        const displayName = (key.name && key.name.trim()) ? key.name.trim() : (msg.name || "Agent");
        agentId = registerAgent(ws, displayName, key.id);
        ws.send(JSON.stringify({ type: "registered", agentId }));
        console.log("[gateway] Agent registered:", agentId, displayName);
      } else if (msg.type === "log" && msg.deploymentId && msg.line != null) {
        appendDeploymentLog(msg.deploymentId, msg.line);
      } else if (msg.type === "status" && msg.deploymentId && msg.status) {
        await flushDeploymentLog(msg.deploymentId);
        await setDeploymentStatus(msg.deploymentId, msg.status);
      } else if (msg.type === "traefik-status" && msg.requestId != null) {
        const pending = traefikStatusPending.get(msg.requestId);
        if (pending) {
          traefikStatusPending.delete(msg.requestId);
          pending.resolve(msg.running === true);
        }
      } else if (msg.type === "available-port" && msg.requestId != null) {
        const pending = availablePortPending.get(msg.requestId);
        if (pending) {
          availablePortPending.delete(msg.requestId);
          pending.resolve(msg.port ?? 0);
        }
      } else if (msg.type === "service-logs" && msg.requestId != null) {
        const pending = serviceLogsPending.get(msg.requestId);
        if (pending) {
          serviceLogsPending.delete(msg.requestId);
          pending.resolve({ logs: msg.logs ?? null, error: msg.error === true });
        }
      } else if (msg.type === "service-diagnostics" && msg.requestId != null) {
        const pending = serviceDiagnosticsPending.get(msg.requestId);
        if (pending) {
          serviceDiagnosticsPending.delete(msg.requestId);
          pending.resolve(msg.error ? { error: msg.error } : { diagnostics: msg.diagnostics });
        }
      } else if (msg.type === "service-rollback-done" && msg.requestId != null) {
        const pending = serviceRollbackPending.get(msg.requestId);
        if (pending) {
          serviceRollbackPending.delete(msg.requestId);
          pending.resolve({ success: msg.success === true, output: msg.output ?? "" });
        }
      } else if (msg.type === "service-scale-done" && msg.requestId != null) {
        const pending = serviceScalePending.get(msg.requestId);
        if (pending) {
          serviceScalePending.delete(msg.requestId);
          pending.resolve({ success: msg.success === true, output: msg.output ?? "" });
        }
      } else if (msg.type === "update-service-hostport" && msg.serviceId && msg.hostPort != null) {
        try {
          await prisma.service.update({
            where: { id: msg.serviceId },
            data: { hostPort: Number(msg.hostPort) },
          });
        } catch (e) {
          console.error("[gateway] update-service-hostport:", e);
        }
      }
    } catch (err) {
      console.error("[gateway] Message error:", err);
    }
  });
  ws.on("close", () => {
    if (agentId) {
      unregisterAgent(agentId);
      console.log("[gateway] Agent disconnected:", agentId);
    }
  });
});

server.on("upgrade", (req, socket, head) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (pathname === "/ws/agent") {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

server.listen(port, () => {
  console.log("[gateway] Agent gateway on http://localhost:" + port);
  console.log("[gateway] WebSocket: ws://localhost:" + port + "/ws/agent");
  if (!GATEWAY_API_SECRET) {
    console.log("[gateway] GATEWAY_API_SECRET not set — HTTP API is open (only agent key required for WebSocket register).");
  }
});
