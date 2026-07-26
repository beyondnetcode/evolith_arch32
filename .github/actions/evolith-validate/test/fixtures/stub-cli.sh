#!/usr/bin/env bash
# Stand-in for `evolith-cli` used by test/action-step.test.mjs.
#
# It behaves like `evolith validate --format json --output <path>`: it writes a
# recorded ADR-0073 envelope to the path given by --output and exits with the
# verdict exit code. Both are supplied by the test through the environment:
#
#   STUB_FIXTURE  absolute path to the envelope to emit (empty = write nothing,
#                 which reproduces a run that never produced a report)
#   STUB_EXIT     exit code to return (1 = failed governance verdict)
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
