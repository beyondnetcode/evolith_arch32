#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RECOVERY-TIME (MTTR) after a TOTAL OUTAGE — the measurement GT-443 says has
# NEVER been made ("recovery time after a total outage has never been timed").
#
# This is the headline procedure of the harness. It:
#   1. establishes a healthy baseline,
#   2. takes the ENTIRE stack down at once (`docker compose stop`) — a full
#      outage, every service, the way a host/AZ loss or a bad deploy would,
#   3. brings the whole stack back (`docker compose up -d`) and starts the clock,
#   4. times each recovery milestone until the governed evaluation path is
#      serving real verdicts again:
#         t_core_health   — core-api /health returns 200
#         t_core_ready    — core-api /health/ready returns 200 (corpus loaded)
#         t_first_verdict — POST /api/v1/evaluate returns a success envelope
#      t_first_verdict is the true MTTR: the moment the system is doing its job,
#      not merely "process up".
#   5. repeats N times (default 3) and reports per-run + mean recovery times.
#
# Run N trials for a mean (single measurements are noise):
#   ./recovery-time.sh
#   RUNS=5 RECOVERY_TIMEOUT=240 ./recovery-time.sh
#
# Output: a JSON line per run + a final summary line with the MEAN MTTR — the
# number GT-443 wants on record. Capture it:
#   ./recovery-time.sh | tee recovery-$(date +%Y%m%d-%H%M).log
# ─────────────────────────────────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

RUNS="${RUNS:-3}"
RECOVERY_TIMEOUT="${RECOVERY_TIMEOUT:-240}"
# Optional subset of compose services to bring back (space-separated). Empty =
# the whole project. Needed wherever the compose file also defines services this
# drill does not exercise (e.g. the MCP image in the engine-only topology): an
# unqualified `up -d` would try to build them and the run would die on the way
# back up, not on the outage it is meant to measure.
SERVICES="${SERVICES:-}"
API_KEY="${EVOLITH_API_KEY:-local-dev-key}"
EVALUATE_URL="${EVALUATE_URL:-http://localhost:3001/api/v1/evaluate}"

# Minimal real governed-evaluation body (inline path — hermetic, no workspaceRef).
# Mirrors k6/lib/config.js so both surfaces exercise the same verdict path.
read -r -d '' EVAL_BODY <<'JSON' || true
{"evaluationInput":{"files":{"evolith.yaml":"{\"coreRef\":{\"version\":\"1.0.0\",\"path\":\"../evolith\"},\"governance\":{\"version\":\"1.0.0\"},\"product\":{\"name\":\"recovery-probe\",\"type\":\"enterprise-application\"}}","docs/prd.md":"# PRD"}},"phase":"f1","topology":"modular-monolith"}
JSON

# Poll POST /api/v1/evaluate until it returns a { success: true } envelope.
# Prints elapsed ms from a caller-supplied start; returns non-zero on timeout.
wait_until_first_verdict() {
  local start_ms="$1" timeout_s="$2"
  local deadline=$(( start_ms + timeout_s * 1000 ))
  local body
  while :; do
    body="$(curl -s --max-time 4 -H 'Content-Type: application/json' \
      -H "x-api-key: $API_KEY" -X POST "$EVALUATE_URL" -d "$EVAL_BODY" 2>/dev/null || true)"
    if printf '%s' "$body" | grep -q '"success":[[:space:]]*true'; then
      echo $(( $(now_ms) - start_ms )); return 0
    fi
    [ "$(now_ms)" -ge "$deadline" ] && return 1
    sleep 0.5
  done
}

total_verdict_ms=0
recovered_runs=0

log "=== TOTAL-OUTAGE RECOVERY (MTTR) — $RUNS run(s) against $COMPOSE_FILE ==="

for i in $(seq 1 "$RUNS"); do
  log "--- run $i/$RUNS ---"

  log "baseline: waiting for a healthy stack + a real verdict"
  dc up -d $SERVICES >/dev/null 2>&1 || true
  wait_until_healthy "$CORE_HEALTH_URL" 120 >/dev/null || { log "could not reach healthy baseline — abort"; exit 1; }
  wait_until_first_verdict "$(now_ms)" 60 >/dev/null || { log "baseline verdict path not working — abort"; exit 1; }

  log "INJECT: TOTAL OUTAGE — stopping the ENTIRE stack"
  dc stop >/dev/null
  wait_until_down "$CORE_HEALTH_URL" 30 || log "warning: host port still answering after stop"

  log "RESTORE: bringing the whole stack back up — starting the clock NOW"
  t0="$(now_ms)"
  dc up -d $SERVICES >/dev/null

  # Milestone 1: process liveness.
  t_health="$(wait_until_healthy "$CORE_HEALTH_URL" "$RECOVERY_TIMEOUT" && :)" \
    || { log "core-api /health never recovered"; printf '{"run":%s,"recovered":false}\n' "$i"; continue; }
  # Recompute against the shared t0 (wait_until_healthy measured from its own start).
  t_health=$(( $(now_ms) - t0 ))

  # Milestone 2: readiness (corpus loaded) — best-effort, don't fail the run on it.
  if curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$CORE_READY_URL" | grep -q 200; then
    t_ready=$(( $(now_ms) - t0 ))
  else
    # brief poll for readiness
    if wait_until_healthy "$CORE_READY_URL" 30 >/dev/null; then t_ready=$(( $(now_ms) - t0 )); else t_ready=null; fi
  fi

  # Milestone 3: FIRST REAL VERDICT — this is the MTTR of record.
  if t_verdict="$(wait_until_first_verdict "$t0" "$RECOVERY_TIMEOUT")"; then
    log "run $i RECOVERED: health=${t_health}ms ready=${t_ready}ms first_verdict=${t_verdict}ms"
    printf '{"run":%s,"recovered":true,"t_core_health_ms":%s,"t_core_ready_ms":%s,"t_first_verdict_ms":%s}\n' \
      "$i" "$t_health" "$t_ready" "$t_verdict"
    total_verdict_ms=$(( total_verdict_ms + t_verdict ))
    recovered_runs=$(( recovered_runs + 1 ))
  else
    log "run $i: health recovered but no verdict within ${RECOVERY_TIMEOUT}s"
    printf '{"run":%s,"recovered":false,"t_core_health_ms":%s}\n' "$i" "$t_health"
  fi
done

log "=== SUMMARY ==="
if [ "$recovered_runs" -gt 0 ]; then
  mean=$(( total_verdict_ms / recovered_runs ))
  log "MEAN TIME TO RECOVERY (first governed verdict): ${mean} ms across ${recovered_runs}/${RUNS} run(s)"
  printf '{"summary":true,"runs":%s,"recovered_runs":%s,"mean_mttr_ms":%s}\n' "$RUNS" "$recovered_runs" "$mean"
else
  log "NO run recovered a verdict — this is itself a finding (record it)."
  printf '{"summary":true,"runs":%s,"recovered_runs":0,"mean_mttr_ms":null}\n' "$RUNS"
  exit 1
fi
