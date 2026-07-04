# Template: Design Block

> **Bilingual navigation:** [Versión en Español](./design-block-template.es.md)
> **Phase:** 2 — Design and Architecture
> **Governs:** ADR-0104 (blueprint as a composable development guide)

## Purpose

A **design block** is one building unit of a blueprint — a plan, matrix, catalog, or policy (e.g. `infrastructure-plan`, `performance-plan`, `event-contract-catalog`). The blueprint is the "box of blocks": you compose a design by selecting and filling blocks per concern (frontend/backend/services/mobile/data). The Core validates the composed blueprint and **measures its maturity** (advisory, non-binding).

## Convention over Configuration

Every block conforms to [`design-block.schema.json`](../../../../src/rulesets/schema/design-block.schema.json) and is registered in the [block-type registry](../../../../src/rulesets/schema/design-block-registry.json). A **new blockKind is added by appending to the registry** — no engine change. Community contributions flow upstream via UP-NNN.

## Structure

| Field | Meaning |
|---|---|
| `blockKind` | Registry kind (kebab-case), e.g. `performance-plan` |
| `title` | Human-readable name |
| `scope` | `core` (canonical corpus) or `tenant` (tenant private collection, ADR-0104 §11) |
| `concern` | frontend / backend / services / mobile / data / … (optional) |
| `status` | draft / proposed / accepted / deprecated |
| `sections[]` | The block's content sections (`id`, `title`, `content`) |
| `adrRefs[]` | ADRs the block depends on |
| `qualityAttributes[]` | `name` · `target` · `adrRef?` |
| `maturitySignals[]` | Signals that feed the technical-maturity score (`name`, `value?`, `target?`) |
| `governance.tier` | official / certified / community |

## Authoring rules

- One block = one concern-scoped design unit; keep it composable and self-contained.
- Declare `maturitySignals` so the Core can measure the block's maturity.
- A block is **advisory**: it feeds recommendations and the maturity score; the tenant's gate decides any blocking.
- Reuse a canonical (`core`) block before creating a `tenant` one; promote reusable `tenant` blocks upstream (UP-NNN).

## Related

- [Blueprint Schema](../../../../src/rulesets/schema/blueprint.schema.json)
- [Design Block Registry](../../../../src/rulesets/schema/design-block-registry.json)
- [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.md)

---
[Back to Artifact Templates](./README.md)
