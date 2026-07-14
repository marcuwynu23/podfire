# PodFire App

Next.js 16 web dashboard and API for the PodFire deployment platform.

See the main [README](../README.md) and [User Guide](../USER-GUIDE.md) for full setup and usage.

## Quick Start

```bash
cd app
cp .env.example .env
# Edit .env with GitHub OAuth credentials + ENCRYPTION_KEY
pnpm install
pnpm db:generate
pnpm db:push
pnpm dev:all
```

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Next.js dev server (port 3000) |
| `pnpm agent-gateway` | Gateway server (port 3001) |
| `pnpm dev:all` | App + gateway in one terminal |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm test` | Run tests |
| `pnpm lint` | Next.js lint |
| `pnpm db:generate` | Prisma generate |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |

## Environment

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | SQLite path (e.g. `file:./dev.db`) |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth client secret |
| `GITHUB_CALLBACK_URL` | `http://localhost:3000/api/github/callback` | OAuth callback |
| `ENCRYPTION_KEY` | — | 32-byte hex or passphrase for AES-256 |
| `DOCKER_REGISTRY` | unset | Registry URL for image pushes |
| `TRAEFIK_NETWORK` | `web` | Docker overlay network |
| `AGENT_GATEWAY_URL` | `http://localhost:3001` | Gateway URL |
| `AGENT_GATEWAY_PORT` | `3001` | Gateway listen port |
| `CRON_SECRET` | unset | Auto-deploy cron secret |
