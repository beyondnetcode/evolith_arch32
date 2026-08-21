<div align="center">

# Evolith Core

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

[![npm](https://img.shields.io/npm/v/@beyondnet/evolith-cli?label=%40beyondnet%2Fevolith-cli)](https://www.npmjs.com/package/@beyondnet/evolith-cli)
[![node](https://img.shields.io/node/v/@beyondnet/evolith-cli)](https://www.npmjs.com/package/@beyondnet/evolith-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/ci-cd.yml?branch=main&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/license-MIT-informational)](./LICENSE)

**Your architecture rules, running on every PR. A rule that was not evaluated is not a rule that passed.**

</div>

Evolith runs architecture rules — layering, dependencies, security, CI/CD, ADRs — against your repository from CI, and fails the PR. Unlike the rest, it tells you how many rules it **could not evaluate**, and if any of them was blocking, it fails anyway.

```bash
npx -y @beyondnet/evolith-cli init --name my-sat --yes   # writes evolith.yaml right here
npx -y @beyondnet/evolith-cli validate --engine opa      # expect findings: this is a baseline
```

This is what it prints, with nothing rounded up:

```
**Status:** failed
**Rules Checked:** 133
**Rules Skipped:** 26
**Rules Errored:** 0
**Rules Total:** 159
...
| SEC-INJ-01 | MUST | security | Blocking rule did not run: No shell exec with user input | YES |
...
| GOV-RULE-NOT-APPLICABLE | COULD | governance | 253 corpus rules do not apply to this repository | no |
**Selection:** {"source":"core-default","rulesSelected":412,"corpusTotal":412}
$ echo $?
2
```

72 issue rows, 37 blocking, **nine of them rules the engine could not decide** — reported as failures because an undecided blocking rule is not a rule that passed. Measured on 2026-08-21 with `@beyondnet/evolith-cli@1.3.2`; it takes ~2 s. [Full capture, all 72 rows and both denominators](./docs/evidence/first-run-capture.md).

[Quick Start](#quick-start) · [PR gate](#use-it-as-a-pr-gate) · [What it governs](#what-it-governs) · [Documentation](#documentation) · [Contribute](#contributing) · [Interactive atlas](https://beyondnetcode.github.io/evolith_arch32/)

---

## The idea, in one line

Every architecture linter paints the rules it never ran green: *coverage* and *compliance* end up the same colour. Evolith publishes the denominator and refuses to round it up. `skipped` is a first-class outcome; a blocking rule that ends `skipped` **fails the run** ([invariant with its own test](./src/packages/core-domain/src/application/validators/blocking-skipped-invariant.spec.ts)); and exit codes are a taxonomy: `0` pass · `1` the tool failed · `2` the gate blocked · `3` you invoked it wrong.

And we apply it to ourselves. Three things this front page could keep quiet and does not:

- **The two engines do not cover the same ground today.** `--engine opa` evaluates 133 of 159 rules; the default native evaluator evaluates 41 and skips 118, on the same repository. They are held to agreement over facts in CI, not over coverage — that part is by design; that the default command never says so is not ([#628](https://github.com/beyondnetcode/evolith_arch32/issues/628)). This page uses `--engine opa` everywhere.
- **Two infrastructure rules are in no denominator.** The loader rejects three ruleset files from its own corpus, and as of 1.3.2 it no longer even says so on stderr ([#575](https://github.com/beyondnetcode/evolith_arch32/issues/575)).
- **What installs is not everything this tree holds.** The tree carries 182 ruleset files; the published CLI loads 177 packs with 412 rules — the loader rejection above is one of the causes. `evolith rulesets` prints what *your* installation loads, pack by pack.

Full audit of our own claims: [pending items, 2026-08-16](./reference/core/control-center/adoption/pending-2026-08-16.md).

---

## Quick Start

**Requirements:** Node ≥ 18 for the CLI, ≥ 20 for the MCP server · no database, no server, no Docker. Installation is verified in CI on Linux; macOS and Windows are not covered by that gate.

```bash
npm install -g @beyondnet/evolith-cli   # or use `npx -y @beyondnet/evolith-cli` and install nothing

evolith init --name my-sat --yes        # configures the CURRENT directory; --name only names the project
evolith validate --engine opa           # same directory, no `cd` needed

evolith rulesets                        # what YOUR installation loads, pack by pack
evolith validate --engine opa --select rulesets/acl/anti-corruption-layer.rules.json
evolith validate --engine opa --phase qa
evolith adr create                      # manage Architecture Decision Records
```

`--engine opa` evaluates with the compiled Rego bundle; without the flag it runs the native evaluator, which covers less today. To create a new directory instead, pass it positionally: `evolith init my-sat --yes`. With `--format json` it never prompts and prints exactly one JSON object on stdout; `--dry-run` writes nothing.

> **Expect findings on the first run.** A freshly configured repository is a baseline, not a pass: many rules assume a fuller layout. To start from what you have actually adopted, use `--select` with the refs `evolith rulesets` prints; bringing the default to zero is tracked as GT-571 on the [gap board](./reference/core/control-center/gaps/gap-tracking.md).

Configuration lives in **`evolith.yaml`**, which `init` writes for you:

```yaml
coreRef: { version: "1.0.0", path: "../evolith" }
product: { name: my-sat, type: enterprise-application, phase: phase-0 }
tools:   { runtime: nodejs, architecture: clean, ci: github-actions }
```

**What it inspects:** repository structure, CI workflows, manifests and governance artifacts — not your code's AST. That makes it largely language-agnostic; the subset that looks at dependencies and linters assumes a Node/TypeScript repository. Reference: [Evolith CLI hub](./product/products/smart-cli/README.md) · [Quickstart guide](./docs/guides/evolith-quickstart.md)

---

## Use it as a PR gate

```yaml
- uses: beyondnetcode/evolith_arch32@v1
  with:
    fail-on-violation: true
```

Outputs `compliance-status`, `violations-count`, `issues-count`, `exit-code` and `report-path`. `error` and `invalid-input` mean the repository was **not evaluated** — they are not weaker forms of non-compliant, and the job summary says so in words.

As live context for an AI agent, over stdio:

```json
{ "mcpServers": { "evolith": { "command": "npx", "args": ["-y", "@beyondnet/evolith-mcp"] } } }
```

---

## Why not ArchUnit, Conftest or dependency-cruiser

Use them. They are good, and Evolith replaces none of them.

| Tool | What it does well | Where Evolith differs |
|---|---|---|
| **ArchUnit / ts-arch** | Layer and dependency rules as unit tests, in your language | Rules live outside the codebase as data: one library governs many repositories and an agent can read it |
| **Conftest / OPA** | Rego against any structured input | Evolith *is* OPA underneath. It adds the rule library, the ADR-to-rule derivation and the coverage accounting |
| **Backstage Scorecards** | Catalog-wide health checks with a UI | Runs offline in CI with no catalog to maintain, and blocks a PR rather than colouring a dashboard |

Against **dependency-cruiser**, the scope is broader (phase gates, architecture styles, security standards) and it keeps why each rule failed.

**What is NOT built yet, so you do not have to find out:** the "LLM proposes, a deterministic verifier disposes" half is a documented direction, not shipped behaviour. No command in the installed CLI reaches an LLM.

---

## What it governs

Eight **architecture styles** (we call them *topologies*) across five axes. The same rules follow you when the monolith splits into services.

| Axis | Topologies |
|---|---|
| Progressive | `modular-monolith` · `distributed-modules` · `microservices` |
| Integration | `event-driven` |
| Execution | `serverless` · `edge-computing` |
| Data | `data-mesh` |
| AI | `agentic-ai` |

On top runs a **free, MIT** library: in this tree, 142 ADRs, 182 ruleset files and 50 phase schemas, plus the five SDLC phases (Discovery → Design → Construction → QA → Delivery) and the gates that block the move from one to the next. Those three counts are measured and verified by CI on every PR. What your installation actually evaluates is printed by `evolith rulesets`: today, 177 packs with 412 rules, 188 of them able to fail a run. The only paid product will be **Evolith Tracker**, not yet launched.

<div align="center"><a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html" title="Open the interactive diagram"><img src="./reference/core/sdlc/assets/master-view.svg" alt="How the CLI, the Core and the five SDLC phases fit together" width="820" /></a><br/><sub><b><a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html">Open the interactive viewer</a></b> — drag to pan, scroll to zoom</sub></div>

---

## Product ecosystem

| Product | Role |
|---|---|
| **Evolith Core** | The rules themselves: files you can read, edit and version |
| **Evolith CLI** | Local application — validates the repo, runs phase gates, manages ADRs |
| **Core API** | REST service to query and evaluate governance remotely |
| **MCP Services** | Governance as live context for agents (52 tools, 12 resources, 8 prompts) |
| **Agent Runtime** | Drives the Core from an agent, through Ports and Adapters. Experimental |
| **Evolith Tracker** | Commercial lifecycle-governance product. Not yet launched |

**Who it is for:**

- Engineering teams that want their ADRs enforced in CI, not reviewed by hand.
- Platform teams blocking non-conformant artifacts before production.
- AI-assisted development that needs the agent to validate its output against the same rules.

**Adoption, unvarnished:** 1,109 npm downloads last month (2026-07-21 → 2026-08-19), no confirmed external adoption. The repository governs itself, and that is all the evidence there is.

---

## Network egress

Local-first: the CLI, the rules, the OPA policies and the evaluation Core run on your machine, and your code is never uploaded. There is exactly **one** outbound integration (`GeminiProvider`, Google Gemini API), it is **off by default**, and no command in the published CLI reaches it today. The tarballs on the registry predate that hardening: **treat the published `GeminiProvider` as ungoverned and do not wire it up.**

Full disclosure — sub-processors, credential, limits, redaction, what leaves and what does not, and the known limitations of these controls: [Network Egress and Data Handling](./SECURITY.md#network-egress-and-data-handling). Report an egress defect there, never in a public issue.

---

## Documentation

| To… | Go to |
|---|---|
| Start from your role | [Start by Role](./reference/core/foundations/inheritance-model/product-quick-start.md) |
| Understand the rules and ADRs | [Evolith Core hub](./reference/core/README.md) |
| See the executable corpus | [Rulesets](./src/rulesets/README.md) · [OPA policies](./src/rulesets/opa/README.md) · [Schemas](./src/rulesets/schema/README.md) |
| Choose or migrate a topology | [Topologies hub](./reference/core/architecture/topologies/README.md) |
| Use the CLI, MCP or REST | [Interfaces hub](./reference/core/interfaces/README.md) |
| See the project's real state | [Gap board](./reference/core/control-center/gaps/gap-tracking.md) · [Maturity](./reference/core/control-center/README.md) |
| Answer a specific question | [Q&A — 43 questions in 12 categories](./reference/core/sdlc/q-and-a.md) · [Glossary](./reference/core/sdlc/glossary/glossary-ecosystem.md) |
| Know what goes where | [Repository Taxonomy](./reference/core/control-center/taxonomy/repository-taxonomy.md) |
| Walk the whole corpus | [Master Index](./MASTER_INDEX.md) · [Product hub](./product/README.md) · [Operations](./product/operations/README.md) |

---

## Contributing

**Start here:** [issues that are good for a first contribution](https://github.com/beyondnetcode/evolith_arch32/issues?q=is%3Aopen+label%3A%22good+first+issue%22) — most touch a single file. Unsure before opening a PR? [Discussions](https://github.com/beyondnetcode/evolith_arch32/discussions).

**Three ways to contribute without writing TypeScript:** correct a count that disagrees between docs and code · translate a hub into Spanish · add a rule to `src/rulesets/`.

Before the PR: [Contribution Guide](./CONTRIBUTING.md) · [Security Policy](./SECURITY.md) · [AGENTS.md](./AGENTS.md) · [CHANGELOG](./CHANGELOG.md)

---

## License

Released under the [MIT License](./LICENSE).
