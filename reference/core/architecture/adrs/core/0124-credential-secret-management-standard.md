# ADR-0124: Credential and Secret Management Standard

> **Bilingual Navigation:** [Versión en Español](./0124-credential-secret-management-standard.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-23 |
| **Deciders** | Architecture Board |
| **Technical Story** | OWASP A02 — Cryptographic Failures / A07 — Identification Failures |

## Context

GitHub tokens were passed as tool arguments (appearing in audit logs and process listings). The `--token` CLI flag was visible in `ps` output. Audit logs were not redacting sensitive arguments consistently across all logging paths.

## Decision

### 1. Environment Variables Preferred
- Secrets (API keys, tokens, passwords) MUST be passed via environment variables, NOT as command-line arguments or tool parameters.
- CLI `--token` flags are DEPRECATED; emit a warning when used.

### 2. Log Redaction
- All logging paths MUST apply `redactArgs()` before writing tool arguments to audit logs.
- Sensitive keys: `apiKey`, `api_key`, `token`, `secret`, `password`, `authorization`, `approvalToken`.
- Approval tokens MUST be fingerprinted (SHA-256 prefix + last 4 chars) before logging.

### 3. Audit Trail Integrity
- Audit logs MUST NOT contain plaintext credentials.
- The `AuditLogger.logToolCall()` MUST receive redacted args.
- OpenTelemetry span attributes MUST NOT contain raw secrets.

### 4. Credential Storage
- In-memory credential stores (API key provisioning) are acceptable for development.
- Production MUST use durable storage (database, Vault, Kubernetes secrets).
- Emit a warning at startup if using in-memory storage in production.

### 5. Docker Secrets
- Docker containers MUST NOT bake secrets into images.
- Use environment variables, mounted secrets, or Dapr secret store.

## Consequences

- All tool argument logging must go through `redactArgs()`.
- CLI `--token` flags must be migrated to env vars within 90 days.
- The `SENSITIVE_ARG_KEYS` set in `mcp-tool-dispatch.ts` is the canonical redaction list.

## Related ADRs

- ADR-0016 (Immutable Audit Trail)
- ADR-0065 (PII-Safe Serilog Pipeline — .NET)
- ADR-0091 (Workload Identity Token Rotation)
