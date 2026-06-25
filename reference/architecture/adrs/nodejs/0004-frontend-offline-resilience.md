# [ADR 0004](0004-frontend-offline-resilience.md): Frontend Offline Resilience

## Status
Approved

## Date
2026-05-08

## Context
Web applications that depend entirely on server connectivity provide a poor user experience when network conditions are degraded (mobile connections, slow corporate VPNs). Users lose unsaved state and receive cryptic error messages instead of graceful degradation.

## Decision
Implement offline resilience in the frontend layer using **React Query** (TanStack Query) as the primary client-side state and cache management solution.

Key strategies:
- **Stale-While-Revalidate**: Serve cached data immediately while fetching updates in the background.
- **Optimistic Updates**: Apply mutations to the UI instantly before the server confirms, with automatic rollback on failure.
- **Background Sync**: Queue mutations made offline and replay them when connectivity is restored.
- **Retry Logic**: Automatic exponential backoff for failed requests (configurable per query).

## Consequences

### Positive
- Users see data immediately on navigation - no loading spinners for cached content.
- Forms and mutations feel instantaneous via optimistic updates.
- Graceful offline mode: the app remains usable for read operations even without connectivity.

### Negative
- Optimistic updates require careful rollback logic for complex, multi-step mutations.
- Developers must understand the cache invalidation model to prevent stale data issues.

## References
- [TanStack Query Documentation](https://tanstack.com/query)
- [ADR-0011: Fault Tolerance & Resiliency Patterns](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)







## Objective and Scope

Historical backfill: Address the architectural tension where web applications that depend entirely on server connectivity provide a poor user experience when network conditions are degraded (mobile connections, slow corporate VPNs), establishing a standard boundary.

## Options Considered

- **Selected:** Frontend Offline Resilience
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [TanStack Query Documentation](https://tanstack.com/query)
- [ADR-0011: Fault Tolerance & Resiliency Patterns](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)

## Technology Watch (Trends, Maturity, Adoption, Support)

Service Workers and PWA technologies are mature and widely supported across modern browsers. The offline-first pattern is in the growth-to-mainstream adoption phase driven by progressive web applications and improved browser API standardization (Cache API, IndexedDB). Google and W3C provide ongoing standardization support. Many large-scale applications (e.g., Google Docs, Slack, Twitter) demonstrate production viability. Expected vigencia: 5+ years as the established pattern for web offline resilience.

## Current Sources

- W3C Service Workers specification — https://www.w3.org/TR/service-workers, consulted 2026-06-20.
- MDN Web Docs: Service Worker API — https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API, consulted 2026-06-20.
- Chrome Developers: offline UX patterns — https://developer.chrome.com/docs/workbox, consulted 2026-06-20.

---
[Back to Index](./README.md)
