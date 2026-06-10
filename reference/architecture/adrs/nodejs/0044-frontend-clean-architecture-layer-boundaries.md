# [ADR 0044](0044-frontend-clean-architecture-layer-boundaries.md): Frontend Clean Architecture Layer Boundaries (React)

## Status

Accepted

## Date

2026-06-07

## Scope

Technology Stack — Frontend Architecture (React / TypeScript)

> **Satellite origin:** Originally validated in UMS satellite (UMS ADR-0056). Promoted to Evolith corporate baseline.

---

## Context

Frontend applications built on this platform often mix concerns: business logic in components, HTTP calls in UI code, and state management scattered across files. Without enforced layer boundaries this creates:

- Untestable business logic (UI dependencies in every test)
- No reuse of hooks or services across screens
- Fragile codebases that break on infrastructure changes (REST → gRPC, Axios → Fetch)
- Indistinguishable concerns during code review

Evolith satellite frontends must apply the same architectural discipline already enforced on the backend (see [ADR-0002](./0002-clean-architecture-nestjs.md)).

---

## Decision

Apply **Clean Architecture (Hexagonal)** to React frontends with strict layer boundaries and an inward dependency rule.

### Canonical Layer Structure

```text
src/
├── domain/                     # Enterprise business rules (PURE)
│   ├── entities/               # Domain entities
│   ├── value-objects/          # Value objects
│   ├── schemas/                # Zod validation schemas
│   └── constants/              # Domain constants
│
├── application/                # Use cases and application logic
│   ├── hooks/                  # React hooks (use cases)
│   ├── stores/                 # Client-state stores (Zustand or equivalent)
│   ├── errors/                 # Error handling utilities
│   └── utils/                  # Application utilities (logger, i18n)
│
├── infrastructure/             # External concerns
│   ├── http/                   # HTTP clients, GraphQL clients
│   └── services/               # External service adapters
│
└── presentation/               # UI layer
    ├── shared/                 # Shared components, layouts, theme
    └── <bounded-context>/      # Context-specific screens and hooks
```

### Dependency Rule

Dependencies flow **inward only**. Infrastructure is injected via dependency inversion.

```text
presentation ──▶ application ──▶ domain
                      ▲
                      │
              infrastructure (injected)
```

### Architectural Rules

1. **Domain layer is PURE.** No React, no state library, no HTTP client, no external packages. Only schema-validation libraries (e.g., Zod) are permitted.
2. **Application layer knows nothing about UI.** Hooks define use cases; stores manage client state. No DOM manipulation, no component imports.
3. **Infrastructure implements ports.** HTTP clients, GraphQL clients, and external service adapters live exclusively in `infrastructure/`.
4. **Presentation composes.** Components compose hooks and stores. Business logic must not reside in components.
5. **No cross-layer imports.** Domain never imports from Application. Application never imports from Presentation.
6. **DOM side effects in presentation.** Operations such as `document.body.classList` belong in the presentation layer, not in stores or hooks.

### Barrel Exports

Each layer exposes a public API through `index.ts` barrel files. Cross-layer imports must reference only the barrel, never internal paths.

---

## Consequences

### Positive

- Business logic is testable without any UI or DOM dependency.
- Hooks and stores are reusable across multiple screens.
- Layer boundaries create clear code-review checkpoints.
- Infrastructure swaps (REST → gRPC, one HTTP client → another) require changes only in `infrastructure/`.

### Negative / Trade-offs

- More directories than a flat structure.
- Requires discipline and automated enforcement (ESLint `no-restricted-imports`) to maintain over time.
- Initial setup has a higher overhead than ad-hoc folder organization.

---

## Enforcement

- `ESLint` rule `no-restricted-imports` can enforce boundary violations at CI time.
- Barrel exports (`index.ts`) define the public API contract of each layer.
- `AGENTS.md` in the satellite repository documents the conventions for AI coding agents.

---

## References

- [ADR-0002: Clean Architecture with NestJS](./0002-clean-architecture-nestjs.md)
- [ADR-0045: Zustand + TanStack Query State Management](./0045-zustand-tanstack-query-state-management.md)






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
