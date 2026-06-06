# Evolith Coverage Report

> Last updated: 2026-06-06

## Documentation Coverage

| Metric | Value |
|--------|-------|
| **Total Markdown files** | 636 |
| **Files passing validation** | 636 |
| **Validation pass rate** | 100% |
| **Bilingual coverage (EN/ES pairs)** | 283/283 (100%) |
| **Rulesets coverage** | 16 rule files, 13 schemas |
| **Phase Gate schemas** | 12/12 (100%) |

## Governance Artifacts

| Artifact Type | Count | Status |
|---------------|-------|--------|
| JSON Schemas (rulesets/schema/) | 13 | [PASS] Complete |
| ADR-encoded rules (rulesets/adr/) | 7 | [PASS] Complete |
| Architecture phase rules (rulesets/architecture/) | 3 | [PASS] Complete |
| Cross-cutting rules (rulesets/cross-cutting/) | 4 | [PASS] Complete |
| ACL rules (rulesets/acl/) | 1 | [PASS] Complete |
| SDLC rules (rulesets/sdlc/) | 2 | [PASS] Complete |
| Governance rules (rulesets/governance/) | 5 | [PASS] Complete |
| **Total ruleset files** | 35 | [PASS] Complete |

## Phase Gate Coverage

| Phase | Artifacts | Schema |
|-------|-----------|--------|
| **Phase 1** Discovery | Discovery Canvas, Business Case ROI, Ballpark Estimation, Evolith User Story, Agile Backlog | [PASS] Complete |
| **Phase 2** Specification | Functional Stories, ADRs | [PASS] Complete |
| **Phase 3** Construction | Technical Stories, CLI Impact Analysis | [PASS] Complete |
| **Phase 4** Validation | Test Summary Report, Pyramid Distribution | [PASS] Complete |
| **Phase 5** Delivery | Release Notes, Observability | [PASS] Complete |

## Quality Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Bilingual parity | 100% | 100% | [PASS] |
| Broken links | 0 | 0 | [PASS] |
| Mermaid diagram errors | 0 | 0 | [PASS] |
| UTF-8 encoding issues | 0 | 0 | [PASS] |
| Architecture Drift Index | < 10% | N/A (Core baseline) | [PASS] |

## Pre-commit Hooks Active

- `validate-docs.mjs` — Links, anchors, Mermaid, UTF-8, bilingual parity
- `check-bilingual-parity.mjs` — Structural header parity
- Orphan bilingual file detection

## Notes

- Coverage metric reflects **documentation and governance artifact coverage**, not code test coverage.
- Code test coverage for `sdk/cli/` and other implementation directories is tracked separately in those directories.
- Architecture Drift Index (DRIFT-01) is measured per-satellite against Core rulesets.

---
*This report is auto-generated. Run `node .harness/scripts/bilingual-coverage.mjs` to update.*