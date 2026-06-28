# Evolith MCP Services

> **Bilingual navigation:** [Versión en Español](./README.es.md)

Evolith MCP Services expose Evolith Core governance as real-time context for LLMs and autonomous agents through the [Model Context Protocol](https://modelcontextprotocol.io). They ship inside the `@evolith/smart-cli` package — there is no separate install.

## Overview

The MCP server turns the Core reference corpus, rulesets, and phase gates into governed **tools**, **resources**, and **prompts** that an agent can call to retrieve context, evaluate criteria, and submit evidence — under the same contracts as the CLI and REST surfaces.

## Surface

The exact, installable surface is generated from the CLI sources and must not be hand-maintained — see the [Product Surface Inventory](../smart-cli/product-inventory.md). At the current release:

| Capability | Count | Examples |
|---|:---:|---|
| **Tools** | 27 | `evolith-validate`, `evolith-composable-validate`, `evolith-gate-evaluate`, `evolith-architecture-validate`, `evolith-phase-advance`, `evolith-auto-fix`, `evolith-drift-detect`, `evolith-dora-metrics`, `evolith-metrics` |
| **Resources** | 9 | `evolith://rulesets`, `evolith://phase-gates`, `evolith://agents`, `evolith://core/version` |
| **Prompts** | 8 | `evolith/validate-repository`, `evolith/architecture-review`, `evolith/sdlc-handoff`, `evolith/moscow-prioritization` |

> Counts are verified against the generated [Product Surface Inventory](../smart-cli/product-inventory.md) and the MCP server sources (`tools/*.tool.ts`, `resources.service.ts`, `prompts.service.ts`); do not edit them by hand without re-deriving from those sources.

### GT-312: Composable Validation Engine

The `evolith-composable-validate` tool exposes the composable validation engine (GT-312) with 5 validation modes:

| Mode | Description | Example |
|---|---|---|
| **SDLC** | Validates phases, gates, artifacts, blocking criteria | `evolith-composable-validate --phase f1` |
| **Architecture** | Validates topology, hexagonal limits, domain isolation | `evolith-composable-validate --topology modular-monolith` |
| **Ruleset** | Validates specific rulesets independently | `evolith-composable-validate --ruleset compliance-baseline` |
| **ADR** | Validates against ADR-specific rules | `evolith-composable-validate --adr adr-0002` |
| **Ad-hoc** | Validates individual files on demand | `evolith-composable-validate --file src/domain/user.ts` |

The system is **intelligent and flexible** — users can combine any entry points without forcing a specific flow.

## Transports

| Transport | Use case |
|---|---|
| **stdio (JSON-RPC 2.0)** | Local agents and editor integrations launched via `smart-cli mcp serve` |
| **Streamable HTTP (official MCP SDK)** | Remote agents and services, with API-key authentication |

## Running the server

```bash
# stdio (default)
smart-cli mcp serve

# Streamable HTTP
smart-cli mcp serve --transport http --port 3000
```

## Conformance

Initialize, discovery (tools/resources/prompts), metrics, and gate evaluation are verified over both transports by the MCP E2E and smoke suites. See the [MCP Capability Catalog](../smart-cli/docs/planning/mcp-capability-catalog.md) for the per-capability schema breakdown.

---
[Back to Products Index](../README.md)
