# [ADR 0046](0046-no-raw-identifiers-in-ui.md): Prohibition of Raw Technical Identifiers in User Interfaces

## Status

Accepted

## Date

2026-06-07

## Scope

Universal — Frontend (all Evolith satellites)

> **Satellite origin:** Originally validated in UMS satellite (UMS ADR-0065). Promoted to Evolith corporate baseline as a universal UX and DDD rule.

---

## Context and Problem Statement

In distributed architectures, technical identifiers (UUIDs, GUIDs, surrogate keys, database row IDs) are used extensively for identity, foreign key references, and routing. Without an explicit rule, developers inadvertently expose these raw technical identifiers in UI views, data tables, and detail panels.

This practice:

- Degrades user experience — raw UUIDs such as `550e8400-e29b-41d4-a716-446655440000` have no semantic meaning to end users.
- Violates DDD Ubiquitous Language — business concepts (a user name, a document code, a role label) should be the visible representation, not database keys.
- Creates an impression of an unfinished technical prototype rather than a polished product.
- May facilitate enumeration or reconnaissance (defense-in-depth concern even when UUIDs are not sequential).

---

## Decision

**Raw technical identifiers (UUIDs, GUIDs, surrogate keys, internal database IDs) must never be rendered directly in a user-facing interface unless a specific, justified business requirement explicitly requires it.**

### Implementation Guidelines

1. **Semantic representation.** Any technical identifier must be mapped to a human-readable label — an alias, role name, username, email, document code, or business-friendly short code — before rendering.
2. **Internal usage only.** Technical identifiers are used internally for API requests, URL routing parameters, state management keys, and payload processing. They do not appear in visible table columns, labels, titles, or detail panels.
3. **Fallback mechanisms.** If a friendly label is unavailable at render time, the system must display a generic, localized fallback (e.g., "User", "Record", "Unknown") rather than the raw identifier.
4. **Code review enforcement.** Pull requests that render raw technical identifiers in the presentation layer without an explicit documented exception must be rejected during code review.
5. **Exceptions.** A business requirement that explicitly needs the identifier visible (e.g., a support or operations panel showing a technical tracking ID) must be documented and approved.

---

## Consequences

### Positive

- Significant improvement in system professionalism and user experience.
- Enforces alignment with Domain-Driven Design Ubiquitous Language — users see business concepts, not database internals.
- Reduces support noise from users confused by technical data.
- Defense-in-depth: obfuscating internal key formats reduces enumeration surface.

### Negative / Trade-offs

- Requires additional frontend or backend mappings to fetch semantic labels for related entities instead of passing only foreign keys.
- Developers must handle edge cases where semantic data is not yet available in the current view context (loading states, fallback labels).

---

## References

- [ADR-0044: Frontend Clean Architecture Layer Boundaries](./0044-frontend-clean-architecture-layer-boundaries.md)
- [ADR-0049: Naming Semantics and Clean Code Policy](../core/0049-naming-semantics-clean-code-policy.md)

---
[Back to Index](./README.md)
