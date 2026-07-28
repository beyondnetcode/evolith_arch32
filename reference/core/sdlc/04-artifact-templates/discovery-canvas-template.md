# Discovery Canvas

> **Bilingual Navigation:** [Versión en Español](./discovery-canvas-template.es.md)
> **Purpose:** The initial record of an initiative, used to align the context, the problem to be solved, the technical constraints and the quality attributes that are expected of it.
> 
> **SDLC Phase:** 01 - Discovery / Ideation
> 
> **Owner:** Requester / PM
> 
> **Quality Gate:** Ideation Hub approval

## Artifact Metadata

* **Evolith Upstream URL:** `Under construction - Request from Upstream`
* **Required Inputs:** A technical need or a detected problem, and an identified sponsor.
* **Expected Outputs:** Preliminary approval to move on to the Technical Feasibility Canvas / PRD (Ideation Hub).
* **Applied Taxonomy:** Aligned with the Evolith glossary (MVP, NFRs, Bounded Context).
* **Applicable Evolith Rules:** R-03 (UTF-8 Clean), R-06 (Split Stories), R-09 (Readability).

---

## 1. Document Structure (Markdown)

```markdown
# [Initiative Name] - Discovery Canvas

## 1. Context and Problem
[Briefly describe the current situation and the main pain that justifies this initiative. Use clear technical and business language (Rule R-09).]

## 2. Technical Constraints and Quality (NFRs)
[Which quality attributes are the priority (e.g., latency < 200ms, 99.9% high availability, data security)? What are the known infrastructure limitations?]

## 3. Target Audience / Stakeholders
[Who are the users affected? Which engineers or sponsors are involved?]

## 4. Assumptions and Resource Constraints
[The list of technical assumptions, cloud quota limits or technology-stack limitations that condition the initiative.]

## 5. Success Criteria and Preliminary Quality Attributes
[How will we know this initiative succeeded from an architecture and performance point of view? (Qualitative or quantitative NFR metrics.)]
```

---

## 2. Data Structure (JSON)

For integration with the Evolith CLI and with automated scaffolding tools.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Discovery Canvas",
  "type": "object",
  "required": [
    "initiativeName",
    "sponsor",
    "businessContext",
    "problemStatement",
    "expectedQualityAttributes"
  ],
  "properties": {
    "initiativeName": {
      "type": "string",
      "description": "Official name of the initiative."
    },
    "sponsor": {
      "type": "string",
      "description": "Executive sponsor (primary stakeholder)."
    },
    "businessContext": {
      "type": "string",
      "description": "Description of the current situation."
    },
    "problemStatement": {
      "type": "string",
      "description": "Description of the problem or the opportunity."
    },
    "expectedQualityAttributes": {
      "type": "object",
      "required": ["latencyMs", "concurrencyRequestsSec", "availabilitySla"],
      "properties": {
        "latencyMs": { "type": "integer" },
        "concurrencyRequestsSec": { "type": "integer" },
        "availabilitySla": { "type": "string" },
        "securityCompliance": { "type": "string" }
      },
      "description": "Required quality attributes and NFRs."
    },
    "assumptions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Assumptions and operational constraints."
    }
  }
}
```

---

## 3. Minimal Worked Example

```json
{
  "initiativeName": "Digital onboarding modernisation",
  "sponsor": "User Experience Directorate",
  "businessContext": "The current user sign-up process takes 48 hours on average because of manual verifications.",
  "problemStatement": "A high drop-off rate (40%) during the first 24 hours after registration, caused by the latency of the process.",
  "expectedQualityAttributes": {
    "latencyMs": 200,
    "concurrencyRequestsSec": 500,
    "availabilitySla": "99.9%",
    "securityCompliance": "OAuth2 / OWASP Top 10"
  },
  "assumptions": [
    "The identity verification provider supports a 99.9% SLA.",
    "Regulatory compliance has already been validated by Compliance."
  ]
}
```

---

## 4. Handoff Traceability to the Next Phase

The approved output of the **Discovery Canvas** — and `expectedQualityAttributes` and `problemStatement` in particular — is injected directly as the foundational input from which the **Technical Feasibility Canvas** is structured. The Evolith CLI uses those JSON fields to initialise the technical feasibility document automatically.
