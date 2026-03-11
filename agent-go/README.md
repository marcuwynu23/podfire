# Podfire Deploy Agent (Go)

Single-binary deploy agent for Podfire. Same behavior as the Node.js agent (`agent/`), with lower memory use and better performance under load. Compatible with the existing app and agent gateway.

## Features

- **Single binary** — no Node.js or npm required on the agent host
- **Low memory** — typical footprint under 20MB
- **Same protocol** — connects to the same gateway WebSocket (`/ws/agent`) and handles all message types: deploy, update-stack-labels, Traefik deploy/remove/status, available port, service logs/status/diagnostics/rollback/scale
- **Same deploy flow** — clone → detect framework (nextjs/vite/express/node/custom) → copy Docker template → build → push (or skip if local) → stack deploy

## Build

```bash
cd agent-go
go build -o podfire-agent .
```

Cross-compile for Linux (e.g. for a deployment server):

```bash
GOOS=linux GOARCH=amd64 go build -o podfire-agent-linux-amd64 .
```

## Run

1. Start the **agent gateway** from the app directory (same as with the Node agent):
   ```bash
   cd app && npm run agent-gateway
   ```
2. First run: the agent generates a key and exits. Add that key in the app: **Dashboard → Agents → Add Agent**, then run the agent again.
3. Run the agent (from `agent-go` or any directory where you want `.agent-key` to live):
   ```bash
   ./podfire-agent
   ```
   Or with env:
   ```bash
   AGENT_GATEWAY_URL=http://your-gateway:3001 AGENT_NAME=my-agent ./podfire-agent
   ```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_GATEWAY_URL` | `http://localhost:3001` | Gateway base URL (ws:// or wss:// is derived) |
| `AGENT_NAME` | `podfire-agent` | Display name in the dashboard |
| `DOCKER_REGISTRY` | (empty) | If set, images are pushed to this registry; if empty, push is skipped (local only) |
| `TRAEFIK_NETWORK` | `web` | Docker overlay network name for Traefik |
| `TRAEFIK_HTTP_PORT` | `80` | Traefik HTTP port for diagnostics |

The agent writes its secret to `.agent-key` in the current working directory (same as the Node agent).

## App compatibility

No changes required in the app. The gateway and app already speak the same WebSocket and HTTP API; the Go agent is a drop-in replacement for the Node agent. Use the same **Add Agent** flow and deploy triggers from the dashboard.
