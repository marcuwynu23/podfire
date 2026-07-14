<div align="center">
  <img src="docs/favicon.svg" alt="PodFire" width="96" height="96"/>
</div>

<div align="center">

# PodFire

<a href="https://github.com/marcuwynu23/podfire/releases"><img src="https://img.shields.io/github/v/release/marcuwynu23/podfire" alt="Release"></a>
<a href="LICENSE"><img src="https://img.shields.io/github/license/marcuwynu23/podfire" alt="License"></a>
<a href="https://github.com/marcuwynu23/podfire/stargazers"><img src="https://img.shields.io/github/stars/marcuwynu23/podfire" alt="Stars"></a>
<img src="https://img.shields.io/badge/node-18%2B-green" alt="Node">
<img src="https://img.shields.io/badge/go-1.21%2B-blue" alt="Go">

**Self-hosted deployment platform. Connect a Git repository, deploy as a Docker Swarm service, and route traffic with Traefik — all from one dashboard.**

➡️ **[Read the full user guide →](USER-GUIDE.md)**

</div>

---

## Table of Contents

- [What Is PodFire?](#what-is-podfire)
- [Use Cases](#use-cases)
- [Benefits](#benefits)
- [Comparison](#comparison)
- [User Guide](USER-GUIDE.md)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development](#development)
- [License](#license)

---

## What Is PodFire?

**PodFire** is a self-hosted deployment platform that turns Git repositories into running Docker Swarm services. It combines a web dashboard, a WebSocket-based agent system, and automatic Traefik routing so you can go from `git push` to `https://yourapp.localhost` without configuration overhead.

### What It Does

- **Deploys** — Clone a repo, detect the framework, build a Docker image, and deploy it as a Swarm stack with one click
- **Routes** — Automatically configures Traefik labels so every service is reachable at `{service}.localhost` (or a custom domain)
- **Streams logs** — Live build output and container logs stream back to the dashboard
- **Auto-deploys** — Periodically checks for new commits and redeploys when `deployMode` is `auto`
- **Manages services** — Scale, set environment variables, configure resource limits, and update routing from the UI
- **Runs diagnostics** — Probe container reachability and Traefik routing to debug deployment issues

### Why Use It?

| Problem | How PodFire Solves It |
|---|---|
| Setting up Docker Compose/Swarm for every project | One-click deploy from the dashboard — framework detection, Dockerfile generation, and stack deployment are automatic |
| Configuring Traefik or nginx reverse proxy | Traefik labels are injected into every stack automatically; services are reachable at `name.localhost` instantly |
| Managing multiple agents for CI/CD | Agents connect via WebSocket; dispatch is automatic and queued when no agent is free |
| Debugging deployment failures | Live build logs, container diagnostics, and Traefik log inspection built into the dashboard |
| Manual port management | Container ports are auto-assigned (8000+) and injected as the `PORT` environment variable |

### The Philosophy

1. **Minimal setup, maximum value.** Connect a repo, click Deploy. No YAML editing, no CI pipeline configuration.
2. **Your infrastructure stays yours.** Self-hosted, single binary agents, no vendor lock-in.
3. **Transparency by default.** Every build step is streamed as structured logs. Diagnostics probe the actual running state.

---

## Use Cases

| Scenario | How PodFire Helps |
|---|---|
| **Self-host a side project** | Deploy a personal app from a private GitHub repo in under a minute |
| **Team staging environment** | Each PR branch deploys as an isolated service with its own URL |
| **Demo or preview deployments** | Share a `name.localhost` link with stakeholders immediately after deploy |
| **Learning Docker Swarm** | Visual dashboard shows what Swarm stacks, services, and tasks look like in practice |

---

## Benefits

- **One-command deploy** — Click "Deploy" in the dashboard, the agent handles the rest
- **Framework auto-detection** — Next.js, Vite, Express, and Node.js projects are detected and get optimized Dockerfiles
- **Auto port assignment** — Each service gets a unique port (8000+) with `PORT` env var injected; no conflicts
- **Live streaming logs** — Build output and container logs appear in real time in the browser
- **Auto-deploy on commit** — Optional cron-triggered auto-deploy checks for new commits and redeploys
- **Service diagnostics** — Probe the running container and Traefik routing to identify issues
- **Traefik integration** — Automatic label injection; services are routable immediately
- **Two agent implementations** — TypeScript (Node.js) and Go agents available; same protocol, same behavior
- **SQLite-backed** — No external database needed; Prisma with SQLite for zero-config storage

---

## Comparison

| Aspect | PodFire | Docker Compose | manual Traefik + CI |
|---|---|---|---|
| **Setup time** | ~10 minutes | ~30 minutes | Hours to days |
| **Dashboard** | Built-in | None | None |
| **Framework detection** | Automatic | Manual Dockerfile | Manual |
| **Auto port management** | Automatic | Manual | Manual |
| **Live deploy logs** | Built-in | `docker compose logs` | CI logs |
| **Service discovery** | Automatic (Traefik) | Manual routing | Manual |
| **Auto-deploy** | Built-in (cron) | External CI | External CI |
| **Agent system** | WebSocket | None | Jenkins/Drone/etc. |
| **Database** | SQLite (file) | None | Varies |
| **License** | Source-available NC | Apache 2.0 | Varies |

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│  Dashboard   │────▶│  App Server  │────▶│  Gateway      │────▶│  Agent (TS/Go) │
│  (Next.js)   │     │  (API Routes)│     │  (WebSocket)  │     │  (Docker)      │
└─────────────┘     └──────────────┘     └──────────────┘     └────────────────┘
       │                                                               │
       │                      ┌──────────────────┐                    │
       └──────────────────────│  Traefik (Proxy)  │◀───────────────────┘
                              │  port 80 / 443    │
                              └──────────────────┘
                                       │
                              ┌────────────────┐
                              │  Your Service   │
                              │  (Docker Swarm) │
                              └────────────────┘
```

- **Dashboard** — Next.js app with GitHub OAuth, service management, and deployment UI
- **App Server** — API routes that handle auth, service CRUD, and deployment dispatch
- **Gateway** — WebSocket server that connects agents to the app; dispatches deploy jobs
- **Agent** — Connects to the gateway, receives jobs, builds and deploys Docker stacks
- **Traefik** — Reverse proxy that routes HTTP/HTTPS to deployed services based on labels

---

## Installation

### Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Running the app and TS agent |
| Go | 1.21+ | Building the Go agent |
| pnpm | 9+ | Package management |
| Docker | 24+ | Container builds and Swarm orchestration |
| Docker Swarm | initialized | `docker swarm init` |

### Quick Install

```bash
# Clone the repository
git clone https://github.com/marcuwynu23/podfire.git
cd podfire

# Install app dependencies
cd app && pnpm install
cp .env.example .env
# Edit .env with your GitHub OAuth credentials and ENCRYPTION_KEY

# Set up the database
pnpm db:generate
pnpm db:push

# Start the app and gateway
pnpm dev:all
```

In a second terminal:

```bash
cd agent
pnpm install
cp .env.example .env
pnpm start
```

Then open **http://localhost:3000** and sign in with GitHub.

---

## Quick Start

```bash
# 1. Initialize Docker Swarm (if not already)
docker swarm init
docker network create --driver overlay web

# 2. Start the app + gateway
cd app
pnpm dev:all

# 3. In another terminal, start an agent
cd agent
pnpm start

# 4. Open http://localhost:3000
#    - Sign in with GitHub
#    - Go to Dashboard → Gateway
#    - Deploy the Traefik stack

# 5. Create and deploy an app
#    - Dashboard → Apps → New App
#    - Select a repository, click Create
#    - The app deploys automatically
```

---

## Project Structure

```
podfire/
├── app/                          # Web dashboard & API (Next.js 16)
│   ├── app/
│   │   ├── api/                  # API routes (deploy, services, traefik, auth, etc.)
│   │   └── dashboard/            # UI pages (apps, admin-settings, agents)
│   ├── lib/                      # Shared libraries (deploy-dispatch, stack, auth, etc.)
│   ├── prisma/                   # Prisma schema and migrations
│   ├── docker-templates/         # Dockerfile templates (express, nextjs, vite)
│   ├── traefik/                  # Traefik stack configuration
│   └── agent-gateway.js          # WebSocket gateway entrypoint
│
├── agent/                        # Deploy agent (TypeScript)
│   ├── lib/                      # Core modules (docker, stack, template-loader, etc.)
│   ├── docker-templates/         # Dockerfile templates (mirror of app templates)
│   ├── run.ts                    # Agent entrypoint
│   └── vitest.config.ts          # Test configuration
│
├── agent-go/                     # Deploy agent (Go)
│   ├── internal/
│   │   ├── docker/               # Docker utilities (sanitize, image tag, port detection)
│   │   ├── stack/                # Swarm stack YAML generation and deployment
│   │   ├── template/             # Dockerfile template system
│   │   ├── framework/            # Framework detection
│   │   ├── run/                  # Command execution
│   │   ├── port/                 # Available port allocation
│   │   └── diagnostics/          # Service diagnostics
│   ├── main.go                   # Agent entrypoint
│   └── Makefile                  # Build system
│
├── docs/                         # Documentation assets
├── README.md                     # This file
├── USER-GUIDE.md                 # Comprehensive user guide
└── CONTRIBUTING.md               # Contributor guide
```

---

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup, coding standards, testing, and PR process.

### Quick Development Commands

| Directory | Command | Description |
|---|---|---|
| `app/` | `pnpm dev` | Next.js dev server (port 3000) |
| `app/` | `pnpm agent-gateway` | Gateway server (port 3001) |
| `app/` | `pnpm dev:all` | App + gateway in one terminal |
| `app/` | `pnpm test` | Run vitest tests |
| `agent/` | `pnpm dev` | Run TS agent |
| `agent/` | `pnpm test` | Run vitest tests |
| `agent-go/` | `make run` | Run Go agent |
| `agent-go/` | `make test` | Run Go tests |

---

## License

Source-available. Free for personal, educational, and non-commercial use. See [LICENSE](LICENSE) for details.

Commercial use requires prior written permission.
