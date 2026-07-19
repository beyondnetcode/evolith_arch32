# [ADR 0022](0022-contextual-auth-and-pluggable-projections.md): Contextual Authentication and Pluggable Output Projections

## Status
Accepted

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

Historical backfill: Address the architectural tension where saaS execution planes face heavy integration friction: lightweight microservices need small condensed binary token formats to prevent data bloat, while heavy Frontend clients (Angular/React) demand full recursive JSON tree outputs to dynamically draw navigational menus, establishing a standard boundary.

## Options Considered

- **Selected:** Contextual Authentication and Pluggable Output Projections
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0021: High Performance Auth Graph](../../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)
- [ADR-0020: IdP Strategy](../../adrs/core/0020-identity-provider-abstraction-strategy.md)

## Technology Watch (Trends, Maturity, Adoption, Support)

Contextual authentication with pluggable projections is an architectural pattern for multi-channel authentication in the growth stage. The composable authentication middleware approach follows established patterns in Node.js (Passport.js-style strategies) and is well-demonstrated in production. Expected vigencia: 3-5 years as a pattern; specific projection implementations may evolve with protocol changes.

## Current Sources

- Passport.js documentation — https://www.passportjs.org, consulted 2026-06-20.
- OAuth 2.0 framework — https://oauth.net/2, consulted 2026-06-20.

---
[Back to Index](./README.md)
