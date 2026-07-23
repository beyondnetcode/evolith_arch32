# ADR-0119: API Security Configuration Hardening

> **Bilingual Navigation:** [Versión en Español](./0119-api-security-configuration-hardening.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-23 |
| **Deciders** | Architecture Board |
| **Technical Story** | OWASP API8 / A05 — Security Misconfiguration |

## Context

The security hardening audit (Phases 1-4) identified that several security controls existed but were inconsistently applied across services. The core-api had rate limiting and Helmet, but the agent-runtime-api lacked both. Swagger was auto-enabled in non-production. NODE_ENV defaulted to development when unset.

## Decision

Establish a **unified security configuration baseline** for all HTTP services (core-api, agent-runtime-api, mcp-server):

### 1. Rate Limiting
- All HTTP services MUST implement rate limiting (100 req/min per IP minimum).
- Use `@nestjs/throttler` for NestJS services; manual implementation for raw Node.js.

### 2. Request Body Size Limits
- All HTTP services MUST enforce a maximum request body size (1MB default).
- Reject requests exceeding the limit with 413 Payload Too Large.

### 3. Swagger / OpenAPI
- Swagger UI MUST require explicit opt-in (`SWAGGER_ENABLED=true`) in ALL environments.
- Auto-enabling in non-production is prohibited (misconfigured NODE_ENV exposes API surface).

### 4. NODE_ENV Default
- When `NODE_ENV` is unset, services MUST default to `'production'` (fail-closed).
- Never default to `'development'` in authentication or authorization logic.

### 5. Security Headers
- All HTTP services MUST set: `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy: no-referrer`.
- `X-XSS-Protection: 0` (modern best practice — disables buggy XSS auditor).

### 6. CORS
- Development: `origin: '*'` with `credentials: false`.
- Production: deny cross-origin by default; require explicit `CORS_ORIGINS`.

## Consequences

- All new services must implement rate limiting and body size limits from day one.
- Existing services must be audited against this baseline quarterly.
- The security-headers spec test validates compliance.
- `CORE_API_AUTH_REQUIRED=false` must be explicitly set in test environments.

## Related ADRs

- ADR-0005 (SAST Quality Gates)
- ADR-0059 (Helmet + CORS + Rate Limiting) — GT-59
- ADR-0075 (Core API Auth Strategy)
