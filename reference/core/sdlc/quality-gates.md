# SDLC Quality Gates

> **Bilingual navigation:** [Versión en Español](./quality-gates.es.md)
> **Owner:** Evolith Architecture Board
> **Status:** Active reference
> **Parent:** [Corporate SDLC Governance Center](./README.md)

---

## Purpose

This document defines the objective quality gates used by Evolith to prevent unsafe lifecycle progression.

A quality gate is not a recommendation. It is an evidence-based control point that may block movement to the next phase when mandatory criteria are missing or failed.

---

## Gate Principle

A phase may advance only when its required evidence is present and its blocking criteria pass.

Manual confidence, verbal approval, or informal agreement cannot override a failed mandatory gate. Exceptions require an explicit governance waiver with an accountable owner, expiration date, and mitigation plan.

---

## Canonical Threshold Baseline

| Metric | Canonical Threshold | Applies To | Gate Impact |
|---|---:|---|---|
| Code coverage for business logic | >= 80% | Construction, Validation | Blocks Successful Build or RC Stamped when below threshold |
| Cyclomatic complexity | <= 15 per method/function | Construction, Validation | Blocks merge or RC when exceeded without refactoring or waiver |
| High/Critical CVEs | 0 tolerated | Construction, Validation, Delivery | Blocks merge, RC, and production release |
| Technical debt ratio | < 5% | Validation | Blocks RC Stamped when exceeded without approved remediation plan |
| Testing pyramid distribution | 70% unit / 20% integration / 10% E2E target | Design, Validation | Requires explanation when release distribution materially deviates |
| Documentation delta | Required when behavior, architecture, API, or operations change | Construction, Delivery | Blocks merge or Production Live when missing |
| Observability evidence | Required for production paths | Delivery | Blocks Production Live when telemetry or logs are not verifiable |
| Domain-aligned service topology (DOMA) | Each F3 service maps to exactly one bounded context | Design, Construction | Blocks Design Baseline or Successful Build when a service splits or crosses a bounded context — F3 microservices only ([ADR-0076](../../../core/architecture/adrs/core/0076-domain-oriented-microservice-architecture.md)) |

---

## Coverage Rule

Evolith uses a single release-blocking coverage standard:

- The minimum release gate for business logic coverage is **>= 80%**.
- ADR-0018 testing pyramid distribution remains the target shape for test composition: **70% unit / 20% integration / 10% E2E**.
- The pyramid distribution is not a substitute for coverage. A release can have the correct distribution and still fail coverage.

---

## Phase Gate Summary

| Phase | Gate | Mandatory Evidence | Blocking Criteria | Playbook |
|---|---|---|---|---|
| Phase 1 — Conception and Discovery | Business Sign-Off | PRD, scope, personas, objectives, constraints | Scope is ambiguous, funding outcome is unclear, architecture constraints are ignored | [Phase 1 Playbook](./01-playbooks/phase-1-business-signoff.md) |
| Phase 2 — Design and Architecture | Design Baseline Approved | ADRs, Functional Stories, blueprint alignment, applicable standards | Significant architecture decisions are undocumented or contradictory | [Phase 2 Playbook](./01-playbooks/phase-2-design-baseline.md) |
| Phase 3 — Construction | Successful Build | Technical Stories, CI run, Definition of Done, documentation delta | CI fails, coverage below threshold, high/critical CVEs, missing review | — |
| Phase 4 — Validation and QA | RC Stamped | Test Summary Report, acceptance validation, quality metrics | Any mandatory quality metric fails or acceptance criteria remain unverified | [Phase 4 Playbook](./01-playbooks/phase-4-rc-stamp.md) |
| Phase 5 — Delivery and Operations | Production Live | Release Notes, rollback plan, observability checklist, deployment evidence | Monitoring is not nominal, rollback is undefined, release is not traceable to RC | [Zero-Downtime Release Playbook](./01-playbooks/zero-downtime-release.md) |

Procedural authority: each playbook is the operational counterpart to the declarative gate defined in [`phase-gates.rules.json`](../../../rulesets/sdlc/phase-gates.rules.json) (`playbookRef` field). The gate cannot be exited unless the playbook's checkpoints are completed or formally waived.

---

## Waiver Policy

A waiver may be used only when the organization deliberately accepts a temporary deviation.

Every waiver must include:

- The failed or missing gate criterion.
- Business justification.
- Risk statement.
- Accountable owner.
- Expiration date.
- Mitigation plan.
- Approval authority.

Waivers must not be used to bypass unresolved high/critical security vulnerabilities in production releases unless an explicit executive risk acceptance exists.

---

## Evidence Expectations

| Evidence Type | Minimum Expectation |
|---|---|
| PRD | Approved and versioned before architecture starts |
| ADR | One decision per ADR with context, options, decision, trade-offs, and consequences |
| Functional Story | Business-readable and compliant with the Functional Story Writing Standard |
| Technical Story | Traceable to a Functional Story and verifiable in CI |
| Test Summary Report | Includes threshold metrics, pyramid summary, security scan, and story validation |
| Release Notes | Includes release scope, deployment steps, rollback procedure, observability checklist, and links to RC evidence |

---

## Related Documents

| Document | Purpose |
|---|---|
| [Construction-Focused SDLC Framework](./02-engineering/construction-focused-sdlc-framework.md) | Defines construction loop, DoD, and core threshold metrics. |
| [Test Summary Report Template](./04-artifact-templates/test-summary-report-template.md) | Captures RC quality evidence. |
| [Release Notes Template](./04-artifact-templates/release-notes-template.md) | Captures production deployment evidence. |
| [SDLC–Evolith Artifact Mapping](./sdlc-evolith-artifact-mapping.md) | Shows which artifacts are required by phase. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | SDLC Quality Gates</sub>
</div>
