# Evolith Tracker — Design & Architecture Communication Flow (Agent Learning Record)

> **Bilingual Navigation:** [Versión en Español](./tracker-design-flow.es.md)

**Status:** Active — Evolving (owner-guided design session)
**Owners:** `@winston` (architecture lens) · `@po` (business lens)
**Last Updated:** 2026-07-04
**Scope:** Evolith Tracker Design & Architecture (Fase 2 — Design Baseline). Advisory, topology-driven, blueprint-centric. Cross-repo.
**Authority:** Learning/knowledge record. The canonical decision is [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.md); the implementation backlog is epic **GT-425** (F1–F8 = GT-426…GT-433). Continues [Tracker Discovery Flow](./tracker-discovery-flow.md); consistent with [Agent Authority Model](./agent-authority-model.md).

---

## 1. Purpose

Capture the end-to-end **Design flow** for an initiative: how it confirms a topology, composes its blueprint from blocks, gets advised/validated/maturity-measured by Core (non-binding), iterates, and derives downstream criteria — under the advisory posture frozen in ADR-0104.

## 2. End-to-end Design Flow

```
Initiative (from Discovery: grouped or solo, recommended topology, progressive blueprint draft)
        │
  ① CONFIRM TOPOLOGY (possibly mixed) in evolith.yaml (design.topology.confirmed)
        │   Core derives the designProfile = UNION over the confirmed composition
        ▼
  ② COMPOSE THE BLUEPRINT (the box of blocks — the development guide)
        │   multi-concern: frontend · backend · services · mobile · data
        │   effective catalog = Core canonical corpus ∪ tenant private collection
        │   ├─ tenant requests governed architecture advisory (A3) — optional
        │   ├─ Core agents proactively propose templates/ideas (simple/medium/complex)
        │   └─ authoring happens in the TRACKER (design tools); Core does not author
        ▼
  ③ VALIDATE + MEASURE MATURITY (Core, advisory, stateless)
        │   completeness · traceability vs blueprints/ADRs/coding-practices
        │   deviation → recommend ADR · maturity score (per concern + aggregate)
        │   output NON-BINDING (recommendations/gaps/risks/DecisionRecommendation)
        ▼
  ④ ITERATE (blueprint matures progressively; versioned; evidence in Tracker)
        │   who blocks = the TENANT's configurable gate — Core never blocks
        ▼
  ⑤ DERIVE DOWNSTREAM CRITERIA (blueprint = generative contract)
        │   Construction / Quality / Deployment requirements & criteria
        │   → recommendations the Tracker uses to configure F3/F4/F5 gates
        ▼
  ⑥ EXIT → CONSTRUCTION (blueprint as guide + derived downstream criteria)

  ⟳ GROWTH LOOP (parallel): tenant creates tenant-scope templates (Tracker) or
     requests promotion to Core via UP-NNN → Board → canonical corpus.
     Everything audited in the Tracker; Core stays stateless.
```

## 3. Flow Decisions (DS-01 … DS-08)

| ID | Decision | `@po` lens (business) | `@winston` lens (architecture) |
|---|---|---|---|
| DS-01 | **Blueprint = detailed scheme that guides development** of a project/process/system (canonical, ADR-0104 §1). | The deliverable of Design is a usable development guide; its quality is what matters. | Central artifact; everything else (blocks, validation, downstream) serves it. Enshrined in the glossary. |
| DS-02 | **Advisory posture:** Core recommends/validates/measures maturity, non-binding; the tenant's gate decides blocking. | Core is a trusted advisor, not a gatekeeper — reduces friction, raises quality. | Consistent with ADR-0101; output is `Recommendation`/maturity, never a block. |
| DS-03 | **Topology confirmed in Design** (recommended in Discovery), optional/overridable/extensible, **mixable**. | Tenant owns its architecture path; no forced ladder. | `design.topology.confirmed` = composition; designProfile derived as union (strictest-wins, incompatibility→ADR). |
| DS-04 | **Blueprint = box of blocks, multi-concern, CoC.** Composed from blocks/references across frontend/backend/services/mobile/data; extensible by convention. | Tenant assembles designs freely from a catalog; new concepts added over time. | Block-type registry + composition conventions; perpetual extensibility without engine redesign. |
| DS-05 | **Effective catalog = Core canonical ∪ tenant private collection.** Tenant keeps its own ADRs/templates/rulesets at Tracker level. | Personalized intelligence to the tenant's reality; richer than pure Core. | Core stays stateless: tenant supplies its collection as refs in `EvaluationContext`; never persisted (ADR-0104 §11). |
| DS-06 | **Governed architecture advisory (A3) + proactive agent proposals** (simple/medium/complex). | Self-service architecture expertise; agents accelerate the tenant. | Runs over Core canonical knowledge behind `IAgentEnginePort`; evidence persisted in Tracker; Core stateless. |
| DS-07 | **Maturity is the primary output**, non-binding; iteration matures the blueprint (versioned, audited in Tracker). | The score tells the tenant how good a guide it is and where to improve. | Per-concern + aggregate maturity; deviation→ADR; the tenant's gate consumes it. |
| DS-08 | **Blueprint = generative contract:** derives Construction/Quality/Deployment criteria. | Design de-risks the whole lifecycle; fewer downstream surprises. | Stateless derivation (blueprint→criteria as recommendations); Tracker configures F3/F4/F5 gates. |

## 4. Cross-Repo & Core Implications

- **Unit = initiative** (grouped or solo); stories/backlog are `ExternalReference` of the Tracker, never evaluated (ADR-0101/GT-375).
- **Authoring in Tracker, governance in Core:** design tools live in the Tracker; Core recommends/validates/measures and receives promotion proposals. Statelessness preserved throughout.
- **Open-Core:** all design knowledge is community-extensible under governance (tiers official/certified/community; UP-NNN; CI certification).
- **Implementation** is tracked as epic **GT-425** (F1–F8); code is deferred until the design flow is finalized.

## 5. Open Items

- Iteration cycle detail: version/expiration policy of a maturing blueprint (analogous to the Intake rejection cycle, L-004/L-011) — confirm whether Design iteration reuses that configurable-termination pattern.
- Per-concern maturity weighting (universal vs topology-derived blocks) — proposed split pending final confirmation (design-phase plan §4.1).

## 6. Provenance

Consolidated from the owner-guided design session (2026-07-04), following the Intake and Discovery blocks. Canonical decision: [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.md). Implementation: GT-425 epic.

---

_See [Winston persona](./winston.md) · [PO persona](./po.md) · [Tracker Discovery Flow](./tracker-discovery-flow.md) · [Agent Authority Model](./agent-authority-model.md) · [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.md)._
