# Dockly — Development Guide

This guide covers how to run and develop Dockly: environment setup, scripts, database, and troubleshooting.

---

## Requirements

- **Node.js** v18+
- **Docker** with **Docker Swarm** initialized: `docker swarm init`
- **Overlay network**: `docker network create --driver overlay web` (or let the agent create it)
- **Git** (for the agent to clone repos)

---

## 1. App setup (`app/`)

### 1.1 Install dependencies

```bash
cd app
npm install
```

### 1.2 Environment variables

Copy the example env and edit:

```bash
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite path relative to `prisma/`, e.g. `file:./dev.db` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_CALLBACK_URL` | Callback URL, e.g. `http://localhost:3000/api/github/callback` |
| `ENCRYPTION_KEY` | 32-byte hex (64 chars) or any passphrase for AES-256 token encryption |

Optional:

| Variable | Description |
|----------|-------------|
| `DOCKER_REGISTRY` | e.g. `registry.local` to push images; leave unset for local-only |
| `TRAEFIK_NETWORK` | Overlay network name (default: `web`) |
| `AGENT_GATEWAY_URL` | Gateway URL for the app to call (default: `http://localhost:3001`) |
| `AGENT_GATEWAY_PORT` | Port the gateway listens on (default: `3001`) |
| `CRON_SECRET` | Secret for auto-deploy cron endpoint |

### 1.3 Database

From the `app/` directory:

```bash
npx prisma generate
npx prisma db push
```

Optional: open Prisma Studio to inspect data:

```bash
npm run db:studio
```

### 1.4 Run the web app

```bash
npm run dev
```

- Next.js runs at **http://localhost:3000** (HMR works).

---

## 2. Agent gateway (`app/`)

The gateway is a separate process. It must be running for the app to list agents and dispatch deploy jobs.

In a **second terminal**, from `app/`:

```bash
cd app
npm run agent-gateway
```

- Listens on **http://localhost:3001**
- WebSocket for agents: **ws://localhost:3001/ws/agent**
- The app uses `AGENT_GATEWAY_URL` (default `http://localhost:3001`) to talk to it.

Run app + gateway in one go (single terminal):

```bash
cd app
npm run dev:all
```

This runs `next dev` and `agent-gateway` with `concurrently`.

---

## 3. Deploy agent (`agent/`)

At least one agent must be connected for deploys to work.

### 3.1 Install dependencies

```bash
cd agent
npm install
```

### 3.2 Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `AGENT_GATEWAY_URL` | Gateway URL (default: `http://localhost:3001`) |

Optional:

| Variable | Description |
|----------|-------------|
| `AGENT_NAME` | Display name when the agent registers |
| `DOCKER_REGISTRY` | Registry to push images to; leave unset for local-only |

### 3.3 Run the agent

In a **third terminal** (or second if you use `dev:all` for app+gateway):

```bash
cd agent
npm start
```

Or for development (same thing with tsx):

```bash
npm run dev
```

- The agent connects to the gateway over WebSocket and reconnects after disconnect.
- The dashboard (**Dashboard → Agents**) shows “Registered agents” when at least one is connected.

---

## 4. Running everything (summary)

**Option A — Three terminals**

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `app/` | `npm run dev` |
| 2 | `app/` | `npm run agent-gateway` |
| 3 | `agent/` | `npm start` |

**Option B — Two terminals (app + gateway in one)**

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `app/` | `npm run dev:all` |
| 2 | `agent/` | `npm start` |

Then open **http://localhost:3000**, sign in with GitHub, and use the dashboard.

---

## 5. App scripts reference (`app/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run agent-gateway` | Agent gateway (port 3001) |
| `npm run dev:all` | `dev` + `agent-gateway` in one process |
| `npm run build` | Next.js production build |
| `npm start` | Run production server (`node server.js`) |
| `npm run lint` | Next.js lint |
| `npm run db:generate` | Prisma generate |
| `npm run db:push` | Prisma db push |
| `npm run db:studio` | Prisma Studio |

---

## 6. Agent scripts reference (`agent/`)

| Script | Description |
|--------|-------------|
| `npm start` | Run agent with `tsx run.ts` |
| `npm run dev` | Same as `npm start` |
| `npm run build` | Compile TypeScript with `tsc` |

---

## 7. Production build (app)

```bash
cd app
npm run build
npm start
```

Uses `server.js` (custom server). Ensure `DATABASE_URL` and other env vars are set in the production environment. Run the gateway separately (e.g. same host or another instance) and point the app to it with `AGENT_GATEWAY_URL`.

---

## 8. Traefik (reverse proxy)

- Deploy Traefik so your stacks can be reached (e.g. `*.localhost`).
- Stack file: `app/traefik/traefik-stack.yml`.
- You can deploy/remove the Traefik stack from the dashboard: **Dashboard → Gateway**.

Prerequisites for Traefik:

- Docker API exposed on TCP (e.g. `tcp://localhost:2375`).  
  - Docker Desktop: Settings → General → “Expose daemon on tcp://localhost:2375 without TLS”.  
  - Linux: configure `dockerd` with `-H tcp://0.0.0.0:2375` or use socket mount.
- Overlay network `web`: `docker network create --driver overlay web`.

---

## 9. Auto-deploy (optional)

For services with **Deploy mode: Auto**, the app checks for new commits when the cron endpoint is called:

```http
GET /api/cron/auto-deploy?secret=<CRON_SECRET>
```

Set `CRON_SECRET` in the app’s `.env` and call this URL periodically (e.g. every 5 minutes) from a cron job or scheduler.

---

## 10. Troubleshooting

| Issue | What to check |
|-------|----------------|
| “No agents” / deploy does nothing | Ensure `npm run agent-gateway` is running in `app/`, and `npm start` in `agent/`. Check `AGENT_GATEWAY_URL` in both app and agent. |
| GitHub login fails | Verify `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_CALLBACK_URL` in app’s `.env`. Callback must match the URL registered in GitHub OAuth App. |
| Deploy fails at “git clone” | Agent needs network access to GitHub (or your Git host). For private repos, the app uses the user’s GitHub token to build a clone URL; ensure the user has connected GitHub in the dashboard. |
| Traefik not routing | Ensure Traefik stack is deployed, Docker API is exposed (see above), and stacks use the `web` network and correct labels. |
| Prisma errors | From `app/`: run `npx prisma generate` and `npx prisma db push`. Check `DATABASE_URL` path (relative to `prisma/`). |
| Port already in use | Change `AGENT_GATEWAY_PORT` (e.g. 3002) in app’s `.env` and use the same in agent’s `AGENT_GATEWAY_URL`. |

---

## 11. Repository layout (reminder)

```
dockly/
├── app/                 # Next.js + gateway
│   ├── .env             # App env (create from .env.example)
│   ├── agent-gateway.js # Gateway entry
│   ├── prisma/
│   └── ...
├── agent/               # Deploy agent
│   ├── .env             # Agent env (create from .env.example)
│   ├── run.ts
│   └── ...
├── README.md
└── DEVELOP_GUIDE.md     # This file
```

For a high-level overview and features, see [README.md](./README.md).
