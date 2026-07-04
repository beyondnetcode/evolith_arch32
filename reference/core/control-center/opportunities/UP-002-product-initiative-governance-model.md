# UP-002 — Product/Initiative Governance Model: Separating SDLC Governance from Operational Execution

> Bilingual navigation: [Español](./UP-002-product-initiative-governance-model.es.md)

| Field | Value |
|---|---|
| **ID** | UP-002 |
| **Status** | PROPOSED |
| **Date** | 2026-06-28 |
| **Initiated by** | Evolith Architecture Board (Core redesign) |
| **Addressed to** | Evolith Core Architecture Board |
| **Priority** | P0 |
| **Estimated Complexity** | XL |
| **Related ADR** | ADR-0100 (Governance/Execution Boundary) · **ADR-0101 (Core as Stateless Evaluation Engine — correction)** |
| **Related GTs** | GT-375 |
| **Design Document** | [Core Evaluation Engine Design](../../core/core-evaluation-engine-design.es.md) (corrected) · [Product/Initiative Governance Redesign](../../core/product-initiative-governance-redesign.es.md) (superseded in part) |

> **⚠ Correction (2026-06-28).** Deliverable 2 and Deliverable 7 below originally proposed Core-owned `Producto`/`Iniciativa` **entities with repositories and write endpoints**. Per [ADR-0101](../../architecture/adrs/core/0101-core-stateless-evaluation-engine.md), that is **corrected**: the Core is a **stateless evaluator** that defines the `EvaluationContext` (input) / `EvaluationResult` (output) contracts. Product/tenant/initiative are **context only** (`ProductContext`/`InitiativeContext`/`EvidenceContext`); the Core has **no write ports/use-cases/endpoints** for business entities (only `IBlueprintRepository`, a definition). Its single surface is `POST /api/v1/evaluate` (`EvaluationContext` → `EvaluationResult`, ADR-0073 envelope). The Core emits a **non-binding** `DecisionRecommendation`; the Tracker decides, persists and audits.

## Context

Evolith Core declares it is **not** "a task-management platform" (`reference/core/README.md:47`), yet its governance surfaces require agile execution artifacts as **blocking gate evidence** — *Evolith User Story* / *Agile Backlog* **Required** in Phase 2, *Technical Stories* **Required** in Phase 3 (`reference/core/sdlc/sdlc-evolith-artifact-mapping.md:130,132,133,223`); "story readiness" closes gate F2 (`:209`). Operational schemas (`evolith-user-story.schema.json`, `agile-backlog.schema.json`, `functional-story.schema.json`, `ballpark-estimation.schema.json`) live as canonical Core contracts.

Meanwhile **no `Producto` or `Iniciativa` entity exists** in the Core domain; the initiative is an opaque, never-persisted string (`gate-evidence.ts:87-89`). Evolith Tracker already models `PRODUCT`/`SDLC_PROCESS` (`product/products/evolith-tracker/sdlc-tracker-technical-interfaces.md:415-428`) — the Core trails its own Tracker. This is the **governance ↔ operational-execution conflation**.

## Guiding Principle (non-negotiable)

> *Evolith Core is the source of truth for technical governance (architecture, SDLC, rules, policies, blueprints, traceability, validations, decisions) and an architectural advisor. It is NOT the source of truth for operational delivery execution (epics, stories, tasks, sprints, estimates, velocity, boards). A Product has one or many Initiatives; each Initiative governs its own SDLC flow. Epics/stories/tasks exist only as optional `ExternalReference`.*

## Objective

Promote the **Product/Initiative governance model** to a canonical ecosystem standard: formalize `Producto` and `Iniciativa` as the primary governance units, externalize agile artifacts to optional `ExternalReference`, separate **evaluation** (`ValidationResult`) from **decision** (`DecisionRecord`) and **advisory** (`AdvisoryRecord`), and keep the Core provider-neutral and multi-tenant — without breaking existing satellites.

---

## Scope — Deliverables

### 1. Decision & boundary (ADR)
- Author **ADR-0100 — Governance/Execution Boundary: Producto and Iniciativa as Primary Units, with Advisory Capability** (this proposal's R0). Disambiguate the Core `GateDecision` → `CoreGateVerdict`; migrate legacy `'WAIVED'` → `Verdict.WAIVE`.

### 2. Domain entities (core-domain)
- Introduce `Producto` and `Iniciativa` entities; anchor `Evidencia` (evolving `GateEvidence`) to `(tenantId → productId → initiativeId → phaseId)`.
- Formalize the three output types: `ValidationResult` (evaluation), `DecisionRecord` (binding decision, emitted by Tracker), `AdvisoryRecord` (non-binding architectural assistance, produced by advisory engines + AI agents such as Winston).

### 3. Schemas & rulesets
- New `rulesets/schema/` schemas: `product`, `initiative`, `external-reference`, `artifact`, `evidence`, `validation-result`, `decision-record`, `advisory-record`.
- Deprecate (with grandfathering) `evolith-user-story`, `agile-backlog`, `functional-story`, `ballpark-estimation`, `technical-story` schemas → `external-reference` profiles.
- Remove story artifacts from `mandatoryEvidence` in `rulesets/sdlc/phase-gates.rules.json`; rewrite `DOD-03` off "story tracker". Add a `product-initiative` contract to `satellite-contracts.rules.json` (mode `warn` → `fail`).

### 4. OPA policies
- Introduce the canonical `input.context` (tenant, product, initiative, phase, gate, artifacts, evidence, externalReferences, rulesetSnapshot). Re-anchor `dod.rego` (today 100% `input.story.*`) to Initiative + Evidence; add `multi-tenancy` MTN-09..11 and ABAC tenant/product/initiative scoping. Native+OPA parity (ADR-0041).

### 5. Blueprints
- Three levels: `ProductBlueprint`, `InitiativeBlueprint` (traceability spine), and the current `TopologyBlueprint`. Stories never appear; only `externalReferences[]`.

### 6. Documentation
- Reclassify the agile artifacts in `sdlc-evolith-artifact-mapping.md` from Required to optional `ExternalReference`; replace "story readiness" with artifact+ruleset criteria. Publish the canonical "Product-Initiative Governance Model" doc.

### 7. Interfaces / API
- New ports (`IProductRepository`, `IInitiativeRepository`, `IExternalReferenceResolver`, `IDecisionRecordRepository`, `IEvidenceRepository`, `IAdvisoryRepository`), use cases (`RegisterProduct`, `OpenInitiative`, `AttachExternalReference`, `RecordEvidence`, `EvaluateInitiativeGate`, `RecordDecision`, `RequestAdvisory`), and the matching REST/CLI/MCP surfaces — with the ADR-0073 envelope and the existing `POST /api/v1/phases/transition` reconciled as stateless evaluation.

### 8. Tracker integration
- Insert `INITIATIVE` between `PRODUCT` and `SDLC_PROCESS` in the Tracker model; `StartProcessRequest` gains `initiativeId`. Extend `EvidenceItem.references[].type` with `epic|story|issue|task`. Tracker emits the canonical `DecisionRecord`; the Core degrades to evaluation-only when the Tracker is absent.

---

## Acceptance Criteria

- [ ] ADR-0100 approved: governance/execution boundary canonical for Core and all satellites.
- [ ] `Producto`/`Iniciativa` entities + the eight new schemas in `rulesets/schema/`; `product-initiative` contract in `satellite-contracts` + OPA `input.context` wired to `/evaluate`.
- [ ] No Core gate depends on stories/backlog; `ExternalReference` is the only operational seam (rules `EXT-01..05`).
- [ ] `ValidationResult` / `DecisionRecord` / `AdvisoryRecord` separated; `Verdict` reused (no new verdict vocabulary); `GateDecision` → `CoreGateVerdict`; `'WAIVED'` → `Verdict.WAIVE`.
- [ ] `EVOLITH_PARITY_FULL=true` with 0 drift (Native + OPA).
- [ ] A non-conforming satellite **fails** Core evaluation only after the `warn → fail` flip (grandfathering applied).
- [ ] Bilingual docs; English for machine-readable artifacts (ADR-0090).
- [ ] Tracker consumes `Producto/Iniciativa/Evidencia/ValidationResult` and emits `DecisionRecord`; Core does not block without Tracker.

---

## Core Real Anchors

| Artifact | Path |
|---|---|
| Design Document | `reference/core/product-initiative-governance-redesign.es.md` |
| ADR | `reference/core/architecture/adrs/core/0100-governance-execution-boundary-product-initiative.md` |
| Conflation evidence | `reference/core/sdlc/sdlc-evolith-artifact-mapping.md:130,132,133,209,223` |
| Missing entities | `packages/core-domain/src/domain/entities/`, `gate-evidence.ts:87-89` |
| Boundary precedent | `packages/core-domain/src/application/validators/evaluators/handlers/executive-scorecard-rule.handler.ts:55` |
| Tracker model | `product/products/evolith-tracker/sdlc-tracker-technical-interfaces.md:415-428` |
| Phase-gates ruleset / Rego | `rulesets/sdlc/phase-gates.rules.json`, `rulesets/opa/phase-gates.rego`, `rulesets/opa/dod.rego` |
| Satellite Contracts | `rulesets/satellite-contracts/satellite-contracts.rules.json` |

---

## Implementation Notes

- **REST only** — no GraphQL/SSE (ADR-0074). ADR-0073 envelope on all responses.
- **Single source of truth** preserved: governance in Core, execution facts in external systems, runtime state in Tracker.
- **Incremental roadmap R0–R5** with backward compatibility: deprecation-with-grandfathering; new contracts start in `warn`; tracked only on `gap-tracking.md` + `maturity-assessment.md`.
- Register this initiative as `GT-375` (and decompose into per-phase GTs as work is approved).

---

[Back to Upstream Proposals Index](../DECISIONS.md) · [Governance Hub](../README.md)
