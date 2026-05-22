# API Governance Playbook

## Use When

- reviewing backend contracts
- designing REST endpoints
- designing GraphQL queries
- validating query handlers or repositories

## Mandatory Checks

1. REST and GraphQL responsibilities are explicit.
2. Commands remain REST-first unless an approved ADR says otherwise.
3. Query semantics remain equivalent across REST and GraphQL when both are exposed.
4. Pagination, filtering, sorting, and status/search normalization are centralized.
5. Error mapping stays structured and predictable.
6. Runtime-specific persistence examples do not leak assumptions from another engine or framework.
7. Multi-tenancy keeps primary application-layer filtering and secondary database-native enforcement.

## Architectural Goal

The API remains maintainable as a modular monolith today and extractable tomorrow.
