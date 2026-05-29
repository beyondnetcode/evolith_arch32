# Template: Test Summary Report

> **Bilingual navigation:** [Versión en Español](./test-summary-report-template.es.md)
> **Phase:** 4 — Validation and QA
> **Exit gate:** Release Candidate (RC) Stamped
> **Parent:** [Artifact Templates](./README.md)

---

## About This Template

The Test Summary Report is the formal quality gate document required before a Release Candidate can be stamped. It proves that the build satisfies all four quantitative thresholds defined in the [Construction-Focused SDLC Framework §3.2](../02-engineering/construction-focused-sdlc-framework.md) and that the testing pyramid distribution requirements from [ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md) have been met.

This document is produced by QA / SDET and signed off jointly by the QA Lead and the Engineering Lead. The Architecture Board may request it during gate review.

---

## Section 1 — Blank Template

```markdown
# Test Summary Report — [Product Name] [Version]

> Status: [Draft | Complete | Signed Off]
> RC Candidate: [v0.X.0-rc.X]
> Report Date: [YYYY-MM-DD]
> QA Lead: [Name]
> Engineering Lead: [Name]
> Architecture Board Reviewer: [Name or TBD]

---

## 1. Release Scope

[Brief description of what this RC covers: which epics, which functional stories,
which technical stories. Reference the PRD or sprint summary if available.]

| Functional Story | Title | Status |
|---|---|---|
| FS-XX | [Title] | [Passed / Failed / Deferred] |

---

## 2. Quality Threshold Metrics

These four metrics are mandated by the Construction-Focused SDLC Framework §3.2.
All must show PASS before the RC is stamped.

| Metric | Threshold | Actual | Status |
|---|:---:|:---:|:---:|
| Code Coverage (business logic) | >= 80% | [X%] | [PASS / FAIL] |
| Cyclomatic Complexity (max per method) | <= 15 | [X] | [PASS / FAIL] |
| HIGH / CRITICAL CVEs | 0 | [N] | [PASS / FAIL] |
| Technical Debt Ratio | < 5% | [X%] | [PASS / FAIL] |

---

## 3. Testing Pyramid Summary

Distribution mandated by ADR-0018: 70% unit / 20% integration / 10% E2E.

| Test Type | Tests Executed | Tests Passed | Tests Failed | Coverage Contribution |
|---|:---:|:---:|:---:|:---:|
| **Unit** | [N] | [N] | [N] | [X%] |
| **Integration** | [N] | [N] | [N] | [X%] |
| **E2E** | [N] | [N] | [N] | [X%] |
| **Total** | [N] | [N] | [N] | [X%] |

Pyramid distribution (actual): Unit [X%] / Integration [X%] / E2E [X%]

---

## 4. Security Scan Results

| Tool | Scope | HIGH CVEs | CRITICAL CVEs | Status |
|---|---|:---:|:---:|:---:|
| [dotnet audit / npm audit] | [Dependencies] | 0 | 0 | [PASS / FAIL] |
| [GitHub CodeQL] | [Source code] | 0 | 0 | [PASS / FAIL] |
| [SonarQube / SonarCloud] | [Code smells, security hotspots] | — | — | [PASS / FAIL] |

---

## 5. Functional Story Validation

For each Functional Story in scope, confirm that every Acceptance Criterion was verified.

### FS-XX — [Story Title]

| AC ID | Acceptance Criterion | Test Type | Verified By | Status |
|---|---|---|---|:---:|
| AC-01 | [Criterion text] | [Unit / Integration / E2E / Manual] | [Tester name] | [Pass / Fail] |
| AC-02 | [Criterion text] | [Unit / Integration / E2E / Manual] | [Tester name] | [Pass / Fail] |

---

## 6. Contract Test Results

(Complete only if inter-service contracts exist — [Contract Testing Guideline](../standards/engineering/contract-testing-guideline.md))

| Contract | Provider | Consumer | Status |
|---|---|---|:---:|
| [API contract name] | [Context name] | [Context name] | [Pass / Fail] |

---

## 7. Known Issues and Deferred Items

| Issue ID | Description | Severity | Disposition | Target Version |
|---|---|---|---|---|
| [ISS-001] | [Issue description] | [High / Medium / Low] | [Deferred / Won't Fix / In Progress] | [vX.X.X] |

---

## 8. RC Stamp Sign-Off

All four quality threshold metrics must show PASS before this section can be signed.

| Role | Name | Date | Decision |
|---|---|---|---|
| QA Lead | | | [Approve RC / Block RC] |
| Engineering Lead | | | [Approve RC / Block RC] |
| Architecture Board | | | [Approve RC / Block RC] |

---

## 9. Appendix: CI Pipeline Run Reference

| Pipeline Run | URL | Result |
|---|---|:---:|
| [GitHub Actions run ID] | [Link] | [Success / Failure] |
```

---

## Section 2 — Worked Example

---

```markdown
# Test Summary Report — UMS MVP v0.1.0

> Status: Signed Off
> RC Candidate: v0.1.0-rc.1
> Report Date: 2026-03-28
> QA Lead: QA Engineer — UMS Team
> Engineering Lead: UMS Tech Lead
> Architecture Board Reviewer: Evolith Architecture Board

---

## 1. Release Scope

UMS MVP covering EP-01 (Identity), EP-02 (Authorization), EP-03 (Configuration),
EP-04 (Audit), EP-05 (Console/Admin). Functional Stories FS-01 through FS-08 and FS-13.
89 Technical Stories planned; 53 completed in MVP scope (253 story points).

| Functional Story | Title | Status |
|---|---|---|
| FS-01 | User Registration and Identity Lifecycle | Passed |
| FS-02 | Role Assignment and RBAC Template Management | Passed |
| FS-03 | Multi-Tenant Organization Provisioning | Passed |
| FS-04 | Configuration Hierarchy and Tenant Resolution | Passed |
| FS-05 | Permission Graph Compilation and Visual Resolver | Passed |
| FS-06 | Immutable Audit Trail and Event Logging | Passed |
| FS-07 | Administrative Console and Tenant Dashboard | Passed |
| FS-08 | OIDC Login Flow and IdP Abstraction | Passed |
| FS-13 | CQRS Read Projections and Permission Query API | Passed |

---

## 2. Quality Threshold Metrics

| Metric | Threshold | Actual | Status |
|---|:---:|:---:|:---:|
| Code Coverage (business logic) | >= 80% | 84% | PASS |
| Cyclomatic Complexity (max per method) | <= 15 | 11 | PASS |
| HIGH / CRITICAL CVEs | 0 | 0 | PASS |
| Technical Debt Ratio | < 5% | 3.2% | PASS |

---

## 3. Testing Pyramid Summary

| Test Type | Tests Executed | Tests Passed | Tests Failed | Coverage Contribution |
|---|:---:|:---:|:---:|:---:|
| **Unit** | 412 | 412 | 0 | 71% |
| **Integration** | 118 | 117 | 1 | 21% |
| **E2E** | 47 | 47 | 0 | 8% |
| **Total** | 577 | 576 | 1 | 84% |

Pyramid distribution (actual): Unit 71% / Integration 20% / E2E 8% — within ADR-0018 targets.

One integration test failure (IT-203: Redis connection timeout in CI) was investigated and confirmed
as a flaky test due to container startup race condition. Fixed in commit `a8f3c1`. Rerun: PASS.

---

## 4. Security Scan Results

| Tool | Scope | HIGH CVEs | CRITICAL CVEs | Status |
|---|---|:---:|:---:|:---:|
| dotnet audit | NuGet dependencies | 0 | 0 | PASS |
| GitHub CodeQL | C# source (Identity, Authorization, Audit) | 0 | 0 | PASS |
| SonarCloud | Full solution — code smells and security hotspots | 0 | 0 | PASS |

---

## 5. Functional Story Validation (abbreviated)

### FS-01 — User Registration and Identity Lifecycle

| AC ID | Acceptance Criterion | Test Type | Status |
|---|---|---|:---:|
| AC-01 | Admin creates user; user appears as Pending in tenant directory | E2E | Pass |
| AC-02 | User activates via invitation; status changes to Active | Integration | Pass |
| AC-03 | Duplicate email returns informative error without creating duplicate | Unit + Integration | Pass |
| AC-04 | Suspended user cannot authenticate | E2E | Pass |
| AC-05 | All lifecycle events appear in audit history | Integration | Pass |

---

## 6. Contract Test Results

| Contract | Provider | Consumer | Status |
|---|---|---|:---:|
| UserCreated async event schema | EP-01 Identity | EP-04 Audit | Pass |
| UserCreated async event schema | EP-01 Identity | EP-02 Authorization | Pass |
| GET /api/v1/users/{id} OpenAPI contract | EP-01 Identity | EP-05 Console | Pass |

---

## 7. Known Issues and Deferred Items

| Issue ID | Description | Severity | Disposition | Target Version |
|---|---|---|---|---|
| ISS-014 | Visual Graph Resolver renders slowly for orgs > 500 roles | Medium | Deferred — performance optimization | v0.2.0 |
| ISS-019 | Audit log query API lacks cursor-based pagination | Low | Deferred — acceptable for MVP scale | v0.2.0 |

---

## 8. RC Stamp Sign-Off

| Role | Name | Date | Decision |
|---|---|---|---|
| QA Lead | QA Engineer — UMS Team | 2026-03-28 | Approve RC |
| Engineering Lead | UMS Tech Lead | 2026-03-28 | Approve RC |
| Architecture Board | Evolith Architecture Board | 2026-03-29 | Approve RC |

---

## 9. Appendix: CI Pipeline Run Reference

| Pipeline Run | URL | Result |
|---|---|:---:|
| GitHub Actions #1847 — main branch | https://github.com/beyondnetcode/ums/actions/runs/1847 | Success |
```

---

[Back to Artifact Templates](./README.md)
