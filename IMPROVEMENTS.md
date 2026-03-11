**\_Last updated: March 11, 2026**

# PodFire — Improvements & roadmap

Tracked ideas for making PodFire more robust, scalable, and user-friendly. Use this for planning and contributions.

---

## Agent

- [ ] **Convert agent to Go** — Rewrite the deploy agent in Go for a single binary, lower memory footprint, and better performance under load. Improves robustness and deployment on resource-constrained nodes.
- [x] **Agent health checks** — Periodic heartbeat and readiness checks from dashboard; mark agents offline when unresponsive.
- [x] **Agent resource limits** — Configurable CPU/memory caps per agent or per job to avoid runaway builds.
- [x] **Parallel deploy jobs** — Allow multiple deploy jobs per agent (queue or worker pool) to reduce wait times.
- [x] **Retry and backoff** — Automatic retries for failed deploys with exponential backoff and max attempts.
- [x] **Structured deploy logs** — Emit machine-readable log events (phases, duration, errors) for better dashboard UX and debugging.

---

## Dashboard (app)

- [x] **Dark mode** — Theme toggle and persisted preference for the dashboard UI.
- [x] **Deploy history / timeline** — Per-service or per-app list of past deploys with status, commit, and duration.
- [x] **Rollback one-click** — One-click rollback to a previous successful deployment from the history.
- [ ] **Notifications** — In-app or optional email/webhook when a deploy fails or succeeds.
- [ ] **Environment groups** — Group env vars (e.g. staging vs production) and apply per branch or environment.
- [ ] **Secrets management** — Encrypted secrets per service with audit log for access.
- [ ] **Metrics / simple analytics** — Basic deploy frequency, success rate, and average duration per service.
- [ ] **Multi-repo / monorepo** — Support multiple repositories or subpaths (monorepo) for one service.

---

## Build & deploy

- [ ] **More stack detection** — Auto-detect additional frameworks (Remix, SvelteKit, etc.) and provide matching Dockerfiles.
- [ ] **Custom Dockerfile path** — Let users specify a Dockerfile path (or build context) in the repo.
- [ ] **Build args and target** — Support Docker build args and optional target stage for multi-stage builds.
- [ ] **Caching** — Build cache (e.g. layer cache or remote cache) to speed up repeated builds.
- [ ] **Preview / branch deploys** — Deploy non-default branches to unique URLs for preview environments.
- [ ] **Zero-downtime deploys** — Blue-green or rolling strategy so traffic switches only after new version is healthy.

---

## Gateway & networking

- [x] **Managed DNS** — Optional integration with a DNS provider (e.g. Cloudflare, Route53) for automatic records.
- [x] **TLS / HTTPS** — Automatic or user-provided certificates per domain with renewal.
- [x] **SSL + Cloudflare DNS per app** — Integration that automatically assigns a Cloudflare DNS record and provisions/renews SSL (e.g. via Let’s Encrypt or Cloudflare edge certs) for each app’s custom domain, configurable per app in the dashboard.
- [ ] **Rate limiting** — Configurable rate limits per service or per route at the edge.
- [ ] **Access control** — Optional basic auth or IP allowlist per service or path.

---

## Integrations

- [x] **GitLab and Bitbucket** — Support GitLab and Bitbucket in addition to GitHub for repository connection.
- [ ] **Webhooks** — Outgoing webhooks on deploy events (start, success, failure) for Slack, Discord, or custom endpoints.
- [ ] **Status page** — Optional public status page for “all systems” or per-service availability.
- [ ] **API for automation** — REST or simple API to trigger deploys, list services, and fetch status for CI or scripts.

---

## Docs & DX

- [ ] **API documentation** — Documented endpoints and examples for any public or internal API.
- [ ] **Runbooks** — Short runbooks for common failures (agent offline, build timeout, disk full).
- [ ] **CLI** — Optional `podfire` CLI for deploy, logs, and status from the terminal.
- [ ] **Getting started video or guided tour** — Short video or in-dashboard tour for first-time setup.

---

## Operations & reliability

- [ ] **Structured logging** — JSON logs with levels and correlation IDs for easier aggregation (e.g. Loki, CloudWatch).
- [ ] **Database backups** — Documented or automated backup/restore for Prisma/DB used by the app.
- [ ] **Health endpoint** — `/health` or `/ready` for the dashboard and agent for load balancers and k8s probes.
- [ ] **Graceful shutdown** — Agents and app drain in-flight work and close connections cleanly on SIGTERM.

---

## Scale & performance

- [x] **Horizontal scaling** — Run multiple dashboard instances behind a load balancer with shared DB and session store.
- [ ] **Job queue** — Move long-running deploy jobs to a queue (e.g. Redis/Bull, or Go-based worker) so the API stays responsive.
- [ ] **Asset and static optimization** — Ensure dashboard static assets are cached and minimal for fast load.

---
