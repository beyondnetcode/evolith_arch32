#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CHAOS: network latency / packet loss injection (GT-443).
#
# Injects added latency (and optional packet loss) on a target container's
# network interface using Pumba (https://github.com/alexei-led/pumba), a Docker
# chaos tool that shells `tc netem` INTO the target's network namespace. We use
# Pumba on purpose: the app images are minimal (no `iproute2`/`tc` inside), so we
# cannot run `tc` in the container directly — Pumba runs as a privileged sidecar
# and needs nothing installed in the target.
#
# This models the real-world failure the gap calls out: not a clean kill, but a
# SLOW dependency — the degraded-network case that healthchecks often miss.
#
# Requires: Pumba available as the `gaiaadm/pumba` image (pulled on first run).
# Nothing is installed on the host or in the app containers.
#
# Usage:
#   ./network-latency.sh                              # 200ms±50ms on core-api for 60s
#   TARGET=core-api DELAY_MS=300 JITTER_MS=100 DURATION=90s ./network-latency.sh
#   TARGET=redis LOSS_PERCENT=10 DURATION=45s ./network-latency.sh   # packet loss on cache
#
# While this runs, drive load from another terminal to see the SLO impact:
#   k6 run -e EVOLITH_API_KEY=local-dev-key ../k6/average-load.js
# ─────────────────────────────────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
require_compose_up

TARGET_SERVICE="${TARGET:-core-api}"
DELAY_MS="${DELAY_MS:-200}"
JITTER_MS="${JITTER_MS:-50}"
DURATION="${DURATION:-60s}"
LOSS_PERCENT="${LOSS_PERCENT:-0}"
PUMBA_IMAGE="${PUMBA_IMAGE:-gaiaadm/pumba:latest}"

# Resolve the actual container name from the compose service.
CONTAINER="$(dc ps -q "$TARGET_SERVICE" | head -1)"
if [ -z "$CONTAINER" ]; then
  log "ERROR: no running container for service '$TARGET_SERVICE'"; exit 1
fi
CONTAINER_NAME="$(docker inspect -f '{{.Name}}' "$CONTAINER" | sed 's#^/##')"

log "TARGET: $TARGET_SERVICE (container: $CONTAINER_NAME)"
log "baseline health before injection:"
wait_until_healthy "$CORE_HEALTH_URL" 30 >/dev/null || log "warning: core-api not healthy at baseline"

# Pumba needs the docker socket to enter the target's netns. It self-removes.
COMMON_PUMBA=(docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  "$PUMBA_IMAGE" netem --duration "$DURATION")

if [ "$LOSS_PERCENT" != "0" ]; then
  log "INJECT: ${LOSS_PERCENT}% packet loss on $CONTAINER_NAME for $DURATION"
  "${COMMON_PUMBA[@]}" loss --percent "$LOSS_PERCENT" "$CONTAINER_NAME"
else
  log "INJECT: +${DELAY_MS}ms (±${JITTER_MS}ms) latency on $CONTAINER_NAME for $DURATION"
  "${COMMON_PUMBA[@]}" delay --time "$DELAY_MS" --jitter "$JITTER_MS" "$CONTAINER_NAME"
fi

log "injection window ended; netem rules auto-cleared by Pumba."
log "confirm the stack settled back to baseline:"
if elapsed_ms="$(wait_until_healthy "$CORE_HEALTH_URL" 60)"; then
  log "healthy ${elapsed_ms} ms after the degraded-network window closed"
fi
