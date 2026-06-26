# Template: Discovery Readiness Gate

> **Bilingual Navigation:** [Versión en Español](./discovery-readiness-gate-template.es.md)
> **Purpose:** Formal gate validating knowledge sufficiency before proceeding to backlog and design. Used at Level 3+.
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
* **Required inputs:** Approved Discovery Knowledge Brief, validated Assumptions & Questions Log, Epic Candidate Matrix, Story Seed Bank.
* **Expected outputs:** Gate decision (PASS / CONDITIONAL / FAIL) with evidence for each check.
* **Applied taxonomy:** Aligned with Evolith glossary (Gate, Check, Waiver, Decision, Traceability).
* **Applicable Evolith Rules:** R-03 (UTF-8 Clean), R-09 (Readability), R-13 (Functional Structure).

---

## 1. Document Structure (Markdown)

```markdown
# Discovery Readiness Gate: [Initiative Name]

## 1. Gate Information

| Field | Value |
|---|---|
| Gate ID | DRG-[YYYY]-[NNN] |
| Initiative ID | [Initiative identifier] |
| Adoption Level | Level 3+ |
| Decision Date | [YYYY-MM-DD] |
| Decided By | [Name / Role] |

## 2. Gate Checks

### Problem & Value

| # | Criterion | Status | Evidence | Notes |
|---|---|---|---|---|
| 1 | Problem statement is specific and measurable | [Pass/Fail/Waiver] | [Link to Knowledge Brief §1] | |
| 2 | Value proposition includes quantifiable metrics | [Pass/Fail/Waiver] | [Link to Knowledge Brief §2] | |
| 3 | Business trigger and sponsor are identified | [Pass/Fail/Waiver] | [Link to Knowledge Brief §3] | |

### Stakeholders

| # | Criterion | Status | Evidence | Notes |
|---|---|---|---|---|
| 4 | All key stakeholders identified with responsibilities | [Pass/Fail/Waiver] | [Link to Knowledge Brief §3] | |
| 5 | Affected teams acknowledged and consulted | [Pass/Fail/Waiver] | [Meeting notes or email] | |

### Capabilities

| # | Criterion | Status | Evidence | Notes |
|---|---|---|---|---|
| 6 | Capability Map is complete for the initiative scope | [Pass/Fail/Waiver] | [Link to Capability Map] | |
| 7 | At least one epic candidate has Priority = Must | [Pass/Fail/Waiver] | [Link to Epic Candidate Matrix] | |
| 8 | Epic sizes are estimated (no XL without split plan) | [Pass/Fail/Waiver] | [Link to Epic Candidate Matrix] | |

### Traceability

| # | Criterion | Status | Evidence | Notes |
|---|---|---|---|---|
| 9 | Every epic traces to a Capability ID | [Pass/Fail/Waiver] | [Link to Epic Candidate Matrix] | |
| 10 | Every story seed traces to an Epic Candidate ID | [Pass/Fail/Waiver] | [Link to Story Seed Bank] | |
| 11 | Assumptions are linked to originating artifacts | [Pass/Fail/Waiver] | [Link to Assumptions & Questions Log] | |

### Risks & Assumptions

| # | Criterion | Status | Evidence | Notes |
|---|---|---|---|---|
| 12 | All high-impact risks have mitigation plans | [Pass/Fail/Waiver] | [Link to Knowledge Brief §6] | |
| 13 | No critical assumptions remain unvalidated | [Pass/Fail/Waiver] | [Link to Assumptions & Questions Log] | |
| 14 | Open questions have owners and target dates | [Pass/Fail/Waiver] | [Link to Assumptions & Questions Log] | |

### Architecture Constraints

| # | Criterion | Status | Evidence | Notes |
|---|---|---|---|---|
| 15 | Technical constraints are documented | [Pass/Fail/Waiver] | [Link to Knowledge Brief §5] | |
| 16 | Bounded context boundaries are defined | [Pass/Fail/Waiver] | [Link to DDD Model or Architecture Doc] | |

### Context Pack

| # | Criterion | Status | Evidence | Notes |
|---|---|---|---|---|
| 17 | Discovery Context Pack is populated | [Pass/Fail/Waiver] | [Link to Context Pack] | |
| 18 | Context Pack is accessible to downstream agents | [Pass/Fail/Waiver] | [Link or access confirmation] | |

## 3. Waivers

| Check # | Rationale | Approved By | Expiry Date |
|---|---|---|---|
| [N] | [Why this check is waived] | [Name] | [YYYY-MM-DD] |

## 4. Decision

| Field | Value |
|---|---|
| Decision | [PASS / CONDITIONAL / FAIL] |
| Rationale | [Summary of why this decision was made] |
| Conditions (if CONDITIONAL) | [What must be resolved before proceeding] |
| Next Steps | [Actions to take based on the decision] |
```

---

## 2. Data Structure (JSON)

For integration with the Evolith CLI and automated gate tracking tools.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Discovery Readiness Gate",
  "type": "object",
  "required": ["id", "gateId", "initiativeId", "adoptionLevel", "checks", "decision", "decidedAt", "decidedBy"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for this gate instance."
    },
    "gateId": {
      "type": "string",
      "description": "Formal gate identifier (e.g., DRG-2024-001)."
    },
    "initiativeId": {
      "type": "string",
      "description": "Reference to the initiative being gated."
    },
    "adoptionLevel": {
      "type": "string",
      "description": "Required adoption level for this gate (e.g., Level 3+)."
    },
    "checks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["category", "criterion", "status", "evidence", "notes"],
        "properties": {
          "category": {
            "type": "string",
            "description": "Gate check category (e.g., Problem & Value, Stakeholders)."
          },
          "criterion": {
            "type": "string",
            "description": "The specific criterion being evaluated."
          },
          "status": {
            "type": "string",
            "enum": ["Pass", "Fail", "Waiver"],
            "description": "Result of the check."
          },
          "evidence": {
            "type": "string",
            "description": "Link or reference to supporting evidence."
          },
          "notes": {
            "type": "string",
            "description": "Additional notes or context for this check."
          }
        }
      },
      "description": "Array of gate checks organized by category."
    },
    "decision": {
      "type": "string",
      "enum": ["PASS", "CONDITIONAL", "FAIL"],
      "description": "Overall gate decision."
    },
    "waivers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["checkNumber", "rationale", "approvedBy", "expiryDate"],
        "properties": {
          "checkNumber": {
            "type": "integer",
            "description": "The check number being waived."
          },
          "rationale": {
            "type": "string",
            "description": "Justification for the waiver."
          },
          "approvedBy": {
            "type": "string",
            "description": "Person who approved the waiver."
          },
          "expiryDate": {
            "type": "string",
            "format": "date",
            "description": "When the waiver expires (ISO 8601)."
          }
        }
      },
      "description": "Waivers for failed checks that are accepted with justification."
    },
    "decidedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp when the gate decision was made (ISO 8601)."
    },
    "decidedBy": {
      "type": "string",
      "description": "Person or role who made the gate decision."
    }
  }
}
```

---

## 3. Minimum Applied Example

```json
{
  "id": "DRG-2024-001",
  "gateId": "DRG-2024-001",
  "initiativeId": "INIT-ONBOARD-2024",
  "adoptionLevel": "Level 3+",
  "checks": [
    { "category": "Problem & Value", "criterion": "Problem statement is specific and measurable", "status": "Pass", "evidence": "KB-2024-001 §1", "notes": "" },
    { "category": "Problem & Value", "criterion": "Value proposition includes quantifiable metrics", "status": "Pass", "evidence": "KB-2024-001 §2", "notes": "60% reduction target defined" },
    { "category": "Problem & Value", "criterion": "Business trigger and sponsor are identified", "status": "Pass", "evidence": "KB-2024-001 §3", "notes": "" },
    { "category": "Capabilities", "criterion": "At least one epic candidate has Priority = Must", "status": "Pass", "evidence": "ECM-2024-001", "notes": "EC-001 and EC-002 are Must" },
    { "category": "Capabilities", "criterion": "Epic sizes are estimated", "status": "Pass", "evidence": "ECM-2024-001", "notes": "No XL epics" },
    { "category": "Traceability", "criterion": "Every epic traces to a Capability ID", "status": "Pass", "evidence": "ECM-2024-001", "notes": "" },
    { "category": "Risks & Assumptions", "criterion": "No critical assumptions remain unvalidated", "status": "Waiver", "evidence": "AQ-LOG-2024-001", "notes": "AQ-002 deferred to Q2 with sponsor approval" }
  ],
  "decision": "CONDITIONAL",
  "waivers": [
    { "checkNumber": 13, "rationale": "Identity provider selection deferred to Q2; sponsor approved waiver", "approvedBy": "VP of Customer Experience", "expiryDate": "2024-06-30" }
  ],
  "decidedAt": "2024-01-25T14:00:00Z",
  "decidedBy": "Maria Lopez, Product Owner"
}
```

---

## 4. Handoff to Next Artifact

A **PASS** or **CONDITIONAL** decision on the **Discovery Readiness Gate** enables:

1. **Backlog Refinement** — story seeds at K2+ enter refinement sessions for sprint planning.
2. **Design Baseline** — architecture and UX design can proceed with validated constraints.
3. **Technical Feasibility** — validated assumptions inform NFR targets and constraint validation.

A **FAIL** decision sends the initiative back to Discovery for additional research or scope adjustment.

---

## Quality Checklist

- [ ] All 18 checks are evaluated (no check left blank)
- [ ] Every Fail has either a remediation plan or a documented waiver
- [ ] Waivers have sponsor approval and expiry dates
- [ ] Evidence links resolve to actual artifacts
- [ ] Decision rationale is documented and traceable
- [ ] Gate is reviewed by at least Product Owner and one technical lead
- [ ] Language is consistent (no mixed EN/ES within the file)
- [ ] Document is stored in version control alongside relevant code or design artifacts

---

## Recommended Adoption Level

**Mandatory** for all initiatives at Level 3+ adoption. The Discovery Readiness Gate is the formal checkpoint before transitioning from Discovery to Design and Backlog phases.

---

## Update Criteria

| Trigger | Action |
|---|---|
| Check evidence becomes outdated | Re-evaluate the check with updated evidence |
| Waiver expires | Re-evaluate the check or renew the waiver with sponsor approval |
| New risk or assumption surfaces | Add to relevant check category; re-evaluate gate decision |
| Decision changes (e.g., CONDITIONAL to PASS) | Update decision field, record rationale, notify stakeholders |
| Initiative scope changes materially | Re-run full gate evaluation |
| Quarterly review | Verify gate decision remains valid; close if initiative is dormant |
