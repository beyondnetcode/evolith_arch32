# Ballpark Estimation

> **Bilingual Navigation:** [Versión en Español](./ballpark-estimation-template.es.md)
> **Purpose:** To provide a high-level estimate (T-shirt sizing, order of magnitude) of the technical effort, the infrastructure resource limits and the team size, so that technical feasibility can be assessed against the Technical Feasibility Canvas.
> 
> **SDLC Phase:** 01 - Discovery / Ideation
> 
> **Owner:** Architect / Tech Lead
> 
> **Quality Gate:** Architecture Approval Gate.

## Artifact Metadata

* **Evolith Upstream URL:** `Under construction - Request from Upstream`
* **Required Inputs:** Technical Feasibility Canvas.
* **Expected Outputs:** An approved macro technical estimate that makes it viable to start writing the user stories.
* **Applied Taxonomy:** T-Shirt Sizing, Cloud Quotas, Resource Limits.
* **Applicable Evolith Rules:** R-03 (UTF-8 Clean).

---

## 1. Document Structure (Markdown)

```markdown
# Ballpark Estimation: [Initiative Name]

## 1. Scope of the Estimate
[Context of what is being estimated. Explicit exclusions.]

## 2. Proposed Team Size
- **Roles:** [e.g., 1 Tech Lead, 2 Backend, 1 QA]
- **Estimated Duration:** [e.g., 3 Sprints / 1.5 months]

## 3. Effort Breakdown (T-Shirt Sizing)
| Component/Module | Complexity (S/M/L/XL) | Technical Assumptions |
| --- | --- | --- |
| [Module 1] | [Size] | [Details] |

## 4. Infrastructure Resource Constraints and Quotas
- **Compute Limits (CPU/Memory):** [e.g., max 8 Cores, 16GB RAM]
- **Storage Limits:** [e.g., max 1TB SSD]
- **Network and Cloud Quotas:** [e.g., max 10 container instances]
```

---

## 2. Data Structure (JSON / CSV-and-Excel-compatible structure)

Designed so that it can be converted to CSV easily, or consumed by Excel through the Evolith CLI.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Ballpark Estimation",
  "type": "object",
  "properties": {
    "technicalFeasibilityId": { "type": "string" },
    "team": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "role": { "type": "string" },
          "count": { "type": "integer" }
        }
      }
    },
    "durationSprints": { "type": "integer" },
    "estimates": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "component": { "type": "string" },
          "size": { "enum": ["S", "M", "L", "XL"] },
          "assumptions": { "type": "string" }
        }
      }
    },
    "technicalConstraints": {
      "type": "object",
      "properties": {
        "cpuCoreLimit": { "type": "integer" },
        "memoryGbLimit": { "type": "integer" },
        "storageTbLimit": { "type": "number" },
        "maxMonthlyComputeHours": { "type": "integer" }
      }
    }
  }
}
```

---

## 3. Minimal Worked Example

```json
{
  "technicalFeasibilityId": "DISC-2023-001",
  "team": [
    { "role": "Tech Lead", "count": 1 },
    { "role": "Backend Engineer", "count": 2 },
    { "role": "Frontend Engineer", "count": 1 }
  ],
  "durationSprints": 4,
  "estimates": [
    {
      "component": "KYC Provider integration",
      "size": "L",
      "assumptions": "Requires a site-to-site VPN"
    },
    {
      "component": "Onboarding web frontend",
      "size": "M",
      "assumptions": "Reuses the existing UI components"
    }
  ],
  "technicalConstraints": {
    "cpuCoreLimit": 8,
    "memoryGbLimit": 16,
    "storageTbLimit": 1,
    "maxMonthlyComputeHours": 720
  }
}
```

---

## 4. Handoff Traceability to the Next Phase

Approving the **Ballpark Estimation** is what triggers the detailed requirements phase. The team size and the components identified in `estimates` dictate the initial epics under which the **Evolith User Stories** will be created.
