# Evolith Adoption Cases

> **Status:** Active | **Owner:** Architecture Board | **Purpose:** Demonstrate that Evolith governance drives real product decisions

This document records concrete cases where teams used Evolith as their architecture authority, contributed lessons back, or promoted local decisions into reusable standards.

---

## How to Read This Document

Each case follows the **Promotion Lifecycle**:

```text
Product Observation → ADR Proposal → Architecture Board Review → Accepted as Standard → Back-promoted to Evolith
```

Not every observation becomes a standard. Some remain product-specific. The matrix below shows which path each case took.

---

## Promotion Cases

### Case 1 — Transactional Outbox Pattern

| Field | Value |
|---|---|
| **Origin** | UMS product |
| **Problem Observed** | Async state propagation caused duplicate events when the HTTP response returned before the outbox relay committed |
| **Local Solution** | UMS implemented idempotent outbox consumer with deduplication key |
| **Promotion Trigger** | Multiple teams encountered same issue independently |
| **ADR Submitted** | ADR-0033 — Transactional Outbox Pattern |
| **Outcome** | Accepted as core standard. Canonical pattern `cp-02` created for .NET implementation |
| **Status** | `ACCEPTED` |

---

### Case 2 — Schema-per-Context Boundary Enforcement

| Field | Value |
|---|---|
| **Origin** | UMS product |
| **Problem Observed** | Cross-schema SQL joins in reporting queries created hidden coupling between bounded contexts |
| **Local Solution** | UMS enforced schema isolation via CI gate with automated join detection |
| **Promotion Trigger** | ADR-0031 drafted after two incidents caused by cross-context queries |
| **ADR Submitted** | ADR-0031 — Schema-per-Context Domain/Event Catalog |
| **Outcome** | Accepted. `eslint-plugin-boundaries` rule added to CI harness |
| **Status** | `ACCEPTED` |

---

### Case 3 — Multi-Tenancy Filtering

| Field | Value |
|---|---|
| **Origin** | UMS product |
| **Problem Observed** | Tenant data leaked across API responses when developers forgot to add tenant filter |
| **Local Solution** | Base repository layer with mandatory tenant_id filter injection |
| **Promotion Trigger** | Security audit flagged same vulnerability in three endpoints |
| **ADR Submitted** | ADR-0010 — Multi-Tenancy Architecture Strategy |
| **Outcome** | Accepted. Two-layer enforcement: application filter (primary) + database-native constraint (failsafe) |
| **Status** | `ACCEPTED` |

---

### Case 4 — Frontend Offline Resilience

| Field | Value |
|---|---|
| **Origin** | UMS frontend |
| **Problem Observed** | Users lost form data when network dropped during submission |
| **Local Solution** | IndexedDB fallback with queue-and-retry mechanism |
| **ADR Submitted** | ADR-0004 — Frontend Offline Resilience |
| **Outcome** | Accepted for Node.js runtime profile. Framework-agnostic guidance extracted |
| **Status** | `ACCEPTED` |

---

### Case 5 — Contract Testing Adoption

| Field | Value |
|---|---|
| **Origin** | UMS integration layer |
| **Problem Observed** | Provider-driven contract breaks were detected too late in CI, causing emergency rollbacks |
| **Local Solution** | Pact broker integration with can-i-deploy verification in CI gate |
| **Promotion Trigger** | Two production incidents traced to consumer-driven contract mismatches |
| **ADR Submitted** | ADR-0040 — Multi-Runtime Selection Contracts |
| **Outcome** | Accepted. Contract testing guideline created as governance standard |
| **Status** | `ACCEPTED` |

---

## Promotion Matrix

| Product | Decisions Promoted | Standards Consumed | Net Contribution |
|---|---|---|---|
| UMS | 5 | 40+ | Source of most core ADRs |
| (other products) | — | — | Contact Architecture Board to register |

> **Note:** If your product has used Evolith standards and contributed a lesson back, submit a case using the [ADR template](../governance/sdlc/04-artifact-templates/adr-template.md).

---

## How to Contribute a Case

1. Identify a pattern in your product that others could reuse
2. Check if an ADR already covers the concern in the [ADR Matrix](../architecture/adrs/adr-matrix.md)
3. If no ADR exists, draft one using the [ADR Template](../governance/sdlc/04-artifact-templates/adr-template.md)
4. Submit to the Architecture Board for review
5. If accepted, your ADR becomes canonical and your product appears in this matrix

---

## Rejected or Deferred Cases

| Case | Reason for Rejection/Deferral |
|---|---|
| (none currently recorded) | — |

---

*Part of [UMS Reference Boundary](../knowledge/demo/demo-vs-reference.md)*