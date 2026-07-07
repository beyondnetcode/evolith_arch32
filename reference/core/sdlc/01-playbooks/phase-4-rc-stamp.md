# Phase 4 — RC Stamped Playbook

> **Bilingual Navigation:** [Versión en Español](./phase-4-rc-stamp.es.md)

**Phase:** [04 — Validation and QA](../README.md#phase-04-validation-and-qa)
**Phase Exit Gate:** RC Stamped (see [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json) gate `phase: 4`)
**Primary Audience:** QA/SDET, Tech Lead, Product Owner, Security Engineer
**Accountable Role:** QA Lead
**Waiver Authority:** Architecture Board
**Status:** Approved

This playbook operationalises the RC Stamped gate. A Release Candidate may only be sealed when every quality threshold is verified, security scans are clean, and acceptance is signed off. No production deployment proceeds without a stamped RC.

---

## 1. Pre-Conditions

- Phase 3 "Successful Build" gate is recorded; CI is green on the candidate commit.
- Test environment mirrors the production topology and configuration baseline.
- Security scanners are up to date with the current vulnerability feed.

---

## 2. Evidence Collection Checklist

| # | Mandatory Evidence | Template / Schema | Acceptance Criterion |
|---|---|---|---|
| 1 | Test Summary Report | [`test-summary-report-template.md`](../04-artifact-templates/test-summary-report-template.md) · [`test-summary-report.schema.json`](../../../../src/rulesets/schema/test-summary-report.schema.json) | All quality gates green or explicitly waived; RC stamped by QA Lead and Tech Lead |
| 2 | Acceptance Validation | UAT log / Product sign-off | Product Owner signs off that acceptance criteria are verified on the RC artefact |
| 3 | Security Scan Report | [`security-scan-report-template.md`](../04-artifact-templates/security-scan-report-template.md) · [`security-scan-report.schema.json`](../../../../src/rulesets/schema/security-scan-report.schema.json) | Zero High/Critical CVEs in production-bound artefacts; Mediums tracked with remediation plan; structure conforms to schema |
| 4 | Integration Evidence | [`integration-evidence-template.md`](../04-artifact-templates/integration-evidence-template.md) · [`integration-evidence.schema.json`](../../../../src/rulesets/schema/integration-evidence.schema.json) | Every declared inter-component contract exercised with PASS or waiver; structure conforms to schema |
| 5 | Pyramid Distribution | Coverage + test inventory | 70% unit / 20% integration / 10% E2E target met or deviation explained (ADR-0018) |

The coverage threshold from [`quality-gates.md`](../quality-gates.md) (`>= 80%` business-logic coverage) applies. Pyramid distribution is not a substitute for coverage.

---

## 3. Gate Review Procedure

1. **Quality threshold review (QA Lead).** Walk every metric in `quality-gates.md` against the candidate. Green or waived only.
2. **Security review (Security Engineer).** Compare the Security Scan Report against the production CVE policy. High/Critical findings require remediation **or** Executive Risk Acceptance — Architecture Board cannot waive these alone.
3. **Acceptance review (Product Owner).** Verify that every Functional Story in scope is acceptance-tested against its BDD criteria. Reject the gate if a story remains "verified by demo" without recorded evidence.
4. **Pyramid audit (Tech Lead).** Confirm the test inventory respects the 70/20/10 shape or carries a documented deviation with rationale.
5. **RC stamping.** QA Lead and Tech Lead jointly sign the Test Summary Report; the RC artefact is tagged immutable and traceable to the build commit.

---

## 4. Blocking Criteria

| Criterion | Action |
|---|---|
| Any mandatory quality metric fails | BLOCK RC stamp — remediate or waiver |
| Acceptance criteria remain unverified | BLOCK RC stamp — return to validation |
| Technical debt ratio exceeds 5% | BLOCK RC stamp — remediation plan required |
| High/Critical CVE without Executive Risk Acceptance | BLOCK RC stamp — escalate to security and executive risk |

---

## 5. Waiver Workflow

Architecture Board authorises waivers; CVE waivers additionally require Executive Risk Acceptance. Required fields:

- `criterion` · `justification` · `risk` · `owner` · `expirationDate` · `mitigationPlan`

Waivers must not be used to bypass unresolved High/Critical security vulnerabilities in production releases without that explicit executive acceptance.

---

## 6. Outputs

- Signed Test Summary Report.
- Immutable RC tag traceable to the build commit.
- Authorisation to enter [Phase 5 — Delivery and Operations](../README.md#phase-05-delivery-and-operations) and execute the [Zero-Downtime Release Playbook](./zero-downtime-release.md).

---

[Back to SDLC Governance Center](../README.md)
