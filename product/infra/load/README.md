# Evolith Load + Chaos Harness (GT-443)

> **Gap GT-443:** *"How the system behaves under failure and heavy load has never
> been measured on a running deployment; recovery time after a total outage has
> never been timed."*

This directory is a **ready-to-run** harness that measures exactly those two
things against the Evolith Core evaluation engine:

- **Load** — `k6/` scripts drive the real governed evaluation path
  (`POST /api/v1/evaluate`) at smoke / average / stress+spike intensities with
  SLOs encoded as pass/fail thresholds.
- **Chaos + recovery** — `chaos/` scripts inject failures against the compose
  topology and **time mean-time-to-recovery (MTTR) after a total outage** — the
  specific measurement the gap says was never made.

The harness is **prepared, syntax-validated, and hermetic**. It is **not** run
against production here: no running prod exists yet — that is
**blocked on GT-448** (stand up a real deployment). See
[What still requires a live deployment](#what-still-requires-a-live-deployment).

## Layout

```
product/infra/load/
├── README.md                 ← you are here (how to run, SLOs, what's blocked)
├── .env.example              ← the only config the harness needs
├── k6/
│   ├── lib/config.js         ← single source: URLs, auth, real eval body, SLOs
│   ├── smoke.js              ← correctness gate, tiny load
│   ├── average-load.js       ← steady-state baseline (record this)
│   └── stress-spike.js       ← MODE=stress | MODE=spike, find the knee
└── chaos/
    ├── README.md             ← chaos scenarios + MTTR procedure in detail
    ├── lib/common.sh         ← shared helpers (compose targeting, health polling)
    ├── kill-core-api.sh      ← hard-kill the engine, time restart recovery
    ├── kill-redis.sh         ← kill the cache under load, measure degradation
    ├── kill-broker.sh        ← topology-agnostic broker kill ($BROKER_SERVICE)
    ├── network-latency.sh    ← latency / packet-loss injection (Pumba)
    └── recovery-time.sh      ← TOTAL-OUTAGE MTTR — the GT-443 headline
```

## What it targets (ground truth, not guessed)

Verified against `src/apps/core-api` and `docker-compose.fullstack.yml`:

- **Evaluation:** `POST {BASE_URL}/api/v1/evaluate`, header `x-api-key: <key>`
  (`EvaluationController`, ADR-0101 stateless engine; `ApiKeyGuard`).
  The body uses the **inline** path (`evaluationInput.files`) so the load is
  hermetic — the Core evaluates in-memory satellite content against its own
  on-disk rulesets, with **no** `workspaceRef` resolution and **no** sibling
  repo needed. The `evolith.yaml` shape matches the controller's own passing
  fixture, so this is a **genuine PASS verdict** (`provenance: core`), not an
  error path.
- **Health:** `GET {BASE_URL}/health` — `@Public()`, no key (`HealthController`,
  version-neutral). `/health/ready` gates on corpus load.
- **Ports:** compose maps `core-api 3001→3000`, so `BASE_URL` defaults to
  `http://localhost:3001`.

## Prerequisites

- [`k6`](https://k6.io) (validated with v2.0.0) for the load scripts.
- Docker + `docker compose`, `curl`, `python3`, `bash` for the chaos scripts.
- A **target** to point at — locally, the full-stack compose bring-up:
  ```bash
  cd product/infra
  EVOLITH_API_KEY=local-dev-key docker compose -f docker-compose.fullstack.yml up -d
  ```

Configure once:
```bash
cd product/infra/load
cp .env.example .env      # edit BASE_URL / EVOLITH_API_KEY for your target
set -a; source .env; set +a
```

## Running

### Load (k6)

```bash
cd product/infra/load

# 1) Smoke — correctness first. If this fails, stop.
k6 run k6/smoke.js

# 2) Average load — the baseline you record. Tune the plateau to your target.
k6 run -e PLATEAU_VUS=30 -e PLATEAU_DURATION=3m k6/average-load.js

# 3) Stress (staged climb) then Spike (sudden burst) — find the knee & breaking point.
k6 run -e MODE=stress -e PEAK_VUS=200 k6/stress-spike.js
k6 run -e MODE=spike  -e PEAK_VUS=300 k6/stress-spike.js
```

`EVOLITH_API_KEY` / `BASE_URL` are read from the environment (or pass
`-e KEY=value`). Every script exits **non-zero** if an SLO threshold is crossed,
so CI can gate on it. For machine-readable output:
`k6 run --summary-export=out.json k6/average-load.js`.

### Chaos + recovery

```bash
cd product/infra/load/chaos
./kill-core-api.sh
OUTAGE_SECONDS=20 ./kill-redis.sh
TARGET=core-api DELAY_MS=300 DURATION=90s ./network-latency.sh
RUNS=5 ./recovery-time.sh | tee recovery-$(date +%Y%m%d-%H%M).log   # ← the MTTR run
```

See [`chaos/README.md`](chaos/README.md) for the full MTTR procedure and how to
interpret each JSON result line.

## SLOs — what pass/fail means

The thresholds live in [`k6/lib/config.js`](k6/lib/config.js) (`SLO`) and are
**enforced** as k6 thresholds (breach ⇒ non-zero exit). Defaults, and why:

| Metric | Default | Rationale |
|--------|---------|-----------|
| `evaluate` p95 latency | **800 ms** | Inline evaluation is CPU-bound (ruleset validation in memory, no external I/O in the hot path). 800 ms leaves headroom over an expected sub-200 ms local baseline while catching real regressions. |
| `evaluate` p99 latency | **1500 ms** | Tail budget ~2× p95; flags GC / lock / saturation tails without tripping on ordinary jitter. |
| `health` p95 latency | **150 ms** | A trivial liveness handler; anything slower means the event loop is starved. |
| `health` p99 latency | **300 ms** | Tail budget for the probe. |
| error rate | **< 1%** (`0.01`) | Steady state must be essentially error-free. Under **stress** the bar relaxes to **< 5%** deliberately — a stress test observes degradation past the SLO rather than passing it. |
| checks pass | **> 99%** | Correctness (real success envelope + `gates` present), not just HTTP 200. |

**These defaults are placeholders until a real baseline exists.** They are
intentionally conservative for the in-memory inline path. Once `average-load.js`
has run against the actual deployment, **replace them with numbers derived from
the measured p95/p99** (override via `SLO_*` env vars, then bake the agreed
values into `config.js`). A **PASS** means every encoded SLO held for the whole
run; a **FAIL** (non-zero exit) means at least one threshold was crossed — read
the k6 summary to see which metric and by how much.

There is likewise **no RTO (recovery-time objective) on record yet**. Take the
first `mean_mttr_ms` from `recovery-time.sh` as the empirical baseline and
propose an RTO from it.

## What still requires a live deployment

Everything here is prepared and validated (k6 scripts compile under
`k6 inspect`; shell scripts pass `bash -n`). What it **cannot** produce until a
real running target exists — **blocked on GT-448**:

- **Actual numbers.** No latency/error/MTTR figures have been produced: no
  production (or long-lived staging) deployment exists to measure. The local
  compose stack can produce a *local* baseline today, but not the "running
  deployment" the gap refers to.
- **Prod/staging chaos.** The chaos scripts target a local `docker compose`
  project. Killing/degrading real infrastructure (container orchestrator
  pods, managed cache, real broker) must be an explicit, owner-run exercise
  against the GT-448 deployment, with its own restart/orchestration policies —
  the compose `restart: unless-stopped` behaviour is only a local analogue.
- **Agreed SLOs / RTO.** The encoded thresholds are engineering defaults, not
  org-ratified targets. They should be confirmed against a measured baseline and
  signed off before they gate anything.
- **Broker realism.** The topology currently has no dedicated message broker;
  `kill-broker.sh` targets `redis` by default. Re-point `BROKER_SERVICE` when a
  real broker is introduced.

Once GT-448 provides a target, point `BASE_URL` / `COMPOSE_FILE` at it, run the
three k6 tiers to set the SLO baseline, then run `recovery-time.sh` to record
the first-ever MTTR — closing GT-443.
