# Template: Story Seed Bank

> **Bilingual Navigation:** [Versión en Español](./story-seed-bank-template.es.md)
> **Purpose:** Minimal story seeds before full backlog refinement. Each seed captures enough context for a future story without being a complete user story.
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
* **Required inputs:** Approved Epic Candidate Matrix, validated Assumptions & Questions Log.
* **Expected outputs:** Story Seed Bank that feeds the Discovery Readiness Gate and future backlog refinement.
* **Applied taxonomy:** Aligned with Evolith glossary (Story Seed, Epic Candidate, Knowledge Level, Acceptance Criteria).
* **Applicable Evolith Rules:** R-03 (UTF-8 Clean), R-09 (Readability), R-13 (Functional Structure).

---

## 1. Document Structure (Markdown)

```markdown
# Story Seed Bank: [Initiative Name]

## 1. Story Seeds

| Story Seed ID | Name | Derived From (Epic Candidate ID) | User Role | Desired Behavior | Acceptance Criteria (Draft) | Knowledge Level | Blocked By |
|---|---|---|---|---|---|---|---|
| SS-001 | [Seed Name] | EC-001 | [Role] | [What the user wants to do] | [AC 1] / [AC 2] | K2 | — |
| SS-002 | [Seed Name] | EC-001 | [Role] | [What the user wants to do] | [AC 1] | K1 | SS-001 |
| SS-003 | [Seed Name] | EC-002 | [Role] | [What the user wants to do] | [AC 1] / [AC 2] / [AC 3] | K3 | — |

## 2. Summary

| Metric | Count |
|---|---|
| Total story seeds | 3 |
| Ready for refinement | 2 |
| Blocked | 1 |
| Knowledge Level K0-K1 | 1 |
| Knowledge Level K2-K3 | 2 |
| Knowledge Level K4 | 0 |

## 3. Knowledge Levels Reference

| Level | Label | Description |
|---|---|---|
| K0 | Unaware | Problem not yet understood; seed is a hypothesis |
| K1 | Aware | Problem acknowledged but solution approach unclear |
| K2 | Defined | Problem and solution approach defined but not validated |
| K3 | Validated | Solution approach validated through research or prototype |
| K4 | Proven | Solution implemented and validated in production context |

## 4. Usage Notes

- Story seeds are NOT complete user stories. They capture minimal context for future refinement.
- Each seed must trace to an Epic Candidate ID from the Epic Candidate Matrix.
- Knowledge Level indicates discovery maturity: K0-K1 seeds need research before refinement; K3-K4 seeds are refinement-ready.
- "Blocked By" references other Story Seed IDs that must be completed or refined first.
- Acceptance criteria are drafts — they will be expanded during backlog refinement.
- Seeds at K4 level may be promoted directly to complete user stories.
```

---

## 2. Data Structure (JSON)

For integration with the Evolith CLI and automated scaffolding tools.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Story Seed Bank",
  "type": "object",
  "required": ["id", "storySeeds"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for this Story Seed Bank."
    },
    "storySeeds": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "epicCandidateId", "userRole", "desiredBehavior", "acceptanceCriteria", "knowledgeLevel", "blockedBy"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique story seed identifier (e.g., SS-001)."
          },
          "name": {
            "type": "string",
            "description": "Short descriptive name for the seed."
          },
          "epicCandidateId": {
            "type": "string",
            "description": "Reference to the epic candidate from the Epic Candidate Matrix."
          },
          "userRole": {
            "type": "string",
            "description": "The user role that would benefit from this story."
          },
          "desiredBehavior": {
            "type": "string",
            "description": "What the user wants to achieve (in plain language)."
          },
          "acceptanceCriteria": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Draft acceptance criteria to be refined during backlog refinement."
          },
          "knowledgeLevel": {
            "type": "string",
            "enum": ["K0", "K1", "K2", "K3", "K4"],
            "description": "Discovery maturity level of this seed."
          },
          "blockedBy": {
            "type": "array",
            "items": { "type": "string" },
            "description": "IDs of story seeds that block this seed."
          }
        }
      },
      "description": "Array of minimal story seeds for future refinement."
    }
  }
}
```

---

## 3. Minimum Applied Example

```json
{
  "id": "SSB-2024-001",
  "storySeeds": [
    {
      "id": "SS-001",
      "name": "Upload identity document",
      "epicCandidateId": "EC-001",
      "userRole": "New Customer",
      "desiredBehavior": "Upload a government-issued ID document for verification",
      "acceptanceCriteria": [
        "Customer can upload JPG, PNG, or PDF up to 10MB",
        "System validates document is not expired",
        "System confirms upload and shows processing status"
      ],
      "knowledgeLevel": "K2",
      "blockedBy": []
    },
    {
      "id": "SS-002",
      "name": "Liveness check during onboarding",
      "epicCandidateId": "EC-001",
      "userRole": "New Customer",
      "desiredBehavior": "Complete a liveness check to prove they are a real person",
      "acceptanceCriteria": [
        "Customer is guided through selfie capture with on-screen prompts",
        "System detects and rejects photos or video replays"
      ],
      "knowledgeLevel": "K1",
      "blockedBy": ["SS-001"]
    },
    {
      "id": "SS-003",
      "name": "Receive verification result notification",
      "epicCandidateId": "EC-002",
      "userRole": "New Customer",
      "desiredBehavior": "Receive a notification when identity verification is complete",
      "acceptanceCriteria": [
        "Customer receives email notification within 5 minutes of verification completion",
        "Notification includes verification status (approved / rejected / manual review)",
        "Customer can access detailed result in the app"
      ],
      "knowledgeLevel": "K3",
      "blockedBy": []
    }
  ]
}
```

---

## 4. Handoff to Next Artifact

The **Story Seed Bank** feeds directly into:

1. **Discovery Readiness Gate** — count of K0-K1 seeds is a gate check input (high count may indicate insufficient discovery).
2. **Backlog Refinement** — K2-K4 seeds are refined into complete user stories during sprint planning.
3. **Technical Feasibility** — K0-K1 seeds with technical uncertainty may require feasibility assessment before refinement.

Seeds at **K4** level may bypass refinement and be promoted directly to the product backlog.

---

## Quality Checklist

- [ ] Every story seed traces to an Epic Candidate ID from the Epic Candidate Matrix
- [ ] Each seed has a clear user role and desired behavior
- [ ] Acceptance criteria are present (even if draft quality)
- [ ] Knowledge Level is assigned consistently (K0-K4)
- [ ] "Blocked By" references valid Story Seed IDs (no circular blocks)
- [ ] At least 50% of seeds are K2 or above (indicates sufficient discovery progress)
- [ ] No seed is marked K4 without evidence of production validation
- [ ] Language is consistent (no mixed EN/ES within the file)
- [ ] Document is stored in version control alongside relevant code or design artifacts

---

## Recommended Adoption Level

**Mandatory** for all initiatives that have an approved Epic Candidate Matrix. The Story Seed Bank captures early delivery intent and is the prerequisite for the Discovery Readiness Gate.

---

## Update Criteria

| Trigger | Action |
|---|---|
| New epic candidate added to matrix | Generate story seeds for the new epic |
| Knowledge level advances (e.g., K1 to K2) | Update knowledge level; refine acceptance criteria if possible |
| Story seed becomes blocked | Update Blocked By; re-evaluate if the seed should be deferred |
| Block resolved | Remove from Blocked By; reassess knowledge level |
| Seed validated in production | Promote to K4; consider direct promotion to user story |
| Quarterly review | Drop seeds for dormant epics; consolidate overlapping seeds |
