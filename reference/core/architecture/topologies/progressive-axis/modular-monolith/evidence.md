# Modular Monolith — Evidence Guide

> **Bilingual Navigation:** [English](./evidence.md) | [Español](./evidence.es.md)

**Owner:** Architecture Board
**Topology:** Modular Monolith

---

## Validation Commands

Automated validation ensures the modular monolith adheres to its architectural constraints. Run these commands in CI and during code review.

```bash
# Validate module boundary compliance
npm run validate:module-boundaries

# Check for cross-module database access violations
npm run lint:cross-module-access

# Verify schema-per-domain isolation
npm run validate:schema-isolation

# Run extraction readiness assessment
npm run metrics:extraction-readiness

# Validate API contract compliance
npm run validate:api-contracts
```

**CI integration:** All validation commands must pass before merge. Violations are treated as build failures.

## Coupling Metrics

Track coupling between modules to ensure isolation boundaries remain intact.

| Metric | Target | Measurement |
|--------|--------|-------------|
| Afferent coupling (Ca) | <= 5 per module | Number of modules depending on this module |
| Efferent coupling (Ce) | <= 8 per module | Number of modules this module depends on |
| Instability (I) | 0.0 - 0.5 | Ce / (Ca + Ce); lower = more stable |
| Abstractness (A) | 0.5 - 1.0 | Abstract classes / total classes |

**Alerting:** Module coupling metrics exceeding thresholds trigger architecture review.

**Coupling trend tracking:** Metrics captured monthly; regression in coupling scores blocks module extraction.

## Boundary Compliance

Verify that module boundaries are respected in code, data, and runtime behavior.

- **Code boundaries:** No direct imports across module boundaries; only through published interfaces
- **Data boundaries:** No cross-module database queries; verified by automated scans
- **Runtime boundaries:** No shared mutable state between modules; verified by static analysis
- **API boundaries:** All cross-module calls use versioned, documented contracts

**Compliance score:** Each module maintains a boundary compliance score. Target: >= 95% compliance across all dimensions.

**Violation handling:** Violations logged, categorized by severity, and tracked to resolution. Critical violations block releases.

## Extraction Readiness Tracking

Readiness scores are tracked per module over time to identify trends and extraction candidates.

```
Module: order-management
  Current score: 78% (↑ from 72% last month)
  Dimensions:
    Interface cleanliness: 85% (↑)
    Database independence: 90% (→)
    No shared state: 100% (→)
    Event emission: 65% (↑)
    Test coverage: 82% (↑)
  Status: On track for extraction candidacy in Q2
```

**Reporting:** Monthly readiness reports generated automatically; shared with Architecture Board and module teams.

**Historical data:** Readiness scores retained for 12 months to support trend analysis and extraction planning.

---

[Back to Modular Monolith Profile](./README.md)
