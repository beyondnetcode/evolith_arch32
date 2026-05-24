# CP-01: Propagación del Contexto de Observabilidad con Scope de Request

**Tipo:** Patrón Canónico — .NET (C#)  
**Estado:** Aceptado  
**ADR relacionado:** [ADR-0064: Propagación del Contexto de Observabilidad en .NET](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.md)

---

## Problema

Los command handlers, aspectos AOP y servicios de background necesitan acceso a las señales de observabilidad con scope de request (CorrelationId, SessionTrackingId, TraceId, SpanId) sin acoplarse a `IHttpContextAccessor` ni a `Activity.Current` estático.

---

## Patrón

Un `RequestContextAccessor` con scope es escrito una vez por el middleware y consumido por cualquier componente en el mismo scope de DI a través de dos interfaces segregadas: un puerto de solo lectura `IRequestContext` (capa de Aplicación) y un puerto de escritura `IExecutionContextAccessor` (Infraestructura / AOP).

```
HTTP Request
     │
     ▼
CorrelationIdMiddleware     escribe baggage Activity + scope ILogger
     │
     ▼
SessionTrackingMiddleware   escribe baggage Activity + llama RequestContextAccessor.Set()
     │
     ▼
RequestContextAccessor (scoped)  ← fuente única de verdad
     │
     ├── IRequestContext          solo lectura (Aplicación)
     └── IExecutionContextAccessor   lectura + escritura (Infraestructura / AOP)
```

---

## Tipos de la Shell Library

```csharp
// Colocar en una shell library portable (sin dependencias de producto)

public sealed record ExecutionContextSnapshot(
    string CorrelationId, string SessionTrackingId,
    string TraceId, string SpanId)
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

## Implementación en Infraestructura

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

## Registro en DI

```csharp
services.AddScoped<RequestContextAccessor>();
services.AddScoped<IRequestContext>(sp =>
    sp.GetRequiredService<RequestContextAccessor>());
services.AddScoped<IExecutionContextAccessor>(sp =>
    sp.GetRequiredService<RequestContextAccessor>());
```

---

## Reglas de Referencia por Capa

| Capa | Interfaz | Acceso |
|------|-----------|--------|
| `Domain` | — | No necesita contexto |
| `Application` | `IRequestContext` | Solo lectura |
| `Infrastructure` / AOP | `IExecutionContextAccessor` | Lectura + fallback a Activity |
| `Presentation` / Middleware | `RequestContextAccessor` directo | Escritura (solo middleware), Lectura (endpoints) |

---

## Handoff a Servicio de Background

```csharp
// Capturar antes del handoff al job de background
var snapshot = new ExecutionContextSnapshot(
    _context.CorrelationId ?? "",
    _context.SessionTrackingId ?? "",
    _context.TraceId ?? "",
    _context.SpanId ?? "");

// Pasar snapshot al constructor del servicio de background
public OutboxDispatcherJob(ExecutionContextSnapshot originatingContext) { ... }
```

---

## Patrones Relacionados

- [CP-04: Decorator de Logging AOP](./cp-04-aop-logging-decorator.md)
- [ADR-0064](../../adrs/dotnet/0064-dotnet-request-scope-observability-context.md)
