#!/usr/bin/env bash
#
# cleanup-adr-stubs.sh — One-time removal of orphaned SUPERSEDED ADR ruleset
# stubs left by earlier iterations of the ADR ruleset generator.
#
# Why this exists: the generator cannot delete files in some sandboxed
# environments, so stale outputs (whose source ADR slug changed) were rewritten
# as schema-valid "SUPERSEDED" stubs with version "0.0.0". Active rulesets use
# version "1.0.0" and are NOT touched by this script.
#
# Safe to run multiple times. After running, regenerate nothing — just verify:
#   node .harness/scripts/generate-adr-rulesets.mjs --check
#
# Usage:
#   bash .harness/scripts/cleanup-adr-stubs.sh           # remove via `git rm`
#   bash .harness/scripts/cleanup-adr-stubs.sh --dry-run # list only, no changes
#
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

GEN_DIR="rulesets/adr/generated"
DRY_RUN="${1:-}"

# Collect every stub whose JSON declares version "0.0.0".
mapfile -t stubs < <(grep -l '"version": *"0.0.0"' "${GEN_DIR}"/*.rules.json 2>/dev/null || true)

if [ "${#stubs[@]}" -eq 0 ]; then
  echo "No SUPERSEDED stubs (version 0.0.0) found in ${GEN_DIR}. Nothing to do."
  exit 0
fi

echo "Found ${#stubs[@]} orphaned SUPERSEDED stub(s):"
printf '  %s\n' "${stubs[@]}"

if [ "${DRY_RUN}" = "--dry-run" ]; then
  echo ""
  echo "[dry-run] No files removed. Re-run without --dry-run to delete via git."
  exit 0
fi

echo ""
echo "Removing with git rm ..."
git rm -q -- "${stubs[@]}"

echo "Removed ${#stubs[@]} stub(s)."
echo ""
echo "Next steps:"
echo "  1. node .harness/scripts/generate-adr-rulesets.mjs --check   # should pass, 0 orphans"
echo "  2. node .harness/scripts/validate-rulesets.mjs               # should be 115 valid"
echo "  3. git commit -m 'chore(adr): remove orphaned SUPERSEDED ruleset stubs'"
