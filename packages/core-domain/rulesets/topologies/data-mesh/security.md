# Data Mesh — Security Guide

> **Bilingual Navigation:** [English](./security.md) | [Español](./security.es.md)

**Owner:** Data Architecture
**Topology:** Data Mesh
**Related Rules:** DAM-R03, DAM-R05
**Related ADRs:** ADR-0079

## Purpose

This guide establishes security practices for data products in a mesh topology. It covers classification, access control, PII handling, federated governance, data residency, and encryption. Security is a federated responsibility — each domain enforces controls on its products while adhering to corporate standards.

## Data Classification

All data products must be classified before publication. Classification determines access controls, retention policies, and compliance requirements. The self-serve platform enforces classification metadata at registration time.

### Classification Tiers

- **Public:** No access restrictions. External distribution permitted.
- **Internal:** Access limited to authenticated organizational users.
- **Confidential:** Access restricted to specific roles. Audit logging required.
- **Restricted:** Highest sensitivity. Encryption at rest and in transit mandatory. Access requires explicit approval.

## Access Control per Product

Each data product defines its own access policies within the federated governance framework. Policies specify which roles, teams, or services may consume the product. The platform enforces policies at query time; domains define them at design time.

Domain teams must publish access policies alongside their product metadata. Policies are versioned and subject to the same backward-compatibility requirements as schemas per DAM-R08.

## PII Handling

Products containing personally identifiable information must declare PII fields in their schema. The platform applies masking and tokenization based on consumer clearance level. PII data must never appear in discovery index metadata or product previews.

Domain teams are responsible for maintaining the PII registry and ensuring compliance with applicable data protection regulations. PII fields require explicit consumer justification for unmasked access.

## Federated Governance Security

Federated governance provides the security baseline across all domains. The central governance body defines minimum security standards; domains implement them within their product boundaries. Security exceptions require formal approval from the governance council.

Cross-domain data sharing requires mutual authentication and authorization. The platform mediates all cross-domain access through its policy enforcement layer.

## Data Residency

Data products must declare their geographic residency. The platform enforces residency constraints at ingestion and query time. Cross-border data transfers require explicit configuration and compliance documentation.

Domain teams must coordinate with the governance council to ensure residency declarations align with regulatory requirements and corporate policy.

## Encryption

All data products must encrypt data at rest using organizational key management standards. Products classified as Restricted or Confidential require encryption in transit using TLS 1.2 or higher. Key rotation follows the centralized key management schedule.

Domain teams manage encryption configuration through the self-serve platform. Encryption status is auditable and published as part of product health metadata.

## Validation Commands

```bash
# Verify security metadata completeness
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Check bilingual parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

---
[Back to Data Mesh Profile](./README.md)
