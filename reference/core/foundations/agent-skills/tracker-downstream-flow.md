# Evolith Tracker — Downstream Phases Flow: Construction · Quality · Deployment (Agent Learning Record)

> **Bilingual Navigation:** [Versión en Español](./tracker-downstream-flow.es.md)

**Status:** Active — Evolving (owner-guided design session)
**Owners:** `@winston` (architecture lens) · `@po` (business lens)
**Last Updated:** 2026-07-04
**Scope:** Evolith Tracker downstream SDLC phases — Construction (Fase 3), Quality (Fase 4), Deployment/Release (Fase 5). Cross-repo.
**Authority:** Learning/knowledge record. Consistent with [ADR-0101](../../architecture/adrs/core/0101-core-stateless-evaluation-engine.md) (stateless Core) and [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.md) (advisory posture). Continues [Tracker Design Flow](./tracker-design-flow.md).

---

## 1. Purpose

Capture how the three downstream SDLC phases flow and how **Evolith Core participates** in them. The key link: the **blueprint (Design) derives the criteria** for these phases (GT-432/F7), which configure their gates. Core is **advisory** throughout; the Tracker owns all operational execution.

## 2. The downstream flow

```
Blueprint APPROVED (Design)
   │  F7: blueprint derives Construction/Quality/Deployment criteria (recommendations)
   ▼
CONSTRUCTION (Fase 3) ── Gate: Build Pass (all Must Have DONE)
   Tracker: Task Board · Sprints · Spec Traceability · Drift Dashboard
   Core (advisory): architecture-drift signals + non-binding gate evaluation
   ▼ Build PASS
QUALITY (Fase 4) ── Gate: Quality Gate (CFR < 2% · zero critical defects · all Must Have pass)
   Tracker: .harness tests · CFR · Defect tracking · Root cleanliness
   Core (advisory): coverage/quality signals + non-binding gate evaluation
   ▼ Quality Gate PASS
DEPLOYMENT / RELEASE (Fase 5) ── Gate: Human Sign-Off
   Tracker: Deployment Calendar · Regression · Re-Do Flow · Rollback · DORA/SPACE
   Core (advisory): release-readiness signals + non-binding gate evaluation
   ▼
PRODUCTION
```

## 3. Flow Decisions (DN-01 … DN-05)

| ID | Decision | `@po` lens (business) | `@winston` lens (architecture) |
|---|---|---|---|
| DN-01 | Three phases, each entered from the prior gate: **Construction** (Build Pass) → **Quality** (Quality Gate) → **Deployment** (Human Sign-Off). | A clear, auditable chain from approved design to production. | Gates F3/F4/F5 as canonical phase transitions; each has minimum evidence + blocking criteria (existing Tracker aggregates). |
| DN-02 | **Core is advisory in all three phases** (option B): continuous non-binding signals **plus** gate evaluation. | Core keeps helping after Design — surfacing risks early, not just at the gate. | Consistent with ADR-0101/ADR-0104: Core measures/recommends; the tenant's gate decides. Never blocks by itself. |
| DN-03 | **The blueprint-derived criteria (F7) configure these gates.** | Design de-risks delivery: what was planned becomes what's checked. | `EvaluationResult.results.design.downstreamCriteria` → the Tracker configures the F3/F4/F5 gate criteria. The generative contract realized. |
| DN-04 | **The Tracker owns all operational execution** — Task Board, Sprints, TestCycle, Defect, ReleasePackage, Calendar, Rollback, DORA/SPACE. Core never manages work items. | Operational reality lives where the work happens (Tracker); Core stays lean. | Core stateless (ADR-0101): receives evidence/context, returns verdicts/recommendations; persists nothing operational. |
| DN-05 | **Continuous advisory signals per phase:** Construction → architecture-drift (Core's `ArchitectureDriftService`); Quality → coverage/CFR/quality signals; Deployment → release-readiness. All non-binding. | Early warnings improve delivery quality without adding blocking friction. | Reuse existing evaluators (drift/checkpoint/deployment kinds); expose as recommendations/risks in the `EvaluationResult`. Triggering (schedule/watch) is a runtime/Tracker concern, not Core. |

## 4. Cross-Repo & Core Implications

- **Closes the SDLC arc:** Intake → Discovery → Design → **Construction → Quality → Deployment**, all under the same advisory, stateless, non-binding posture.
- **Reuse over build:** Core's `architecture`, `checkpoint`, `deployment` KindEvaluators already exist and cover the downstream advisory signals; the design evaluator already emits `downstreamCriteria` (F7).
- **Gate criteria are configurable** per the intelligent-gate model (L-006): Core-default + tenant override; the design-derived criteria seed the defaults.
- **Boundary:** stories/backlog/tasks/tests/defects/releases are `ExternalReference` / Tracker aggregates — never Core entities.

## 5. Open Items

- Define the concrete downstream signal set each Core evaluator emits per phase (drift categories for Construction; which quality signals for QA; which readiness checks for Deployment).
- Confirm how `downstreamCriteria` map onto the Tracker's existing gate definitions (Build Pass / Quality Gate / Human Sign-Off).

## 6. Provenance

Consolidated from the owner-guided session (2026-07-04), following Intake/Discovery/Design. The design-phase advisory governance epic (GT-425) is complete and already derives these phases' criteria (F7/GT-432).

---

_See [Winston persona](./winston.md) · [PO persona](./po.md) · [Tracker Design Flow](./tracker-design-flow.md) · [Design-Phase Governance](../../architecture/design-phase-governance.md)._
