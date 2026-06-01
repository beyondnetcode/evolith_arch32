# Template: SDLC Executive Scorecard

> **Bilingual navigation:** [Versión en Español](./executive-scorecard-template.es.md)
> **Phase:** Cross-phase / Release Governance
> **Gate relevance:** Design Baseline, Successful Build, RC Stamped, Production Live
> **Parent:** [Artifact Templates](./README.md)

---

## About This Template

The SDLC Executive Scorecard is the single-page leadership control panel for an Evolith-based initiative, product, or release.

It does not replace PRDs, ADRs, Functional Stories, Technical Stories, Test Summary Reports, Release Notes, RACI workbooks, or Quality Gates. It summarizes their status so Technology Directors and senior leaders can decide when to proceed, when to block, and where to intervene.

---

## When This Artifact Is Required

This artifact is **required** when the initiative has at least one of the following conditions:

- Executive visibility.
- Customer-facing release risk.
- Production impact.
- Multi-team or cross-functional dependencies.
- Regulatory, audit, security, or compliance exposure.
- Multi-tenancy or identity/access-management impact.
- A formal go/no-go decision before Production Live.

For small internal MVPs with low production risk, it may be optional, but it remains recommended as a lightweight leadership checkpoint.

---

## How to Read the Scorecard

The scorecard is organized around six executive questions:

| Question | Scorecard Section |
|---|---|
| What are we releasing and who owns it? | Release Identity |
| Which SDLC phases apply and what gate is active? | Phase Readiness |
| Do we have the required evidence? | Artifact Readiness |
| Are the right people assigned? | RACI Readiness |
| Are quality gates passing? | Quality Gates |
| What decisions or escalations are required? | Risks, Decisions, and Executive Decision |

---

## Section 1 — Blank Template

### Source — Copy and paste

```markdown
# SDLC Executive Scorecard — [Product / Initiative] [Release]

> Overall Status: [On Track | Watch | At Risk | Blocked | Ready]
> SDLC Readiness: [X%]
> Current Phase: [Conception | Design | Construction | Validation | Delivery]
> Current Gate: [Business Sign-Off | Design Baseline | Successful Build | RC Stamped | Production Live]
> Target Go-Live: [YYYY-MM-DD]
> Executive Sponsor: [Name]
> Technology Director: [Name]
> Delivery Owner: [Name]
> Last Updated: [YYYY-MM-DD]

---

## 1. Release Identity

| Field | Value |
|---|---|
| Product / Initiative | [Name] |
| Release / Version | [vX.Y.Z] |
| Customer / Business Unit | [Name] |
| Business Objective | [Short objective] |
| Current SDLC Phase | [Phase] |
| Current Gate | [Gate] |
| Target Go-Live | [Date] |
| Schedule Variance | [+/- N days] |
| Decision Required | [Proceed | Conditional Proceed | Block | Escalate] |

---

## 2. Phase Readiness

| Phase | Applicability | Gate | Status | Evidence | Accountable | Decision |
|---|---|---|---|---|---|---|
| Conception | [Applies / Adapted / Deferred / N/A] | Business Sign-Off | [Done / Watch / At Risk / Blocked] | [PRD link] | [Name] | [Approved / Pending / Blocked] |
| Design | [Applies / Adapted / Deferred / N/A] | Design Baseline | [Status] | [ADR / FS links] | [Name] | [Decision] |
| Construction | [Applies / Adapted / Deferred / N/A] | Successful Build | [Status] | [CI / TS links] | [Name] | [Decision] |
| Validation | [Applies / Adapted / Deferred / N/A] | RC Stamped | [Status] | [TSR link] | [Name] | [Decision] |
| Delivery | [Applies / Adapted / Deferred / N/A] | Production Live | [Status] | [Release Notes / observability links] | [Name] | [Decision] |

---

## 3. Artifact Readiness

| Artifact | Required / Optional / Conditional | Status | Owner | Evidence Link | Gap | Due Date |
|---|---|---|---|---|---|---|
| PRD | Required | [Status] | [Name] | [Link] | [Gap or N/A] | [Date] |
| ADRs | Conditional / Required | [Status] | [Name] | [Link] | [Gap or N/A] | [Date] |
| Functional Stories | Required | [Status] | [Name] | [Link] | [Gap or N/A] | [Date] |
| Technical Stories | Required | [Status] | [Name] | [Link] | [Gap or N/A] | [Date] |
| CI Evidence | Required | [Status] | [Name] | [Link] | [Gap or N/A] | [Date] |
| Test Summary Report | Required before RC Stamped | [Status] | [Name] | [Link] | [Gap or N/A] | [Date] |
| Release Notes | Required before Production Live | [Status] | [Name] | [Link] | [Gap or N/A] | [Date] |
| Rollback Plan | Required before Production Live | [Status] | [Name] | [Link] | [Gap or N/A] | [Date] |
| Observability Checklist | Required before Production Live | [Status] | [Name] | [Link] | [Gap or N/A] | [Date] |

---

## 4. RACI Readiness

| Phase | Accountable | Responsible | Consulted | Informed | Named Employee Gap | Status |
|---|---|---|---|---|---|---|
| Conception | [Name] | [Name/team] | [Names] | [Names] | [Gap or N/A] | [Assigned / Partial / Missing] |
| Design | [Name] | [Name/team] | [Names] | [Names] | [Gap or N/A] | [Status] |
| Construction | [Name] | [Name/team] | [Names] | [Names] | [Gap or N/A] | [Status] |
| Validation | [Name] | [Name/team] | [Names] | [Names] | [Gap or N/A] | [Status] |
| Delivery | [Name] | [Name/team] | [Names] | [Names] | [Gap or N/A] | [Status] |

---

## 5. Quality Gates

| Metric | Threshold | Actual | Status | Evidence Link | Owner | Decision Required |
|---|---:|---:|---|---|---|---|
| Business logic coverage | >= 80% | [X%] | [Pass / Watch / Fail] | [Link] | [Name] | [Yes/No] |
| Cyclomatic complexity | <= 15 | [N] | [Status] | [Link] | [Name] | [Yes/No] |
| High/Critical CVEs | 0 | [N] | [Status] | [Link] | [Name] | [Yes/No] |
| Technical debt ratio | < 5% | [X%] | [Status] | [Link] | [Name] | [Yes/No] |
| Test distribution | 70/20/10 target | [Actual] | [Status] | [Link] | [Name] | [Yes/No] |
| Observability evidence | Required | [Ready / Pending] | [Status] | [Link] | [Name] | [Yes/No] |

---

## 6. Risks and Decisions

| Risk / Decision | Impact | Severity | Owner | Required Action | Due Date | Escalation | Status |
|---|---|---|---|---|---|---|---|
| [Risk or decision] | [Impact] | [Low / Medium / High / Critical] | [Name] | [Action] | [Date] | [Yes/No] | [Open / In Progress / Resolved] |

---

## 7. Executive Decision

| Field | Value |
|---|---|
| Decision | [Proceed | Conditional Proceed | Block | Escalate] |
| Approved By | [Name / Role] |
| Conditions | [Conditions or N/A] |
| Next Review Date | [YYYY-MM-DD] |
| Comments | [Decision notes] |
```

---

## Tracking Rules

- Update the scorecard before every gate review.
- Use links to source evidence, not copied evidence, whenever possible.
- Mark missing evidence as a gap, not as an informal assumption.
- A phase can be green only when the phase gate, artifact evidence, RACI ownership, and mandatory quality gates are all green.
- Overall status should follow the worst critical dimension, not a simple average.
- Production Live cannot be marked Ready if rollback or observability evidence is missing.

---

## Status Definitions

| Status | Meaning |
|---|---|
| On Track | Required evidence is present, ownership is assigned, and no blocking quality issue exists. |
| Watch | Minor issue or dependency exists but does not block the current gate yet. |
| At Risk | A required artifact, role, metric, or decision is incomplete and may block the gate. |
| Blocked | A mandatory gate criterion failed or evidence is missing. |
| Ready | Gate evidence is complete and the accountable role can approve progression. |

---

## Related Documents

| Document | Purpose |
|---|---|
| [Executive View for Technology Directors](../executive-view.md) | Director-level operating model. |
| [SDLC Quality Gates](../quality-gates.md) | Canonical threshold baseline and waiver policy. |
| [SDLC Responsibility Matrix](../responsibility-matrix.md) | Gate ownership and role expectations. |
| [SDLC Traceability Model](../traceability-model.md) | Evidence chain from business intent to production. |
| [Artifact Templates Hub](./README.md) | Official SDLC artifact templates. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | SDLC Executive Scorecard Template</sub>
</div>
