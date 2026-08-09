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
#   STUB_ARGV_OUT GT-651: when set, every argument is written there one per
#                 line, BEFORE any parsing. The action turns one YAML string
#                 into a repeatable `--select` flag, and the only way to know
#                 that splitting is right is to look at the argv the CLI would
#                 actually receive. Discarding the args, as this stub did,
#                 makes an assertion about them impossible.
set -uo pipefail

if [ -n "${STUB_ARGV_OUT:-}" ]; then
  : > "${STUB_ARGV_OUT}"
  for ARG in "$@"; do printf '%s\n' "${ARG}" >> "${STUB_ARGV_OUT}"; done
fi

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
