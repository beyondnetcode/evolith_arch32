#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers for the Evolith chaos + recovery-time harness (GT-443).
#
# Topology comes from product/infra/docker-compose.fullstack.yml. Compose service
# names (NOT container ids) are used everywhere so these scripts survive rebuilds.
#
# NOTHING here runs against a remote/prod target: every command is scoped to a
# local `docker compose` project via -f "$COMPOSE_FILE". If COMPOSE_FILE points
# somewhere else, that is the operator's explicit choice.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Resolve repo-relative paths regardless of where the script is invoked from.
CHAOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$(cd "$CHAOS_DIR/../.." && pwd)"

# The compose project under test. Default = the full-stack local bring-up.
export COMPOSE_FILE="${COMPOSE_FILE:-$INFRA_DIR/docker-compose.fullstack.yml}"

# Host-mapped core-api health URL (docker-compose maps 3001->3000). @Public().
export CORE_HEALTH_URL="${CORE_HEALTH_URL:-http://localhost:3001/health}"
export CORE_READY_URL="${CORE_READY_URL:-http://localhost:3001/health/ready}"

# The service that owns the message broker / cache. In the full-stack topology
# the cache/broker is redis; the Tracker store is tracker-postgres. Override
# BROKER_SERVICE when the deployment under test uses a dedicated broker service.
export BROKER_SERVICE="${BROKER_SERVICE:-redis}"

dc() { docker compose -f "$COMPOSE_FILE" "$@"; }

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

# Millisecond wall clock (portable across macOS bash 3.2 and Linux).
now_ms() { python3 -c 'import time; print(int(time.time()*1000))'; }

# Poll a URL until it returns HTTP 200 (recovered) or the deadline passes.
# Prints the elapsed milliseconds to stdout; returns non-zero on timeout.
#   wait_until_healthy <url> <timeout_seconds> [poll_interval_seconds]
wait_until_healthy() {
  local url="$1" timeout_s="${2:-120}" interval="${3:-0.5}"
  local start deadline code elapsed
  start="$(now_ms)"
  deadline=$(( start + timeout_s * 1000 ))
  while :; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$url" || echo 000)"
    if [ "$code" = "200" ]; then
      elapsed=$(( $(now_ms) - start ))
      echo "$elapsed"
      return 0
    fi
    if [ "$(now_ms)" -ge "$deadline" ]; then
      log "TIMEOUT: $url never returned 200 within ${timeout_s}s (last code=$code)"
      return 1
    fi
    sleep "$interval"
  done
}

# Poll until a URL STOPS returning 200 (i.e. the outage has taken effect).
#   wait_until_down <url> <timeout_seconds> [poll_interval_seconds]
wait_until_down() {
  local url="$1" timeout_s="${2:-30}" interval="${3:-0.2}"
  local start deadline code
  start="$(now_ms)"
  deadline=$(( start + timeout_s * 1000 ))
  while :; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$url" || echo 000)"
    [ "$code" != "200" ] && { log "outage confirmed at $url (code=$code)"; return 0; }
    [ "$(now_ms)" -ge "$deadline" ] && { log "service still healthy after ${timeout_s}s"; return 1; }
    sleep "$interval"
  done
}

require_compose_up() {
  if ! dc ps --status running --services 2>/dev/null | grep -q .; then
    log "ERROR: no running services for $COMPOSE_FILE."
    log "Bring the stack up first:  (cd $INFRA_DIR && EVOLITH_API_KEY=local-dev-key docker compose -f $(basename "$COMPOSE_FILE") up -d)"
    exit 1
  fi
}
