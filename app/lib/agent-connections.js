/**
 * In-memory store of connected agents (WebSocket). Shared by custom server and API routes.
 * Deploy jobs are queued when no agent is connected or the single agent is busy; one deploy at a time per agent.
 */

const agents = new Map();

// Deploy queue: one job at a time is sent to the first available agent; others wait.
const deployQueue = [];
let busyDeploymentId = null;

/** Called when a deploy job is actually sent to an agent (not queued). Args: (deploymentId, { agentId, agentName }). */
let onDeployDispatched = null;
function setOnDeployDispatched(fn) {
  onDeployDispatched = fn;
}

function generateId() {
  return "agent-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

function registerAgent(ws, name = "Agent", keyId = null) {
  const agentId = generateId();
  agents.set(agentId, {
    id: agentId,
    ws,
    name: String(name),
    connectedAt: new Date().toISOString(),
    keyId: keyId || null,
  });
  return agentId;
}

function getAgent(agentId) {
  const conn = agents.get(agentId);
  if (!conn || conn.ws.readyState !== 1) return null;
  return conn;
}

function unregisterAgent(agentId) {
  agents.delete(agentId);
  // If this was the busy agent, clear busy so queue can advance (next agent or when one reconnects)
  if (busyDeploymentId) {
    busyDeploymentId = null;
    processDeployQueue();
  }
}

function getFirstAgent() {
  for (const [, conn] of agents) {
    if (conn.ws.readyState === 1) return conn; // OPEN
  }
  return null;
}

function listAgents() {
  const list = [];
  for (const [id, conn] of agents) {
    if (conn.ws.readyState === 1) {
      list.push({ id: conn.id, name: conn.name, connectedAt: conn.connectedAt, keyId: conn.keyId ?? null });
    } else {
      agents.delete(id);
    }
  }
  return list;
}

function isDeployPayload(payload) {
  return payload && payload.deploymentId != null && (payload.type === undefined || payload.type === "deploy");
}

/** Send one job from the queue to the first available agent. Called after a deploy finishes or when an agent registers. */
function processDeployQueue() {
  while (deployQueue.length > 0) {
    const conn = getFirstAgent();
    if (!conn || busyDeploymentId) return;
    const payload = deployQueue.shift();
    try {
      const msg = payload.type != null ? payload : { type: "deploy", ...payload };
      conn.ws.send(JSON.stringify(msg));
      busyDeploymentId = payload.deploymentId;
      if (onDeployDispatched) onDeployDispatched(payload.deploymentId, { agentId: conn.id, agentName: conn.name });
      return;
    } catch (err) {
      deployQueue.unshift(payload);
      return;
    }
  }
}

/**
 * Dispatch a deploy job: send now if an agent is free, otherwise queue.
 * Returns { ok: boolean, queued: boolean }. ok true means accepted (sent or queued).
 */
function dispatchDeployJob(payload) {
  if (!isDeployPayload(payload)) return { ok: false, queued: false };
  const conn = getFirstAgent();
  if (!conn) {
    deployQueue.push(payload);
    return { ok: true, queued: true };
  }
  if (busyDeploymentId) {
    deployQueue.push(payload);
    return { ok: true, queued: true };
  }
  try {
    const msg = payload.type != null ? payload : { type: "deploy", ...payload };
    conn.ws.send(JSON.stringify(msg));
    busyDeploymentId = payload.deploymentId;
    if (onDeployDispatched) onDeployDispatched(payload.deploymentId, { agentId: conn.id, agentName: conn.name });
    return { ok: true, queued: false };
  } catch {
    return { ok: false, queued: false };
  }
}

/** Call when a deployment reaches a terminal state (running or failed) so the next queued job can run. */
function markDeployFinished(deploymentId) {
  if (busyDeploymentId === deploymentId) {
    busyDeploymentId = null;
    processDeployQueue();
  }
}

/**
 * Dispatch any job. For deploy payloads (have deploymentId), uses queue + single-agent busy state.
 * For other payloads (update-stack-labels, deploy-traefik, etc.), sends to first agent or returns false.
 * Returns { ok: boolean, queued?: boolean }. queued only set for deploy jobs.
 */
function dispatchJob(payload) {
  if (isDeployPayload(payload)) {
    return dispatchDeployJob(payload);
  }
  const conn = getFirstAgent();
  if (!conn) return { ok: false };
  try {
    const msg = payload.type != null ? payload : { type: "deploy", ...payload };
    conn.ws.send(JSON.stringify(msg));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

module.exports = {
  agents,
  registerAgent,
  unregisterAgent,
  getAgent,
  listAgents,
  dispatchJob,
  dispatchDeployJob,
  markDeployFinished,
  processDeployQueue,
  setOnDeployDispatched,
  getFirstAgent,
};
