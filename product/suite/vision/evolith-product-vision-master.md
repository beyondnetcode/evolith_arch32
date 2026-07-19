# Evolith — Product Vision Master

> **Bilingual Navigation:** [Versión en Español](./evolith-product-vision-master.es.md)

**Status:** Approved  
**Owner:** Evolith Architecture Board  
**Last Updated:** 2026-07-11

---

## 1. Vision, Category, and Value Proposition

### 1.1 Vision Statement

**Evolith** democratizes elite software engineering by converting fragmented, high-risk development processes into **predictable, assisted, governed, and auditable** product delivery.

### 1.2 Product Category

Evolith is the **governance control plane for AI-Native software engineering**.

It governs people, autonomous agents, engineering tools, artifacts, evidence, and decisions through one enforceable chain from business idea to production. Evolith may integrate external execution and analytics products, but it retains authority over Phase Gates, evidence acceptance, exceptions, traceability, and audit history.

> **Work platforms manage work. Agents execute work. Observability platforms inspect AI. Analytics platforms visualize data. Evolith governs the complete engineering process.**

### 1.3 Target Problem and Customer Hypothesis

Evolith targets organizations that operate multiple products, repositories, teams, countries, or delivery tools and suffer from:

- fragmented architecture and process knowledge;
- inconsistent evidence and approval criteria;
- tool-specific workflows that do not create end-to-end traceability;
- excessive dependence on tribal knowledge;
- uncontrolled agent and LLM execution;
- costly audits, rework, and architecture drift.

The initial customer hypothesis is a medium or large organization that needs stronger engineering governance without replacing every existing system. This hypothesis must be validated through interviews and controlled product experiments.

### 1.4 Value Proposition

Evolith provides:

1. one inherited engineering Constitution;
2. one canonical taxonomy of phases, artifacts, evidence, and decisions;
3. one enforceable Phase Gate model;
4. one audit chain across humans, agents, tools, and source code;
5. one provider-neutral governance layer;
6. one upstream learning mechanism from satellite products into Evolith Core.

### 1.5 Essence and Spearhead (Wedge)

The category statement (§1.2) is the **umbrella** narrative (platform). The product's essence, in plain language, is:

> **Evolith makes architecture decisions actually hold — automatically, even when the one writing the code is an AI.**

The core principle is **READ vs CONTROL**. The entire market (developer portals, architecture suites) does *READ*: it exposes its catalog *to* AI agents in read-only mode and trusts them to behave. Nobody does *CONTROL*: deterministically constraining what the agent *produces*. Evolith occupies that front — it compiles decisions (ADRs, C4, Phase Gates) into executable guardrails, imposes them on the agent before it generates, and blocks the merge if they are violated.

> **You don't give the agent context. You impose a contract on it.**

This essence is the **go-to-market spearhead** (the wedge): executable architecture governance, which corresponds to **Phase Gate 3 (Architecture Drift)**. You land through that front —where there is no incumbent today— and expand toward the complete SDLC governance plane described in the umbrella statement. The competitive analysis of this second axis is detailed in the [Strategic Positioning and Comparative Landscape](../positioning/evolith-strategic-positioning-comparative-landscape.md) (§§13-15).

### 1.6 In plain terms: the construction-site analogy

Building software is like constructing a building: it runs from "we want a building here" (the idea) to handing over the keys (production).

Today most projects are **a construction site with no inspector**: the blueprints (the architecture decisions) sit in a drawer nobody opens, everyone builds their own way, and now **robot bricklayers** (AI) arrive and raise walls incredibly fast — without ever looking at the blueprints. Everything seems fine until, months later, the building has cracks, nobody knows who laid what, and fixing it costs a fortune.

Evolith is **the site manager and the inspector, in one**. It does three things:

1. **It puts a checkpoint at every stage (the 5 Phase Gates).** A stage cannot start until the previous one is approved — just as you don't pour concrete without approved plans, nor raise walls until the foundation passes inspection.
2. **It keeps a logbook that cannot be erased (the evidence).** Who approved what, when, and with what proof. When an audit comes, the answer is already there.
3. **It applies the same rules to everyone — people and robots.** Nobody skips the inspection just to go faster.

| Stage | On the site | Phase Gate |
|---|---|---|
| Idea | Is it worth building? | 1 · Discovery |
| Blueprints | Project and plans approved | 2 · Design |
| Construction | Build according to the plans | 3 · Construction (Architecture Drift) |
| Review | Quality and security testing | 4 · QA & Integration |
| Handover | Final inspection before the keys | 5 · Release |

What Evolith **does not** do matters as much as what it does: the site manager is not the electrician or the plumber — it coordinates and certifies them. Evolith does not replace your tools (Jira organizes the work, the AI builds, Langfuse watches); it lets them do their job but retains the authority to say which stage is approved.

> **Evolith turns software construction from an uncontrolled site —where everyone, AI included, does whatever they want and the cracks show up late— into a governed site: inspections at every stage, a logbook that cannot be erased, and the same rules for humans and robots, from the idea to the keys.**

---

## 2. Ecosystem and Governance Kernel

### 2.1 Evolith Core (`evolith_arch32`)

Evolith Core is the living Reference Corpus and engineering **Constitution**. It is readable by humans and consumable by machines.

```text
Reference Corpus (Constitution)
├── Architectural Directives
├── Core and Platform-Specific ADRs (including ai-augmented/ category)
├── Standards and Taxonomies
├── Rulesets (26 categories) and Skills
├── Artifact and Evidence Schemas
├── Phase Gate Definitions
├── OPA Policies (25+ .rego) with dual-engine parity
└── Adapter and Integration Contracts
```

**ADR-0101: Core is a stateless Evaluation Engine.** Core receives an `EvaluationContext` with opaque identifiers, runs multi-kind evaluations (gate, artifact, evidence, architecture, blueprint, topology, checkpoint, deployment, rule, compliance), and returns an `EvaluationResult` with non-binding verdicts and recommendations. Core **does not persist** state — Tracker owns the governance state at runtime.

Core remains vendor-neutral. Product-specific decisions belong in adapters, platform-specific references, or satellite repositories unless generalized into reusable, evidence-backed patterns.

### 2.2 Evolith Tracker

Evolith Tracker is the **SaaS SDLC Orchestrator and Auditor** that executes the governance model defined by Core.

It is not merely a task manager. Tracker owns the runtime governance state for:

- registered satellite products;
- active SDLC processes;
- phase executions;
- gate evaluations;
- accepted and rejected evidence;
- exceptions and approvals;
- agent runs and conversational sessions;
- immutable decision and audit history.

> Repository: [`evolith_tracker`](https://github.com/beyondnetcode/evolith_tracker)

### 2.3 The Irreducible Governance Kernel

Evolith must build and own:

1. the canonical five-phase SDLC and Phase Gate state machine;
2. Core rulesets (26 categories), schemas, standards, taxonomy, and inheritance;
3. the canonical artifact and evidence model;
4. the **EvaluationOrchestrator** with 10 EvaluationKinds and 5 KindEvaluators;
5. traceability from business intent to architecture, code, QA, and release;
6. Architecture Drift and adherence scoring (progressive axis F1/F2/F3);
7. the **Agent Runtime** with hexagonal ports, interaction adapters, and governed orchestration;
8. OPA rulesets (25+ policies) with dual-engine parity (Native TypeScript + OPA/WASM);
9. provider-neutral contracts for work systems, agents, observability, analytics, repositories, CI/CD, testing, and deployment;
10. final authority over every phase transition (non-binding recommendations; Tracker decides);
11. promotion of validated satellite lessons upstream into Core.

### 2.4 Execution Modes

Each module supports configurable execution through *Convention over Configuration*:

| Mode | Who Executes | Governance Model |
|---|---|---|
| **Human-Driven** | Engineering and product teams | Humans execute and approve under Evolith rules |
| **Agent-Driven** | Specialized AI agents | Agents execute bounded activities; humans govern exceptions and critical decisions |

The chatbox is an intermediary, not the source of authority. Tenant-selected LLMs and agents consume approved context, rulesets, skills, and permissions through Evolith contracts.

### 2.5 Technical Interface Layer

> **Two-layer exposure (ADRs [0074](../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md) + [0075](../../../reference/core/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.md)).** Evolith Core **exposes** its capability through a product-neutral **Core API Exposure Layer** — `apps/core-api` (REST) plus the `mcp-server` (MCP) and the `evolith-cli` (CLI). The Evolith Tracker is an **external client**: its **BFF / Application Gateway** (NestJS, ADR-0075, in the `evolith_tracker` repository) consumes that exposure and tailors per-device payloads, strips PII, and manages session/cookies for the PWA. The Tracker BFF does **not** live in Core — [ADR-0074](../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md) explicitly **rejected** that option.

```mermaid
flowchart TB
  subgraph TRK["repo · evolith_tracker (autonomous SaaS product)"]
    PWA["Evolith Tracker · PWA<br/>Web · Mobile"] --> BFF["BFF · Application Gateway<br/>NestJS · ADR-0075<br/>device payloads · PII · cookies"]
  end
  subgraph CORE["repo · evolith_arch32 (Evolith Core · Constitution)"]
    subgraph EXP["Core API Exposure Layer · ADR-0074"]
      API["apps/core-api<br/>REST · 11 controllers"]
      MCP["mcp-server<br/>MCP · 47 tools · 11 resources"]
      CLI["evolith-cli<br/>CLI · 31 commands"]
    end
    subgraph RT["Agent Runtime · @beyondnet/evolith-agent-runtime"]
      ARS["AgentRuntimeService<br/>16 ports · 38 adapters"]
      IA["InteractionAdapters<br/>CLI Command · CLI Chat · Hermes · MCP · OpenCode · External"]
    end
    DOM["@beyondnet/evolith-core-domain<br/>EvaluationOrchestrator · 10 Kinds<br/>rulesets JSON · OPA/WASM · schemas"]
    API --> DOM
    MCP --> DOM
    CLI --> DOM
    ARS --> DOM
    IA --> ARS
  end
  BFF -->|external client| API
```

<details>
<summary>Legacy text diagram (same interfaces, pre ADR-0074)</summary>

```text
                         Evolith Tracker
          ┌──────────────────────────────────────────┐
          │ Phase State · Gates · Evidence · Audit   │
          └───────────────┬──────────────────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
    REST API          MCP Tools          Event Bus
  UI and CI/CD      LLMs and Agents    Reactive Flows
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                    Evolith Core
          rulesets · schemas · ADRs · standards
```

</details>

| Interface | Consumer | Purpose |
|---|---|---|
| **REST API** | Tracker UI, CI/CD, enterprise integrations | 11 controllers: evaluation, gates, phases, architecture, projects, satellites, capabilities, composable-validate, reference, metrics, health |
| **MCP HTTP/SSE** | LLMs and autonomous agents | 47 tools, 11 resources, 8 prompts: evaluation, validation, agents, ADRs, MoSCoW, drift, configuration |
| **CLI** | Engineers and product roles | 31 commands: validate, evaluate, gate, drift, scaffold, ADR lifecycle, agents, chat, satellite, sdlc |
| **Agent Runtime** | AI agents, chatboxes, external triggers | 16 hexagonal ports, 38 adapters, 6 interaction adapters (CLI Command, CLI Chat, Hermes, MCP, OpenCode, External), governed orchestration with OPA + HITL |
| **Webhook / Event Bus** — *not implemented, roadmap* | *(none yet)* | **No webhook or event-bus surface ships today.** Evolith exposes no inbound webhook endpoint and delivers no outbound webhook or event traffic. The only related code is `src/packages/infra-providers/src/webhook.adapter.ts`, an **outbound-only** adapter with no surface wired to it. See [Ecosystem & Communication](../../products/ecosystem-and-communication.md). Propagating commands, evidence, status changes, and gate outcomes reactively remains a roadmap item. |

---

## 3. Governed Composition

### 3.1 Strategic Principle

Evolith adopts **Governed Composition**:

> **Build the irreducible governance kernel. Compose mature commodity capabilities behind replaceable ports, adapters, and Anti-Corruption Layers.**

The objective is not to rebuild every specialized product. The objective is to make external capabilities operate under one Evolith governance model.

### 3.2 Capabilities Evolith Should Usually Compose

Evolith should normally integrate or embed:

- LLM and agent telemetry;
- prompt experimentation and evaluation;
- analytical dashboards and data exploration;
- generic backlog and task-board mechanics;
- source control and CI/CD execution;
- test runners, contract testing, and security scanners;
- deployment and release platforms;
- document-generation engines;
- general-purpose autonomous agents;
- collaboration and notification channels.

### 3.3 Capability Decision Model

Every new capability must receive one explicit disposition:

| Disposition | Meaning |
|---|---|
| **Adopt** | Use the external capability largely as provided |
| **Embed** | Present an external capability within the Evolith experience |
| **Integrate** | Keep it external and exchange commands, events, and evidence |
| **Extend** | Add Evolith adapters, plugins, or governance controls |
| **Build** | Implement natively because it is an irreducible differentiator or unmet requirement |
| **Reject** | Exclude it because of security, licensing, lock-in, operational, or architecture risk |

The decision must evaluate strategic differentiation, functional fit, governance fit, replaceability, data ownership, tenant isolation, security, licensing, user experience, operational burden, and total cost of ownership.

### 3.4 Adapter Taxonomy

```text
Evolith Provider Contracts
├── Work Management Port
├── Agent Execution Port (IAgentEnginePort)
├── LLM Observability Port
├── Analytics Port
├── Repository Port
├── CI/CD Port
├── Testing Port
├── Security Scanner Port
├── Deployment Port
├── Collaboration Port
├── Core Evaluation Port (ICoreEvaluationPort)
├── Policy Validation Port (IPolicyValidationPort)
├── Tracker Trace Port (ITrackerTracePort)
├── Memory Port (IMemoryPort)
├── Approval Port (IApprovalPort)
├── Scheduler Port (ISchedulerPort)
├── Harness Port (IHarnessPort)
└── Interaction Adapter Port (InteractionAdapterPort<T>)
     ├── SmartCliCommandInteractionAdapter
     ├── SmartCliChatInteractionAdapter
     ├── HermesChatBoxInteractionAdapter
     ├── McpInteractionAdapter (GT-405)
     └── ExternalTriggerInteractionAdapter
```

No vendor-specific schema may leak into the canonical domain model. Provider changes must not require rewriting Evolith bounded contexts.

---

## 4. Operational Model and Authority

### 4.1 Federated Governance

Evolith uses a Hub-and-Spoke inheritance model:

```text
Evolith Core (Level 0 — Constitution)
              │ inherits
              v
Satellite Product (Level 1 — Product Instance)
              │ proposes evidence-backed improvement
              v
Architecture Board Review
              │ approved promotion
              v
Evolith Core evolves and all satellites inherit
```

Satellites may define local product and tenant configuration. Reusable architectural rules, patterns, schemas, and standards require upstream approval.

### 4.2 Anti-Corruption Layers

External tools are integrated through ACLs that:

- preserve source identifiers, timestamps, and evidence lineage;
- map external concepts to Evolith canonical artifacts;
- validate Core and tenant rules;
- reject non-compliant transitions or evidence;
- remain versioned and replaceable.

### 4.3 Authority and Data Ownership

| Information | Authoritative Source |
|---|---|
| Phase and Gate state | Evolith Tracker |
| Core rule definition | Evolith Core |
| Tenant rule, skill, and model configuration | Evolith Tracker under tenant authorization |
| Exception and approval decision | Evolith Tracker |
| Code and commit state | Connected source-control platform |
| Pipeline and deployment execution | Connected CI/CD or deployment platform |
| Agent trace and evaluation | Connected observability provider, referenced by Evolith |
| Work-item operational state | Connected work system, mapped through ACL |
| Official metric definition and acceptance threshold | Evolith Core or approved tenant governance |
| Dashboard rendering | Evolith or connected analytics provider |

External tools produce operational facts and evidence. Tracker decides whether that evidence satisfies governance.

### 4.4 Unified Product Experience

Users must experience one coherent Evolith process even when specialized capabilities are external. Evolith provides:

- unified navigation by tenant, product, process, phase, and gate;
- canonical state and evidence summaries;
- governed actions and approvals;
- deep links to source tools;
- consistent identity and authorization;
- explicit source lineage and provider status;
- one audit narrative from idea to production.

---

## 5. The Five-Phase SDLC

### 5.1 Phase Modules

```text
Phase 1          Phase 2            Phase 3           Phase 4          Phase 5
Discovery ──── Spec-Driven ──── Construction ──── Automated QA ──── Release
                   Design                                              Planner
    │                 │                  │                │                │
    v                 v                  v                v                v
Business          Design             Successful       RC Stamped     Production
Sign-Off          Baseline            Build                            Live
```

| Module | Gate | Core Outcome |
|---|---|---|
| **Product Discovery and Ideation** | Business Sign-Off | Validated problem, customer, ROI, KPIs, assumptions, and capability strategy |
| **Architecture Spec-Driven** | Design Baseline | Approved functional intent, contracts, ADRs, evidence requirements, and architecture baseline |
| **Construction Tracking** | Successful Build | Implemented work with source, pipeline, specification, and drift traceability |
| **Automated QA and Integration** | RC Stamped | Verified quality, security, contracts, regression, and accepted exceptions |
| **Dynamic Release Planner** | Production Live | Approved rollout, operational readiness, observability, rollback, and release evidence |

### 5.2 Gate Evidence

| Gate | Minimum Evidence | Pass Authority |
|---|---|---|
| **Business Sign-Off** | Discovery Canvas, customer hypothesis, ROI, KPIs, assumptions, build-versus-compose analysis | Accountable business stakeholders |
| **Design Baseline** | Functional stories, contracts, ADRs, threat and risk analysis, evidence plan | Architecture and product governance |
| **Successful Build** | Source changes, linked work, successful CI, DoD, architecture-drift result | Construction gate policy and authorized approvers |
| **RC Stamped** | Test summary, coverage, security and contract results, exception status | Quality governance |
| **Production Live** | Release plan, observability, rollback, operational sign-off, deployment evidence | Operations and release governance |

### 5.3 Build-versus-Compose Requirement

Discovery must evaluate existing open-source, free-tier, and commercial capabilities before native development is approved. The evidence must include:

- alternatives and functional coverage;
- Adopt, Embed, Integrate, Extend, Build, or Reject disposition;
- three-year cost and operating burden;
- licensing and redistribution constraints;
- security, tenant isolation, and data ownership;
- provider replaceability;
- proof-of-concept requirements;
- explicit justification for native implementation.

---

## 6. Evidence Graph and Agent Governance

### 6.1 Canonical Evidence Graph

Every accepted evidence item must be traceable to:

- tenant and product;
- SDLC process, phase, gate, and criterion;
- artifact and business intent;
- source provider and external identifier;
- human or agent actor;
- model, prompt, ruleset, and skill versions when applicable;
- repository, commit, pipeline, test, or deployment reference;
- cost, latency, timestamps, and integrity metadata;
- evaluation result, approval, exception, and final decision.

The graph must answer: **what business decision produced this change, which rules governed it, what evidence validated it, and who authorized production?**

### 6.2 Governed Agent Execution

Agents are replaceable executors, not authorities. Evolith owns:

- the activity contract;
- approved context and data boundaries;
- tenant permissions;
- expected artifact and evidence;
- acceptance criteria;
- human approval requirements;
- audit linkage and failure handling.

### 6.3 LLM and Agent Observability

Specialized platforms may provide traces, evaluations, cost, prompt versions, tool calls, and latency. Evolith maps those records into its canonical evidence model and determines whether they satisfy a gate criterion.

---

## 7. Product Boundaries and Non-Goals

### 7.1 Evolith Is Not

Evolith is not required to be:

- a replacement for Jira, Trello, Linear, or Azure DevOps;
- a source-control or CI/CD platform;
- a specialized LLM observability product;
- a general-purpose BI engine;
- a model provider;
- a desktop autonomous agent;
- a replacement for every testing, security, or deployment tool.

Evolith may provide native capabilities where evidence proves strategic value, but its category does not depend on replacing these products.

### 7.2 Non-Negotiable Boundary

No external platform, successful LLM response, completed work item, generated document, or green pipeline can independently approve a phase transition. Only Evolith's authorized gate evaluation can change the canonical governance state.

---

## 8. Business Strategy and Ecosystem

### 8.1 Open-Core Model

```text
OPEN CORE                                  ENTERPRISE TRACKER
Core Constitution                         Multi-Tenant Governance
ADRs, Standards, and Taxonomies           Governed Orchestration
Rulesets, Schemas, and Contracts           Evidence Graph and Audit
CLI · MCP · REST/GraphQL Exposure         Managed and Certified Adapters
Community Adapter SDK                     Executive and Compliance Views
Reference Implementations                 Enterprise Support and SLA
```

### 8.2 Enterprise Value

Enterprise monetization focuses on:

- tenant governance and administration;
- evidence consolidation and immutable audit;
- configurable gates, policies, exceptions, and approvals;
- certified and managed integrations;
- regulatory and compliance packs;
- on-premise and controlled deployment;
- private rules, skills, and adapter catalogs;
- trusted scorecards and executive reporting;
- enterprise support, SLA, and managed hosting.

Evolith does not monetize merely by rendering dashboards. It monetizes the reliability, governance, and auditability of the information and decisions behind them.

### 8.3 Adapter Ecosystem

The ecosystem may include official, certified, and community adapters with:

- stable SDK and contracts;
- compatibility and security requirements;
- version and deprecation policies;
- test harnesses and certification;
- deployment and licensing metadata;
- a future integration marketplace.

---

## 9. Validation Before Construction

### 9.1 AI-Assisted Validation Workflow

Before implementation, teams use approved AI research and engineering tools to challenge the product hypothesis:

```text
Evidence Pack
    -> Product Research and Counterarguments
    -> Human Review
    -> Brainstorming or Product Office Hours
    -> Capability Disposition Matrix
    -> Product Decision Record
    -> Architecture and Engineering Review
    -> Approved Plan
    -> Controlled Implementation
    -> Operational Evidence
    -> Upstream Lessons
```

The provider is replaceable. Claude Chat, Research, Cowork, Claude Code, Superpowers, gstack, or future equivalents are execution options, not Core dependencies.

### 9.2 Required Validation Outputs

Every significant capability proposal must produce:

- problem reframing;
- customer and assumption register;
- competitive counterargument;
- capability disposition matrix;
- differentiation proof;
- falsifiable experiment plan;
- human-approved decision record;
- unresolved risks and uncertainty.

### 9.3 Guardrails

AI output is analysis, not authority. Humans approve changes to vision, rulesets, ADRs, exceptions, and gates. Credentials, production secrets, and unrestricted customer data must remain outside unapproved contexts.

---

## 10. Minimum Provable Product

### 10.1 Vertical Slice

The first proof should not implement every module in full. It should execute one controlled product slice through all five gates with:

- one tenant;
- one product and SDLC process;
- one work-management provider;
- one repository and CI pipeline;
- one agent provider;
- one observability provider;
- one analytics provider;
- one canonical evidence graph;
- five minimum gate decisions.

### 10.2 Success Criteria

The proof succeeds when:

- Tracker remains authoritative for every gate;
- evidence lineage is complete and tenant-safe;
- providers can be replaced without changing the domain model;
- users experience one coherent process;
- composed delivery is faster than rebuilding commodity tools;
- Evolith produces measurable value beyond the tools used independently.

---

## 11. Metrics and Capability Maturity

### 11.1 Engineering and Executive Metrics

Evolith consolidates DORA and selected SPACE metrics while preserving their source and calculation definition.

### 11.2 Governance Metrics

| Metric | Purpose |
|---|---|
| **Evidence Completeness** | Percentage of decisions with all mandatory evidence |
| **Gate Automation Rate** | Percentage of criteria evaluated automatically |
| **Traceability Coverage** | Percentage of changes linked to intent, artifact, evidence, and decision |
| **Architecture Drift Prevention** | Violations blocked before production |
| **Decision Lead Time** | Time from complete evidence to authorized decision |
| **Exception Rate** | Percentage and risk profile of approvals through exception |
| **Audit Preparation Time** | Effort required to produce an audit-ready chain |
| **Provider Replacement Cost** | Effort required to replace an integrated capability |
| **Integration Lead Time** | Time required to onboard a new provider |
| **Rework Avoided** | Estimated rework prevented by early governance |
| **Governance Adoption** | Products and teams actively using the gate model |
| **Composed Value Index** | Measured benefit versus the same tools used independently |

### 11.3 Capability Maturity States

Every major capability must declare one state:

| State | Meaning |
|---|---|
| **Visioned** | Approved as part of the target product vision |
| **Designed** | Supported by approved functional and technical specifications |
| **Prototyped** | Demonstrated through a controlled technical proof |
| **Implemented** | Available in the product |
| **Validated** | Proven with representative users or customers |
| **Scaled** | Operated reliably under enterprise conditions |

Documentation must not present a Visioned or Designed capability as operationally validated.

---

## 12. Competitive Positioning

### 12.1 Category Message

> **Evolith composes the best engineering and AI tools under one executable governance model, preserving control, evidence, and auditability from idea to production.**

### 12.2 Defensible Differentiator

Evolith is differentiated by the combination of:

- executable Constitution;
- evidence-backed Phase Gates;
- canonical Evidence Graph;
- governed human and agent execution;
- provider-neutral composition;
- architecture adherence and drift control;
- federated upstream learning.

### 12.3 Strategic Test

A composed tool stack can replace many visible features. If Evolith cannot make its governance kernel operational, measurable, and easier to adopt than disconnected products, the composed stack can replace most of the product idea.

The roadmap must therefore prioritize governance proof over feature count.

---

## 13. Relationship to This Repository

This repository is Evolith Core: the authoritative Constitution and Reference Corpus for satellite products.

| Artifact | Location |
|---|---|
| Architectural Directives | `reference/core/sdlc/standards/vision/architectural-directives.md` |
| Strategic Validation and Composition Framework | `reference/core/sdlc/standards/vision/evolith-strategic-validation-and-composition-framework.md` |
| Strategic Comparative Landscape | `reference/core/sdlc/standards/vision/evolith-strategic-positioning-comparative-landscape.md` |
| AI-Assisted Validation Workflow | `reference/core/sdlc/standards/vision/evolith-ai-assisted-validation-workflow.md` |
| Evolutionary Roadmap | `reference/core/sdlc/standards/vision/evolutionary-strategy-roadmap.md` |
| SDLC Artifact Mapping | `reference/core/sdlc/sdlc-evolith-artifact-mapping.md` |
| Rulesets and Schemas | `rulesets/` |

---

## 14. Supplemental Reading

- [Strategic Validation and Composition Framework](../methods/evolith-strategic-validation-and-composition-framework.md)
- [Strategic Positioning and Comparative Landscape](../positioning/evolith-strategic-positioning-comparative-landscape.md)
- [AI-Assisted Product Validation Workflow](../methods/evolith-ai-assisted-validation-workflow.md)
- [Architectural Directives](../architecture/architectural-directives.md)
- [Evolutionary Strategy Roadmap](../strategy/evolutionary-strategy-roadmap.md)
- [Maturity Assessment](../../../reference/core/control-center/maturity-reports/maturity-assessment.md)
- [SDLC Artifact Mapping](../../../reference/core/sdlc/sdlc-evolith-artifact-mapping.md)
- [SDLC Tracker — Technical Interface Design](../../products/evolith-tracker/sdlc-tracker-technical-interfaces.md)

---

*This document constitutes the official product vision for Evolith. All product, architecture, governance, and roadmap decisions must align with it.*

---
[Back to Vision Index](./README.md)
