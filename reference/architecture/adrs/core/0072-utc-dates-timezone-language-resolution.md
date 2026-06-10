# ADR 0072: UTC Date Storage, Browser Timezone Detection, and Language Resolution

## Status

Accepted

## Date

2026-06-07

## Scope

Universal — All Evolith satellite systems (current and future)

> **Satellite origin:** Originally validated in UMS satellite (UMS ADR-0076). Promoted to Evolith corporate root standard.

---

## Context

Distributed systems that span multiple countries and time zones must handle dates, times, and locale preferences consistently across all layers. Without an explicit standard, teams make incompatible choices: some store local times, some use browser-default formatting, some hardcode language identifiers. When data crosses system boundaries or is shown to users in different time zones, these inconsistencies cause display errors, audit discrepancies, and compliance failures.

Three independent concerns must be addressed together because they interact at session initialization:

1. **Date and time storage** — should the database store UTC or local time?
2. **Timezone detection** — how does the system know where the user is, and which timezone to apply when displaying timestamps?
3. **Language resolution** — which language should the UI use, and what is the priority chain when multiple sources provide a preference?

All Evolith satellite systems must follow the same standard so that cross-system audit trails, delegations, and events are interpretable without time-zone ambiguity.

---

## Decisions

### D1 — All dates are stored and transmitted as UTC

**Rule:** Every date or timestamp stored in any database table, domain event, outbox message, or API response body **must** be UTC.

**Implementation guidelines per runtime:**

| Runtime | Rule |
|---|---|
| .NET (C#) | Use `DateTime.UtcNow` or `DateTimeOffset.UtcNow`. Never use `DateTime.Now`. |
| .NET — Column naming | Suffix UTC columns: `CreatedAtUtc`, `DeletedAtUtc` (domain level); `CreatedAtUtc` (persistence level). |
| .NET — EF Core | Register a `ValueConverter<DateTime, DateTime>` that forces `DateTimeKind.Utc` on read to prevent silent local-time storage (especially on SQLite). |
| Node.js / TypeScript | Use `new Date()` (UTC) or `Date.now()`. Never serialize local `Date` objects without explicit UTC conversion. |
| API responses | ISO 8601 strings must include the `Z` suffix (e.g., `"2026-06-02T15:30:00Z"`) to make UTC explicit to all consumers. |
| Frontend | Parse ISO strings with `new Date(isoString)` — JavaScript always interprets `Z`-suffixed strings as UTC. Never manually apply offsets to UTC values before storing. |

**Rationale:** UTC is the only unambiguous anchor for distributed systems. Local times introduce DST gaps, wall-clock ambiguity, and cross-datacenter inconsistency.

---

### D2 — Browser timezone is detected at session start and stored in the session

**Rule:** On login, the frontend detects the browser's IANA timezone and stores it in the authenticated session state. It is sent to the backend as the `X-Timezone` request header on every API call.

**Detection:** `Intl.DateTimeFormat().resolvedOptions().timeZone` returns an IANA identifier (e.g., `"America/Lima"`, `"Europe/Madrid"`). Supported in all modern browsers.

**Fallback chain:**

| Priority | Source | Mechanism |
|---|---|---|
| 1 (highest) | Browser-detected IANA timezone | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| 2 | Tenant or system parameter `UI_TIMEZONE_DEFAULT` | Configured by admin, e.g., `"America/Lima"` |
| 3 (lowest) | System hardcoded default | `"UTC"` — last resort only |

**Backend handling:** The `X-Timezone` header is validated against the IANA timezone database and stored in the request context. Used for any server-side date formatting (report generation, email timestamps).

**Display:** All date/time values shown to users are converted from UTC storage to the session timezone using `Intl.DateTimeFormat` with an explicit `timeZone` option.

---

### D3 — Language resolution follows a strict priority chain

**Rule:** The UI language is resolved at session initialization in this order:

| Priority | Source | Mechanism |
|---|---|---|
| 1 (highest) | Browser `Accept-Language` HTTP header | Read by backend `CultureMiddleware`, validated against supported locales |
| 2 | Tenant/system parameter `UI_LANGUAGE_DEFAULT` | Read from configuration at login |
| 3 (lowest) | Platform hardcoded default | Defined per satellite (recommend `"es"` for Latin America deployments) |

**Backend `CultureMiddleware`:** reads `Accept-Language`, extracts the primary language code (first 2 characters, lowercased: `"es-PE"` → `"es"`), validates it against the supported locale list, and sets the culture for the request.

**Login response:** the resolved language must be included in the login response payload (e.g., `LoginSuccessResponse.Language`) so the frontend can initialize its i18n store without a second round-trip.

**Date formatting:** all `formatDate`, `formatDateTime`, and `formatRelativeTime` calls **must** receive the active locale from the i18n store. Functions must not use a hardcoded default locale.

---

## Consequences

### Positive

- UTC storage eliminates all DST, clock-change, and cross-datacenter temporal ambiguity.
- Sessions always display dates in the user's actual timezone without manual configuration.
- Language initialization is automatic; users see the system in their preferred language on first login.
- Cross-system audit trails share the same temporal reference frame, making correlated event analysis unambiguous.

### Negative / Trade-offs

- EF Core UTC converters add slight complexity to DbContext configuration.
- Browser timezone detection requires the `Intl` API (available in all modern browsers — not a real constraint).
- The `X-Timezone` header adds a small overhead per request (single string, negligible).
- Timezone display conversion (UTC → local) must be applied consistently. Missing it in any component is a silent bug — code review gates should check for raw UTC date display.

---

## Implementation Checklist (per satellite)

- [ ] All `DateTime` properties in domain entities use `DateTime.UtcNow` (or equivalent).
- [ ] ORM registers UTC value converters for `DateTime` properties.
- [ ] API responses use ISO 8601 with `Z` suffix.
- [ ] `CultureMiddleware` reads `Accept-Language` and validates against supported locales.
- [ ] Login response includes resolved language and default timezone.
- [ ] Frontend detects `Intl.DateTimeFormat().resolvedOptions().timeZone` at login.
- [ ] Frontend stores timezone in session and sends `X-Timezone` header on every request.
- [ ] Frontend i18n store is initialized from session parameters at login.
- [ ] All `formatDate`/`formatDateTime` calls pass the active locale and session timezone.

---

## References

- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [RFC 3339 — Date and Time on the Internet](https://tools.ietf.org/html/rfc3339)
- [ISO 8601 — Date and time format](https://www.iso.org/iso-8601-date-and-time-format.html)
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [ADR-0016: Immutable Business Audit Trail](./0016-immutable-business-audit-trail.md)
- [ADR-0044: Frontend Clean Architecture Layer Boundaries](../nodejs/0044-frontend-clean-architecture-layer-boundaries.md)




## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
