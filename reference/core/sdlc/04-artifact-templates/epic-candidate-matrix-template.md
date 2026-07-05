# Template: Epic Candidate Matrix

> **Bilingual Navigation:** [Versión en Español](./epic-candidate-matrix-template.es.md)
> **Purpose:** Maps capabilities to epic candidates with priority, dependencies, and traceability. Bridges knowledge to delivery planning.
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
* **Required inputs:** Approved Discovery Knowledge Brief, validated Assumptions & Questions Log, Capability Map.
* **Expected outputs:** Epic Candidate Matrix that feeds the Story Seed Bank and Discovery Readiness Gate.
* **Applied taxonomy:** Aligned with Evolith glossary (Epic Candidate, Capability, Priority, Dependency, Risk).
* **Applicable Evolith Rules:** R-03 (UTF-8 Clean), R-09 (Readability), R-13 (Functional Structure).

---

## 1. Document Structure (Markdown)

```markdown
# Epic Candidate Matrix: [Initiative Name]

## 1. Epic Candidates

| Epic Candidate ID | Name | Derived From (Capability ID) | Description | Priority (MoSCoW) | Estimated Size | Dependencies | Risks | Assumptions | Ready for Backlog |
|---|---|---|---|---|---|---|---|---|---|
| EC-001 | [Epic Name] | CAP-001 | [Brief description of what this epic delivers] | Must | L | — | [Risk 1] | [Assumption 1] | Yes |
| EC-002 | [Epic Name] | CAP-002 | [Brief description of what this epic delivers] | Should | M | EC-001 | [Risk 2] | [Assumption 2] | No |
| EC-003 | [Epic Name] | CAP-003 | [Brief description of what this epic delivers] | Could | S | — | — | [Assumption 3] | Yes |

## 2. Summary

| Metric | Count |
|---|---|
| Total epic candidates | 3 |
| Ready for Backlog | 2 |
| Blocked / Not Ready | 1 |
| Must | 1 |
| Should | 1 |
| Could | 1 |
| Won't (this cycle) | 0 |

## 3. Usage Notes

- Each epic candidate must trace back to a capability from the Capability Map.
- Dependencies on other epics must be explicit; circular dependencies are not allowed.
- Priority follows MoSCoW: Must, Should, Could, Won't. At least one Must epic is required for an initiative to proceed.
- Estimated Size uses T-shirt sizing: S (1-2 sprints), M (3-4 sprints), L (5-8 sprints), XL (8+ sprints, consider splitting).
- "Ready for Backlog = Yes" requires all assumptions validated and no blocking dependencies.
- Risks and assumptions are copied from the Knowledge Brief and Assumptions & Questions Log where relevant.
```

---

## 2. Data Structure (JSON)

For integration with the Evolith CLI and automated scaffolding tools.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Epic Candidate Matrix",
  "type": "object",
  "required": ["id", "epicCandidates"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for this Epic Candidate Matrix."
    },
    "epicCandidates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "capabilityId", "description", "priority", "estimatedSize", "dependencies", "risks", "assumptions", "readyForBacklog"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique epic candidate identifier (e.g., EC-001)."
          },
          "name": {
            "type": "string",
            "description": "Short descriptive name for the epic."
          },
          "capabilityId": {
            "type": "string",
            "description": "Reference to the capability from the Capability Map."
          },
          "description": {
            "type": "string",
            "description": "What this epic delivers to the product."
          },
          "priority": {
            "type": "string",
            "enum": ["Must", "Should", "Could", "Won't"],
            "description": "MoSCoW priority level."
          },
          "estimatedSize": {
            "type": "string",
            "enum": ["S", "M", "L", "XL"],
            "description": "T-shirt size estimate."
          },
          "dependencies": {
            "type": "array",
            "items": { "type": "string" },
            "description": "IDs of other epic candidates this epic depends on."
          },
          "risks": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Risks inherited from the Knowledge Brief or Assumptions Log."
          },
          "assumptions": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Assumptions that must hold for this epic to proceed."
          },
          "readyForBacklog": {
            "type": "boolean",
            "description": "Whether this epic is ready to be added to the product backlog."
          }
        }
      },
      "description": "Array of epic candidates derived from capabilities."
    }
  }
}
```

---

## 3. Minimum Applied Example

```json
{
  "id": "ECM-2024-001",
  "epicCandidates": [
    {
      "id": "EC-001",
      "name": "Identity Verification Engine",
      "capabilityId": "CAP-001",
      "description": "Implement automated identity verification with document scanning and liveness detection.",
      "priority": "Must",
      "estimatedSize": "L",
      "dependencies": [],
      "risks": ["Identity provider SLA below 99.9%"],
      "assumptions": ["KYC/AML requirements stable for 12 months"],
      "readyForBacklog": true
    },
    {
      "id": "EC-002",
      "name": "Onboarding Orchestration",
      "capabilityId": "CAP-002",
      "description": "Build the orchestration layer that sequences verification steps and handles retries.",
      "priority": "Must",
      "estimatedSize": "M",
      "dependencies": ["EC-001"],
      "risks": ["Regulatory approval delays for new verification flow"],
      "assumptions": ["Existing event bus can absorb onboarding domain events"],
      "readyForBacklog": false
    },
    {
      "id": "EC-003",
      "name": "Partner Channel Integration",
      "capabilityId": "CAP-003",
      "description": "Expose onboarding API for partner-channel integrations with rate limiting and SLA management.",
      "priority": "Should",
      "estimatedSize": "M",
      "dependencies": ["EC-001", "EC-002"],
      "risks": ["Partner API contract changes"],
      "assumptions": ["Partner integration requirements finalized by Q2"],
      "readyForBacklog": false
    }
  ]
}
```

---

## 4. Handoff to Next Artifact

Once validated, the **Epic Candidate Matrix** feeds directly into:

1. **Story Seed Bank** — each epic candidate generates one or more story seeds for backlog refinement.
2. **Discovery Readiness Gate** — "Ready for Backlog" status is a gate check input.
3. **Technical Feasibility** — XL-sized epics may require feasibility assessment before splitting.

Epic candidates marked "Ready for Backlog = No" remain in the matrix until blocking conditions are resolved.

---

## Quality Checklist

- [ ] Every epic candidate traces to a Capability ID from the Capability Map
- [ ] Priority follows MoSCoW without duplicates (each epic has exactly one priority)
- [ ] Dependencies reference valid epic candidate IDs (no circular dependencies)
- [ ] At least one epic has Priority = Must
- [ ] No epic is marked Ready for Backlog if it has unresolved dependencies
- [ ] Size estimates use S/M/L/XL consistently (no free-text sizes)
- [ ] Risks and assumptions are traceable to the Knowledge Brief or Assumptions Log
- [ ] Language is consistent (no mixed EN/ES within the file)
- [ ] Document is stored in version control alongside relevant code or design artifacts

---

## Recommended Adoption Level

**Mandatory** for all initiatives entering Discovery. The Epic Candidate Matrix bridges capability decomposition to delivery planning and is the prerequisite for the Story Seed Bank.

---

## Update Criteria

| Trigger | Action |
|---|---|
| New capability identified in Capability Map | Add as new epic candidate with default priority Could |
| Dependency resolved or new dependency discovered | Update dependencies column and re-evaluate Ready for Backlog |
| Risk materializes or new risk emerges | Update risks column for affected epics |
| Assumption validated or invalidated | Update assumptions column; recalculate Ready for Backlog |
| Epic size estimate changes | Update estimated size; split XL epics if needed |
| Priority reprioritized | Update priority; ensure at least one Must epic remains |
| Quarterly review | Full matrix review; drop dormant epic candidates or demote to Won't |
