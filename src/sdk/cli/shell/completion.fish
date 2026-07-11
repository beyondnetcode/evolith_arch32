#!/bin/fish
# Evolith CLI Fish Completion
# Install: cp this file to ~/.config/fish/completions/smart-cli.fish

complete -c evolith-cli -f

# Top-level commands
complete -c evolith-cli -a 'validate' -d 'Validate repository'
complete -c evolith-cli -a 'adr' -d 'Manage ADRs'
complete -c evolith-cli -a 'standards' -d 'Manage standards'
complete -c evolith-cli -a 'agents' -d 'Manage agents'
complete -c evolith-cli -a 'init' -d 'Initialize repository'
complete -c evolith-cli -a 'mcp' -d 'Start MCP server'
complete -c evolith-cli -a 'sdlc' -d 'SDLC phase management'
complete -c evolith-cli -a 'docs' -d 'Documentation'
complete -c evolith-cli -a 'config' -d 'Configuration'
complete -c evolith-cli -a 'upgrade' -d 'Upgrade CLI'
complete -c evolith-cli -a 'completion' -d 'Shell completions'
complete -c evolith-cli -a 'help' -d 'Show help'

# validate options
complete -c evolith-cli -n '__fish_seen_subcommand_from validate' -l format -d 'Output format' -a 'json table yaml'
complete -c evolith-cli -n '__fish_seen_subcommand_from validate' -l output -d 'Output file'
complete -c evolith-cli -n '__fish_seen_subcommand_from validate' -l satellite -d 'Satellite path'
complete -c evolith-cli -n '__fish_seen_subcommand_from validate' -l core -d 'Core path'
complete -c evolith-cli -n '__fish_seen_subcommand_from validate' -l ruleset -d 'Specific ruleset'

# adr subcommands
complete -c evolith-cli -n '__fish_seen_subcommand_from adr' -a 'create' -d 'Create ADR'
complete -c evolith-cli -n '__fish_seen_subcommand_from adr' -a 'list' -d 'List ADRs'
complete -c evolith-cli -n '__fish_seen_subcommand_from adr' -a 'get' -d 'Get ADR details'
complete -c evolith-cli -n '__fish_seen_subcommand_from adr' -a 'update' -d 'Update ADR'
complete -c evolith-cli -n '__fish_seen_subcommand_from adr' -a 'matrix' -d 'Show ADR matrix'

# standards subcommands
complete -c evolith-cli -n '__fish_seen_subcommand_from standards' -a 'init' -d 'Initialize'
complete -c evolith-cli -n '__fish_seen_subcommand_from standards' -a 'list' -d 'List standards'
complete -c evolith-cli -n '__fish_seen_subcommand_from standards' -a 'get' -d 'Get standard'
complete -c evolith-cli -n '__fish_seen_subcommand_from standards' -a 'validate' -d 'Validate'
complete -c evolith-cli -n '__fish_seen_subcommand_from standards' -a 'export' -d 'Export standard'

# agents subcommands
complete -c evolith-cli -n '__fish_seen_subcommand_from agents' -a 'install' -d 'Install agent'
complete -c evolith-cli -n '__fish_seen_subcommand_from agents' -a 'remove' -d 'Remove agent'
complete -c evolith-cli -n '__fish_seen_subcommand_from agents' -a 'list' -d 'List agents'
complete -c evolith-cli -n '__fish_seen_subcommand_from agents' -a 'validate' -d 'Validate agent'
complete -c evolith-cli -n '__fish_seen_subcommand_from agents' -a 'upgrade' -d 'Upgrade agent'
complete -c evolith-cli -n '__fish_seen_subcommand_from agents' -a 'menu' -d 'Interactive menu'

# mcp subcommands
complete -c evolith-cli -n '__fish_seen_subcommand_from mcp' -a 'serve' -d 'Start MCP server'
complete -c evolith-cli -n '__fish_seen_subcommand_from mcp' -a 'version' -d 'Show MCP version'

# sdlc subcommands
complete -c evolith-cli -n '__fish_seen_subcommand_from sdlc' -a 'handoff' -d 'Generate handoff'
complete -c evolith-cli -n '__fish_seen_subcommand_from sdlc' -a 'status' -d 'Show status'
complete -c evolith-cli -n '__fish_seen_subcommand_from sdlc' -a 'list' -d 'List phases'
complete -c evolith-cli -n '__fish_seen_subcommand_from sdlc' -a 'phases' -d 'Show phases'

# config subcommands
complete -c evolith-cli -n '__fish_seen_subcommand_from config' -a 'get' -d 'Get config value'
complete -c evolith-cli -n '__fish_seen_subcommand_from config' -a 'set' -d 'Set config value'
complete -c evolith-cli -n '__fish_seen_subcommand_from config' -a 'list' -d 'List config'
complete -c evolith-cli -n '__fish_seen_subcommand_from config' -a 'delete' -d 'Delete config'

# Global options
complete -c evolith-cli -l help -d 'Show help'
complete -c evolith-cli -l version -d 'Show version'
complete -c evolith-cli -l verbose -d 'Verbose output'
complete -c evolith-cli -l debug -d 'Debug mode'
complete -c evolith-cli -l json -d 'JSON output'
complete -c evolith-cli -l quiet -d 'Quiet mode'