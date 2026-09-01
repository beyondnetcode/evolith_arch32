# ADR-0119: API Security Configuration Hardening

> **Bilingual Navigation:** [Versión en Español](./0119-api-security-configuration-hardening.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-23 |
| **Deciders** | Architecture Board |
| **Technical Story** | OWASP API8 / A05 — Security Misconfiguration |

<!-- implementation-status: src/apps/core-api/src/main.ts, src/apps/core-api/src/app.module.ts, src/apps/core-api/src/infrastructure/config/env.validation.ts, src/apps/agent-runtime-api/src/main.ts -->
> **Implementation status in this repository: partial** (2026-09-01). Rate limiting (§1), the
> Swagger opt-in (§3) and the production CORS deny-by-default (§6) are in place. The fail-closed
> `NODE_ENV` default (§4) and the mandated header values (§5) are not. Each shortfall is itemised
> under [Outstanding Gaps](#outstanding-gaps) with its file and line.

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
- The security-headers spec test does **not** validate compliance with this baseline. It asserts
  only that `X-Frame-Options`, `X-Content-Type-Options` and `X-DNS-Prefetch-Control` are *defined*
  (`toBeDefined()`, `src/apps/core-api/src/presentation/controllers/security-headers.spec.ts:46-61`)
  — it checks no value required by §5, and never looks at `Content-Security-Policy`,
  `Strict-Transport-Security`, `Referrer-Policy` or `X-XSS-Protection`. Worse, the test builds its
  own application with `origin: ['*'], credentials: true` (lines 34-37), contradicting the
  `credentials: false` of §6, so it does not even exercise the deployed CORS configuration. §5 and
  §6 are therefore untested; a conforming test is still to be written.
- `CORE_API_AUTH_REQUIRED=false` must be explicitly set in test environments.

## Outstanding Gaps

The clauses above are the decision and stand as written. What follows is where this repository does
**not** comply with them today. Each entry is a defect in the code, not grounds for relaxing the
clause.

1. **§4 — `NODE_ENV` still defaults to `development` in all three services.** Fail-closed requires
   `'production'` when the variable is unset:
   - `src/apps/core-api/src/infrastructure/config/env.validation.ts:5` —
     `z.enum(['development', 'production', 'test']).default('development')`.
   - `src/apps/agent-runtime-api/src/main.ts:41` — `process.env.NODE_ENV ?? "development"`, whose
     value then selects `origin: "*"` for CORS a few lines below.
   - `src/packages/mcp-server/src/mcp/mcp-tool-dispatch.ts:223` — `process.env.NODE_ENV ||
     'development'` in the user context handed to tool authorization.

2. **§4 — the agent-runtime authentication guard fails OPEN outside production. This is the most
   severe gap.** At `src/apps/agent-runtime-api/src/auth/api-key.guard.ts:60-71`, when neither
   `AGENT_RUNTIME_API_KEY` nor `AGENT_RUNTIME_JWT_SECRET` is configured, the branch
   `if (!isProd || allowNoAuth)` attaches a principal with `authMethod: 'none'` and
   `tenantId: WILDCARD_TENANT` and returns `true` — access granted, with a wildcard tenant and no
   credential presented. The comment above it reads "Fail-closed"; the code does the opposite, in
   the authentication guard itself, which is exactly what §4 prohibits. Gap 1 compounds it: an
   unset `NODE_ENV` is enough to make `isProd` false.

3. **§5 — bare `helmet()` does not emit the mandated header values.** `helmet()` is called with no
   options at `src/apps/core-api/src/main.ts:53` and `src/apps/agent-runtime-api/src/main.ts:12`.
   The defaults of helmet 8.2.0 produce `Content-Security-Policy: default-src 'self'` and
   `X-Frame-Options: SAMEORIGIN`, where §5 mandates `default-src 'none'` and `DENY`. Neither call
   site overrides them.

## Related ADRs

- ADR-0005 (SAST Quality Gates)
- ADR-0075 (Core API Auth Strategy)

## Related Gaps

- [`GT-59`](../../../control-center/gaps/gap-reference-catalog.md#gt-59) — HTTP hardening: Helmet +
  CORS + Rate Limiting (OWASP API4/8). Earlier revisions of this ADR cited this as "ADR-0059": no
  such decision exists in the core corpus, whose numbering runs from 0058 straight to 0067. The
  identifier is a gap id, and the gap is tracked in the gap board, not in the ADR corpus.

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
