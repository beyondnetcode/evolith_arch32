# Deployment Topology and Naming Reconciliation

> **Bilingual Navigation:** [Versión en Español](./deployment-topology.es.md)

This document is the source of truth that resolves the naming/domain drift across
the three deployment models (Coolify, docker-compose, Helm). It maps every
service to its canonical name and clarifies what `bff` actually is.

## Goal

Give one unambiguous map of "which artifact deploys which service, where, and
under what name", so the Coolify (live), docker-compose (local), and Helm (K8s)
models stop diverging.

## Canonical truth (ADR-0074)

- The official network exposure layer of Evolith Core is **`src/apps/core-api`**
  ([ADR-0074](../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md)) —
  a NestJS REST API. This is the real service consumers hit.
- **`evolith-bff`** (historically the Helm chart, the `bff` compose service, and
  `product/infra/docker/bff.Dockerfile`) was a **generic BFF reference
  template** (the BFF pattern of nodejs/ADR-0008) — NOT the real core-api image,
  and carrying no core-api-specific configuration. It no longer sits on any
  deployment path: the Helm chart was renamed to `evolith-core-api` and the
  compose service is now `core-api`, built from the real Dockerfile. Only
  `product/infra/docker/bff.Dockerfile` remains, as a reference template.
- **"Tracker BFF"** (architecture doc §11) is **external** — it belongs to
  Evolith Tracker and *consumes* core-api; it is not deployed from this repo.
- Real per-service Dockerfiles are `src/apps/core-api/Dockerfile`,
  `src/packages/mcp-server/Dockerfile`, `src/apps/agent-runtime-api/Dockerfile`. The
  files under `product/infra/docker/*.Dockerfile` are illustrative
  templates, not the production build.

## Service-by-model matrix

| Canonical service | Real build | Coolify (LIVE) | docker-compose | Helm chart |
|---|---|---|---|---|
| **CORE-API** | `src/apps/core-api/Dockerfile` | `evolith-core-api` · `evolith.beyondnet.cloud` | `core-api` (real build) | `evolith-core-api` · `evolith.beyondnet.cloud` |
| **MCP Server** | `src/packages/mcp-server/Dockerfile` | `evolith-mcp` · `mcpevolith.beyondnet.cloud` | `mcp` (real build) | `evolith-mcp` · `mcpevolith.beyondnet.cloud` |
| **Agent Runtime** | `src/apps/agent-runtime-api/Dockerfile` | prepared · `evolithruntime.beyondnet.cloud` | `agent-runtime` (real build) | `evolith-agent-runtime` · `evolithruntime.beyondnet.cloud` |
| **SMART-CLI** | `src/sdk/cli` | npm `@beyondnet/evolith-cli` | n/a | n/a |
| **Tracker BFF** | external (Tracker) | n/a | n/a | n/a |

`product/infra/docker-compose.evolith.yml` builds all three services from the
**real** Dockerfiles (`src/apps/core-api/Dockerfile`,
`src/packages/mcp-server/Dockerfile`, `src/apps/agent-runtime-api/Dockerfile`),
each with build context `../..` — no template image is on the compose path.

## Drift detected

> **Status:** #1 and #4 are **CLOSED**. #2 and #3 are **closed in-repo** but
> still pending the infra-side apply. Original wording preserved below.

1. ~~**`bff` vs `core-api`**: Helm/compose deploy a generic `bff` template, while
   the live/real service is `core-api`. Same role, two names, and the chart does
   not build the real image.~~ — **CLOSED.** The Helm chart is
   `evolith-core-api` and the compose service is `core-api`, built from
   `src/apps/core-api/Dockerfile`. No `bff` service remains on any deploy path.
2. **Domain drift**: Coolify uses `*.beyondnet.cloud` (live); Helm uses
   `*.beyondnetcode.com`. — **CLOSED in repo, pending infra.** All three charts
   now declare `*.beyondnet.cloud`; DNS still has to be pointed.
3. **Registry drift**: existing Helm charts reference Docker Hub `beyondnetcode/*`;
   the new `docker-images.yml` workflow pushes to `ghcr.io/<owner>/*`. —
   **CLOSED in repo, pending infra.** All three charts now declare
   `ghcr.io/beyondnetcode/*`; the workflow still has to be run to publish the
   images.
4. ~~**Two Dockerfile sets**: real (`apps/*`, `packages/*`) vs template
   (`product/infra/docker/*`). The compose/Helm path builds templates,
   not the real images.~~ — **CLOSED.** Compose and Helm both target the real
   Dockerfiles; `product/infra/docker/*` is explicitly reference-only.

## Recommended target state

- Treat **`core-api`** (ADR-0074) as the canonical name everywhere. Either rename
  the Helm `evolith-bff` chart to `evolith-core-api` pointing at the real
  `src/apps/core-api` image, or keep `evolith-bff` clearly labelled as a generic
  template and add a real `evolith-core-api` chart.
- Standardize one **canonical domain**. Recommended: `*.beyondnet.cloud` (already
  live on Coolify) — update Helm `ingressRoute.host` accordingly.
- Standardize one **container registry**. Recommended: `ghcr.io/<owner>/*` (the
  `docker-images.yml` workflow already uses it with the built-in token) — update
  the three charts' `image.repository` to match.
- Point the compose/Helm builds at the **real Dockerfiles**, or mark the
  `product/infra/docker/*` templates as reference-only.

## Resolved decisions (applied 2026-06-29)

The in-repo reconciliation has been applied:

1. **Canonical domain → `beyondnet.cloud`.** Helm `ingressRoute.host` updated:
   `evolith.beyondnet.cloud` (core-api), `mcpevolith.beyondnet.cloud` (mcp),
   `evolithruntime.beyondnet.cloud` (agent-runtime), all `PathPrefix(/)`.
2. **Canonical registry → `ghcr.io/beyondnetcode/*`.** Chart `image.repository`
   updated for all three; the `docker-images.yml` workflow publishes there.
3. **`evolith-bff` renamed to `evolith-core-api`**, modeled on the real
   `src/apps/core-api` (in-process OPA, no sidecar, `/health` probes, port 3000,
   `EVOLITH_API_KEY` secret). The `evolith-mcp` chart's stale `3001` port and
   non-existent `/ready`,`/startup` probes were corrected to `3000` + `/health`.

4. **Compose builds the real Dockerfiles.**
   `product/infra/docker-compose.evolith.yml` builds `core-api`, `mcp`, and
   `agent-runtime` from `src/apps/core-api/Dockerfile`,
   `src/packages/mcp-server/Dockerfile`, and
   `src/apps/agent-runtime-api/Dockerfile`. The `product/infra/docker/*` files
   are reference-only templates and are no longer on any deploy path.

~~Still infra-owned (apply when migrating): point DNS, create the registry images
(run the workflow), and reconcile the `product/infra/docker/*`
templates or build the real Dockerfiles in compose.~~ — the compose/Dockerfile
half is **CLOSED** (item 4 above). Still infra-owned: point DNS and create the
registry images by running the `docker-images.yml` workflow.
