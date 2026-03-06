/**
 * In-memory store of connected agents (WebSocket). Shared by custom server and API routes.
 */

const agents = new Map();

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
      list.push({ id: conn.id, name: conn.name, connectedAt: conn.connectedAt });
    } else {
      agents.delete(id);
    }
  }
  return list;
}

function dispatchJob(payload) {
  const conn = getFirstAgent();
  if (!conn) return false;
  try {
    const msg = payload.type != null ? payload : { type: "deploy", ...payload };
    conn.ws.send(JSON.stringify(msg));
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  agents,
  registerAgent,
  unregisterAgent,
  getAgent,
  listAgents,
  dispatchJob,
  getFirstAgent,
};
