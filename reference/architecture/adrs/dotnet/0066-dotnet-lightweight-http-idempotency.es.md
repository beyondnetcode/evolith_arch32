# [ADR 0066](0066-dotnet-lightweight-http-idempotency.md): Idempotencia HTTP Ligera en .NET via IMemoryCache / IDistributedCache

## 1. Estado
**Estado**: Aceptado
**Fecha**: 2026-05-24
**Alcance**: Stack Tecnológico - Confiabilidad de API .NET
**Origen satélite**: UMS ADR-0063 (FIX-06/RISK-05) — promovido a baseline corporativo
**Complementa**: [ADR-0063: Middleware de Idempotencia B2B (respaldado por DB)](./0063-dotnet-b2b-idempotency-middleware.md)

---

## 2. Contexto

El ADR-0063 define el patrón de idempotencia B2B empresarial usando una tabla persistente `IdempotencyRequests` en base de datos. Este ADR define la **variante ligera**: una implementación en memoria (nodo único) o caché distribuida (multi-réplica) para escenarios donde:
- No se requiere persistencia de registros de idempotencia más allá de la ventana TTL
- Un contrato simple `Idempotency-Key: <UUID>` es suficiente
- Se prioriza la latencia de reproducción sub-milisegundo sobre la durabilidad tras reinicios

**Cuándo usar cada variante:**

| Criterio | ADR-0063 (respaldado por DB) | ADR-0066 (respaldado por caché) |
|----------|------------------------------|--------------------------------|
| Durabilidad tras reinicio | Sí (Permanente) | No (Solo TTL) |
| Consistencia multi-réplica | Sí (DB) | Sí (Redis (IDistributedCache)) |
| Registro de duplicados | Sí | No |
| Complejidad de implementación | Moderada | Baja |
| Latencia de reproducción | ~1ms DB lookup | <0.1ms memoria / ~0.5ms Redis |
| Adecuado para | Pagos, contratos, cumplimiento | CRUD estándar, pasos de saga |

---

## 3. Decisión

**Implementar la deduplicación de requests como un middleware ASP.NET Core que lee el header `Idempotency-Key`, cachea la primera respuesta en `IMemoryCache` (o `IDistributedCache`), y la reproduce literalmente para requests duplicados.**

### A. Contrato de Comportamiento

| Escenario | Método HTTP | Clave presente | Respuesta | Handler invocado |
|-----------|-------------|----------------|-----------|-----------------|
| Primera llamada | POST/PUT/PATCH | Sí | 2xx (del handler) | Sí |
| Reintento, completado | POST/PUT/PATCH | Sí (cacheada) | 2xx (reproducida) | No |
| Duplicado paralelo | POST/PUT/PATCH | Sí (en vuelo) | 409 | No |
| Sin clave | POST/PUT/PATCH | No | Pasa | Sí |
| Método seguro | GET/DELETE | Cualquiera | Pasa | Sí |
| Error del handler | POST/PUT/PATCH | Sí | 4xx/5xx (no cacheado) | Sí |

### B. Implementación

```csharp
public sealed class IdempotencyMiddleware(
    RequestDelegate next,
    IMemoryCache cache,
    ILogger<IdempotencyMiddleware> logger)
{
    private const string Header   = "Idempotency-Key";
    private const string InFlight = ":inflight";
    private static readonly HashSet<string> Methods =
        new(StringComparer.OrdinalIgnoreCase) { "POST", "PUT", "PATCH" };

    public async Task InvokeAsync(HttpContext context)
    {
        if (!Methods.Contains(context.Request.Method)
            || !context.Request.Headers.TryGetValue(Header, out var keyValues)
            || string.IsNullOrWhiteSpace(keyValues.FirstOrDefault()))
        {
            await next(context); return;
        }

        var key = keyValues.First()!;

        // Rechazar duplicado paralelo
        if (cache.TryGetValue(key + InFlight, out _))
        {
            context.Response.StatusCode = 409;
            await context.Response.WriteAsJsonAsync(
                new { error = "request already in progress", idempotencyKey = key });
            return;
        }

        // Reproducir request completado
        if (cache.TryGetValue(key, out CachedResponse? cached))
        {
            context.Response.StatusCode  = cached!.StatusCode;
            context.Response.ContentType = cached.ContentType;
            await context.Response.Body.WriteAsync(cached.Body);
            return;
        }

        // Primera llamada — ejecutar y cachear
        cache.Set(key + InFlight, true, TimeSpan.FromMinutes(5));
        try
        {
            var original = context.Response.Body;
            using var buffer = new MemoryStream();
            context.Response.Body = buffer;

            await next(context);

            buffer.Position = 0;
            var body = buffer.ToArray();

            if (context.Response.StatusCode is >= 200 and < 300)
                cache.Set(key,
                    new CachedResponse(context.Response.StatusCode,
                        context.Response.ContentType ?? "application/json", body),
                    TimeSpan.FromHours(24));

            context.Response.Body = original;
            await original.WriteAsync(body);
        }
        finally { cache.Remove(key + InFlight); }
    }

    private record CachedResponse(int StatusCode, string ContentType, byte[] Body);
}

public static class IdempotencyMiddlewareExtensions
{
    public static IApplicationBuilder UseIdempotency(this IApplicationBuilder app)
        => app.UseMiddleware<IdempotencyMiddleware>();
}
```

### C. Registro en DI y Pipeline

```csharp
// services
services.AddMemoryCache(); // valor por defecto para nodo único

// Program.cs — después de UseGlobalExceptionHandler, antes del routing
app.UseIdempotency();
```

**Posición en el pipeline:**
```
UseCorrelationId → UseSessionTracking → UseGlobalExceptionHandler
  → UseIdempotency   ← aquí
    → UseRateLimiter → Routes
```

Posición después de `UseGlobalExceptionHandler` previene cachear respuestas de error. Posición antes del routing asegura que la reproducción ocurre antes de la selección de endpoint.

### D. Ruta de Actualización Multi-Réplica

Reemplazar `IMemoryCache` con `IDistributedCache` para compartir estado de idempotencia entre pods:

```csharp
// services.AddStackExchangeRedisCache(o => o.Configuration = "redis:6379");
// Inyectar IDistributedCache en lugar de IMemoryCache en el middleware
```

### E. Formato de Clave

UUID v4 generado por el cliente, p.ej. `550e8400-e29b-41d4-a716-446655440000`. El middleware no genera claves. Los clientes deben generar y retener la clave antes del primer intento y reutilizarla en los reintentos.

### F. TTL

Por defecto: **24 horas** (configurable vía `IdempotencyOptions`). Después del vencimiento del TTL, una clave re-enviada se trata como una nueva solicitud.

---

## 4. Consecuencias

### Positivas
- Cero boilerplate por handler — un middleware cubre todos los endpoints mutantes
- La lógica de negocio del handler se ejecuta exactamente una vez por operación lógica
- Se combina con el Outbox Transaccional (ADR-0061): si el handler confirmó el mensaje de outbox, la respuesta cacheada se reproduce; el domain event no se re-publica
- Transparente para los clientes — las llamadas duplicadas reciben respuestas idénticas

### Compromisos
- La caché en memoria no se comparte entre réplicas — un reintento en un pod diferente re-ejecutará; mitigar con Redis en producción multi-réplica
- Los cuerpos de respuesta se cachean como arrays de bytes — las respuestas grandes consumen memoria proporcionalmente
- Solo se cachean respuestas `2xx` — los errores no se cachean
- Los registros de idempotencia no son duraderos tras reinicios — usar ADR-0063 cuando se requiere retención de auditoría

---

**[Volver al Índice ADR .NET](./README.es.md)** | **[Registro ADR](../README.md)** | **[Variante DB ADR-0063](./0063-dotnet-b2b-idempotency-middleware.md)**

## Objetivo y Alcance

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Opciones Consideradas

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).
