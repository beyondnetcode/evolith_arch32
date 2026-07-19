# CP-04: Decorator de Logging AOP con Envelope de Observabilidad

**Tipo:** Patrón Canónico — .NET (C#)  
**Estado:** Aceptado  
**Implementa:** [PAT-0010: Puertos y Adaptadores](../pat/pat-0010-ports-and-adapters.es.md)  
**ADRs relacionados:**
- [ADR-0041: Arquitectura .NET Backend Canónica](../../adrs/dotnet/0041-canonical-dotnet-backend-architecture.es.md)
- [ADR-0064: Contexto de Observabilidad con Scope de Request](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.es.md)
- [ADR-0065: Pipeline Serilog Seguro de PII](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.es.md)

---

## Problema

Los command handlers necesitan logging de entrada/salida/excepción enriquecido con el envelope completo de observabilidad (TenantId, CorrelationId, SessionTrackingId, TraceId, SpanId, BoundedContext) sin:
- Acoplar el handler a `ILogger` ni a ninguna librería de logging
- Duplicar lógica de enriquecimiento entre handlers
- Filtrar valores de argumentos PII en los logs

---

## Patrón

Extender `StructuredAopLoggerBase` (shell library) para crear un adaptador respaldado por Serilog. Registrarlo vía una interfaz marcador como servicio DI con clave. Los handlers declaran la intención de logging con un atributo `[LoggerAspect]` — sin acoplamiento en tiempo de ejecución a la infraestructura de logging.

```
[LoggerAspect(Type = typeof(IProductLogger))]   ← Aplicación (solo atributo)
         │
         ▼ (DispatchProxy intercepta)
ProductSerilogLogger : StructuredAopLoggerBase  ← Infraestructura
         │
         ├── ResolveExecutionContext()   lee snapshot RequestContextAccessor (ADR-0064)
         ├── TenantId()                 lee ITenantContext (scoped)
         ├── InferBoundedContext(Type)  parsea segmento de namespace
         │
         ▼
ILogger<THandler> (MEL respaldado por Serilog)
         │
         ▼
PiiSanitizerEnricher → Sinks                   (ADR-0065)
```

---

## Clase Base de la Shell Library

Colocar en una shell library portable (sin dependencias de producto):

```csharp
// Sin imports específicos de producto
public abstract class StructuredAopLoggerBase : IAopLogger
{
    private readonly IExecutionContextAccessor _accessor;

    protected StructuredAopLoggerBase(IExecutionContextAccessor accessor)
        => _accessor = accessor;

    /// <summary>
    /// Resuelve el envelope completo de observabilidad.
    /// Prioridad: accessor snapshot → Activity.Current baggage → requestId → ""
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
    /// Infiere el bounded context desde el namespace del tipo handler.
    /// Product.Application.Identity.Tenant.Commands.* → "Identity"
    /// </summary>
    protected static string InferBoundedContext(Type targetType)
    {
        var parts = targetType.Namespace?.Split('.') ?? [];
        var appIdx = Array.IndexOf(parts, "Application");
        return appIdx >= 0 && appIdx + 1 < parts.Length ? parts[appIdx + 1] : "Unknown";
    }

    public abstract void OnEntry(IJoinPoint jp, Argument[] args, string requestId);
    public abstract void OnExit(IJoinPoint jp, Return ret, string requestId, long durationMs);
    public abstract void OnException(IJoinPoint jp, string requestId, Exception ex);
}
```

---

## Implementación Satélite

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

        // PII-safe: nombres + tipos CLR únicamente, nunca valores
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

## Interfaz Marcador (Capa de Aplicación)

```csharp
// Product.Application/Common/Aop/IProductLogger.cs
// Cero código en tiempo de ejecución — selecciona el servicio DI con clave
public interface IProductLogger : IAopLogger;
```

---

## Registro en DI

```csharp
// Después de AddAop()
services.AddKeyedTransient<IAopLogger, ProductSerilogLogger>(typeof(IProductLogger));

// Envolver cada handler con DispatchProxy — después de AddMediatR()
services.AddAopProxy<
    IRequestHandler<CreateOrderCommand, Result<CreateOrderResponse>>,
    CreateOrderCommandHandler>();
```

---

## Decoración del Handler

```csharp
// Capa de Aplicación — sin import de Infraestructura
[LoggerAspect(Type = typeof(IProductLogger), LogDuration = true, LogException = true, LogArguments = [])]
public async Task<Result<CreateOrderResponse>> Handle(
    CreateOrderCommand request, CancellationToken ct)
{
    // lógica de negocio pura — sin código de logging
}
```

---

## Salida de Log

```
→ Orders CreateOrderCommandHandler.Handle params=[request:CreateOrderCommand] |
  tenant=acme cid=a3f1b7c2 sid=f9d8e1a0 trace=4bf92f35... span=00f067aa...

← Orders CreateOrderCommandHandler.Handle in 38ms |
  tenant=acme cid=a3f1b7c2 sid=f9d8e1a0

 Orders CreateOrderCommandHandler.Handle threw ValidationException |
  tenant=acme cid=a3f1b7c2 sid=f9d8e1a0
```

---

## Dos Adaptadores de Logger

| Adaptador | Clave de interfaz | Nivel | Enriquecimiento | Cuándo usar |
|-----------|------------------|-------|-----------------|-------------|
| `MelLogger` | `IMelLogger` | Debug | Solo scopes MEL | Dev, trazado ligero |
| `ProductSerilogLogger` | `IProductLogger` | Information | TenantId, CorrelationId, SessionTrackingId, TraceId, SpanId, BoundedContext | Todos los handlers de producción |

---

## Patrones Relacionados

- [CP-01: Propagación del Contexto](./cp-01-request-scope-context-propagation.es.md)
- [CP-02: Logging Seguro de PII](./cp-02-pii-safe-serilog-logging.es.md)
- [ADR-0064](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.es.md) · [ADR-0065](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.es.md)