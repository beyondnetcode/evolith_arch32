# Data Mesh — Operations Guide

> **Bilingual Navigation:** [English](./operations.md) | [Español](./operations.es.md)

**Owner:** Data Architecture
**Topology:** Data Mesh
**Related Rules:** DAM-R01, DAM-R03
**Related ADRs:** ADR-0084

## Purpose

This guide defines operational procedures for managing data products across their lifecycle, from domain designation through deprecation. It establishes the domain ownership model, self-serve platform governance, and pipeline health monitoring required for sustainable mesh operations.

## Domain Ownership Model

Each domain owns its data products end-to-end. Domain data product owners are accountable for quality, availability, and consumer contract compliance. Ownership transfers require formal handoff with updated SLAs and consumer notification.

Domain teams must designate a data product lead who serves as the primary point of contact for all consumers. The lead owns the product's schema, quality SLOs, and lifecycle decisions.

## Data Product Lifecycle

Data products follow a four-stage lifecycle: draft, published, deprecated, and archived. Each stage has explicit entry and exit criteria defined in DAM-R01. Products in draft status are not discoverable through the self-serve platform. Deprecated products must maintain backward compatibility for a minimum transition period.

### Stage Definitions

- **Draft:** Internal domain prototype. No SLA. Not discoverable via platform catalog.
- **Published:** Consumer-ready. SLA active. Registered in discovery index.
- **Deprecated:** Scheduled for removal. Backward compatibility maintained per DAM-R08. Consumers notified.
- **Archived:** Read-only. No new consumers accepted. Retention policy per DAM-R05.

## Self-Serve Platform Governance

The self-serve platform is the primary interface for data product registration, discovery, and consumption. Platform teams provide the infrastructure; domain teams operate their products through it.

Platform governance requires that all data product metadata — ownership, schema, SLAs, classification — is registered before publication. Unregistered products must not appear in the discovery index.

## Pipeline Monitoring

Domain teams are responsible for monitoring their ingestion pipelines and output freshness. Platform provides centralized observability dashboards; teams configure their own alerting thresholds aligned to product SLOs.

Key monitoring dimensions: pipeline latency, output freshness, record counts, schema drift, and error rates. All metrics must be exposed through the self-serve platform for cross-domain visibility.

## Product Health Checks

Automated health checks run on a configurable schedule. Health status is published to the discovery index and consumed by dependent products. Health check criteria include data freshness, completeness, uniqueness, and validity as defined in DAM-R07.

Products failing health checks are flagged in the platform catalog and trigger consumer notifications within the configured alert window.

## Validation Commands

```bash
# Verify product registration
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Check bilingual parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Run coverage dashboard
node .harness/scripts/coverage-dashboard.mjs --area data-mesh
```

---
[Back to Data Mesh Profile](./README.md)
