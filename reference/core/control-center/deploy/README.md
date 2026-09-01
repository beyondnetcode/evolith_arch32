# Production Promotion Runbook — Evolith Engine (Coolify / Hostinger VPS)

> Closes the ops path for **GT-448** ("nothing runs in production: the stack was
> never promoted to the server customers would reach") and its umbrella
> **GT-435** ("end-to-end path code → running product is not deployed/validated").
>
> This runbook prepares and documents the promotion. It **does not perform it**.
> The single irreversible act — flipping `VPS_DEPLOY_ENABLED` to `true` on a repo
> that pushes to `main` — is reserved for the user (see
> [What only the user can do](#what-only-the-user-can-do-vs-what-is-automated)).

---

## 0. What this deploys, and the reference topology

CD builds three **engine** service images on every push to `main`, pushes them to
GHCR, then triggers a Coolify deploy hook per service. The images are the exact
ones proven locally by `product/infra/docker-compose.fullstack.yml`:

| Service         | Image (GHCR)                                 | Coolify app | Port (container) | Health         |
| --------------- | -------------------------------------------- | ----------- | ---------------- | -------------- |
| `core-api`      | `ghcr.io/<owner>/evolith-core-api:<sha>`     | **id 12**   | `3000`           | `GET /health`  |
| `mcp-server`    | `ghcr.io/<owner>/evolith-mcp:<sha>`          | **id 13**   | `3000`           | `GET /health`  |
| `agent-runtime` | `ghcr.io/<owner>/evolith-agent-runtime:<sha>`| (assign)    | `3000`           | `GET /health`  |
| `redis`         | `redis:7.2-alpine` (Coolify-managed)         | (assign)    | `6379`           | `redis-cli ping` |

The **Tracker companion** (`tracker-postgres`, `tracker-migrate`, `tracker-api`,
`tracker-web`, `tracker-gateway`) lives in the sibling `evolith_tracker` repo and
is deployed by that repo's own pipeline. This engine runbook stops at the
`core-api` boundary; the browser-chain smoke test in §5 exercises both halves.

The **production topology mirrors the local full-stack** exactly:

```
tracker-web (nginx SPA)                 ← evolith_tracker deploy
  → tracker-api (.NET BFF, POST /api/v1) ← evolith_tracker deploy
      → core-api  POST /api/v1/evaluate  ← THIS deploy (Coolify app 12)
          → redis (cache)                ← THIS deploy
      mcp-server (agent surface, http)   ← THIS deploy (Coolify app 13)
      agent-runtime → core-api /evaluate ← THIS deploy
```

Ground-truth facts (verified in-repo, not assumed):

- **`core-api` is stateless** (ADR-0101). Its image bakes the corpus at
  `/app/corpus/rulesets` (rulesets + compiled `policy.wasm` + human reference),
  so it needs **no volume and no database of its own**. `CORE_PATH` /
  `WORKSPACE_ROOT` must stay `/app/corpus` or OPA fail-closes on a missing
  `policy.wasm` in production (`src/apps/core-api/Dockerfile`).
- **Persistence in the browser chain is the Tracker's Postgres**, not Core's.
  The evaluation record is written by `tracker-api` after Core returns.
- **MCP uses HTTP + API key** (`TRANSPORT=http`, `EVOLITH_MCP_ALLOW_NO_AUTH=false`).
- The evaluate route is `POST /api/v1/evaluate` (NestJS URI versioning, version
  `1`); `/health` is version-neutral (no `/api/v1` prefix).

---

## 1. How CD is wired (read before touching anything)

Source of truth: `.github/workflows/ci-cd.yml`.

1. **Build & test** — jobs `Test`, `Test core-domain`, `Test core`,
   `Test mcp-server`, `Test core-api`, `Test sdk-client`, `Test contract`,
   `Test infra-providers` run on every PR to `main`/`develop`.
2. **`Build Services (GHCR)`** (job `docker-services`) — builds `core-api`,
   `mcp-server` and `agent-runtime` on **every PR**, and pushes `:latest` +
   `:<sha>` to GHCR only from `main` or `v*` tags, using the built-in
   `GITHUB_TOKEN` (no extra secret). The build was main-only until GT-679; a
   broken Dockerfile crossed three PRs with green checks because the only job
   that would have caught it ran after they had already merged. The three matrix
   legs are collapsed into one stable check, **`Services build (GHCR)`** (job
   `docker-services-gate`), which is the context branch protection names —
   matrix contexts carry their parameters and change whenever a path does. It
   passes **only** on `success`: a skipped build means the check saw nothing and
   must not vouch for anything.
3. **`Deploy services (Coolify)`** (job `deploy`, `needs: [docker-services]`) —
   the promotion step. Its guard is:

   ```yaml
   if: github.ref == 'refs/heads/main' && vars.VPS_DEPLOY_ENABLED == 'true'
   ```

   It has three steps — `Trigger Coolify deploy (core-api)`,
   `Trigger Coolify deploy (mcp-server)`, `Trigger Coolify deploy (agent-runtime)`
   — each of which:
   - **fail-soft** when its hook or the API token is unset: prints a
     `::warning::` and `exit 0` (safe to merge before CD is configured), and
   - **fail-hard** once configured: `curl --fail ... "$HOOK" -H "Authorization: Bearer $TOKEN"`
     returns non-zero if the hook does not respond, which means the deploy did
     not happen. If this step is red, look at the runtime before the workflow.

**GT-567 — the deploy job is deliberately OFF.** The guard variable
`VPS_DEPLOY_ENABLED` is unset/`false`, so the `deploy` job is skipped on every
push to `main`. This is intentional (target was Docker + local `kind`; the VPS
was parked). Re-enabling is **one command** (§4, step 6) and is the irreversible
user action. The secrets were kept in place and only the *variable* toggles the
gate, by design — so the "off" state is visible in one place and reversible
without the VPS panel.

---

## 2. Pre-flight checklist (do all of these before enabling CD)

- [ ] **VPS reachable.** Hostinger VPS is up and Coolify is running and reachable
      over HTTPS.
- [ ] **Three Coolify apps exist and pull from GHCR** (not "build from git"):
      - core-api → `ghcr.io/<owner>/evolith-core-api:latest` (app id **12**)
      - mcp-server → `ghcr.io/<owner>/evolith-mcp:latest` (app id **13**)
      - agent-runtime → `ghcr.io/<owner>/evolith-agent-runtime:latest`
      If GHCR packages are private, add a GHCR registry credential in Coolify
      (a PAT with `read:packages`).
- [ ] **A managed `redis` resource** exists in the same Coolify project/network,
      reachable from `core-api` at `redis://redis:6379` (or set `REDIS_URL` to
      the address Coolify assigns).
- [ ] **Runtime env vars are set on each Coolify app** (values live in Coolify,
      NOT in GitHub). See `production-env.example` in this folder for the full
      annotated set. At minimum:
      - core-api: `EVOLITH_API_KEY`, `REDIS_URL`, `CORE_PATH=/app/corpus`,
        `WORKSPACE_ROOT=/app/corpus`, `NODE_ENV=production`, `PORT=3000`
      - mcp-server: `EVOLITH_API_KEY`, `TRANSPORT=http`,
        `EVOLITH_MCP_ALLOW_NO_AUTH=false`, `CORE_PATH=/app/corpus`,
        `WORKSPACE_ROOT=/app/corpus`
      - agent-runtime: `AGENT_RUNTIME_API_KEY`, `AGENT_RUNTIME_CORE_ENDPOINT`,
        `AGENT_RUNTIME_CORE_TOKEN`, and (if HITL is used) the two
        `AGENT_RUNTIME_APPROVAL_TRACKER_*` values
      **Use the same `EVOLITH_API_KEY` value** across core-api, mcp-server and as
      `AGENT_RUNTIME_CORE_TOKEN` — the local topology uses one shared key
      (`x-api-key` anchor in the full-stack compose). Generate a strong random
      value; do not reuse `local-dev-key`.
- [ ] **Deploy webhook per app is enabled** in Coolify (needed to capture the
      hook URLs in §3).
- [ ] **A Coolify API token** exists with permission to trigger deploys.
- [ ] **`main` branch protection** is green (the 6 required checks) so nothing
      broken can reach the deploy job.
- [ ] **Tracker companion is deployed** (or ready to deploy) so the §5 browser
      smoke test can run end-to-end.

---

## 3. The exact GitHub secrets & variables checklist

These are the **only** repo-level GitHub settings the promotion needs. Set them
with the `gh` CLI from a checkout of this repo (they scope to the current repo).

### Secrets — `gh secret set <NAME>`

| Secret name                          | Where to get it in Coolify                                                                                   | Command |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------- |
| `COOLIFY_API_TOKEN`                  | Coolify → **Keys & Tokens → API Tokens** → create a token with deploy permission.                            | `gh secret set COOLIFY_API_TOKEN` |
| `COOLIFY_COREAPI_DEPLOY_HOOK`        | Coolify → **core-api app (id 12) → Webhooks → Deploy** → copy the full webhook URL.                          | `gh secret set COOLIFY_COREAPI_DEPLOY_HOOK` |
| `COOLIFY_MCP_DEPLOY_HOOK`            | Coolify → **mcp-server app (id 13) → Webhooks → Deploy** → copy the full webhook URL.                        | `gh secret set COOLIFY_MCP_DEPLOY_HOOK` |
| `COOLIFY_AGENTRUNTIME_DEPLOY_HOOK`   | Coolify → **agent-runtime app → Webhooks → Deploy** → copy the full webhook URL.                            | `gh secret set COOLIFY_AGENTRUNTIME_DEPLOY_HOOK` |

`gh secret set` reads the value from an interactive prompt or stdin, so the value
never lands in shell history, e.g.:

```bash
gh secret set COOLIFY_API_TOKEN                 # then paste the token at the prompt
gh secret set COOLIFY_COREAPI_DEPLOY_HOOK       # paste the hook URL
gh secret set COOLIFY_MCP_DEPLOY_HOOK
gh secret set COOLIFY_AGENTRUNTIME_DEPLOY_HOOK
```

> Not part of VPS promotion, listed for completeness: `NPM_TOKEN` is used only by
> the `Publish npm` job on `v*` tags, and `GITHUB_TOKEN` (built-in) authenticates
> the GHCR push — neither needs to be created for this runbook.

### Variable — `gh variable set <NAME>`

| Variable name         | Value  | Effect                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------- |
| `VPS_DEPLOY_ENABLED`  | `true` | Un-gates the `deploy` job on push to `main`. **This is the switch that turns production deploys on.** |

```bash
gh variable set VPS_DEPLOY_ENABLED --body true
```

### Verify what is set (no values printed)

```bash
gh secret list
gh variable list
```

---

## 4. Order of promotion

Do these in order. Steps 1–5 are reversible / non-destructive. **Step 6 is the
irreversible go-live and is the user's to run.**

1. **Complete the §2 pre-flight** — apps, redis, per-app runtime env, webhooks,
   API token all in place in Coolify.
2. **Set the three deploy-hook secrets + the API token** (§3, secrets table).
   With these set and `VPS_DEPLOY_ENABLED` still unset, the deploy job stays
   skipped — nothing deploys yet.
3. **Merge a normal change to `main`** (or re-run the workflow) and confirm the
   `Build Services (GHCR)` job is green and the three images appear in GHCR (on a
   PR the same job is green without publishing anything). The `deploy` job should
   still show as **skipped** (guard is off).
4. **Optionally deploy once manually from the Coolify UI** (each app → Deploy) to
   prove the images boot and the runtime env is correct, before wiring the
   automatic trigger. Watch each `/health` go green.
5. **Run the §5 smoke test** against the manually-deployed stack. If the browser
   chain proves out, CD will only automate what already works.
6. **USER ACTION — enable automated CD:**
   ```bash
   gh variable set VPS_DEPLOY_ENABLED --body true
   ```
   From the next push to `main`, the `deploy` job runs and `curl --fail`s each
   Coolify hook. This is the irreversible production-promotion switch. To pause
   CD again: `gh variable set VPS_DEPLOY_ENABLED --body false`.

---

## 5. Post-deploy end-to-end smoke test (proves GT-435)

GT-435 is "closed" only when a governed evaluation flows through the **real**
browser chain and is **persisted** — not when a container merely boots. Run all
three layers.

### 5a. Liveness (each engine service)

```bash
# core-api  (version-neutral /health)
curl -fsS https://<core-api-host>/health

# mcp-server  (http transport, health is unauthenticated)
curl -fsS https://<mcp-host>/health

# agent-runtime
curl -fsS https://<agent-runtime-host>/health
```

All three must return HTTP 200.

### 5b. Core evaluate directly (proves the engine + OPA/policy.wasm in prod)

```bash
curl -fsS -X POST https://<core-api-host>/api/v1/evaluate \
  -H "Content-Type: application/json" \
  -H "x-api-key: $EVOLITH_API_KEY" \
  -d '{ "workspaceRef": "rulesets", "phase": "1" }'
```

Expect **HTTP 200** and an ADR-0073 success envelope wrapping an
`EvaluationResult` (an `overallVerdict` of `PASS`/`FAIL`/… — a *real* verdict, not
an error). A 200 here proves the corpus baked into the image (`/app/corpus/rulesets`,
including `policy.wasm`) loaded and the engine ran.

### 5c. The governed-evaluation browser chain (the GT-435 closure criterion)

This is the flow the local full-stack proves and prod must reproduce:

```
tracker-web  →  tracker-api  →  core-api  POST /api/v1/evaluate  → 200 → persisted
```

1. Open the Tracker web UI: `https://<tracker-web-host>` and sign in.
2. Trigger a governed evaluation from the UI (the initiative/architecture
   evaluate action that the Tracker BFF proxies to Core).
3. Confirm in the browser network panel that `tracker-api` returned **200** for
   the evaluate call and the UI rendered a real verdict.
4. **Prove it came from the real Core, not a mock.** The Tracker must run with
   `CoreApi__MockFallback=false` (as in the full-stack compose). A result served
   by the live engine — i.e. **provenance = core**, not the BFF's mock fallback —
   is the signal that the Core hop actually executed. If the Tracker exposes a
   provenance/source field on the response, it must read `core`; if it does not,
   assert `MockFallback=false` in the deployed `tracker-api` config so a mock is
   impossible.
5. **Prove persistence.** Confirm the evaluation was written to the Tracker's
   Postgres (the record appears in the initiative's evaluation history in the UI
   on reload, and/or query the `evolith_tracker` database directly). Core is
   stateless by design — this persisted row on the Tracker side is what closes
   the "running product" claim.

When 5a + 5b + 5c all pass against the VPS, GT-448 (stack promoted and reachable)
and GT-435 (code → running, validated product) are demonstrably closed.

### 5d. Rollback

Coolify keeps prior deployments per app. If a smoke test fails after go-live:
redeploy the previous good image tag from the Coolify UI (each app → Deployments →
Redeploy), and set `gh variable set VPS_DEPLOY_ENABLED --body false` to stop
further automatic promotions while you investigate.

---

## What only the user can do vs. what is automated

### Automated (already wired in `ci-cd.yml`, no human in the loop once enabled)

- Build + test of every workspace on PRs to `main`/`develop`.
- Build & push of `core-api`, `mcp-server`, `agent-runtime` images to GHCR on
  every push to `main` (`docker-services` job, built-in `GITHUB_TOKEN`).
- Triggering the Coolify deploy hook for each of the three services on push to
  `main` — **but only while `VPS_DEPLOY_ENABLED == 'true'`** (`deploy` job).
- Fail-hard reporting: once hooks/token are set, a non-responding hook fails the
  workflow instead of silently passing.

### The user's — manual, and deliberately not automatable here

- **Provisioning** the Hostinger VPS and Coolify, creating the three apps
  (ids 12 / 13 / assign for agent-runtime) and the managed `redis`.
- **Setting runtime env vars** on each Coolify app (secrets live in Coolify, not
  GitHub) — including generating the production `EVOLITH_API_KEY`.
- **Capturing the deploy-hook URLs and the Coolify API token** from the Coolify
  panel and **setting them as GitHub secrets** (§3). These values only exist in
  Coolify and cannot be generated from this repo.
- **The irreversible go-live:** `gh variable set VPS_DEPLOY_ENABLED --body true`.
  This is the one act that turns pushes to `main` into live customer-facing
  deploys. It is intentionally left to a human because it is the point of no
  return, and because the target VPS is a resource this runbook cannot reach.
- **Running / signing off the §5 smoke test** against production.

This runbook, `production-env.example`, and the existing CI/CD wiring are
everything that *can* be prepared without credentials or the VPS. The remaining
steps require secrets only the user holds and the deliberate act of flipping
production on.
