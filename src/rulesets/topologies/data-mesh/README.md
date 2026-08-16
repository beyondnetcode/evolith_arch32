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

### What each verdict is worth

**Read the `Assurance` column before you rely on a green tick.** `observed` means the evaluation opened the repository. `declared` means the verdict was decided by comparing a field in a declaration file: a satellite that declares a control it has not built will pass. `unevaluated` means no check decides that rule today — it is shipped, and it is not enforced. These are stated here rather than left for a buyer to discover, and a guard fails the build when this table and the shipped ruleset disagree.

| Rule | Control | Assurance |
|---|---|---|
| DAM-R01 | Data Product Designation | `declared` |
| DAM-R02 | Data Contracts | `declared` |
| DAM-R03 | Federated Governance | `declared` |
| DAM-R04 | Data Product Lineage Tracking | `unevaluated` |
| DAM-R05 | Retention Policy on Data Products | `declared` |
| DAM-R06 | Explicit Consumption Contracts | `unevaluated` |
| DAM-R07 | Data Quality SLO Declaration | `observed` |
| DAM-R08 | Data Contract Backward Compatibility | `unevaluated` |
| DAM-R09 | Data Product Discoverability Registration | `unevaluated` |

## Required Authority

| Artifact | Role |
|---|---|
| [ADR-0084: Data Mesh and Data as a Product](../../../../reference/core/architecture/adrs/core/0084-data-mesh-data-products.md) | Governs data mesh topology and data product contracts. |
| [ADR-0079: Multi-Topology Reference Corpus](../../../../reference/core/architecture/adrs/core/0079-multi-topology-reference-corpus.md) | Governs topology manifests and composition. |
| [Data Mesh Architecture Rules](./data-mesh.rules.json) | Existing executable compatibility rules. |
| [Topology Dimensions Model](../../../../reference/core/architecture/topologies/topology-dimensions.md) | Defines composition and compatibility rules. |

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
