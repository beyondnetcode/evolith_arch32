# Bounded Context Map

> **Bilingual Navigation:** [Versión en Español](./bounded-context-map.es.md)

This file is the canonical bounded context map for this satellite repository. Each bounded context must declare ownership, aggregate roots, and persistence strategy.

## Contexts

| Context | Owner | Aggregate Roots | Persistence |
|---------|-------|-----------------|-------------|
| (to be completed in Phase 2) | — | — | — |

## Integration Styles

| Source Context | Target Context | Style | Contract |
|----------------|---------------|-------|----------|
| (to be completed in Phase 2) | — | — | — |

## Notes

- This is a **reference placeholder** in the Core repository. Each satellite must produce its own bounded-context-map.md during Phase 2.
- The evidence-validator maps `Bounded Context Map` to this path in the Core repo for template-existence validation. Satellites copy this structure to their own repository.
- Follow ADR-0031 (Schema-per-Context) for data isolation rules.
- Follow ADR-0032 (Protocol Selection Matrix) for inter-context contracts.
