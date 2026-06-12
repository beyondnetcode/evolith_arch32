# [ADR 0012](0012-advanced-authorization-rbac-abac.md): Advanced Authorization (RBAC/ABAC) Strategy

## Status
Approved

## Date
2026-05-08

## Context
Basic JWT identification determines *who* is accessing the service, but SaaS applications need to restrict *what* they can physically do. Users in active operational tenants need permission matrix checks depending on dynamic conditions, and role assignments must remain scoped firmly inside their specific Tenant context.

## Decision
Implement a Hybrid Architecture bridging Role-Based (RBAC) and Attribute-Based (ABAC) access control:

1. **NestJS Guard Framework**: Deploy custom `@Roles()` and `@Permissions()` annotations on controllers. Use native Global Interceptors to read the parsed JWT, fetch metadata associated with claims, and approve/deny execution pipeline entries immediately.
2. **Strict Tenant Scoping**: Permissions are never global. A user might be a supervisor in Tenant A, and an observer in Tenant B. Checks must intersect the target endpoint context with the active `AsyncLocalStorage` current Tenant token.
3. **Immutable Security Trail**: Crucial privileges changes or failed privilege elevation attempts automatically broadcast messages to the Audit Log context asynchronously, aiding automated threat surveillance streams.

## Consequences

### Positive
- Fine-grained access policy that adapts effortlessly to complex regulatory business setups.
- Protects against lateral internal attacks between system tiers or tenants.

### Negative
- Management matrix growth requires careful administrative tooling to maintain over time.
- Designing JWT tokens carefully is necessary to avoid oversized packet payloads causing header bloat.

## References
- [NestJS Guard Documentation](https://docs.nestjs.com/guards)
- [ADR-0010: Multi-Tenancy (RLS)](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)







## Objective and Scope

Historical backfill: Address the architectural tension where basic JWT identification determines *who* is accessing the service, but SaaS applications need to restrict *what* they can physically do, establishing a standard boundary.

## Options Considered

- **Selected:** Advanced Authorization (RBAC/ABAC) Strategy
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [NestJS Guard Documentation](https://docs.nestjs.com/guards)
- [ADR-0010: Multi-Tenancy (RLS)](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

Unknown (historical record).

---
[Back to Index](./README.md)
