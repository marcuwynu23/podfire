# PodFire Agent (Go)

Single-binary deploy agent. Same protocol and behavior as the TypeScript agent, with lower memory usage.

See the main [README](../README.md) and [User Guide](../USER-GUIDE.md) for full setup and usage.

## Quick Start

```bash
cd agent-go
make run
```

## Commands

| Command | Description |
|---|---|
| `make build` | Build binary |
| `make run` | Run the agent |
| `make test` | Run tests |
| `make clean` | Clean artifacts |

## Cross-Compile

```bash
GOOS=linux GOARCH=amd64 go build -o podfire-agent-linux-amd64 .
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `AGENT_GATEWAY_URL` | `http://localhost:3001` | Gateway base URL |
| `AGENT_NAME` | `podfire-agent` | Display name in dashboard |
| `DOCKER_REGISTRY` | unset | Push images to registry; leave unset for local-only |
| `TRAEFIK_NETWORK` | `web` | Overlay network name |
| `TRAEFIK_HTTP_PORT` | `80` | Traefik HTTP port for diagnostics |
