# Contributing to Evolith Core

Welcome to **Evolith Core**! We are thrilled that you're interested in contributing.

Evolith is not a conventional application starter template. It is an **executable architectural governance framework** — a living set of technical laws, ADRs, OPA policies, JSON-Schema contracts, and AI agent definitions that act as the enterprise reference for satellite products.

To ensure everything flows smoothly, please take a moment to review our unique contribution model.

## 1. The BMAD Method and AI Agents

We use the **BMAD Method** (Specification-driven, AI-Driven Development) for the core repository. This means you do not have to code or write documentation alone. You can (and should) invoke our specialized AI agents in your IDE or prompts to assist you:

- **Winston (Principal Architect):** Use for architectural audits and to track gaps.
- **Architect Agent:** Assists in defining Data Mesh contracts, Event-Driven patterns, and drafting Architecture Decision Records (ADRs).
- **Developer Agent:** Helps implement secure patterns (OWASP) and progressive architecture patterns.
- **QA Agent:** Assists in contract testing and Rego policy validation.
- **DevOps Agent:** Helps orchestrate distributed deployments and GitHub Actions.
- **Docs Agent:** Manages translation and Markdown validations.

The agent roster, contracts, and handoffs are documented in [AGENTS.md](./AGENTS.md). For detailed orientation, see our [Quick Start Guide](./reference/core/foundations/inheritance-model/product-quick-start.md).

## 2. Prerequisites and Local Setup

Evolith is an **npm workspaces monorepo** (`sdk/*`, `apps/*`, `src/packages/*`). The Evolith CLI lives in `src/sdk/cli` (published as `@beyondnet/evolith-cli`), the Core-API in `src/apps/core-api`, and shared logic in `src/packages/*` (`core`, `core-domain`, `infra-providers`, `mcp-server`, `mcp-tools`, `sdk-client`).

### A. Prerequisites

- **Node.js 20** is what CI runs. The CLI declares `engines.node >= 18.0.0`, but pin to Node 20 locally to match the pipeline.
- **npm** (workspaces-aware; ships with Node).
- **Git** with the GitFlow branching model (see [ADR-0050](./reference/core/architecture/adrs/core/0050-gitflow-branching-strategy.md)).

### B. Clone and Install

```bash
# Clone the repository
git clone https://github.com/beyondnetcode/evolith_arch32.git
cd evolith_arch32

# Install all workspaces from the repo root
npm install
```

`npm install` resolves every workspace at once. Husky hooks are wired by the root `prepare` script during install.

### C. Build

Some workspaces depend on each other, so build the shared packages first, then the CLI:

```bash
# Build shared workspaces (order matters)
npm run build -w @beyondnet/evolith-core-domain
npm run build -w @beyondnet/evolith-infra-providers
npm run build -w @beyondnet/evolith-core
npm run build -w @beyondnet/evolith-mcp-server

# Build the Evolith CLI
npm run build -w @beyondnet/evolith-cli
```

To compile the OPA policies to WASM (required for the OPA parity gate), run `npm run build:policy` from the root.

## 3. Running Tests

Tests run per workspace. The Evolith CLI carries the primary suites:

```bash
# Unit tests (Evolith CLI)
npm run test:unit -w @beyondnet/evolith-cli

# End-to-end tests (Evolith CLI)
npm run test:e2e -w @beyondnet/evolith-cli

# Unit + e2e together
npm test -w @beyondnet/evolith-cli

# Coverage (CI enforces an 80% statement threshold)
npm run test:cov -w @beyondnet/evolith-cli

# MCP stdio + HTTP smoke test
npm run mcp:smoke -w @beyondnet/evolith-cli

# Contract conformance suite (from root)
npm run test:contract
```

## 4. The Golden Rules of Evolith

Before you submit a Pull Request, you must adhere to these absolute rules. The CI gates listed in each section will block your PR if violated.

### A. Mandatory Bilingual Parity

Evolith operates globally. **Every documentation file must have an English (`.md`) and a Spanish (`.es.md`) version.** They must be structurally identical: the same number of `##` and `###` headers (the `04-check-bilingual-parity.mjs` gate counts depth-2 and depth-3 headings only; the top-level `#` title is not counted). The Docs Agent can assist you with this translation.

### B. No Emojis or Decorative Characters

The `01-validate-docs.mjs` gate rejects emojis, pictographic symbols, the UTF-8 BOM, the replacement character, CRLF line endings, and known mojibake. Write Markdown with plain ASCII punctuation and LF line endings.

### C. Valid Relative Links Only

Every relative Markdown link (and its `#anchor`) must resolve to a file that exists. Confirm the target before linking; broken links fail the docs gate.

### D. Architectural Agnosticism

Unless you are editing a specific *Authoritative Tech Stack Profile*, keep the reference agnostic. Do not assume a specific runtime, framework, or cloud provider in the core standards without an accepted ADR.

### E. Validation Quality Gates

You must validate your work locally. The Husky `pre-commit` hooks check your work automatically, but run these scripts manually from the root before committing:

```bash
# Validate all Markdown links, anchors, Mermaid diagrams, and forbidden characters
node .harness/scripts/ci/01-validate-docs.mjs

# Verify bilingual structural parity (equal ## and ### counts)
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

If these scripts fail, the CI pipeline will block your PR.

## 5. Standards by Contribution Area

Each surface has its own validators. Confirm your change against the actual files before editing — if a finding is a false positive, report it rather than changing correct code.

### A. Documentation

Keep EN and ES in lockstep (Rule 4.A), no emojis (Rule 4.B), valid links (Rule 4.C). The bilingual terminology lint (`bilingual-terminology-lint.mjs`) and coverage check (`bilingual-coverage.mjs`) also run in CI.

### B. Schemas

JSON-Schema contracts live in `src/rulesets/schema/`. Changes are checked by the contract conformance gate (`10-validate-contract-conformance.mjs`) and the REST envelope/versioning gate (`19-validate-rest-versioning.mjs`). Keep the machine contract in `src/rulesets/contracts/` in sync.

### C. Rulesets and OPA

Native rules are declared per domain under `src/rulesets/<domain>/`, and their executable Rego counterparts live in `src/rulesets/opa/`. **Native and OPA must stay at rule-ID parity:** the parity gates fail closed on any verdict, rule-ID, severity, or evidence drift.

- Native evaluator fixtures: `28-native-evaluator-parity.mjs`.
- Native/OPA semantic parity: `27-opa-parity-gate.mjs` (scoped per commit; a full scheduled sweep runs daily). Recompile policies with `npm run build:policy` after touching any `.rego` file.

### D. Phases, Gates, and Topologies

The SDLC phases are `f1` Conception and Discovery through `f5` Delivery and Operations, with gates `gate-f1` through `gate-f5`. `F1`–`F5` are **maturity levels, not phases**. The eight topologies are modular-monolith, distributed-modules, microservices, event-driven, serverless, edge-computing, data-mesh, and agentic-ai. Phase and topology namespaces must stay disjoint — the `30-validate-phase-topology-disjoint.mjs` guard enforces this. Topology rule coverage and composition are checked by `26-validate-topology-rule-coverage.mjs` and `22-validate-topology-composition.mjs`.

### E. CLI

The Evolith CLI (`@beyondnet/evolith-cli`, currently v1.1.4) uses key families discovery / design / construction / qa / release, configured via `evolith.yaml`. Run the architecture boundary lint (`eslint-plugin-boundaries`) and type check before pushing:

```bash
npm run lint -w @beyondnet/evolith-cli
npm run build -w @beyondnet/evolith-cli
```

### F. MCP

The MCP server ships inside `@beyondnet/evolith-cli` and supports stdio and Streamable HTTP transports. Validate with `npm run mcp:smoke -w @beyondnet/evolith-cli`. Surface and compatibility parity are enforced by `20-validate-surface-compatibility.mjs` and `24-check-surface-parity.mjs`.

### G. Core-API

The Core-API is **REST-only** (no GraphQL, no SSE), served under `/api/v1`. Every response uses the flat ADR-0073 envelope (`meta.command`, `executedAt`, `durationMs`, `correlationId`, `context`, `schemaVersion`); errors follow RFC 9457. The `19-validate-rest-versioning.mjs` gate enforces versioning and envelope shape.

### H. Tracker

`gap-tracking.md` and `maturity-assessment.md` (under `reference/core/sdlc/standards/vision/`) are the **only** tracking surfaces. Update them through their bilingual pairs and keep closure evidence in sync; the `08-validate-tracking.mjs` and `09-reconcile-maturity.mjs` gates verify them.

## 6. Pull Request Process

1. **Branching:** Follow [ADR-0050](./reference/core/architecture/adrs/core/0050-gitflow-branching-strategy.md). Feature work flows into `develop`, and `develop` is promoted to `main`. Prefix your branches correctly (e.g., `feature/`, `docs/`, `fix/`).
2. **ADR Updates:** If your PR introduces an architectural change or a new tool, it *must* be accompanied by an update to an existing ADR or a new ADR following [ADR-0068](./reference/core/architecture/adrs/core/0068-documentation-release-gitflow.md).
3. **Commit Messages:** We use semantic versioning and release-please. Your commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification, using types such as `feat`, `fix`, `docs`, `ci`, and `chore` (e.g., `feat:`, `docs:`, `fix:`).
4. **Issues:** Open an issue before large changes so the design can be discussed. Reference the relevant `GT-###` gap identifier when your work closes a tracked gap.
5. **Code Review:** All PRs require review. Our automated workflows post coverage impact, structural validation, and Winston agentic review results on your PR.

Thank you for helping us evolve the core!
