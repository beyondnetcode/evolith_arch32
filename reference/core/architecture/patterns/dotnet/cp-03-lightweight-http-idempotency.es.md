# CP-03: Middleware de Idempotencia HTTP Ligera

**Tipo:** Patrón Canónico — .NET (C#)  
**Estado:** Aceptado  
**ADR relacionado:** [ADR-0066: Idempotencia HTTP Ligera en .NET](../../adrs/dotnet/0066-dotnet-lightweight-http-idempotency.es.md)

---

## Problema

Los endpoints HTTP mutantes (`POST`, `PUT`, `PATCH`) pueden ser llamados más de una vez por la misma operación lógica debido a reintentos de red, bugs del cliente o pasos de compensación de saga. Re-ejecutar el handler crea agregados duplicados o estado inconsistente.

---

## Patrón

Un middleware ASP.NET Core lee un header `Idempotency-Key` provisto por el cliente, ejecuta el pipeline en la primera llamada, cachea la respuesta y la reproduce literalmente en llamadas posteriores con la misma clave.

```
Cliente                 Middleware                  Pipeline
──────                  ──────────                  ────────
POST /resource          │
  Idempotency-Key: abc  │
                  ──►  │  ¿Clave "abc"? No → Ejecutar
                        │  ──────────────────────►  Handler
                        │  ◄──────────────────────  Resultado
                        │  Cachear (24h)
                  ◄──   200 { id: "..." }

POST /resource (retry)  │  ¿Clave "abc"? Sí (completada)
                  ──►  │  → Devolver respuesta cacheada
                  ◄──   200 { id: "..." }  ← handler NO invocado

POST /resource (paralelo)│ ¿Clave "abc"? Sí (en vuelo)
                  ──►  │  → 409
```

---

## Implementación

Ver código completo en [CP-03 EN](./cp-03-lightweight-http-idempotency.md).

---

## Registro en DI / Pipeline

```csharp
services.AddMemoryCache(); // o AddStackExchangeRedisCache para multi-pod
app.UseIdempotency();      // después de UseGlobalExceptionHandler, antes del routing
```

## Ruta de Actualización Multi-Réplica

```csharp
// services.AddStackExchangeRedisCache(o => o.Configuration = "redis:6379");
```

---

## Referencia de Comportamiento

| Escenario | Método | Clave | Estado | Handler |
|-----------|--------|-------|--------|---------|
| Primera llamada | POST/PUT/PATCH | Sí | 2xx | Sí |
| Reintento, completado | POST/PUT/PATCH | Sí (cacheada) | 2xx reproducida | No |
| Duplicado paralelo | POST/PUT/PATCH | Sí (en vuelo) | 409 | No |
| Sin clave | POST/PUT/PATCH | No | pasa | Sí |
| Método seguro | GET/DELETE | Cualquiera | pasa | Sí |
| Error del handler | POST/PUT/PATCH | Sí | 4xx/5xx (no cacheado) | Sí |

---

## Patrones Relacionados

- [ADR-0066](../../adrs/dotnet/0066-dotnet-lightweight-http-idempotency.es.md)
- [Variante DB — ADR-0063](../../adrs/dotnet/0063-dotnet-b2b-idempotency-middleware.es.md)
