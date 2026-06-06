#!/bin/zsh
# Evolith CLI Zsh Completion
# Install: source this file or add to ~/.zshrc
# Also: smart-cli completion --install to auto-install

_smart_cli() {
    local -a commands
    commands=(
        'validate:Validate repository against Evolith standards'
        'adr:Manage Architecture Decision Records'
        'standards:Manage governance standards'
        'agents:Install and manage Evolith agents'
        'init:Initialize a new satellite repository'
        'mcp:Start MCP server for AI integration'
        'sdlc:Manage SDLC phase transitions'
        'docs:Documentation tools'
        'config:Manage configuration'
        'upgrade:Upgrade Evolith CLI'
        'completion:Generate shell completions'
        'help:Show help for commands'
    )

    local -a validate_opts
    validate_opts=(
        '--format:Output format (json, table, yaml)'
        '--output:Output file path'
        '--satellite:Path to satellite repository'
        '--core:Path to Evolith Core'
        '--ruleset:Validate specific ruleset'
        '--help:Show help'
        '--version:Show version'
        '--verbose:Verbose output'
    )

    local -a adr_cmds
    adr_cmds=('create' 'list' 'get' 'update' 'matrix')

    local -a standards_cmds
    standards_cmds=('init' 'list' 'get' 'validate' 'export')

    local -a agents_cmds
    agents_cmds=('install' 'remove' 'list' 'validate' 'upgrade' 'menu')

    local -a mcp_cmds
    mcp_cmds=('serve' 'version')

    local -a sdlc_cmds
    sdlc_cmds=('handoff' 'status' 'list' 'phases')

    local -a config_cmds
    config_cmds=('get' 'set' 'list' 'delete')

    _describe 'commands' commands
    _describe 'validate options' validate_opts

    case "${words[1]}" in
        validate)
            _describe 'validate options' validate_opts
            ;;
        adr)
            _describe 'adr commands' adr_cmds
            ;;
        standards)
            _describe 'standards commands' standards_cmds
            ;;
        agents)
            _describe 'agents commands' agents_cmds
            ;;
        mcp)
            _describe 'mcp commands' mcp_cmds
            ;;
        sdlc)
            _describe 'sdlc commands' sdlc_cmds
            ;;
        config)
            _describe 'config commands' config_cmds
            ;;
    esac

    return 0
}

compdef _smart_cli smart-cli