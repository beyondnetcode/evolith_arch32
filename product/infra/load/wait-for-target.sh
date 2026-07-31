#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Wait until the target is not merely UP but actually SERVING GOVERNED VERDICTS
# (GT-443). Used by CI before any k6 or chaos step.
#
# "Healthy" is not the bar. core-api answers /health long before its corpus is
# loaded, so a load run started at first-200 measures cold-start noise and a
# chaos drill would time the wrong milestone. This waits for a real
# POST /api/v1/evaluate success envelope — the same body k6/lib/config.js sends.
#
#   BASE_URL=http://127.0.0.1:3001 EVOLITH_API_KEY=... ./wait-for-target.sh
#   TIMEOUT=180 ./wait-for-target.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
BASE_URL="${BASE_URL%/}"
API_KEY="${EVOLITH_API_KEY:-local-dev-key}"
TIMEOUT="${TIMEOUT:-180}"

read -r -d '' EVAL_BODY <<'JSON' || true
{"evaluationInput":{"files":{"evolith.yaml":"{\"coreRef\":{\"version\":\"1.0.0\",\"path\":\"../evolith\"},\"governance\":{\"version\":\"1.0.0\"},\"product\":{\"name\":\"load-harness-project\",\"type\":\"enterprise-application\"}}","docs/prd.md":"# PRD"}},"phase":"f1","topology":"modular-monolith"}
JSON

log() { printf '[wait-for-target] %s\n' "$*" >&2; }

deadline=$(( $(date +%s) + TIMEOUT ))
last_code="none"
last_body=""
# Which of the two milestones was ever reached. The distinction is the whole
# diagnosis on a timeout: never-healthy means the container is not serving at all
# (it crash-looped, or the port is wrong), whereas healthy-but-no-verdict means the
# process is up and the corpus/policy/key is what is wrong. Reporting only
# "TIMEOUT" conflates them, which is how a crash-looping image read as a slow one
# for three consecutive runs on 2026-07-31 (GT-647).
ever_healthy=no

while :; do
  # `%{http_code}` already prints 000 when the connection fails, and curl also
  # exits non-zero — so a `|| echo 000` fallback CONCATENATES onto it and the
  # timeout line reports `code=000000`. Capture the two separately.
  last_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$BASE_URL/health" 2>/dev/null)" || true
  [ -n "$last_code" ] || last_code="000"
  if [ "$last_code" = "200" ]; then
    ever_healthy=yes
    last_body="$(curl -s --max-time 15 -X POST "$BASE_URL/api/v1/evaluate" \
      -H 'Content-Type: application/json' -H "x-api-key: $API_KEY" \
      -d "$EVAL_BODY" || true)"
    if printf '%s' "$last_body" | grep -q '"success":[[:space:]]*true'; then
      log "target is serving governed verdicts at $BASE_URL"
      exit 0
    fi
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    log "TIMEOUT after ${TIMEOUT}s at $BASE_URL (last /health code=$last_code, ever healthy: $ever_healthy)"
    if [ "$ever_healthy" = no ]; then
      log "  /health never answered 200 — the target never started serving. Check the container logs;"
      log "  a crash-loop looks identical to a slow boot from out here."
    else
      log "  /health answered 200 but POST /api/v1/evaluate never returned success:true."
      log "  last evaluate response (first 500 chars): $(printf '%s' "$last_body" | head -c 500)"
    fi
    exit 1
  fi
  sleep 2
done
