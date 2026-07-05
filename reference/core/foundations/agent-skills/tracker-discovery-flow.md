# Evolith Tracker — Discovery Communication Flow (Agent Learning Record)

> **Bilingual Navigation:** [Versión en Español](./tracker-discovery-flow.es.md)

**Status:** Active — Evolving (owner-guided design session)
**Owners:** `@winston` (architecture lens) · `@po` (business lens)
**Last Updated:** 2026-07-04
**Scope:** Evolith Tracker Discovery (Fase 1 — Business Sign-Off). Cross-repo: introduces the first Tracker→Core-architecture consultation channel.
**Authority:** Learning/knowledge record, not a binding rule. Binding changes require an ADR (Core) or Tracker design artifact. Continues [Tracker Intake Flow](./tracker-intake-flow.md); consistent with [Agent Authority Model](./agent-authority-model.md).

---

## 1. Purpose

Capture the owner-guided decisions on **Evolith Tracker's Discovery phase**: its artifacts and criteria, the new **governed architecture-advisory** capability (first Tracker→Core-architecture bridge), the progressive blueprint, and the PRD/KDD model. Five decisions (D-001…D-005) closed the Discovery block on 2026-07-04.

## 2. Consolidated Discovery Model

```
PENDING Initiative ──(agentic/mixed activation, L-012)──► DISCOVERY (Fase 1)
                                                             │
  Artifacts: Discovery Canvas · BusinessCase · TechnicalJustification
             · PRD (mandatory; KDD optional inside)  ◄── D-004
                                                             │
  ┌── Architecture Advisory (governed hybrid capability, A3) ◄── D-002
  │   tenant invokes with ITS agent → runs over Core's canonical knowledge
  │   (Architecture Hub: blueprints · topologies · ADRs) via MCP/API
  │        │  (Core stateless; evidence persisted in Tracker — D-005)
  │        └──► produces a progressive blueprint DRAFT ◄── D-003
  │             (optional, does NOT block Gate 1; Design formalizes it)
                                                             │
                        Gate 1: Business Sign-Off (intelligent criteria)
                                       │
                                  APPROVED
                                       │
                   backlogMode: generate | initiative-only ──► Design
```

## 3. Learning Records (D-001 … D-005)

| ID | Decision | `@po` lens (business outcome) | `@winston` lens (architecture) |
|---|---|---|---|
| D-001 | Discovery has **artifacts + criteria** (intelligent-gate pattern, L-006). Gate 1 = Business Sign-Off. | Discovery criteria are configurable (Core default + tenant override). | Same intelligent-gate engine; the Discovery artifact set now includes the PRD — reconcile with the current `Initiative` aggregate that omits it. |
| D-002 | **Architecture Advisory = governed hybrid capability (A3):** tenant requests support to design its feature; invokes with its own agent but runs over Core's canonical knowledge (blueprints/topologies/ADRs). First Tracker→Core-architecture bridge. | New self-service value: governed architecture expertise during Discovery, de-risks design before construction; product/monetization axis. | Fits the authority model ([[agent-authority-model]]): Hermes manages, Core owns the knowledge, tenant consumes via ports. Advisory cedes NO authority. Surface: MCP/Core API over the Architecture Hub + `architect`/Winston behind `IAgentEnginePort`. Governed context only. |
| D-003 | **Progressive blueprint:** advisory de-risks in Discovery **and** a blueprint DRAFT begins gestating there (optional support the tenant may request); Design (Fase 2) formalizes it. The draft **does NOT block Gate 1**. | Blueprint matures progressively from Discovery — fewer surprises at the Design gate; the advisory is opt-in support, not a hurdle. | `TechnicalBlueprint` gains an early draft state originated in Discovery; Design promotes it to formal (Progressive Architecture). Draft references the advisory evidence that produced it. |
| D-004 | **PRD mandatory** in Discovery; **KDD optional inside** the PRD. Only the PRD is **non-overrideable** (canonical floor, L-010); KDD/Canvas/BusinessCase/advisory are tenant-overrideable. | PRD is the non-negotiable Discovery artifact; KDD enriches it when understanding must be guaranteed. | PRD schema in Core with an optional KDD section; Gate 1 always requires PRD, requires KDD only if a tenant/criterion activates it (feature-override). Refines L-009: KDD is a PRD sub-artifact, not standalone. |
| D-005 | **Everything leaves an evidence/audit trail in the Tracker; Core is stateless** (ADR-0101). | Every support/consultation/decision is auditable in the Tracker's evidence graph — full idea→production traceability. | **Hard boundary:** the advisory *runs over* Core's canonical knowledge (stateless: context in → recommendation out), but the session **evidence is persisted in the Tracker** (owner of governance state). The "Architecture Advisory Record" is a Tracker entity referencing Core's stateless result. Core never stores the session. Reinforces ADR-0101 / Core = Evaluation Engine. |

## 4. Cross-Repo & Core Implications

- **First Tracker→Core-architecture channel (D-002):** requires a governed advisory surface over the Architecture Hub (MCP/Core API), with the `architect`/Winston reasoning behind `IAgentEnginePort`. Core stays stateless; Tracker persists the advisory evidence (D-005).
- **PRD as canonical floor (D-004):** PRD schema (with optional KDD section) is a Core-corpus candidate (`rulesets/schema/`), inherited by Tracker and satellites; non-overrideable per L-010.
- **Progressive blueprint (D-003):** `TechnicalBlueprint` gains a Discovery-originated draft state feeding Design — a Progressive-Architecture refinement of EPIC-001.
- **Aggregate reconciliation:** the Tracker `Initiative` aggregate must list the PRD explicitly (today it lists Canvas/BusinessCase/TechnicalJustification/Checklist only).

## 5. Open Items

- Define the **Architecture Advisory Record** entity in the Tracker (fields, link to Core's stateless result, link to blueprint draft).
- Confirm which of KDD / Canvas / advisory are enabled by default vs. purely opt-in per tenant.
- Blueprint draft lifecycle: how Design promotes a Discovery draft to a formal `TechnicalBlueprint`.

## 6. Provenance

Captured during an owner-guided product-flow session (2026-07-04), continuing the Intake block. Next block: **Design (Fase 2)** — blueprint formalization. Promotion of any item into binding Core rules requires an ADR.

---

_See [Winston persona](./winston.md) · [PO persona](./po.md) · [Tracker Intake Flow](./tracker-intake-flow.md) · [Agent Authority Model](./agent-authority-model.md)._
