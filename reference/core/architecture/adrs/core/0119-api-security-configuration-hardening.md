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
- The security-headers spec now validates compliance **by value**, not by presence. It used to
  assert only that three headers were *defined* — which passes with `default-src 'self'` and
  `SAMEORIGIN`, the very values §5 forbids — and it built its own application with
  `origin: ['*'], credentials: true`, contradicting the `credentials: false` of §6, so it never
  exercised the deployed configuration at all. The harness now mounts what `main.ts` mounts, and
  each header of §5 is asserted against its mandated value.
- `CORE_API_AUTH_REQUIRED=false` must be explicitly set in test environments.

## Outstanding Gaps

The clauses above are the decision and stand as written. What follows is where this repository does
**not** comply with them today. Each entry is a defect in the code, not grounds for relaxing the
clause.

1. **§4 — `NODE_ENV` defaulted to `development` in all three services. CLOSED.** Fail-closed
   requires `'production'` when the variable is unset, and unset is the state a fresh container, a
   forgotten env file and a bare `node dist/main` all arrive in. Each site now reads unset or blank
   as production:
   - `src/apps/core-api/src/infrastructure/config/env.validation.ts` — the schema default is
     `'production'`. It fed `main.ts`, where `development` selected `origin: '*'` for CORS.
   - `src/apps/agent-runtime-api/src/main.ts` — the `?? "development"` fallback is gone; unset or
     blank resolves to production, which denies cross-origin unless `CORS_ORIGINS` is explicit (§6).
   - `src/packages/mcp-server/src/mcp/mcp-tool-dispatch.ts` — the anonymous context's `environment`
     resolves to production. This one was not cosmetic: the ABAC evaluator grants **write** tools to
     development roles when `environment !== 'production'`, so leaving the variable unset was enough
     to open writes.

2. **§4 — the agent-runtime authentication guard used to fail OPEN outside production. CLOSED.**
   At `src/apps/agent-runtime-api/src/auth/api-key.guard.ts`, when neither `AGENT_RUNTIME_API_KEY`
   nor `AGENT_RUNTIME_JWT_SECRET` was configured, `if (!isProd || allowNoAuth)` attached a principal
   with `authMethod: 'none'` and `tenantId: WILDCARD_TENANT` and returned `true` — access granted,
   wildcard tenant, no credential presented — while the comment above it read "Fail-closed". The
   posture now reads an **unset or blank `NODE_ENV` as production**, so the state a fresh container,
   a forgotten env file or a bare `node dist/main` arrives in denies rather than opens. Running
   without auth takes a deliberate act: `NODE_ENV=development`, which someone typed, or the explicit
   `AGENT_RUNTIME_ALLOW_NO_AUTH=true`. Pinned by three tests in `api-key.guard.spec.ts` — unset,
   blank, and the override that must keep working — each verified to fail against the old code.

   Gap 1 no longer compounds this one: the guard derives its own posture instead of trusting the
   service default. Gap 1 itself stands.

3. **§5 — bare `helmet()` did not emit the mandated header values. CLOSED.** helmet 8.2.0 defaults
   to `Content-Security-Policy: default-src 'self'` and `X-Frame-Options: SAMEORIGIN`, where §5
   mandates `'none'` and `DENY` — a call with no options looks like hardening and delivers something
   else. Both services now configure it explicitly (`default-src 'none'`, `frameguard: deny`,
   `Referrer-Policy: no-referrer`), and the Swagger UI keeps a relaxed CSP scoped to its own docs
   path, only when somebody enabled it with `SWAGGER_ENABLED=true`, rather than relaxing the whole
   API's policy. The spec now asserts these values instead of their mere presence.

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
