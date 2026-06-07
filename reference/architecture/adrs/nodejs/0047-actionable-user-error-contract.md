# [ADR 0047](0047-actionable-user-error-contract.md): Actionable User Error Contract and Correlated Diagnostics

## Status

Accepted

## Date

2026-06-07

## Scope

Universal — Backend API + Frontend (all Evolith satellites)

> **Satellite origin:** Originally validated in UMS satellite (UMS ADR-0066). Promoted to Evolith corporate baseline.

---

## Context

Enterprise APIs surface two conflicting failure mode risks:

1. **Over-exposure** — technical messages, exception details, class names, namespaces, SQL statements, and stack traces reach the browser or API consumer.
2. **Over-suppression** — once all backend messages are suppressed, expected validation failures become too generic for users to correct their input.

For example, a user submitting a field value that exceeds a length limit must be told what to fix and how. That user must not see a namespace, class name, database detail, or stack trace. Support engineers still need a reference that allows them to locate the complete technical event in the observability stack.

This ADR applies to all user-initiated commands across Evolith satellite repositories, not only a specific module or endpoint.

---

## Decision

Adopt a **two-channel error contract**:

1. **User feedback channel** — exposes only approved, actionable business or validation information.
2. **Diagnostic channel** — retains technical details in structured logs and telemetry correlated through a server-generated error identifier.

### 1. Error Classification

| Error class | Example | User-visible content | Technical logging |
|---|---|---|---|
| Validation failure | Maximum length exceeded | Actionable correction guidance and tracking code | Optional structured event |
| Business conflict | Duplicate unique code | Business-safe reason and tracking code | Structured event when operationally useful |
| Authorization / authentication | Access rejected | Safe generic access statement and tracking code | Security-aware structured event |
| Infrastructure / unexpected | Database failure, unhandled exception | Generic retry guidance and tracking code | Full sanitized exception with correlation |

### 2. Public Error Payload

REST command failures use **RFC 7807 Problem Details**. The public payload structure:

```json
{
  "type": "https://httpstatuses.io/422",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request could not be completed because it contains invalid fields.",
  "userMessage": "The field 'Code' has an invalid format. Use only letters, numbers, and underscores.",
  "errorCode": "validation.invalid_format",
  "messageKey": "module.code_invalid_format",
  "messageParameters": { "invalidValue": "DDDD-!" },
  "errorId": "0cd26dd6-d50e-4b3c-a662-8098a87569a4",
  "traceId": "<distributed-trace-id>"
}
```

**Rules:**

- `errorId` is a server-generated GUID, unique per failed request. It is required in the response body, `X-Error-Id` response header, and the corresponding structured log event.
- `traceId` and `X-Correlation-Id` are distributed-tracing identifiers and must not replace `errorId`.
- `userMessage`, when present, is explicitly safe for direct presentation to end users.
- `errorCode`, `messageKey`, and `messageParameters` are the evolution path for fully client-localized error messages.
- `detail` must never contain stack traces, exception type names, namespaces, source paths, SQL statements, tokens, secrets, or PII.
- Clients must not display arbitrary `detail`, raw GraphQL error messages, or native exception text. They display only approved fields or a local fallback.

### 3. GraphQL Boundary

GraphQL endpoints expose safe, localized generic messages and carry `errorId`. Resolver exceptions are logged through structured logging with the same `errorId`, but are never serialized to the response body.

### 4. Observability and Logging

- Every failed REST or GraphQL response receives a new server-generated `errorId` GUID.
- Structured logging records `ErrorId` for expected failures and the full sanitized exception with `ErrorId` for unexpected failures.
- `CorrelationId` and `TraceId` continue to link distributed operations independently from the support-facing `ErrorId`.
- PII-safe logging rules (see [ADR-0065 .NET](../dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)) apply before any log sink.

### 5. Notification Lifecycle

User feedback is delivered through the centralized notification mechanism:

- Validation and business feedback is actionable and may include the tracking code.
- Automatic toast expiry removes the ephemeral presentation; notification history may remain available.
- Manual dismissal is an explicit user action and removes the notification entry from active state.

---

## Rejected Alternatives

**Display all backend `detail` values.** Convenient but allows implementation details or PII to escape when an endpoint is misconfigured. Rejected.

**Display only generic messages.** Prevents users from correcting expected business or validation conditions, increasing retries and support requests. Rejected.

**Show technical details only in development or QA.** QA and shared environments are still user-facing surfaces and may contain production-like data. Rejected.

---

## Consequences

### Positive

- Users receive enough information to correct safe, expected failures without a support call.
- Technical diagnostics remain available to support engineers without being exposed in the interface.
- REST, GraphQL, logging, and frontend notification behavior share one auditable contract.
- The contract can evolve from server-rendered `userMessage` text to fully localized client message keys without breaking the error payload shape.

### Negative / Trade-offs

- Backend boundaries must classify which failures are safe to publish.
- New validation rules require safe display text or localization metadata.
- Tests must cover both actionable output (presence of `userMessage`, `errorId`) and absence of technical leakage (no stack traces, no exception names).

---

## References

- [ADR-0038: Error Handling Result Pattern](./0038-error-handling-result-pattern-strategy.md)
- [ADR-0045: Zustand + TanStack Query State Management](./0045-zustand-tanstack-query-state-management.md)
- [ADR-0064 .NET: Request-Scope Observability Context](../dotnet/0064-dotnet-request-scope-observability-context.md)
- [ADR-0065 .NET: PII-Safe Serilog Pipeline](../dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)

---
[Back to Index](./README.md)
