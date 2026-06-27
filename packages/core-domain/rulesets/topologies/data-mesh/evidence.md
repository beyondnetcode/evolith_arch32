# Data Mesh — Evidence Guide

> **Bilingual Navigation:** [English](./evidence.md) | [Español](./evidence.es.md)

**Owner:** Data Architecture
**Topology:** Data Mesh
**Related Rules:** DAM-R04, DAM-R07
**Related ADRs:** ADR-0084

## Purpose

This guide defines the evidence collection and validation procedures for data mesh topology. Evidence validates that data products meet their declared quality SLOs, contracts are compliant, lineage is complete, and the discovery catalog is accurate.

## Validation Commands

### Documentation Validation

```bash
# Full documentation validation
node .harness/scripts/ci/01-validate-docs.mjs

# Validate data-mesh specific content
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Render Mermaid diagrams for visual validation
node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid
```

### Bilingual Validation

```bash
# Check EN/ES structural parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Check bilingual coverage
node .harness/scripts/bilingual-coverage.mjs

# Generate ES skeleton from EN file
node .harness/scripts/generate-es-skeleton.mjs <file.md> --dry-run
```

### Coverage and Quality

```bash
# Generate visual coverage report
node .harness/scripts/coverage-dashboard.mjs

# Run Wilson deep audit
node .harness/scripts/run-wilson-audit.mjs

# Sanitize encoding issues
python ./.bmad-core/scripts/cleanup_markdown_encoding.py
```

## Quality Metrics

### Completeness

Measure the ratio of non-null values to total expected records. Products must declare completeness thresholds as part of their quality SLOs. Completeness below threshold triggers consumer notifications.

Target metrics: critical products >99.9%, standard products >99%, best-effort products >95%.

### Freshness

Measure the elapsed time between source data update and product availability. Freshness is tracked against declared SLAs. Products failing freshness SLAs are flagged in the platform catalog.

Monitoring granularity: per-product, per-domain, per-cross-domain dependency chain.

### Validity

Validate that data values conform to declared schemas and business rules. Validity checks run at ingestion time and on-demand. Invalid records are quarantined and reported.

Validity metrics: schema compliance rate, business rule pass rate, outlier detection rate.

### Uniqueness

Ensure no duplicate records exist within product datasets. Uniqueness constraints are declared in product schemas. Duplicate detection runs during ingestion and as batch validation.

Uniqueness metrics: duplicate detection rate, primary key uniqueness, composite key uniqueness.

## Catalog Completeness

The discovery catalog must contain accurate metadata for all published products. Catalog completeness is measured against: ownership declaration, schema registration, SLA declaration, classification assignment, and contact information.

Catalog completeness targets: 100% for published products, >90% for draft products. Incomplete catalog entries are flagged in platform health reports.

## Lineage Evidence (DAM-R04)

Lineage tracking must cover upstream sources, transformation logic, and downstream consumers. Lineage evidence is collected through: automated pipeline instrumentation, manual annotation, and platform integration.

Lineage completeness is measured as: percentage of products with documented upstream sources, percentage with documented downstream consumers, and percentage with transformation logic annotated.

## Contract Compliance

Contract compliance validates that products adhere to their declared schemas, quality guarantees, and access policies. Compliance checks run automatically against published contracts.

Compliance metrics: schema adherence rate, SLA fulfillment rate, access policy violation count. Non-compliant products are flagged and require remediation within the governance-defined window.

## Validation Checklist

- [ ] All published products registered in discovery catalog
- [ ] Schema versions current and backward-compatible
- [ ] Quality SLOs declared and monitored
- [ ] Access policies published and enforced
- [ ] Lineage documentation complete for upstream and downstream
- [ ] PII fields declared and access-controlled
- [ ] Encryption status verified
- [ ] SLA compliance within tolerance

---
[Back to Data Mesh Profile](./README.md)
