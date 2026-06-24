# Template: On-Call Handoff

> **Bilingual navigation:** [Versión en Español](./on-call-handoff-template.es.md)
> **Phase:** 5 — Delivery and Operations
> **Exit gate:** Production Live (On-Call Ready)
> **Schema:** [on-call-handoff.schema.json](../../../../rulesets/schema/on-call-handoff.schema.json)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

The On-Call Handoff is the formal confirmation that the on-call team has acknowledged the new release, reviewed operational runbooks, and is prepared to support it. It is mandatory evidence for the Production Live gate and is cited by the [Phase 5 — Zero-Downtime Release Playbook](../01-playbooks/zero-downtime-release.md).

---

## Authoring Rules

- Every on-call tier (primary, secondary, tertiary) must acknowledge understanding of the release scope.
- Link to every runbook that covers a new or modified operational surface.
- Escalation paths must include phone numbers or PagerDuty schedule links, not just names.
- SLA/SLO targets must be explicitly stated and acknowledged, not assumed.

---

## Required Sections

| Section | Notes |
|---|---|
| Release Summary | Version, change summary, and risk level (Low / Medium / High). |
| Runbook References | URLs to operational runbooks for new or modified services. |
| Escalation Paths | P1/P2/P3 escalation contacts with response time expectations. |
| Alert Ownership | Who monitors which alerts and dashboards post-deployment. |
| SLA Acknowledgement | SLO targets the team is committing to for this release. |
| Handoff Confirmation | On-lead signs off confirming readiness. |
| Contact Roster | Primary, secondary, and tertiary on-call personnel with schedules. |

---

## Markdown Skeleton

```markdown
# On-Call Handoff — [RC-X.Y.Z]

## Release Summary
- Release version: X.Y.Z
- Change summary: [1–3 sentences on what changed]
- Risk level: Low | Medium | High

## Runbook References
| Runbook | URL | Covers |
|---|---|---|
| … | [link] | … |

## Escalation Paths
| Priority | Contact | Response Time | Method |
|---|---|---|---|
| P1 | … | ≤ 15 min | PagerDuty / Phone |
| P2 | … | ≤ 30 min | PagerDuty / Slack |
| P3 | … | ≤ 2 hours | Email / Slack |

## Alert Ownership
| Alert / Dashboard | Owner | Monitoring Window |
|---|---|---|
| … | … | … |

## SLA Acknowledgement
- Availability target: …
- Latency target (p95): …
- Error budget: …
- Acknowledged by: [name / role]

## Handoff Confirmation
- On-call lead: [name]
- Date: YYYY-MM-DD
- Signature: ____________________

## Contact Roster
| Role | Name | Schedule | Contact |
|---|---|---|---|
| Primary | … | Mon–Fri 09:00–18:00 UTC | … |
| Secondary | … | Mon–Fri 18:00–09:00 UTC | … |
| Tertiary | … | Weekends / Holidays | … |
```

---

## Worked Example

```markdown
# On-Call Handoff — RC-2.4.0

## Release Summary
- Release version: 2.4.0
- Change summary: Added payment reconciliation batch job, updated user profile API rate limits, patched auth middleware CVE.
- Risk level: Medium

## Runbook References
| Runbook | URL | Covers |
|---|---|---|
| Payment Batch Job | https://runbooks.internal/payment-batch | New reconciliation job failure scenarios |
| Auth Middleware Patch | https://runbooks.internal/auth-middleware | CVE-2026-1234 mitigation verification |
| Profile API Rate Limits | https://runbooks.internal/profile-api | Rate limit 429 surge handling |

## Escalation Paths
| Priority | Contact | Response Time | Method |
|---|---|---|---|
| P1 | Sarah Kim | ≤ 15 min | PagerDuty + Phone |
| P2 | David Park | ≤ 30 min | PagerDuty + Slack |
| P3 | Ops Queue | ≤ 2 hours | Email |

## Alert Ownership
| Alert / Dashboard | Owner | Monitoring Window |
|---|---|---|
| PaymentBatchFailureRate | Sarah Kim | First 48h post-deploy |
| AuthMiddlewareErrorRate | David Park | First 72h post-deploy |
| ProfileAPI429Spike | Ops Queue | Ongoing |

## SLA Acknowledgement
- Availability target: 99.95%
- Latency target (p95): ≤ 200ms
- Error budget: 0.05% per 30-day window
- Acknowledged by: Sarah Kim, SRE Lead — 2026-06-22

## Handoff Confirmation
- On-call lead: Sarah Kim
- Date: 2026-06-22
- Signature: Sarah Kim ____________________

## Contact Roster
| Role | Name | Schedule | Contact |
|---|---|---|---|
| Primary | Sarah Kim | Mon–Fri 09:00–18:00 UTC | +1-555-0101 |
| Secondary | David Park | Mon–Fri 18:00–09:00 UTC | +1-555-0102 |
| Tertiary | Ops Queue | Weekends / Holidays | ops@company.com |
```

---

## Related Documents

| Document | Purpose |
|---|---|
| [Zero-Downtime Release Playbook](../01-playbooks/zero-downtime-release.md) | Procedural gate that consumes this evidence. |
| [Release Notes Template](./release-notes-template.md) | Production deployment record referencing on-call readiness. |
| [Observability Validation Template](./observability-validation-template.md) | Complementary evidence for alerting nominal state. |
| [`phase-gates.rules.json`](../../../../rulesets/sdlc/phase-gates.rules.json) | Phase 5 `On-Call Handoff` evidence entry references this template. |
