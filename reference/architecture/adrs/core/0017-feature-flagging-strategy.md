# [ADR 0017](0017-feature-flagging-strategy.md): Feature Flagging Strategy for Progressive Delivery

## Status
Approved

## Date
2026-05-09

## Context
Pushing new functional expansions to production carries elevated operational risk. To lower risk ceilings, code must ship deactivated into targeted runtime paths, unlocking specifically for Alpha clients, gradual user demographics, or entire clusters without invoking pipeline re-deployments or database migrations.

## Decision
Treat dynamic feature routing as standard **Infrastructure injection**, completely disjoint from persistence architectures:

1. **Service Decoupling**: Avoid physical db `toggles` table creation. Utilize authoritative external SaaS management planes (e.g., ConfigCat, Unleash, LaunchDarkly) natively via efficient local runtime SDK mirrors.
2. **Hexagonal Inversion**: Codebases communicate strictly with local abstract interfaces (`IFeatureTogglePort`). Concrete vendors implement hidden adapter modules evaluating expressions safely off-thread.
3. **Runtime Evaluators**: Route branching inside service commands utilizing injected toggle checks for zero-touch immediate canary switches and instant rollbacks.

## Consequences

### Positive
- Permits decoupled Trunk-Based engineering: merges do not equate releases.
- Grants instant operational controls (Kill Switch) to non-technical staff outside CI limits.

### Negative
- Accumulates "Technical Debt" if flags aren't scheduled for removal post-stabilization.
- Introduces dynamic logic branching that inflates cyclomatic testing complexity.

## References
- [ADR-0025: Feature Flag Abstraction](../../adrs/core/0025-feature-flag-provider-abstraction.md)
- [ADR-0024: Config Management](../../adrs/core/0024-configuration-feature-management-platform.md)





## Objective and Scope

Historical backfill: Address the architectural tension where pushing new functional expansions to production carries elevated operational risk, establishing a standard boundary.

## Options Considered

- **Selected:** Feature Flagging Strategy for Progressive Delivery
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0025: Feature Flag Abstraction](../../adrs/core/0025-feature-flag-provider-abstraction.md)
- [ADR-0024: Config Management](../../adrs/core/0024-configuration-feature-management-platform.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
