#!/usr/bin/env bash
# Stand-in for `evolith-cli` used by test/action-step.test.mjs.
#
# It behaves like `evolith validate --format json --output <path>`: it writes a
# recorded ADR-0073 envelope to the path given by --output and exits with the
# verdict exit code. Both are supplied by the test through the environment:
#
#   STUB_FIXTURE  absolute path to the envelope to emit (empty = write nothing,
#                 which reproduces a run that never produced a report)
#   STUB_EXIT     exit code to return, per the GT-580 taxonomy:
#                 0 pass · 1 tool failure · 2 blocked verdict · 3 invalid input
set -uo pipefail

OUTPUT=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output)
      OUTPUT="${2:-}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [ -n "${STUB_FIXTURE:-}" ] && [ -n "${OUTPUT}" ]; then
  cp "${STUB_FIXTURE}" "${OUTPUT}"
fi

exit "${STUB_EXIT:-0}"
