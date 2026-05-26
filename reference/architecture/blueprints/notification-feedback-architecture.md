# Notification & Feedback Architecture

**Type:** Architecture Blueprint  
**Status:** Accepted · Promoted from UMS 2026-05-26  
**Runtime:** Framework-agnostic (reference implementation: React + Zustand + TanStack Query)  
**Evolith Tier:** Frontend / Client Application Layer

---

## Purpose

Every user-initiated command must produce visible, actionable feedback. This blueprint defines
the **dual-visibility notification pattern**: a system that surfaces business errors and
confirmations through two independent visibility channels with different lifetimes.

This pattern is runtime-agnostic. It applies to any client application — web SPA, mobile shell,
or desktop client — that communicates with a backend via REST or GraphQL APIs.

---

## Problem Statement

Three failure modes recur across all client implementations:

| Failure mode | Symptom | Root cause |
|---|---|---|
| Silent business errors | User retries without knowing the action failed | Errors stored but never surfaced automatically |
| Generic error messages | User cannot act ("Something went wrong") | Backend error payload not extracted at a single point |
| Duplicated feedback wiring | Each screen re-implements success/error handling | No shared mutation wrapper |

All three must be solved together. Solving only one creates a partial system that degrades
under real usage.

---

## Architectural Principles

### P-1: Single Extraction Point
There is exactly one function responsible for transforming a raw error into a human-readable
string. No component, hook, or store reads `error.response` directly.

### P-2: Single Notification State
There is exactly one notification store. Success and error notifications flow through the
same channel and are consumed by both visibility layers.

### P-3: Dual Visibility, Independent Layers
Two presentation layers subscribe to the same store independently:
- **Ephemeral layer** (toast): immediate, auto-dismisses, low cognitive load
- **Persistent layer** (history panel): audit trail, accessible on demand, survives navigation

Neither layer knows about the other. Adding or removing one layer has no impact on the other.

### P-4: Command Wrapper
All mutations in the application use a single factory that enforces the notification contract.
No mutation is permitted to bypass the factory.

---

## Logical Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATION                       │
│                                                                 │
│  ┌──────────────┐    ┌─────────────────────────────────────┐   │
│  │  Component   │───►│         Mutation Wrapper            │   │
│  │  (UI layer)  │    │  mutationFn + invalidation + notif  │   │
│  └──────────────┘    └──────────────────┬──────────────────┘   │
│                                         │                       │
│                                    API call                     │
│                                         │                       │
│                          ┌──────────────▼──────────────────┐   │
│                          │      Error Extraction           │   │
│                          │  (single function, one place)   │   │
│                          └──────────────┬──────────────────┘   │
│                                         │                       │
│                          ┌──────────────▼──────────────────┐   │
│                          │     Notification Store          │   │
│                          │  (centralized, capped, typed)   │   │
│                          └────────┬─────────────┬──────────┘   │
│                                   │             │               │
│                    ┌──────────────▼──┐    ┌─────▼──────────┐   │
│                    │  Ephemeral      │    │  Persistent    │   │
│                    │  Toast Queue    │    │  History Panel │   │
│                    │  auto-dismiss   │    │  on-demand     │   │
│                    └─────────────────┘    └────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## Component Contracts

### Error Extraction Function

**Responsibility:** Normalize any thrown value (network error, API error, timeout) into a
displayable string.

**Priority chain (descending):**
1. GraphQL error array — first error message
2. REST Problem Details `detail` field (RFC 7807)
3. REST `message` field (legacy or custom)
4. Generic error message from the HTTP client
5. Caller-provided fallback string

**Contract:**
```
extractError(error: unknown, fallback: string): string
```

This function is pure. It does not call any store or produce side effects.

---

### Mutation Wrapper

**Responsibility:** Execute an async command, invalidate relevant cache keys on success,
and call `addNotification` with the correct type and message on both outcomes.

**Contract:**
```
mutationFactory({
  fn:              (vars) => Promise<T>
  invalidateKeys:  CacheKey[]
  successNotif:    (data: T)       => { title, message, type? }
  errorNotif:      (error: unknown) => { title, message, type? }
})
```

The wrapper calls `extractError(error, errorNotif(error).message)` internally.
The `errorNotif` callback only needs to provide the title and the fallback string.

**Rule:** Every mutation in the application must be created through this factory.
Direct use of the underlying mutation primitive (e.g., `useMutation`, `useSWRMutation`)
is not permitted in feature code.

---

### Notification Store

**Responsibility:** Hold the ordered list of notifications as application state.

**Required operations:**
- `add(notification)` — prepend, enforce size cap, assign unique ID and timestamp
- `markAsRead(id)` — flip read flag
- `markAllAsRead()` — flip all read flags
- `clear()` — remove all entries

**Notification shape:**
```
{
  id:        string    // unique, immutable
  title:     string
  message:   string
  type:      'info' | 'success' | 'warning' | 'error'
  timestamp: ISO-8601
  read:      boolean
}
```

**Size cap:** Maximum 50 entries recommended. Oldest entries are evicted when the cap
is exceeded.

---

### Ephemeral Toast Queue

**Responsibility:** Subscribe to the notification store, detect new entries, and render
auto-dismissing toasts.

**Behavioral contract:**
- Detect new entries by maintaining a set of seen IDs (do not re-trigger on `markAsRead`)
- Show each new notification as a floating toast in a fixed screen position
- Auto-dismiss after a type-specific delay (errors stay longer; successes are brief)
- Allow manual early dismiss that cancels the auto-dismiss timer
- Maximum visible toasts: 3–5 (implementation-specific); extras remain in history

**Suggested auto-dismiss durations:**

| Type | Duration | Rationale |
|---|---|---|
| `error` | 5–7 s | User must read and decide |
| `warning` | 4–6 s | May require action |
| `info` | 3–5 s | Informational |
| `success` | 3–4 s | Confirmation, no action required |

**Accessibility:** Toasts must use `role="alert"` and `aria-live="assertive"` for errors,
`aria-live="polite"` for other types.

---

### Persistent History Panel

**Responsibility:** Render the full notification history on demand.

**Behavioral contract:**
- Opened by an explicit user action (bell icon, menu item, keyboard shortcut)
- Shows unread count as a badge on the trigger element
- Ordered reverse-chronologically
- Provides mark-all-as-read and clear-all operations

---

## Backend Contract

The server must return RFC 7807 Problem Details for all `4xx` and `5xx` responses:

```json
{
  "type":     "https://httpstatuses.io/400",
  "title":    "Bad Request",
  "status":   400,
  "detail":   "<human-readable explanation>",
  "instance": "<request path>",
  "traceId":  "<correlation id>"
}
```

The `detail` field is what the user will read. It must be:
- Written in the language of the end user (or a key if the frontend handles i18n)
- Actionable ("Description is required" — not "Validation failed")
- Free of stack traces or internal identifiers

If the backend cannot return Problem Details, update only the Error Extraction function
to accommodate the actual shape. No other layer changes.

---

## Extension Scenarios

### Multiple error fields (FluentValidation / Bean Validation)
Add a step in the extraction function that reads the `errors` map and joins all messages:

```
if errors is object:
  messages = flatMap(values(errors))
  if messages.length > 0: return messages.join(" · ")
```

### Per-mutation overrides
Allow `errorNotif` to receive the error and return different titles depending on status code:

```
errorNotif: (error) => ({
  title:   getHttpStatus(error) === 409 ? 'Conflict' : 'Error',
  message: 'Could not complete the operation.',
})
```

### Optimistic updates
The mutation wrapper can be extended with an `onMutate` option that applies an optimistic
cache update and rolls it back in `onError` before calling `addNotification`.

---

## Anti-Patterns

| Anti-pattern | Correct alternative |
|---|---|
| Reading `error.response.data` inside a component | Use `extractError()` |
| `try/catch` in a component calling a mutation | Let the mutation wrapper handle `onError` |
| Calling `addNotification` directly in a component | Use the mutation wrapper |
| Showing a toast AND a banner for the same error | Pick one layer per context; don't duplicate |
| Notification store without a size cap | Cap at 50; unbounded stores cause memory growth |

---

## Reference Implementation

This pattern was designed and implemented in the **UMS** product repository:

- Error extraction: `src/apps/ums.web-app/src/application/errors/http-error.ts`
- Mutation factory: `src/apps/ums.web-app/src/application/hooks/use-notified-mutation.ts`
- Notification store: `src/apps/ums.web-app/src/application/stores/notification.store.ts`
- Toast queue: `src/apps/ums.web-app/src/presentation/shared/components/ToastQueue.tsx`
- History panel: `src/apps/ums.web-app/src/presentation/shared/components/NotificationCenter.tsx`

Technology used: React 18, TypeScript, TanStack Query v5, Zustand, Axios.  
The contracts above are intentionally framework-agnostic so the pattern ports to Angular,
Vue, Svelte, or native mobile without structural changes.

---

## Related Documents

- [Observability Architecture Flow](./observability-architecture-flow.md)
- [Authoritative Tech Stack — Node.js](./authoritative-tech-stack-nodejs.md)

---

**[Back to Blueprints Index](./README.md)** | **[Versión en Español](../blueprints-es/notification-feedback-architecture.md)**
