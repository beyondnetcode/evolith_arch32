#!/bin/bash
# Evolith CLI Bash Completion
# Install: source this file or add to ~/.bashrc
# Also: evolith-cli completion --install to auto-install

_smart_cli_completions() {
    local cur prev words cword
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Top-level commands
    COMMANDS="validate adr standards agents init mcp sdlc docs upgrade config completion help"

    # Subcommands for each command
    declare -A SUBCOMMANDS
    SUBCOMMANDS[validate]="--format --output --satellite --core --ruleset"
    SUBCOMMANDS[adr]="create list get update matrix"
    SUBCOMMANDS[standards]="init list get validate export"
    SUBCOMMANDS[agents]="install remove list validate upgrade menu"
    SUBCOMMANDS[mcp]="serve version"
    SUBCOMMANDS[sdlc]="handoff status list phases"
    SUBCOMMANDS[config]="get set list delete"
    SUBCOMMANDS[init]="--runtime --template --path"
    SUBCOMMANDS[docs]="validate serve --serve"

    # Global options
    GLOBAL_OPTS="--help --version --verbose --debug --json --quiet"

    # If we're completing a command (cur is a command name)
    if [[ $cword -eq 1 ]]; then
        COMPREPLY=($(compgen -W "$COMMANDS" -- "$cur"))
        return 0
    fi

    # If prev is a command, show its subcommands/options
    if [[ -n "${SUBCOMMANDS[$prev]}" ]]; then
        COMPREPLY=($(compgen -W "${SUBCOMMANDS[$prev]}" -- "$cur"))
        return 0
    fi

    # Check if we're past the command word
    local cmd=""
    for word in "${COMP_WORDS[@]:1}"; do
        if [[ " ${COMMANDS} " == *" $word "* ]] && [[ -z "$cmd" ]]; then
            cmd="$word"
        fi
    done

    # Show options for the current command
    if [[ -n "$cmd" ]] && [[ -n "${SUBCOMMANDS[$cmd]}" ]]; then
        COMPREPLY=($(compgen -W "${SUBCOMMANDS[$cmd]}" -- "$cur"))
    else
        # Show global options
        COMPREPLY=($(compgen -W "$GLOBAL_OPTS" -- "$cur"))
    fi

    return 0
}

complete -F _smart_cli_completions evolith-cli

# Auto-install function
_smart_cli_install() {
    local shell="$1"
    if [[ "$shell" == "bash" ]]; then
        local profile="${HOME}/.bashrc"
        local line="source $(pwd)/shell/completion.bash"
        if ! grep -q "$line" "$profile" 2>/dev/null; then
            echo "Adding completion to $profile"
            echo "$line" >> "$profile"
        fi
        echo "Bash completion installed. Reload shell or run: source $profile"
    elif [[ "$shell" == "zsh" ]]; then
        local profile="${HOME}/.zshrc"
        local line="source $(pwd)/shell/completion.zsh"
        if ! grep -q "$line" "$profile" 2>/dev/null; then
            echo "Adding completion to $profile"
            echo "$line" >> "$profile"
        fi
        echo "Zsh completion installed. Reload shell or run: source $profile"
    else
        echo "Usage: evolith-cli completion --install [bash|zsh]"
    fi
}