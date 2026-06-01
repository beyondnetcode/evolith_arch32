# SDLC Executive View for Technology Directors

> **Bilingual navigation:** [Versión en Español](./executive-view.es.md)
> **Owner:** Evolith Architecture Board
> **Status:** Active reference
> **Parent:** [Corporate SDLC Governance Center](./README.md)

---

## Purpose

For Technology Directors, the Evolith SDLC is not a documentation process. It is a delivery control system.

Its purpose is to ensure that funded work is traceable, architectural risk is resolved before construction, quality gates are objective, and production readiness is proven before release.

No lifecycle phase should advance based on verbal agreement alone. Each gate requires version-controlled evidence, an accountable owner, and an objective approval criterion.

---

## Executive Operating Questions

Technology Directors should use the SDLC to answer five operational questions:

| Question | What It Controls |
|---|---|
| Are we building the right product? | Scope, funding alignment, business outcomes |
| Are architectural decisions approved before construction begins? | Solution risk, platform alignment, avoidable rework |
| Is every code change traceable to a business need and technical design? | Delivery accountability and auditability |
| Are quality gates objective enough to block unsafe releases? | Release safety and engineering discipline |
| Can production readiness be proven before declaring Production Live? | Operational resilience and customer impact |

---

## Executive Control Points

| Control Point | Executive Question | Required Evidence | Business Risk Reduced |
|---|---|---|---|
| Business Sign-Off | Is the scope worth funding and clear enough to design? | Approved PRD | Misaligned investment and scope churn |
| Design Baseline | Are architecture, boundaries, ADRs, and constraints stable? | ADRs, Functional Stories, Blueprint alignment | Architectural rework and uncontrolled complexity |
| Successful Build | Is the product technically ready for validation? | CI result, Technical Stories, Definition of Done | Defective or unreviewed code entering QA |
| RC Stamped | Is the release safe to deploy? | Test Summary Report | Production defects, security exposure, release instability |
| Production Live | Is the system observable, reversible, and nominal? | Release Notes, observability checklist, rollback plan | Blind deployments and slow incident recovery |

---

## Director-Level Decision Rights

| Decision Area | Director-Level Concern | Expected Evidence |
|---|---|---|
| Funding continuation | Is the product still aligned with measurable business outcomes? | PRD objectives, success metrics, release scope |
| Architecture exception | Does the exception create strategic value greater than the risk? | ADR with options, trade-offs, consequences, owner |
| Release approval | Is the release objectively safe to expose to users? | Passing quality gates, RC stamp, rollback plan |
| Production readiness | Can the team detect, diagnose, and recover from failures? | Observability checklist, dashboards, runbooks |
| Governance waiver | Is deviation temporary, justified, owned, and time-boxed? | Waiver record, expiration date, mitigation plan |

---

## Practical Governance Rule

A phase may advance only when its gate has evidence.

Evidence must be:

- Stored in version control or a governed system of record.
- Owned by a named accountable role.
- Linked to the relevant product, release, or bounded context.
- Reviewable by Architecture, Engineering, QA, Product, or Operations depending on the gate.
- Objective enough to block progression when the evidence is missing or failed.

---

## Minimum Executive Dashboard

Technology Directors should be able to review this SDLC through a compact dashboard:

| Signal | Healthy State | Escalation Trigger |
|---|---|---|
| Gate status | Each active initiative has a current phase and gate owner | Work progresses without gate evidence |
| Architecture decisions | Significant choices have ADRs before implementation | Architecture decisions appear first in code |
| Quality gates | CI, coverage, CVEs, complexity, and debt are visible | Release depends on manual confidence only |
| Traceability | PRD to release chain is navigable | Features cannot be traced to business intent |
| Production readiness | Release includes rollback and observability evidence | Deployment has no validated recovery path |

---

## Related Documents

| Document | Purpose |
|---|---|
| [Corporate SDLC Governance Center](./README.md) | Main lifecycle hub and phase navigation. |
| [Quality Gates](./quality-gates.md) | Objective quality thresholds used to block unsafe progression. |
| [Traceability Model](./traceability-model.md) | End-to-end evidence chain from business need to production. |
| [Responsibility Matrix](./responsibility-matrix.md) | Accountable and responsible roles per gate. |
| [SDLC–Evolith Artifact Mapping](./sdlc-evolith-artifact-mapping.md) | Required and optional artifacts by lifecycle phase. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | SDLC Executive View</sub>
</div>
