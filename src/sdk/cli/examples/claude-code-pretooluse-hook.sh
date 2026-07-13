#!/usr/bin/env bash
# Evolith edit-time enforcement — Claude Code PreToolUse hook wrapper (GT-526).
#
# Claude Code invokes this script BEFORE a Write/Edit/MultiEdit tool runs, piping the
# PreToolUse JSON payload on stdin. The wrapper forwards it to the vendor-neutral
# `evolith enforce edit` gate, which evaluates the edited file's imports against the
# compiled architecture boundary contract and:
#   - exits 0  → the edit conforms; Claude Code proceeds.
#   - exits 2  → the edit crosses an `error` boundary; Claude Code BLOCKS the write and
#                feeds the printed Violations (on stderr) back to the model to self-correct.
#
# PR/CI (GT-518) remains the authoritative gate; this is the cheap in-flight guard.
#
# Point --rules at your compiled boundary contract (produced by the C4/Structurizr compiler,
# GT-528, or hand-authored — see examples/edit-hook-boundary-rules.json).

set -euo pipefail

RULES="${EVOLITH_BOUNDARY_RULES:-.evolith/boundary-rules.json}"

exec evolith-cli enforce edit --rules "${RULES}"
