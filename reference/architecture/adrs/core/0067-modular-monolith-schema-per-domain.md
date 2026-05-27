# ADR 0067: Modular Monolith Database Boundary — Schema per Domain

## Status

Accepted

## Context and Problem Statement

Evolith starts product implementations as a progressive architecture, commonly beginning with a Modular Monolith before any justified migration to distributed modules or microservices.

A frequent failure mode in modular monoliths is that the source code is separated into modules, but the database remains an unconstrained shared model. When all modules freely share the same default schema, teams can accidentally introduce hidden coupling through direct table access, cross-domain joins, unclear data ownership, and implicit dependencies that are difficult to remove later.

This decision defines the baseline database boundary strategy for Evolith-based modular monoliths so that product repositories remain simple in early phases while preserving a clean migration path toward future service extraction.

## Decision

Evolith adopts the following baseline for modular monolith implementations:

```text
Single physical database + logically separated schemas per module/domain
```

Each module, bounded context, or domain capability must own a dedicated database schema inside the same physical database instance.

Example reference structure:

```text
evolith_database
├── identity_schema
├── access_schema
├── tenant_schema
├── audit_schema
└── notification_schema
```

This decision does not mandate multiple physical databases during the first implementation phase. Physical database separation is deferred until a module has a justified need for independent deployment, scaling, ownership, or microservice extraction.

## Architectural Rules

1. Each module owns its schema and internal tables.
2. A module must not directly mutate tables owned by another module.
3. Cross-module access must happen through explicit application contracts, ports, domain services, integration events, or approved read models.
4. Cross-schema joins between different domains are discouraged and require architectural justification when used.
5. Database migrations must preserve module ownership and be traceable to the owning schema.
6. Schema separation is a boundary enforcement mechanism, not merely a naming convention.

## Rationale

Using a schema per module/domain keeps Phase 1 operationally simple because the system still runs on a single physical database. At the same time, it makes domain ownership visible at the persistence layer and reduces the risk of database-level coupling.

This approach aligns with the Evolith principle:

> Separate conceptually before separating physically.

It enables the following evolutionary path:

```text
Modular Monolith with schema-per-domain boundaries
        ↓
Identify a module that requires extraction
        ↓
Move the module schema to a dedicated database
        ↓
Replace in-process access with APIs, events, or integration contracts
```

## Alternatives Considered

### Alternative 1: Single physical database with one shared default schema

This is the simplest initial setup, but it creates a high risk of hidden coupling and unclear data ownership. It makes future microservice extraction more expensive because module data boundaries are not explicit.

**Result:** Rejected as the Evolith baseline.

### Alternative 2: Dedicated physical database per module from Phase 1

This maximizes data isolation but introduces unnecessary operational, transactional, deployment, backup, monitoring, and local-development complexity for early phases.

**Result:** Rejected for the default Phase 1 baseline.

### Alternative 3: Single physical database with schemas per module/domain

This balances operational simplicity with architectural boundary discipline.

**Result:** Accepted.

## Consequences

### Positive

- Clearer data ownership per module/domain.
- Reduced risk of hidden coupling between modules.
- Better alignment between code modularity and persistence modularity.
- Easier future extraction of selected modules into microservices.
- Stronger ADR traceability for Phase 1 decisions.

### Negative / Trade-offs

- Requires discipline to prevent unauthorized cross-schema dependencies.
- Requires naming, migration, and ownership conventions from the beginning.
- Does not prevent coupling by itself if teams bypass application-level contracts.
- May require additional governance for exceptional reporting or read-model scenarios.

## Compliance

Product repositories inheriting Evolith must adopt this strategy unless they document an explicit exception ADR.

A product-specific ADR may specialize the schema names, database engine details, migration tooling, and context-specific constraints, but it must preserve the baseline rule that each module/domain owns its persistence boundary.
