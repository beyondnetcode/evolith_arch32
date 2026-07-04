# Data Mesh Adoption, Operations, and Evolution Guide

> **Bilingual Navigation:** [Version en Espanol](./maturity.es.md)

## Adoption

Adopt this topology when analytical data ownership must move closer to domain teams without losing governance, quality, interoperability, or compliance. Start with domain-oriented data products, explicit contracts, and federated governance policies.

## Operations

Operate a self-serve data infrastructure platform supporting domain-owned data products. Monitor data contract freshness, quality evidence, lineage traceability, and compliance adherence as part of normal architecture validation.

## Security

Authorize data access at the data product boundary. Enforce attribute-based access control for analytical data consumption. Never bypass the federated governance plane for compliance-critical queries.

## Resilience

Design data products for idempotent updates, schema evolution tolerance, and graceful degradation when upstream domains are unavailable. Prefer eventual consistency for analytical distribution.

## Patterns and Anti-Patterns

Use domain-oriented data products with DATSIS properties (Discoverable, Addressable, Trustworthy, Self-describing, Interoperable, Secure), federated computational governance, and self-serve platform patterns. Do not build a centralized data lake, share raw operational tables across domains, or bypass domain ownership for analytical convenience.

## Evolution

Move to data mesh only when domain autonomy for analytical data is justified by organizational scale. Preserve transactional ownership boundaries and federated governance policies so that data product migration remains deliberate.

## Validation Checklist

- Validate the topology configuration against `topology.config.schema.json` and both fixtures.
- Run Native and OPA policy evaluation through the shared control plane.
- Confirm approved ADRs, bilingual guidance, and reproducible positive and negative tests.

---
[Back to Data Mesh Profile](./README.md)
