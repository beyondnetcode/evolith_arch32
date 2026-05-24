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
| Durabilidad tras reinicio | ✅ Permanente | ❌ Solo TTL |
| Consistencia multi-réplica | ✅ DB | ✅ Redis (IDistributedCache) |
| Registro de duplicados | ✅ | ❌ |
| Complejidad de implementación | Moderada | Baja |
| Latencia de reproducción | ~1ms DB lookup | <0.1ms memoria / ~0.5ms Redis |
| Adecuado para | Pagos, contratos, cumplimiento | CRUD estándar, pasos de saga |

---

## 3. Decisión

**Implementar la deduplicación de requests como un middleware ASP.NET Core que lee el header `Idempotency-Key`, cachea la primera respuesta en `IMemoryCache` (o `IDistributedCache`), y la reproduce literalmente para requests duplicados.**

### A. Contrato de Comportamiento

| Escenario | Método HTTP | Clave | Respuesta | Handler invocado |
|-----------|-------------|-------|-----------|-----------------|
| Primera llamada | POST/PUT/PATCH | Sí | 2xx (del handler) | ✅ |
| Reintento, completado | POST/PUT/PATCH | Sí (cacheada) | 2xx (reproducida) | ❌ |
| Duplicado paralelo | POST/PUT/PATCH | Sí (en vuelo) | 409 | ❌ |
| Sin clave | POST/PUT/PATCH | No | Pasa | ✅ |
| Método seguro | GET/DELETE | Cualquiera | Pasa | ✅ |
| Error del handler | POST/PUT/PATCH | Sí | 4xx/5xx (no cacheado) | ✅ |

### B. Registro en DI y Pipeline

```csharp
// services
services.AddMemoryCache(); // o AddStackExchangeRedisCache para multi-pod

// Program.cs — después de UseGlobalExceptionHandler, antes del routing
app.UseIdempotency();
```

**Posición en el pipeline:**
```
UseCorrelationId → UseSessionTracking → UseGlobalExceptionHandler
  → UseIdempotency   ← aquí
    → UseRateLimiter → Routes
```

### C. Ruta de Actualización Multi-Réplica

```csharp
// services.AddStackExchangeRedisCache(o => o.Configuration = "redis:6379");
// Inyectar IDistributedCache en lugar de IMemoryCache en el middleware
```

### D. Formato de Clave y TTL

- **Clave**: UUID v4 generado por el cliente, p.ej. `550e8400-e29b-41d4-a716-446655440000`
- **TTL por defecto**: 24 horas (configurable vía `IdempotencyOptions`)

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
