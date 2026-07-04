# SDLC Responsibility Matrix

> **Bilingual navigation:** [Versión en Español](./responsibility-matrix.es.md)
> **Owner:** Evolith Architecture Board
> **Status:** Active reference
> **Parent:** [Corporate SDLC Governance Center](./README.md)

---

## Purpose

This document defines the accountability model for Evolith SDLC gates.

Each gate must have a clear accountable role, responsible producers, consulted reviewers, and required evidence. This prevents lifecycle progression from depending on unclear ownership or informal approval.

---

## Responsibility Terms

| Term | Meaning |
|---|---|
| Accountable | Owns the final gate decision and accepts the consequence of approval or rejection. |
| Responsible | Produces the artifact or performs the work required for the gate. |
| Consulted | Reviews or advises before the decision is made. |
| Evidence | Version-controlled or governed proof required to pass the gate. |

---

## Gate Responsibility Matrix

| Gate | Accountable | Responsible | Consulted | Required Evidence |
|---|---|---|---|---|
| Business Sign-Off | Executive Sponsor | Product Owner | Software Architect, Governance Reviewer | Approved PRD, scope, objectives, constraints, non-goals |
| Design Baseline Approved | Architecture Board | Software Architect | Product Owner, Tech Lead, QA / SDET | ADRs, Functional Stories, blueprint alignment, applicable standards |
| Successful Build | Tech Lead | Backend Developer, Frontend Developer, DevOps Engineer | Software Architect, QA / SDET | CI pass, Technical Stories, DoD checklist, documentation delta |
| RC Stamped | QA Lead | QA / SDET | Tech Lead, Product Owner, Security Engineer | Test Summary Report, acceptance validation, quality metrics |
| Production Live | DevOps / SRE Lead | DevOps / SRE | Tech Lead, Product Owner, QA Lead | Release Notes, rollback plan, observability checklist, deployment evidence |

---

## Role Expectations

### Executive Sponsor

- Confirms business value and funding alignment.
- Approves scope at Business Sign-Off.
- Accepts escalated governance risk when required.

### Product Owner

- Owns PRD, business objectives, personas, scope, and Functional Story readiness.
- Confirms that acceptance criteria express business outcomes.
- Reviews release notes for business clarity.

### Architecture Board

- Approves architectural baseline and significant deviations.
- Ensures ADRs do not contradict existing Evolith standards.
- Reviews waiver requests for architectural exceptions.

### Software Architect

- Produces or reviews ADRs, bounded context decisions, blueprint alignment, and design constraints.
- Ensures construction starts from an approved architecture baseline.

### Tech Lead

- Owns construction discipline, implementation quality, and Definition of Done enforcement.
- Blocks merge when CI, review, documentation, or architecture constraints fail.

### QA Lead / QA / SDET

- Owns RC quality evidence.
- Confirms acceptance criteria, test coverage, security scan results, and quality metrics.
- Blocks RC Stamped when mandatory validation evidence is missing or failed.

### DevOps / SRE Lead

- Owns deployment readiness, observability, rollback, and production nominality.
- Blocks Production Live when monitoring, recovery, or deployment evidence is insufficient.

---

## Escalation Rules

| Situation | Escalation Path |
|---|---|
| Business scope is unclear | Product Owner -> Executive Sponsor |
| Architecture decision conflicts with Evolith baseline | Software Architect -> Architecture Board |
| Quality threshold fails | Tech Lead / QA Lead -> Architecture Board or Engineering Leadership |
| Security vulnerability is high/critical | Security Engineer -> Technology Director / Executive Risk Owner |
| Production readiness is not provable | DevOps / SRE Lead -> Technology Director |
| Waiver is requested | Gate Accountable -> Architecture Board or Executive Sponsor depending on risk |

---

## Practical Rule

No gate should have shared ambiguity.

There may be many contributors, but exactly one role must be accountable for deciding whether the gate passes.

---

## Related Documents

| Document | Purpose |
|---|---|
| [Executive View for Technology Directors](./executive-view.md) | Director-level SDLC operating model. |
| [Quality Gates](./quality-gates.md) | Objective thresholds and blocking rules. |
| [Traceability Model](./traceability-model.md) | Evidence chain across all phases. |
| [SDLC–Evolith Artifact Mapping](./sdlc-evolith-artifact-mapping.md) | Required and optional artifacts by lifecycle phase. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | SDLC Responsibility Matrix</sub>
</div>
