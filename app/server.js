require("dotenv").config();
const http = require("http");
const next = require("next");
const WebSocket = require("ws");
const { PrismaClient } = require("@prisma/client");
const {
  registerAgent,
  unregisterAgent,
  listAgents,
  dispatchJob,
  getFirstAgent,
} = require("./lib/agent-connections.js");

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

async function appendDeploymentLog(deploymentId, line) {
  const d = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    select: { logs: true },
  });
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { logs: (d?.logs ?? "") + line + "\n" },
  });
}

async function setDeploymentStatus(deploymentId, status) {
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status },
  });
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || "/", "http://localhost");
    handle(req, res, { pathname: u.pathname, query: Object.fromEntries(u.searchParams) });
  });

  const wss = new WebSocket.Server({ noServer: true });

  wss.on("connection", (ws, req) => {
    let agentId = null;
    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "register") {
          agentId = registerAgent(ws, msg.name ?? "Agent");
          ws.send(JSON.stringify({ type: "registered", agentId }));
          console.log("[ws] Agent registered:", agentId, msg.name ?? "");
        } else if (msg.type === "log" && msg.deploymentId && msg.line != null) {
          await appendDeploymentLog(msg.deploymentId, msg.line);
        } else if (msg.type === "status" && msg.deploymentId && msg.status) {
          await setDeploymentStatus(msg.deploymentId, msg.status);
        }
      } catch (err) {
        console.error("[ws] Message error:", err);
      }
    });
    ws.on("close", () => {
      if (agentId) {
        unregisterAgent(agentId);
        console.log("[ws] Agent disconnected:", agentId);
      }
    });
  });

  server.on("upgrade", (req, socket, head) => {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    if (pathname === "/ws/agent") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log("> Ready on http://localhost:" + port);
    console.log("> Agent WebSocket: ws://localhost:" + port + "/ws/agent");
  });
});
