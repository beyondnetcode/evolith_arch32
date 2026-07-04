> **Bilingual Navigation:** [Ver versión en Español](./0097-knowledge-lifecycle-governance.es.md)

# ADR-0097: Knowledge Lifecycle Governance Standard

## Status
Accepted

## Date
2026-06-21

## Context and Problem
The external knowledge intake pipeline (established by GT-152) validates candidate structure and source provenance, but it lacks a formal governance model for **how** knowledge progresses from raw candidate to authoritative reference. Currently:

- All candidates enter at `candidate` status with no defined promotion gate.
- There is no accountable custodian for lifecycle decisions.
- Rejected or retired knowledge has no disposition record, making it impossible to distinguish "not yet reviewed" from "reviewed and rejected."
- No Architecture Board decision trail exists for promotion events, which means promoted knowledge lacks the architectural authority required for `executable` consumption in CI gates and agentic workflows.

Without explicit lifecycle governance, knowledge intake risks becoming a write-only pipeline — candidates accumulate without architectural review, and stale or superseded knowledge remains indistinguishable from current guidance.

## Decision
We establish **Winston (`@winston`)** as the lifecycle custodian for all external knowledge and define a four-stage promotion pipeline with mandatory evidence at each transition:

`candidate → evaluated → accepted → executable`

Each promotion requires an Architecture Board decision recorded in an ADR (for `accepted` and `executable`) or a dated review log (for `evaluated`). Rejected and retired candidates are preserved with a disposition reason in the source registry.

---

### 1. Promotion Pipeline

| Stage | Entry Gate | Evidence Required | Custodian |
|---|---|---|---|
| `candidate` | YAML file in `reference/knowledge/intake/` with valid KI-* schema | GT-152 contract validation passes | CI |
| `evaluated` | @winston review completed | Dated review log in promotion record; `evaluated` status | @winston |
| `accepted` | Architecture Board decision | ADR-* reference in promotion record; `accepted` status | Architecture Board |
| `executable` | Full dual-engine governance artifacts | ADR, Native rule, OPA policy, and passing fixtures | Architecture Board |

#### Transition Rules

- Stages are sequential: a candidate **must not skip** a stage (e.g., `candidate → accepted` is invalid).
- Any stage may transition to `retired` with a disposition reason.
- `retired` is a terminal state — no further promotion is allowed.

---

### 2. Winston Lifecycle Custodianship

`@winston` is the accountable owner for:

| Responsibility | Artifact |
|---|---|
| Initial review and `candidate → evaluated` promotion | `promotion.promoted_by: "@winston"` |
| Review freshness tracking | `review.next_review_at` and `review.review_freshness` |
| Recommending candidates for `accepted` to the Architecture Board | Review log with evidence summary |
| Disposition decisions for rejected candidates | `promotion.disposition` reason string |

The Architecture Board retains sole authority for `accepted` and `executable` promotions, which must reference an accepted ADR.

---

### 3. Promotion Record Schema

Every promotion event is recorded in the KI-* candidate as follows:

```yaml
promotion:
  status: evaluated
  promoted_at: "2026-06-21"
  promoted_by: "@winston"
  adr: null
  native_rule: null
  opa_policy: null
  fixtures: []
  disposition: null
```

When `status` is `retired` or when a candidate is rejected before reaching `evaluated`:

```yaml
promotion:
  status: retired
  promoted_at: "2026-06-21"
  promoted_by: "@winston"
  disposition: "Superseded by ADR-0100 — aggregate guidance updated"
```

---

### 4. State Machine Enforcement

The CI validation (`17-validate-knowledge-intake.mjs`) enforces:

1. Valid transitions only: `candidate → evaluated → accepted → executable`, or any → `retired`.
2. `promoted_at` must be present for any non-`candidate` status.
3. `promoted_by` must be present for any non-`candidate` status.
4. `accepted` and `executable` statuses require a non-null `adr` field.
5. `retired` and rejection dispositions must have a non-null `disposition` string.

---

## Consequences

### Positive
- **Traceability**: Every promotion event is dated, attributed, and machine-readable — no silent status changes.
- **Authority**: `executable` knowledge carries a verifiable Architecture Board decision, making it safe to use in CI gates and agentic retrievals.
- **Clarity**: Rejected and retired candidates are preserved with reasons, preventing re-review cycles and accidental re-promotion.
- **Audit trail**: The full lifecycle of every KI-* candidate is recoverable from the YAML record alone.

### Negative
- **Process overhead**: Each promotion requires explicit evidence — lightweight for `evaluated` (Winston review), heavier for `accepted`/`executable` (ADR).
- **Transition latency**: Candidates may remain in `evaluated` while awaiting Architecture Board cycles; the governance model accepts this as a feature (no silent promotions).

## References
- [ADR-0090: RAG Knowledge Governance Standard](./0090-rag-knowledge-governance.md)
- [GT-152: External Knowledge Contract and Source Registry Schema](../../../governance/standards/vision/gap-reference-catalog.md#gt-152)
- [KI-EVANS-AGGREGATE-001](../../../knowledge/intake/KI-EVANS-AGGREGATE-001.yaml)
- [Knowledge Intake Schema](../../../../rulesets/schema/knowledge-intake.schema.json)

---
[Back to Core ADR Index](./README.md)

> **Agent Signature:** Architect Agent
