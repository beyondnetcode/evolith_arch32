# Capa de Caché con Redis

> **Navegación bilingüe:** [English Version](./redis-caching-layer.md)

**Clasificación:** Operaciones e Infraestructura
**Estado:** Activo
**Responsable:** Plataforma y Arquitectura
**Alcance:** Caché basada en Redis para la API Core y el servidor MCP, incluyendo patrones de claves, configuración TTL, estrategia de invalidación y métricas.

## Arquitectura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Core API    │────▶│  Redis 7.2   │◀────│  MCP Server  │
│  (NestJS)    │     │  (Caché)     │     │  (NestJS)    │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                          │
       ▼                                          ▼
  ┌─────────┐                              ┌─────────┐
  │ prom-   │                              │  OTel   │
  │ client  │                              │  traces │
  └─────────┘                              └─────────┘
```

- **Core API** utiliza `@nestjs/cache-manager` con un store Redis (`@keyv/redis`) para caché de respuestas en endpoints GET de topologías y caché de resultados OPA.
- **MCP Server** utiliza un `CacheModule` en proceso para resultados de descubrimiento de herramientas/recursos (datos estáticos que cambian raramente).
- Ambos servicios degradan gracefulmente a sin-caché si Redis no está disponible.
- Las métricas de caché se exponen a través del endpoint Prometheus `/metrics`.

## Patrones de Claves de Caché

| Espacio de nombres | Patrón de clave | TTL | Descripción |
|-----------|-------------|-----|-------------|
| `topology` | `topology:list` | 5 min | Lista de manifiestos de topología |
| `topology` | `topology:{id}` | 5 min | Topología individual por ID |
| `opa` | `opa:result:{inputHash}` | 1 min | Resultado de evaluación de política OPA (por hash de entrada) |
| `gate` | `gate:{gateId}:{projectPath}` | 5 min | Estado de evaluación de gate de fase |
| `mcp` | `mcp:tools:list` | 10 min | Caché de descubrimiento de herramientas MCP |
| `mcp` | `mcp:resources:list` | 10 min | Caché de descubrimiento de recursos MCP |

## Configuración TTL

| Dominio | TTL predeterminado | Justificación |
|--------|-------------|-----------|
| Manifiestos de topología | 300s (5 min) | Cambia infrecuentemente; endpoint de invalidación manual disponible |
| Resultados OPA | 60s (1 min) | Sensible a la entrada; TTL corto previene decisiones de política obsoletas |
| Estado de gate | 300s (5 min) | Las transiciones de fase son deliberadas; TTL corto no es necesario |
| Descubrimiento MCP | 600s (10 min) | Las listas de herramientas/recursos son estáticas en runtime; TTL largo es seguro |

Todos los TTLs están definidos en `apps/core-api/src/infrastructure/cache/cache-keys.ts` (constante `CacheTTL`) y `packages/mcp-server/src/mcp/mcp-cache.service.ts`.

## Invalidación de Caché

### Invalidación Manual

La API Core expone un endpoint POST para invalidación manual de caché:

```
POST /api/v1/architecture/cache/invalidate
```

Respuesta:
```json
{
  "success": true,
  "data": { "invalidated": true, "keys": ["topology:list"] }
}
```

### Disparadores de Invalidación

| Disparador | Mecanismo | Alcance |
|---------|-----------|-------|
| Actualización de manifiesto de topología | Llamada al endpoint manual | Clave `topology:list` |
| Cambio en registro de herramientas MCP | Reinicio del servicio (el conjunto de herramientas es estático) | Clave `mcp:tools:list` |
| Actualización de política OPA | Expiración del TTL (1 min) | Claves `opa:result:*` |
| Evaluación de gate | Expiración del TTL (5 min) | Claves `gate:*` |

### Estrategia

- **Cambios de topología:** Llamar a `POST /api/v1/architecture/cache/invalidate` después de desplegar actualizaciones de manifiestos de topología.
- **Resultados OPA:** TTL corto (60s) asegura que los cambios de política se propaguen dentro de un minuto sin invalidación explícita.
- **Descubrimiento MCP:** TTL de 10 minutos con degradación graceful — las listas de herramientas obsoletas son aceptables para la fase de descubrimiento del protocolo MCP.

## Métricas y Monitoreo

Las métricas de caché se exponen en `GET /metrics` junto con las métricas de aplicación existentes:

| Métrica | Tipo | Etiquetas | Descripción |
|--------|------|--------|-------------|
| `evolith_cache_hits_total` | Counter | `cache_namespace` | Total de aciertos de caché |
| `evolith_cache_misses_total` | Counter | `cache_namespace` | Total de fallos de caché |
| `evolith_cache_errors_total` | Counter | `cache_namespace`, `operation` | Total de errores de operación de caché |

### Cálculo de Tasa de Acierto

```
hit_rate = evolith_cache_hits_total / (evolith_cache_hits_total + evolith_cache_misses_total)
```

### Panel de Grafana

Agregar un panel consultando:
```promql
rate(evolith_cache_hits_total[5m]) / (rate(evolith_cache_hits_total[5m]) + rate(evolith_cache_misses_total[5m]))
```

## Configuración

### Variables de Entorno

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `REDIS_URL` | — | URL completa de conexión Redis (sobrescribe host/port/password) |
| `REDIS_HOST` | `localhost` | Hostname del servidor Redis |
| `REDIS_PORT` | `6379` | Puerto del servidor Redis |
| `REDIS_PASSWORD` | — | Contraseña de autenticación Redis |

### Docker Compose

Redis está definido en `product/infra/docker-compose.yml` como servicio `redis`:

- Imagen: `redis:7.2-alpine`
- Puerto: `6379`
- Volumen persistente: `redis_data`
- Health check: `redis-cli ping`
- Autenticación: `--requirepass ${REDIS_PASSWORD}`

### Iniciar Redis

```bash
# Iniciar solo Redis
docker-compose -f product/infra/docker-compose.yml up -d redis

# Iniciar Redis con la infraestructura completa
docker-compose -f product/infra/docker-compose.yml up -d
```

## Degradación Graceful

Si Redis no está disponible al inicio o se vuelve inalcanzable:

1. `RedisCacheModule` registra un aviso: `Redis unavailable — caching disabled (in-memory fallback)`
2. `CacheModule` recurre al store en memoria predeterminado
3. Todos los endpoints de la API continúan funcionando normalmente
4. Las métricas de caché muestran tasas de fallo incrementadas
5. No ocurren fallos de solicitud debido a la indisponibilidad de la caché

## Autoridad Relacionada

- [Pila de Observabilidad](./README.md)
- [Configuración del Collector OTel](./otel/otel-collector-config.yaml)
- [ADR-0014: Cluster de Caché Redis de 4 Niveles](../../reference/core/architecture/adrs/core/0046-unified-observability-tracecontext.md)

---
[Volver a Operaciones](./README.md)
