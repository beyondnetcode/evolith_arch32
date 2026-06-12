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

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
