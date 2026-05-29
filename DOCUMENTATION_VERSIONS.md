# Documentation Version Log

> **Bilingual Navigation:** [Versión en Español](./DOCUMENTATION_VERSIONS.es.md)

This log tracks all production documentation releases with their version tags, dates, and key changes. Updated automatically via CI on every release to `main`.

---

## Production Releases

| Version | Date | Branch | Key Changes | Hotfixes |
|---------|------|--------|-------------|----------|
| docs-v1.0.0 | 2026-04-15 | release/docs-v1.0.0 | Initial production documentation release | 0 |
| docs-v1.1.0 | 2026-05-01 | release/docs-v1.1.0 | Added contract testing guidelines, API standards ADRs 0030-0040 | 0 |
| docs-v1.1.1 | 2026-05-15 | hotfix/docs-fix-api-links | Fixed broken API reference links in architecture-communication-strategy | 3 |
| docs-v1.2.0 | 2026-05-29 | release/docs-v1.2.0 | Added observability playbook, updated bilingual tooling scripts, ADR-0068 GitFlow documentation release strategy | 0 |

## Upcoming (from `develop`)

| Target Version | Planned Date | In Progress |
|----------------|--------------|-------------|
| docs-v1.3.0 | 2026-06-15 | feature/docs-add-security-section |
| docs-v2.0.0 | 2026-09-01 | Planned major restructuring for modular monolith documentation |

## Version Policy

| Increment | When to Use | Example |
|-----------|-------------|---------|
| **Major** (`X.0.0`) | Breaking structural changes, renamed sections that break links, ADR renumbering | `docs-v2.0.0` |
| **Minor** (`X.Y.0`) | New documentation sections, new ADRs, new architecture areas | `docs-v1.3.0` |
| **Patch** (`X.Y.Z`) | Bug fixes, link corrections, diagram fixes, typo corrections | `docs-v1.2.1` |

## Release Criteria

All production releases must meet:

- [x] All CI checks pass (validate-docs.mjs, check-bilingual-parity.mjs)
- [x] Bilingual parity verified for all affected file pairs
- [x] Version log updated with release entry
- [x] Git tag created in format `docs-vX.Y.Z`
- [x] GitHub Release created with changelog
- [x] MASTER_INDEX.md navigation verified

## Hotfix SLA

| Priority | Response Time | Max Open Duration |
|----------|---------------|-------------------|
| Critical (broken links in production) | 4 hours | 24 hours |
| High (wrong technical info) | 8 hours | 48 hours |
| Medium (diagram fixes) | 24 hours | 72 hours |

---

See [ADR-0068](./reference/architecture/adrs/core/0068-documentation-release-gitflow.md) for full documentation release GitFlow policy.

*This file is auto-updated by `.github/workflows/docs-release.yml`.*
*Do not edit manually. Last update: 2026-05-29*