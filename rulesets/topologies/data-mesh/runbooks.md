# Data Mesh — Runbooks Guide

> **Bilingual Navigation:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Owner:** Data Architecture
**Topology:** Data Mesh
**Related Rules:** DAM-R02, DAM-R07, DAM-R08

## Purpose

This guide provides operational runbooks for common data mesh scenarios. Each runbook defines step-by-step procedures for a specific operational task, including decision points, rollback steps, and validation commands.

## Runbook 1 — Data Product Deployment

### Trigger
Domain team has completed product design and is ready to publish.

### Procedure
1. Validate schema against backward-compatibility rules per DAM-R08.
2. Verify quality SLOs are declared and within platform thresholds.
3. Confirm access policies are published and enforceable.
4. Register product in discovery index per DAM-R09.
5. Run platform validation: `node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh`
6. Publish product and verify discovery index update.
7. Notify registered consumers of availability.

### Rollback
If publication fails: remove product from discovery index, revert platform metadata, notify stakeholders.

### Validation
- Product visible in discovery catalog
- Schema version matches registered version
- Access policies enforced at query time

---

## Runbook 2 — Schema Evolution

### Trigger
Domain team needs to modify a published product schema.

### Procedure
1. Classify the change: additive (non-breaking) or removal/rename (breaking).
2. For additive changes: update schema, register new version, maintain backward compatibility per DAM-R08.
3. For breaking changes: create deprecation plan with consumer notification timeline.
4. Update product metadata with new schema version.
5. Run validation: `node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh`
6. Publish updated schema and notify consumers.
7. Monitor consumer migration progress.

### Rollback
Revert to previous schema version. Notify consumers of rollback. Investigate root cause.

### Validation
- Previous schema version still accessible during deprecation window
- Consumer contracts updated or migration complete
- No query failures against new schema

---

## Runbook 3 — Quality Incident Response

### Trigger
Automated health check fails or consumer reports quality issue.

### Procedure
1. Acknowledge incident in platform monitoring system.
2. Identify affected products and downstream consumers.
3. Assess severity: critical (consumer SLA impacted), standard (degraded quality), low (cosmetic issue).
4. For critical incidents: activate fallback strategies per consumer contracts.
5. Investigate root cause: pipeline failure, schema drift, source data corruption.
6. Implement fix: pipeline restart, data correction, schema rollback.
7. Validate fix: re-run health checks, verify data completeness and freshness.
8. Document incident and post-mortem.

### Rollback
If fix introduces new issues: revert changes, restore from backup, re-activate consumer fallbacks.

### Validation
- Health check returns to passing state
- Consumer SLAs restored
- Incident documented with root cause

---

## Runbook 4 — Consumer Contract Migration

### Trigger
Consumer needs to migrate to a new schema version or product.

### Procedure
1. Identify consumer's current contract version and dependencies.
2. Review migration guide published by the producing domain.
3. Update consumer application to support new schema version.
4. Test with validation queries against both old and new versions.
5. Update consumption contract registration in platform.
6. Monitor consumer queries for errors during transition.
7. Decommission old version usage after migration window.

### Rollback
Revert consumer application to previous schema version. Restore previous consumption contract.

### Validation
- Consumer queries succeed against new schema
- No data quality regressions
- Consumption contract updated in platform

---

## Runbook 5 — Lineage Gap Remediation

### Trigger
Lineage validation discovers missing upstream or downstream documentation.

### Procedure
1. Identify the lineage gap: missing upstream source, missing downstream consumer, or undocumented transformation.
2. Contact domain teams for missing lineage information.
3. Update lineage metadata in the platform.
4. Validate lineage completeness: `node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh`
5. Verify lineage reflects actual data flow.
6. Document any lineage exceptions or limitations.

### Rollback
Revert lineage metadata to previous state if updates introduce errors.

### Validation
- Lineage graph complete for affected products
- No orphaned data flows
- Lineage metadata matches actual pipeline topology

---

## Validation Commands

```bash
# Validate runbook procedures
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Check bilingual parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Run coverage dashboard
node .harness/scripts/coverage-dashboard.mjs --area data-mesh
```

---
[Back to Data Mesh Profile](./README.md)
