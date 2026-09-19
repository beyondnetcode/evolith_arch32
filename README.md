<div align="center">

# Evolith Core

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

[![npm](https://img.shields.io/npm/v/@beyondnet/evolith-cli?label=%40beyondnet%2Fevolith-cli)](https://www.npmjs.com/package/@beyondnet/evolith-cli)
[![node](https://img.shields.io/node/v/@beyondnet/evolith-cli)](https://www.npmjs.com/package/@beyondnet/evolith-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/ci-cd.yml?branch=main&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/license-MIT-informational)](./LICENSE)

**Your architecture rules, running on every PR.**

<img src="./docs/assets/evolith-demo.svg" alt="Terminal: evolith init, evolith validate; 133 rules evaluated, 26 skipped, 9 blocking rules not evaluated reported as failures; exit 2" width="960">

<sub>Real output of the published CLI on an empty repository (2026-09-14, abridged; <a href="./docs/evidence/first-run-capture.md">full 71-row capture</a>).</sub>

</div>

Evolith is an architecture linter for CI. It reads your repository — structure, workflows, manifests, architecture decisions — and checks it against a library of rules: layering, dependencies, security, CI/CD. If a blocking rule fails, the PR fails.

What sets it apart from other linters: **it also counts the rules it could not evaluate.** A blocking rule that never ran fails the PR exactly as one that failed. Coverage and compliance are never painted the same green.

And it is not only a linter: **the rules are tied to the product's SDLC phase.** Evolith knows where a product is (Discovery → Design → Construction → QA → Delivery), evaluates the gates of that phase (`evolith gate evaluate --phase`) and blocks the move to the next one until they pass (`evolith phase advance`), leaving machine-readable evidence of every transition. Architecture decisions live in the same loop: `evolith adr create` drafts them and many rules are derived from them.

It is for engineering teams that want their architecture decisions enforced in CI rather than reviewed by hand, for platform teams blocking non-conformant artifacts before production, and for AI agents that need to validate their own output against the same rules.

[Try it](#try-it-in-two-minutes) · [Four terms](#four-terms-you-need) · [In CI](#in-ci) · [What is inside](#what-is-inside) · [What it is not](#what-it-is-not) · [Documentation](#documentation) · [Interactive atlas](https://beyondnetcode.github.io/evolith_arch32/)

---

## Try it in two minutes

You need Node ≥ 18. No database, no server, no Docker; your code never leaves your machine.

```bash
npx -y @beyondnet/evolith-cli init --name my-project --yes   # writes evolith.yaml in the current directory
npx -y @beyondnet/evolith-cli validate --engine opa          # evaluates; exits 2 if anything blocking did not pass
```

**The first run will fail, and that is fine:** it is a baseline, not a grade. Many rules assume a layout your repository does not have yet. To start only from what you have already adopted:

```bash
npx -y @beyondnet/evolith-cli rulesets                        # lists the packs your installation loads
npx -y @beyondnet/evolith-cli validate --engine opa --select rulesets/acl/anti-corruption-layer.rules.json
```

`init` writes `evolith.yaml` with the product's name, type and phase and your stack; `--engine opa` picks the engine with the most coverage today (why, in [Known limitations](./docs/known-limitations.md)). What a first run looks like, row by row: [capture](./docs/evidence/first-run-capture.md). Full guide: [Quickstart](./docs/guides/evolith-quickstart.md).

---

## Four terms you need

- **Rule** — a check with an id, a priority (`MUST` / `SHOULD` / `COULD`) and a verdict: `passed`, `failed` or `skipped` (could not be evaluated). A `MUST` that ends `skipped` blocks exactly as a `failed` one.
- **Pack** — a `*.rules.json` file grouping rules by topic (ACL, security, CI…). `evolith rulesets` lists them; `--select` picks which ones to apply.
- **Topology** — the architecture style you declare: `modular-monolith`, `distributed-modules`, `microservices`, `event-driven`, `serverless`, `edge-computing`, `data-mesh` or `agentic-ai`. The same rules follow you when the monolith splits into services.
- **Phase** — where the product is in its lifecycle: Discovery → Design → Construction → QA → Delivery. Each phase has gates that block the move to the next one.

An **ADR** (Architecture Decision Record) is an architecture decision in writing; `evolith adr create` drafts one, and many rules are derived from them. [Full glossary](./reference/core/sdlc/glossary/glossary-ecosystem.md).

---

## In CI

```yaml
- uses: beyondnetcode/evolith_arch32@v1
  with:
    fail-on-violation: true
```

Exit codes: `0` pass · `1` the tool failed · `2` the gate blocked · `3` invalid invocation. `1` and `3` mean the repository was **not evaluated**: they are not weaker forms of non-compliant, and the job summary says so in words.

For an AI agent, the same engine as an MCP server over stdio (Node ≥ 20):

```json
{ "mcpServers": { "evolith": { "command": "npx", "args": ["-y", "@beyondnet/evolith-mcp"] } } }
```

---

## What is inside

| Product | Role |
|---|---|
| **Evolith Core** | The library of rules, ADRs and phase schemas. MIT and free: files you can read, edit and version |
| **Evolith CLI** | Evaluates your repository locally or in CI; manages ADRs and phase gates |
| **MCP Services** | The rules as live context for an agent |
| **Core API** | REST to query and evaluate remotely |
| **Agent Runtime** | Drives the Core from an agent, through Ports and Adapters. Experimental |
| **Evolith Tracker** | Commercial lifecycle-governance product. Not yet launched; it will be the only paid one |

How many rules, packs and ADRs your installation loads is printed by `evolith rulesets`; the tree's counts are measured by CI on every PR and published in the [corpus inventory](./reference/core/control-center/maturity-reports/inventory-summary.md).

<div align="center"><a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html" title="Open the interactive diagram"><img src="./reference/core/sdlc/assets/master-view.svg" alt="How the CLI, the Core and the five SDLC phases fit together" width="820" /></a><br/><sub><b><a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html">Open the interactive viewer</a></b> — drag to pan, scroll to zoom</sub></div>

---

## What it is not

- **Not a replacement for ArchUnit, Conftest or dependency-cruiser; it complements them.** Rules live outside the codebase, as data that governs many repositories and that an agent can read. Evolith *is* OPA underneath, and adds the rule library, the ADR-to-rule derivation and the coverage accounting.
- **It does not read your code's AST.** It inspects structure, workflows, manifests and governance artifacts; the subset that looks at dependencies and linters assumes a Node/TypeScript repository.
- **It does not call any LLM.** No command in the published CLI reaches one; "the LLM proposes, a deterministic verifier disposes" is a documented direction, not shipped behaviour. Network egress disclosure: [Security Policy](./SECURITY.md#network-egress-and-data-handling).

**What this front page does not say** — what each engine covers, counts that disagree, real adoption, unverified platforms — lives on a single dated page: [Known limitations](./docs/known-limitations.md). It exists because a README that only tells the good part is exactly the defect Evolith detects.

---

## Documentation

| To… | Go to |
|---|---|
| Start from your role | [Start by Role](./reference/core/foundations/inheritance-model/product-quick-start.md) |
| Understand the rules and ADRs | [Evolith Core hub](./reference/core/README.md) |
| See the executable corpus | [Rulesets](./src/rulesets/README.md) · [OPA policies](./src/rulesets/opa/README.md) · [Schemas](./src/rulesets/schema/README.md) |
| Choose or migrate a topology | [Topologies hub](./reference/core/architecture/topologies/README.md) |
| Use the CLI, MCP or REST | [Interfaces hub](./reference/core/interfaces/README.md) · [Evolith CLI hub](./product/products/smart-cli/README.md) |
| See the project's state | [Known limitations](./docs/known-limitations.md) · [Gap board](./reference/core/control-center/gaps/gap-tracking.md) · [Maturity](./reference/core/control-center/README.md) |
| Answer a specific question | [Q&A](./reference/core/sdlc/q-and-a.md) · [Glossary](./reference/core/sdlc/glossary/glossary-ecosystem.md) |
| Walk the whole corpus | [Master Index](./MASTER_INDEX.md) · [Product hub](./product/README.md) · [Repository Taxonomy](./reference/core/control-center/taxonomy/repository-taxonomy.md) |

---

## Contributing

**Start here:** [issues that are good for a first contribution](https://github.com/beyondnetcode/evolith_arch32/issues?q=is%3Aopen+label%3A%22good+first+issue%22) — most touch a single file. Unsure before opening a PR? [Discussions](https://github.com/beyondnetcode/evolith_arch32/discussions).

**Three ways to contribute without writing TypeScript:** correct a count that disagrees between docs and code · translate a hub into Spanish · add a rule to `src/rulesets/`.

Before the PR: [Contribution Guide](./CONTRIBUTING.md) · [Security Policy](./SECURITY.md) · [AGENTS.md](./AGENTS.md) · [CHANGELOG](./CHANGELOG.md)

---

## License

Released under the [MIT License](./LICENSE).
