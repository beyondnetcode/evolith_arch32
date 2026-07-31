#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CHAOS UNDER LOAD — kill a dependency MID-RUN and record what clients saw
# (GT-443, criterion 3).
#
# The existing kill-*.sh scripts inject into an IDLE stack, so they time a
# restart but can say nothing about the blast radius: how many in-flight
# requests died, for how long the service was unavailable to callers, and
# whether the system came back on its own. ADR-0011's whole claim is about what
# callers experience during a dependency failure, so the drill has to have
# callers.
#
# Procedure:
#   1. confirm the stack is serving real verdicts,
#   2. start a k6 load run in the background (the callers),
#   3. after WARMUP_SECONDS, SIGKILL the target service mid-run,
#   4. restart it the way an orchestrator would (see below), and time recovery
#      to /health 200 AND to the first governed verdict,
#   5. let k6 finish and report what the callers actually observed.
#
# WHO RESTARTS THE CONTAINER — measured, not assumed. The sibling kill-*.sh
# scripts state that `restart: unless-stopped` brings the service back after a
# SIGKILL. It does not, for a kill issued from OUTSIDE the container. Measured
# on Docker 29.4.3 (2026-07-30): `docker kill` on a container with
# `--restart unless-stopped` leaves it `Exited (137)` with `RestartCount=0`,
# because the daemon treats an external kill as an operator stop; a container
# whose own PID 1 dies is restarted (`RestartCount=2` in the same experiment).
# The first run of this drill consequently sat in a 180 s outage and never
# recovered. A kubelet WOULD restart a SIGKILLed container, so this drill
# performs the restart itself (`RESTART_MODE=orchestrator`, the default) to model
# the deployed topology. `RESTART_MODE=none` reproduces the raw compose
# behaviour — useful, but it measures an outage, not a recovery.
#
# Usage:
#   COMPOSE_FILE=../docker-compose.evolith.yml ./kill-under-load.sh
#   TARGET=redis WARMUP_SECONDS=20 ./kill-under-load.sh
# ─────────────────────────────────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
require_compose_up

TARGET="${TARGET:-core-api}"
RESTART_MODE="${RESTART_MODE:-orchestrator}"
WARMUP_SECONDS="${WARMUP_SECONDS:-15}"
RECOVERY_TIMEOUT="${RECOVERY_TIMEOUT:-180}"
PLATEAU_VUS="${PLATEAU_VUS:-5}"
PLATEAU_DURATION="${PLATEAU_DURATION:-60s}"
RAMP_DURATION="${RAMP_DURATION:-10s}"
API_KEY="${EVOLITH_API_KEY:-local-dev-key}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}}"
SUMMARY_JSON="$OUT_DIR/chaos-under-load-k6.json"
K6_LOG="$OUT_DIR/chaos-under-load-k6.log"

LOAD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v k6 >/dev/null 2>&1 || { log "ERROR: k6 not installed — this drill needs callers."; exit 1; }

read -r -d '' EVAL_BODY <<'JSON' || true
{"evaluationInput":{"files":{"evolith.yaml":"{\"coreRef\":{\"version\":\"1.0.0\",\"path\":\"../evolith\"},\"governance\":{\"version\":\"1.0.0\"},\"product\":{\"name\":\"chaos-probe\",\"type\":\"enterprise-application\"}}","docs/prd.md":"# PRD"}},"phase":"f1","topology":"modular-monolith"}
JSON

first_verdict_ms() { # <t0_ms> <timeout_s>
  local start_ms="$1" timeout_s="$2" deadline body
  deadline=$(( start_ms + timeout_s * 1000 ))
  while :; do
    body="$(curl -s --max-time 5 -H 'Content-Type: application/json' -H "x-api-key: $API_KEY" \
      -X POST "$BASE_URL/api/v1/evaluate" -d "$EVAL_BODY" 2>/dev/null || true)"
    printf '%s' "$body" | grep -q '"success":[[:space:]]*true' && { echo $(( $(now_ms) - start_ms )); return 0; }
    [ "$(now_ms)" -ge "$deadline" ] && return 1
    sleep 0.5
  done
}

log "=== CHAOS UNDER LOAD — target=$TARGET, compose=$COMPOSE_FILE ==="

log "baseline: waiting for a real governed verdict before injecting"
first_verdict_ms "$(now_ms)" 120 >/dev/null || { log "no baseline verdict — aborting so we don't mismeasure"; exit 1; }

log "starting the callers (k6: ${PLATEAU_VUS} VUs, plateau ${PLATEAU_DURATION})"
EVOLITH_API_KEY="$API_KEY" BASE_URL="$BASE_URL" \
  k6 run --summary-export="$SUMMARY_JSON" \
    -e RAMP_DURATION="$RAMP_DURATION" \
    -e PLATEAU_VUS="$PLATEAU_VUS" \
    -e PLATEAU_DURATION="$PLATEAU_DURATION" \
    "$LOAD_DIR/k6/average-load.js" > "$K6_LOG" 2>&1 &
K6_PID=$!

sleep "$WARMUP_SECONDS"

log "INJECT: SIGKILL '$TARGET' while the load is running"
t_kill="$(now_ms)"
dc kill -s SIGKILL "$TARGET"

if wait_until_down "$BASE_URL/health" 30 >/dev/null; then
  t_outage_visible=$(( $(now_ms) - t_kill ))
else
  t_outage_visible=null
  log "note: the host port never stopped answering — restart may have been faster than the poll"
fi

if [ "$RESTART_MODE" = "orchestrator" ]; then
  log "RESTART: bringing '$TARGET' back (compose does NOT self-restart an externally killed container — a kubelet would)"
  dc start "$TARGET" >/dev/null
else
  log "RESTART_MODE=$RESTART_MODE — nobody restarts the service; this measures the outage, not a recovery"
fi

log "measuring recovery"
if t_health_raw="$(wait_until_healthy "$BASE_URL/health" "$RECOVERY_TIMEOUT")"; then
  t_health=$(( $(now_ms) - t_kill ))
else
  t_health=null
fi

if t_verdict_raw="$(first_verdict_ms "$t_kill" "$RECOVERY_TIMEOUT")"; then
  t_verdict="$t_verdict_raw"
else
  t_verdict=null
fi

log "waiting for the load run to finish"
k6_exit=0
wait "$K6_PID" || k6_exit=$?

# What the CALLERS observed — the number ADR-0011 is really about.
read -r failed_reqs total_reqs err_rate <<EOF
$(node -e '
  const fs = require("fs");
  try {
    const s = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const m = s.metrics || {};
    const total = (m.http_reqs && m.http_reqs.count) || 0;
    const rate = (m.http_req_failed && m.http_req_failed.value) || 0;
    console.log(Math.round(total * rate), total, rate.toFixed(4));
  } catch (e) { console.log("null null null"); }
' "$SUMMARY_JSON")
EOF

log "=== RESULT ==="
log "outage visible to callers after ${t_outage_visible} ms; /health back after ${t_health} ms; first verdict after ${t_verdict} ms"
log "callers saw ${failed_reqs}/${total_reqs} failed requests (rate ${err_rate}); k6 exit ${k6_exit}"
log "k6 detail: $K6_LOG   summary: $SUMMARY_JSON"

printf '{"scenario":"kill-under-load","target":"%s","t_outage_visible_ms":%s,"t_health_ms":%s,"t_first_verdict_ms":%s,"failed_requests":%s,"total_requests":%s,"error_rate":%s,"k6_exit":%s}\n' \
  "$TARGET" "$t_outage_visible" "$t_health" "$t_verdict" "$failed_reqs" "$total_reqs" "$err_rate" "$k6_exit"

# The drill FAILS only if the system never came back — a load-threshold breach
# during a deliberate outage is the expected observation, not a test failure.
[ "$t_verdict" != "null" ]
