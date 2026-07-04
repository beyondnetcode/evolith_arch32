# VPS Deployment — Coolify on Hostinger

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This guide covers deploying Evolith Core on a self-hosted VPS using Coolify as the deployment platform. It was validated against the Hostinger VPS configuration described below, but applies to any Ubuntu 24.04 VPS with Docker installed.

## Goal and Objectives

> **Goal:** ship `core-api` and `mcp-server` to a production VPS with automatic SSL, GitHub-triggered deploys, and zero manual Docker commands after initial setup.

**Objectives:**

- Document the validated VPS specs and existing infrastructure.
- Provide a step-by-step Coolify setup connected to GitHub.
- Define the `docker-compose` service layout for Evolith Core.
- Establish a CI/CD flow (push-to-deploy) via Coolify webhooks or self-hosted GitHub Actions runner.

---

## Validated VPS Specs (Hostinger)

| Resource | Value | Assessment |
| :--- | :--- | :--- |
| OS | Ubuntu 24.04.3 LTS | Supported |
| CPU | 2 vCPU (AMD EPYC 9354P) | Sufficient for Phase 1 |
| RAM | 7.8 GB | Excellent — 6+ GB headroom |
| Disk | 96 GB SSD | Excellent — 88 GB free |
| Docker | v5.0.0 (Compose) | Pre-installed |
| Coolify | v4.0.0-beta | Pre-installed |
| Reverse Proxy | Traefik v3.6 | Pre-installed, active on :80/:443 |
| Database | PostgreSQL 15 (Docker) | Pre-installed |
| Cache | Redis 7 (Docker) | Pre-installed |

> **Key insight:** Coolify, Traefik, PostgreSQL, and Redis are already running. Evolith Core deployment requires zero new infrastructure — only application containers.

---

## Architecture Overview

```
GitHub (repo + Actions CI)
         │
         │  deploy webhook / runner
         ▼
Coolify Panel (:8080)          ← manage all services here
         │
         ▼
Traefik v3.6 (:80 / :443)     ← SSL termination, routing
    ┌────┴────────────────┐
    ▼                     ▼
core-api (:3000)     mcp-server (:3001)
api.yourdomain.com   mcp.yourdomain.com
         │                 │
         └────────┬────────┘
                  ▼
         PostgreSQL 15 (:5432, internal)
         Redis 7 (:6379, internal)
```

**Estimated resource usage after Evolith Core deploy:**

| Service | RAM Estimate |
| :--- | :--- |
| `core-api` (NestJS) | ~256 MB |
| `mcp-server` | ~128 MB |
| Total added | ~384 MB of 7,800 MB |

---

## Prerequisites

- VPS with Ubuntu 24.04, Docker, and Coolify already installed.
- A domain name pointed to the VPS IP (A record for `api.yourdomain.com` and `mcp.yourdomain.com`).
- SSH access to the VPS.
- GitHub account with access to the Evolith repository.

---

## Phase 1 — Connect GitHub to Coolify

1. Open the Coolify panel at `http://<VPS_IP>:8080`.
2. Navigate to **Settings → Sources → GitHub**.
3. Click **Add GitHub App** and complete the OAuth flow.
4. Grant Coolify access to the `evolith` repository.

> After this step, Coolify can watch branches and trigger deploys on push.

---

## Phase 2 — Add Dockerfiles

The reference Dockerfiles live in [`reference/infrastructure/docker/`](../docker/). Before deploying via Coolify, copy them into the relevant app directories:

```bash
# core-api
cp reference/infrastructure/docker/bff.Dockerfile apps/core-api/Dockerfile

# mcp-server
cp reference/infrastructure/docker/mcp.Dockerfile packages/mcp-server/Dockerfile
```

Both use multi-stage Alpine builds and run as non-root user `evolith` (UID 1001).

> If the apps already have their own `Dockerfile`, review before overwriting — the reference files are templates.

---

## Phase 3 — Create Applications in Coolify

### core-api

1. Coolify → **Projects → New Application → Docker**.
2. Source: GitHub → select `evolith` repo → branch `main`.
3. Build context: `apps/core-api`, Dockerfile: `apps/core-api/Dockerfile`.
4. Port: `3000`.
5. Domain: `api.yourdomain.com` (Coolify configures Traefik + Let's Encrypt automatically).
6. Environment variables:

| Variable | Example | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Required |
| `DATABASE_URL` | `postgresql://user:pass@coolify-db:5432/evolith` | Use internal Docker hostname |
| `REDIS_URL` | `redis://coolify-redis:6379` | Use internal Docker hostname |
| `PORT` | `3000` | Must match Dockerfile EXPOSE |

7. Click **Deploy**.

### mcp-server

Repeat the steps above with:
- Build context: `packages/mcp-server`
- Port: `3001`
- Domain: `mcp.yourdomain.com`

---

## Phase 4 — CI/CD (Push-to-Deploy)

### Option A — Coolify Webhook (Recommended for simplicity)

Coolify generates a deploy webhook URL per application. Add it to GitHub:

1. Coolify → Application → **Webhooks → Copy URL**.
2. GitHub → Repository → **Settings → Webhooks → Add webhook**.
3. Payload URL: paste Coolify URL.
4. Content type: `application/json`.
5. Event: **Push**.

Every push to `main` now triggers an automatic redeploy.

### Option B — Self-Hosted GitHub Actions Runner (Recommended for control)

Install a runner on the VPS to run CI jobs locally — faster builds, no GitHub minutes consumed.

```bash
# On the VPS
mkdir -p /opt/github-runner && cd /opt/github-runner
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-<VERSION>.tar.gz
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/<ORG>/evolith --token <RUNNER_TOKEN>
./svc.sh install && ./svc.sh start
```

Get the runner token from: **GitHub → Repository → Settings → Actions → Runners → New self-hosted runner**.

Then update `.github/workflows/ci-cd.yml` to target the runner:

```yaml
jobs:
  deploy:
    runs-on: self-hosted   # ← change from ubuntu-latest
```

With a self-hosted runner, the CI pipeline (lint → test → build → deploy) runs entirely on the VPS in under 2 minutes.

---

## Verify Deployment

```bash
# Check containers are running
ssh root@<VPS_IP> "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Health check core-api
curl https://api.yourdomain.com/health

# Health check mcp-server
curl https://mcp.yourdomain.com/health
```

---

## Security Notes

- PostgreSQL and Redis are bound to internal Docker networks only — never exposed on public ports.
- Traefik handles TLS termination via Let's Encrypt; HTTP traffic is automatically redirected to HTTPS.
- Application containers run as non-root user `evolith` (UID 1001).
- SSH password authentication should be disabled once key-based access is confirmed:
  ```bash
  sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  systemctl reload sshd
  ```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
| :--- | :--- | :--- |
| SSL certificate not issued | DNS not propagated yet | Wait 5–15 min after adding A record |
| Container exits immediately | Missing env variable | Check Coolify → Application → Logs |
| `DATABASE_URL` connection refused | Wrong internal hostname | Use `coolify-db` not `localhost` |
| Coolify panel unreachable | `coolify` container in `Created` state | `docker start coolify` on VPS |

---

## Related References

- [Infrastructure Root](../README.md)
- [Docker Reference Dockerfiles](../docker/README.md)
- [ADR-0028 — Self-Hosted Hybrid Infrastructure](../../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md)
- [ADR-0030 — Two-Tier Distributed Gateway](../../architecture/adrs/core/0030-two-tier-distributed-gateway-model.md)
- [Multi-Cloud Deployment Scenarios](../../architecture/blueprints/multi-cloud-deployment-scenarios.md)

---

[Back to Infrastructure Root](../README.md)
