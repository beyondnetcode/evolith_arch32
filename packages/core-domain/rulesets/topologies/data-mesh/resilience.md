# Data Mesh — Resilience Guide

> **Bilingual Navigation:** [English](./resilience.md) | [Español](./resilience.es.md)

**Owner:** Data Architecture
**Topology:** Data Mesh
**Related Rules:** DAM-R07
**Related ADRs:** ADR-0084

## Purpose

This guide defines resilience practices for data products in a mesh topology. It covers SLA management, fallback strategies, caching, availability monitoring, pipeline failure recovery, and freshness guarantees. Resilience is domain-owned but platform-validated.

## Data Product SLAs

Each published data product must declare an SLA covering availability, freshness, and completeness. SLAs are registered in the self-serve platform and used for automated health checks per DAM-R07.

SLA tiers: critical (99.9% availability, <1h freshness), standard (99% availability, <4h freshness), best-effort (no availability guarantee, freshness best-effort). Consumers select products based on SLA alignment with their requirements.

## Fallback Queries

Consumers must define fallback strategies for upstream product failures. Strategies include: reading from cached snapshots, switching to lower-fidelity products, or pausing dependent processing. Fallback configuration is part of the consumer contract.

Domain teams must document fallback behavior in product READMEs and make it available through the self-serve platform for automated orchestration.

## Caching

The platform provides built-in caching for frequently accessed products. Domains may configure cache policies per product based on freshness requirements and access patterns. Cache invalidation is triggered by product health check failures or schema changes.

Cached data must respect the same access controls as the source product. Cache TTL aligns with the product's freshness SLA.

## Availability Monitoring

Platform infrastructure provides centralized availability monitoring for all published products. Domain teams configure alerting thresholds aligned to their declared SLAs. Availability metrics are published to the discovery index for consumer consumption.

Monitoring covers: endpoint reachability, query success rates, latency percentiles, and error categorization. Outages are classified and escalated per severity tier.

## Pipeline Failure Recovery

Domain teams define recovery procedures for their ingestion pipelines. Recovery procedures must be documented and tested. The platform provides circuit-breaker patterns for downstream consumers when upstream pipelines fail.

Recovery procedures must include: automatic retry logic, dead-letter queues for unprocessable records, manual intervention triggers, and post-recovery validation. All recovery actions are logged for audit purposes.

## Freshness Guarantees

Freshness SLAs specify the maximum acceptable delay between source data updates and product availability. The platform tracks freshness metrics against declared SLAs. Consumers can query freshness status through the self-serve platform.

Products failing freshness SLAs are flagged automatically. Consumers receive notifications per their configured alerting preferences. Freshness violations trigger the quality incident response process.

## Validation Commands

```bash
# Validate SLA declarations
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Check bilingual parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Run coverage check
node .harness/scripts/coverage-dashboard.mjs --area data-mesh
```

---
[Back to Data Mesh Profile](./README.md)
