# CP-04: AOP Logging Decorator with Observability Envelope

**Type:** Canonical Pattern — .NET (C#)  
**Status:** Accepted  
**Implements:** [PAT-0010: Ports and Adapters](../pat/pat-0010-ports-and-adapters.md)  
**Related ADRs:**
- [ADR-0041: Canonical .NET Backend Architecture](../../adrs/dotnet/0041-canonical-dotnet-backend-architecture.md)
- [ADR-0064: Request-Scope Observability Context](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.md)
- [ADR-0065: PII-Safe Serilog Pipeline](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)

---

## Problem

Command handlers need entry/exit/exception logging enriched with the full observability envelope (TenantId, CorrelationId, SessionTrackingId, TraceId, SpanId, BoundedContext) without:
- Coupling the handler to `ILogger` or any logging library
- Duplicating enrichment logic across handlers
- Leaking PII argument values into logs

---

## Pattern

Extend `StructuredAopLoggerBase` (shell library) to create a Serilog-backed adapter. Register it via a product-specific marker interface as a keyed DI service. Handlers declare logging intent with a `[LoggerAspect]` attribute — no runtime coupling to logging infrastructure.

```
[LoggerAspect(Type = typeof(IProductLogger))]   ← Application layer (attribute only)
         │
         ▼ (DispatchProxy intercepts)
ProductSerilogLogger : StructuredAopLoggerBase  ← Infrastructure layer
         │
         ├── ResolveExecutionContext()    reads RequestContextAccessor snapshot (ADR-0064)
         ├── TenantId()                  reads ITenantContext (scoped)
         ├── InferBoundedContext(Type)   parses namespace segment
         │
         ▼
ILogger<THandler>  (MEL backed by Serilog)
         │
         ▼
PiiSanitizerEnricher → Sinks                    (ADR-0065)
```

---

## Shell Library Base Class

Place in a portable shell library (no product dependencies):

```csharp
// No product-specific imports
public abstract class StructuredAopLoggerBase : IAopLogger
{
    private readonly IExecutionContextAccessor _accessor;

    protected StructuredAopLoggerBase(IExecutionContextAccessor accessor)
        => _accessor = accessor;

    /// <summary>
    /// Resolves the full observability envelope.
    /// Priority: accessor snapshot → Activity.Current baggage → requestId → ""
    /// </summary>
    protected ExecutionContextSnapshot ResolveExecutionContext(string requestId)
    {
        var current  = _accessor.Current ?? ExecutionContextSnapshot.Empty;
        var activity = Activity.Current;

        return new ExecutionContextSnapshot(
            CorrelationId:     current.CorrelationId.FirstNonEmpty(
                                   activity?.GetBaggageItem(ObservabilityKeys.CorrelationId),
                                   requestId),
            SessionTrackingId: current.SessionTrackingId.FirstNonEmpty(
                                   activity?.GetBaggageItem(ObservabilityKeys.SessionTrackingId)),
            TraceId:           current.TraceId.FirstNonEmpty(activity?.TraceId.ToString()),
            SpanId:            current.SpanId.FirstNonEmpty(activity?.SpanId.ToString()));
    }

    /// <summary>
    /// Infers bounded context from the handler type namespace.
    /// Product.Application.Identity.Tenant.Commands.* → "Identity"
    /// </summary>
    protected static string InferBoundedContext(Type targetType)
    {
        var parts = targetType.Namespace?.Split('.') ?? [];
        // segment index is product-specific; default: find "Application" and take next
        var appIdx = Array.IndexOf(parts, "Application");
        return appIdx >= 0 && appIdx + 1 < parts.Length ? parts[appIdx + 1] : "Unknown";
    }

    public abstract void OnEntry(IJoinPoint jp, Argument[] args, string requestId);
    public abstract void OnExit(IJoinPoint jp, Return ret, string requestId, long durationMs);
    public abstract void OnException(IJoinPoint jp, string requestId, Exception ex);
}
```

---

## Satellite Implementation

```csharp
// Product.Infrastructure/Aop/ProductSerilogLogger.cs
public sealed class ProductSerilogLogger(
    ILoggerFactory loggerFactory,
    ITenantContext tenantContext,
    IExecutionContextAccessor accessor) : StructuredAopLoggerBase(accessor), IProductLogger
{
    public override void OnEntry(IJoinPoint jp, Argument[] args, string requestId)
    {
        var log = loggerFactory.CreateLogger(jp.TargetType);
        if (!log.IsEnabled(LogLevel.Information)) return;

        var ctx    = ResolveExecutionContext(requestId);
        var tenant = tenantContext.TenantId ?? "system";
        var bc     = InferBoundedContext(jp.TargetType);

        // PII-safe: names + CLR types only, never values
        var argSummary = args is { Length: > 0 }
            ? string.Join(", ", args.Select(a => $"{a.Name}:{a.Type}"))
            : string.Empty;

        log.LogInformation(
            "→ {BoundedContext} {Handler}.{Method} params=[{Params}] | "
            + "tenant={TenantId} cid={CorrelationId} sid={SessionTrackingId} "
            + "trace={TraceId} span={SpanId}",
            bc, jp.TargetType.Name, jp.MethodInfo.Name, argSummary,
            tenant, ctx.CorrelationId, ctx.SessionTrackingId, ctx.TraceId, ctx.SpanId);
    }

    public override void OnExit(IJoinPoint jp, Return ret, string requestId, long durationMs)
    {
        var log = loggerFactory.CreateLogger(jp.TargetType);
        if (!log.IsEnabled(LogLevel.Information)) return;

        var ctx    = ResolveExecutionContext(requestId);
        var tenant = tenantContext.TenantId ?? "system";

        log.LogInformation(
            "← {BoundedContext} {Handler}.{Method} in {Duration}ms | "
            + "tenant={TenantId} cid={CorrelationId} sid={SessionTrackingId}",
            InferBoundedContext(jp.TargetType),
            jp.TargetType.Name, jp.MethodInfo.Name, durationMs,
            tenant, ctx.CorrelationId, ctx.SessionTrackingId);
    }

    public override void OnException(IJoinPoint jp, string requestId, Exception ex)
    {
        var log    = loggerFactory.CreateLogger(jp.TargetType);
        var ctx    = ResolveExecutionContext(requestId);
        var tenant = tenantContext.TenantId ?? "system";

        log.LogError(ex,
            " {BoundedContext} {Handler}.{Method} threw {ExType} | "
            + "tenant={TenantId} cid={CorrelationId} sid={SessionTrackingId}",
            InferBoundedContext(jp.TargetType),
            jp.TargetType.Name, jp.MethodInfo.Name, ex.GetType().Name,
            tenant, ctx.CorrelationId, ctx.SessionTrackingId);
    }
}
```

---

## Marker Interface (Application Layer)

```csharp
// Product.Application/Common/Aop/IProductLogger.cs
// Zero runtime code — selects the keyed DI service
public interface IProductLogger : IAopLogger;
```

---

## DI Registration

```csharp
// After AddAop()
services.AddKeyedTransient<IAopLogger, ProductSerilogLogger>(typeof(IProductLogger));

// Wrap each handler with DispatchProxy — after AddMediatR()
services.AddAopProxy<
    IRequestHandler<CreateOrderCommand, Result<CreateOrderResponse>>,
    CreateOrderCommandHandler>();
```

---

## Handler Decoration

```csharp
// Application layer — no Infrastructure import
[LoggerAspect(Type = typeof(IProductLogger), LogDuration = true, LogException = true, LogArguments = [])]
public async Task<Result<CreateOrderResponse>> Handle(
    CreateOrderCommand request, CancellationToken ct)
{
    // pure business logic — zero logging code
}
```

---

## Log Output

```
→ Orders CreateOrderCommandHandler.Handle params=[request:CreateOrderCommand] |
  tenant=acme cid=a3f1b7c2 sid=f9d8e1a0 trace=4bf92f35... span=00f067aa...

← Orders CreateOrderCommandHandler.Handle in 38ms |
  tenant=acme cid=a3f1b7c2 sid=f9d8e1a0

 Orders CreateOrderCommandHandler.Handle threw ValidationException |
  tenant=acme cid=a3f1b7c2 sid=f9d8e1a0
```

---

## Two Logger Adapters

| Adapter | Interface key | Level | Enrichment | When to use |
|---------|--------------|-------|------------|-------------|
| `MelLogger` | `IMelLogger` | Debug | None beyond MEL scopes | Dev-time, lightweight tracing |
| `ProductSerilogLogger` | `IProductLogger` | Information | TenantId, CorrelationId, SessionTrackingId, TraceId, SpanId, BoundedContext | All production command handlers |

---

## Related Patterns

- [CP-01: Request-Scope Context Propagation](./cp-01-request-scope-context-propagation.md)
- [CP-02: PII-Safe Serilog Logging](./cp-02-pii-safe-serilog-logging.md)
- [ADR-0064](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.md)
- [ADR-0065](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)
