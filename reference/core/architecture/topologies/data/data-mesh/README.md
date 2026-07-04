# Data Mesh Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Accepted  
**Dimension:** `data`  
**Topology ID:** `data-mesh`  
**Compatibility Alias:** `F2-compatible`  
**Manifest:** [topology.manifest.json](./topology.manifest.json)

Data mesh is a data topology for distributed analytical ownership, governed data products, discoverable contracts, and platform-supported interoperability across domains.

## Purpose

Use this topology when analytical data ownership must move closer to domain teams without losing governance, quality, interoperability, or compliance.

Data mesh does not weaken transactional ownership. Domain data boundaries remain governed by the owning bounded context or service.

## Governance Rules

| Rule | Requirement |
|---|---|
| Domain ownership | Data products must align to bounded domains or service ownership. |
| Contracted products | Data products must publish schemas, quality expectations, and lifecycle metadata. |
| Interoperability | Shared data must use governed contracts and discoverable semantics. |
| Quality evidence | Data products must expose validation, lineage, freshness, and reliability signals. |
| Transactional boundary | Analytical distribution must not bypass transactional ownership or domain invariants. |

## Required Authority

| Artifact | Role |
|---|---|
| [ADR-0084: Data Mesh and Data as a Product](../../../adrs/core/0084-data-mesh-data-products.md) | Governs data mesh topology and data product contracts. |
| [ADR-0079: Multi-Topology Reference Corpus](../../../adrs/core/0079-multi-topology-reference-corpus.md) | Governs topology manifests and composition. |
| [Data Mesh Architecture Rules](./data-mesh.rules.json) | Existing executable compatibility rules. |
| [Topology Dimensions Model](../../topology-dimensions.md) | Defines composition and compatibility rules. |

## Executable Contract

Every adopting satellite providing or consuming data products must provide `data-mesh.config.json`:

```json
{
  "isDataProduct": true,
  "hasDataContracts": true,
  "federatedGovernance": true
}
```

DM-R01 through DM-R03 require that contract, enforcing explicit Data Product designation, the presence of Data Contracts for interoperability, and adherence to federated governance policies. The Native evaluator and [OPA policy](./data-mesh.rego) evaluate these fields.

## Composition

`data-mesh` can combine with:

| Topology | Why It Can Compose |
|---|---|
| `distributed-modules` | Enables analytical data products owned by domain modules with governed contracts. |
| `microservices` | Supports independently owned data products aligned to service boundaries. |
| `event-driven` | Drives data product updates through observable event channels. |
| `serverless` | Provides analytical data product execution without transactional coupling. |
| `agentic-ai` | Feeds AI-agent workflows with governed analytical data products. |

## Business Boundary

This profile is technical-only. It does not define data monetization, ROI, cost allocation, staffing, prioritization, delivery timing, or Funnel 0. Evolith Tracker owns those business concerns through its ACL.

---
[Back to Topology Hub](../../README.md)
