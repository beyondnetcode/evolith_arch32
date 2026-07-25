#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CHAOS: kill the message broker (GT-443).
#
# In the current full-stack topology (docker-compose.fullstack.yml) there is no
# dedicated message-broker service — redis is the shared cache/broker and the
# Tracker store is tracker-postgres. This script targets whatever service is
# named by $BROKER_SERVICE (default: redis) so it stays correct as the topology
# grows a real broker (e.g. rabbitmq / kafka / nats) without editing the harness.
#
# When you introduce a dedicated broker, run:
#     BROKER_SERVICE=rabbitmq ./kill-broker.sh
#
# It kills the broker, holds the outage, restarts it, and times how long the
# stack takes to serve healthy again. Also records how core-api behaved while the
# broker was down (a stateless evaluation should not depend on the broker at all).
#
# Usage:  ./kill-broker.sh
#         BROKER_SERVICE=rabbitmq OUTAGE_SECONDS=20 ./kill-broker.sh
# ─────────────────────────────────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
require_compose_up

OUTAGE_SECONDS="${OUTAGE_SECONDS:-15}"
RECOVERY_TIMEOUT="${RECOVERY_TIMEOUT:-90}"

# Guard: make sure the named broker service actually exists in the compose file.
if ! dc config --services | grep -qx "$BROKER_SERVICE"; then
  log "ERROR: service '$BROKER_SERVICE' is not defined in $COMPOSE_FILE."
  log "Set BROKER_SERVICE to a real service (compose services: $(dc config --services | tr '\n' ' '))"
  exit 1
fi

log "baseline: core-api healthy?"
wait_until_healthy "$CORE_HEALTH_URL" 30 >/dev/null || { log "not healthy at baseline — abort"; exit 1; }

log "INJECT: SIGKILL broker service '$BROKER_SERVICE' for ${OUTAGE_SECONDS}s"
dc kill -s SIGKILL "$BROKER_SERVICE"
sleep "$OUTAGE_SECONDS"

log "RESTORE: starting '$BROKER_SERVICE'"
dc start "$BROKER_SERVICE" || dc up -d "$BROKER_SERVICE"

log "MEASURING recovery ..."
if elapsed_ms="$(wait_until_healthy "$CORE_HEALTH_URL" "$RECOVERY_TIMEOUT")"; then
  log "RECOVERED: stack serving 200s again ${elapsed_ms} ms after restore"
  printf '{"scenario":"kill-broker","broker":"%s","outage_s":%s,"recovery_ms":%s}\n' \
    "$BROKER_SERVICE" "$OUTAGE_SECONDS" "$elapsed_ms"
else
  log "FAILED to recover within ${RECOVERY_TIMEOUT}s"
  printf '{"scenario":"kill-broker","broker":"%s","recovered":false}\n' "$BROKER_SERVICE"
  exit 1
fi
