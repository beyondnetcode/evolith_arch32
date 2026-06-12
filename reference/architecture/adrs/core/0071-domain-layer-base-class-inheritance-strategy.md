# ADR 0071: Domain Layer Base Class and Inheritance Strategy

## Status

Accepted

## Date

2026-06-07

## Scope

Universal — .NET Domain Layer (all Evolith satellites using C# DDD)

> **Satellite origin:** Originally validated in UMS satellite (UMS ADR-0069). Promoted to Evolith corporate baseline as a governance and trade-off record.

---

## Context

Evolith-based .NET satellites implement Domain-Driven Design using base classes for `AggregateRoot<T>` and `Entity<T>` provided by a shared kernel library (`BeyondNetCode.Shell.Ddd`). This shared kernel brings a transitive dependency on MediatR through the shell library.

The BMAD methodology's rule R-10 states: "Domain must be pure POCOs with zero NuGet references." This creates an architectural tension:

- Strict compliance with R-10 requires removing all transitive dependencies from the Domain layer.
- Pragmatic shared-kernel usage allows teams to focus on business logic rather than infrastructure boilerplate, with MediatR contained within the shell library rather than referenced directly by Domain code.

Three implementation options exist:

| Option | Description |
|---|---|
| A — Continue Shell Inheritance | Domain inherits `AggregateRoot<T>` / `Entity<T>` from `Shell.Ddd`. Transitive MediatR dependency present but not invoked by Domain code. |
| B — Composition Refactor | Remove shell inheritance entirely. Domain uses pure POCOs with no base class. Requires O(n) refactoring across all aggregates. |
| C — Domain.Abstractions Layer | Create a `Domain.Abstractions` project with pure interfaces (`IAggregateRoot<T>`, `IEntity<T>`, `IDomainEvents`). Shell implements the interfaces. Domain references only the abstractions (zero NuGet dependency). |

---

## Decision

**Evolith satellites may adopt Option A (current shell inheritance) as a controlled and documented pragmatic compromise, subject to the constraints below.**

Option C (Domain.Abstractions) is the **recommended evolution path** and should be adopted when portability, standalone domain publication, or strict domain purity becomes a product requirement.

Option B (full composition refactor) is not recommended for existing codebases due to the cost and risk.

### Constraints for Option A Usage

1. **Domain code must not invoke MediatR directly.** The transitive dependency is acceptable only because the Domain does not use MediatR APIs. Domain aggregates use base class infrastructure (ID, domain event collection, broken rules) — they do not import or call any MediatR interface.
2. **Shell.Ddd must have an explicit stability guarantee.** The shared kernel must follow a versioning policy so that breaking changes do not ripple to Domain projects without warning.
3. **The transitive dependency must be documented per satellite.** Each satellite that uses Option A must document this trade-off in its own product-level ADR or architectural notes.
4. **Option C migration path must remain clear.** Shell.Ddd base classes should implement `IAggregateRoot<T>`, `IEntity<T>`, and `IDomainEvents` interfaces from the start to make Option C migration incremental rather than a full rewrite.

### Migration Path to Option C

1. Create `{Satellite}.Domain.Abstractions` project.
2. Define `IAggregateRoot<T>`, `IEntity<T>`, `IDomainEvents` interfaces with no external dependencies.
3. Update `AggregateRoot<T>` in `Shell.Ddd` to implement these interfaces.
4. Update Domain project references from `Shell.Ddd` to `Shell.Ddd.Abstractions`.
5. Domain now depends only on the Abstractions project — zero NuGet references.

---

## Rationale

MediatR is an infrastructure concern at the shell level, not in the Domain directly. The Domain does not invoke MediatR; it uses base classes that happen to include it. The risk of this coupling is contained within the shell library, which is controlled by the same organization. This is a recognized DDD "Shared Kernel" trade-off.

The decision to accept Option A is a pragmatic architecture choice made with full awareness of its limitations, not an oversight.

---

## Consequences

### Positive

- Development velocity is maintained. Teams focus on business logic rather than base class infrastructure.
- Consistent aggregate implementation across all bounded contexts in all satellite repositories.
- Shell libraries can evolve independently without requiring Domain changes for each iteration.

### Negative

- Strict interpretation of BMAD R-10 (zero NuGet references in Domain) is not fully satisfied.
- Domain layer cannot be published as a standalone NuGet package without additional work.
- Teams must understand the transitive dependency model and enforce the constraint that Domain code never invokes MediatR.

---

## Verification

To verify that the Domain layer has zero **direct** package references:

```bash
dotnet list <Domain.csproj> package
# Expected output: no direct package references
```

To verify MediatR is not invoked directly in Domain code:

```bash
grep -r "using MediatR" src/Domain/ --include="*.cs"
# Expected output: no output (zero direct MediatR imports)
```

---

## References

- [ADR-0041: Canonical .NET Backend Architecture](../dotnet/0041-canonical-dotnet-backend-architecture.md)
- [ADR-0019: Tactical Functional Design Patterns](./0019-tactical-design-patterns-future-proofing.md)



## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
