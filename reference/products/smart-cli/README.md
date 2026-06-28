# Smart CLI

> Product hub for **`@evolith/smart-cli`** — the command-line entry point to the Evolith ecosystem: governance, standards validation, architecture scaffolding, SDLC lifecycle management, and AI agent integration (MCP).

| | |
|---|---|
| **Status** | Active |
| **Package** | `@evolith/smart-cli` |
| **Version** | `1.1.4` |
| **Binary** | `smart-cli` |
| **Source of truth** | [`sdk/cli/README.md`](../../../sdk/cli/README.md) (authoritative, 1200+ lines) |
| **Surface inventory** | [`product-inventory.md`](./product-inventory.md) (generated — do not hand-edit) |

This page is a **hub**: it orients you and points to the authoritative deeper docs. For exhaustive per-command options, always defer to the [code README](../../../sdk/cli/README.md) and the generated [Product Surface Inventory](./product-inventory.md).

## What it does

- **Governance** — ADR management, standards tracking, BMAD agent installation.
- **Validation** — repository compliance against Evolith rulesets, topologies, ADRs, and SDLC gates (composable engine, GT-312).
- **Architecture** — scaffolding and drift detection along the progressive maturity axis.
- **SDLC lifecycle** — phase gates, transitions, handoff artifacts, and DORA metrics.
- **AI integration** — a production-ready MCP server (stdio + HTTP) for Cursor, Claude Desktop, and custom agents.

## Installation

```bash
npm install -g @evolith/smart-cli
# or: pnpm add -g @evolith/smart-cli
# or: yarn global add @evolith/smart-cli
```

Or download a binary from [GitHub Releases](https://github.com/beyondnetcode/evolith_arch32/releases) and add it to your PATH.

```bash
smart-cli --version
# smart-cli version 1.1.4
```

## Quickstart

```bash
# 1. Seed a demo project to explore the CLI
smart-cli fixtures --type demo

# 2. Initialize a real repository (creates evolith.yaml)
smart-cli init

# 3. Scaffold base documentation
smart-cli docs

# 4. Validate compliance
smart-cli validate

# 5. Connect an AI agent
smart-cli mcp serve
```

## Command reference

The CLI exposes **20 command groups** (the generated inventory counts individual subcommands separately, hence a higher figure). One concise line each — for full options and examples, follow the link to the [code README](../../../sdk/cli/README.md).

| Command | Purpose |
|---|---|
| `init` | Initialize a satellite repository (creates `evolith.yaml` and project structure). |
| `docs` | Scaffold base documentation (`README.md`, `AGENTS.md`, `MASTER_INDEX.md`, `evolith.yaml`). |
| `validate` | Validate repository compliance against rulesets, topologies, ADRs, and SDLC phases. |
| `adr` | Manage Architecture Decision Records (create, list, get, update, matrix). |
| `standards` | Manage governance standards (init, list, get, validate, export). |
| `agents` | Install, list, and remove Evolith BMAD agents. |
| `architecture` | Inspect and validate architecture against the declared topology. |
| `drift` | Detect architecture drift from the declared topology; track history and trends. |
| `gate` | Evaluate SDLC phase gates and emit ADR-0073 `GateEvidence` artifacts. |
| `phase` | Propose a transition between SDLC phases (emits a proposal artifact). |
| `sdlc` | Orchestrate SDLC artifacts and lifecycle (`handoff`, `generate`, `gate-status`). |
| `profile` | Manage named CLI profiles (per-environment defaults). |
| `fixtures` | Seed reproducible fixture files for demos, tests, and onboarding. |
| `api` | Browse and inspect the Evolith API surface (MCP tools, resources, schemas, commands). |
| `mcp` | Run the MCP server for AI agent integration (stdio or HTTP). |
| `alias` | Manage shorthand aliases for CLI commands. |
| `history` | View and manage CLI command execution history. |
| `completion` | Generate and install shell completion scripts (bash, zsh, fish). |
| `update` | Check for and apply CLI updates. |
| `upgrade` | Upgrade a satellite repo to the next progressive-axis topology or governance version. |

## Validation modes (composable engine — GT-312)

Validation is composable, not rigid — you can enter from any combination of inputs and the engine resolves the optimal scope.

| Mode | Example | Validates |
|---|---|---|
| SDLC | `smart-cli validate --phase discovery` | Phase → gate → artifacts → schemas → rulesets → ADRs → blocking criteria |
| Architecture | `smart-cli validate --topology modular-monolith` | Topology rules, hexagonal limits, domain isolation, multi-tenancy |
| Ruleset | `smart-cli validate --ruleset evidence` | A specific ruleset (native or OPA engine) |
| ADR | `smart-cli validate --adr adr-0002` | ADR-specific architectural rules |
| Ad-hoc | `smart-cli validate --file src/domain/user.ts` | A single file or component |
| Composable | `smart-cli validate --topology microservices --ruleset evidence` | Multiple entry points combined |

**SDLC phase keys** (the `--phase` values accepted by the CLI and the `@evolith/sdk-client` API): `discovery`, `design`, `construction`, `qa`, `release`. These map to governance phases f1–f5 — *Conception & Discovery*, *Design & Architecture*, *Construction*, *Validation & QA*, *Delivery & Operations* — see [Phases & gates](#sdlc-phases--gates) below. Legacy `f1`–`f5` are **deprecated** as `--phase` values; use the canonical keys above.

```bash
# Basic compliance check
smart-cli validate

# JSON output for CI (ADR-0073 envelope)
smart-cli validate --format json --output report.json

# SDLC phase evaluation (GT-281 pipeline)
smart-cli validate --phase discovery

# OPA engine against a specific ruleset
smart-cli validate --engine opa --ruleset acl
```

## Supported topologies

Any command that accepts `--topology` references the **8 canonical topology ids** by their dimension:

| Topology (id) | Dimension |
|---|---|
| `modular-monolith` | progressive-axis |
| `distributed-modules` | progressive-axis |
| `microservices` | progressive-axis |
| `serverless` | execution |
| `edge-computing` | execution |
| `event-driven` | integration |
| `data-mesh` | data |
| `agentic-ai` | ai |

The **progressive axis** (`modular-monolith → distributed-modules → microservices`) is a linear maturity progression. The remaining dimensions (execution, integration, data, ai) are complementary and chosen per project needs. Legacy `F1/F2/F3` flags map to the progressive axis but are **deprecated** — use the canonical ids.

## SDLC phases & gates

F1–F5 are **maturity levels** on the progressive architecture axis, not SDLC phases. The SDLC lifecycle is a separate model:

| Governance phase | Short name | CLI `--phase` key | Gate |
|---|---|---|---|
| Conception & Discovery | Discovery | `discovery` | Business Sign-Off |
| Design & Architecture | Architecture | `design` | Design Baseline Approved |
| Construction | Build | `construction` | Successful Build |
| Validation & QA | Validation | `qa` | RC Stamped |
| Delivery & Operations | Delivery | `release` | Production Live |

The final SDLC phase is **Delivery & Operations**. Evaluate gates and emit evidence with `smart-cli gate evaluate --phase <key>`; propose transitions with `smart-cli phase advance`.

## MCP server (AI agent integration)

The MCP server ships **inside** `@evolith/smart-cli` — there is no separate install. It exposes the full Evolith surface to AI agents.

| Surface | Count |
|---|---|
| Tools | 27 |
| Resources | 9 |
| Prompts | 8 |
| Transports | `stdio` (JSON-RPC 2.0) · Streamable HTTP (API-key, fail-closed) |

The exact tool/resource/prompt set is enumerated in the generated [Product Surface Inventory](./product-inventory.md) and is browsable live with `smart-cli api --list --category tools`. Treat those as the authority rather than any hand-maintained list.

```bash
# stdio transport (default — Cursor, Claude Desktop)
smart-cli mcp serve

# HTTP transport with API-key auth (remote / containerized)
smart-cli mcp serve --transport http --port 3000 --api-key <secret>
```

**Cursor** (`~/.cursor/mcp.json`) / **Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "evolith": {
      "command": "smart-cli",
      "args": ["mcp", "serve"]
    }
  }
}
```

## Configuration

Evolith uses **`evolith.yaml`** in `.evolith/` or the repository root:

```yaml
coreRef:
  version: "1.0.0"
  path: "../../evolith"

governance:
  version: "1.0"
  adrRegistry:
    - id: "ADR-0001"
      status: "accepted"

product:
  name: "my-project"
  type: "library"
  runtime: "typescript"
  topology: "modular-monolith"
```

Optional defaults consumed by `validate` (topology, phase, rulesets, engine) also live in `evolith.yaml` — `smart-cli validate` with no flags reads them. Use a canonical phase key (`discovery`…`release`) and a canonical topology id.

## Where this sits in Evolith

Smart CLI is part of the **Evolith suite**, built on **Evolith Core** (`packages/core`, `core-domain`, `infra-providers`, `sdk-client`, `mcp-tools`). Sibling products: **Evolith Tracker**, **Core API** (`apps/core-api`), **Evolith MCP Services**, and the **UMS Reference** model.

## Documentation

- [Code README](../../../sdk/cli/README.md) — authoritative, full per-command reference and examples.
- [Product Surface Inventory](./product-inventory.md) — generated tool/resource/prompt/command counts.
- [Demo Guide](../../../sdk/cli/docs/SMART-CLI-DEMO.md) — end-to-end walkthrough.
- [MCP Integration](../../../sdk/cli/docs/MCP-INTEGRATION.md) — MCP protocol details.
- [Handoff Protocol](../../../sdk/cli/docs/HANDOFF-PROTOCOL.md) — SDLC handoff artifact spec.

## Support

- [Issue Tracker](https://github.com/beyondnetcode/evolith_arch32/issues)
- [Discussions](https://github.com/beyondnetcode/evolith_arch32/discussions)
