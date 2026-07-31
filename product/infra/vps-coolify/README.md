# VPS Deployment — Coolify on Hostinger

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This guide covers deploying Evolith Core on a self-hosted VPS using Coolify as the deployment platform. It was validated against the Hostinger VPS configuration described below, but applies to any Ubuntu 24.04 VPS with Docker installed.

## Goal and Objectives

> **Goal:** ship `core-api`, `mcp-server` and `agent-runtime` to a production VPS with automatic SSL, GitHub-triggered deploys, and zero manual Docker commands after initial setup.

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
    ┌────────┬────────┴────────┐
    ▼        ▼                 ▼
core-api  mcp-server     agent-runtime
 (:3000)    (:3000)          (:3000)
evolith.   mcpevolith.   evolithruntime.
 beyondnet.cloud (all three)
```

All three services listen on **3000** inside their container; Traefik
distinguishes them by hostname, not by port. The Core is stateless — neither
PostgreSQL nor Redis is on its request path (ADR-0101). The VPS's PostgreSQL
belongs to the Tracker, deployed from its own repository.

**Estimated resource usage after Evolith Core deploy:**

| Service | RAM Estimate |
| :--- | :--- |
| `core-api` (NestJS) | ~256 MB |
| `mcp-server` | ~128 MB |
| `agent-runtime` | ~128 MB |
| Total added | ~512 MB of 7,800 MB |

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

## Phase 2 — Use the real Dockerfiles (do NOT copy the templates)

Nothing to add. Each deployable service already owns a production Dockerfile,
and it is the same file CI builds and pushes to GHCR:

| Service | Dockerfile |
| :--- | :--- |
| core-api | `src/apps/core-api/Dockerfile` |
| mcp-server | `src/packages/mcp-server/Dockerfile` |
| agent-runtime | `src/apps/agent-runtime-api/Dockerfile` |

> [!WARNING]
> Earlier revisions of this guide told you to `cp product/infra/docker/bff.Dockerfile apps/core-api/Dockerfile`.
> **Do not.** Those two files are illustrative BFF/MCP templates that are on no
> deployment path (see [deployment-topology](../deployment-topology.md)), their
> destination paths predate the `src/`-nested layout, and copying them over the
> real Dockerfiles replaces a working monorepo build with one that cannot
> resolve the workspace packages.

All three build as multi-stage Alpine images and run as non-root `evolith`
(UID 1001).

---

## Phase 3 — Create Applications in Coolify

> [!IMPORTANT]
> **Base directory / build context is the repository ROOT (`/`) for every
> service** — not the app folder. The Dockerfiles `COPY` repo-root-relative
> paths (`package-lock.json`, `tsconfig.base.json`, `src/`, `.harness/`)
> because each image builds the workspace packages from source. Pointing
> Coolify at `src/apps/core-api` as the context makes the build fail on the
> first `COPY`. Each Dockerfile states this in its own header.

### core-api

1. Coolify → **Projects → New Application → Docker**.
2. Source: GitHub → select `evolith` repo → branch `main`.
3. **Base directory: `/`** · Dockerfile: `src/apps/core-api/Dockerfile`.
4. Port: `3000`.
5. Domain: `evolith.beyondnet.cloud` (Coolify configures Traefik + Let's Encrypt automatically).
6. Environment variables:

| Variable | Example | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Required |
| `PORT` | `3000` | Must match the Dockerfile `EXPOSE` |
| `EVOLITH_API_KEY` | *(encrypted)* | Bearer key. **Fail-closed: unset ⇒ every request is rejected.** |

> [!NOTE]
> **No `DATABASE_URL`, no `REDIS_URL`.** ADR-0101 makes the Core a stateless
> evaluation engine — `core-api` and `agent-runtime-api` declare zero database
> dependencies (no driver, no ORM, no connection string). Setting a
> `DATABASE_URL` here connects to nothing and contradicts ADR-0101; persistence
> belongs to the Tracker and its own Postgres. See
> [Secrets and Data Connectivity](../README.md#secrets-and-data-connectivity).

7. Click **Deploy**.

### mcp-server

Same steps, with:
- **Base directory: `/`** · Dockerfile: `src/packages/mcp-server/Dockerfile`
- Port: **`3000`** (the image's `EXPOSE`/`PORT` is 3000, not 3001)
- Domain: `mcpevolith.beyondnet.cloud`
- Environment: `EVOLITH_API_KEY`, and leave `EVOLITH_MCP_ALLOW_NO_AUTH=false`
  (the image default). `OPA_BUNDLE_CREDENTIALS` / `OPA_BUNDLE_SIGNING_KEY` only
  if you serve policy bundles from a remote registry.

### agent-runtime

Same steps, with:
- **Base directory: `/`** · Dockerfile: `src/apps/agent-runtime-api/Dockerfile`
- Port: `3000`
- Domain: `evolithruntime.beyondnet.cloud`
- Environment:

| Variable | Example | Notes |
| :--- | :--- | :--- |
| `AGENT_RUNTIME_API_KEY` | *(encrypted)* | Fail-closed; `AGENT_RUNTIME_ALLOW_NO_AUTH` must stay unset |
| `AGENT_RUNTIME_CORE_ENDPOINT` | `https://evolith.beyondnet.cloud` | Points the runtime at the REAL Core (otherwise it uses the stub adapter) |
| `AGENT_RUNTIME_CORE_TOKEN` | *(encrypted)* | Must equal core-api's `EVOLITH_API_KEY` |
| `AGENT_RUNTIME_PROFILE` | `production` | Makes the approval-tracker settings below mandatory |
| `AGENT_RUNTIME_APPROVAL_TRACKER_URL` | `https://<tracker-host>` | HITL approvals (GT-441). Unset ⇒ every `requiresApproval` action is denied fail-closed |
| `AGENT_RUNTIME_APPROVAL_TRACKER_KEY` | *(encrypted)* | The Tracker's CoreMachine key; the Tracker derives the tenant from WHICH key matched |

---

## Phase 4 — CI/CD (Push-to-Deploy)

### Option A — the `deploy` job in `ci-cd.yml` (this is what the repo actually does)

The pipeline already contains the deploy step. It is a job in
[`.github/workflows/ci-cd.yml`](../../../.github/workflows/ci-cd.yml) that
`curl`s one Coolify deploy hook per service. It reads its configuration from
**repository secrets and one repository variable — not from a GitHub webhook**.
Adding a Coolify URL under *Settings → Webhooks* does nothing for this job.

**Owner checklist — exactly what has to be set, and in what shape.** Everything
below needs the Coolify panel or repository-admin access; nothing in this
repository can supply it.

| # | Where | Name | Required shape | Notes |
| :-- | :--- | :--- | :--- | :--- |
| 1 | Coolify panel | *(per application)* | — | Create the three applications per Phase 3 first. A hook cannot exist before its application does. |
| 2 | Repo **secret** | `COOLIFY_API_TOKEN` | Coolify API token string | Coolify → **Keys & Tokens → API tokens**. Sent as `Authorization: Bearer`. |
| 3 | Repo **secret** | `COOLIFY_COREAPI_DEPLOY_HOOK` | **A full URL**: `https://<coolify-host>/api/v1/deploy?uuid=<application-uuid>` | Coolify → Application → **Webhooks → Deploy Webhook → Copy**. |
| 4 | Repo **secret** | `COOLIFY_MCP_DEPLOY_HOOK` | same shape, mcp-server's uuid | |
| 5 | Repo **secret** | `COOLIFY_AGENTRUNTIME_DEPLOY_HOOK` | same shape, agent-runtime's uuid | Added with GT-437. |
| 6 | Repo **variable** | `VPS_DEPLOY_ENABLED` | the literal string `true` | `gh variable set VPS_DEPLOY_ENABLED --body true`. A **variable**, not a secret — see below. |

> [!CAUTION]
> **Items 3–5 must be complete URLs.** A bare UUID, a path fragment
> (`/api/v1/deploy?uuid=…`), or a host with no scheme all make `curl` fail with
> `Could not resolve host` — the exact failure recorded against `GT-324`. The
> value must start with `https://` and contain the host.

**The deploy job is deliberately switched OFF right now.** Its condition is
`github.ref == 'refs/heads/main' && vars.VPS_DEPLOY_ENABLED == 'true'`. It was
disabled under `GT-567` because the target environment moved to local Docker +
kind, and without the flag the job failed on **every** push to `main` against an
unreachable host while nobody read the red (it is not a required check). It is
switched off with a **variable** rather than by deleting the secrets on purpose:
deleting them makes the shutdown invisible, and their values can only be
re-obtained from the Coolify panel — i.e. with the VPS already up.

**Behaviour once enabled.** Each step is fail-soft on ONE condition only: if its
hook or the token is unset it warns and exits 0. With both set it runs
`curl --fail`, so a hook that does not answer **fails the job** — deliberately.
A deploy step that cannot fail reports nothing.

**Order of operations.** The job `needs: [docker-services]`, which itself needs
seven test jobs and only runs on `main` or a `v*` tag. So: merge to `main` →
tests → images pushed to `ghcr.io/<owner>/evolith-{core-api,mcp,agent-runtime}`
→ hooks fired. Nothing deploys from `develop`.

**Verification that counts.** A green `deploy` job means `curl` got a 2xx from
Coolify — it does **not** mean the new image is serving. Confirm with the health
checks in *Verify Deployment* below, against the deployed commit.

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

# Liveness of the three services
curl https://evolith.beyondnet.cloud/health
curl https://mcpevolith.beyondnet.cloud/health
curl https://evolithruntime.beyondnet.cloud/health

# Auth is fail-closed: WITHOUT a key this must return 401, not 200.
curl -i -X POST https://evolith.beyondnet.cloud/api/v1/evaluate

# The evidence that the deploy is real: a governed verdict from the deployed
# commit, not a 200 from a health endpoint.
curl -X POST https://evolith.beyondnet.cloud/api/v1/evaluate \
  -H "Authorization: Bearer $EVOLITH_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"phase":"design","topology":"modular-monolith"}'
```

> [!NOTE]
> A green `deploy` job is not a deployment. It proves Coolify accepted the
> webhook. Only the calls above, answered by the new commit, prove the service
> is serving — that distinction is why `GT-448` requires "a recorded run, not a
> deploy job that exits zero".

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
| Build fails on the first `COPY` | Base directory set to the app folder | Set the Coolify base directory to `/` — the images build from the repo root (Phase 3) |
| `deploy` job: `Could not resolve host` | The deploy-hook secret holds a UUID or a path, not a URL | Re-set it to the full `https://<coolify-host>/api/v1/deploy?uuid=<uuid>` (Phase 4) |
| `deploy` job never runs on `main` | `VPS_DEPLOY_ENABLED` is unset | `gh variable set VPS_DEPLOY_ENABLED --body true` (Phase 4) |
| Every request returns 401 | `EVOLITH_API_KEY` unset | That is fail-closed auth working as designed; set the key |
| Coolify panel unreachable | `coolify` container in `Created` state | `docker start coolify` on VPS |

---

## Related References

- [Infrastructure Root](../README.md)
- [Docker Reference Dockerfiles](../docker/README.md)
- [ADR-0028 — Self-Hosted Hybrid Infrastructure](../../../reference/core/architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md)
- [ADR-0030 — Two-Tier Distributed Gateway](../../../reference/core/architecture/adrs/core/0030-two-tier-distributed-gateway-model.md)
- [Multi-Cloud Deployment Scenarios](../../../reference/core/architecture/blueprints/multi-cloud-deployment-scenarios.md)

---

[Back to Infrastructure Root](../README.md)
