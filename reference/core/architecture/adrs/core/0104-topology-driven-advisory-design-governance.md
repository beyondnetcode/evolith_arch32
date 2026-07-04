> **Bilingual Navigation:** [Ver versión en Español](./0104-topology-driven-advisory-design-governance.es.md)

# ADR-0104: Topology-Driven Advisory Design-Phase Governance (Blueprint as Composable Development Guide)

> **Agent Signature:** Architect Agent (Winston)

## Status
Proposed (2026-07-04 — pending Architecture Board) — **extends [ADR-0079](./0079-multi-topology-reference-corpus.md) (multi-topology corpus) and [ADR-0101](./0101-core-stateless-evaluation-engine.md) (stateless evaluation engine)**

## Date
2026-07-04

## Context and Problem

Discovery and Design are the two most consequential SDLC phases. In **Design**, Evolith Core must take a larger role — as an engine of consultation, validation, recommendation, and technical-maturity measurement. The current Phase 2 (Design Baseline) implementation does not match that ambition, and in places contradicts already-ratified boundaries:

- **Topology is hardcoded, not chosen.** Phase 2 assumes `distributed-modules` with 8 blocking `DM-R*` rules and a blocking Extraction-Readiness ≥70% — a single mandatory ladder. Topology is not persisted in `evolith.yaml`; it is passed at command time. There is no topology-recommendation mechanism.
- **The blueprint is under-modeled.** `blueprint.schema.json` is topology/runtime-centric. It does not compose a design across concerns (frontend, backend, services, mobile, data), and has no extensible block model for continuous, community-driven additions.
- **Boundary drift.** The Phase 2 gate lists *Functional Stories / User Story / Agile Backlog* as mandatory evidence, contradicting [ADR-0101](./0101-core-stateless-evaluation-engine.md) and [ADR-0100](./0100-governance-execution-boundary-product-initiative.md) (agile artifacts are `ExternalReference`, not Core entities).
- **No design-maturity surface.** There is no `design` evaluation that derives required/conditional artifacts by topology, measures technical maturity, compares against blueprints/ADRs/coding practices, or derives downstream criteria. Drift detection exists but is reactive.
- **No collaboration/growth loop for design knowledge.** Tenants cannot compose reusable design templates or promote them upstream; agents do not proactively propose design templates.

The infrastructure to fix this already exists and is extensible: the stateless `EvaluationOrchestrator` (ADR-0101) with registrable `KindEvaluators`, an `EvaluationContext`/`EvaluationResult` contract that already carries `topologyRef`/`blueprintRef`/`initiative`/`initiativeGroup` and emits `recommendations`/`gaps`/`risks`, the multi-topology corpus and composition model (ADR-0079), and a structured blueprint schema with `topology`+`phase`. The gap is coverage and posture, not foundations.

## Objective and Scope

Define the **governing posture and canonical model** for the Design & Architecture phase so that Core **recommends, validates, and measures technical maturity** over an extensible catalog of architectural building blocks, driven by the confirmed topology (possibly mixed), while remaining stateless and non-binding.

**In scope:** the Design-phase posture; the canonical definition and composition model of the blueprint; topology optionality and mixed-topology derivation; the unit of evaluation; minimum/conditional artifact classification; coding-practice maturity; the blueprint as a generative contract for downstream phases; the tenant→Core collaboration loop; Open-Core community extensibility; Convention-over-Configuration extensibility.

**Out of scope (delegated):** concrete schemas, the `design` evaluator implementation, CLI/MCP/API wiring, and per-topology `designProfile` population (companion changes, sequenced after this ADR). Design **authoring tooling** belongs to the Evolith Tracker, not Core.

## Options Considered

1. **Prescriptive gate (rejected).** Keep/extend a mandatory minimum-artifact checklist that blocks in Core, with a fixed topology ladder. Rejected: contradicts ADR-0101 (Core is non-binding), forces one topology, and does not scale to mixed designs or community growth.
2. **Advisory, topology-driven, block-composable governance (adopted).** Core recommends/validates/measures maturity over a Convention-over-Configuration block catalog; the blueprint is the composable development guide; the consumer (Tracker) decides blocking.
3. **Defer to satellites (rejected).** Leave Design governance to each product. Rejected: loses the inherited constitution, drift control, and the upstream-learning growth loop that are Evolith's differentiators.

## Decision and Rationale

Adopt **Topology-Driven Advisory Design-Phase Governance**. Core is a **stateless advisor** for Design.

### 1. Canonical definition of Blueprint
A **blueprint is a detailed scheme that serves as a guide to develop a project, process, or system.** Every other facet (catalog of blocks, validated artifact, generative contract) serves this purpose: a good blueprint is a good development guide. Core measures a blueprint's maturity = *how good a guide it is*.

### 2. Advisory posture (per ADR-0101)
For Design, Core **recommends, helps validate, and measures technical maturity** — it does not impose. Its output is **non-binding** (`Recommendation`/`DecisionRecommendation`, `GapFinding`, `RiskFinding`, maturity scores). **Who blocks is the consumer** (Tracker) via its configurable gate; Core never blocks by itself.

### 3. Blueprint as the box of blocks (Convention over Configuration)
The blueprint is composed and validated from **blocks and references**, across **concerns** (`frontend`, `backend`, `services`, `mobile`, `data`, …); each concern may vary independently (topology, patterns, runtime, plans). This is highly dynamic and MUST be modeled under **Convention over Configuration**: a **block-type registry** + composition conventions so that any new block, concern, or proposal fits without redesigning the engine. **All technical architecture concepts are addable over time, by convention** — the model is never closed.

### 4. Topology: optional, overridable, extensible, mixable
The progressive axis (F1/F2/F3 = modular-monolith → distributed-modules → microservices) is **optional, overridable, and extensible** per tenant (choose another topology, skip the progression, or define more levels). A product may compose **mixed topologies**. Topology is **recommended in Discovery** and **confirmed in Design** (as a composition) via `evolith.yaml`. The current `distributed-modules` + `DM-R*` + Extraction-Readiness set is reframed from *Core-blocking* to *advisory that scores maturity*.

### 5. Unit of evaluation = the initiative
Core evaluates the **initiative** (grouped via `initiativeGroup` or solo) that passed Discovery. **User stories, backlog, and epics are not Core concerns** — they are `ExternalReference` owned by the Tracker (per ADR-0101, ADR-0100). The Phase 2 gate's story/backlog evidence is deprecated accordingly.

### 6. Minimum + conditional artifacts as blocks
Recommended design artifacts are **blocks/sections within the blueprint**, not standalone documents: a small **universal** set (architecture blueprint, testing strategy, ADRs, topology-compliance, technical-maturity) recommended for any initiative, plus **topology-derived** blocks (infrastructure, DevOps/CI-CD, unit-test, build, performance plans) whose requirement and thresholds are the **union of the confirmed topologies' `designProfile`s**, with strictest-wins merge and incompatibility → recommended reconciling ADR. These are **recommended defaults that feed the maturity score**, overridable/extensible by tenant — not a hard blocking floor.

### 7. Coding practices as maturity blocks
Reference coding practices — DRY, YAGNI, clean code, clean architecture, design patterns — are **catalog blocks that score design maturity** (advisory), alongside topology and artifact completeness.

### 8. Blueprint as a generative contract for downstream phases
A composed, validated blueprint **feeds and defines the requirements and criteria** of Construction, Quality, and Deployment. Core **derives** those requirements/criteria from the blueprint as **recommendations** (stateless: blueprint in → derived criteria out); the Tracker uses them to configure each phase gate. A more mature blueprint yields richer, more traceable downstream criteria.

### 9. Collaboration & growth loop (Open-Core)
Tenants compose designs from blocks and may **create reusable tenant-scope templates** (persisted in the **Tracker**), or **request promotion** of a template to Core via **Upstream Proposals (UP-NNN)** → Architecture Board → canonical corpus, tiered `community | certified | official`. **Core agents proactively propose** design templates and ideas at three complexity tiers (**simple / medium / complex**). All design knowledge (topologies, ADRs, blueprints, rulesets, schemas, templates, standards) is **community-extensible open source** under governance, with a CI certification gate for external contributions. This upstream-learning loop continuously enriches Core.

### 10. Statelessness preserved (per ADR-0101)
Core **derives, recommends, validates, and measures**; it **receives** promotion proposals. It **never persists** tenant-scope templates, evidence, or downstream configuration — those live in the Tracker. Design **authoring tools** live in the Tracker.

### 11. Tenant-scoped private collections — personalized intelligence
Although the Core is stateless and holds only the canonical corpus, **a tenant may maintain its own private collection of ADRs, templates, rulesets, blueprints, patterns, and standards at the Tracker level** (tenant-scope, persisted by the Tracker), so its agents and design intelligence are **richer and personalized to its reality**.
- The **effective catalog** a tenant's agents and evaluations see = **canonical Core corpus ∪ tenant private collection**. The tenant may **extend/add** freely and **override** where permitted — never relaxing the Core-set floor (intelligent-gate model).
- **Core stays stateless:** the tenant (via the Tracker) **supplies its private ADRs/rulesets/blueprints as context/refs** in the `EvaluationContext` (`rulesetRef`, `policyRefs`, `blueprintRef`, `adrRefs`, `schemaRef`); Core evaluates against the union and never persists the tenant collection.
- The tenant's **own agents** (per the [Agent Authority Model](../../../foundations/agent-skills/agent-authority-model.md)) use the private collection as personalized knowledge for proposals and advisory — closer to the tenant's domain than pure Core.
- Anything the tenant wants to make canonical flows upstream via UP-NNN (§9).

## Evidence and Evaluation Criteria

- **Consistency with ratified boundaries:** aligns with ADR-0101 (stateless, non-binding, `initiative`/`initiativeGroup` opaque) and ADR-0079 (multi-topology corpus + composition); resolves the story/backlog drift already mandated by ADR-0100/GT-375.
- **Reuse over rebuild:** the `EvaluationOrchestrator` + `KindEvaluators`, `EvaluationContext`/`Result`, topology manifests (`spec.artifacts`, `operationalBudgets`, `composableWith`), and `blueprint.schema.json` already exist; this decision extends them additively.
- **Maturity as primary signal:** consistent with the existing maturity framework (TOGAF ACMM + evidence-backed states, `maturity-evidence.schema.json`).
- **Acceptance criteria** and a **validation checklist** are recorded in the implementation plan and become companion `GT-*` items (Native/OPA parity R-25, bilingual parity, ajv schema validation, BR-008 CLI/MCP/API result parity, zero regression on the current F2 gate).

## Consequences, Risks, and Trade-offs

**Positive:** Design becomes a first-class advisory surface; topology drives artifacts (incl. mixed); the blueprint is a coherent development guide that also drives downstream phases; a governed growth loop enriches Core; Convention over Configuration keeps the model perpetually extensible; closes the "existence-only gate" gaps (GT-08…GT-11) by making Design a maturity-measured surface.

**Negative / risks:**
- *Reframing the F2 gate* (distributed-modules blocking → advisory) risks breaking satellites that rely on today's blocking behavior → mitigate with backward-compatible defaults and phased deprecation (warning → error); blocking becomes the Tracker's decision.
- *Removing story/backlog evidence* → reclassify as `ExternalReference` (accepted as opaque reference, not evaluated); deprecate with warnings.
- *Community contributions* could introduce inconsistency or insecurity → mandatory CI certification (ajv + Native/OPA parity + bilingual + fixtures), Board review via UP-NNN, and OPA policy validation; `community` tier is non-canonical until approved.
- *Convention-over-Configuration model* adds up-front design cost in the block-type registry → justified by perpetual extensibility.

**Trade-offs:** Core gains breadth (recommend/validate/measure/derive) while explicitly refusing enforcement authority and persistence — the value is trustworthy guidance and maturity measurement, not gatekeeping.

## References

- [ADR-0079 — Multi-Topology Reference Corpus and Topology Manifest](./0079-multi-topology-reference-corpus.md)
- [ADR-0101 — Evolith Core as a Stateless Evaluation Engine](./0101-core-stateless-evaluation-engine.md)
- [ADR-0100 — Governance ↔ Execution Boundary](./0100-governance-execution-boundary-product-initiative.md)
- [ADR-0045 — Microservice Extraction Readiness Criteria](./0045-microservice-extraction-readiness-criteria.md)
- [ADR-0018 — Testing Pyramid and Quality Gates](./0018-testing-pyramid-quality-gates.md)
- [Product Vision Master](../../../../../product/suite/vision/evolith-product-vision-master.md) §2.4 (Execution Modes), §4.1 (Federated Governance), §8 (Open-Core)

## Related Decisions and Standards

- **Extends:** ADR-0079, ADR-0101. **Reconciles:** ADR-0100/GT-375 (agile artifacts as `ExternalReference`).
- **Companion (sequenced) changes:** `spec.designProfile` in topology manifests; `design` `EvaluationKind`; multi-concern `blueprint.schema.json` under CoC; `topology-recommendation` rules; `evolith.yaml` schema with `design.topology.recommended|confirmed`; `design-template.schema.json`; agent skills `design-template-proposal` / `template-promotion`; blueprint→downstream criteria derivation.
- **Glossary:** the canonical **Blueprint** definition (this ADR §1) is enshrined in [`reference/core/sdlc/glossary/glossary.md`](../../../sdlc/glossary/glossary.md).
- **Agent learning records:** [Agent Authority Model](../../../foundations/agent-skills/agent-authority-model.md), [Tracker Discovery Flow](../../../foundations/agent-skills/tracker-discovery-flow.md).

---
[Back to ADR Registry](./README.md)
