# SDLC Phase 05 — Delivery and Operations

> **Bilingual navigation:** [Versión en Español](./README.es.md)
> **Owner:** Evolith Architecture Board
> **Status:** Active reference
> **Parent:** [Corporate SDLC Governance Center](../README.md)

---

## Scope

Phase 05 governs the transition from a sealed Release Candidate to a verified production deployment. It covers the controlled rollout, the observability validation that proves the system is live and nominal, and the operating posture inherited by the on-call team once the release is declared Production Live.

This area is the canonical home for the playbooks, templates, and standards that operationalise Phase 5 of the [SDLC operating model](../README.md). Documents that belong to earlier phases (Conception, Design, Construction, Validation) live in their respective areas; Phase 5 references them when their evidence is an input to a delivery decision but does not own them.

**Phase exit gate:** Production Live
**Primary audience:** DevOps / SRE, Tech Lead, Product Owner, Security Engineer (on-call inheritance)

---

## Inputs (must be present before Phase 5 begins)

| Input | Provided by | Evidence form |
|---|---|---|
| Stamped Release Candidate | Phase 04 — [RC Stamped playbook](../01-playbooks/phase-4-rc-stamp.md) | Signed Test Summary Report + Security Scan Report + Integration Evidence |
| Quality-gates conformance | Phase 03 — [Quality Gates](../quality-gates.md) | CI status, coverage and complexity reports |
| Release-blocking decision log | Phase 04 — [Responsibility Matrix](../responsibility-matrix.md) | Waiver records (if any) attached to the RC |
| Deployment topology and rollback plan | Phase 02 — current ADRs | Approved ADR set, including deployment topology |
| Observability instrumentation baseline | Phase 03 — Construction DoD | Dashboards, alert rules, runbook links |

If any input is missing, the gate cannot be entered. The phase does not retroactively produce missing artefacts from earlier phases.

---

## Outputs (must exist before Production Live can be declared)

| Output | Template | Where it lives |
|---|---|---|
| Release Notes | [Release Notes template](../04-artifact-templates/release-notes-template.md) | Product release notes directory |
| Observability validation record | [Observability Validation template](../04-artifact-templates/observability-validation-template.md) | Release evidence directory |
| Deployment runbook executed | [Zero-Downtime Release playbook](../01-playbooks/zero-downtime-release.md) | Release timeline log |
| Rollback rehearsal evidence | Section in Release Notes | Release timeline log |
| On-call handoff confirmation | Section in Release Notes | Release timeline log |

Outputs are stored in version control alongside the deployment record so the chain Phase 1 → 5 remains traceable end to end (see [Traceability Model](../traceability-model.md)).

---

## Quality Gates

Phase 5 is bound by the canonical thresholds defined in [SDLC Quality Gates](../quality-gates.md). The Production Live gate specifically requires:

- **Deployment health:** rollout completed without breaching error-rate, latency, or saturation budgets defined in the Observability Validation record.
- **Observability:** golden-signal dashboards (RED / USE) are green; alerts route to the declared on-call rotation; logs and traces from at least one canonical request are visible end to end.
- **Rollback readiness:** rollback procedure has been rehearsed and timed within the rollback budget declared in the deployment ADR.
- **Communication:** Release Notes are published to the agreed channel; stakeholders identified in the Responsibility Matrix have been notified.
- **Security posture:** no Phase 4 security finding has been waived without a tracked remediation date in the security scan addendum.

A gate that cannot be cleared without exception requires a written waiver per the [waiver policy](../quality-gates.md). Waivers are owned by the role marked as Accountable in the [Responsibility Matrix](../responsibility-matrix.md) for the Production Live gate.

---

## Documents in This Area

This area currently aggregates existing Phase 5 governance assets that live in sibling areas. As Phase 5 documents emerge they will be authored here directly.

| Document | Location | Type | Mandatory |
|---|---|---|---|
| [Zero-Downtime Release Playbook](../01-playbooks/zero-downtime-release.md) | `01-playbooks/` | Playbook | No |
| [Core API Deployment Playbook](../01-playbooks/core-api-deployment.md) | `01-playbooks/` | Playbook | No |
| [Release Notes Template](../04-artifact-templates/release-notes-template.md) | `04-artifact-templates/` | Template | Yes |
| [Observability Validation Template](../04-artifact-templates/observability-validation-template.md) | `04-artifact-templates/` | Template | Yes |
| [Artifact Mapping — Phase 5](../sdlc-evolith-artifact-mapping.md#6-phase-5-delivery-and-operations) | `../sdlc-evolith-artifact-mapping.md` | Reference | No |

---

## Related Documents

| Document | Role |
|---|---|
| [SDLC Quality Gates](../quality-gates.md) | Canonical thresholds applied at Production Live. |
| [SDLC Responsibility Matrix](../responsibility-matrix.md) | Accountability and evidence expectations for the gate. |
| [SDLC Traceability Model](../traceability-model.md) | End-to-end evidence chain that closes at Production Live. |
| [Construction-Focused SDLC Framework](../02-engineering/construction-focused-sdlc-framework.md) | Quality model inherited from Phase 3. |

---

[Back to Corporate SDLC Governance Center](../README.md)
