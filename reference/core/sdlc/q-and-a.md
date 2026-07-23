# Evolith Core — Questions & Answers

> **Bilingual Navigation:** [Versión en Español](./q-and-a.es.md)

**Status:** Active Reference
**Owner:** Evolith Architecture Board
**Created:** 2026-07-23
**Last Updated:** 2026-07-23

This Q&A answers the most common questions about Evolith Core in plain language, with concrete examples and links to evidence. Categories are expandable — click to expand.

---

<details open>
<summary><h2>Category 1: About Evolith — What Is This?</h2></summary>

<details>
<summary><b>T01-P01: What is Evolith in one sentence?</b></summary>

**Answer:** Evolith is an **executable architectural governance framework** — it makes sure that architecture decisions actually get followed, automatically, whether the code is written by a human or an AI agent.

Think of it as a "constitution" for your software: it defines the rules, and then automatically checks that every piece of code, every deployment, and every decision follows those rules.

**Example:** Imagine your team decides "all services must use schema-per-context." Evolith encodes that decision as a machine-readable rule, and then automatically blocks any PR that shares a database table across contexts.

**Evidence:** [ADR-0079](../architecture/adrs/core/0079-multi-topology-reference-corpus.md), [README.md](../../README.md)
</details>

<details>
<summary><b>T01-P02: What would I use it for?</b></summary>

**Answer:** Evolith gives you three practical things:

1. **Instant feedback on architecture decisions.** Run `evolith validate` and know in seconds if your code follows your team's architectural rules — before you even push.
2. **No more "surprise" refactors.** Architecture drift is caught at the gate, not six months later when someone discovers the system is a tangled mess.
3. **AI-proof governance.** When an AI agent writes code for you, Evolith ensures it follows the same rules a senior architect would enforce.

**Example:** You're working on a modular monolith. An AI agent generates a PR that accidentally imports a domain object from another bounded context. Evolith's boundary rule catches this immediately — the PR is blocked with a clear explanation.

**Evidence:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md), [ADR-0002](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)
</details>

<details>
<summary><b>T01-P03: What benefits does it give me as a developer?</b></summary>

**Answer:**
- **Faster onboarding.** Run `evolith validate` and the system tells you exactly what's wrong and how to fix it.
- **Confidence in PRs.** If Evolith passes, your code follows the architecture.
- **Less context switching.** Rules from ADRs, patterns, and schemas consolidated into one command.
- **AI integration.** Feed governance context to Cursor, Claude Desktop, or any MCP tool.

**Evidence:** [Evolith CLI hub](../../../product/products/smart-cli/README.md), [Using the CLI](../interfaces/using-the-cli.md)
</details>

<details>
<summary><b>T01-P04: What benefits does it give me as an architect?</b></summary>

**Answer:**
- **Enforce decisions automatically.** Your ADRs become machine-readable rules, not documents people forget to read.
- **Measure architecture health.** Score of 3.32/5 with evidence-backed claims.
- **Track deviations.** 568 governance gaps tracked, 554 closed — precise inventory of what's done.
- **Multi-topology support.** Monolith, event-driven, serverless, or combinations — all governed by the same framework.

**Evidence:** [Maturity Assessment](../control-center/maturity-reports/maturity-assessment.md), [ADR Matrix](../architecture/adrs/adr-matrix.md)
</details>

<details>
<summary><b>T01-P05: What benefits does it give me as a team lead or manager?</b></summary>

**Answer:**
- **Predictable delivery.** Phase gates enforce quality at each stage.
- **Audit trail.** Every decision documented (ADRs), every gap tracked (GT-xx), every closure has verifiable evidence.
- **Reduced risk.** Anti-pattern immunizations prevent the six highest-risk architectural mistakes.
- **Cost avoidance.** Architecture drift, rework, and emergency refactors are prevented systematically.

**Evidence:** [Anti-Pattern Immunization](../control-center/maturity-reports/maturity-assessment.md), [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)
</details>

<details>
<summary><b>T01-P06: Is it the same as a linter or static analyzer?</b></summary>

**Answer:** Linters check code style. Evolith checks **architecture decisions**.

| | Linter (ESLint) | Static Analyzer (SonarQube) | Evolith |
|---|---|---|---|
| **Scope** | Code style, syntax | Code quality, bugs | Architecture rules, governance |
| **Enforcement** | Local IDE, CI | CI pipeline | CI + gates + MCP + agents |
| **Rules source** | Config files | Built-in + plugins | Your own ADRs and decisions |
| **Dual-engine** | No | No | Yes (TypeScript + OPA) |

**Evidence:** [ADR-0041](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md)
</details>

<details>
<summary><b>T01-P07: Do I need to be an architecture expert to use it?</b></summary>

**Answer:** No. Evolith works at different levels:
- **Developer:** Run `evolith validate` and fix what it reports.
- **Tech lead:** Use `evolith gate` to check phase readiness.
- **Architect:** Use `evolith drift` for deep architectural analysis.

**Evidence:** [Using the CLI](../interfaces/using-the-cli.md)
</details>

</details>

---

<details>
<summary><h2>Category 2: Products and Pricing</h2></summary>

<details>
<summary><b>T02-P01: What products does Evolith have?</b></summary>

| Product | What It Is | Cost |
|---|---|---|
| **Evolith Core** | Foundation: rules, ADRs, standards, schemas | Free (MIT) |
| **Evolith CLI** | Command-line governance | Free (MIT, npm) |
| **Core API** | REST service for remote governance | Free (open source) |
| **MCP Services** | AI tool integration via MCP | Free (inside CLI) |
| **Agent Runtime** | Hexagonal orchestration layer | Free (open source) |
| **UMS Reference** | Example satellite project | Free (open source) |
| **Evolith Tracker** | Enterprise SDLC orchestrator | Paid (Enterprise) |

**Evidence:** [Product hub](../../../product/README.md)
</details>

<details>
<summary><b>T02-P02: How much does it cost?</b></summary>

**Answer:** The core platform is **completely free** under MIT license. This includes all 137 ADRs, 163 rulesets, 45 schemas, CLI, MCP server, Core API, and Agent Runtime. The only paid product is **Evolith Tracker** (enterprise multi-tenant governance — not yet released).

**Example:** A 5-person startup uses the full stack for $0. A 500-person enterprise needing multi-tenant governance pays for Tracker.

**Evidence:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)
</details>

<details>
<summary><b>T02-P03: What is "Open-Core"?</b></summary>

**Answer:** Open-Core means the foundational platform is open source and free, while enterprise features are monetized separately.

**Free tier:** Full governance engine, all rules, CLI, MCP, API, Agent Runtime.
**Paid tier (Tracker):** Multi-tenant governance, immutable audit, configurable gates, compliance packs, enterprise support.

**Evidence:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)
</details>

<details>
<summary><b>T02-P04: How does it compare to SonarQube?</b></summary>

**Answer:** They solve different problems. SonarQube catches code quality issues (bugs, vulnerabilities). Evolith catches architecture decisions (cross-context coupling, topology violations). They complement each other.

**Evidence:** [Maturity Assessment](../control-center/maturity-reports/maturity-assessment.md)
</details>

</details>

---

<details>
<summary><h2>Category 3: Getting Started</h2></summary>

<details>
<summary><b>T03-P01: How do I install the CLI?</b></summary>

```bash
npm install -g @beyondnet/evolith-cli
evolith --version
```

Requirements: Node.js >= 20.0.0.
</details>

<details>
<summary><b>T03-P02: How do I initialize a project?</b></summary>

```bash
cd your-project
evolith init --topology modular-monolith
```

This creates `evolith.yaml` declaring your topology and inherited rules.
</details>

<details>
<summary><b>T03-P03: How do I validate my code?</b></summary>

```bash
evolith validate
evolith validate --topology modular-monolith
evolith validate --phase construction
```

**Evidence:** [Using the CLI](../interfaces/using-the-cli.md)
</details>

<details>
<summary><b>T03-P04: How do I connect to CI/CD?</b></summary>

```yaml
# GitHub Actions
- uses: beyondnetcode/evolith-validate@v1
  with:
    topology: modular-monolith
    phase: construction
```

**Evidence:** [ADR-0018](../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)
</details>

<details>
<summary><b>T03-P05: How do I integrate with Cursor or Claude?</b></summary>

Add to your AI tool's config:
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

**Evidence:** [MCP Services](../../../product/products/mcp-services/README.md), [ADR-0069](../architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)
</details>

</details>

---

<details>
<summary><h2>Category 4: Architecture and Topologies</h2></summary>

<details>
<summary><b>T04-P01: What are the 5 topology dimensions?</b></summary>

| Dimension | Question | Topologies |
|---|---|---|
| **Progressive Axis** | How is the system decomposed? | Modular Monolith, Distributed Modules, Microservices |
| **Execution** | Where does code run? | Serverless, Edge Computing |
| **Integration** | How do components communicate? | Event-Driven |
| **Data** | How is data ownership distributed? | Data Mesh |
| **AI** | How are AI agents governed? | Agentic AI |

**Evidence:** [Topology Dimensions](../architecture/topologies/topology-dimensions.md), [ADR-0079](../architecture/adrs/core/0079-multi-topology-reference-corpus.md)
</details>

<details>
<summary><b>T04-P02: What topologies does Evolith cover?</b></summary>

8 topologies: Modular Monolith, Distributed Modules, Microservices, Serverless, Edge Computing, Event-Driven, Data Mesh, Agentic AI. All have dual-engine parity and CI validation.

**Evidence:** [Maturity Assessment Section 8](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T04-P03: Why cover multiple topologies?</b></summary>

Real products don't fit in one box. A typical enterprise product might be a modular monolith with event-driven integration, serverless functions, and AI agents. Evolith's dimensional model lets you compose these freely.

**Evidence:** [Composition Matrix](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T04-P04: What is topology composition?</b></summary>

You can combine topologies from different dimensions. Two hub topologies compose with everything: **Event-Driven** and **Agentic AI**. Example: `modular-monolith + event-driven` is valid. `modular-monolith + microservices` is NOT (same dimension).

**Evidence:** [Composition Schema](../../../src/rulesets/schema/topology-composition.schema.json)
</details>

<details>
<summary><b>T04-P05: Why start with modular monolith?</b></summary>

Premature distribution is the #1 architectural mistake Evolith prevents. Start simple (F1), extract to distributed modules (F2) when justified by evidence (ADR-0045), move to microservices (F3) only when operational maturity justifies the cost.

**Evidence:** [ADR-0045](../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md), [ADR-0047](../architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md)
</details>

</details>

---

<details>
<summary><h2>Category 5: Maturity and Measurement</h2></summary>

<details>
<summary><b>T05-P01: What does 3.32/5 mean?</b></summary>

On a scale of 1 (Initial) to 5 (Optimizing), Evolith is at **3.3** — transitioning from "documented processes" to "automatically measured and controlled." Architecture is well-defined, rules are machine-enforced, CI validates compliance. Missing: more automation in reliability and deeper AI integration.

**Evidence:** [Maturity Assessment Section 12](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T05-P02: Why two dimensions of maturity?</b></summary>

Because a platform can be internally excellent but useless in practice. **Dimension A** (Internal Quality: 3.32/5) measures how well it's built. **Dimension B** (Governance Scope: 5/5 dimensions, 8/8 topologies) measures how much it governs.

**Evidence:** [Maturity Assessment Section 1](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T05-P03: What is broken or at risk?</b></summary>

Two areas:
1. **Reliability (Level 3):** Circuit breakers designed but not tested. Multi-region DR proposed but not implemented. Missing chaos engineering.
2. **Federated Governance (Level 3):** Phase-gate evidence is "existence-only" — checks artifacts exist, not quality thresholds.

**Evidence:** [Maturity Assessment Pillar 3](../control-center/maturity-reports/maturity-assessment.md)
</details>

</details>

---

<details>
<summary><h2>Category 6: Dual-Engine and Rules</h2></summary>

<details>
<summary><b>T06-P01: What is Dual-Engine Parity?</b></summary>

Every rule exists in two forms: **Native TypeScript** (`.rules.json`) and **OPA Rego** (`.rego` compiled to WASM). Both must agree. If they disagree, CI fails. This ensures correctness, flexibility, and trust.

**Evidence:** [ADR-0041](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md)
</details>

<details>
<summary><b>T06-P02: What are the 45 JSON schemas?</b></summary>

They validate every structured artifact: ADRs, PRDs, stories, topologies, configurations, evaluations, violations, security reports, and more. 50 schema files covering 10+ domains.

**Evidence:** [Schema directory](../../../src/rulesets/schema/), [ADR-0073](../architecture/adrs/core/0073-unified-cli-output-contract.md)
</details>

<details>
<summary><b>T06-P03: Can I create my own rules?</b></summary>

Yes. Add rules to `evolith.yaml`, create custom `.rules.json` files, write OPA `.rego` policies, or use the MCP server for runtime evaluation. Your rules extend (not replace) Core rules.

**Evidence:** [Ruleset Standard Schema](../../../src/rulesets/schema/ruleset-standard.schema.json)
</details>

</details>

---

<details>
<summary><h2>Category 7: Anti-Patterns</h2></summary>

<details>
<summary><b>T07-P01: What problems does Evolith prevent?</b></summary>

6 anti-patterns: Distributed Monolith (EXTREME), Shared Database Entanglement (VERY HIGH), Fat Controller (HIGH), Log Shards (HIGH), God Module (HIGH), Leaky Shared Library (HIGH).

**Evidence:** [Anti-Pattern Immunization](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T07-P02: What is a "distributed monolith"?</b></summary>

When you split into services but they're so coupled you can't deploy independently. Evolith prevents this with async event bus (ADR-0015) and hexagonal isolation (ADR-0002).

**Evidence:** [ADR-0015](../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md), [ADR-0002](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)
</details>

<details>
<summary><b>T07-P03: What is "Strangler Fig"?</b></summary>

Incremental migration pattern: replace legacy parts with new components without a big-bang rewrite. In Evolith, modules are isolated from day one, so extraction is incremental.

**Evidence:** [Pattern Maturity Matrix](../control-center/maturity-reports/maturity-assessment.md)
</details>

</details>

---

<details>
<summary><h2>Category 8: AI and Agents</h2></summary>

<details>
<summary><b>T08-P01: How does Evolith work with AI tools?</b></summary>

Through MCP (Model Context Protocol). Evolith ships an MCP server with 50 tools, 11 resources, and 8 prompts. AI agents query rules, validate code, and evaluate gates — all governed.

**Evidence:** [MCP Services](../../../product/products/mcp-services/README.md), [ADR-0069](../architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)
</details>

<details>
<summary><b>T08-P02: What AI maturity level does Evolith have?</b></summary>

Level 2.2 (AI-Integrated → AI-Orchestrated). Tools dimension is already Level 3 (recursive agentic cycle, RAG, OTel). Verification, Models, and Security are Level 2.

**Evidence:** [AI-Augmented Maturity](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T08-P03: Can an AI agent bypass governance?</b></summary>

No. Multiple layers: MCP tools are governed (50 tools only), ABAC policies evaluate every call, HITL approval for destructive tools, audit logging records everything, and `binding: false` means the engine recommends but never decides.

**Evidence:** [ADR-0081](../architecture/adrs/core/0081-agentic-ai-sandbox-isolation.md), [ADR-0083](../architecture/adrs/core/0083-agentic-ai-action-authorization-audit.md)
</details>

</details>

---

<details>
<summary><h2>Category 9: Federated Governance</h2></summary>

<details>
<summary><b>T09-P01: What is a "satellite"?</b></summary>

Any project that adopts Evolith Core's rules. The relationship is one-way: Core governs, satellites consume. Satellites declare inheritance via `evolith.yaml`.

**Evidence:** [Satellite Definitions](../foundations/satellite-definitions/), [Inheritance Model](../foundations/inheritance-model/)
</details>

<details>
<summary><b>T09-P02: What happens when a gate fails?</b></summary>

Three options: fix violations, request a waiver (explicit governance exception), or defer as a GT-xx item with justification. A failed mandatory gate cannot be overridden informally.

**Evidence:** [Glossary (Gate)](./glossary/glossary-ecosystem.md#terms)
</details>

<details>
<summary><b>T09-P03: Can I customize rules for my team?</b></summary>

Yes, through inheritance: override parameters, defer gaps, or request waivers. But you cannot remove Core rules — only override or defer with justification.

**Evidence:** [Waiver Schema](../../../src/rulesets/schema/waiver.schema.json)
</details>

</details>

---

<details>
<summary><h2>Category 10: Adapters and Integration</h2></summary>

<details>
<summary><b>T10-P01: What systems does Evolith integrate with?</b></summary>

GitHub (CI actions), Cursor/Claude Desktop (MCP), any MCP tool, CI/CD pipelines (CLI), Kubernetes (OPA WASM), external orchestrators (REST API), AI agents (Agent Runtime).

**Evidence:** [MCP Services](../../../product/products/mcp-services/README.md), [Core API](../../../product/products/core-api/README.md)
</details>

<details>
<summary><b>T10-P02: Why are adapters at M4 but not M5?</b></summary>

M4 = production-ready (real integrations). M5 = governed (OPA guard, tracing, approval flows, full tests). Only McpInteractionAdapter has unit tests (11). The other 5 need tests and manifest registration.

**Evidence:** [Adapter Maturity](../control-center/maturity-reports/maturity-assessment.md)
</details>

</details>

---

<details>
<summary><h2>Category 11: Gaps and Continuous Improvement</h2></summary>

<details>
<summary><b>T11-P01: What are governance gaps (GT-xx)?</b></summary>

Tracked deviations from desired state. Each has ID, description, criticality (P0-P3), and status. Current: 568 total, 554 DONE (97.5%).

**Evidence:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md)
</details>

<details>
<summary><b>T11-P02: How is a gap formally closed?</b></summary>

Only when: fix merged to main (real commit SHA), evidence files exist, validation commands pass, and closure record exists in `gap-closure-evidence.json`. CI verifies everything.

**Evidence:** [Gap Closure Evidence Standard](../control-center/evidence/gap-closure-evidence-standard.md)
</details>

</details>

---

<details>
<summary><h2>Category 12: Vision and Future</h2></summary>

<details>
<summary><b>T12-P01: Where is Evolith heading?</b></summary>

Following progressive architecture: modular monolith (F1) → distributed modules (F2) → microservices (F3). Simultaneously: Tracker (enterprise) in design, AI maturity moving to Level 3, reliability moving to Level 4.

**Evidence:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)
</details>

<details>
<summary><b>T12-P02: What does "democratize elite software engineering" mean?</b></summary>

Making FAANG-level architecture governance accessible to everyone — open source, AI-powered, automated, and evidence-based. No $1M consulting budgets needed.

**Evidence:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)
</details>

<details>
<summary><b>T12-P03: What is the BMAD Intelligence Feedback Loop?</b></summary>

Insights from maturity assessments feed back into agents, rules, and skills. Updated agents, new skills, new rules, new checklists — the system learns from its own governance data.

**Evidence:** [BMAD Intelligence Update](../control-center/maturity-reports/maturity-assessment.md)
</details>

</details>

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
