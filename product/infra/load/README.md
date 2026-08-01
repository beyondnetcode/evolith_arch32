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

**Status (2026-07-30).** This harness is no longer only *prepared* — it now
**runs**. `.github/workflows/reliability.yml` executes the k6 profiles on every
change to core-api / core-domain / rulesets / this directory and publishes the
numbers; the chaos drill runs there off the PR path. Until that workflow existed,
`grep -rniE "k6|chaos" .github/workflows/` returned nothing: the SLOs in this
file gated exactly nothing.

**What running it for the first time found** (see
[Measured results](#measured-results)): the smoke test asserted a response field
(`data.gates`) that the API does not return, and the chaos scripts claimed a
Docker restart policy that does not fire for the kill they inject. Both are
fixed. A prepared-but-unexecuted harness is not evidence — it is a hypothesis.

Production numbers remain **blocked on GT-448** (no long-lived deployment). See
[What still requires a live deployment](#what-still-requires-a-live-deployment).

## Layout

```
product/infra/load/
├── README.md                 ← you are here (how to run, SLOs, what's blocked)
├── .env.example              ← the only config the harness needs
├── wait-for-target.sh        ← block until the target serves a REAL verdict
├── report-summary.mjs        ← k6 summary JSON → Markdown (CI step summary)
├── k6/
│   ├── lib/config.js         ← single source: URLs, auth, real eval body, SLOs
│   ├── smoke.js              ← correctness gate, tiny load
│   ├── average-load.js       ← steady-state baseline (record this)
│   └── stress-spike.js       ← MODE=stress | MODE=spike, find the knee
└── chaos/
    ├── README.md             ← chaos scenarios + MTTR procedure in detail
    ├── lib/common.sh         ← shared helpers (compose targeting, health polling)
    ├── kill-under-load.sh    ← kill a dependency MID-RUN, with real callers on it
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
- A **target** to point at — locally, the full-stack compose bring-up. Always
  pass `--build`: the compose files pin a fixed local tag (`evolith-core-api:local`),
  so a plain `up -d` silently reuses whatever image is already on the machine.
  A drill run this way measures whatever was built last, not the checkout — one
  of these runs was measured against a week-old image before that was noticed,
  and its response contract had since changed.
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
TARGET=redis ./kill-under-load.sh
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
| checks pass | **> 99%** | Correctness, not just HTTP 200: a real success envelope, a non-empty `data.rulesExecuted`, and a `data.overallVerdict` of PASS/FAIL/WARN. (It used to check `data.gates` — a field the current API never returns. That check failed 100% of the time on the harness's first real execution and would have kept failing forever, because nothing ran it.) |

### Which statistic each profile asserts the latency SLO at

Same SLO numbers, different statistic — because sample size decides what a
statistic can mean:

| Profile | Samples | Latency asserted at | Why |
|---------|---------|---------------------|-----|
| `smoke.js` | **10** (1 VU × 10 iterations) | **`med`** | With n=10, k6 computes p(95) at index `0.95*(n-1) = 8.55` — it interpolates 55% of the way from the 9th sorted sample to the slowest one. "p95" there is the max wearing a percentile's name, and it fails on a single outlier. The median is the 5th/6th sample: an order statistic n=10 supports. |
| `average-load.js` | thousands | **`p(95)`, `p(99)`** | Enough samples for a percentile to describe a distribution rather than one request. This is the profile whose tail numbers you record. |
| `stress-spike.js` | thousands | **`p(95)`, `p(99)`** | Same reasoning; the point is to watch the tail degrade past the SLO. |

Asserting smoke at the median is a *weaker* claim than the SLO, not a relaxed
one — no number was raised. If p95 must be under 150 ms, the median must be too.
The tail is still **measured and published** on every smoke run (the step summary
prints med/p95/p99/max) — it just does not gate a 10-sample run.

**These defaults are placeholders until a real baseline exists.** They are
intentionally conservative for the in-memory inline path. Once `average-load.js`
has run against the actual deployment, **replace them with numbers derived from
the measured p95/p99** (override via `SLO_*` env vars, then bake the agreed
values into `config.js`). A **PASS** means every encoded SLO held for the whole
run; a **FAIL** (non-zero exit) means at least one threshold was crossed — read
the k6 summary to see which metric and by how much.

There is likewise **no RTO (recovery-time objective) on record yet**. An MTTR now
exists (below), but MTTR from a container restart is **not** an RTO: an RTO comes
from a disaster-recovery restore, and none has been performed.

## Measured results

First execution of this harness — **2026-07-30**, engine-only compose
(`docker-compose.evolith.yml`, core-api + redis, image rebuilt `--no-cache` from
the checkout), macOS / Docker 29.4.3, on a **developer laptop that was running
other containers at the same time**. Absolute numbers will differ on a CI runner
and differ more on a real deployment; what is durable here is the *shape*, the
failures found, and the fact that these are the first numbers of any kind.

| Run | Result |
| --- | --- |
| **Smoke** (1 VU, 10 iterations, warm) | 50/50 checks, evaluate p95 **719 ms**, health p95 **44 ms**, 0 errors, exit 0 |
| **Average load** (10 VUs, 60 s plateau) | **10.15 req/s**, evaluate p95 **2 545 ms**, p99 **6 524 ms**, health p95 **139 ms**, **0 %** errors, 100 % checks → **SLO breach on latency** |
| **Chaos: SIGKILL core-api mid-run** (5 VUs on it) | outage visible to callers in **339 ms**; `/health` back in **5 538 ms**; first governed verdict in **5 770 ms**; callers saw **49/706 (6.9 %)** failed requests |
| **Total-outage MTTR** (`recovery-time.sh`, 3 runs) | **3/3 recovered**, mean time to first governed verdict **10 318 ms** (health ≈ 9.9 s, ready ≈ 9.9 s) |

What those numbers say:

- **The engine is CPU-bound and single-replica.** Ten concurrent callers already
  push evaluate p95 to ~2.5 s against an 800 ms SLO with **zero** errors — it is
  saturation, not failure. Each inline evaluation runs ~107 rules plus OPA-wasm
  on one Node event loop. The declared SLOs do **not** hold at 10 concurrent
  users on one container; either the SLO or the deployment shape has to move.
- **Recovery works, and something outside the container has to trigger it** (see
  the restart-policy finding below). ~5.8 s to first verdict after a hard kill,
  ~10.3 s after a full stack outage — dominated by boot + corpus load, not by
  the kill itself.

### What running it found (all fixed here)

1. **A check that could never pass.** Smoke asserted `data.gates` on the evaluate
   response; the API returns `rulesExecuted` / `overallVerdict` and has no
   `gates` field. 100 % failure on first execution, invisible for weeks because
   nothing ran it.
2. **A restart policy that does not restart.** The chaos scripts documented that
   `restart: unless-stopped` brings the service back after their SIGKILL. Docker
   29.4.3, measured: an **external** `docker kill` leaves the container
   `Exited (137)` with `RestartCount=0` — the daemon treats it as an operator
   stop. (A container whose own PID 1 dies **is** restarted: `RestartCount=2` in
   the same experiment.) The first drill therefore sat in a 180 s outage and
   never recovered. The scripts now restart the service themselves
   (`RESTART_MODE=orchestrator`, the default), which is what a kubelet does;
   `RESTART_MODE=none` reproduces the raw compose behaviour.
3. **A load profile that measured the rate limiter.** core-api throttles every
   route at 100 requests / 60 s by default, so a 10-VU run returned **429 for
   81 %** of evaluations — reported as an "error rate", which reads like an engine
   failure. Runs now track 429s under their own `throttled_429` threshold, and
   the target must be started with `THROTTLE_MAX_REQUESTS` raised.
4. **A stale image can be measured instead of the checkout.** See the
   `--build` warning under [Prerequisites](#prerequisites).
5. **A threshold that did not measure what it claimed.** Smoke asserted `health`
   **p95** over **10 samples**, which k6 computes by interpolating 55 % of the way
   from the 9th sample to the slowest — so the gate was decided by one request.
   CI run `30631939687` failed at `p(95)=276.1 ms` on a tree that was green 20
   minutes earlier: 9 samples fell in 2.72–4.3 ms and one took 498.5 ms, and
   276.1 ms is simply `4.3 + 0.55*(498.5 - 4.3)` — a latency **no request ever
   had**. Smoke now asserts the median (see
   [which statistic each profile asserts at](#which-statistic-each-profile-asserts-the-latency-slo-at)).

   The outlier was **not** cold start, so no warm-up iteration or higher ceiling
   would have fixed it. In that same run `wait-for-target.sh` had already driven a
   full governed evaluation before k6 started; `evaluate_latency` was flat across
   all 10 iterations (min 107.3 ms, max 122.4 ms) — a cold process would show it
   there first, on the path that runs ~107 rules plus OPA-wasm; and core-api
   logged the health handler at `durationMs=0` while k6 measured **498.4 ms of
   `http_req_waiting`** and 0.17 ms of connect. The request was queued behind a
   **blocked event loop**, not slow in the handler. core-api re-scans and
   re-validates the whole ruleset corpus on *every* evaluation — visible as the
   `Skipping non-standard ruleset` / `Phases directory not found` WARN block
   repeating once per iteration in `core-api.log` — and a health probe landing
   during that synchronous work waits it out. **That re-scan is a real defect and
   is not fixed here**; it is why `/health` has a multi-hundred-ms tail at 1 VU.
6. **One threshold miss produced two red steps.** `report-summary.mjs` crashed
   with `ENOENT` on `k6-average.json` whenever smoke failed — the average-load
   profile is gated behind smoke and legitimately never ran. The stack trace then
   displaced the smoke result that explained the failure. The reporter now says
   "did not run" and exits 0; a run's verdict is carried by the dedicated
   `Fail if … crossed a threshold` steps, never by the reporter.

### Against ADR-0011 (fault tolerance)

The drill's recorded behaviour is compared with what the ADR declares, and it
diverges — which is the useful output, not a failure of the drill:

| ADR-0011 declares | Observed |
| --- | --- |
| Distributed circuit breaker (opossum + Redis-shared state) on outbound calls | Not present in core-api, and correctly so: it is a stateless engine that makes no outbound calls (ADR-0101; the orphaned breaker was removed by GT-560). A breaker now exists where the runtime *does* call out — `@beyondnet/evolith-agent-runtime`, process-local state, not Redis-shared. |
| Retry with backoff in adapters | Not exercised by this drill; the callers (k6) do not retry, so the 6.9 % failure window is what an un-retrying client sees. |
| Kong ingress active health-checks shielding backends | No gateway in this topology. Callers hit the dead container directly and got connection failures for ~5.8 s. |
| Multi-node: one node trips, peers absorb | Single replica. There is nothing to absorb the traffic, so a kill is a full outage by construction. |

The honest reading: ADR-0011 describes a multi-replica, gateway-fronted topology
that this local compose stack is not. The drill measures what exists.

## What still requires a live deployment

The k6 profiles and the chaos drill now run — locally and in
`.github/workflows/reliability.yml`. What is still **blocked on GT-448**:

- **Deployment-representative numbers.** Everything above was measured on one
  laptop against a single container. A CI runner will produce different figures
  (the workflow publishes them per run); a real deployment, different again.
- **Prod/staging chaos.** Killing real infrastructure (orchestrator pods, managed
  cache, real broker) must be an explicit, owner-run exercise against the GT-448
  deployment, with its own restart/orchestration policies.
- **Agreed SLOs / RTO.** The encoded thresholds are engineering defaults, not
  org-ratified targets — and the average-load run already breaches them, so they
  need a decision (raise the SLO, or scale the deployment) rather than a silent
  re-baseline.
- **RTO / RPO — not measured, and not measurable here.** `mean_mttr_ms` is a
  restart time on one host. An RTO/RPO needs a real DR restore (backup, restore,
  data-loss window) against real infrastructure. **Do not** copy the MTTR above
  into ADR-0013 as an RTO; it would be the same unquantified-claim problem in a
  new costume.
- **Broker realism.** The topology has no dedicated message broker;
  `kill-broker.sh` targets `redis` by default. Re-point `BROKER_SERVICE` when a
  real broker is introduced.
