# ADR-0025: Feature Flag Provider Abstraction Strategy

## Status
Approved

## Date
2026-05-09

## Context
Incorporating Feature Flags introduces vendor lock-in risks. Directly hardcoding SDK logic from proprietary platforms (Unleash, ConfigCat, LaunchDarkly) violates core principles by embedding non-standard behaviors directly inside business use cases. We require complete provider hot-swappability.

## Decision
Subsume feature toggle invocation under classic Hexagonal Port principles:

1. **Canonical Port**: The core repository defines `IFeatureFlagPort`, detailing universal execution contracts (`evaluate()`, `isHealthy()`) entirely isolated from commercial library syntax.
2. **Pluggable Infrastructure**: Confine all concrete third-party SDKs into explicit outer Adapter layers. We support internal Postgres fallback strategies alongside native LaunchDarkly, ConfigCat, or Azure modules simultaneously.
3. **Dynamic Resolution**: Instantiate the correct provider adapter via runtime NestJS dependency injectors looking at specific active configuration keys.

## Consequences

### Positive
- Complete immunity to external pricing spikes or platform stability problems (immediate local fallback).
- High future-compatibility regarding eventual standardization on CNCF openFeature schemas.

### Negative
- Maintenance cost associated with sustaining multiple specialized adaptor classes targeting diverse provider formats.

## References
- [ADR-0024: Configuration Platform](../../adrs/core/0024-configuration-feature-management-platform.md)
- [ADR-0002: Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)





## Objective and Scope

Historical backfill: Address the architectural tension where incorporating Feature Flags introduces vendor lock-in risks, establishing a standard boundary.

## Options Considered

- **Selected:** Feature Flag Provider Abstraction Strategy
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0024: Configuration Platform](../../adrs/core/0024-configuration-feature-management-platform.md)
- [ADR-0002: Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
