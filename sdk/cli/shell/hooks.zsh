#!/bin/zsh
# Evolith CLI Shell Hooks for Zsh
# Source this file in your ~/.zshrc or run: source evolith-hooks.zsh

# Context/Status functions for shell integration

evolith_status() {
  local cwd="${PWD}"
  if [ -f "$cwd/evolith.yaml" ]; then
    echo "evolith:project"
  else
    echo "evolith:no-project"
  fi
}

evolith_phase() {
  local cwd="${PWD}"
  if [ -f "$cwd/evolith.yaml" ]; then
    local phase=$(grep -E "^phases:" -A 5 "$cwd/evolith.yaml" 2>/dev/null | head -1 || echo "unknown")
    echo "${phase:-unknown}"
  else
    echo "none"
  fi
}

evolith_gate() {
  local cwd="${PWD}"
  if [ -f "$cwd/.evolith/gate-status.json" ]; then
    cat "$cwd/.evolith/gate-status.json" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown"
  else
    echo "not-run"
  fi
}

evolith_validate() {
  local cwd="${PWD}"
  if [ -f "$cwd/.evolith/last-validate.json" ]; then
    cat "$cwd/.evolith/last-validate.json" 2>/dev/null | grep -o '"passed":[true,false]' | cut -d':' -f2 || echo "unknown"
  else
    echo "not-run"
  fi
}

evolith_prompt() {
  local status=$(evolith_status)
  if [ "$status" = "evolith:project" ]; then
    local phase=$(evolith_phase)
    local gate=$(evolith_gate)
    echo "[evolith:$phase:$gate]"
  fi
}

# Hook for directory change
evolith_chpwd() {
  :
}

# Register chpwd hook
if [[ "$(whence -f chpwd)" ]]; then
  functions[chpwd]+=evolith_chpwd
fi

# Aliases
alias es=evolith_status
alias ep=evolith_phase
alias eg=evolith_gate
alias ev=evolith_validate
alias epr=evolith_prompt