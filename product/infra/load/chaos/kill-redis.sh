#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CHAOS: kill redis — the shared cache dependency (GT-443).
#
# core-api declares `depends_on: redis (service_healthy)` at startup and uses
# REDIS_URL at runtime. This scenario answers a specific resilience question:
# when the cache dies UNDER a running core-api, does the engine degrade
# gracefully (serve evaluations from source, just slower / cache-miss) or does it
# hard-fail? A stateless evaluation engine SHOULD survive a cache outage.
#
# Procedure:
#   1. confirm baseline health,
#   2. probe core-api continuously so we observe behaviour DURING the outage,
#      not just at its edges,
#   3. kill redis, hold the outage, then restart it,
#   4. measure time for the stack to be serving 200s again and count how many
#      probes failed while redis was down.
#
# Usage:  ./kill-redis.sh
#         OUTAGE_SECONDS=20 ./kill-redis.sh
# ─────────────────────────────────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
require_compose_up

OUTAGE_SECONDS="${OUTAGE_SECONDS:-15}"
RECOVERY_TIMEOUT="${RECOVERY_TIMEOUT:-90}"

log "baseline: core-api healthy?"
wait_until_healthy "$CORE_HEALTH_URL" 30 >/dev/null || { log "not healthy at baseline — abort"; exit 1; }

# Probe core-api continuously during the outage and count non-200s.
PROBE_LOG="$(mktemp)"
(
  end=$(( $(now_ms) + (OUTAGE_SECONDS + 5) * 1000 ))
  while [ "$(now_ms)" -lt "$end" ]; do
    curl -s -o /dev/null -w '%{http_code}\n' --max-time 2 "$CORE_HEALTH_URL" >> "$PROBE_LOG" || echo 000 >> "$PROBE_LOG"
    sleep 0.5
  done
) &
PROBE_PID=$!

log "INJECT: stop redis for ${OUTAGE_SECONDS}s (SIGKILL)"
dc kill -s SIGKILL redis
sleep "$OUTAGE_SECONDS"

log "RESTORE: starting redis again"
dc start redis || dc up -d redis

log "MEASURING redis recovery ..."
redis_ms="$(wait_until_healthy "$CORE_HEALTH_URL" "$RECOVERY_TIMEOUT" || echo -1)"

wait "$PROBE_PID" 2>/dev/null || true
total="$(wc -l < "$PROBE_LOG" | tr -d ' ')"
non200="$(grep -cv '^200$' "$PROBE_LOG" || true)"
rm -f "$PROBE_LOG"

log "during-outage core-api probes: ${non200}/${total} were non-200"
log "NOTE: a resilient stateless engine should keep serving 200s even with redis down."
printf '{"scenario":"kill-redis","outage_s":%s,"core_api_non200_during_outage":%s,"total_probes":%s,"recovery_ms":%s}\n' \
  "$OUTAGE_SECONDS" "${non200:-0}" "${total:-0}" "$redis_ms"
