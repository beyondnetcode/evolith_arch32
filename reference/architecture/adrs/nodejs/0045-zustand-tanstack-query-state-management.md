# [ADR 0045](0045-zustand-tanstack-query-state-management.md): Frontend State Management — Zustand + TanStack Query Dual Strategy

## Status

Accepted

## Date

2026-06-07

## Scope

Technology Stack — Frontend State Management (React / TypeScript)

> **Satellite origin:** Originally validated in UMS satellite (UMS ADR-0057). Promoted to Evolith corporate baseline.

---

## Context

React applications on this platform need to manage two fundamentally different types of state:

1. **Server state** — data fetched from APIs (business entities, paginated lists). Requires caching, background re-fetching, deduplication, and cache invalidation on mutation.
2. **Client state** — UI preferences and session data (theme, active language, notification queue, authenticated session). Requires reactivity, optional persistence, and a predictable update model.

Using a single solution for both categories leads to over-engineering (server state in a Redux store) or under-engineering (client state maintained with raw `useState` and manual fetch logic). The two categories have different lifecycles and should be managed with purpose-built tools.

---

## Decision

Adopt a **dual-strategy** state management approach:

### Server State — TanStack Query (React Query)

TanStack Query is the canonical solution for all data that originates from an API endpoint.

```typescript
// Queries are cached, deduplicated, and background-refreshed
const { data, isLoading } = useQuery({
  queryKey: ['resource', page, filters],
  queryFn: () => service.getAll(page, filters),
  staleTime: 30_000,
});

// Mutations invalidate queries and surface notifications
const mutation = useNotifiedMutation({
  mutationFn: (payload) => service.create(payload),
  invalidateKeys: [['resource']],
  successNotif: () => ({ title: 'Created', message: 'Record created successfully' }),
  errorNotif: (err) => ({ title: 'Error', message: getHttpErrorMessage(err) }),
});
```

### Client State — Zustand

Zustand is the canonical solution for all state that does not originate from an API.

```typescript
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
    }),
    { name: 'theme-preference' },
  ),
);
```

### Canonical Client Store Categories

| Store | Purpose | Persistence |
|---|---|---|
| `auth.store` | Authenticated session, user identity | No (session-only) |
| `theme.store` | Dark/light mode preference | Yes (localStorage) |
| `notification.store` | In-app notification queue (cap ≤ 50) | No (session-only) |
| `i18n.store` | Active UI language code | No (syncs from session params) |
| `devTools.store` | Development-only overrides | No (dev-only) |

### Rules

1. **Server data goes through TanStack Query.** API responses must not be stored in Zustand.
2. **UI state goes through Zustand.** Theme, language, notifications, and modal open/close state are not cached in TanStack Query.
3. **No DOM manipulation in stores.** Stores hold pure state. Components handle DOM side effects in response to state changes.
4. **Single source of truth.** Each piece of state lives in exactly one location.
5. **Dev-only stores are isolated.** Dev override stores must not affect production code paths; gate with `import.meta.env.DEV`.

### `useNotifiedMutation` Pattern

All state-mutating operations should follow a unified pattern:

1. Execute the mutation function.
2. Invalidate relevant TanStack Query keys.
3. Dispatch a success notification to the notification store.
4. Dispatch an error notification on failure.

---

## Consequences

### Positive

- Automatic caching, background re-fetching, and deduplication for server data.
- Simple, boilerplate-free client state with Zustand.
- Clear separation of concerns between server and client state.
- `persist` middleware handles localStorage persistence without custom code.
- `useNotifiedMutation` eliminates mutation boilerplate and standardizes user feedback.

### Negative / Trade-offs

- Two libraries to learn and maintain.
- TanStack Query key management requires team discipline to prevent stale data or missed invalidations.
- Zustand stores are not serializable by default unless the `persist` middleware is used.

---

## References

- [ADR-0044: Frontend Clean Architecture Layer Boundaries](./0044-frontend-clean-architecture-layer-boundaries.md)
- [ADR-0047: Actionable User Error Contract](./0047-actionable-user-error-contract.md)

---
[Back to Index](./README.md)
