# CP-04: Decorator de Logging AOP con Envelope de Observabilidad

**Tipo:** Patrón Canónico — .NET (C#)  
**Estado:** Aceptado  
**ADRs relacionados:**
- [ADR-0041: Arquitectura .NET Backend Canónica](../../adrs/dotnet/0041-canonical-dotnet-backend-architecture.md)
- [ADR-0064: Contexto de Observabilidad con Scope de Request](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.md)
- [ADR-0065: Pipeline Serilog Seguro de PII](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)

---

## Problema

Los command handlers necesitan logging de entrada/salida/excepción enriquecido con el envelope completo de observabilidad (TenantId, CorrelationId, SessionTrackingId, TraceId, SpanId, BoundedContext) sin acoplar el handler a `ILogger` ni a ninguna librería de logging, sin duplicar lógica de enriquecimiento, y sin filtrar valores de argumentos PII en los logs.

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

## Interfaz Marcador (Capa de Aplicación)

```csharp
// Product.Application/Common/Aop/IProductLogger.cs
// Cero código en tiempo de ejecución — selecciona el servicio DI con clave
public interface IProductLogger : IAopLogger;
```

---

## Registro en DI

```csharp
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

✗ Orders CreateOrderCommandHandler.Handle threw ValidationException |
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

- [CP-01: Propagación del Contexto](./cp-01-request-scope-context-propagation.md)
- [CP-02: Logging Seguro de PII](./cp-02-pii-safe-serilog-logging.md)
- [ADR-0064](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.md) · [ADR-0065](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)
