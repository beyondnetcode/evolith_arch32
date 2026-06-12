# ADR 0067: Modular Monolith Persistence Boundaries

## Status

Accepted

## Context and Problem Statement

Evolith starts product implementations as a progressive architecture, commonly beginning with a Modular Monolith before any justified migration to distributed modules or microservices.

A frequent failure mode in modular monoliths is that the source code is separated into modules, but the persistence model remains an unconstrained shared model. When all modules freely share the same persistence structures, teams can accidentally introduce hidden coupling through direct table access, cross-domain joins, unclear data ownership, implicit dependencies, and migration conflicts that are difficult to remove later.

This decision defines the baseline persistence boundary strategy for Evolith-based modular monoliths so that product repositories remain simple in early phases while preserving a clean migration path toward future service extraction.

This ADR intentionally defines the architectural boundary principle, not a single mandatory database implementation pattern.

## Decision

Evolith requires modular monolith implementations to define explicit persistence boundaries per module, bounded context, or domain capability.

Each module must own its persistence model and must not directly mutate persistence structures owned by another module.

The concrete persistence isolation mechanism may vary by product, database engine, ORM, hosting model, operational maturity, and implementation phase.

Valid implementation strategies include, but are not limited to:

- schema per module/domain;
- table naming conventions with enforced ownership;
- separate migration namespaces;
- separate database users, permissions, or roles;
- separate physical databases when justified;
- approved read models, projections, or reporting stores for cross-module queries.

For Evolith reference implementations, the recommended default is:

```text
Single physical database + logically separated persistence areas per module/domain
```

When the selected database engine supports schemas as first-class logical containers, the preferred reference strategy is:

```text
Single physical database + schema per module/domain
```

Example reference structure:

```text
evolith_database
├── identity_boundary
├── access_boundary
├── tenant_boundary
├── audit_boundary
└── notification_boundary
```

This decision does not mandate multiple physical databases during the first implementation phase. Physical database separation is deferred until a module has a justified need for independent deployment, scaling, ownership, security isolation, or microservice extraction.

## Architectural Rules

1. Each module owns its persistence model and internal persistence structures.
2. A module must not directly mutate persistence structures owned by another module.
3. Cross-module access must happen through explicit application contracts, ports, domain services, integration events, or approved read models.
4. Cross-boundary joins between different domains are discouraged and require architectural justification when used.
5. Database migrations must preserve module ownership and be traceable to the owning module or bounded context.
6. Persistence separation is a boundary enforcement mechanism, not merely a naming convention.
7. Product implementations must document the chosen persistence boundary strategy when it differs from the Evolith reference strategy.

## Rationale

Persistence boundaries make domain ownership visible below the application layer and reduce the risk of database-level coupling.

A schema-per-domain approach is a strong default for relational databases that support schemas because it keeps Phase 1 operationally simple while still making module ownership explicit. However, Evolith must remain portable across products, database engines, persistence technologies, and maturity levels.

This approach aligns with the Evolith principle:

> Separate conceptually before separating physically.

It enables the following evolutionary path:

```text
Modular Monolith with explicit persistence boundaries
        ↓
Identify a module that requires extraction
        ↓
Harden or isolate that module's persistence boundary
        ↓
Move the module's persistence model to a dedicated database when justified
        ↓
Replace in-process access with APIs, events, or integration contracts
```

## Alternatives Considered

### Alternative 1: Single physical database with one unconstrained shared persistence model

This is the simplest initial setup, but it creates a high risk of hidden coupling and unclear data ownership. It makes future service extraction more expensive because module data boundaries are not explicit.

**Result:** Rejected as the Evolith baseline.

### Alternative 2: Dedicated physical database per module from Phase 1

This maximizes data isolation but introduces unnecessary operational, transactional, deployment, backup, monitoring, and local-development complexity for early phases.

**Result:** Rejected for the default Phase 1 baseline.

### Alternative 3: Single physical database with schema per module/domain as a mandatory rule

This balances operational simplicity with architectural boundary discipline, but it over-specifies the implementation mechanism for a core Evolith ADR. Some products may use database engines, persistence technologies, or platform constraints where schemas are unavailable, undesirable, or insufficient as the only boundary mechanism.

**Result:** Rejected as a universal mandate; accepted as the preferred reference strategy when supported.

### Alternative 4: Explicit persistence boundaries with product-specific implementation mechanisms

This keeps the architectural requirement stable while allowing the concrete enforcement mechanism to vary by product and technology stack.

**Result:** Accepted.

## Consequences

### Positive

- Clearer data ownership per module/domain.
- Reduced risk of hidden coupling between modules.
- Better alignment between code modularity and persistence modularity.
- Easier future extraction of selected modules into microservices.
- Better portability across database engines and persistence technologies.
- Stronger ADR traceability for Phase 1 decisions without over-constraining product implementations.

### Negative / Trade-offs

- Requires discipline to prevent unauthorized cross-boundary dependencies.
- Requires naming, migration, and ownership conventions from the beginning.
- Does not prevent coupling by itself if teams bypass application-level contracts.
- May require additional governance for exceptional reporting or read-model scenarios.
- Requires product teams to document their concrete persistence boundary mechanism when not using the Evolith reference strategy.

## Compliance

Product repositories inheriting Evolith must define explicit persistence ownership boundaries per module, bounded context, or domain capability.

A product-specific ADR may specialize the database engine details, schema names, table conventions, migration tooling, database permissions, read models, reporting strategy, or context-specific constraints.

Products are compliant when they preserve the baseline rule that each module/domain owns its persistence boundary and cross-module persistence access is governed through explicit architectural contracts.

Using schema-per-domain is the recommended Evolith reference strategy when the selected database engine supports schemas, but it is not the only compliant implementation mechanism.

## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).
