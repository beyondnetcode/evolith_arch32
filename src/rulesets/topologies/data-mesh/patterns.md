# Data Mesh — Patterns Guide

> **Bilingual Navigation:** [English](./patterns.md) | [Español](./patterns.es.md)

**Owner:** Data Architecture
**Topology:** Data Mesh
**Related Rules:** DAM-R01, DAM-R02, DAM-R06
**Related ADRs:** ADR-0084

## Purpose

This guide describes the core architectural patterns that define data mesh topology. Each pattern addresses a specific concern — product design, governance, contracts, platform, discovery, or ownership. These patterns are composable with distributed-modules, microservices, event-driven, serverless, and agentic-ai topologies.

## Data as a Product

Data products are first-class architectural entities with explicit ownership, SLAs, schemas, and lifecycle management. Products are not ad-hoc extracts or views — they are managed assets governed by DAM-R01.

Each product exposes a stable interface defined by its schema. Changes follow the backward-compatibility requirements of DAM-R08. Products must be discoverable, addressable, and trustworthy.

## Federated Governance

Governance operates at two levels: central policy definition and domain-level enforcement. The central governance body establishes standards — classification, security, compliance — while domains implement them within their product boundaries.

This pattern prevents governance bottlenecks while maintaining organizational consistency. Governance exceptions require formal approval and are tracked as exceptions in the governance registry per DAM-R03.

## Data Contracts (DAM-R02)

Data contracts are formal agreements between producers and consumers. A contract specifies the schema, quality guarantees, freshness SLAs, and access policies for a data product. Contracts are versioned and subject to backward-compatibility rules.

Contracts must be machine-readable and enforced by the platform. Manual agreements are not valid contracts. The self-serve platform mediates all contract lifecycle operations.

## Consumption Contracts (DAM-R06)

Consumption contracts define how consumers access and use data products. They specify query patterns, access scope, and usage constraints. Consumption contracts complement production contracts by documenting consumer-side obligations.

Consumers must register their consumption contracts in the platform. Unregistered consumers may be blocked from accessing products pending contract registration.

## Self-Serve Platform

The self-serve platform is the operational backbone of the mesh. It provides discovery, registration, policy enforcement, monitoring, and contract management. Platform teams own the infrastructure; domain teams operate through it.

Platform capabilities must include: product registration, schema management, access policy configuration, health monitoring, lineage tracking, and consumer onboarding.

## Discovery and Registration (DAM-R09)

All published data products must be registered in the discovery index. Registration includes ownership, schema, classification, SLAs, and contact information. Unregistered products are invisible to consumers and must not be used for cross-domain data sharing.

Discovery registration is a prerequisite for publication. Products in draft status are excluded from the discovery index per DAM-R01.

## Domain Ownership

Each business domain owns its data products. Ownership includes design, implementation, operation, and deprecation. Domain teams are accountable for product quality, consumer satisfaction, and compliance.

Ownership transfers require formal handoff procedures including SLA renegotiation, consumer notification, and platform metadata updates. Ownership is not shared — each product has exactly one owning domain.

## Validation Commands

```bash
# Verify pattern compliance
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Check bilingual parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

---
[Back to Data Mesh Profile](./README.md)
