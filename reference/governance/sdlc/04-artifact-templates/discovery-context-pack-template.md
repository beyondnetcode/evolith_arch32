# Template: Discovery Context Pack

> **Bilingual Navigation:** [Versión en Español](./discovery-context-pack-template.es.md)
> **Purpose:** Exportable, self-contained knowledge package for AI agents and satellite repositories. Consumable by CLI, MCP, or direct reading.
>
> **SDLC Phase:** 01 - Discovery / Ideation
>
> **Subphase:** 01.1 - Knowledge-First Discovery / KDD Readiness
>
> **Suggested responsible:** Platform Architect / AI Agent Pipeline
>
> **Quality Gate:** Knowledge Brief Approval

## Metadata

* **Upstream Evolith URL:** `Under construction - Request from Upstream`
* **Required inputs:** Approved Discovery Knowledge Brief, Assumptions & Questions Log, Capability Map.
* **Expected outputs:** Self-contained context pack that AI agents, CLI tools, and satellite repos can consume to bootstrap downstream artifacts.
* **Applied taxonomy:** Aligned with Evolith glossary (Initiative, Capability, Risk, Assumption, Adoption Level).
* **Applicable Evolith Rules:** R-03 (UTF-8 Clean), R-20 (Satellite Upstream Promotion).

---

## 1. Document Structure (Markdown)

```markdown
# Discovery Context Pack: [Initiative Name]

## 1. Executive Summary
[2-3 sentence overview of the initiative, its value, and current status. Machine-readable preamble.]

## 2. Initiative ID
[Unique identifier referencing the originating Knowledge Brief.]

## 3. Adoption Level
[Mandatory | Recommended | Optional — indicates how this context pack should be consumed by downstream processes.]

## 4. Knowledge Brief Summary
[Condensed version of the Knowledge Brief: problem, value, key actors, and domain context.]

| Field | Value |
|---|---|
| Problem | [One-line problem statement] |
| Value | [One-line value proposition] |
| Domain | [Primary domain / bounded context] |
| Sponsor | [Name] |

## 5. Capability List
[Extracted from the Capability Map. Each capability is a business-meaningful unit of behavior.]

| Capability ID | Name | Domain | Priority |
|---|---|---|---|
| CAP-001 | [Capability Name] | [Domain] | Must/Should/Could/Wont |

## 6. Open Risks
[Risks from the Knowledge Brief that remain unresolved.]

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| [Risk] | [High/Med/Low] | [High/Med/Low] | [Strategy] |

## 7. Assumptions Status
[Summary from the Assumptions & Questions Log.]

| Status | Count |
|---|---|
| Open | [N] |
| Validated | [N] |
| Invalidated | [N] |
| Deferred | [N] |

## 8. Recommended Next Steps
[Ordered list of immediate next actions for downstream consumers.]

1. [Next step 1]
2. [Next step 2]
3. [Next step 3]
```

---

## 2. Data Structure (JSON)

For integration with the Evolith CLI, MCP pipelines, and AI agent ingestion.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Discovery Context Pack",
  "type": "object",
  "required": ["id", "version", "initiativeId", "adoptionLevel", "knowledgeBriefRef", "capabilities", "openRisks", "assumptionsStatus", "nextSteps", "generatedAt"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for this context pack instance."
    },
    "version": {
      "type": "string",
      "description": "Semantic version of this context pack."
    },
    "initiativeId": {
      "type": "string",
      "description": "Reference to the originating Knowledge Brief."
    },
    "adoptionLevel": {
      "type": "string",
      "enum": ["Mandatory", "Recommended", "Optional"],
      "description": "Adoption level for downstream consumers."
    },
    "knowledgeBriefRef": {
      "type": "string",
      "description": "Path or URL to the full Knowledge Brief."
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "domain", "priority"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "domain": { "type": "string" },
          "priority": { "type": "string", "enum": ["Must", "Should", "Could", "Wont"] }
        }
      },
      "description": "Business-meaningful capability units extracted from the Capability Map."
    },
    "openRisks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["description", "probability", "impact"],
        "properties": {
          "description": { "type": "string" },
          "probability": { "type": "string", "enum": ["High", "Medium", "Low"] },
          "impact": { "type": "string", "enum": ["High", "Medium", "Low"] },
          "mitigation": { "type": "string" }
        }
      },
      "description": "Unresolved risks from the Knowledge Brief."
    },
    "assumptionsStatus": {
      "type": "object",
      "required": ["open", "validated", "invalidated", "deferred"],
      "properties": {
        "open": { "type": "integer" },
        "validated": { "type": "integer" },
        "invalidated": { "type": "integer" },
        "deferred": { "type": "integer" }
      },
      "description": "Summary counts from the Assumptions & Questions Log."
    },
    "nextSteps": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Ordered list of recommended next actions."
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when this pack was generated."
    }
  }
}
```

---

## 3. Minimum Applied Example

```json
{
  "id": "CTX-2024-001",
  "version": "1.0.0",
  "initiativeId": "KB-2024-001",
  "adoptionLevel": "Mandatory",
  "knowledgeBriefRef": "./discovery-knowledge-briefs/KB-2024-001.md",
  "capabilities": [
    { "id": "CAP-001", "name": "Identity Verification", "domain": "Customer Lifecycle", "priority": "Must" },
    { "id": "CAP-002", "name": "Onboarding Orchestration", "domain": "Customer Lifecycle", "priority": "Must" },
    { "id": "CAP-003", "name": "KYC Document Scanning", "domain": "Compliance", "priority": "Should" }
  ],
  "openRisks": [
    { "description": "Identity provider SLA below 99.9% during peak periods", "probability": "Medium", "impact": "High", "mitigation": "Negotiate SLA clause or evaluate fallback provider" }
  ],
  "assumptionsStatus": { "open": 2, "validated": 1, "invalidated": 0, "deferred": 1 },
  "nextSteps": [
    "Resolve identity provider selection decision (AQ-002)",
    "Complete capability map with dependency analysis",
    "Submit for Knowledge Brief gate approval"
  ],
  "generatedAt": "2024-02-01T10:00:00Z"
}
```

---

## 4. Handoff to Next Artifact

The **Discovery Context Pack** serves as the input for:

1. **Technical Feasibility** — capabilities and risks inform NFR scoping and constraint validation.
2. **Capability Map refinement** — the pack provides the initial capability list for domain decomposition.
3. **Epic breakdown** — capabilities with `Must` priority become epic candidates for Design Baseline.
4. **Satellite repository bootstrap** — AI agents consume this pack to initialize project context in new repositories.

The `generatedAt` field enables freshness validation by CLI tools and pipeline guards.

---

## Quality Checklist

- [ ] Initiative ID links to an approved Knowledge Brief
- [ ] Capability list is non-empty and each item has a priority
- [ ] Open risks are extracted from the Knowledge Brief (not invented)
- [ ] Assumptions status counts match the Assumptions & Questions Log
- [ ] Next steps are actionable and ordered by priority
- [ ] JSON structure validates against the schema
- [ ] `generatedAt` is a valid ISO 8601 timestamp
- [ ] Language is consistent (no mixed EN/ES within the file)

---

## Recommended Adoption Level

**Mandatory** for all initiatives that have completed the Knowledge Brief approval gate. The context pack must be regenerated whenever the Knowledge Brief, Assumptions Log, or Capability Map changes materially.

---

## Update Criteria

| Trigger | Action |
|---|---|
| Knowledge Brief approved | Generate initial context pack |
| New capability added to Capability Map | Regenerate pack, increment version |
| Risk resolved or new risk added | Update openRisks, increment version |
| Assumptions status changes | Update assumptionsStatus counts, increment version |
| Material change to Knowledge Brief | Regenerate pack from scratch, increment major version |
| Quarterly freshness review | Validate generatedAt < 90 days; regenerate if stale |
