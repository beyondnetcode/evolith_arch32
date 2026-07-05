# Downstream Phase Artifact Profiles — Conceptual Spec (Construction · Quality · Deployment)

> **Bilingual Navigation:** [Versión en Español](./downstream-artifact-profiles.es.md)

**Status:** Realized (GT-434 DONE) · **Owners:** `@winston` · `@po`
**Basis:** [Tracker Downstream Flow](./tracker-downstream-flow.md) DN-06 · mirrors Design's `spec.designProfile` (GT-427) · Vision §5.2 gate evidence.
**Authority:** Learning/knowledge record. Implemented as `spec.phaseProfiles { construction, quality, deployment }` in topology manifests (alongside `designProfile`), evaluated by the advisory, non-binding `phase-artifacts` evaluator (ADR-0101/0104).

---

## Model

Each downstream phase has, like Design: a **universal** artifact set (any topology, always) + **topology-derived** artifacts (conditional, unioned over the confirmed composition). Artifacts are **partly derived from the blueprint** (F7 `downstreamCriteria`) and partly phase-specific. Everything is **tenant-configurable** over a Core-set floor (L-006), and **advisory / non-binding** — the tenant's gate decides.

Artifact kinds are `kebab-case` blockKinds, extensible under Convention over Configuration (added to the registry, not the engine).

---

## 1. Construction (Fase 3) — Gate: Build Pass

**Universal (required):**
| artifactKind | criterion |
|---|---|
| `source-change-set` | Source changes linked to the work item and the spec. |
| `ci-pipeline-result` | CI runs and passes. |
| `definition-of-done-checklist` | DoD satisfied. |
| `architecture-drift-result` | Drift evaluated; violations resolved or waived. |
| `spec-traceability-map` | Every change traces to a functional/technical spec. |

**Topology-derived (conditional):**
| topology | artifactKind | criterion |
|---|---|---|
| distributed-modules / microservices | `per-unit-ci-evidence` | Independent CI per module/service. |
| microservices | `doma-implementation-check` | One service ↔ one bounded context, implemented. |
| event-driven | `event-contract-implementation` | Producers/consumers implement the declared event contracts. |
| agentic-ai | `agent-capability-implementation` | Governed agent capabilities implemented behind ports. |

## 2. Quality (Fase 4) — Gate: Quality Gate (CFR < 2% · zero critical defects)

**Universal (required):**
| artifactKind | criterion |
|---|---|
| `test-summary-report` | All Must-Have tests pass. |
| `coverage-report` | Coverage meets the testing-pyramid target. |
| `security-scan-result` | No high/critical findings (or waived). |
| `contract-test-result` | Contract tests pass. |
| `cfr-metric` | Change-failure-rate < 2%. |
| `defect-log` | Zero critical defects open. |
| `exception-status` | Accepted exceptions recorded. |

**Topology-derived (conditional):**
| topology | artifactKind | criterion |
|---|---|---|
| serverless / edge-computing | `performance-validation` | Cold-start/latency/cost within operational budgets. |
| event-driven | `async-consumer-test` | Consumer/idempotency tests for every event. |
| data-mesh | `data-product-slo-validation` | Data product contracts/SLOs verified. |
| agentic-ai | `agent-safety-validation` | Token-budget, sandbox isolation, MCP conformance verified. |
| microservices | `cross-service-integration-test` | Integration/e2e across services green. |

## 3. Deployment / Release (Fase 5) — Gate: Human Sign-Off (Production Live)

**Universal (required):**
| artifactKind | criterion |
|---|---|
| `release-plan` | Rollout plan approved. |
| `observability-readiness` | Traces/logs/metrics wired for the release. |
| `rollback-plan` | Rollback rehearsed and ready. |
| `operational-sign-off` | Operations accepts readiness. |
| `deployment-evidence` | Deployment executed and verified. |
| `release-notes` | Notes produced (dual-mode). |

**Topology-derived (conditional):**
| topology | artifactKind | criterion |
|---|---|---|
| serverless / edge-computing | `runtime-budget-validation` | Cold-start/cost/latency validated in the target environment. |
| microservices | `progressive-rollout-plan` | Canary/blue-green per service. |
| agentic-ai | `agent-operational-guardrails` | Credential rotation active, sandbox limits enforced, HITL approval wired. |
| data-mesh | `data-product-publication` | Data products published with ownership handoff. |

---

## 4. Core participation (advisory)

- Core evaluates **artifact completeness + gate criteria** per phase (like the `design` evaluator), deriving the required set as universal ∪ topology-composition-derived, and blends in the blueprint's `downstreamCriteria` (F7).
- Continuous advisory signals (DN-05): drift (Construction), coverage/CFR/quality (Quality), readiness (Deployment) — surfaced through the dedicated `phase-artifacts` KindEvaluator (alongside the existing `architecture` / `checkpoint` / `deployment` kinds).
- **Non-binding, stateless:** the Tracker persists the evidence, the checkpoint, and the decision; external systems notify criteria/artifact state via the API interface.

## 5. Implementation note (GT-434 — DONE)

Delivered (mirrors GT-425): `spec.phaseProfiles { construction, quality, deployment }` in the topology manifests + the dedicated `phase-artifacts` KindEvaluator + `PhaseArtifactProfileService` + `phase-artifact-registry` entries + Core API endpoint + E2E. **Follow-on:** CLI/MCP `phase-artifacts` parity (tracked as a task).

---

_See [Tracker Downstream Flow](./tracker-downstream-flow.md) · [Design-Phase Governance](../../architecture/design-phase-governance.md) · [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.md)._
