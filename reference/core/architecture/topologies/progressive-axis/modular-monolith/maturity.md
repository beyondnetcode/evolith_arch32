# Modular Monolith Adoption, Operations, and Evolution Guide

> **Bilingual Navigation:** [Version en Espanol](./maturity.es.md)

## Adoption

Adopt this topology when the product needs one deployable unit while keeping domain boundaries explicit. Start with bounded contexts, explicit contracts, and independent persistence ownership.

## Operations

Operate one release pipeline and one deployable artifact. Monitor boundary violations, migration ownership, and extraction-readiness signals as part of normal architecture validation.

## Security

Authorize access at the application boundary and preserve tenant filtering in the application layer, with database-native controls as a secondary failsafe.

## Resilience

Keep in-process failures bounded by context contracts. Use durable integration mechanisms before extracting a module solely to recover from an internal failure.

## Patterns and Anti-Patterns

Use Data Mapper and Repository patterns, ports and adapters, and contract-first cross-context integration. Do not share domain internals, persistence tables, or implicit transaction ownership across contexts.

## Evolution

Move to distributed modules only when ADR-0045 readiness evidence justifies independent operational ownership. Preserve contracts and data ownership so that extraction remains reversible and deliberate.

## Validation Checklist

- Validate the topology configuration against `topology.config.schema.json` and both fixtures.
- Run Native and OPA policy evaluation through the shared control plane.
- Confirm approved ADRs, bilingual guidance, and reproducible positive and negative tests.

---
[Back to Modular Monolith Profile](./README.md)
