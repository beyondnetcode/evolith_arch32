# [ADR 0022](0022-contextual-auth-and-pluggable-projections.md): Contextual Authentication and Pluggable Output Projections

## Status
Approved

## Date
2026-05-08

## Context
SaaS execution planes face heavy integration friction: lightweight microservices need small condensed binary token formats to prevent data bloat, while heavy Frontend clients (Angular/React) demand full recursive JSON tree outputs to dynamically draw navigational menus. Hardcoding to a single output format limits either bandwidth efficiency or application speed.

## Decision
Separate Identity Validation logic entirely from output composition capabilities, enforcing specialized runtime projectors:

1. **Pluggable Projector Map**: The Core service emits a universal permission model. Dedicated pluggable projectors capture this payload and reformat it tailored to consumers (e.g., a JWT compressor for internal services, a rich JSON graph generator for browser agents).
2. **Contextual Node Routing**: Native design support for resolving hierarchy down through Tenant, down into physical Branch ("Sede") node routing dynamically on demand.
3. **Standard Read Caching**: Route all projections through High-Performance Redis bridges, retaining common target sub-millisecond execution goals for read-intensive validation endpoints.

## Consequences

### Positive
- Unifies governance under a single security source, while respecting varying downstream protocol tolerances.
- Natively empowers location-aware and node-specific authorization flows without database hacks.

### Negative
- Inflates initial code volume to support various projection templates.
- Requires cache invalidation synchrony across the different compiled formats.

## References
- [ADR-0021: High Performance Auth Graph](../../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)
- [ADR-0020: IdP Strategy](../../adrs/core/0020-identity-provider-abstraction-strategy.md)







## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
