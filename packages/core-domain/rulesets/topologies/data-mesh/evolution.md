# Data Mesh — Evolution Guide

> **Bilingual Navigation:** [English](./evolution.md) | [Español](./evolution.es.md)

**Owner:** Data Architecture
**Topology:** Data Mesh
**Related Rules:** DAM-R08
**Related ADRs:** ADR-0084

## Purpose

This guide defines the evolutionary path from monolithic data warehouses to data mesh topology. It covers migration stages, domain alignment, product maturity progression, schema evolution, and federation maturity. Evolution is incremental — teams adopt mesh patterns progressively rather than in a single migration.

## Monolithic Warehouse to Mesh

Migration from a centralized warehouse follows a four-stage progression: centralized extraction, domain extraction, product formalization, and full mesh operation. Each stage has measurable exit criteria.

- **Stage 1 — Centralized Extraction:** Domains begin publishing owned datasets as products. Warehouse remains the primary query layer. Platform provides discovery alongside existing catalog.
- **Stage 2 — Domain Extraction:** Domains take operational ownership of their products. Platform enforces access policies. Warehouse becomes one consumer among many.
- **Stage 3 — Product Formalization:** All products have declared SLAs, schemas, and contracts. Cross-domain queries route through platform. Warehouse decomposes into domain-owned stores.
- **Stage 4 — Full Mesh:** Self-serve platform is the primary interface. Federated governance is fully operational. Domains operate independently within governance guardrails.

## Domain Alignment

Domain boundaries for data products align with business domain boundaries defined in organizational domain mapping. Data domains should not create new organizational boundaries — they should mirror existing ones.

When domain boundaries are ambiguous, start with the coarsest alignment and refine as products mature. Premature domain splitting creates governance overhead without consumer benefit.

## Product Maturity Progression

Data products evolve through maturity levels that correspond to their operational sophistication:

- **Level 1 — Extract:** Raw dataset with basic metadata. No SLA. Internal domain use only.
- **Level 2 — Product:** Published with schema, SLA, and access policies. Discoverable through platform.
- **Level 3 — Managed:** Health checks active. Quality SLOs declared. Consumer contracts registered.
- **Level 4 — Optimized:** Automated quality remediation. Cross-domain lineage complete. Platform-integrated.

Maturity progression is voluntary and domain-driven. The platform provides tooling to support each level but does not mandate progression timelines.

## Schema Evolution (DAM-R08)

Schema changes follow backward-compatibility rules defined in DAM-R08. Additive changes — new optional fields, new endpoints — are non-breaking. Removing or renaming fields requires a deprecation cycle with consumer notification.

Schema versions are tracked in the product registry. Consumers pin to specific schema versions or declare tolerance for changes. Breaking changes require a new product version and migration support.

## Federation Maturity

Federated governance matures through three phases:

- **Phase 1 — Standards Definition:** Central body defines minimum standards. Domains self-assess compliance.
- **Phase 2 — Automated Enforcement:** Platform enforces standards at registration and publication. Exceptions require governance council approval.
- **Phase 3 — Policy as Code:** Governance rules expressed as machine-readable policies. Automated compliance scanning. Self-service exception workflows.

Each phase builds on the previous. Skipping phases creates governance gaps that are difficult to remediate retroactively.

## Validation Commands

```bash
# Verify evolution documentation
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Check bilingual parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

---
[Back to Data Mesh Profile](./README.md)
