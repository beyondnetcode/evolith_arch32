# ADR-0120: SSRF Prevention Standard

> **Bilingual Navigation:** [Versión en Español](./0120-ssrf-prevention-standard.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-23 |
| **Deciders** | Architecture Board |
| **Technical Story** | OWASP API7 / A10 — Server-Side Request Forgery |

## Context

The Dapr secret fetch in core-api used `localhost:${DAPR_HTTP_PORT}` without validating the port or hostname. An attacker controlling the env var could redirect the fetch. The webhook adapter had an SSRF guard (GT-351), but no corporate-wide standard existed.

## Decision

Establish SSRF prevention rules for all outbound HTTP requests:

### 1. URL Validation
- All outbound HTTP requests MUST validate the target URL against an allowlist of trusted hosts/IPs.
- Reject requests to private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16) unless explicitly configured.

### 2. DNS Rebinding Protection
- Resolve DNS once and pin the IP before connecting. Do not re-resolve after connection.
- For localhost services, hardcode `127.0.0.1` instead of `localhost` to prevent DNS rebinding.

### 3. Environment Variable Validation
- Environment variables that control URLs or ports MUST be validated:
  - Port variables must be numeric, finite, and in range 1-65535.
  - URL variables must match expected patterns (e.g., `^https?://`).
- Invalid values MUST be logged as warnings and fall back to safe defaults.

### 4. Timeout and Size Limits
- All outbound requests MUST have a timeout (30s default).
- Response body size MUST be limited to prevent memory exhaustion.

## Consequences

- New services must implement URL validation before making outbound requests.
- Existing Dapr secret fetch endpoints must validate `DAPR_HTTP_PORT`.
- The `@nestjs/throttler` rate limiting provides partial DoS protection.

## Related ADRs

- ADR-0081 (Sandbox Isolation — network deny-by-default)
- GT-351 (SSRF guard on WebhookAdapter)
