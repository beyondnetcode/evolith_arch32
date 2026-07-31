#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CHAOS: kill core-api — the stateless evaluation engine (GT-443).
#
# Injects a hard process kill (SIGKILL, not graceful stop) on the core-api
# container, then measures how long until /health returns 200 again — the
# restart + boot + corpus-load recovery of the single most critical service.
#
# CORRECTION (GT-443, measured 2026-07-30 on Docker 29.4.3): this script used to
# claim that `restart: unless-stopped` brings the container back by itself. It
# does not for a kill issued from OUTSIDE the container — the daemon treats that
# as an operator stop and leaves it `Exited (137)` with `RestartCount=0`. Run as
# written, the script waited out its whole timeout and exited 1. It now restarts
# the service explicitly, which is what a kubelet does with a SIGKILLed
# container; set RESTART_MODE=none to observe the raw compose behaviour instead.
#
# What you learn: MTTR of the evaluation engine after an abrupt crash, and
# whether dependents (tracker-api, agent-runtime) recover on their own once
# core-api is back (they have restart policies + healthchecks too).
#
# Usage:  ./kill-core-api.sh
#         RECOVERY_TIMEOUT=180 ./kill-core-api.sh
# ─────────────────────────────────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
require_compose_up

RECOVERY_TIMEOUT="${RECOVERY_TIMEOUT:-120}"

log "baseline: confirming core-api is healthy before injection"
wait_until_healthy "$CORE_HEALTH_URL" 30 >/dev/null || {
  log "core-api not healthy at baseline — aborting so we don't mismeasure"; exit 1;
}

log "INJECT: SIGKILL core-api (hard crash, not graceful stop)"
dc kill -s SIGKILL core-api

wait_until_down "$CORE_HEALTH_URL" 30 || log "warning: outage not observed at host port (restart may have been instant)"

if [ "${RESTART_MODE:-orchestrator}" = "orchestrator" ]; then
  log "RESTART: starting core-api back up (compose will NOT do it for an external kill)"
  dc start core-api >/dev/null
else
  log "RESTART_MODE=none — measuring the outage, since nobody is going to restart it"
fi

log "MEASURING recovery ..."
if elapsed_ms="$(wait_until_healthy "$CORE_HEALTH_URL" "$RECOVERY_TIMEOUT")"; then
  log "RECOVERED: core-api healthy again after ${elapsed_ms} ms"
  printf '{"scenario":"kill-core-api","recovered":true,"recovery_ms":%s}\n' "$elapsed_ms"
else
  log "FAILED to recover within ${RECOVERY_TIMEOUT}s"
  printf '{"scenario":"kill-core-api","recovered":false,"recovery_ms":null}\n'
  exit 1
fi
