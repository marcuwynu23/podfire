# Dockly — Phase 1 Internal PaaS

Next.js 14 (App Router) app that acts as a Render-like internal PaaS: connect GitHub, create services, build Docker images, and deploy via Docker Stack (Swarm) with Traefik.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` (SQLite, e.g. `file:./dev.db` — path relative to `prisma/`)
   - Set GitHub OAuth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` (e.g. `http://localhost:3000/api/github/callback`)
   - Set `ENCRYPTION_KEY`: 32-byte hex (64 chars) for AES-256 token encryption
   - Optional: `DOCKER_REGISTRY` (default `registry.local`), `TRAEFIK_NETWORK` (default `web`)

3. **Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the web app**
   ```bash
   npm run dev
   ```
   Listens on http://localhost:3000 (Next.js dev server; HMR works).

5. **Run the agent gateway** (required for deploy) — in a **second** terminal:
   ```bash
   npm run agent-gateway
   ```
   Listens on http://localhost:3001 and **ws://localhost:3001/ws/agent**.

6. **Run the deploy agent** — in a **third** terminal:
   ```bash
   cd agent
   cp .env.example .env
   # AGENT_GATEWAY_URL=http://localhost:3001 (default)
   npm install && npm start
   ```
   The agent connects to the gateway and registers. The dashboard shows "Registered agents" when one is connected. Deploy is only possible when at least one agent is connected.

## Prerequisites

- **Docker** and **Docker Swarm** initialized (`docker swarm init`)
- **Overlay network** for stacks: `docker network create --driver overlay web` (agent will try to create it if missing)
- **Traefik** running with Docker provider, Swarm mode, on ports 80/443, using external network `web`
- **Local Docker registry** (e.g. `registry.local`) if not using default
- **SQLite** (default: `prisma/dev.db`) for the app database

## Phase 1 scope

- GitHub OAuth; encrypted token storage
- Create services (repo, branch, name)
- Deploy: requires a **registered agent** (WebSocket). Agent connects to the app, registers; the app sends deploy jobs to the agent. Agent runs clone → detect framework → copy template Dockerfile if needed → build → push → stack deploy and streams logs/status back.
- Dashboard: list services, last deployment status, link to detail
- Service detail: deployment history, logs viewer, manual deploy

Out of scope for Phase 1: scaling UI, Cloudflare/SSL automation, preview deployments, rollbacks, auto-deploy on push.
