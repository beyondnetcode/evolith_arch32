# Canonical Reference vs UMS Applied Model

> Bilingual navigation: [Espanol](./demo-vs-reference.es.md)

This repository and UMS serve different purposes. Reading them as one authority level would turn an implementation choice into a universal rule.

| Concern | Canonical architecture reference | UMS applied model |
|---|---|---|
| Purpose | Define reusable standards, blueprints, ADRs, and selection criteria | Demonstrate those ideas in an enterprise product context |
| Location | This repository under `reference/architecture/` and `reference/governance/` | [beyondnetcode/ums](https://github.com/beyondnetcode/ums) |
| Authority | Normative where an artifact is accepted or mandatory | Evidence and specialization unless promoted by an ADR here |
| Technology | Runtime-agnostic baseline plus explicit runtime profiles | Its selected product stack and operational constraints |
| Executable code | Not maintained in this repository | Maintained in the UMS repository |

## Interpretation Rule

Read the baseline and ADR registry first. Use UMS to inspect a coherent implementation of identity, access, auditing, bounded contexts, APIs, observability, and delivery practices. When a UMS practice is intended for all products, it must be promoted into this repository as a standard, ADR, or canonical pattern.

---
[Back to UMS Reference Hub](./README.md)
