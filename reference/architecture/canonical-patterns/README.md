# Canonical Patterns

> **Bilingual Navigation:** [Versión en Español](../canonical-patterns-es/README.md)

Canonical Patterns are runtime-specific, copy-paste-ready reference implementations that demonstrate how the arc32 architecture decisions materialize as production code. Each pattern maps to one or more ADRs and can be adopted directly by satellite repositories.

---

## .NET (C#) Ecosystem

| CP | Title | Type | ADR |
|----|-------|------|-----|
| [CP-01](./dotnet/cp-01-request-scope-context-propagation.md) | Request-Scope Observability Context Propagation | Cross-Cutting | ADR-0064 |
| [CP-02](./dotnet/cp-02-pii-safe-serilog-logging.md) | PII-Safe Structured Logging with Serilog | Security / Observability | ADR-0065 |
| [CP-03](./dotnet/cp-03-lightweight-http-idempotency.md) | Lightweight HTTP Idempotency Middleware | Reliability | ADR-0066 |
| [CP-04](./dotnet/cp-04-aop-logging-decorator.md) | AOP Logging Decorator with Observability Envelope | Cross-Cutting | ADR-0064 / ADR-0065 |

---

**[Back to Architecture](../README.md)** | **[ADR Registry](../adrs/README.md)**
