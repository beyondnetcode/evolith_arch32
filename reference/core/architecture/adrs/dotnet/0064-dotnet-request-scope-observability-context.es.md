# [ADR 0064](0064-dotnet-request-scope-observability-context.md): Propagación del Contexto de Observabilidad con Scope de Request en .NET

## 1. Estado
**Estado**: Aceptado  
**Fecha**: 2026-05-24  
**Alcance**: Stack Tecnológico - Observabilidad Cross-Cutting en .NET  
**Origen satélite**: UMS ADR-0061 — promovido a baseline corporativo tras confirmar cero dependencias específicas de UMS

---

## 2. Contexto

En aplicaciones .NET API que usan CQRS, AOP, servicios de background y dispatchers de outbox, cada componente en el mismo lifetime de request necesita acceso a las mismas señales de observabilidad: `CorrelationId`, `SessionTrackingId`, `TraceId` y `SpanId`.

Sin este estándar, cada componente los resuelve de forma independiente, creando tres fallos recurrentes en repositorios satélite:

| Fallo | Causa raíz |
|-------|-----------|
| Líneas de log del mismo request con distintos valores de `CorrelationId` | Cada componente lee de una fuente diferente |
| Adaptadores AOP, handlers y servicios de background dependen de `IHttpContextAccessor` | La infraestructura HTTP filtra hacia capas de Aplicación e Infraestructura |
| Los dispatchers de outbox producen logs sin contexto de correlación | `Activity.Current` es null fuera del pipeline HTTP |

### Alternativas Evaluadas

| Opción | Razón de Rechazo |
|--------|----------------|
| `IHttpContextAccessor` en todas partes | Acopla Aplicación/Infraestructura a `Microsoft.AspNetCore.Http` |
| Flow con `AsyncLocal<T>` | Se rompe en límites de `Task.Run` y `ConfigureAwait(false)` |
| Solo `Activity.Current` estático | Null en servicios de background; sin `SessionTrackingId` |
| **`RequestContextAccessor` con scope** | Escribible por middleware, legible en todo el scope de request — sin dependencia HTTP |

---

## 3. Decisión

**Introducir un `RequestContextAccessor` con scope que el `SessionTrackingMiddleware` escribe exactamente una vez y que cualquier componente consume mediante dos interfaces segregadas.**

### A. Contratos de Tipo

Definir en una shell library portable (sin dependencias de producto):

```csharp
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

### B. Registro en DI

```csharp
services.AddScoped<RequestContextAccessor>();
services.AddScoped<IRequestContext>(sp => sp.GetRequiredService<RequestContextAccessor>());
services.AddScoped<IExecutionContextAccessor>(sp => sp.GetRequiredService<RequestContextAccessor>());
```

### C. Cadena de Propagación

```
Llega HTTP Request
     │
     ▼
CorrelationIdMiddleware
  – lee/genera X-Correlation-Id → baggage Activity + scope ILogger
     │
     ▼
SessionTrackingMiddleware
  – lee/genera X-Session-Tracking-Id → llama RequestContextAccessor.Set()
  – scope ILogger ("SessionTrackingId")
     │
     ▼
RequestContextAccessor (scoped)       ← fuente única de verdad
     │
     ├── IRequestContext              solo lectura (Aplicación)
     └── IExecutionContextAccessor   lectura + escritura (Infraestructura / AOP)
```

### D. Prioridad de Resolución (adaptadores AOP)

```
1. RequestContextAccessor.Current (establecido por SessionTrackingMiddleware)
2. Baggage de Activity.Current (fallback para contextos no-HTTP)
3. Parámetro requestId del atributo de método
4. Cadena vacía
```

### E. Implementación (Capa de Infraestructura)

```csharp
// Una sola clase implementa ambos puertos — registrada dos veces en DI
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

### F. Prioridad de Resolución (adaptadores AOP)

```
1. RequestContextAccessor.Current (establecido por SessionTrackingMiddleware)
2. Baggage de Activity.Current (fallback para contextos no-HTTP)
3. Parámetro requestId del atributo de método
4. Cadena vacía
```

### G. Reglas de Acceso por Capa

| Capa | Interfaz | Acceso |
|------|-----------|--------|
| `Domain` | — | No necesita contexto |
| `Application` | `IRequestContext` | Solo lectura |
| `Infrastructure` / AOP | `IExecutionContextAccessor` | Lectura + fallback a Activity |
| `Presentation` / Middleware | `RequestContextAccessor` directo | Escritura (solo middleware), Lectura (endpoints) |

---

## 4. Consecuencias

### Positivas
- Fuente única de verdad para todas las señales de observabilidad con scope de request
- La capa de Aplicación tiene cero dependencia de `IHttpContextAccessor`
- Los servicios de background y dispatchers de outbox pueden propagar contexto recibiendo un `ExecutionContextSnapshot` en el handoff
- Las constantes `ObservabilityHeaders` y `ObservabilityKeys` evitan la proliferación de literales de cadena
- Los adaptadores de logging AOP (`StructuredAopLoggerBase`) usan este patrón sin imports específicos de producto

### Compromisos
- `RequestContextAccessor` es escribible por cualquier código con `IExecutionContextAccessor` — el contrato de escritor único es por convención
- El snapshot se captura una vez por request en la posición del `SessionTrackingMiddleware`; los spans creados después llevan el `SpanId` original; los adaptadores AOP compensan con fallback a `Activity.Current.SpanId`

---

**[Volver al Índice ADR .NET](./README.es.md)** | **[Registro ADR](../README.es.md)**

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

La propagación de contexto de observabilidad por ámbito de petición en .NET está en crecimiento hacia mainstream con OpenTelemetry como API de instrumentación estándar. Las APIs DiagnosticSource y Activity de .NET proporcionan soporte maduro de primera parte. Vigencia esperada: 3-5 años.

## Fuentes Actuales

- Documentación de observabilidad .NET — https://learn.microsoft.com/es-es/dotnet/core/diagnostics, consultado 2026-06-20.
- OpenTelemetry .NET SDK — https://opentelemetry.io/docs/instrumentation/net, consultado 2026-06-20.
