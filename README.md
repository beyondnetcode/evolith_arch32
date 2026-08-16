<div align="center">

# Evolith Core

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

[![npm](https://img.shields.io/npm/v/@beyondnet/evolith-cli?label=%40beyondnet%2Fevolith-cli)](https://www.npmjs.com/package/@beyondnet/evolith-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/ci-cd.yml?branch=main&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/license-MIT-informational)](./LICENSE)

**Executable architecture governance. A rule that was not evaluated is not a rule that passed.**

</div>

```bash
npm install -g @beyondnet/evolith-cli
evolith init --name my-sat --yes
evolith validate --engine opa
```

[Quick Start](#quick-start) · [Interactive architecture atlas](https://beyondnetcode.github.io/evolith_arch32/) · [How we audit our own claims](./reference/core/control-center/adoption/pending-2026-08-16.md)

---

## What just happened

That third command evaluated this repository's own rule corpus against a freshly initialized
satellite, using the compiled Rego bundle. Real output, from `@beyondnet/evolith-cli@1.3.0`
in a container with nothing but Node installed:

```
Rules: 133 checked / 26 skipped / 0 errored / 159 total
37 blocking issue(s)
exit code 2

  26 rule(s) were NOT evaluated - their result is UNKNOWN, not passed.
```

The Core carries **412 rules**; the 159 above is what this one satellite's run selected from
them. Two different denominators, and a report that blurred them would be the exact defect
this project exists to stop.

**Nine of those 37 blocking issues are rules that were skipped.** Not rules that failed --
rules the engine could not decide, reported as failures because an undecided blocking rule
is not a passing one. Among them are `SEC-INJ-01`, `SEC-INJ-02` and `SEC-PATH-01`.

This is the whole idea. Every architecture and policy linter silently passes the rules it
never evaluated, so *coverage* and *compliance* produce the same green. Evolith publishes the
denominator and refuses to round it up:

- The compiled bundle declares which rule ids it can decide, and `skipped` is a first-class
  outcome rather than the absence of a violation.
- A blocking rule that ends `skipped` fails the run. That invariant has its own test, written
  against the code that did not have it: [`blocking-skipped-invariant.spec.ts`](./src/packages/core-domain/src/application/validators/blocking-skipped-invariant.spec.ts).
- Two engines -- a native TypeScript evaluator and Rego/WASM -- must agree on fixtures, or CI
  fails.

Exit codes are a taxonomy, not a boolean: `0` pass, `1` the tool failed, `2` the gate blocked,
`3` you invoked it wrong. A run that could not produce a verdict never reports one.

---

## Use it as a PR gate

```yaml
- uses: beyondnetcode/evolith_arch32@v1
  with:
    fail-on-violation: true
```

Outputs `compliance-status`, `violations-count`, `issues-count`, `exit-code` and
`report-path`. `error` and `invalid-input` mean the repository was **not evaluated** -- they
are not weaker forms of non-compliant, and the job summary says so in words.

As live context for an AI agent, over stdio:

```json
{ "mcpServers": { "evolith": { "command": "npx", "args": ["-y", "@beyondnet/evolith-mcp"] } } }
```

---

## Why not ArchUnit, Conftest or dependency-cruiser?

Use them. They are good, and Evolith is not a replacement for any of them.

| Tool | What it does well | Where Evolith differs |
|---|---|---|
| **ArchUnit / ts-arch** | Layer and dependency rules as unit tests, in your language | Rules live outside the codebase as data, so the same corpus governs many repositories and an agent can read it |
| **Conftest / OPA** | Rego against any structured input | Evolith *is* OPA underneath. What it adds is the corpus, the ADR-to-rule derivation, and the coverage accounting |
| **dependency-cruiser** | Dependency graph rules, fast and focused | Broader corpus (SDLC gates, topologies, security standards), and an evidence trail per verdict |
| **Backstage Scorecards** | Catalog-wide health checks with a UI | Runs offline in CI with no catalog to maintain, and blocks a PR rather than colouring a dashboard |

**Where it is genuinely different:** it reports what it could not evaluate. None of the tools
above distinguishes "this rule passed" from "this rule never ran" in their exit status.

**What is not built yet, so you do not have to discover it:** the "LLM proposes, a
deterministic verifier disposes" half is a documented direction, not shipped behaviour. No
command in the installed CLI reaches an LLM. See [Network Egress and Data Handling](#network-egress-and-data-handling).

---

## Menu

- [What is Evolith?](#what-is-evolith)
- [Why Evolith?](#why-evolith)
- [Core Concepts](#core-concepts)
- [Product Ecosystem](#product-ecosystem)
- [How It Works](#how-it-works)
- [Architecture Overview](#architecture-overview)
- [Main Components](#main-components)
- [Quick Start](#quick-start)
- [Questions & Answers](#questions--answers)
- [Network Egress and Data Handling](#network-egress-and-data-handling)
- [Documentation](#documentation)
- [Use Cases](#use-cases)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What is Evolith?

Evolith is an **executable architectural governance framework**. It encodes how software is built — across multiple architecture styles — as verifiable rules, ADRs, and phase gates that teams, platforms, and AI agents can actually run.

Governance in Evolith is not a document. It is an operational capability exposed through a CLI, an MCP server, and a REST API.

---

## Why Evolith?

Most projects accumulate ADRs and architecture docs that nobody reads and nobody enforces. Systems drift. Decisions are forgotten. Consistency breaks silently.

Evolith makes governance **executable**:

- Rules are validated automatically, not reviewed manually.
- Phase gates block progression until quality criteria are met.
- AI agents and CI pipelines consume the same governance artifacts as humans.
- Architecture decisions are traceable from ADR to production code.

---

## Core Concepts

| Concept | What it is |
|---|---|
| **SDLC Phases** | The five stages from idea to production: Discovery → Design → Construction → QA → Delivery |
| **Gates** | Automated checkpoints that close each phase before the next begins |
| **Topologies** | Architecture styles (e.g., modular monolith, microservices, event-driven, agentic-AI) |
| **ADRs** | Architecture Decision Records — the authoritative log of architectural choices |
| **Blueprints** | Canonical design templates for each topology |
| **Rulesets** | Machine-readable rules enforced by the CLI and Core API |
| **OPA Policies** | Open Policy Agent policies for fine-grained governance checks |
| **Artifacts** | Structured outputs at each phase: specs, schemas, manifests, contracts |
| **AI Agents** | Specialized agents (Winston and others) that participate in the SDLC as first-class contributors |

Full details: [Core Concepts](./reference/core/README.md) · [Topologies](./reference/core/architecture/topologies/README.md)

---

## Product Ecosystem

Evolith ships as a suite of coordinated products built on a common foundation.

| Product | Role |
|---|---|
| **[Evolith Core](reference/README.md)** | Provider-neutral constitution: principles, ADRs, rulesets, topologies, and contracts |
| **[Evolith CLI](product/products/smart-cli/README.md)** | Local enforcement — validate code, run gates, manage ADRs, serve MCP |
| **[Core API](product/products/core-api/README.md)** | REST service for remote governance queries and evaluation |
| **[MCP Services](product/products/mcp-services/README.md)** | Governance as live context for LLMs and AI agents (52 tools, 12 resources, 8 prompts) |
| **[Agent Runtime](reference/core/architecture/foundations/README.md)** | Agentic mediation layer — orchestrates Core through Ports & Adapters; Hermes is one replaceable adapter |
| **[Evolith Tracker](product/products/evolith-tracker/README.md)** | Business lifecycle governance — phases, owners, funding, and ROI |
| **[Commercial Vision](product/suite/vision/evolith-commercial-brochure.md)** | Product strategy and enterprise monetization narrative (Hub & Spoke deployment) |
| **[Rulesets](src/rulesets/README.md)** | Machine-readable enforcement rules per topology |
| **[OPA Policies](src/rulesets/opa/README.md)** | Fine-grained policy checks integrated into the pipeline |
| **[Schemas & Manifests](src/rulesets/schema/README.md)** | Structured contracts for artifacts and topology definitions |

---

## How It Works

```
Developer / AI Agent / External Trigger
        │
        ▼
  Evolith CLI  ──────────────────────────────► MCP Server
  (local enforcement)                        (AI agent context)
        │
        ▼
   Core API  ────────────────────────────►  Evolith Tracker
  (remote governance)                        (business lifecycle)
        │
        ▼
  Agent Runtime ───────────────────────────► Hermes (adapter)
  (agentic mediation, Ports & Adapters)       (.harness · OPA · Tracker · Memory)
        │
        ▼
  Rulesets · OPA Policies · ADRs · Blueprints
  (the shared governance artifacts)
```

1. **Evolith CLI** validates code locally against rulesets and runs phase gates.
2. **Core API** exposes the same governance remotely for CI pipelines and orchestrators.
3. **MCP Server** feeds governance context to LLMs and AI agents in real time.
4. **Agent Runtime** orchestrates Core capabilities through a Ports & Adapters model — Hermes is one replaceable adapter.
5. **Evolith Tracker** coordinates the business side — who owns what, what's funded, what ships when.

All products share the same artifacts defined in **Evolith Core**.

---

<div align="center">

<a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html" title="Open the interactive diagram - pan and zoom">
  <img src="./reference/core/sdlc/assets/master-view.svg"
       alt="Evolith E2E Product Vision - Governed Composition, stateless evaluation Core, federated five-phase SDLC"
       width="880" />
</a>

<sub>Evolith E2E Product Vision - <b><a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html">Open interactive viewer</a></b> - drag to pan, scroll to zoom, fullscreen</sub>

</div>

## Architecture Overview

Evolith governs **8 topologies** across four axes:

| Axis | Topologies |
|---|---|
| Progressive | `modular-monolith` · `distributed-modules` · `microservices` |
| Integration | `event-driven` |
| Execution | `serverless` · `edge-computing` |
| Data | `data-mesh` |
| AI | `agentic-ai` |

Each topology has its own ADRs, OPA policies, AI rulesets, and UMS contracts. Systems migrate between topologies as the business scales — this is **Progressive Architecture**.

Full reference: [Architecture hub](./reference/core/architecture/README.md) · [C4 Master Architecture](./reference/core/architecture/demos/C4-MASTER-ARCHITECTURE.md)

---

## Main Components

```
evolith/
├── src/packages/agent-runtime/  # @beyondnet/evolith-agent-runtime — Ports & Adapters agentic layer
├── src/apps/agent-runtime-api/  # NestJS HTTP service wrapping the runtime (POST /v1/agent/handle)
├── reference/core/          # Engineering constitution and principles
├── reference/core/architecture/  # Topologies, blueprints, ADRs, and agent-runtime docs
├── reference/core/sdlc/    # SDLC phases, gates, standards, and glossary
├── product/products/      # Evolith CLI, Core API, MCP, Tracker, UMS
└── product/operations/    # SRE, infra, quality gates
```

Entry point for each area: [Global Master Index](./reference/core/control-center/taxonomy/MASTER_INDEX.md)

---

## Quick Start

The npm package is `@beyondnet/evolith-cli`; it installs two equivalent bins, **`evolith`** (the documented name) and `evolith-cli` (compatibility). Both self-identify as `evolith` in `--help`.

```bash
# 1. Install the CLI
npm install -g @beyondnet/evolith-cli

# 2. Initialize the CURRENT directory as an Evolith satellite.
#    --name sets the project name written into evolith.yaml.
#    --yes runs without prompts (also implied by a non-TTY stdin or --format json).
evolith init --name my-sat --yes

# 3. Validate the satellite you just created — same directory, no `cd` needed
evolith validate

# Validate a specific SDLC phase
evolith validate --phase qa

# Manage Architecture Decision Records
evolith adr create
evolith adr list

# Serve governance as live context for AI agents — the MCP server ships as a
# separate package (@beyondnet/evolith-mcp) with its own bin:
evolith-mcp serve
```

To scaffold into a **new** directory instead of the current one, pass it as the positional argument (or via `--dir`); `--name` only ever names the project, it never creates a directory:

```bash
evolith init my-sat --yes && cd my-sat && evolith validate
```

Machine-readable runs (`--format json`) never prompt and print exactly one envelope on stdout; a failed `init` exits non-zero. `evolith init --dry-run` writes nothing.

> **Expect findings on the first `validate`.** A freshly initialized satellite is a baseline, not a pass: some rules still assume a fuller repository layout and report blocking findings on a phase-0 project. Reducing that to zero is tracked on the [Gap Tracking Board](./reference/core/control-center/gaps/gap-tracking.md) (GT-571).

Evolith CLI is configured via **`evolith.yaml`**; run `evolith --help` for the current command list. Full reference: [Evolith CLI hub](./product/products/smart-cli/README.md)

---

## Questions & Answers

<details>
<summary><b>What is Evolith in one sentence?</b></summary>
<br/>
Evolith is an <b>executable architectural governance framework</b> — it makes sure architecture decisions actually get followed, automatically, whether the code is written by a human or an AI agent.
</details>

<details>
<summary><b>What would I use it for?</b></summary>
<br/>
<ol>
<li><b>Instant feedback</b> on architecture decisions — run <code>evolith validate</code> and know in seconds if your code follows your team's rules.</li>
<li><b>No more surprise refactors</b> — architecture drift is caught at the gate, not six months later.</li>
<li><b>AI-proof governance</b> — when an AI agent writes code, Evolith ensures it follows the same rules a senior architect would enforce.</li>
</ol>
</details>

<details>
<summary><b>How much does it cost?</b></summary>
<br/>
The core platform is <b>completely free</b> (MIT license): CLI, MCP server, Core API, Agent Runtime, 142 ADRs, 181 ruleset files carrying 412 rules, 50 phase-gate schemas. The only paid product is <b>Evolith Tracker</b> (enterprise multi-tenant governance — not yet released).
</details>

<details>
<summary><b>How do I get started?</b></summary>
<br/>

```bash
npm install -g @beyondnet/evolith-cli
evolith init --name my-sat --yes   # initializes the CURRENT directory
evolith validate                   # same directory, no `cd`
```

No database, no server, no Docker required.
</details>

<details>
<summary><b>What topologies does it cover?</b></summary>
<br/>
Evolith governs <b>8 topologies</b> across 5 dimensions: Modular Monolith, Distributed Modules, Microservices (progressive-axis), Serverless, Edge Computing (execution), Event-Driven (integration), Data Mesh (data), and Agentic AI. All are composable.
</details>

<details>
<summary><b>How does it work with AI tools like Cursor or Claude?</b></summary>
<br/>
Evolith ships an MCP server inside the CLI. Add it to your AI tool's config and your agent can query architecture rules, validate code, and evaluate gate readiness — all without bypassing governance.
</details>

**[Full Q&A: 64 questions across 12 categories →](./reference/core/sdlc/q-and-a.md)**

---

## Network Egress and Data Handling

Evolith is local-first: the CLI, the rulesets, the OPA policies and the stateless evaluation Core all run on your machine, and your source files are never uploaded — evaluation happens where the code is. There is exactly **one** outbound integration in the corpus, it is **off by default**, and this is its complete disclosure.

| Item | Disclosure |
|---|---|
| **Component** | `GeminiProvider`, a public export of `@beyondnet/evolith-agent-runtime` |
| **Endpoint** | one HTTPS `POST` to `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`, default model `gemini-2.5-flash`. No other host is contacted by the package. |
| **Sub-processor** | **Google LLC (Gemini API)**. Prompt content sent through this path is processed by Google under its terms for that API. No other sub-processor is involved. |
| **Default state** | **DISABLED.** With no configuration the provider opens no socket: it records the refused attempt and throws `LlmEgressDisabledError`. Out of the box the package makes zero network calls. |
| **Opt-in** | `EVOLITH_LLM_EGRESS=true` (or `1`), or an explicit `new GeminiProvider({ enabled: true })`. There is no implicit way to arm it. |
| **Credential** | `EVOLITH_LLM_API_KEY`, falling back to `GEMINI_API_KEY`. It travels in the `x-goog-api-key` request header and never in the URL. Without a key the call is refused before a socket opens. |
| **Limits** | 30,000 ms `AbortController` timeout; 60,000 bytes / ~15,000 estimated tokens. Over budget the request **fails closed** — nothing is truncated and sent anyway. |

**What leaves the machine**

- Through the governed `IAssistantTransport` seam: the request intent, the optional tool id, the request parameters, the `dryRun` flag, and the governed skill catalog (id and description only).
- Through the deprecated `ILLMProvider` seam (`generateStructuredJson`): the caller's system prompt and user prompt, verbatim.
- Both are secret-redacted before serialization, over 8 pattern classes: PEM private keys, JWTs, AWS access key ids, Google API keys, GitHub PATs, Slack tokens, `Bearer` tokens, and generic `KEY`/`SECRET`/`TOKEN`/`PASSWORD` assignments.

**What does not leave the machine**

Tenant id, product id, initiative id, workspace reference and requester identity are excluded from the transport payload by construction (data minimization), as are repository contents.

**Observability**

Every attempt — including refusals — emits one content-free JSON line prefixed `[evolith:llm-egress]` with provider, endpoint, purpose, outcome, byte and token counts, redaction count, HTTP status, duration and correlation id. Prompt and response content are never logged.

**Human-in-the-loop**

The intended wiring injects `GeminiProvider` as the `IAssistantTransport` of `SupervisedAssistantClient`, which is itself off by default and requires an explicit human approval before the transport is reached.

**Other outbound traffic**

- **OpenTelemetry export** from the CLI is off unless `OTEL_ENABLED=true`, and then it goes only to the collector you configure.
- **Core API / MCP HTTP transport** are servers you host; the CLI contacts a remote Core only when you configure one.
- No telemetry, analytics or licence check is phoned home by any surface.

**Honest current state**

- Redaction is pattern-based, not a DLP control: it materially reduces accidental credential egress, it does not guarantee absence.
- The header, timeout, budget, redaction and schema-validation controls are covered by unit tests with an injected `fetch`; they have **not** been exercised against the live Google endpoint.
- The timeout and budget values are inherited from the repository's own CI reviewer and are not tuned for large interactive prompts, which fail closed rather than degrade.
- No command registered in the shipped CLI reaches this provider today, so a default CLI install performs no LLM egress at all.
- The npm tarballs currently published predate this hardening; the controls above are on `develop` and reach the registry with the next release, tracked as GT-570 on the [Gap Tracking Board](./reference/core/control-center/gaps/gap-tracking.md).

Report a suspected egress or disclosure defect through the [Security Policy](./SECURITY.md), never in a public issue.

---

## Documentation

| Area | Link |
|---|---|
| Core constitution | [Evolith Core hub](./reference/core/README.md) |
| Product corpus | [Product hub](./product/README.md) |
| Interface how-to (CLI / MCP / REST) | [Interface guides](./reference/core/interfaces/README.md) |
| Master Architecture | [C4 Master Architecture](./reference/core/architecture/demos/C4-MASTER-ARCHITECTURE.md) |
| SDLC governance | [SDLC Governance Center](./reference/core/sdlc/README.md) |
| Topologies | [Topologies hub](./reference/core/architecture/topologies/README.md) |
| Evolith CLI | [Evolith CLI hub](./product/products/smart-cli/README.md) |
| Core API | [Core API hub](./product/products/core-api/README.md) |
| MCP Services | [MCP Services hub](./product/products/mcp-services/README.md) |
| Agent Runtime | [Agent Runtime hub](./reference/core/architecture/foundations/README.md) |
| Evolith Tracker | [Tracker hub](./product/products/evolith-tracker/README.md) |
| Operations & SRE | [Operations hub](./product/operations/README.md) |
| Onboarding by role | [Getting Started by Role](./reference/core/foundations/inheritance-model/product-quick-start.md) |
| Ecosystem glossary | [Glossary](./reference/core/sdlc/glossary/glossary-ecosystem.md) |
| Questions & Answers | [Q&A](./reference/core/sdlc/q-and-a.md) |
| Gap tracking | [Gap Tracking Board](./reference/core/control-center/gaps/gap-tracking.md) |
| Opportunities | [Opportunities Board](./reference/core/control-center/opportunities/README.md) |
| All artifacts | [Global Master Index](./reference/core/control-center/taxonomy/MASTER_INDEX.md) |

---

## Use Cases

**For engineering teams**
Enforce architecture decisions automatically. Run phase gates in CI. Keep ADRs alive and traceable.

**For platform teams**
Query governance remotely via Core API. Integrate rulesets into deployment pipelines. Block non-compliant artifacts before they reach production.

**For AI-assisted development**
Feed governance context to LLMs through MCP. Let AI agents validate their own outputs against architecture rulesets before committing.

**For growing products**
Start with a modular monolith. Migrate to distributed modules or microservices when the business demands it — Evolith tracks the transition and enforces consistency at every step.

---

## Roadmap

See the active gap tracking board for current priorities and open items:

- [Gap Tracking Board](./reference/core/control-center/gaps/gap-tracking.md)
- [Opportunities Board](./reference/core/control-center/opportunities/README.md)
- [Maturity & Gaps hub](./reference/core/control-center/README.md)

---

## Contributing

Read these before opening a PR:

- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [AGENTS.md](./AGENTS.md) — conventions for AI agent contributors
- [Repository Taxonomy](./reference/core/control-center/taxonomy/repository-taxonomy.md) — what goes where

---

## License

Published under the [MIT License](./LICENSE).

---

<div align="center">
  <sub>Evolith — Executable Architectural Governance Framework | Multi-Topology Reference Corpus | Spec-driven AI-DD</sub>
</div>
