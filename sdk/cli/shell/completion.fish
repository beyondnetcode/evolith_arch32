#!/bin/fish
# Evolith CLI Fish Completion
# Install: cp this file to ~/.config/fish/completions/evolith.fish

complete -c evolith -f

# Top-level commands
complete -c evolith -a 'validate' -d 'Validate repository'
complete -c evolith -a 'adr' -d 'Manage ADRs'
complete -c evolith -a 'standards' -d 'Manage standards'
complete -c evolith -a 'agents' -d 'Manage agents'
complete -c evolith -a 'init' -d 'Initialize repository'
complete -c evolith -a 'mcp' -d 'Start MCP server'
complete -c evolith -a 'sdlc' -d 'SDLC phase management'
complete -c evolith -a 'docs' -d 'Documentation'
complete -c evolith -a 'config' -d 'Configuration'
complete -c evolith -a 'upgrade' -d 'Upgrade CLI'
complete -c evolith -a 'completion' -d 'Shell completions'
complete -c evolith -a 'help' -d 'Show help'

# validate options
complete -c evolith -n '__fish_seen_subcommand_from validate' -l format -d 'Output format' -a 'json table yaml'
complete -c evolith -n '__fish_seen_subcommand_from validate' -l output -d 'Output file'
complete -c evolith -n '__fish_seen_subcommand_from validate' -l satellite -d 'Satellite path'
complete -c evolith -n '__fish_seen_subcommand_from validate' -l core -d 'Core path'
complete -c evolith -n '__fish_seen_subcommand_from validate' -l ruleset -d 'Specific ruleset'

# adr subcommands
complete -c evolith -n '__fish_seen_subcommand_from adr' -a 'create' -d 'Create ADR'
complete -c evolith -n '__fish_seen_subcommand_from adr' -a 'list' -d 'List ADRs'
complete -c evolith -n '__fish_seen_subcommand_from adr' -a 'get' -d 'Get ADR details'
complete -c evolith -n '__fish_seen_subcommand_from adr' -a 'update' -d 'Update ADR'
complete -c evolith -n '__fish_seen_subcommand_from adr' -a 'matrix' -d 'Show ADR matrix'

# standards subcommands
complete -c evolith -n '__fish_seen_subcommand_from standards' -a 'init' -d 'Initialize'
complete -c evolith -n '__fish_seen_subcommand_from standards' -a 'list' -d 'List standards'
complete -c evolith -n '__fish_seen_subcommand_from standards' -a 'get' -d 'Get standard'
complete -c evolith -n '__fish_seen_subcommand_from standards' -a 'validate' -d 'Validate'
complete -c evolith -n '__fish_seen_subcommand_from standards' -a 'export' -d 'Export standard'

# agents subcommands
complete -c evolith -n '__fish_seen_subcommand_from agents' -a 'install' -d 'Install agent'
complete -c evolith -n '__fish_seen_subcommand_from agents' -a 'remove' -d 'Remove agent'
complete -c evolith -n '__fish_seen_subcommand_from agents' -a 'list' -d 'List agents'
complete -c evolith -n '__fish_seen_subcommand_from agents' -a 'validate' -d 'Validate agent'
complete -c evolith -n '__fish_seen_subcommand_from agents' -a 'upgrade' -d 'Upgrade agent'
complete -c evolith -n '__fish_seen_subcommand_from agents' -a 'menu' -d 'Interactive menu'

# mcp subcommands
complete -c evolith -n '__fish_seen_subcommand_from mcp' -a 'serve' -d 'Start MCP server'
complete -c evolith -n '__fish_seen_subcommand_from mcp' -a 'version' -d 'Show MCP version'

# sdlc subcommands
complete -c evolith -n '__fish_seen_subcommand_from sdlc' -a 'handoff' -d 'Generate handoff'
complete -c evolith -n '__fish_seen_subcommand_from sdlc' -a 'status' -d 'Show status'
complete -c evolith -n '__fish_seen_subcommand_from sdlc' -a 'list' -d 'List phases'
complete -c evolith -n '__fish_seen_subcommand_from sdlc' -a 'phases' -d 'Show phases'

# config subcommands
complete -c evolith -n '__fish_seen_subcommand_from config' -a 'get' -d 'Get config value'
complete -c evolith -n '__fish_seen_subcommand_from config' -a 'set' -d 'Set config value'
complete -c evolith -n '__fish_seen_subcommand_from config' -a 'list' -d 'List config'
complete -c evolith -n '__fish_seen_subcommand_from config' -a 'delete' -d 'Delete config'

# Global options
complete -c evolith -l help -d 'Show help'
complete -c evolith -l version -d 'Show version'
complete -c evolith -l verbose -d 'Verbose output'
complete -c evolith -l debug -d 'Debug mode'
complete -c evolith -l json -d 'JSON output'
complete -c evolith -l quiet -d 'Quiet mode'