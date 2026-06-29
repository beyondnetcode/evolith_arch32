> **Bilingual Navigation:** [Ver versión en Español](./0100-governance-execution-boundary-product-initiative.es.md)

# ADR-0100: Governance/Execution Boundary — Producto and Iniciativa as Primary Units, with Advisory Capability

> **Agent Signature:** Architect Agent (Winston)

## Status
Accepted (2026-06-29 — Architecture Board; diagnosis + Decisions 2–6 valid) — **Decision 1 superseded by [ADR-0101](./0101-core-stateless-evaluation-engine.md) (Accepted 2026-06-29)**.

> **Correction:** Decision 1 below framed `Producto`/`Iniciativa` as Core governance units with persistence/anchoring. [ADR-0101](./0101-core-stateless-evaluation-engine.md) corrects the *altitude*: the Core is a **stateless evaluator**; product/tenant/initiative are **opaque context identifiers only**, owned and persisted by the Tracker. The diagnosis and Decisions 2–6 of this ADR remain valid.

## Date
2026-06-28

## Context and Problem

Evolith Core declares it is **not** "a task-management platform" (`reference/core/README.md:47`, section header `:41`), yet its governance surfaces **contradict** that declaration by requiring agile execution artifacts as **blocking gate evidence**: *Evolith User Story* and *Agile Backlog* are marked **Required** in Phase 2, *Technical Stories* **Required** in Phase 3 (`reference/governance/sdlc/sdlc-evolith-artifact-mapping.md:130,132,133,223`), and the Phase 2 gate depends on "story readiness" (`:209`). Operational schemas live inside the Core as canonical contracts (`rulesets/schema/evolith-user-story.schema.json`, `agile-backlog.schema.json` with `sprint`/`velocity`/`totalPoints`, `functional-story.schema.json`, `ballpark-estimation.schema.json`).

At the same time, **no `Producto` or `Iniciativa` entity exists** in the Core domain (`packages/core-domain/src/domain/entities/` holds only `blueprint.ts`); the initiative is an opaque, never-persisted string (`gate-evidence.ts:87-89`). Evolith Tracker already models `PRODUCT`/`SDLC_PROCESS` as first-class aggregates (`reference/products/evolith-tracker/sdlc-tracker-technical-interfaces.md:415-428`), so the Core trails its own Tracker.

This is the **governance ↔ operational-execution conflation**: the Core mixes the durable governance plane (architecture, SDLC, rules, decisions, traceability) with the volatile execution plane (epics, stories, tasks, sprints, estimates, velocity, boards) that belongs in external tools (Jira, Azure DevOps, GitHub Projects, Trello, Asana).

A correct precedent already exists: `executive-scorecard-rule.handler.ts:55` returns `skipped` for sprint throughput ("requires tracker data") — the boundary is applied, but only partially.

## Decision

Adopt a strict **governance/execution boundary** for Evolith Core, with `Producto` and `Iniciativa` as the primary units of governance.

### 1. Producto and Iniciativa are the primary governance units
- `Producto` is the primary unit of evolution, architecture, governance, and traceability (aligned with the Tracker `PRODUCT`).
- `Iniciativa` is the primary unit of governed change/improvement/requirement/transformation/delivery. **A Producto has one or many Iniciativas (1:N), possibly concurrent, and each Iniciativa governs its own SDLC flow** (phases, gates, artifacts, evidence).
- All evidence, validation, decision, and advisory anchors to `(tenantId → productId → initiativeId → phaseId → gateId)`. Multi-tenant by construction.

### 2. Epics/stories/issues/tasks are external references only
- Epics, stories, issues, tasks, sprints, story points, backlog, and estimates are **never Core entities**. They may exist **only** as an optional `ExternalReference` hanging off an `Iniciativa` (or an `Evidencia`), represented as `system + externalId + url + hash/snapshot` — **never copying** the canonical external datum. The Core stays agnostic of the tenant's external system.
- No Core gate may treat an `ExternalReference` as `mandatoryEvidence` or blocking. Gates evaluate governance `Artefacto` + `Ruleset`, never stories.

### 3. Evaluation ≠ Decision ≠ Advisory (three output types)
- `ValidationResult` — compliance **evaluation** produced by Core/CLI/MCP (stateless); does not mutate phase state.
- `DecisionRecord` — **binding** governance decision (gate verdict via the canonical `Verdict` vocabulary); the canonical gate verdict is **emitted by Tracker at runtime**, the Core defines the shape.
- `AdvisoryRecord` — **non-binding** consulting / architectural assistance (recommendations, design options, risk/cost guidance) produced by Core advisory engines or AI agents (Winston, Principal Architect). It guides but never blocks a gate.

### 4. Evolith is both a governance authority and an architectural advisor
Beyond governing (validate + decide), the Core provides **architectural consulting and assistance** as a first-class, traceable, versioned artifact (`AdvisoryRecord`), requestable at any phase — even outside a gate.

### 5. The Core does not own runtime process state
The Core **defines and evaluates**; Evolith Tracker **owns canonical phase state, the evidence graph, and gate decisions** at runtime ("Core defines. Providers execute. CLI and MCP evaluate. Tracker decides and audits.").

### 6. `GateDecision` disambiguation
The Core value object `GateDecision` (`packages/core-domain/src/gates/decision/gate-decision.ts:19`, `phase: number`, `violations: string[]`) is renamed `CoreGateVerdict` and feeds `DecisionRecord`. The legacy verdict literal `'WAIVED'` migrates to the canonical `Verdict.WAIVE` (`verdict.ts:20`) via `fromLegacyGateDecision`. The rich `GateDecision` is the Tracker's.

The full design, schemas, contracts, OPA changes, flows, roadmap (R0–R5), and backlog are specified in [Product/Initiative Governance Redesign](../../../core/product-initiative-governance-redesign.es.md) and proposed for ecosystem adoption in [UP-002](../../../governance/upstream-proposals/UP-002-product-initiative-governance-model.md).

## Consequences

### Positive
- Removes the Scrum↔governance conflation; honors `README.md:47` and aligns the Core domain with its own Tracker.
- Enables real traceability and concurrent initiatives per product, with multi-tenant isolation closed at the evidence level.
- Separates "what I recommend" (`AdvisoryRecord`) from "what I require" (`DecisionRecord`), making architectural assistance a first-class capability.
- Keeps the Core provider-neutral; external work systems remain authoritative for their operational facts.

### Negative / risks
- Introduces nine governance entities — risk of over-modeling. Mitigated by incremental adoption (R0–R5) and the rule that every entity must anchor to a real Tracker aggregate.
- Migration of versioned schemas and existing satellites — mitigated by deprecation-with-grandfathering (contracts start in `warn`).
- Depends on a Tracker not yet implemented for runtime `DecisionRecord` emission — mitigated by decoupling definition from emission (Core degrades to evaluation-only, like the existing `skipped` precedent).

## Alternatives Considered
- **Keep stories as gate evidence (status quo):** rejected — perpetuates the conflation and duplicates Jira/ADO/GitHub Projects inside the Core.
- **Make the Core own runtime process state:** rejected — violates the documented responsibility model and couples the provider-neutral constitution to runtime execution.
- **Model epics/stories as first-class Core entities (lighter than full task management):** rejected — any first-class operational entity reintroduces the boundary violation; `ExternalReference` is the only sanctioned operational seam.

---

[Back to ADR Registry](../README.md) · [ADR Decision Matrix](../adr-matrix.md)
