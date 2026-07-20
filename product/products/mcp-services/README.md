# Evolith MCP Services

> **Bilingual navigation:** [Versión en Español](./README.es.md)

Evolith MCP Services expose Evolith Core governance as real-time context for LLMs and autonomous agents through the [Model Context Protocol](https://modelcontextprotocol.io). They ship as the standalone **`@beyondnet/evolith-mcp`** package (binary `evolith-mcp`), which can also be launched programmatically by other surfaces.

## Overview

The MCP server turns the Core reference corpus, rulesets, and phase gates into governed **tools**, **resources**, and **prompts** that an agent can call to retrieve context, evaluate criteria, and submit evidence — under the same contracts as the CLI and REST surfaces. The server lives in [`src/packages/mcp-server`](../../../src/packages/mcp-server) and is started via the `evolith-mcp` binary; see its [README](../../../src/packages/mcp-server/README.md) for the full tool/resource/prompt reference, auth model, and deployment guide.

> **User manual — [Using MCP](../../../reference/core/interfaces/using-the-mcp.md).** A readable, task-oriented guide to every one of the 47 `evolith-*` tools — inputs, the mutative-approval gate, and worked call/response examples. Part of the [Interface How-To hub](../../../reference/core/interfaces/README.md) (CLI · MCP · REST) with per-SDLC-phase catalogs and playbooks.

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
| **SDLC** | Validates phases, gates, artifacts, blocking criteria | `evolith-composable-validate --phase discovery` |
| **Architecture** | Validates topology, hexagonal limits, domain isolation | `evolith-composable-validate --topology modular-monolith` |
| **Ruleset** | Validates specific rulesets independently | `evolith-composable-validate --ruleset compliance-baseline` |
| **ADR** | Validates against ADR-specific rules | `evolith-composable-validate --adr adr-0002` |
| **Ad-hoc** | Validates individual files on demand | `evolith-composable-validate --file src/domain/user.ts` |

> SDLC phase keys are `discovery`, `design`, `construction`, `qa`, `release` (mapping to phases f1–f5). The live `evolith-composable-validate` schema also still accepts the legacy `f1`–`f5` aliases (marked deprecated); prefer the canonical keys.

The system is **intelligent and flexible** — users can combine any entry points without forcing a specific flow.

## Transports

| Transport | Use case |
|---|---|
| **stdio (JSON-RPC 2.0)** | Local agents and editor integrations launched via `evolith-mcp serve` |
| **Streamable HTTP (official MCP SDK)** | Remote agents and services, with fail-closed API-key authentication |

## Install and prerequisites

- **Prerequisite:** Node.js `>=20.0.0` (`engines.node` in `src/packages/mcp-server/package.json`). No database is required; HTTP API keys are stored in-process.
- **Install:**

```bash
# From the monorepo
npm install @beyondnet/evolith-mcp

# Or globally (exposes the evolith-mcp binary)
npm install -g @beyondnet/evolith-mcp
```

The binary is `evolith-mcp` (`package.json` `bin`); the only subcommands are `serve` and `version`.

## Running the server

```bash
# stdio (default)
evolith-mcp serve

# Streamable HTTP (set EVOLITH_API_KEY for production auth)
evolith-mcp serve --transport http --port 3000
```

CLI flags: `--transport|-t stdio|http`, `--port|-p <n>` (default `3000`), `--api-key <key>`, `--allow-no-auth` (ignored in production). In production, authentication is mandatory: the server forces auth even if `--allow-no-auth` / `EVOLITH_MCP_ALLOW_NO_AUTH` is set.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `EVOLITH_API_KEY` | HTTP transport API key (Bearer or `x-api-key`); grants `admin` context | (none) |
| `JWT_SECRET` | Optional HS256 secret; when set, a non-matching Bearer is validated as a JWT and its `roles` drive ABAC | (none) |
| `EVOLITH_MCP_ALLOW_NO_AUTH` | Allows running HTTP without auth in non-production only | `false` |
| `PORT` | HTTP listen port (overridden by `--port`) | `3000` |
| `MCP_HTTP_HOST` | HTTP bind host | (SDK default) |
| `NODE_ENV` | `production` enables fail-closed auth and fail-closed ABAC policy resolution | `development` |
| `LOG_LEVEL` | Pino log level (logs are always written to **stderr**) | `info` |
| `OTEL_ENABLED` | Enables OpenTelemetry tracing | `false` |

Authentication, ABAC roles/codes, the mutative-tool contract, and the full per-tool reference live in the package [README](../../../src/packages/mcp-server/README.md).

## Tool Registry

The lightweight `@beyondnet/evolith-mcp-tools` package has been retired. The canonical registry now lives inside the standalone gateway under [packages/mcp-server/src/tools](../../../src/packages/mcp-server/src/tools/tools.module.ts), where tool schemas, ABAC checks, audit logging, resources, prompts, and transport behavior are governed together.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| stdio: logs mixed into the MCP response | Expected — logs go to **stderr**, stdout is reserved for the JSON-RPC stream. Read stderr separately. |
| HTTP `401 Unauthorized` | Missing/incorrect `EVOLITH_API_KEY`, or an invalid JWT when `JWT_SECRET` is set. |
| `ABAC-02: No roles present` | The authenticated principal has no roles; supply roles via the JWT `roles` claim, or use the API key (admin context). |
| `OPA: policy.wasm not found` | `engine: "opa"` needs `src/sdk/cli/rulesets/opa/policy.wasm` under `CORE_PATH`. A missing policy is **fail-closed in production** (hard deny, `ABAC_POLICY_MISSING`) and abstains only in non-production; use `engine: "native"` to bypass OPA. |

## Conformance

Initialize, discovery (tools/resources/prompts), metrics, and gate evaluation are verified over both transports by the MCP E2E and smoke suites. See the [MCP Capability Catalog](../smart-cli/docs/planning/mcp-capability-catalog.md) for the per-capability schema breakdown.

## Contributing

For clone/dev-setup, test commands, and branch/commit conventions, see the repo-root [CONTRIBUTING.md](../../../CONTRIBUTING.md). To add a tool, see the extension guide in the package [README](../../../src/packages/mcp-server/README.md).

---
[Back to Products Index](../README.md)
