# Chaos + Recovery-Time Harness (GT-443)

Failure-injection scenarios against the local full-stack compose topology, plus
the one measurement GT-443 explicitly calls out as **never done**: *recovery
time after a total outage*.

Everything here is scoped to a **local `docker compose` project** via
`$COMPOSE_FILE` (default: `../docker-compose.fullstack.yml`). Nothing runs
against a remote/prod target. Prod chaos is **blocked on a running deployment
(GT-448)** — see [`../README.md`](../README.md).

## Topology under test (ground truth)

From `product/infra/docker-compose.fullstack.yml`:

| Service        | Host port | Role                                              | `restart` policy   |
|----------------|-----------|---------------------------------------------------|--------------------|
| `core-api`     | `3001→3000` | Stateless evaluation engine (ADR-0101). `/health` public. | `unless-stopped` |
| `mcp`          | `3002→3000` | Agent-facing MCP surface                          | `unless-stopped`   |
| `agent-runtime`| `3003→3000` | Uses the real Core over HTTP                      | `unless-stopped`   |
| `redis`        | internal 6379 | Shared cache / broker                          | `unless-stopped`   |
| `tracker-*`    | 5100/4000/8088 | .NET BFF + gateway + SPA + postgres            | `unless-stopped`   |

The critical path GT-443 cares about is `POST /api/v1/evaluate` on `core-api`.

## Prerequisites

- Docker + `docker compose`, `curl`, `python3` (millisecond clock), `bash`.
- The stack **running**: from `product/infra/`
  ```bash
  EVOLITH_API_KEY=local-dev-key docker compose -f docker-compose.fullstack.yml up -d
  ```
- `network-latency.sh` additionally pulls the `gaiaadm/pumba` image on first run
  (no host/container installs — Pumba injects `tc netem` via a privileged
  sidecar because the app images ship without `iproute2`).

All scripts read shared config from [`lib/common.sh`](lib/common.sh). Override
via env vars (`COMPOSE_FILE`, `CORE_HEALTH_URL`, `BROKER_SERVICE`, …).

## Scenarios

| Script | Failure injected | What it measures |
|--------|------------------|------------------|
| `kill-core-api.sh`   | `SIGKILL` on `core-api` (hard crash) | MTTR of the engine via its `restart: unless-stopped` policy |
| `kill-redis.sh`      | `SIGKILL` on `redis`, held `OUTAGE_SECONDS`, then restart | Whether the **stateless** engine degrades gracefully with the cache gone; recovery time |
| `kill-broker.sh`     | `SIGKILL` on `$BROKER_SERVICE` (default `redis`) | Same, but topology-agnostic — point it at a real broker when one exists (`BROKER_SERVICE=rabbitmq`) |
| `network-latency.sh` | Added latency/jitter or packet loss (Pumba `tc netem`) on a target service | SLO impact of a **slow** dependency (the case healthchecks miss) |
| `recovery-time.sh`   | **TOTAL outage** — `docker compose stop` (every service), then `up -d` | **MTTR after a full outage — the GT-443 headline number** |

### Run them

```bash
cd product/infra/load/chaos

./kill-core-api.sh
TARGET=redis ./kill-under-load.sh
OUTAGE_SECONDS=20 ./kill-redis.sh
BROKER_SERVICE=redis ./kill-broker.sh
TARGET=core-api DELAY_MS=300 JITTER_MS=100 DURATION=90s ./network-latency.sh
RUNS=5 ./recovery-time.sh | tee recovery-$(date +%Y%m%d-%H%M).log
```

Each script prints human logs to stderr and a **machine-readable JSON result
line** to stdout, so runs can be captured and diffed over time.

## Recovery-Time (MTTR) procedure — the thing never measured

`recovery-time.sh` is the core deliverable. Per run it:

1. **Baseline** — waits for a healthy stack *and* a real governed verdict
   (`POST /api/v1/evaluate` returning a `success:true` envelope), so we start
   from a known-good state.
2. **Total outage** — `docker compose stop` takes **every** service down at once
   (models host/AZ loss or a bad deploy), and confirms the outage took effect.
3. **Restore + clock start** — `docker compose up -d`; the clock (`t0`) starts at
   the instant restore is issued.
4. **Milestones**, all measured from `t0`:
   - `t_core_health_ms` — `core-api` `/health` returns 200 (process alive).
   - `t_core_ready_ms` — `/health/ready` returns 200 (corpus loaded, readiness).
   - `t_first_verdict_ms` — `POST /api/v1/evaluate` returns a success envelope.
     **This is the MTTR of record**: the moment the system is doing its job, not
     merely "process up".
5. **Repeat `RUNS` times** (default 3) and report **mean MTTR** — a single
   measurement is noise.

Example summary line:
```json
{"summary":true,"runs":5,"recovered_runs":5,"mean_mttr_ms":18420}
```

### Interpreting results

- **`mean_mttr_ms`** is the number GT-443 wants on record. Compare it against
  your recovery-time objective (RTO). No RTO exists yet — **propose one from the
  first measured baseline** (see `../README.md`).
- **`kill-redis` / `kill-broker`**: `core_api_non200_during_outage` should be
  **0** for a truly stateless engine. Non-zero means the engine has a hard
  runtime dependency on the cache/broker — a resilience finding to file.
- **`network-latency`**: run it alongside `../k6/average-load.js` in another
  terminal and watch which SLOs break under a *slow* (not dead) dependency.

## Safety

- Scripts refuse to run if the compose project has no running services
  (`require_compose_up`).
- `kill-broker.sh` validates the named service exists before killing anything.
- No script targets a non-local host; `$COMPOSE_FILE` is the only target. Do not
  point these at prod — prod chaos requires an explicit, owner-run exercise
  against the deployment stood up under GT-448.
