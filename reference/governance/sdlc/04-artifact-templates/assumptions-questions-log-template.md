# Template: Assumptions & Questions Log

> **Bilingual Navigation:** [Versión en Español](./assumptions-questions-log-template.es.md)
> **Purpose:** Living log tracking open questions and unvalidated assumptions throughout discovery.
>
> **SDLC Phase:** 01 - Discovery / Ideation
>
> **Subphase:** 01.1 - Knowledge-First Discovery / KDD Readiness
>
> **Suggested responsible:** Product Owner / Business Analyst
>
> **Quality Gate:** Knowledge Brief Approval

## Metadata

* **Upstream Evolith URL:** `Under construction - Request from Upstream`
* **Required inputs:** Approved Discovery Knowledge Brief.
* **Expected outputs:** Maintained Assumptions & Questions Log that feeds the Discovery Context Pack.
* **Applied taxonomy:** Aligned with Evolith glossary (Assumption, Question, Risk, Decision).
* **Applicable Evolith Rules:** R-03 (UTF-8 Clean), R-09 (Readability).

---

## 1. Document Structure (Markdown)

```markdown
# Assumptions & Questions Log: [Initiative Name]

## 1. Living Log

| ID | Type | Statement | Status | Owner | Target Date | Resolution | Linked Artifact |
|---|---|---|---|---|---|---|---|
| AQ-001 | assumption | Cloud provider quotas support 500 req/s concurrency | Open | Carlos Ruiz | 2024-02-15 | — | KB-2024-001 |
| AQ-002 | question | Which identity provider supports OAuth2 with SLA >= 99.9%? | Open | Maria Lopez | 2024-02-20 | — | KB-2024-001 |
| AQ-003 | assumption | KYC/AML requirements are stable for 12 months | Validated | Compliance Team | 2024-01-30 | Confirmed by Legal on 2024-01-28 | KB-2024-001 |
| AQ-004 | question | What is the maximum onboarding latency acceptable per market? | Deferred | Product Owner | 2024-03-01 | — | CAP-2024-001 |

## 2. Summary

| Metric | Count |
|---|---|
| Total items | 4 |
| Open | 2 |
| Validated | 1 |
| Invalidated | 0 |
| Deferred | 1 |

## 3. Usage Notes

- Update this log whenever a new assumption surfaces or a question is raised during discovery workshops, backlog refinement, or stakeholder interviews.
- Each assumption must be independently verifiable. If it cannot be verified, convert it to a question.
- Questions that block epic-level decisions must be resolved before Design Baseline approval.
- Link every item to its originating artifact (Knowledge Brief, Capability Map, etc.) for traceability.
```

---

## 2. Data Structure (JSON)

For integration with the Evolith CLI and automated tracking tools.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Assumptions & Questions Log",
  "type": "object",
  "required": ["id", "items"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for this log instance."
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "statement", "status", "owner", "targetDate", "resolution", "linkedArtifact"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique item identifier (e.g., AQ-001)."
          },
          "type": {
            "type": "string",
            "enum": ["assumption", "question"],
            "description": "Whether this is an unvalidated assumption or an open question."
          },
          "statement": {
            "type": "string",
            "description": "The assumption or question text."
          },
          "status": {
            "type": "string",
            "enum": ["open", "validated", "invalidated", "deferred"],
            "description": "Current lifecycle status."
          },
          "owner": {
            "type": "string",
            "description": "Person responsible for resolving this item."
          },
          "targetDate": {
            "type": "string",
            "format": "date",
            "description": "Target date for resolution (ISO 8601)."
          },
          "resolution": {
            "type": "string",
            "description": "Resolution details once resolved. Empty string if still open."
          },
          "linkedArtifact": {
            "type": "string",
            "description": "ID of the originating artifact (e.g., Knowledge Brief, Capability Map)."
          }
        }
      },
      "description": "Array of tracked assumptions and questions."
    }
  }
}
```

---

## 3. Minimum Applied Example

```json
{
  "id": "AQ-LOG-2024-001",
  "items": [
    {
      "id": "AQ-001",
      "type": "assumption",
      "statement": "Cloud provider quotas support 500 req/s concurrency for the onboarding domain.",
      "status": "open",
      "owner": "Carlos Ruiz",
      "targetDate": "2024-02-15",
      "resolution": "",
      "linkedArtifact": "KB-2024-001"
    },
    {
      "id": "AQ-002",
      "type": "question",
      "statement": "Which identity provider supports OAuth2 with SLA >= 99.9% across all target markets?",
      "status": "open",
      "owner": "Maria Lopez",
      "targetDate": "2024-02-20",
      "resolution": "",
      "linkedArtifact": "KB-2024-001"
    },
    {
      "id": "AQ-003",
      "type": "assumption",
      "statement": "KYC/AML requirements remain stable for the next 12 months.",
      "status": "validated",
      "owner": "Compliance Team",
      "targetDate": "2024-01-30",
      "resolution": "Confirmed by Legal on 2024-01-28.",
      "linkedArtifact": "KB-2024-001"
    }
  ]
}
```

---

## 4. Handoff to Next Artifact

The **Assumptions & Questions Log** feeds directly into:

1. **Discovery Context Pack** — validated assumptions and resolved questions populate the `assumptionsStatus` field.
2. **Capability Map** — open assumptions link to specific capabilities via `relatedAssumptions`.
3. **Technical Feasibility** — validated assumptions inform NFR targets and constraint validation.

Items that remain **Open** or **Invalidated** at Design Baseline must be escalated or explicitly accepted.

---

## Quality Checklist

- [ ] Every assumption is independently verifiable
- [ ] Every question has a clear owner and target resolution date
- [ ] All items link back to an originating artifact
- [ ] Status transitions are documented with dates
- [ ] No item has been open longer than the target date without escalation
- [ ] Validated assumptions have resolution evidence attached
- [ ] Language is consistent (no mixed EN/ES within the file)

---

## Recommended Adoption Level

**Mandatory** for all initiatives that have an approved Knowledge Brief. The log must be maintained throughout Discovery and updated before each gate review.

---

## Update Criteria

| Trigger | Action |
|---|---|
| New assumption surfaces during workshop or interview | Add as new item with status Open |
| Assumption validated by evidence | Update status to Validated, add resolution with date |
| Assumption proven wrong | Update status to Invalidated, record impact and corrective action |
| Question answered | Update status to Validated, record resolution |
| Question deferred beyond current phase | Update status to Deferred, set new target date |
| Target date missed | Escalate to sponsor, add note in resolution field |
