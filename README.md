<div align="center">
  <h1> Dockly </h1>
</div>

<p align="center">
  <img src="https://img.shields.io/github/stars/marcuwynu23/dockly.svg" alt="Stars Badge"/>
  <img src="https://img.shields.io/github/forks/marcuwynu23/dockly.svg" alt="Forks Badge"/>
  <img src="https://img.shields.io/github/issues/marcuwynu23/dockly.svg" alt="Issues Badge"/>
  <img src="https://img.shields.io/github/license/marcuwynu23/dockly.svg" alt="License Badge"/>
</p>

**Dockly** is an internal Platform-as-a-Service (PaaS) that lets you connect GitHub, define services from your repos, and deploy them as Docker stacks on Docker Swarm—with a web dashboard, deploy agents, and Traefik as the reverse proxy.

Think of it as a self-hosted, Render-like experience: you link a repo and branch, and Dockly builds a Docker image, pushes it (optionally to a private registry), and deploys it as a Swarm stack. Traefik routes `*.localhost` (or your domain) to your apps automatically.

---

## What is Dockly?

- **Web app (Next.js)** — Dashboard to sign in with GitHub, create and manage services, trigger deploys, view logs and deployment history, manage the Traefik gateway, and see registered agents.
- **Agent gateway** — Standalone HTTP/WebSocket server that bridges the app and one or more **deploy agents**. The app sends deploy jobs to the gateway; the gateway dispatches them to connected agents.
- **Deploy agent (Node/TypeScript)** — Long-running process that connects to the gateway over WebSocket. When a deploy job is received, the agent: clones the repo, detects the framework (Node, static, etc.), applies a Dockerfile template if needed, builds the image, pushes to a registry (or keeps local), and deploys a Docker Stack on Swarm. Logs and status are streamed back to the dashboard.
- **Traefik** — Deployed as a stack by Dockly (or manually). It runs in Swarm mode, uses the Docker provider, and attaches to an overlay network (`web`) so your app stacks can be reached. Only Traefik publishes ports (e.g. 80, 443); your services use the overlay network only.

---

## Features

| Feature               | Description                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GitHub OAuth**      | Sign in with GitHub; access token stored encrypted (AES-256).                                                                                                 |
| **Services**          | Create a service from a repo URL + branch; optional custom port, build/start commands, env vars, replicas.                                                    |
| **Deploy**            | Requires at least one **registered agent**. Deploy clones → detects framework → builds Docker image → pushes (optional) → deploys stack; live logs in the UI. |
| **Dashboard**         | List services, last deployment status, link to service detail; deployment history, logs viewer, manual deploy.                                                |
| **Agents**            | View connected agents; deploy only works when at least one agent is connected.                                                                                |
| **Gateway (Traefik)** | Deploy/remove Traefik stack from the dashboard; routes `*.localhost` to your apps.                                                                            |
| **Auto-deploy**       | Optional: service can be set to `auto`; a cron hits an endpoint to check for new commits and trigger deploy.                                                  |

---

## Project structure

```
dockly/
├── app/                    # Next.js 14 (App Router) web app
│   ├── app/                # Routes, dashboard, API
│   ├── prisma/             # Schema + SQLite DB
│   ├── lib/                # DB, Docker, GitHub, agent gateway client
│   ├── agent-gateway.js    # Standalone agent gateway (port 3001)
│   ├── traefik/            # Traefik stack YAML for Swarm
│   └── ...
├── agent/                  # Deploy agent (TypeScript, runs with tsx)
│   ├── run.ts              # Entry: WebSocket to gateway, job handling
│   ├── lib/                # Stack, Docker, framework detection, templates
│   └── ...
├── README.md               # This file
├── DEVELOP_GUIDE.md        # How to run and develop
└── .gitignore
```

- **app**: Next.js on port 3000; gateway on 3001. DB (Prisma + SQLite) lives in `app/`.
- **agent**: Connects to `AGENT_GATEWAY_URL` (e.g. `http://localhost:3001`), registers, and runs deploy jobs.

---

## Prerequisites

- **Node.js** (v18+) — for the app and the agent.
- **Docker** and **Docker Swarm** — `docker swarm init` already run.
- **Overlay network** — `docker network create --driver overlay web` (agent can create it if missing).
- **Traefik** — Running with Docker provider in Swarm mode, ports 80/443, on network `web`. You can deploy Traefik from the Dockly dashboard (see `app/traefik/traefik-stack.yml`).
- **Docker API** — Exposed so Traefik (in container) can reach the daemon (e.g. `tcp://localhost:2375`; see Traefik stack comments).
- **Optional:** Local Docker registry (e.g. `registry.local`) if you want to push images instead of using local-only.

---

## Quick start

1. **App**: In `app/`, copy `.env.example` → `.env`, set `DATABASE_URL`, GitHub OAuth, `ENCRYPTION_KEY`. Run `npm install`, `npx prisma generate`, `npx prisma db push`, then `npm run dev`.
2. **Gateway**: In a second terminal, in `app/`, run `npm run agent-gateway` (port 3001).
3. **Agent**: In a third terminal, in `agent/`, copy `.env.example` → `.env`, `npm install`, `npm start`. The dashboard should show a registered agent.
4. Open **http://localhost:3000**, sign in with GitHub, create a service, and deploy (with Traefik already running or deploy it from the Gateway page).

For detailed setup, scripts, and troubleshooting, see **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)**.

---

## License

Private / internal use unless otherwise specified.
