> **Bilingual Navigation:** [Ver versión en Español](./0101-core-stateless-evaluation-engine.es.md)

# ADR-0101: Evolith Core as a Stateless Evaluation Engine

> **Agent Signature:** Architect Agent (Winston)

## Status
Accepted (2026-06-29 — Architecture Board) — **supersedes Decision 1 of [ADR-0100](./0100-governance-execution-boundary-product-initiative.md)**

## Date
2026-06-28

## Context and Problem

[ADR-0100](./0100-governance-execution-boundary-product-initiative.md) correctly diagnosed the governance↔operational-execution conflation (stories/backlog used as blocking gate evidence; agile schemas as canonical Core contracts) and correctly mandated externalizing those to `ExternalReference`. However, its **Decision 1** committed an **altitude error**: it elevated `Producto` and `Iniciativa` to **Core domain entities** and the companion design (`reference/core/product-initiative-governance-redesign.md`, commit `4a156f3b`) gave the Core **repositories, mutating use cases and write endpoints** for them (`IProductRepository`, `IInitiativeRepository`, `IEvidenceRepository`, `IDecisionRecordRepository`, `RegisterProduct`, `OpenInitiative`, `RecordEvidence`, `RecordDecision`, `POST /api/v1/products`, `/initiatives`, `/evidence`, `/decisions`).

That contradicts the corrected criterion (the Core must not own/persist product/tenant/initiative/evidence/decision) **and the real code**, which is already a stateless evaluator:

- `packages/core-domain/src/application/services/satellite-evaluation-pipeline.service.ts` — a pure pipeline `manifest → topology → gate → Rego rules → verdict`, no persistence.
- `packages/core-domain/src/domain/gate-evidence.ts:87-89` — `ExecutionContext { initiative?; tenant?; phase? }` explicitly *"Never persisted or interpreted"*.
- `packages/core-domain/src/application/validators/evaluators/handlers/executive-scorecard-rule.handler.ts:55` — returns `skipped` ("Sprint throughput requires tracker data"): the Core declines operational data.
- `apps/core-api/src/application/services/workspace-reference-resolver.service.ts:9-11` — the Core "never receives a user path, UMS token, repository credential, or tenant identifier"; consumers pass an opaque reference.
- **No repository for product/tenant/initiative/evidence/decision exists** (grep-confirmed). The only governance repository is `IBlueprintRepository` — a **definition**, not operation.

The prior design proposed *building* persistence that the criterion forbids and the code never had.

## Decision

**Evolith Core is a stateless Core Evaluation Engine.** It is the normative, architectural and evaluating kernel of the suite; it never owns or persists business/operational state.

### 1. Stateless evaluation contract (supersedes ADR-0100 Decision 1)
- The Core **receives an `EvaluationContext`**, evaluates it against versioned **definitions/standards** (phases, gates, artifacts, evidence shapes, blueprints, topologies, rulesets, OPA policies), and **returns an `EvaluationResult`**. It never calls back to mutate.
- `tenantId`, `productId`, `initiativeId`, `initiativeGroupId`, `phaseId`, `gateId`, `artifactId` are **opaque context identifiers**, never Core entities. The Core does not own, persist, or interpret product/tenant/initiative/evidence/decision.
- The Core's only persistence is **versioned definitions/standards** (`rulesets/`, `reference/core/architecture/blueprints/`, `reference/core/sdlc/`, `IBlueprintRepository`).

### 2. Tracker (or any consumer) owns operational state
Evolith Tracker registers, persists and audits products, tenants, ideas, initiatives, initiative groups, executed phases/gates, artifacts, evidence, decisions, deployments, states, audit, and external integrations. It **sends** the `EvaluationContext` and **consumes** the `EvaluationResult`. External tools (Jira/Azure DevOps/GitHub Projects) remain the source of truth for delivery execution detail.

### 3. Three outputs, none binding by the Core
The Core emits, inside the `EvaluationResult`: per-engine results (`GateEvaluationResult`, `ArtifactEvaluationResult`, `EvidenceEvaluationResult`, `ArchitectureEvaluationResult`, `BlueprintEvaluationResult`, `CheckpointEvaluationResult`, `ComplianceResult`), `RiskFinding[]`/`GapFinding[]`/`RequiredAction[]`, `Recommendation[]`, and a **non-binding** `DecisionRecommendation`. The canonical binding `GateDecision` is decided and persisted by the Tracker, not the Core.

### 4. Internal architecture
The Core is composed of 13 sub-engines/registries: Gate · Artifact · Evidence · Architecture · Blueprint · Topology Recommendation · Ruleset Execution · OPA Policy · Checkpoint · Compliance · Recommendation engines + Contract Schema Registry + Standard Catalog Registry.

### 5. What ADR-0100 keeps
ADR-0100's diagnosis and Decisions 2–6 (externalize epics/stories/tasks to `ExternalReference`; evaluation ≠ decision; `GateDecision`→`CoreGateVerdict`; `'WAIVED'`→`Verdict.WAIVE`; Core does not own runtime process state) **remain valid**. Only the *ownership/persistence altitude* of Decision 1 is corrected here: product/tenant/initiative are **context**, not Core entities.

The full corrected design (EvaluationContext/Result contracts, engines, flows, rulesets/OPA/blueprints changes, roadmap, backlog) is in [Core Evaluation Engine Design](../../../core-evaluation-engine-design.es.md). It supersedes Deliverables 2, 4, 10, 11, 12 and the write-flows of 13 of `product-initiative-governance-redesign`.

## Consequences

### Positive
- The Core stays decoupled, modular, auditable, extensible and reusable across multiple consumers.
- No new persistence is built; the design matches what the code already does (stateless evaluation), lowering implementation cost and risk.
- Single source of truth preserved: standards in Core, operational state in Tracker, delivery detail in external tools.

### Negative / risks
- Requires correcting already-committed artifacts (the prior design doc, ADR-0100, UP-002, GT-375). Mitigated by surgical correction notes rather than destructive rewrites, preserving the audit trail of the altitude error.
- The `EvaluationContext`/`EvaluationResult` contract must be comprehensive enough for all engines without leaking operational ownership. Mitigated by a versioned Contract Schema Registry.

## Alternatives Considered
- **Edit ADR-0100 Decision 1 in place:** rejected — erases the altitude error from the decision history; the correction itself has governance value.
- **Keep Core-owned Producto/Iniciativa with repositories (prior design):** rejected — violates the corrected criterion, couples the Core to operational state, and builds persistence the code never had.

---

[Back to ADR Registry](../README.md) · [ADR Decision Matrix](../adr-matrix.md) · [ADR-0100](./0100-governance-execution-boundary-product-initiative.md)
