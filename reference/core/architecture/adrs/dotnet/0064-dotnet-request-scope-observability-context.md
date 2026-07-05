# [ADR 0064](0064-dotnet-request-scope-observability-context.md): .NET Request-Scope Observability Context Propagation

## 1. Status
**Status**: Accepted  
**Date**: 2026-05-24  
**Scope**: Technology Stack - .NET Cross-Cutting Observability  
**Satellite origin**: UMS ADR-0061 — promoted to corporate baseline after zero UMS-specific dependencies were confirmed

---

## 2. Context

In .NET API applications using CQRS, AOP, background services, and outbox dispatchers, every component in the same request lifetime needs access to the same observability signals: `CorrelationId`, `SessionTrackingId`, `TraceId`, and `SpanId`.

Before standardizing this pattern, each component resolved these independently:
- Logger adapters read directly from `Activity.Current`
- Correlation middleware wrote to `HttpContext.TraceIdentifier`
- Background dispatchers had no mechanism to receive the originating request context

This creates three recurring failures in satellite repositories:

| Failure | Root cause |
|---------|-----------|
| Log lines from the same request carry different `CorrelationId` values | Each component reads from a different source |
| AOP aspects, handlers, and background services depend on `IHttpContextAccessor` | HTTP infrastructure leaks into Application and Infrastructure layers |
| Outbox dispatchers produce logs with no correlation context | `Activity.Current` is null outside the HTTP pipeline |

### Alternatives Evaluated

| Option | Rejected Reason |
|--------|----------------|
| `IHttpContextAccessor` everywhere | Couples Application/Infrastructure to `Microsoft.AspNetCore.Http` |
| `AsyncLocal<T>` flow | Breaks across `Task.Run` boundaries and `ConfigureAwait(false)` |
| Static `Activity.Current` only | Null in background services; no `SessionTrackingId` |
| **Scoped `RequestContextAccessor`** | Writable by middleware, readable everywhere in the request scope — no HTTP dependency |

---

## 3. Decision

**Introduce a scoped `RequestContextAccessor` that is written exactly once by the `SessionTrackingMiddleware` and consumed by any component in the same DI scope through two segregated interfaces.**

### A. Type Contracts

Define in a portable shell library (no product-specific dependencies):

```csharp
// Immutable snapshot — written once per request by middleware
public sealed record ExecutionContextSnapshot(
    string CorrelationId,
    string SessionTrackingId,
    string TraceId,
    string SpanId)
{
    public static readonly ExecutionContextSnapshot Empty = new("", "", "", "");
}

// Writable port — Infrastructure and middleware only
public interface IExecutionContextAccessor
{
    ExecutionContextSnapshot Current { get; }
    void Set(ExecutionContextSnapshot snapshot);
}

// Read-only port — Application layer
public interface IRequestContext
{
    string? CorrelationId     { get; }
    string? SessionTrackingId { get; }
    string? TraceId           { get; }
    string? SpanId            { get; }
}

// HTTP header name constants
public static class ObservabilityHeaders
{
    public const string CorrelationId     = "X-Correlation-Id";
    public const string SessionTrackingId = "X-Session-Tracking-Id";
}

// OTel baggage / tag key constants
public static class ObservabilityKeys
{
    public const string CorrelationId     = "correlation.id";
    public const string SessionTrackingId = "session.tracking_id";
}
```

### B. Implementation (Infrastructure Layer)

```csharp
// Single class implements both ports — registered twice in DI
public sealed class RequestContextAccessor : IRequestContext, IExecutionContextAccessor
{
    private ExecutionContextSnapshot _current = ExecutionContextSnapshot.Empty;

    public string? CorrelationId     => _current.CorrelationId.NullIfEmpty();
    public string? SessionTrackingId => _current.SessionTrackingId.NullIfEmpty();
    public string? TraceId           => _current.TraceId.NullIfEmpty();
    public string? SpanId            => _current.SpanId.NullIfEmpty();
    public ExecutionContextSnapshot Current => _current;

    public void Set(ExecutionContextSnapshot snapshot) =>
        _current = snapshot ?? ExecutionContextSnapshot.Empty;
}
```

### C. DI Registration

```csharp
services.AddScoped<RequestContextAccessor>();
services.AddScoped<IRequestContext>(sp =>
    sp.GetRequiredService<RequestContextAccessor>());
services.AddScoped<IExecutionContextAccessor>(sp =>
    sp.GetRequiredService<RequestContextAccessor>());
```

### D. Middleware Writer (SessionTrackingMiddleware)

```csharp
public async Task InvokeAsync(HttpContext context, RequestContextAccessor accessor)
{
    var sessionId = GetOrGenerate(context, ObservabilityHeaders.SessionTrackingId);

    Activity.Current?.SetBaggage(ObservabilityKeys.SessionTrackingId, sessionId);
    Activity.Current?.SetTag(ObservabilityKeys.SessionTrackingId, sessionId);

    accessor.Set(new ExecutionContextSnapshot(
        CorrelationId:     Activity.Current?.GetBaggageItem(ObservabilityKeys.CorrelationId)
                           ?? context.TraceIdentifier ?? string.Empty,
        SessionTrackingId: sessionId,
        TraceId:           Activity.Current?.TraceId.ToString() ?? string.Empty,
        SpanId:            Activity.Current?.SpanId.ToString() ?? string.Empty));

    context.Response.Headers[ObservabilityHeaders.SessionTrackingId] = sessionId;
    using (_logger.BeginScope(new Dictionary<string, object> { ["SessionTrackingId"] = sessionId }))
        await _next(context);
}
```

### E. Propagation Chain

```
HTTP Request arrives
     │
     ▼
CorrelationIdMiddleware
  – reads / generates X-Correlation-Id header
  – writes to Activity.Current baggage ("correlation.id")
  – writes to ILogger scope ("CorrelationId")
     │
     ▼
SessionTrackingMiddleware
  – reads / generates X-Session-Tracking-Id header
  – calls RequestContextAccessor.Set(new ExecutionContextSnapshot(...))
  – writes to ILogger scope ("SessionTrackingId")
     │
     ▼
RequestContextAccessor (scoped)       ← single source of truth
     │
     ├── IRequestContext              read-only (Application)
     └── IExecutionContextAccessor   read + write (Infrastructure / AOP)
```

### F. Resolution Priority (AOP adapters)

```
1. RequestContextAccessor.Current (set by SessionTrackingMiddleware)
2. Activity.Current baggage (fallback for non-HTTP contexts)
3. requestId parameter from method attribute
4. Empty string
```

### G. Layer Access Rules

| Layer | Interface | Access |
|-------|-----------|--------|
| `Domain` | — | No context needed |
| `Application` | `IRequestContext` | Read-only |
| `Infrastructure` / AOP | `IExecutionContextAccessor` | Read + Activity fallback |
| `Presentation` / Middleware | `RequestContextAccessor` directly | Write (middleware), Read (endpoints) |

---

## 4. Consequences

### Positive
- Single source of truth for all request-scoped observability signals
- Application layer has zero `IHttpContextAccessor` dependency for correlation data
- Background services and outbox dispatchers can forward context by receiving an `ExecutionContextSnapshot` at handoff time
- `ObservabilityHeaders` and `ObservabilityKeys` constants prevent string-literal proliferation
- AOP logging adapters (`StructuredAopLoggerBase`) can use this pattern without product-specific imports

### Trade-offs
- `RequestContextAccessor` is writable by any code holding `IExecutionContextAccessor` — the single-writer contract is by convention; the middleware should be the only writer
- The snapshot is captured once per request at `SessionTrackingMiddleware` position; new spans created later in the pipeline carry the original `SpanId`; AOP adapters compensate via `Activity.Current.SpanId` fallback

---

**[Back to .NET ADR Index](./README.md)** | **[ADR Registry](../README.md)**

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

## Technology Watch (Trends, Maturity, Adoption, Support)

Request-scope observability context propagation in .NET is in growth-to-mainstream stage with OpenTelemetry becoming the standard instrumentation API. .NET's DiagnosticSource and Activity APIs provide mature first-party support for distributed context propagation. The ecosystem is converging on OpenTelemetry as the unified observability standard. Expected vigencia: 3-5 years for the distributed context propagation pattern; OpenTelemetry is the clear industry direction.

## Current Sources

- .NET observability documentation — https://learn.microsoft.com/en-us/dotnet/core/diagnostics, consulted 2026-06-20.
- OpenTelemetry .NET SDK — https://opentelemetry.io/docs/instrumentation/net, consulted 2026-06-20.
