# Evolith Core — Questions & Answers

> **Bilingual Navigation:** [Versión en Español](./q-and-a.es.md)

**Status:** Active Reference
**Owner:** Evolith Architecture Board
**Created:** 2026-07-23
**Last Updated:** 2026-07-23

This Q&A answers the most common questions about Evolith Core in plain language, with concrete examples and links to evidence. It is organized by topic and covers both conceptual understanding and practical use.

**How to use this document:** Browse by category or search for a specific question. Each answer links to its source evidence (ADRs, assessment sections, schemas) for deeper reading.

---

## Category 1: About Evolith — What Is This?

### T01-P01: What is Evolith in one sentence?

**Question:** If you had to explain Evolith to someone in 10 seconds, what would you say?

**Answer:** Evolith is an **executable architectural governance framework** — it makes sure that architecture decisions actually get followed, automatically, whether the code is written by a human or an AI agent.

Think of it as a "constitution" for your software: it defines the rules, and then automatically checks that every piece of code, every deployment, and every decision follows those rules.

**Example:** Imagine your team decides "all services must use schema-per-context." Evolith encodes that decision as a machine-readable rule, and then automatically blocks any PR that shares a database table across contexts.

**Evidence:** [ADR-0079 (Multi-Topology Reference Corpus)](../architecture/adrs/core/0079-multi-topology-reference-corpus.md), [README.md](../../README.md)

### T01-P02: What would I use it for?

**Question:** I'm a developer. Why would I care about Evolith?

**Answer:** Evolith gives you three practical things:

1. **Instant feedback on architecture decisions.** Run `evolith validate` and know in seconds if your code follows your team's architectural rules — before you even push.
2. **No more "surprise" refactors.** Architecture drift is caught at the gate, not six months later when someone discovers the system is a tangled mess.
3. **AI-proof governance.** When an AI agent writes code for you, Evolith ensures it follows the same rules a senior architect would enforce.

**Example:** You're working on a modular monolith. An AI agent generates a PR that accidentally imports a domain object from another bounded context. Evolith's boundary rule catches this immediately — the PR is blocked with a clear explanation of which rule was violated and why.

**Evidence:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md), [ADR-0002 (Clean Architecture)](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)

### T01-P03: What benefits does it give me as a developer?

**Question:** What's in it for me personally, not just the team?

**Answer:**

- **Faster onboarding.** Instead of reading 50 pages of wiki, you run `evolith validate` and the system tells you exactly what's wrong and how to fix it.
- **Confidence in PRs.** You know that if Evolith passes, your code follows the architecture. No more guessing.
- **Less context switching.** Evolith consolidates rules from multiple sources (ADRs, patterns, schemas) into one command.
- **AI integration.** If you use Cursor, Claude Desktop, or any MCP-compatible tool, Evolith feeds governance context directly to your AI assistant.

**Example:** A new team member runs `evolith validate --topology modular-monolith` and gets a clear report: "3 violations found: cross-context import (GT-19), missing unit test plan (GT-42), unversioned dependency (GT-33)." Each violation links to the rule and the ADR that explains *why*.

**Evidence:** [Evolith CLI hub](../../../product/products/smart-cli/README.md), [Using the CLI guide](../interfaces/using-the-cli.md)

### T01-P04: What benefits does it give me as an architect?

**Question:** I'm the architect. How does Evolith help me?

**Answer:**

- **Enforce decisions automatically.** Your ADRs become machine-readable rules, not documents people forget to read.
- **Measure architecture health.** The maturity assessment gives you a score (3.32/5) with evidence-backed claims, not gut feelings.
- **Track deviations.** 568 governance gaps tracked, 554 closed — you have a precise inventory of what's done and what's not.
- **Multi-topology support.** Whether your product is a monolith, event-driven, serverless, or a combination, Evolith governs all of them with the same framework.

**Example:** You approve ADR-0031 (Schema Per Context). Evolith automatically creates a rule that blocks cross-schema joins in CI. Six months later, the maturity assessment shows "Schema Per Context: Validated" with evidence of 121 E2E tests passing.

**Evidence:** [Maturity Assessment (Section 8)](../control-center/maturity-reports/maturity-assessment.md), [ADR Matrix](../architecture/adrs/adr-matrix.md)

### T01-P05: What benefits does it give me as a team lead or manager?

**Question:** I manage the team. What's the business value?

**Answer:**

- **Predictable delivery.** Phase gates enforce quality at each stage — surprises are caught early when they're cheap to fix.
- **Audit trail.** Every architectural decision is documented (ADRs), every gap is tracked (GT-xx items), and every closure has verifiable evidence (git commits + validation commands).
- **Reduced risk.** Anti-pattern immunizations prevent the six highest-risk architectural mistakes (distributed monolith, shared database, etc.).
- **Cost avoidance.** Architecture drift, rework, and emergency refactors are the hidden costs of software. Evolith prevents them systematically.

**Example:** Before Evolith, your team spent 3 weeks refactoring a "distributed monolith" that had crept in over 6 months. After Evolith, the async event bus rule (ADR-0015) would have caught the first synchronous cross-module chain at the PR stage.

**Evidence:** [Anti-Pattern Immunization (Section 7)](../control-center/maturity-reports/maturity-assessment.md), [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)

### T01-P06: Is it the same as a linter or static analyzer?

**Question:** How is Evolith different from ESLint, SonarQube, or Checkstyle?

**Answer:** Linters check code style and simple patterns. Evolith checks **architecture decisions** — the high-level choices that shape your system.

| | Linter (ESLint) | Static Analyzer (SonarQube) | Evolith |
|---|---|---|---|
| **Scope** | Code style, syntax | Code quality, bugs, vulnerabilities | Architecture rules, governance, topology compliance |
| **Enforcement** | Local IDE, CI | CI pipeline | CI + gates + MCP + agents |
| **Source of rules** | Config files | Built-in rules + plugins | ADRs, topologies, schemas (your own decisions) |
| **Dual-engine** | No | No | Yes (Native TypeScript + OPA) |
| **AI integration** | No | Limited | Full MCP server for AI agents |

**Example:** SonarQube catches a code smell. Evolith catches that your module is importing from a bounded context it doesn't own — a decision-level violation that no linter would see.

**Evidence:** [ADR-0041 (Dual-Engine Policy Evaluation)](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md), [Maturity Assessment (Section 4)](../control-center/maturity-reports/maturity-assessment.md)

### T01-P07: Do I need to be an architecture expert to use it?

**Question:** This sounds complex. Can a junior developer use it?

**Answer:** Yes. Evolith is designed to be consumed at different levels:

- **As a developer:** Run `evolith validate` and fix what it reports. You don't need to understand the full architecture — just follow the feedback.
- **As a tech lead:** Use `evolith gate` to check phase readiness. The system tells you exactly what's missing.
- **As an architect:** Use `evolith drift` to detect architecture drift over time. This is where deep architectural knowledge matters.

The CLI, MCP tools, and AI integration all provide graduated complexity — simple commands for simple needs, deep analysis when you need it.

**Example:** A junior developer runs `evolith validate` and gets: "PASS — no violations found." They push with confidence. A senior architect runs `evolith drift --topology modular-monolith` and gets a detailed report on boundary compliance trends.

**Evidence:** [Using the CLI guide](../interfaces/using-the-cli.md), [Evolith CLI hub](../../../product/products/smart-cli/README.md)

---

## Category 2: Products and Pricing

### T02-P01: What products does Evolith have?

**Question:** What are the different pieces of Evolith?

**Answer:** Evolith has these products:

| Product | What It Is | Cost |
|---|---|---|
| **Evolith Core** | The foundation: rules, ADRs, standards, schemas, rulesets, OPA policies | Free (MIT) |
| **Evolith CLI** | Command-line governance: validate, scaffold, drift detection, gates | Free (MIT, npm) |
| **Core API** | REST service for remote governance queries | Free (open source) |
| **MCP Services** | AI tool integration via Model Context Protocol | Free (ships inside CLI) |
| **Agent Runtime** | Hexagonal orchestration layer for AI agents | Free (open source) |
| **UMS Reference** | Example satellite project showing adoption | Free (open source) |
| **Evolith Tracker** | Enterprise SDLC orchestrator with multi-tenant governance | Paid (Enterprise) |

**Evidence:** [Product hub](../../../product/README.md), [Ecosystem and Communication](../../../product/products/ecosystem-and-communication.md)

### T02-P02: How much does it cost? Is it paid?

**Question:** Do I have to pay for Evolith?

**Answer:** The core platform is **completely free** under the MIT license. This includes:

- All 137 ADRs, 163 rulesets, 45 schemas, 34+ OPA policies
- The CLI (`npm install -g @beyondnet/evolith-cli`)
- The MCP server (built into the CLI)
- The Core API (REST service)
- The Agent Runtime
- The UMS reference implementation

The only paid product is **Evolith Tracker**, which is the enterprise orchestration layer (not yet released).

**Example:** A 5-person startup can use the full Evolith governance stack for $0. A 500-person enterprise that needs multi-tenant governance, immutable audit trails, and compliance packs would pay for Tracker.

**Evidence:** [Open-Core Strategy (Section 9)](../control-center/maturity-reports/maturity-assessment.md), [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)

### T02-P03: What is "Open-Core" and what does the free tier cover?

**Question:** What does "open-core" mean in practice?

**Answer:** Open-Core means the foundational platform is open source and free, while enterprise features are monetized separately.

**Free tier (Core + CLI + MCP + API):**
- Full architectural governance engine
- All rules, schemas, and OPA policies
- CLI validation and scaffolding
- MCP integration for AI tools
- REST API for remote queries
- Community adapter SDK

**Paid tier (Tracker):**
- Multi-tenant governance
- Immutable audit history
- Configurable gates, policies, exceptions, approvals
- Certified integrations
- Enterprise support and SLA

**Example:** Your team uses the free CLI and MCP tools daily. When you need to prove compliance to an auditor across 20 repositories with immutable evidence trails, that's when Tracker adds value.

**Evidence:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md), [Tracker hub](../../../product/products/evolith-tracker/README.md)

### T02-P04: What is Evolith Tracker and why is it paid?

**Question:** What does Tracker do that Core doesn't?

**Answer:** Core is the **engine** — it evaluates rules, gates, and policies. Tracker is the **control room** — it orchestrates who runs what, when, and records the evidence permanently.

| Capability | Core (Free) | Tracker (Paid) |
|---|---|---|
| Rule evaluation | Yes | Yes (via Core API) |
| Multi-tenant governance | No | Yes |
| Immutable audit trail | No | Yes |
| Configurable gates/policies | Basic | Full |
| Exception/approval workflows | No | Yes |
| Compliance packs (SOC2, ISO) | No | Yes |
| Executive dashboards | No | Yes |

**Note:** Tracker is still in design stage — no source code exists yet. Core's obligation is the API/MCP contract it will consume.

**Evidence:** [Tracker hub](../../../product/products/evolith-tracker/README.md), [Maturity Assessment (Section 9)](../control-center/maturity-reports/maturity-assessment.md)

### T02-P05: Do I need special infrastructure to use it?

**Question:** Do I need Kubernetes, a database, or a server?

**Answer:** No. The core workflow is:

```bash
npm install -g @beyondnet/evolith-cli
evolith init
evolith validate
```

That's it. No database, no server, no Docker required. The CLI runs locally and validates your repository.

The MCP server also ships inside the CLI — no separate deployment needed. The Core API is optional and only needed if you want remote governance queries.

**Evidence:** [Using the CLI guide](../interfaces/using-the-cli.md), [MCP Services hub](../../../product/products/mcp-services/README.md)

### T02-P06: How does it compare to tools like SonarQube or Checkstyle?

**Question:** We already use SonarQube. Why would we add Evolith?

**Answer:** They solve different problems and complement each other:

| | SonarQube | Evolith |
|---|---|---|
| **Focus** | Code quality, bugs, vulnerabilities | Architecture governance, topology compliance |
| **Granularity** | Line-by-line code analysis | Module-level, topology-level, system-level |
| **Rules source** | Built-in + plugins | Your own ADRs and decisions |
| **AI integration** | Limited | Full MCP server for AI agents |
| **Gate enforcement** | CI quality gate | SDLC phase gates (5 gates, evidence-based) |

**Example:** SonarQube catches a potential null pointer. Evolith catches that your new service is importing from three different bounded contexts — creating coupling that will cause problems in 6 months.

**Evidence:** [Maturity Assessment (Section 4)](../control-center/maturity-reports/maturity-assessment.md), [ADR-0005 (Automated SAST)](../architecture/adrs/core/0005-automated-sast-quality-gates.md)

---

## Category 3: Getting Started (How-to)

### T03-P01: How do I install the Evolith CLI?

**Question:** What's the fastest way to get started?

**Answer:**

```bash
npm install -g @beyondnet/evolith-cli
evolith --version
```

Requirements: Node.js >= 20.0.0. That's the only prerequisite.

**Evidence:** [Evolith CLI hub](../../../product/products/smart-cli/README.md)

### T03-P02: How do I initialize a project with Evolith?

**Question:** I have an existing project. How do I connect it to Evolith?

**Answer:**

```bash
cd your-project
evolith init
```

This creates an `evolith.yaml` manifest that declares your topology, inherited rules, and phase configuration. The system validates your project against the rules from that point forward.

**Example:** For a modular monolith: `evolith init --topology modular-monolith`. For a project that's event-driven: `evolith init --topology modular-monolith --compose event-driven`.

**Evidence:** [Topology Dimensions Model](../architecture/topologies/topology-dimensions.md), [ADR-0079](../architecture/adrs/core/0079-multi-topology-reference-corpus.md)

### T03-P03: How do I validate that my code follows the rules?

**Question:** What command checks if my code is compliant?

**Answer:**

```bash
evolith validate
```

This runs all applicable rules against your project and reports violations with clear explanations. You can scope it:

```bash
evolith validate --topology modular-monolith    # Topology-specific rules
evolith validate --phase construction            # SDLC phase rules
evolith validate --adr 0031                      # Specific ADR compliance
```

**Evidence:** [Using the CLI guide](../interfaces/using-the-cli.md)

### T03-P04: How do I connect Evolith to my CI/CD?

**Question:** How do I make Evolith run automatically in my pipeline?

**Answer:** Use the composite action in your GitHub Actions workflow:

```yaml
- uses: beyondnetcode/evolith-validate@v1
  with:
    topology: modular-monolith
    phase: construction
```

Or run the CLI directly:

```bash
evolith validate --fail-on-violation
```

This exits with a non-zero code if any violations are found, which blocks the CI pipeline.

**Evidence:** [CI scripts taxonomy](../../../reference/harness/scripts-taxonomy.md), [ADR-0018 (Testing Pyramid)](../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)

### T03-P05: How do I integrate Evolith with Cursor or Claude Desktop?

**Question:** I use AI coding tools. How does Evolith work with them?

**Answer:** Evolith ships an MCP server inside the CLI. Add it to your AI tool's configuration:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp"]
    }
  }
}
```

Once connected, your AI agent can:
- Query architecture rules before generating code
- Validate its output against topology rules
- Evaluate phase gate readiness
- Detect architecture drift

**Example:** You ask Cursor: "Create a new service module." Cursor queries Evolith MCP: "What rules apply to a new module in a modular monolith?" Evolith returns: "Schema-per-context required (ADR-0031), boundary rules apply (eslint-plugin-boundaries), unit test plan required (GT-42)." Cursor generates code that follows all three rules.

**Evidence:** [MCP Services hub](../../../product/products/mcp-services/README.md), [ADR-0069 (AI Agent Context Protocol)](../architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)

---

## Category 4: Architecture and Topologies

### T04-P01: What are the 5 topology dimensions?

**Question:** You mention "5 dimensions." What are they?

**Answer:** Evolith organizes architecture into 5 independent dimensions, each answering a different question:

| Dimension | Question | Topologies |
|---|---|---|
| **Progressive Axis** | How is the system decomposed? | Modular Monolith, Distributed Modules, Microservices |
| **Execution** | Where does code run? | Serverless, Edge Computing |
| **Integration** | How do components communicate? | Event-Driven |
| **Data** | How is data ownership distributed? | Data Mesh |
| **AI** | How are AI agents governed? | Agentic AI |

A product can combine topologies from different dimensions. For example: `modular-monolith + event-driven + serverless` is a valid combination.

**Evidence:** [Topology Dimensions Model](../architecture/topologies/topology-dimensions.md), [ADR-0079](../architecture/adrs/core/0079-multi-topology-reference-corpus.md)

### T04-P02: What topologies does Evolith cover?

**Question:** What are the 8 topologies?

**Answer:**

| Topology | Dimension | What It Means |
|---|---|---|
| **Modular Monolith** | Progressive | One deployable unit with strict internal boundaries |
| **Distributed Modules** | Progressive | Multiple deployable modules with controlled extraction |
| **Microservices** | Progressive | Independently deployable services |
| **Serverless** | Execution | Code runs on managed infrastructure (AWS Lambda, etc.) |
| **Edge Computing** | Execution | Code runs close to users (CDN edge, IoT) |
| **Event-Driven** | Integration | Components communicate via async events |
| **Data Mesh** | Data | Data ownership distributed by domain |
| **Agentic AI** | AI | AI agents governed by trust boundaries and sandboxes |

All 8 topologies have dual-engine parity (Native + OPA rules), CI validation, and bilingual documentation.

**Evidence:** [Maturity Assessment (Section 8)](../control-center/maturity-reports/maturity-assessment.md)

### T04-P03: Why does Evolith cover multiple topologies instead of just one?

**Question:** Most frameworks pick one style. Why does Evolith support all of them?

**Answer:** Because real products don't fit in one box. A typical enterprise product might be:

- A **modular monolith** for its core domain
- Using **event-driven** integration between modules
- With **serverless** functions for specific workloads
- Running **AI agents** for automated governance

Evolith's dimensional model lets you compose these freely. The key rule: **topologies from different dimensions compose** via `spec.compatibility.composableWith`.

**Example:** Your product is a modular monolith (progressive-axis) that uses event-driven integration (integration dimension) and deploys some functions as serverless (execution dimension). Evolith governs all three dimensions simultaneously with a single `evolith.yaml` manifest.

**Evidence:** [Topology Composition](../architecture/topologies/topology-dimensions.md#3-composition-rule), [Composition Schema](../../../src/rulesets/schema/topology-composition.schema.json)

### T04-P04: What does it mean that topologies are "composable"?

**Question:** What is topology composition?

**Answer:** Composition means you can combine topologies from different dimensions into a single product configuration. Two topologies compose when:

1. They belong to **different dimensions** (e.g., progressive-axis + integration)
2. Their manifests explicitly declare `composableWith` for each other

Two "hub" topologies compose with everything:
- **Event-Driven** composes with ALL 7 other topologies
- **Agentic AI** composes with ALL 7 other topologies

**Example:** `modular-monolith + event-driven` is a valid composition. `modular-monolith + microservices` is NOT valid (both are progressive-axis — you must evolve from one to the other, not run both).

**Evidence:** [Composition Matrix](../control-center/maturity-reports/maturity-assessment.md), [Composition Validation Script](../../../.harness/scripts/ci/22-validate-topology-composition.mjs)

### T04-P05: What is the difference between F1/F2/F3 and the topologies?

**Question:** I see "F1" and "modular-monolith" used interchangeably. Are they the same?

**Answer:** F1, F2, and F3 are **legacy aliases** for the progressive-axis dimension only:

| Legacy Alias | Canonical Topology |
|---|---|
| F1 | `modular-monolith` |
| F2 | `distributed-modules` |
| F3 | `microservices` |

The word "phase" was removed from the topology contract. F1-F5 are NOT SDLC phases — they are positions on the progressive architecture axis.

**Example:** "We're at F1" means "our architecture is a modular monolith." It does NOT mean "we're in SDLC phase 1."

**Evidence:** [Glossary Ecosystem (F1-F5 definition)](./glossary/glossary-ecosystem.md#terms), [ADR-0079](../architecture/adrs/core/0079-multi-topology-reference-corpus.md)

### T04-P06: Why should I start with "modular monolith" and not microservices?

**Question:** Microservices are modern. Why start simple?

**Answer:** Because premature distribution is the #1 architectural mistake Evolith prevents. The progression is:

1. **Start with modular monolith** — strict internal boundaries, one deployable unit
2. **Extract to distributed modules** — when a module needs independent scaling, deployment, or ownership
3. **Move to microservices** — only when the operational maturity justifies the cost

Each step requires evidence (ADR-0045 extraction readiness criteria). Evolith tracks your position on this axis and enforces the rules at each level.

**Example:** A startup begins as modular monolith (F1). After 18 months, the billing module needs independent scaling. They present evidence that it meets extraction criteria (ADR-0045), and Evolith updates their topology configuration to distributed-modules (F2).

**Evidence:** [ADR-0045 (Extraction Readiness Criteria)](../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md), [ADR-0047 (Architectural Patterns)](../architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md)

---

## Category 5: Maturity and Measurement

### T05-P01: What does the 3.32/5 score mean in simple terms?

**Question:** You say the score is 3.32 out of 5. What does that mean for me?

**Answer:** On a scale where:
- **1 = Initial** (chaotic, no processes)
- **2 = Understood** (basic processes exist)
- **3 = Defined** (processes documented and standardized)
- **4 = Managed** (processes measured and controlled)
- **5 = Optimizing** (continuous improvement)

Evolith is at **3.3** — transitioning from "we have documented processes" to "we automatically measure and control them."

**In practical terms:** The architecture is well-defined, decisions are documented (137 ADRs), rules are machine-enforced (163 rulesets), and CI validates compliance. What's missing: some pillars need more automation (reliability testing, chaos engineering) and the AI layer needs deeper integration.

**Evidence:** [Maturity Assessment (Section 12)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P02: Why does it have two dimensions of maturity instead of one?

**Question:** Why not just one score?

**Answer:** Because a platform can be internally excellent but useless in practice, or broadly applicable but poorly built. The two dimensions measure:

- **Dimension A (Internal Quality):** Is Evolith well-built? (Score: 3.32/5)
- **Dimension B (Governance Scope):** How much does it govern? (Score: 5/5 dimensions, 8/8 topologies)

A framework with Dimension A = 4 but Dimension B = 1 would be "perfectly built but only governs monoliths." Evolith has Dimension B = 5 because it covers the full topology spectrum.

**Evidence:** [Maturity Assessment (Section 1)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P03: What does "Level 4 (Managed)" mean in practice?

**Question:** Several pillars are at "Level 4." What does that mean day-to-day?

**Answer:** Level 4 means the process is **automatically measured and controlled**, not just documented. Concretely:

- **Security (Level 4):** CodeQL runs on every PR, dependencies are pinned to exact versions, vulnerabilities are automatically tracked — not just "we have a security policy."
- **Operational Excellence (Level 4):** Builds are deterministic (Nx), telemetry is automatic (LGTM + OTel), feature flags decouple deployment from release — not just "we have CI."
- **Maintainability (Level 4):** Hexagonal boundaries are enforced by `eslint-plugin-boundaries`, event-driven decoupling is validated — not just "we follow clean architecture."

**Evidence:** [Maturity Assessment (Section 3)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P04: How secure is the system?

**Question:** What security level does Evolith achieve?

**Answer:** Security is at **Level 4 (Managed), Validated** — the highest-scoring pillar.

Defenses include:
- **Automated SAST** via CodeQL on every PR (ADR-0005)
- **Dependency pinning** with exact lockfiles + automated vulnerability management (ADR-0009)
- **Multi-tenant isolation** via Row-Level Security (ADR-0010)
- **Immutable audit trails** via CDC (ADR-0016)
- **ABAC policies** in dual-engine (OPA + TypeScript) for MCP tool access

**Path to Level 5:** Automated penetration testing in CI, dynamic secrets rotation.

**Evidence:** [Maturity Assessment (Section 3, Pillar 1)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P05: How fast is the system?

**Question:** What about performance?

**Answer:** Performance is at **Level 4 (Managed), Implemented** (needs load-testing validation).

Key performance claims:
- Auth graph compilation under 5ms using Redis (ADR-0021)
- Dual-protocol: REST public, gRPC internal (ADR-0027)
- 4-tier caching: Client → CDN → BFF → Core

**Path to Level 5:** Serverless auto-scaling, predictive caching.

**Evidence:** [Maturity Assessment (Section 3, Pillar 2)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P06: What is broken or at risk?

**Question:** What are the weak points?

**Answer:** Two areas need attention:

1. **Reliability & Resiliency (Level 3):** Circuit breakers are designed (ADR-0011) but not tested. Multi-region DR is proposed (ADR-0013) but not implemented. Missing: chaos engineering drills, active-active multi-region.

2. **Federated Governance Runtime (Level 3):** Inheritance rules exist, but content validation is missing. Phase-gate evidence is "existence-only" — it checks that artifacts exist, not that they meet quality thresholds.

**Evidence:** [Maturity Assessment (Section 3, Pillar 3)](../control-center/maturity-reports/maturity-assessment.md), [Maturity Assessment (Section 4, Dimension 5)](../control-center/maturity-reports/maturity-assessment.md)

---

## Category 6: Dual-Engine and Rules

### T06-P01: What is "Dual-Engine Parity" and why are there two engines?

**Question:** Why do rules exist in both TypeScript and OPA?

**Answer:** Dual-Engine Parity (R-25) means every enforceable rule must exist in two forms:

1. **Native TypeScript** (`.rules.json`) — evaluated by the Core engine
2. **OPA Rego** (`.rego`) — compiled to WASM, evaluated by Open Policy Agent

This ensures:
- **Correctness:** Both engines must agree. If they disagree, the parity gate fails in CI.
- **Flexibility:** TypeScript rules integrate with your app; OPA rules integrate with Kubernetes, CI, and external policy engines.
- **Trust:** Two independent implementations of the same rule catch implementation bugs.

**Example:** Rule `MODMON-001` (no cross-context imports) exists as `modular-monolith.rules.json` (Native) and `modular-monolith.rego` (OPA). CI runs both against the same fixtures. If one passes and the other fails, the parity gate blocks the merge.

**Evidence:** [ADR-0041 (Dual-Engine Policy Evaluation)](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md), [Maturity Assessment (Section 8.2)](../control-center/maturity-reports/maturity-assessment.md)

### T06-P02: What happens if a rule fails in one engine but not the other?

**Question:** What if TypeScript says "pass" but OPA says "fail"?

**Answer:** The CI pipeline **fails**. The parity gate (`ci/27-opa-parity-gate.mjs`) compiles OPA to WASM and evaluates the same fixtures used by Native rules. Any drift between engines is treated as a build failure.

This is enforced by the parity fixtures: `parity-fixtures/compliant.json` (should pass both engines) and `parity-fixtures/violation.json` (should fail both engines).

**Evidence:** [OPA Parity Gate script](../../../.harness/scripts/ci/27-opa-parity-gate.mjs), [ADR-0041](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md)

### T06-P03: How do rules run in my CI?

**Question:** What actually executes the rules?

**Answer:** Multiple paths:

1. **CLI (local):** `evolith validate` runs Native TypeScript evaluation locally
2. **CI (GitHub Actions):** `evolith validate --fail-on-violation` or the `evolith-validate` composite action
3. **Core API (remote):** `POST /api/v1/architecture/validate` runs both engines remotely
4. **MCP (AI agents):** `evolith-validate` tool available to any connected AI agent

All paths use the same rule definitions and produce the same output envelope (ADR-0073).

**Evidence:** [Using the CLI guide](../interfaces/using-the-cli.md), [Core API hub](../../../product/products/core-api/README.md)

### T06-P04: What are the 45 JSON schemas and what do they validate?

**Question:** You mention 45 schemas. What do they cover?

**Answer:** The schemas validate every structured artifact in the system:

| Domain | Schemas | Examples |
|---|---|---|
| Architecture | 5 | ADR, Blueprint, Design Block, Design Template, Pattern |
| SDLC Artifacts | 8 | PRD, Functional Story, Technical Story, Test Summary, Release Notes |
| Topology | 3 | Topology Manifest, Composition, Recommendation |
| Configuration | 4 | evolith.yaml, Workspace, Tenant, Tenant Override |
| Evaluation | 5 | Evaluation Context, Result, Gate Evidence, SDLC Gate, SDLC Phase |
| Rule System | 3 | Rule Definition, Ruleset Standard, Ruleset SDLC |
| Violation & Evidence | 4 | Violation, Enforcer Evidence, Maturity Evidence, Integration Evidence |
| Planning | 4 | Ballpark Estimation, Build vs Compose, CLI Impact, Technical Feasibility |
| Security | 2 | Security Scan Report, Waiver |
| Knowledge | 3 | Knowledge Intake, Knowledge Projection, Source Registry |
| Other | 4+ | Output Envelope, Observability, Rollback, On-Call Handoff |

**Evidence:** [Schema directory](../../../src/rulesets/schema/), [ADR-0073 (Unified Output Envelope)](../architecture/adrs/core/0073-unified-cli-output-contract.md)

### T06-P05: Can I create my own rules?

**Question:** Can I add rules specific to my project?

**Answer:** Yes. You can:

1. **Add rules to `evolith.yaml`** — declare which rulesets your project inherits
2. **Create custom rulesets** — add `.rules.json` files following the ruleset standard schema
3. **Write OPA policies** — add `.rego` files with matching rule IDs for dual-engine parity
4. **Use the MCP server** — AI agents can query and evaluate custom rules at runtime

The inheritance model means your project-level rules extend (not replace) Core rules.

**Evidence:** [Ruleset Standard Schema](../../../src/rulesets/schema/ruleset-standard.schema.json), [Inheritance Model](../foundations/inheritance-model/)

---

## Category 7: Anti-Patterns

### T07-P01: What problems does Evolith prevent?

**Question:** What architectural mistakes does Evolith catch?

**Answer:** Evolith has explicit defenses against the 6 highest-risk anti-patterns:

| Anti-Pattern | Risk | How Evolith Prevents It |
|---|---|---|
| Distributed Monolith | EXTREME | Async event bus + hexagonal isolation (ADR-0015, ADR-0002) |
| Shared Database Entanglement | VERY HIGH | Schema-per-context, cross-schema joins blocked (ADR-0031) |
| Fat Controller / Smart Pipe | HIGH | Dumb Pipes / Smart Endpoints pattern |
| Log Shards (Blindness) | HIGH | OTel distributed tracing (ADR-0007) |
| God Module | HIGH | Boundary audits + extraction-readiness playbook |
| Leaky Shared Library | HIGH | eslint-plugin-boundaries enforcement |

**Evidence:** [Anti-Pattern Immunization (Section 7)](../control-center/maturity-reports/maturity-assessment.md)

### T07-P02: What is a "distributed monolith" and how do you avoid it?

**Question:** I've heard the term. What does it actually mean?

**Answer:** A distributed monolith is when you split your system into multiple services, but they're so tightly coupled that you can't deploy, scale, or modify them independently. You get all the complexity of microservices with none of the benefits.

Evolith prevents this with two defenses:
1. **Async event bus** (ADR-0015): Modules communicate via fire-and-forget events, not synchronous calls
2. **Hexagonal isolation** (ADR-0002): Each module has strict port/adapter boundaries

**Example:** If Module A calls Module B synchronously and Module B calls Module A back, that's a distributed monolith pattern. Evolith's rules block this at the PR stage.

**Evidence:** [ADR-0015 (Event-Driven Architecture)](../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md), [ADR-0002 (Clean Architecture)](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)

### T07-P03: What is "Strangler Fig" and how is it applied?

**Question:** What's the strangler fig pattern?

**Answer:** Strangler Fig is a migration pattern where you incrementally replace parts of a legacy system with new components, without a big-bang rewrite. The old system "strangles" as new components take over.

In Evolith, this is the foundational strategy for topology evolution. Modules are logically isolated from day one (modular monolith), so when it's time to extract one, you can do it incrementally.

**Example:** Your monolith has a legacy authentication module. Instead of rewriting it, you build a new module with the same interface, route traffic to it gradually, and eventually remove the old one. Evolith tracks this as a topology transition (F1 → F2).

**Evidence:** [Pattern Maturity Matrix (Section 6)](../control-center/maturity-reports/maturity-assessment.md)

### T07-P04: How does the defense against "shared database" work?

**Question:** What's wrong with sharing a database between services?

**Answer:** Shared databases create hidden coupling: changes to one service's schema break another service. Evolith enforces **Schema Per Context** (ADR-0031): each bounded context owns its own PostgreSQL schema, and cross-schema joins are physically blocked.

**Example:** Service A owns the `users` schema. Service B owns the `orders` schema. If Service B tries to `JOIN users.orders`, the rule blocks it. Service B must call Service A's API instead — which is auditable, versioned, and can evolve independently.

**Evidence:** [ADR-0031 (Schema Per Context)](../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)

### T07-P05: What is "hexagonal architecture" and why does it matter?

**Question:** I keep hearing about hexagonal architecture. What is it?

**Answer:** Hexagonal architecture (also called "ports and adapters") separates your core business logic from infrastructure concerns (databases, APIs, UIs). The core defines **ports** (interfaces), and infrastructure provides **adapters** (implementations).

In Evolith, this means:
- The Core engine evaluates rules but never decides for you (`binding: false` in evaluation results)
- Adapters make the system extensible (swap Redis for PostgreSQL without changing business logic)
- AI agents interact through governed ports, not by directly executing shell commands

**Example:** The MCP Interaction Adapter defines a port for AI tool access. You can swap the stdio transport for HTTP without changing the core governance logic.

**Evidence:** [ADR-0002 (Clean Architecture)](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md), [Adapter Maturity (Section 5)](../control-center/maturity-reports/maturity-assessment.md)

---

## Category 8: AI and Agents

### T08-P01: How does Evolith work with AI tools like Cursor or Claude?

**Question:** I use AI coding assistants. How does Evolith integrate?

**Answer:** Through the **Model Context Protocol (MCP)**. Evolith ships an MCP server inside the CLI that provides AI agents with:

- **Tools:** 50 governed tools (validate, gate-evaluate, drift-detect, etc.)
- **Resources:** 11 live data sources (ADRs, rules, topologies, gaps)
- **Prompts:** 8 guided workflows for common governance tasks

AI agents use these tools to query architecture rules, validate code, and evaluate gate readiness — all without bypassing governance.

**Example:** You ask Cursor to "check if this module follows our architecture rules." Cursor calls `evolith-validate` via MCP. Evolith returns: "3 violations: cross-context import, missing test plan, unversioned dependency." Cursor offers to fix them.

**Evidence:** [MCP Services hub](../../../product/products/mcp-services/README.md), [ADR-0069](../architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)

### T08-P02: What is MCP and why does Evolith use it?

**Question:** What's MCP?

**Answer:** MCP (Model Context Protocol) is a standard for connecting AI models to external tools and data. Think of it as a "USB port" for AI agents — it defines how tools, resources, and prompts are exposed to LLMs.

Evolith uses MCP because:
1. **Standard integration:** Works with Cursor, Claude Desktop, and any MCP-compatible tool
2. **Governed access:** Tools are validated against schemas before execution
3. **Fail-closed security:** API-key authentication, no anonymous access

**Evidence:** [MCP Services hub](../../../product/products/mcp-services/README.md), [ADR-0069](../architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)

### T08-P03: What AI maturity level does Evolith have?

**Question:** How AI-mature is the platform?

**Answer:** Evolith is at **Level 2.2 (AI-Integrated → AI-Orchestrated)** on its own 3-level × 5-dimension AI maturity matrix:

| Dimension | Level | What It Means |
|---|---|---|
| Documentation | 2 | Tool catalog, model catalog, multi-agent patterns documented |
| Tools | **3** | Recursive agentic cycle, budget propagation, RAG semantic memory |
| Verification | 2 | CI pipelines, OPA parity, boundary guards (but no autonomous patrol agents) |
| Models | 2 | Formal ADR-based selection, tiered catalog, cost optimization |
| Security | 2 | OAuth + ABAC + role-based filtering + audit logging (but no immutable audit) |

**Evidence:** [AI-Augmented Maturity (Section 10)](../control-center/maturity-reports/maturity-assessment.md)

### T08-P04: What would it take to reach "AI-Orchestrated" (Level 3)?

**Question:** What's missing for full Level 3?

**Answer:** Three things:

1. **Autonomous verification agents** — Currently Winston audit requires manual invocation. Level 3 needs background agents that patrol continuously.
2. **Live token cost dashboard per agent/feature** — Infrastructure exists (Langfuse adapter) but no real-time dashboard.
3. **Immutable audit storage** — Current AuditLogger is in-memory with 1000-entry cap. Level 3 needs blockchain-style immutable records.

**Evidence:** [AI-Augmented Maturity (Section 10.3)](../control-center/maturity-reports/maturity-assessment.md)

### T08-P05: Can an AI agent bypass Evolith's governance rules?

**Question:** What stops an AI from ignoring the rules?

**Answer:** Multiple layers:

1. **MCP tools are governed:** AI agents can only use the 50 tools Evolith exposes — they can't execute arbitrary shell commands.
2. **ABAC policies:** Every tool call is evaluated against role, tenant, and phase constraints.
3. **HITL (Human-in-the-Loop):** Destructive tools require explicit approval.
4. **Audit logging:** Every tool call is recorded with tool name, args (redacted), context, duration, and status.
5. **Binding = false:** Evolith's evaluation engine recommends but never decides — the human or CI pipeline makes the final call.

**Example:** An AI agent tries to run `evolith-phase-advance` to skip a gate. The ABAC policy blocks it: "phase-advance requires architect role in production phase." The attempt is logged.

**Evidence:** [ADR-0081 (Sandbox Isolation)](../architecture/adrs/core/0081-agentic-ai-sandbox-isolation.md), [ADR-0083 (Action Authorization Audit)](../architecture/adrs/core/0083-agentic-ai-action-authorization-audit.md)

---

## Category 9: Federated Governance

### T09-P01: What is a "satellite" and how does it inherit from Core?

**Question:** What's the relationship between Core and my project?

**Answer:** A satellite is any project that adopts Evolith Core's rules. The relationship is one-way: Core governs, satellites consume.

```yaml
# evolith.yaml in your satellite
apiVersion: evolith.dev/v1
kind: SatelliteManifest
spec:
  inherits:
    - core-rules@1.0.0
    - modular-monolith@1.0.0
  topology: modular-monolith
```

This declares: "I follow Core rules v1.0.0 and modular-monolith rules v1.0.0." Evolith validates your project against these inherited rules.

**Evidence:** [Satellite Definitions](../foundations/satellite-definitions/), [Inheritance Model](../foundations/inheritance-model/)

### T09-P02: How do I connect my existing repository to Evolith?

**Question:** I have an existing project. How do I start using Evolith?

**Answer:**

```bash
cd your-repo
evolith init --topology modular-monolith
evolith validate
```

This creates `evolith.yaml`, runs the initial validation, and reports any violations. From then on, every `evolith validate` or CI run checks compliance.

**Evidence:** [Using the CLI guide](../interfaces/using-the-cli.md)

### T09-P03: What happens when a quality gate fails?

**Question:** If a gate fails, what do I do?

**Answer:** When a gate fails, you have three options:

1. **Fix the violations** — address the issues and re-run the gate
2. **Request a waiver** — an explicit governance exception (requires approval)
3. **Defer the gap** — if the violation is acceptable, track it as a GT-xx item with justification

A failed mandatory gate **cannot** be overridden by informal approval. Only an explicit governance waiver applies.

**Example:** `gate-f3 (Successful Build)` fails because test coverage is 74% and the threshold is 80%. You either add tests to reach 80%, or request a waiver for that specific module with a justification.

**Evidence:** [Glossary Ecosystem (Gate definition)](./glossary/glossary-ecosystem.md#terms), [Quality Gates](../sdlc/quality-gates.md)

### T09-P04: Can I customize the rules for my team?

**Question:** What if some rules don't apply to my project?

**Answer:** Yes, through the inheritance model:

1. **Override specific rules** — in your `evolith.yaml`, you can set rule parameters per context
2. **Defer gaps** — mark violations as DEFERRED with justification in the Gap Tracking Board
3. **Request waivers** — formal governance exceptions for specific gates

However, you cannot **remove** Core rules — you can only override parameters or defer with justification. The governance boundary is preserved.

**Evidence:** [Waiver Schema](../../../src/rulesets/schema/waiver.schema.json), [Gap Tracking Board](../control-center/gaps/gap-tracking.md)

### T09-P05: How does Evolith maintain consistency across repositories?

**Question:** We have 10 repositories. How do you keep them consistent?

**Answer:** Through the hub-and-spoke inheritance model:

- **Core** defines universal rules (ADR-0001 through ADR-0133)
- **Each satellite** declares which Core rules it inherits via `evolith.yaml`
- **CI validates** each satellite against its declared inheritance
- **The CLI** (`evolith validate`) can run locally in any repository

The same rules, the same schemas, the same evaluation engines — everywhere.

**Example:** Repository A inherits `core-rules@1.0.0`. Repository B inherits `core-rules@1.0.0`. Both are validated by the same rules. If Core adds a new rule in v1.1.0, each satellite explicitly adopts it.

**Evidence:** [Inheritance Model](../foundations/inheritance-model/), [Satellite Definitions](../foundations/satellite-definitions/)

---

## Category 10: Adapters and Integration

### T10-P01: What systems does Evolith integrate with?

**Question:** What can Evolith connect to?

**Answer:**

| System | Integration Method |
|---|---|
| GitHub | CI composite action, PR gates |
| Cursor, Claude Desktop | MCP server (stdio) |
| Any MCP-compatible tool | MCP server (HTTP or stdio) |
| CI/CD pipelines | CLI commands, REST API |
| Kubernetes | OPA WASM policies |
| External orchestrators | Core API (REST) |
| AI agents | Agent Runtime (hexagonal ports) |

**Evidence:** [MCP Services hub](../../../product/products/mcp-services/README.md), [Core API hub](../../../product/products/core-api/README.md)

### T10-P02: How does the Communication Gateway work?

**Question:** What's the gateway?

**Answer:** The Communication Gateway is a hexagonal port that adapts multiple interaction surfaces (CLI, chat, MCP, HTTP) into a single governed runtime pipeline. Instead of duplicating governance logic for each interface, all interactions flow through the same gateway.

Currently implemented: CLI commands, CLI chat, MCP, Hermes Chat Box, OpenCode, External triggers.

**Evidence:** [Adapter Maturity (Section 5.1)](../control-center/maturity-reports/maturity-assessment.md)

### T10-P03: What is a "port/adapter" in hexagonal architecture?

**Question:** You keep mentioning ports and adapters. What are they?

**Answer:** A **port** is an interface that defines what a capability does. An **adapter** is an implementation that connects the port to a specific technology.

- **Port:** "I need to validate policies" (interface)
- **Adapter:** "I'll use OPA CLI to do it" (implementation)

You can swap adapters without changing the port. This is how Evolith supports multiple AI engines, multiple transports, and multiple policy engines.

**Evidence:** [ADR-0002 (Clean Architecture)](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)

### T10-P04: Why are all adapters at M4 but none at M5?

**Question:** The maturity assessment says adapters are "production-ready" but not "governed." What's the difference?

**Answer:** M4 means the adapter works in production (real HTTP calls, real integrations). M5 requires additional governance layers:

| M4 (Current) | M5 (Target) |
|---|---|
| Real integration | Real integration |
| Passes basic tests | Full unit test coverage |
| Works | OPA policy guard at adapter level |
| Works | Trace emission to observability stack |
| Works | Approval flow integration |

The main gap: only `McpInteractionAdapter` has unit tests (11 tests). The other 5 adapters need tests, manifest registration, and adapter-level OPA/trace integration.

**Evidence:** [Adapter Maturity (Section 5.1)](../control-center/maturity-reports/maturity-assessment.md)

### T10-P05: How do I observe what Evolith is doing?

**Question:** Can I see what rules are being evaluated and when?

**Answer:** Yes, through multiple observability surfaces:

1. **CLI output:** `evolith validate --verbose` shows detailed evaluation results
2. **OpenTelemetry:** MCP tool dispatch emits spans via `@opentelemetry/api`
3. **Langfuse:** Cost, latency, and prompt version tracked via `LangfuseEvidenceAdapter`
4. **AuditLogger:** Every tool call recorded with tool name, context, duration, and status

**Evidence:** [ADR-0007 (Observability Telemetry)](../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)

---

## Category 11: Gaps and Continuous Improvement

### T11-P01: What are "governance gaps" (GT-xx)?

**Question:** I see GT-540, GT-562, etc. What are these?

**Answer:** A governance gap (GT-xx) is a tracked deviation from the desired state. Each gap has:
- **ID:** GT-xxx (sequential)
- **Description:** What's missing or broken
- **Criticality:** P0 (urgent) to P3 (nice-to-have)
- **Status:** DONE, IN-PROGRESS, PENDING, or DEFERRED

Current state: **568 total gaps, 554 DONE** (97.5% closed).

**Evidence:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md), [Gap Reference Catalog](../control-center/gaps/gap-reference-catalog.md)

### T11-P02: How is a gap formally closed?

**Question:** What does "DONE" actually mean?

**Answer:** A gap is DONE only when:

1. The fix is merged to `main` (real git commit SHA)
2. Evidence files exist in the repository
3. Validation commands pass (`node .harness/scripts/ci/08-validate-tracking.mjs`)
4. A closure record exists in `gap-closure-evidence.json`

You can't just mark a gap as DONE — CI verifies the evidence.

**Evidence:** [Gap Closure Evidence Standard](../control-center/evidence/gap-closure-evidence-standard.md)

### T11-P03: How do you prevent someone from marking DONE without evidence?

**Question:** Can someone cheat and mark a gap as done?

**Answer:** No. The CI script `08-validate-tracking.mjs` checks:

- The closure record references a **real git commit** (exists in the repo)
- The evidence files **exist** at the referenced paths
- The validation commands **pass**
- The gap's checkboxes in the catalog are **checked**
- EN and ES boards **agree**

If any check fails, CI fails.

**Evidence:** [Gap Closure Evidence Standard](../control-center/evidence/gap-closure-evidence-standard.md), [CI Script 08](../../../.harness/scripts/ci/08-validate-tracking.mjs)

### T11-P04: How do I contribute to the project?

**Question:** I want to help. How do I contribute?

**Answer:**

1. **Pick a PENDING gap** from the [Gap Tracking Board](../control-center/gaps/gap-tracking.md)
2. **Implement the fix** following the gap's proposed solution
3. **Add closure evidence** — commit SHA, evidence files, validation commands
4. **Submit a PR** — CI will validate everything automatically

Start with P3 (nice-to-have) gaps if you're new. P0 gaps are urgent and typically assigned.

**Evidence:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md)

---

## Category 12: Vision and Future

### T12-P01: Where is Evolith heading?

**Question:** What's the roadmap?

**Answer:** The evolution follows the progressive architecture model:

1. **Current:** Modular monolith (F1) with full governance
2. **Next:** Extract to distributed modules (F2) when extraction readiness criteria are met
3. **Future:** Microservices (F3) only when operational maturity justifies the cost

Simultaneously:
- **Tracker** (enterprise product) is in design stage
- **AI maturity** is moving from Level 2 to Level 3 (autonomous verification agents)
- **Reliability** is moving from Level 3 to Level 4 (chaos engineering, active-active)

**Evidence:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)

### T12-P02: What is "progressive architecture" and why does it matter?

**Question:** Why not just pick microservices from day one?

**Answer:** Progressive architecture is the philosophy of starting simple and evolving only when justified by evidence. It matters because:

- **Premature microservices** add distributed-systems cost without benefits
- **Monolith-first** allows fast iteration while boundaries are still forming
- **Evidence-based extraction** ensures each split is justified by real operational needs

Evolith enforces this by tracking your position on the progressive axis and requiring evidence (ADR-0045) before each transition.

**Evidence:** [ADR-0045 (Extraction Readiness)](../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md), [ADR-0047 (Architectural Patterns)](../architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md)

### T12-P03: What does "democratize elite software engineering" mean?

**Question:** That sounds ambitious. What does it actually mean?

**Answer:** It means making the practices of elite engineering teams (FAANG-level architecture governance) accessible to everyone — not just teams with $1M consulting budgets.

Practically:
- **Open source** — the governance engine is free (MIT)
- **AI-powered** — AI agents get the same governance context as senior architects
- **Automated** — rules enforce themselves, not via wiki pages people forget
- **Evidence-based** — claims are backed by verifiable data, not opinions

**Evidence:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)

### T12-P04: How does Evolith maintain quality as it grows?

**Question:** With 137 ADRs and 568 gaps, how do you keep things from falling apart?

**Answer:** Through multiple feedback loops:

1. **CI validation** — 7 mandatory gates run on every commit
2. **Maturity assessment** — scored quarterly with evidence-backed claims
3. **Gap tracking** — 568 items tracked, 554 closed, with verifiable evidence
4. **BMAD Intelligence** — maturity insights feed back into agents, rules, and skills
5. **Dual-engine parity** — two independent implementations catch implementation bugs
6. **Bilingual enforcement** — every EN document must have an ES counterpart

**Evidence:** [Maturity Assessment (Section 11)](../control-center/maturity-reports/maturity-assessment.md)

### T12-P05: What is the "BMAD Intelligence Feedback Loop"?

**Question:** What's BMAD and how does it improve the system?

**Answer:** BMAD (Business-aligned Multi-Agent Development) is the agent orchestration system. The "intelligence feedback loop" means insights from maturity assessments, gap analysis, and governance audits feed back into:

- **Updated agents:** Winston (Audit) and Architect now evaluate port/adapter compliance
- **New skills:** `adapter-maturity-analysis`, `interaction-adapter-gap-analysis`
- **New rules:** `core-must-remain-stateless`, `external-tech-must-use-adapter`
- **New checklists:** Adapter Maturity Checklist, Interaction Adapter Readiness Checklist

The system learns from its own governance data.

**Evidence:** [BMAD Intelligence Update (Section 11)](../control-center/maturity-reports/maturity-assessment.md)

---

## Related Documents

| Document | Purpose |
|---|---|
| [Ecosystem Glossary](./glossary/glossary-ecosystem.md) | Canonical term definitions |
| [Maturity Assessment](../control-center/maturity-reports/maturity-assessment.md) | Bidimensional maturity evaluation |
| [ADR Matrix](../architecture/adrs/adr-matrix.md) | Find decisions by concern |
| [Gap Tracking Board](../control-center/gaps/gap-tracking.md) | Track governance deviations |
| [Using the CLI](../interfaces/using-the-cli.md) | Practical CLI guide |
| [MCP Services](../../../product/products/mcp-services/README.md) | AI integration guide |

---

*This Q&A is a living document. Update it when new questions emerge or existing answers change.*

---
[Back to SDLC Hub](./README.md)
