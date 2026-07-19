# Evolith Tracker — Intake & Opportunity Communication Flow (Agent Learning Record)

> **Bilingual Navigation:** [Versión en Español](./tracker-intake-flow.es.md)

**Status:** Active — Evolving (owner-guided design session)
**Owners:** `@winston` (architecture lens) · `@po` (business lens)
**Last Updated:** 2026-07-04
**Scope:** Evolith Tracker entry model (Fase 0 — Strategic Intake). Cross-repo: decisions here have Core-corpus implications.
**Authority:** This is a **learning/knowledge record**, not a binding rule. Binding changes require their own ADR (Core) or Tracker design artifact. Product-vision alignment: [Product Vision Master](../../../../product/suite/vision/evolith-product-vision-master.md).

---

## 1. Purpose

Capture the owner-guided decisions about **how work enters Evolith Tracker**, so `@winston` and `@po` carry this context into future audits, stories, and gap work. Twelve decisions (L-001…L-012) closed the "entry points" block on 2026-07-04.

## 2. Consolidated Entry Model

```
   OPPORTUNITY (internal origin)            INTAKE (external origin)
   human | agent                            PPM / external system
        │                                         │
   IOpportunity ──► OpportunityACL          IIntake ──► IntakeACL
        │                                         │
        └──────── both normalize to ─────────────┘
                          │
                    IInitiative  (single interface)
                    [unified entry format — CANONICAL in Core]
                          │
              Loop Engineer → FeasibilityVerdict
                          │
              ┌───── Gate 0 — INTELLIGENT ─────┐
              │  criteria: default in Core      │
              │  + tenant/product override      │
              │  immutable floor: set by Core   │
              │  approval: human | normative-agent │
              └───────────────┬─────────────────┘
                   │                     │
              APPROVED               REJECTED
                   │                     │
          Initiative              DUAL feedback (human + agent)
          status: PENDING             │
                   │             v2, v3… (versioned) ──► re-evaluate
      agentic/mixed activation        │
      (prioritization agent +   or proposer ACCEPTS / expires
       optional human confirm)  (configurable termination)
                   │                     │
                   ▼                closed w/ full history
            DISCOVERY (formal)
            (+ KDD optional)
```

## 3. Learning Records (L-001 … L-012)

| ID | Decision | `@po` lens (business outcome) | `@winston` lens (architecture) |
|---|---|---|---|
| L-001 | Two entry points distinguished by **origin**: Opportunity (internal, human/agent) vs Intake (external, system via ACL). | New business concept "Opportunity"; discriminator is origin, not maturity/authority. | `StrategicInitiative` needs an origin discriminator (`INTERNAL_HUMAN`/`INTERNAL_AGENT`/`EXTERNAL_SYSTEM`); ACL is not external-only (see L-005). |
| L-002 | A **unified entry format** at Tracker level; human or context-equipped agent can complete the BusinessCase. | Any proposer reaches the same standard before Gate 0. | Canonical versioned schema; agent-assisted completion is a governed capability. |
| L-003 | Approval: **human by default**, optionally a **normative-verification agent**. | Human-Driven default, Agent-Driven optional (Vision §2.4), tenant-configurable. | Approver agent needs declared normative skills + auditable `evaluatedByAgentId`; fits `IApprovalPort`. |
| L-004 | Rejection feedback is **dual** (human+agent), **evolutionary**, **versioned**; iterate until success or proposer accepts. | Rejection is not terminal by default; a governed improvement cycle with history. | Entry proposal is a versioned artifact in the evidence graph; Gate 0 is **re-entrant**. |
| L-005 | `IInitiative` is a **single interface**; Intake and Opportunity each have their own interface + ACL adapting to it. Approved → status **PENDING**. | One downstream concept; origin diversity encapsulated at the boundary. | **Symmetric ACLs** (`OpportunityACL` internal, `IntakeACL` external); no origin concept leaks into the domain; new `PENDING` state. |
| L-006 | **Intelligent Gate 0**: Core sets default minimum acceptance criteria; **tenant can override** to its reality. | Default protects the standard; override respects tenant/product reality (enterprise value). | Extends `TenantConfig`. **Directly answers Core gaps GT-08…GT-11** (existence-checks → content/threshold + parametrization). |
| L-007 | Activating a PENDING initiative **starts formal Discovery** (KDD flow/artifacts optional). | PENDING → Discovery = "accepted" → "in elaboration". | `PENDING` precedes Discovery; realign with current `Initiative (DRAFT)`; KDD is a feature-override module. |
| L-008 | **Everything canonical lives in Core** and is inherited (Tracker **and** satellites) as format. | One standard serves the whole ecosystem; lower governance cost. | Confirms Hub-and-Spoke (Vision §4.1); local overrides never mutate the canon without Board approval. |
| L-009 | **KDD = Knowledge-Driven Development**: a set of artifacts guaranteeing product/feature understanding. | Delivers verifiable understanding before advancing. | Own schema (Core corpus candidate); when active, its artifacts are Discovery gate evidence. |
| L-010 | The immutable **floor is defined by CORE** (not the SaaS ADMIN ROOT). ADMIN ROOT only operates the overrideable layer. | Tenants cannot empty the gate; new platform actor (ADMIN ROOT) bounded. | Preserves Vision §4.3 ("Core rule definition → Evolith Core"); resolves satellite divergence — floor is Core's for all. |
| L-011 | Rejection-cycle **termination is configurable** (Core default + tenant override). | Parametrizable (max iterations / staleness window). | `rejectionCycle` policy in Core corpus; Gate 0 reads it for auto-archive/escalation. |
| L-012 | PENDING → Discovery activation is **agentic/mixed** (prioritization agent + optional human confirmation). | Confirms "approved ≠ activated"; PENDING is a governed portfolio queue. | Prioritization agent = governed capability (capacity/ROI/deps) + `IApprovalPort`; auditable transition point. |

## 4. Cross-Repo & Core Implications

- **Core corpus additions implied:** unified entry-format schema (L-002/L-008), Gate 0 default acceptance criteria + immutable-floor designation (L-006/L-010), `rejectionCycle` policy (L-011), KDD artifact schema (L-009). Candidates for `src/rulesets/schema/` + rulesets, inherited by Tracker and satellites.
- **Strategic connection:** L-006 supplies the product requirement to close **GT-08…GT-11** (gate content/threshold validation) — the single biggest credibility gap in the current maturity assessment.
- **New actor:** ADMIN ROOT (SaaS super-admin) — operates the overrideable layer only; does not hold floor authority (L-010).
- **State-machine change:** the one-shot `PROMOTED | REJECTED` Intake model is replaced by an iterative, versioned, re-entrant machine (L-004/L-011).

## 5. Open Items

- Realign `PENDING` with the Tracker's current `Initiative (DRAFT)` (US-DIS-001): rename vs. precede.
- Confirm KDD artifact set and which are mandatory vs. optional per tenant.
- Decide precedence detail within the overrideable layer (tenant vs product).

## 6. Provenance

Captured during an owner-guided product-flow session (2026-07-04). Source working notes tracked in-session. Next block: **Discovery (Fase 1)** with the KDD module. Promotion of any item into binding Core rules requires an ADR.

---

_See [Winston persona](./winston.md) · [PO persona](./po.md) · [Product Vision Master](../../../../product/suite/vision/evolith-product-vision-master.md)._
