# Template: Capability Map

> **Bilingual Navigation:** [Versión en Español](./capability-map-template.es.md)
> **Purpose:** Domain-level capability decomposition before epic breakdown. Each capability is a business-meaningful unit of behavior.
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
* **Required inputs:** Approved Discovery Knowledge Brief, Assumptions & Questions Log.
* **Expected outputs:** Capability Map that feeds the Discovery Context Pack and informs epic breakdown.
* **Applied taxonomy:** Aligned with Evolith glossary (Capability, Domain, Priority, Dependency, Epic Candidate).
* **Applicable Evolith Rules:** R-03 (UTF-8 Clean), R-06 (Split Stories), R-13 (Functional Structure).

---

## 1. Document Structure (Markdown)

```markdown
# Capability Map: [Initiative Name]

## 1. Capability Decomposition

| Capability ID | Name | Description | Domain | Priority | Dependencies | Related Assumptions | Epic Candidates |
|---|---|---|---|---|---|---|---|
| CAP-001 | [Capability Name] | [What this capability delivers to the business] | [Bounded context] | Must/Should/Could/Wont | [CAP-XXX or None] | [AQ-XXX] | [EPIC-XXX] |
| CAP-002 | [Capability Name] | [What this capability delivers to the business] | [Bounded context] | Must/Should/Could/Wont | [CAP-XXX or None] | [AQ-XXX] | [EPIC-XXX] |

## 2. Priority Definitions

| Priority | Definition |
|---|---|
| **Must** | Required for MVP. The initiative cannot deliver value without this capability. |
| **Should** | Important for full value delivery but can be deferred to a subsequent iteration. |
| **Could** | Nice-to-have. Include only if resources and timeline permit. |
| **Wont** | Explicitly out of scope for this initiative. Recorded for traceability. |

## 3. Dependency Graph

[Describe or diagram the dependency relationships between capabilities. Capabilities with no upstream dependencies should be delivered first.]

```
CAP-001 (Identity Verification)
  └── CAP-002 (Onboarding Orchestration) depends on CAP-001
        └── CAP-003 (KYC Document Scanning) depends on CAP-002
```

## 4. Traceability

| Capability | Knowledge Brief | Assumptions Log | Technical Feasibility | Epic |
|---|---|---|---|---|
| CAP-001 | KB-2024-001 | AQ-001, AQ-002 | TF-2024-001 | EPIC-001 |
| CAP-002 | KB-2024-001 | AQ-001 | TF-2024-001 | EPIC-002 |
```

---

## 2. Data Structure (JSON)

For integration with the Evolith CLI, automated scaffolding, and AI agent ingestion.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Capability Map",
  "type": "object",
  "required": ["id", "capabilities"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for this Capability Map instance."
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "description", "domain", "priority", "dependencies", "relatedAssumptions", "epicCandidates"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique capability identifier (e.g., CAP-001)."
          },
          "name": {
            "type": "string",
            "description": "Short, descriptive name for the capability."
          },
          "description": {
            "type": "string",
            "description": "What this capability delivers to the business."
          },
          "domain": {
            "type": "string",
            "description": "Bounded context or business domain this capability belongs to."
          },
          "priority": {
            "type": "string",
            "enum": ["Must", "Should", "Could", "Wont"],
            "description": "MoSCoW priority level."
          },
          "dependencies": {
            "type": "array",
            "items": { "type": "string" },
            "description": "IDs of capabilities that must be delivered before this one."
          },
          "relatedAssumptions": {
            "type": "array",
            "items": { "type": "string" },
            "description": "IDs from the Assumptions & Questions Log that affect this capability."
          },
          "epicCandidates": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Proposed epic IDs that would implement this capability."
          }
        }
      },
      "description": "Business-meaningful capability units for the initiative."
    }
  }
}
```

---

## 3. Minimum Applied Example

```json
{
  "id": "CM-2024-001",
  "capabilities": [
    {
      "id": "CAP-001",
      "name": "Identity Verification",
      "description": "Verify customer identity against KYC/AML requirements using automated document checks and biometric matching.",
      "domain": "Customer Lifecycle",
      "priority": "Must",
      "dependencies": [],
      "relatedAssumptions": ["AQ-001", "AQ-002"],
      "epicCandidates": ["EPIC-001"]
    },
    {
      "id": "CAP-002",
      "name": "Onboarding Orchestration",
      "description": "Coordinate the multi-step onboarding workflow across identity verification, account creation, and welcome sequence.",
      "domain": "Customer Lifecycle",
      "priority": "Must",
      "dependencies": ["CAP-001"],
      "relatedAssumptions": ["AQ-001"],
      "epicCandidates": ["EPIC-002"]
    },
    {
      "id": "CAP-003",
      "name": "KYC Document Scanning",
      "description": "Scan and extract data from identity documents using OCR and validate against regulatory requirements.",
      "domain": "Compliance",
      "priority": "Should",
      "dependencies": ["CAP-002"],
      "relatedAssumptions": ["AQ-003"],
      "epicCandidates": ["EPIC-003"]
    },
    {
      "id": "CAP-004",
      "name": "Partner Channel Onboarding",
      "description": "Extend onboarding flow to support partner-channel integrations with custom branding and field mapping.",
      "domain": "Customer Lifecycle",
      "priority": "Could",
      "dependencies": ["CAP-002"],
      "relatedAssumptions": ["AQ-004"],
      "epicCandidates": []
    }
  ]
}
```

---

## 4. Handoff to Next Artifact

The **Capability Map** feeds directly into:

1. **Discovery Context Pack** — capabilities populate the `capabilities` array in the context pack JSON.
2. **Technical Feasibility** — `Must` capabilities inform NFR scoping and constraint analysis.
3. **Epic breakdown** — each `Must` and `Should` capability becomes an epic candidate for Design Baseline.
4. **Ballpark Estimation** — capability count and dependency depth inform effort sizing.
5. **DDD Model** — capabilities map to aggregate roots and bounded context boundaries.

Capabilities marked `Wont` are explicitly tracked for scope governance and future roadmap consideration.

---

## Quality Checklist

- [ ] Every capability has a clear, business-meaningful description (no technical implementation detail)
- [ ] Every `Must` capability has at least one epic candidate
- [ ] Dependency graph has no cycles
- [ ] All `relatedAssumptions` reference valid IDs from the Assumptions & Questions Log
- [ ] No capability is orphaned (every item links to the Knowledge Brief)
- [ ] Priority levels follow MoSCoW definitions consistently
- [ ] Language is consistent (no mixed EN/ES within the file)

---

## Recommended Adoption Level

**Mandatory** for all initiatives with an approved Knowledge Brief. The capability map must be completed before Design Baseline approval and used as the basis for epic breakdown.

---

## Update Criteria

| Trigger | Action |
|---|---|
| New capability identified during discovery | Add to capabilities array with dependencies and priority |
| Assumption invalidated that affects a capability | Review and update priority or mark as blocked |
| Capability descoped to future iteration | Change priority from Must/Should to Could/Wont |
| Epic approved for a capability | Update epicCandidates with assigned epic ID |
| Dependency resolved | Remove from dependencies array, update delivery order |
| Knowledge Brief scope change | Full capability map review; add/remove/reprioritize as needed |
