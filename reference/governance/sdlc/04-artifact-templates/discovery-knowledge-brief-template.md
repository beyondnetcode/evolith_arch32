# Template: Discovery Knowledge Brief

> **Bilingual Navigation:** [Versión en Español](./discovery-knowledge-brief-template.es.md)
> **Purpose:** Foundation document capturing the problem, value, actors, context, constraints, and risks. This is the knowledge seed for the entire initiative.
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
* **Required inputs:** Business trigger or detected problem, sponsor identified, stakeholder map.
* **Expected outputs:** Approved Knowledge Brief that seeds the Assumptions & Questions Log, Discovery Context Pack, and Capability Map.
* **Applied taxonomy:** Aligned with Evolith glossary (Bounded Context, Value Stream, Risk, Assumption).
* **Applicable Evolith Rules:** R-03 (UTF-8 Clean), R-09 (Readability), R-13 (Functional Structure).

---

## 1. Document Structure (Markdown)

```markdown
# Discovery Knowledge Brief: [Initiative Name]

## 1. Problem Statement
[What specific problem or opportunity is being addressed? Use plain business language (Rule R-09).]

## 2. Value Proposition
[What measurable or qualitative value does solving this problem deliver? Quantify when possible.]

## 3. Stakeholders / Actors
[Who are the key actors? Include sponsor, end-users, affected teams, and decision-makers.]

| Role | Name / Team | Responsibility |
|---|---|---|
| Sponsor | [Name] | [Accountability] |
| Product Owner | [Name] | [Accountability] |
| Architect | [Name] | [Accountability] |
| Affected Users | [Team/Group] | [Impact description] |

## 4. Domain Context
[Describe the business domain, bounded contexts involved, and how this initiative relates to existing systems.]

## 5. Constraints
[What organizational, technical, regulatory, or resource constraints limit the solution space?]

- [Constraint 1]
- [Constraint 2]

## 6. Risks
[What could prevent success or reduce value delivery? Include probability and impact.]

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| [Risk 1] | [High/Med/Low] | [High/Med/Low] | [Strategy] |

## 7. Assumptions
[What conditions must hold true for this initiative to succeed?]

- [Assumption 1]
- [Assumption 2]

## 8. Decision Candidates
[What architectural or product decisions need to be made before proceeding?]

| Decision | Options | Status |
|---|---|---|
| [Decision 1] | [Option A vs Option B] | Open |

## 9. Evidence Links
[Links to supporting documents, data sources, research, or prior artifacts.]

| Evidence | Type | Link |
|---|---|---|
| [Evidence 1] | [Data/Research/ADR] | [URL or path] |
```

---

## 2. Data Structure (JSON)

For integration with the Evolith CLI and automated scaffolding tools.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Discovery Knowledge Brief",
  "type": "object",
  "required": ["id", "businessTriggerId", "problem", "value", "actors", "context", "constraints", "risks", "assumptions", "decisionCandidates", "evidenceLinks", "adoptionLevel", "status"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for this Knowledge Brief."
    },
    "businessTriggerId": {
      "type": "string",
      "description": "Reference to the business trigger or problem ticket."
    },
    "problem": {
      "type": "string",
      "description": "Plain-language description of the problem or opportunity."
    },
    "value": {
      "type": "string",
      "description": "Expected value or benefit of solving the problem."
    },
    "actors": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["role", "name", "responsibility"],
        "properties": {
          "role": { "type": "string" },
          "name": { "type": "string" },
          "responsibility": { "type": "string" }
        }
      },
      "description": "Key stakeholders and their roles."
    },
    "context": {
      "type": "string",
      "description": "Business domain context and bounded context relationships."
    },
    "constraints": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Organizational, technical, or regulatory constraints."
    },
    "risks": {
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
      "description": "Identified risks with probability and impact."
    },
    "assumptions": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Conditions that must hold true for success."
    },
    "decisionCandidates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["decision", "options", "status"],
        "properties": {
          "decision": { "type": "string" },
          "options": { "type": "string" },
          "status": { "type": "string", "enum": ["Open", "Decided", "Deferred"] }
        }
      },
      "description": "Pending decisions requiring resolution."
    },
    "evidenceLinks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["label", "type", "url"],
        "properties": {
          "label": { "type": "string" },
          "type": { "type": "string" },
          "url": { "type": "string" }
        }
      },
      "description": "Supporting evidence and references."
    },
    "adoptionLevel": {
      "type": "string",
      "enum": ["Mandatory", "Recommended", "Optional"],
      "description": "Adoption level for this artifact."
    },
    "status": {
      "type": "string",
      "enum": ["Draft", "In Review", "Approved", "Superseded"],
      "description": "Current lifecycle status."
    }
  }
}
```

---

## 3. Minimum Applied Example

```json
{
  "id": "KB-2024-001",
  "businessTriggerId": "JIRA-PROJ-456",
  "problem": "Customer onboarding takes 48 hours due to manual identity verification, causing 40% abandonment in the first 24 hours.",
  "value": "Reduce onboarding time to under 5 minutes and cut abandonment rate by 60% within two quarters.",
  "actors": [
    { "role": "Sponsor", "name": "VP of Customer Experience", "responsibility": "Budget authority and strategic alignment" },
    { "role": "Product Owner", "name": "Maria Lopez", "responsibility": "Backlog ownership and stakeholder communication" },
    { "role": "Architect", "name": "Carlos Ruiz", "responsibility": "Technical feasibility and bounded context design" }
  ],
  "context": "Digital onboarding spans the Identity Verification and Customer Lifecycle bounded contexts. Existing systems use a monolithic auth module that cannot scale to partner-channel integrations.",
  "constraints": [
    "Must comply with KYC/AML regulations for all target markets",
    "Current identity provider contract expires in 6 months",
    "Team capacity limited to 4 engineers for Q1"
  ],
  "risks": [
    { "description": "Identity provider SLA below 99.9% during peak periods", "probability": "Medium", "impact": "High", "mitigation": "Negotiate SLA clause or evaluate fallback provider" },
    { "description": "Regulatory approval delays for new verification flow", "probability": "Low", "impact": "High", "mitigation": "Early engagement with Compliance team" }
  ],
  "assumptions": [
    "KYC/AML compliance requirements are stable for the next 12 months",
    "Cloud provider quotas support projected concurrency of 500 req/s",
    "Existing event bus can absorb onboarding domain events without re-architecture"
  ],
  "decisionCandidates": [
    { "decision": "Identity provider selection", "options": "Current vendor vs. alternative with OAuth2 support", "status": "Open" },
    { "decision": "Onboarding orchestration pattern", "options": "Saga vs. Choreography vs. Orchestration", "status": "Open" }
  ],
  "evidenceLinks": [
    { "label": "Q3 Abandonment Report", "type": "Data", "url": "./docs/reports/q3-abandonment.md" },
    { "label": "KYC Regulatory Brief", "type": "Research", "url": "./docs/compliance/kyc-regulatory-brief.md" }
  ],
  "adoptionLevel": "Mandatory",
  "status": "In Review"
}
```

---

## 4. Handoff to Next Artifact

Once approved, the **Knowledge Brief** feeds directly into:

1. **Assumptions & Questions Log** — all assumptions and open decisions migrate to the living log for tracking.
2. **Discovery Context Pack** — the Knowledge Brief fields populate the context pack for AI agents and satellite repositories.
3. **Capability Map** — domain context and problem statement inform capability decomposition.

The `actors`, `risks`, and `decisionCandidates` fields are consumed by downstream artifacts without transformation.

---

## Quality Checklist

- [ ] Problem statement is specific, measurable, and written in plain business language
- [ ] Value proposition includes at least one quantifiable metric
- [ ] All key stakeholders are identified with clear responsibilities
- [ ] Constraints are explicitly listed (not buried in prose)
- [ ] Risks include both probability and impact assessments
- [ ] Assumptions are independently verifiable
- [ ] Decision candidates list concrete options (not vague areas)
- [ ] Evidence links resolve to actual documents or data sources
- [ ] Language is consistent (no mixed EN/ES within the file)
- [ ] Document is stored in version control alongside relevant code or design artifacts

---

## Recommended Adoption Level

**Mandatory** for all new initiatives entering Discovery. The Knowledge Brief is the prerequisite for the Assumptions & Questions Log, Discovery Context Pack, and Capability Map.

---

## Update Criteria

| Trigger | Action |
|---|---|
| New stakeholder identified | Add to actors table and JSON actors array |
| Risk materializes or new risk emerges | Update risks section with current probability/impact |
| Assumption validated or invalidated | Update assumptions and sync to Assumptions & Questions Log |
| Decision candidate resolved | Mark as Decided, record outcome, and link to ADR |
| Business trigger scope changes | Revisit problem statement and value proposition |
| Quarterly review | Full artifact review; downgrade or close if initiative is dormant |
