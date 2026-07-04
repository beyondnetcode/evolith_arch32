# CP-01: Request-Scope Observability Context Propagation

**Type:** Canonical Pattern — .NET (C#)  
**Status:** Accepted  
**Related ADR:** [ADR-0064: .NET Request-Scope Observability Context Propagation](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.md)

---

## Problem

Command handlers, AOP aspects, and background services need access to request-scoped observability signals (CorrelationId, SessionTrackingId, TraceId, SpanId) without coupling to `IHttpContextAccessor` or the static `Activity.Current`.

---

## Pattern

A scoped `RequestContextAccessor` is written once by middleware and consumed by any component in the same DI scope via two segregated interfaces: a read-only `IRequestContext` port (Application layer) and a writable `IExecutionContextAccessor` port (Infrastructure / AOP).

```
HTTP Request
     │
     ▼
CorrelationIdMiddleware     writes Activity baggage + ILogger scope
     │
     ▼
SessionTrackingMiddleware   writes Activity baggage + calls RequestContextAccessor.Set()
     │
     ▼
RequestContextAccessor (scoped)  ← single source of truth
     │
     ├── IRequestContext          read-only (Application)
     └── IExecutionContextAccessor   read + write (Infrastructure / AOP)
```

---

## Shell Library Types

```csharp
// Place in a portable shell library (no product dependencies)

public sealed record ExecutionContextSnapshot(
    string CorrelationId,
    string SessionTrackingId,
    string TraceId,
    string SpanId)
{
    public static readonly ExecutionContextSnapshot Empty = new("", "", "", "");
}

public interface IExecutionContextAccessor
{
    ExecutionContextSnapshot Current { get; }
    void Set(ExecutionContextSnapshot snapshot);
}

public interface IRequestContext
{
    string? CorrelationId     { get; }
    string? SessionTrackingId { get; }
    string? TraceId           { get; }
    string? SpanId            { get; }
}

public static class ObservabilityHeaders
{
    public const string CorrelationId     = "X-Correlation-Id";
    public const string SessionTrackingId = "X-Session-Tracking-Id";
}

public static class ObservabilityKeys
{
    public const string CorrelationId     = "correlation.id";
    public const string SessionTrackingId = "session.tracking_id";
}
```

---

## Infrastructure Implementation

```csharp
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

---

## DI Registration

```csharp
services.AddScoped<RequestContextAccessor>();
services.AddScoped<IRequestContext>(sp =>
    sp.GetRequiredService<RequestContextAccessor>());
services.AddScoped<IExecutionContextAccessor>(sp =>
    sp.GetRequiredService<RequestContextAccessor>());
```

---

## SessionTrackingMiddleware

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

---

## Layer Reference Rules

| Layer | Interface | Access |
|-------|-----------|--------|
| `Domain` | — | No context needed |
| `Application` | `IRequestContext` | Read-only |
| `Infrastructure` / AOP | `IExecutionContextAccessor` | Read + Activity fallback |
| `Presentation` / Middleware | `RequestContextAccessor` directly | Write (middleware only), Read (endpoints) |

---

## Background Service Handoff

```csharp
// Capture before handing off to background job
var snapshot = new ExecutionContextSnapshot(
    _context.CorrelationId ?? "",
    _context.SessionTrackingId ?? "",
    _context.TraceId ?? "",
    _context.SpanId ?? "");

// Pass snapshot to background service constructor / job factory
public OutboxDispatcherJob(ExecutionContextSnapshot originatingContext) { ... }
```

---

## Related Patterns

- [CP-04: AOP Logging Decorator](./cp-04-aop-logging-decorator.md) — consumes this pattern for observability-enriched handler logs
- [ADR-0064](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.md)
