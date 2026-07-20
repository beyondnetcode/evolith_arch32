# Infrastructure & Orchestration

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This directory contains Docker Compose configuration and gateway declarative config for local development. Infrastructure complexity scales with the architectural phase — do not start all services on Phase 1.

## Goal and Objectives

> **Goal:** let any engineer run the reference platform locally with exactly the infrastructure their architectural phase requires — no more, no less.

**Objectives:**

- Map every local service (database, cache, broker, gateway, secrets) to the phase that justifies it.
- Provide copy-paste startup commands for Phase 1 minimal and Phase 2+ full stacks.
- Keep each service decision traceable to its governing ADR.

---

## Phase-Based Service Map

| Service | Phase Required | Role |
| :--- | :--- | :--- |
| **PostgreSQL** | Phase 1 (mandatory) | Primary relational database |
| **Redis** | Phase 1 (optional, add when latency demands it) | Distributed cache — [ADR-0014](../../reference/core/architecture/adrs/core/0014-multi-layer-distributed-caching-strategy.md) |
| **RabbitMQ** | Phase 2+ | Async message broker — [ADR-0015](../../reference/core/architecture/adrs/core/0015-event-driven-architecture-intra-domain.md) |
| **Traefik Proxy** | Phase 2+ | Edge API gateway — [ADR-0030](../../reference/core/architecture/adrs/core/0030-two-tier-distributed-gateway-model.md) |
| **OpenBao** | Phase 2+ | Secrets management (Vault fork) — [ADR-0028](../../reference/core/architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md) |

> **Phase 1 rule:** Start with PostgreSQL only. Add Redis when a specific P95 latency threshold is breached. Add Kong and RabbitMQ only when a second client channel or cross-service async delivery is needed.

---

## Phase 1 — Minimal Startup

```bash
# Start only the Phase 1 minimum
docker-compose -f product/infra/docker-compose.yml up -d postgres

# Optional: add Redis if cache is needed
docker-compose -f product/infra/docker-compose.yml up -d postgres redis
```

## Phase 2+ — Full Stack

```bash
# Start all services
docker-compose -f product/infra/docker-compose.yml up -d
```

## Verify Running Services

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## Service Ports

| Service | Port |
| :--- | :--- |
| PostgreSQL | `5432` |
| Redis | `6379` |
| RabbitMQ (AMQP) | `5672` |
| RabbitMQ (Management UI) | `15672` |
| Traefik (Proxy) | `8000` |
| Traefik (Dashboard) | `8080` |
| OpenBao | `8200` |

---

## Pinned Versions

| Service | Image Tag | Upgrade Cadence |
| :--- | :--- | :--- |
| PostgreSQL | `postgres:16` | LTS tracking |
| Redis | `redis:7.2` | Minor version tracking |
| MongoDB | `mongo:7.0` | Minor version tracking |
| Traefik | `traefik:v3.1` | Minor version tracking |

> **Policy:** All images use pinned tags (no `latest`). Upgrades are reviewed quarterly or when security patches are released.

---

## Resource Limits

Every service in `docker-compose.yml` declares `deploy.resources.limits` to prevent a runaway container from starving neighbors on the same host and to make capacity planning map cleanly to production sizing.

| Service | Memory | CPU | Rationale |
| :--- | :--- | :--- | :--- |
| PostgreSQL | 512M | 0.5 | Typical dev workload with moderate connection pool |
| SQL Server | 2G | 2 | MSSQL base footprint is high; headroom for query processing |
| MongoDB | 1G | 1 | Document store with working set in memory |
| Redis | 256M | 0.25 | In-memory cache; bounded by `maxmemory` policy |
| RabbitMQ | 512M | 0.5 | Broker with management UI; queue depth headroom |
| MinIO | 512M | 0.5 | S3-compatible object storage; I/O bound |
| OpenBao | 256M | 0.25 | Secrets engine; low CPU, minimal memory |
| Traefik | 128M | 0.25 | Reverse proxy; lightweight per-request forwarding |
| OTel Collector | 256M | 0.5 | Telemetry pipeline; burst on log ingestion |
| Tempo | 512M | 0.5 | Distributed tracing storage |
| Loki | 256M | 0.5 | Log aggregation index |
| Grafana | 256M | 0.5 | Dashboard UI; minimal compute |
| BFF | 512M | 0.5 | NestJS API server; Node.js heap |
| Prometheus | 512M | 0.5 | TSDB with 30d retention |
| Mimir | 512M | 0.5 | Long-term metrics storage |
| MCP | 512M | 0.5 | MCP server; Node.js heap |

> **Tuning guidance:** These limits suit a local development host with 16 GB RAM. For production, scale limits proportionally to expected workload. SQL Server (2 GB) is the most memory-hungry service; exclude it from Phase 1 to keep the minimal stack under 1 GB total.

---

## Configuration Files

| File | Purpose |
| :--- | :--- |
| `docker-compose.yml` | Main orchestration file |
| `traefik-dynamic.yml` | Traefik Proxy declarative (db-less) configuration |

---

## Secrets and Data Connectivity

**Secret store (GT-442).** Every service takes its credentials from a pre-created
Kubernetes Secret referenced by name — the charts never embed a literal. Each
deployment injects it with `secretKeyRef`, gated on `auth.existingSecretName`:

| Chart | Secret name (`auth.existingSecretName`) | Key (`auth.apiKeyKey`) |
| :--- | :--- | :--- |
| `evolith-core-api` | `core-api-auth` | `EVOLITH_API_KEY` |
| `evolith-mcp` | `mcp-auth` | `EVOLITH_API_KEY` |
| `evolith-agent-runtime` | `agent-runtime-auth` | `AGENT_RUNTIME_API_KEY` |

`evolith-mcp` additionally consumes `opa-bundle-credentials` (bundle registry
access) and `opa-bundle-signing-key` (bundle signature verification), both by
secret name. Create them out-of-band, for example:

```bash
kubectl create secret generic core-api-auth --from-literal=EVOLITH_API_KEY=<key>
```

On the VPS the equivalent values are Coolify application environment variables
(stored encrypted) — see [vps-coolify](./vps-coolify/README.md).

**Data connectivity — the Core has no database.** `core-api` and
`agent-runtime-api` declare **zero** database dependencies: no driver, no ORM, no
connection string. This is by design, not an omission — ADR-0101 makes the Core a
**stateless evaluation engine** (`EvaluationContext` in → `EvaluationResult` out;
product/tenant/initiative are opaque context, never persisted entities). So there
is deliberately **no `DATABASE_URL` in any Core deployment config**, and adding one
would contradict ADR-0101.

Persistence lives in the **Tracker** (its own Postgres, `tracker_governance`),
which is a separate repository with its own deployment and secret configuration.
Any DB-connectivity work belongs to that board, not to Core infra.

> The `postgresql` strings in `core-api` (`projects.controller.ts`,
> `core-domain.module.ts`) are the **scaffolding generator** picking a database for
> the *generated* project — they are not a Core runtime connection.

---

## Deployment Guides

| Guide | Description |
| :--- | :--- |
| [VPS — Coolify on Hostinger](./vps-coolify/README.md) | Production deployment to a self-hosted VPS using Coolify, validated on 7.8 GB / 2 vCPU Hostinger instance |

---

## Infrastructure Areas

The local Compose stack described above is one part of this directory. The rest:

| Area | Entry point | Content |
| :--- | :--- | :--- |
| **CI/CD** | [`ci-cd/`](./ci-cd/github-actions-profile.md) | GitHub Actions pipeline profile |
| **Docker** | [`docker/`](./docker/README.md) | Per-service Dockerfiles and build context |
| **Helm** | [`helm/`](./helm/README.md) | Charts for `evolith-core-api`, `evolith-mcp`, `evolith-agent-runtime` |
| **Kubernetes** | [`kubernetes/`](./kubernetes/README.md) | Manifests and cluster topology |
| **Observability** | [`observability/`](./observability/otel-stack-profile.md) | OTel stack profile, Prometheus config, Grafana assets |
| **SCM** | [`scm/`](./scm/github-profile.md) | Repository and branch protection profile |
| **Security** | [`security/`](./security/codeql-trivy-profile.md) | CodeQL and Trivy scanning profile |
| **VPS — Coolify** | [`vps-coolify/`](./vps-coolify/README.md) | Self-hosted VPS deployment |

---

[Back to Repository Root](../../README.md)
