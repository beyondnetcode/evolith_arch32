# [ADR 0048](0048-feature-flag-system-scope-criteria-model.md): Feature Flag System Scope and Structured Criteria Model

## Status

Accepted

## Date

2026-06-07

## Scope

Technology Stack — Feature Flagging Domain Model (all Evolith satellites)

> **Satellite origin:** Originally validated in UMS satellite (UMS ADR-0068). Promoted to Evolith corporate baseline.
> **Companion to:** [ADR-0017: Feature Flagging Strategy](../core/0017-feature-flagging-strategy.md), [ADR-0025: Feature Flag Provider Abstraction](../core/0025-feature-flag-provider-abstraction.md)

---

## Context

The generic Evolith feature flagging strategy (ADR-0017) and provider abstraction (ADR-0025) define the interface contract but do not mandate the internal domain model for feature flags. Without explicit guidance, satellite repositories have implemented feature flags with two recurring problems:

1. **No system isolation.** A flag activated globally affects tenants or system boundaries that should not be included in a specific rollout. There is no mechanism to constrain a flag to a particular system scope.

2. **Opaque targeting.** Targeting rules expressed as free-form JSON strings are impossible to query, validate, or evolve without parsing opaque payloads. Adding or removing a single targeting condition requires replacing the entire blob.

---

## Decision

### 1. FeatureFlag as an Independent Aggregate Root

`FeatureFlag` must be an Aggregate Root in the Configuration bounded context. It must not be converted into a child entity of a `SystemSuite`, `Tenant`, or other business aggregate, because:

- Feature flags have an independent lifecycle (`Inactive → Active → Archived`) driven by release management, not by the lifecycle of the owning aggregate.
- Embedding flags in large aggregates bloats the aggregate, degrades load performance, and increases concurrency conflict risk.

### 2. Mandatory Ownership Scope

Every `FeatureFlag` must be created with a mandatory, immutable ownership scope identifier (e.g., `SystemSuiteId` or equivalent product-specific scope). This scope:

- Is validated against the authoritative domain aggregate at creation time.
- Is immutable after creation — changing the scope requires creating a new flag.
- Serves as a partition key for flag uniqueness: the same `FlagCode` may exist in different scopes without conflict.

### 3. Structured Criteria Model

Replace free-form targeting JSON with a structured, owned entity collection. Each criterion carries:

| Field | Purpose |
|---|---|
| `CriteriaType` | The dimension being evaluated (e.g., `TenantId`, `Environment`, `DateRange`, `PercentageHash`, `CustomRule`) |
| `Operator` | The comparison to apply (`Equals`, `NotEquals`, `In`, `Between`, `Matches`) |
| `Value` | The target value as a type-safe or JSON-compatible string |

The criteria collection is optional and dynamic:

- An empty collection means the flag is active for all callers within the scope.
- Individual criteria can be added or removed without modifying the aggregate root.
- Each change should emit a discrete domain event.

### 4. Evaluation Semantics

The `IFeatureFlagEvaluator` port evaluates criteria using:

- **Within the same `CriteriaType`:** criteria are combined with **OR** logic.
- **Across different `CriteriaType` groups:** groups are combined with **AND** logic.
- **Missing context:** if the evaluation context does not provide data required by a criterion, the evaluation returns `false` (safe posture). This prevents unintended broad activation when context is partially populated.

### 5. Bounded Context Placement

Feature flag management is a configuration responsibility, not a core business subdomain. Configuration and feature management aggregates belong in a dedicated `Configuration` or `SystemManagement` bounded context that references other context identifiers as foreign keys, not as embedded entities.

---

## Rationale

- **Independent lifecycle** justifies an independent aggregate, not a child entity.
- **Structured criteria** enable queryability, per-criterion domain events, and domain-level validation of targeting rules.
- **Safe posture on missing context** prevents inadvertent activation when callers have not yet migrated to provide the required context fields.

---

## Consequences

### Positive

- Every feature flag has an explicit, queryable ownership scope aligned with the system boundary it controls.
- Targeting conditions are individually addressable: added, removed, queried, and audited without modifying the aggregate root properties.
- Domain events for criteria changes provide a granular audit trail for compliance.
- The `IFeatureFlagEvaluator` port keeps evaluation logic extensible and testable in isolation.
- The same flag code can be reused across different scopes without naming conflicts.

### Negative / Trade-offs

- Flags now require a valid scope identifier at creation time — callers must resolve scope identity before issuing creation commands.
- The structured criteria model introduces additional tables and JOIN operations for full flag reads. A read-model projection is recommended for high-frequency evaluation paths.
- A cross-context foreign key between the configuration context and the authoritative scope context introduces a persistence-level coupling. This is intentional for referential integrity.

---

## References

- [ADR-0017: Feature Flagging Strategy](../core/0017-feature-flagging-strategy.md)
- [ADR-0025: Feature Flag Provider Abstraction](../core/0025-feature-flag-provider-abstraction.md)
- [ADR-0034: CQRS Applicability Matrix](../core/0034-cqrs-pattern-applicability-matrix.md)

---
[Back to Index](./README.md)
