# Data Mesh — Adoption Guide

> **Bilingual Navigation:** [English](./adoption.md) | [Español](./adoption.es.md)

**Owner:** Data Architecture
**Topology:** Data Mesh
**Related Rules:** DAM-R01, DAM-R03, DAM-R09

## Purpose

This guide defines the entry criteria, domain onboarding process, product creation workflow, and readiness checklist for adopting data mesh topology. Adoption is domain-driven — each domain enters the mesh when it meets readiness criteria and has operational capacity.

## Entry Criteria

Domains must satisfy the following criteria before entering the data mesh:

- **Domain Boundary Established:** Clear business domain ownership with a designated domain lead.
- **Data Product Lead Identified:** At least one person accountable for data product lifecycle.
- **Platform Access Granted:** Domain team has authenticated access to the self-serve platform.
- **Governance Training Complete:** Domain team has completed federated governance orientation.
- **Initial Product Identified:** At least one dataset ready for product formalization.

Domains that do not meet all criteria may participate as consumers only. Consumer participation requires platform access and governance training but not product ownership.

## Domain Onboarding

Onboarding follows a structured five-step process:

1. **Domain Registration:** Register the domain in the platform with ownership contacts and boundary description.
2. **Governance Alignment:** Review and acknowledge corporate data governance standards. Configure domain-specific policies.
3. **Platform Onboarding:** Configure domain workspace, access controls, and monitoring integrations.
4. **Product Identification:** Identify candidate datasets for product formalization. Prioritize by consumer demand and data quality.
5. **Pilot Product Launch:** Create and publish one pilot product following the product creation guide.

Onboarding duration: typically 2-4 weeks depending on domain complexity and existing data maturity.

## Product Creation Guide

### Step 1 — Define the Product

- Name the product with a clear, domain-specific identifier.
- Define the product description and intended consumers.
- Classify the data per corporate classification tiers.
- Identify upstream data sources and downstream consumers.

### Step 2 — Design the Schema

- Define the output schema with typed fields.
- Declare primary keys and uniqueness constraints.
- Mark PII fields explicitly.
- Document field descriptions and business definitions.

### Step 3 — Set Quality SLOs

- Define completeness, freshness, validity, and uniqueness thresholds per DAM-R07.
- Align SLOs with consumer requirements and SLA tier.
- Configure health check schedule and alerting.

### Step 4 — Configure Access Policies

- Define role-based access controls per product.
- Publish access policies to the platform.
- Configure consumer onboarding workflow.

### Step 5 — Register and Publish

- Register the product in the discovery index per DAM-R09.
- Validate registration completeness.
- Publish the product and notify initial consumers.

## Readiness Checklist

- [ ] Domain registered in platform
- [ ] Domain lead and data product lead designated
- [ ] Governance training completed
- [ ] Platform workspace configured
- [ ] Pilot product schema defined
- [ ] Quality SLOs declared
- [ ] Access policies published
- [ ] Product registered in discovery index
- [ ] Consumer notification sent
- [ ] Health checks configured

## Validation Commands

```bash
# Verify adoption documentation
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Check bilingual parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

---
[Back to Data Mesh Profile](./README.md)
