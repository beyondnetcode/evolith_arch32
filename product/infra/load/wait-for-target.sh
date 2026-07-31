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

while :; do
  last_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$BASE_URL/health" || echo 000)"
  if [ "$last_code" = "200" ]; then
    body="$(curl -s --max-time 15 -X POST "$BASE_URL/api/v1/evaluate" \
      -H 'Content-Type: application/json' -H "x-api-key: $API_KEY" \
      -d "$EVAL_BODY" || true)"
    if printf '%s' "$body" | grep -q '"success":[[:space:]]*true'; then
      log "target is serving governed verdicts at $BASE_URL"
      exit 0
    fi
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    log "TIMEOUT after ${TIMEOUT}s (last /health code=$last_code)"
    exit 1
  fi
  sleep 2
done
