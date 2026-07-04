#!/bin/fish
# Evolith Smart CLI Fish Completion
# Install: cp this file to ~/.config/fish/completions/smart-cli.fish

complete -c smart-cli -f

# Top-level commands
complete -c smart-cli -a 'validate' -d 'Validate repository'
complete -c smart-cli -a 'adr' -d 'Manage ADRs'
complete -c smart-cli -a 'standards' -d 'Manage standards'
complete -c smart-cli -a 'agents' -d 'Manage agents'
complete -c smart-cli -a 'init' -d 'Initialize repository'
complete -c smart-cli -a 'mcp' -d 'Start MCP server'
complete -c smart-cli -a 'sdlc' -d 'SDLC phase management'
complete -c smart-cli -a 'docs' -d 'Documentation'
complete -c smart-cli -a 'config' -d 'Configuration'
complete -c smart-cli -a 'upgrade' -d 'Upgrade CLI'
complete -c smart-cli -a 'completion' -d 'Shell completions'
complete -c smart-cli -a 'help' -d 'Show help'

# validate options
complete -c smart-cli -n '__fish_seen_subcommand_from validate' -l format -d 'Output format' -a 'json table yaml'
complete -c smart-cli -n '__fish_seen_subcommand_from validate' -l output -d 'Output file'
complete -c smart-cli -n '__fish_seen_subcommand_from validate' -l satellite -d 'Satellite path'
complete -c smart-cli -n '__fish_seen_subcommand_from validate' -l core -d 'Core path'
complete -c smart-cli -n '__fish_seen_subcommand_from validate' -l ruleset -d 'Specific ruleset'

# adr subcommands
complete -c smart-cli -n '__fish_seen_subcommand_from adr' -a 'create' -d 'Create ADR'
complete -c smart-cli -n '__fish_seen_subcommand_from adr' -a 'list' -d 'List ADRs'
complete -c smart-cli -n '__fish_seen_subcommand_from adr' -a 'get' -d 'Get ADR details'
complete -c smart-cli -n '__fish_seen_subcommand_from adr' -a 'update' -d 'Update ADR'
complete -c smart-cli -n '__fish_seen_subcommand_from adr' -a 'matrix' -d 'Show ADR matrix'

# standards subcommands
complete -c smart-cli -n '__fish_seen_subcommand_from standards' -a 'init' -d 'Initialize'
complete -c smart-cli -n '__fish_seen_subcommand_from standards' -a 'list' -d 'List standards'
complete -c smart-cli -n '__fish_seen_subcommand_from standards' -a 'get' -d 'Get standard'
complete -c smart-cli -n '__fish_seen_subcommand_from standards' -a 'validate' -d 'Validate'
complete -c smart-cli -n '__fish_seen_subcommand_from standards' -a 'export' -d 'Export standard'

# agents subcommands
complete -c smart-cli -n '__fish_seen_subcommand_from agents' -a 'install' -d 'Install agent'
complete -c smart-cli -n '__fish_seen_subcommand_from agents' -a 'remove' -d 'Remove agent'
complete -c smart-cli -n '__fish_seen_subcommand_from agents' -a 'list' -d 'List agents'
complete -c smart-cli -n '__fish_seen_subcommand_from agents' -a 'validate' -d 'Validate agent'
complete -c smart-cli -n '__fish_seen_subcommand_from agents' -a 'upgrade' -d 'Upgrade agent'
complete -c smart-cli -n '__fish_seen_subcommand_from agents' -a 'menu' -d 'Interactive menu'

# mcp subcommands
complete -c smart-cli -n '__fish_seen_subcommand_from mcp' -a 'serve' -d 'Start MCP server'
complete -c smart-cli -n '__fish_seen_subcommand_from mcp' -a 'version' -d 'Show MCP version'

# sdlc subcommands
complete -c smart-cli -n '__fish_seen_subcommand_from sdlc' -a 'handoff' -d 'Generate handoff'
complete -c smart-cli -n '__fish_seen_subcommand_from sdlc' -a 'status' -d 'Show status'
complete -c smart-cli -n '__fish_seen_subcommand_from sdlc' -a 'list' -d 'List phases'
complete -c smart-cli -n '__fish_seen_subcommand_from sdlc' -a 'phases' -d 'Show phases'

# config subcommands
complete -c smart-cli -n '__fish_seen_subcommand_from config' -a 'get' -d 'Get config value'
complete -c smart-cli -n '__fish_seen_subcommand_from config' -a 'set' -d 'Set config value'
complete -c smart-cli -n '__fish_seen_subcommand_from config' -a 'list' -d 'List config'
complete -c smart-cli -n '__fish_seen_subcommand_from config' -a 'delete' -d 'Delete config'

# Global options
complete -c smart-cli -l help -d 'Show help'
complete -c smart-cli -l version -d 'Show version'
complete -c smart-cli -l verbose -d 'Verbose output'
complete -c smart-cli -l debug -d 'Debug mode'
complete -c smart-cli -l json -d 'JSON output'
complete -c smart-cli -l quiet -d 'Quiet mode'