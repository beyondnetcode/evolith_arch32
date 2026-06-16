#!/bin/fish
# Evolith CLI Shell Hooks for Fish
# Place in ~/.config/fish/functions/ or run: source evolith-hooks.fish

# Context/Status functions for shell integration

function evolith_status
  set -l cwd (pwd)
  if test -f "$cwd/evolith.yaml"
    echo "evolith:project"
  else
    echo "evolith:no-project"
  end
end

function evolith_phase
  set -l cwd (pwd)
  if test -f "$cwd/evolith.yaml"
    echo "phase-1"
  else
    echo "none"
  end
end

function evolith_gate
  set -l cwd (pwd)
  if test -f "$cwd/.evolith/gate-status.json"
    echo "passed"
  else
    echo "not-run"
  end
end

function evolith_validate
  set -l cwd (pwd)
  if test -f "$cwd/.evolith/last-validate.json"
    echo "true"
  else
    echo "not-run"
  end
end

function evolith_prompt
  set -l status (evolith_status)
  if test "$status" = "evolith:project"
    set -l phase (evolith_phase)
    set -l gate (evolith_gate)
    echo "[evolith:$phase:$gate]"
  end
end

# Aliases for quick access
alias es evolith_status
alias ep evolith_phase
alias eg evolith_gate
alias ev evolith_validate
alias epr evolith_prompt