# ADR-0121: Input Validation and Sanitization Standard

> **Bilingual Navigation:** [Versión en Español](./0121-input-validation-sanitization-standard.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-23 |
| **Deciders** | Architecture Board |
| **Technical Story** | OWASP API3 / A03 — Broken Object Property Level Authorization / Injection |

## Context

MCP tools accept filesystem paths, user-controlled parameters, and dynamic input. Path traversal protections existed in `resources.service.ts` but were not consistently applied to all tools. The scaffold tool accepted framework/ORM parameters without allowlist validation.

## Decision

### 1. Path Input Sanitization
- All tools that accept filesystem path arguments MUST use `sanitizePathInput()` from `src/packages/mcp-server/src/utils/path-security.ts`.
- The function rejects: `..` sequences, absolute paths outside base, characters outside `[a-zA-Z0-9_\-\/\.]`.

### 2. Parameter Allowlists
- User-controlled parameters that map to shell commands or system resources MUST be validated against an allowlist.
- Example: `frontend` → `['react', 'angular', 'vue']`, `orm` → `['prisma', 'typeorm', 'drizzle']`.
- Unknown values MUST be rejected with a clear error message listing allowed values.

### 3. Request Body Validation
- All NestJS services MUST use `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- Exceptions for dynamic-body endpoints (e.g., agent-runtime-api) must be documented and use input-specific validation.

### 4. Header Sanitization
- Headers reflected in responses MUST be validated against `^[a-zA-Z0-9_\-\.]+$` before echoing.
- Maximum header value length: 256 characters.

### 5. Correlation IDs
- MUST be generated server-side (UUID v4). Client-provided correlation IDs are accepted but validated.

## Consequences

- All new MCP tools must import and use `sanitizePathInput()`.
- Existing tools without path sanitization must be audited.
- The `path-security.ts` utility is the single source of truth for path validation.

## Related ADRs

- ADR-0073 (Unified CLI Output Contract — no arbitrary command execution)
- ADR-0082 (Trust Boundary — untrusted content = data, not instructions)
