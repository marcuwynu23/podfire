# PodFire User Guide

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Dashboard Overview](#dashboard-overview)
- [Managing Apps](#managing-apps)
- [Deployments](#deployments)
- [Gateway & Traefik](#gateway--traefik)
- [Agents](#agents)
- [Service Diagnostics](#service-diagnostics)
- [Environment Variables](#environment-variables)
- [Auto-Deploy](#auto-deploy)
- [Container Port Management](#container-port-management)
- [Custom Domains](#custom-domains)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Installation

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Docker | 24+ | Container runtime and Swarm orchestration |
| Docker Swarm | initialized | `docker swarm init` |
| Node.js | 18+ | Running the dashboard and TypeScript agent |
| Go | 1.21+ | Building the Go agent (optional) |
| pnpm | 9+ | Package management |

### Clone and Setup

```bash
git clone https://github.com/marcuwynu23/podfire.git
cd podfire

# App setup
cd app
cp .env.example .env
```

Edit `.env` and set at minimum:

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite path relative to `prisma/`, e.g. `file:./dev.db` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_CALLBACK_URL` | e.g. `http://localhost:3000/api/github/callback` |
| `ENCRYPTION_KEY` | 32-byte hex (64 chars) or any passphrase for AES-256 |

Optional variables:

| Variable | Default | Description |
|---|---|---|
| `DOCKER_REGISTRY` | unset | Registry URL to push images (leave unset for local-only) |
| `TRAEFIK_NETWORK` | `web` | Overlay network name |
| `AGENT_GATEWAY_URL` | `http://localhost:3001` | Gateway URL for the app to call |
| `AGENT_GATEWAY_PORT` | `3001` | Port the gateway listens on |
| `CRON_SECRET` | unset | Secret for auto-deploy cron endpoint |

### Initialize the Database

```bash
cd app
pnpm db:generate
pnpm db:push
```

### Run the Stack

**Option A — Three terminals:**

| Terminal | Directory | Command |
|---|---|---|
| 1 | `app/` | `pnpm dev` |
| 2 | `app/` | `pnpm agent-gateway` |
| 3 | `agent/` | `pnpm start` |

**Option B — Two terminals (app + gateway combined):**

| Terminal | Directory | Command |
|---|---|---|
| 1 | `app/` | `pnpm dev:all` |
| 2 | `agent/` | `pnpm start` |

### Verify

Open **http://localhost:3000**, sign in with GitHub, and go to **Dashboard → Agents**. You should see a connected agent.

---

## Quick Start

```bash
# 1. Ensure Docker Swarm is initialized
docker swarm init
docker network create --driver overlay web

# 2. Start everything (app + gateway + agent)
cd app && pnpm dev:all &
cd agent && pnpm start

# 3. Open http://localhost:3000 → Dashboard → Gateway
#    Deploy the Traefik stack (required for routing)

# 4. Dashboard → Apps → New App
#    Pick a GitHub repo, click Create
#    The app deploys automatically, watch build logs stream in

# 5. Visit http://your-app-name.localhost
```

---

## Dashboard Overview

### Apps Page

Lists all your deployed services. Each card shows:

- **Service name** and status indicator (running, building, failed)
- **Last deployment** status and timestamp
- **Quick actions**: Deploy, open app URL, view details

### App Detail Page

Opened when you click on an app. Contains:

| Tab | Content |
|---|---|
| **Log** | Live deployment and container logs |
| **Settings** | Environment variables, build commands, port config, resource limits |
| **Diagnostics** | Run connectivity and routing probes |

### Admin Settings → Gateway

Manage the Traefik reverse proxy stack:

| Button | Action |
|---|---|
| **Save & Start Gateway** | Deploy or update the Traefik stack |
| **Stop Gateway** | Remove the Traefik stack |

---

## Managing Apps

### Creating an App

1. **Dashboard → Apps → New App**
2. Select a repository from your GitHub account
3. Choose a branch (defaults to the repo's default branch)
4. Optionally configure build settings (entry command, build command, output directory)
5. Add environment variables if needed
6. Click **Create App**

The app deploys immediately after creation.

### App Settings

| Setting | Description |
|---|---|
| **Entry Command** | Override the CMD (e.g. `node server.js`). Uses framework default if empty. |
| **Build Command** | Override the build step (e.g. `npm run build`). Uses framework default if empty. |
| **Output Directory** | For Vite/Next.js: the build output directory (`dist`, `.next`). |
| **Environment Variables** | Key-value pairs injected into the container. `PORT` is auto-assigned. |
| **Replicas** | Number of container replicas (1–32). |
| **CPU Limit** | CPU quota per replica (e.g. `1.5`). |
| **Memory Limit** | Memory limit per replica (e.g. `512m`). |
| **Custom Domain** | Set a custom domain for routing (requires DNS pointing to your Traefik host). |

### Deleting an App

1. Open the app detail page
2. Go to **Settings**
3. Click **Delete App** (bottom of the page)
4. Confirm

The Docker stack is removed and the service is deleted from the database.

---

## Deployments

### Manual Deploy

Click the **Deploy** button on any app card or detail page. The agent:

1. Clones the repository (depth 1, specified branch)
2. Detects the framework (Next.js, Vite, Express, or custom)
3. Copies the appropriate Dockerfile template
4. Builds the Docker image
5. Pushes to registry (if configured)
6. Deploys the Docker Swarm stack
7. Streams logs back to the dashboard in real time

### Deployment Status

| Status | Meaning |
|---|---|
| `building` | Agent is cloning, building, or pushing |
| `deploying` | Agent is running `docker stack deploy` |
| `running` | Stack deployed successfully |
| `failed` | An error occurred during any phase |
| `queued` | Job is waiting for an available agent |

### Auto-Retry

Failed deployments are automatically retried up to 3 times before giving up.

---

## Gateway & Traefik

### What Traefik Does

Traefik is the reverse proxy that routes HTTP/HTTPS traffic to your deployed services. Every service PodFire deploys gets Traefik labels that tell Traefik how to route traffic.

### Deploy Traefik

Go to **Dashboard → Admin Settings → Gateway** and click **Save & Start Gateway**.

This deploys a Traefik stack that:

- Listens on port 80 (HTTP)
- Discovers services on the Swarm overlay network
- Routes based on `Host` header matching `{service-name}.localhost`
- Auto-generates Let's Encrypt SSL certificates for domains (if configured)

### Requirements

- Docker daemon socket mounted (`/var/run/docker.sock`) — this is handled by the gateway stack template
- Overlay network named `web` (or your configured `TRAEFIK_NETWORK`)

---

## Agents

Agents are the workers that execute deploy jobs. They connect to the gateway over WebSocket.

### TypeScript Agent (`agent/`)

```bash
cd agent
cp .env.example .env
# Edit AGENT_GATEWAY_URL if needed
pnpm start
```

### Go Agent (`agent-go/`)

```bash
cd agent-go
export AGENT_GATEWAY_URL=http://localhost:3001
make run
```

### Agent Lifecycle

1. Agent starts and generates a unique key (shown in console)
2. Add the key in **Dashboard → Agents → Add Agent**
3. Agent connects to the gateway via WebSocket
4. Gateway dispatches deploy jobs to connected agents
5. Agent streams logs and status updates back through the WebSocket

### Multiple Agents

You can run multiple agents of either implementation. The gateway dispatches jobs to the first available agent. If all agents are busy, jobs are queued.

---

## Service Diagnostics

The diagnostics page probes the running state of a deployed service:

1. **Service exists** — checks `docker service ps`
2. **Container reachability** — probes the service on its internal port via Traefik
3. **Traefik logs** — fetches recent Traefik logs to check if the service was discovered

Results categorize the issue as:

| Verdict | Meaning |
|---|---|
| `ok` | Service is reachable through Traefik |
| `service_not_found` | Stack not deployed or service name mismatch |
| `container_not_serving` | Container is not responding — check app port, binding to `0.0.0.0` |
| `traefik_routing` | Container responds but Traefik may not have discovered it |

---

## Environment Variables

### `PORT` (Auto-Assigned)

Every deployed service gets a unique `PORT` environment variable injected automatically. The port is assigned by finding the highest port across all services and incrementing by 1 (starting from 8000). The same port is used in the Traefik `loadbalancer.server.port` label.

Your application should read `process.env.PORT` to determine which port to listen on:

```js
const port = Number(process.env.PORT ?? 5000);
app.listen(port);
```

### Custom Environment Variables

You can add custom environment variables in the app Settings page. These are merged with the auto-assigned `PORT` variable.

---

## Auto-Deploy

### Configure Auto-Deploy

1. Edit the app settings
2. Set **Deploy Mode** to `auto`
3. Set up a cron job or scheduler to call the auto-deploy endpoint:

```http
GET /api/cron/auto-deploy?secret=<CRON_SECRET>
```

The cron endpoint:

- Fetches the latest commit SHA from GitHub
- Compares it to `lastDeployedCommitSha`
- Triggers a new deployment if the SHA differs

### Check for Updates

On the app detail page, the **Check for Updates** button polls every 2 minutes when deploy mode is `auto` and triggers a deploy if new commits are found.

---

## Container Port Management

### How Ports Are Assigned

1. When a deployment is triggered, if the service has no `port` set, PodFire queries the database for the highest assigned port across all services
2. The next port is `max_port + 1` (starting at 8001)
3. The port is saved to the service record
4. `PORT=<port>` is injected into the container's environment
5. The same port is set in the Traefik `loadbalancer.server.port` label

### Port Range

Ports are assigned from 8000 upward. Each service gets a unique port. There is no need to manually configure or check for conflicts.

---

## Custom Domains

1. In the app Settings, set the **Domain** field (e.g. `myapp.example.com`)
2. Point your domain's DNS to the server running Traefik
3. PodFire generates the correct Traefik Host rule: `Host(\`myapp.example.com\`)`

For Let's Encrypt SSL certificates, configure the Traefik stack with your email in the gateway settings.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| **No agents / deploy does nothing** | Gateway or agent not running | Ensure `pnpm agent-gateway` is running in `app/` and `pnpm start` in `agent/`. Check `AGENT_GATEWAY_URL` in both. |
| **GitHub login fails** | OAuth credentials missing or wrong callback URL | Verify `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_CALLBACK_URL` in `.env`. Callback must match GitHub OAuth App registration. |
| **Deploy fails at git clone** | Agent cannot reach GitHub | Ensure the agent has network access. For private repos, verify GitHub is connected in the dashboard. |
| **App not reachable at name.localhost** | Traefik not deployed or Docker socket issue | Deploy Traefik from **Dashboard → Gateway**. Ensure Docker socket is mounted in Traefik stack. |
| **Prisma errors** | Database not initialized | Run `pnpm db:generate && pnpm db:push` from `app/`. |
| **Port already in use** | Another process on the same port | Change `AGENT_GATEWAY_PORT` in `.env` and update `AGENT_GATEWAY_URL` accordingly. |
| **Diagnostics says "container not serving"** | App listens on wrong port or only on 127.0.0.1 | Ensure the app listens on `0.0.0.0:<PORT>` where `PORT` is the environment variable. |
| **Diagnostics says "service not found"** | Stack not deployed or name mismatch | Trigger a new deploy from the dashboard. |

---

## FAQ

**Q: Can I use PodFire without GitHub?**  
A: Currently GitHub OAuth is the only authentication method. Support for other Git providers is planned.

**Q: Can I run the Go agent instead of the TypeScript agent?**  
A: Yes. Both implement the same protocol. Run `make run` in `agent-go/`.

**Q: How do I update an app's source code?**  
A: Push to your repository, then click **Deploy** in the dashboard. Or enable auto-deploy mode.

**Q: What happens when I delete an app?**  
A: The Docker Swarm stack is removed and the service record is deleted from the database.

**Q: Can I run multiple agents?**  
A: Yes. Jobs are dispatched to the first available agent. If all are busy, jobs are queued.

**Q: Is there a hosted version?**  
A: No. PodFire is designed to be self-hosted.

**Q: What frameworks are supported?**  
A: Next.js, Vite, Express, Node.js, and any project with a custom Dockerfile.

**Q: Can I use a custom Dockerfile?**  
A: Yes. Place a `Dockerfile` in your repository root. PodFire detects it and skips template generation.

**Q: How do I view container logs after deployment?**  
A: Open the app detail page and go to the **Log** tab. Logs from `docker service logs` are streamed there.

**Q: What database does PodFire use?**  
A: SQLite via Prisma. The database file is stored at `app/prisma/dev.db` by default.

---

➡️ **[Back to README](README.md)** | **[Contributing Guide](CONTRIBUTING.md)**
