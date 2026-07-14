# PodFire Agent (TypeScript)

Connects to the gateway via WebSocket and executes deploy jobs: clone, detect framework, build Docker image, and deploy Swarm stacks.

See the main [README](../README.md) and [User Guide](../USER-GUIDE.md) for full setup and usage.

## Quick Start

```bash
cd agent
cp .env.example .env
pnpm install
pnpm start
```

## Commands

| Command | Description |
|---|---|
| `pnpm start` | Run the agent |
| `pnpm dev` | Run the agent (same) |
| `pnpm test` | Run tests |
| `pnpm build` | Compile TypeScript |

## Environment

| Variable | Default | Description |
|---|---|---|
| `AGENT_GATEWAY_URL` | `http://localhost:3001` | Gateway WebSocket URL |
| `AGENT_NAME` | `podfire-agent` | Display name in dashboard |
| `DOCKER_REGISTRY` | unset | Push images to registry; leave unset for local-only |
