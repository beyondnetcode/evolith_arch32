# ADR-0123: Timing-Safe Comparison Standard

> **Navegación Bilingüe:** [English Version](./0123-timing-safe-comparison-standard.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-23 |
| **Deciders** | Architecture Board |
| **Technical Story** | OWASP A02 / CWE-208 — Observable Timing Discrepancy |

## Context

The security audit found that JWT signature comparison in `mcp-server-auth.ts` used `!==` (not constant-time), and `MetricsAuthGuard` in core-api used `!==` for token comparison. Both enabled timing side-channel attacks. The `safeEqual` in agent-runtime-api leaked credential length via early rejection on length mismatch.

## Decision

### 1. Canonical Pattern
All credential/token comparisons MUST use the following pattern:

```typescript
import { createHash, timingSafeEqual } from 'node:crypto';

function safeKeyEqual(presented: string, configured: string): boolean {
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(configured).digest();
  return timingSafeEqual(a, b);
}
```

### 2. Why Hash First
- `timingSafeEqual` requires equal-length buffers.
- Hashing to SHA-256 produces fixed 32-byte buffers regardless of input length.
- This prevents length oracle attacks (early rejection on length mismatch).

### 3. Prohibited Patterns
- `!==` or `===` for credential comparison — ALWAYS a timing leak.
- `Buffer.compare()` — not constant-time.
- Manual XOR loops with early return on length mismatch — leaks length.

### 4. Where to Apply
- API key validation (all services)
- JWT signature verification
- Token comparison in auth guards
- Any secret/credential comparison

### 5. Reusable Utility
- MCP server: `safeKeyEqual()` in `mcp-server-auth.ts:13-18`
- Core API: `ApiKeyGuard.safeKeyEqual()` in `api-key.guard.ts`
- Agent Runtime: `ApiKeyGuard.safeEqual()` in `api-key.guard.ts`

## Consequences

- All new auth code must use the SHA-256 + `timingSafeEqual` pattern.
- Existing `!==` comparisons in auth code must be migrated.
- The pattern is enforced by the security audit checklist.

## Related ADRs

- ADR-0075 (Core API Auth Strategy)
- ADR-0026 (Adaptive MFA)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
