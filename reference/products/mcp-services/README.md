# Evolith MCP Services

> **Bilingual navigation:** [Versión en Español](./README.es.md)

Evolith MCP Services expose Evolith Core governance as real-time context for LLMs and autonomous agents through the [Model Context Protocol](https://modelcontextprotocol.io). They ship inside the `@evolith/smart-cli` package — there is no separate install.

## Overview

The MCP server turns the Core reference corpus, rulesets, and phase gates into governed **tools**, **resources**, and **prompts** that an agent can call to retrieve context, evaluate criteria, and submit evidence — under the same contracts as the CLI and REST surfaces.

## Surface

The exact, installable surface is generated from the CLI sources and must not be hand-maintained — see the [Product Surface Inventory](../smart-cli/product-inventory.md). At the current release:

| Capability | Count | Examples |
|---|:---:|---|
| **Tools** | 21 | `evolith-validate`, `evolith-gate-evaluate`, `evolith-architecture-validate`, `evolith-phase-advance`, `evolith-metrics` |
| **Resources** | 7 | `evolith://rulesets`, `evolith://phase-gates`, `evolith://agents`, `evolith://core/version` |
| **Prompts** | 7 | `evolith/validate-repository`, `evolith/architecture-review`, `evolith/sdlc-handoff`, `evolith/moscow-prioritization` |

## Transports

| Transport | Use case |
|---|---|
| **stdio (JSON-RPC 2.0)** | Local agents and editor integrations launched via `smart-cli mcp-server` |
| **Streamable HTTP (official MCP SDK)** | Remote agents and services, with API-key authentication |

## Running the server

```bash
# stdio (default)
smart-cli mcp-server

# Streamable HTTP
smart-cli mcp-server --http --port 3000
```

## Conformance

Initialize, discovery (tools/resources/prompts), metrics, and gate evaluation are verified over both transports by the MCP E2E and smoke suites. See the [MCP Capability Catalog](../smart-cli/docs/planning/mcp-capability-catalog.md) for the per-capability schema breakdown.

---
[Back to Products Index](../README.md)
