# Architecture Intelligence

> Bilingual navigation: [Espanol](./README.es.md)

Architecture Intelligence is the curated knowledge layer that makes Evolith architecture decisions, patterns, validation rules, and adoption guidance easier for humans and AI-assisted engineering tools to consume.

This portal is an index and orientation page. It does not replace ADRs, governance standards, canonical patterns, or product applied references.

## Start here

| Need | Go to |
|---|---|
| Understand why this catalog exists | [ADR-0057 Architecture Intelligence Catalog](../../../reference/core/architecture/adrs/core/0057-architecture-intelligence-catalog.md) |
| Understand AI-consumable architecture knowledge | [ADR-0058 AI-Consumable Architecture Knowledge](../../../reference/core/architecture/adrs/core/0058-ai-consumable-architecture-knowledge.md) |
| Validate Architecture Intelligence artifacts | [Architecture Intelligence Validation](./validation/architecture-intelligence-validation.md) |
| Review curated architecture patterns | [Patterns](./patterns/) |

## Current pattern examples

| Pattern | Purpose |
|---|---|
| [Bounded Context Isolation](./patterns/bounded-context-isolation.md) | Keep modular boundaries explicit across code and data ownership. |
| [Data Ownership per Bounded Context](./patterns/data-ownership-per-bounded-context.md) | Clarify ownership rules for data inside bounded contexts. |
| [No Cross-Domain Joins](./patterns/no-cross-domain-joins.md) | Avoid persistence coupling across modular boundaries. |
| [Domain-Oriented Microservice Architecture (DOMA)](./patterns/domain-oriented-microservice-architecture.md) | Group F3 microservices around bounded business domains, not technical layers ([ADR-0076](../../../reference/core/architecture/adrs/core/0076-domain-oriented-microservice-architecture.md)). |

## What belongs here

| Belongs here | Does not belong here |
|---|---|
| Curated architecture patterns | Product-specific implementation evidence |
| Tradeoff analysis | Local product route, schema, header or seed decisions |
| AI-readable architecture guidance | Unapproved enterprise standards |
| Links back to ADRs and standards | Copies of external material without governance review |

## Governance rule

Architecture Intelligence artifacts help explain and reuse architecture knowledge. They are not standards by themselves unless they point to an approved ADR, governance standard, or canonical pattern.

Product-specific implementation evidence remains in UMS or another satellite repository.

---

## In This Area

| Topic | Document |
| :--- | :--- |
| **AI** | [`ai/`](./ai/ai-knowledge-strategy.md) — AI knowledge strategy |
| **Trade-offs** | [`tradeoffs/`](./tradeoffs/architecture-radar.md) — architecture radar |

---

[Back to Knowledge Area](../demo/README.md) | [Back to Repository Root](../../../README.md)
