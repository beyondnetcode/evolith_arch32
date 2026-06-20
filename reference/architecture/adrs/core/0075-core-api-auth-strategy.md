# ADR-0075: Core API Authentication Strategy

- **Status:** Superseded by ADR-0080
- **Deciders:** Evolith Architecture Board
- **Date:** 2026-06-14

## Context

> **Supersession note (2026-06-19):** Evolith Core is an open-source architecture corpus and engine, not an authenticated product boundary. Evolith Tracker's BFF is the only authenticated perimeter; it validates the UMS Bearer token and authorization graph. The API-key and future JWT model below is historical and must not be extended in Core.

The Core API exposes critical operations (gate evaluation, project initialization, architecture drift detection) without any authentication mechanism. This violates OWASP API Security Top 10 requirements: API1 (Broken Object Level Authorization), API2 (Broken Authentication), and API5 (Broken Function Level Authorization).

## Decision

Implement a two-tier authentication model:

### Tier 1: API Key (M2M) — Implemented Now
- Machine-to-machine communication between the Tracker and Core API
- API keys validated via `x-api-key` header
- Keys stored as environment variables, hashed with SHA-256 and compared using constant-time comparison (`timingSafeEqual`)
- `ApiKeyAuthGuard` registered as global `APP_GUARD`
- `@Public()` decorator exempts health/metrics endpoints
- **OWASP mitigations:** API1 (Broken Object Level Authorization), API5 (Broken Function Level Authorization)

### Tier 2: JWT Bearer (Human-facing) — Future
- JWT Bearer tokens for human-facing access (CLI, Dashboard)
- Access tokens with short TTL, refresh tokens with longer TTL
- Role-based claims (`admin`, `operator`, `reader`)
- OAuth2/OIDC integration for SSO
- **OWASP mitigation:** API2 (Broken Authentication)

## Consequences

- All non-public endpoints return 401 without valid `x-api-key`
- API keys must be rotated via environment variable changes + service restart
- Health check endpoint remains publicly accessible
- Future JWT migration path: add `JwtStrategy` alongside `ApiKeyStrategy`, configure `AuthGuard(['api-key', 'jwt'])`

## References

- [OWASP API1:2023](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP API2:2023](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/)
- [OWASP API5:2023](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)
- [apps/core-api/src/infrastructure/auth/](../../../../apps/core-api/src/infrastructure/auth/)
