# Redis Caching Layer

> **Bilingual Navigation:** [Version en Español](./redis-caching-layer.es.md)

**Classification:** Operations and Infrastructure
**Status:** Active
**Owner:** Platform and Architecture
**Scope:** Redis-backed caching for the Core API and MCP server, including cache key patterns, TTL configuration, invalidation strategy, and metrics.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Core API    │────▶│  Redis 7.2   │◀────│  MCP Server  │
│  (NestJS)    │     │  (Cache)     │     │  (NestJS)    │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                          │
       ▼                                          ▼
  ┌─────────┐                              ┌─────────┐
  │ prom-   │                              │  OTel   │
  │ client  │                              │  traces │
  └─────────┘                              └─────────┘
```

- **Core API** uses `@nestjs/cache-manager` with a Redis store (`@keyv/redis`) for response caching on topology GET endpoints and OPA result caching.
- **MCP Server** uses an in-process `CacheModule` for tool/resource discovery results (static data that changes rarely).
- Both services degrade gracefully to no-cache if Redis is unavailable.
- Cache metrics are exposed via the Prometheus `/metrics` endpoint.

## Cache Key Patterns

| Namespace | Key Pattern | TTL | Description |
|-----------|-------------|-----|-------------|
| `topology` | `topology:list` | 5 min | Topology manifest list |
| `topology` | `topology:{id}` | 5 min | Individual topology by ID |
| `opa` | `opa:result:{inputHash}` | 1 min | OPA policy evaluation result (by input hash) |
| `gate` | `gate:{gateId}:{projectPath}` | 5 min | Phase gate evaluation status |
| `mcp` | `mcp:tools:list` | 10 min | MCP tool discovery cache |
| `mcp` | `mcp:resources:list` | 10 min | MCP resource discovery cache |

## TTL Configuration

| Domain | Default TTL | Rationale |
|--------|-------------|-----------|
| Topology manifests | 300s (5 min) | Changes infrequently; manual invalidation endpoint available |
| OPA results | 60s (1 min) | Input-sensitive; short TTL prevents stale policy decisions |
| Gate status | 300s (5 min) | Phase transitions are deliberate; short TTL not needed |
| MCP discovery | 600s (10 min) | Tool/resource lists are static at runtime; long TTL safe |

All TTLs are defined in `apps/core-api/src/infrastructure/cache/cache-keys.ts` (`CacheTTL` constant) and `packages/mcp-server/src/mcp/mcp-cache.service.ts`.

## Cache Invalidation

### Manual Invalidation

The Core API exposes a POST endpoint for manual cache invalidation:

```
POST /api/v1/architecture/cache/invalidate
```

Response:
```json
{
  "success": true,
  "data": { "invalidated": true, "keys": ["topology:list"] }
}
```

### Invalidation Triggers

| Trigger | Mechanism | Scope |
|---------|-----------|-------|
| Topology manifest update | Manual endpoint call | `topology:list` key |
| MCP tool registration change | Service restart (tool set is static) | `mcp:tools:list` key |
| OPA policy update | TTL expiry (1 min) | `opa:result:*` keys |
| Gate evaluation | TTL expiry (5 min) | `gate:*` keys |

### Strategy

- **Topology changes:** Call `POST /api/v1/architecture/cache/invalidate` after deploying topology manifest updates.
- **OPA results:** Short TTL (60s) ensures policy changes propagate within one minute without explicit invalidation.
- **MCP discovery:** 10-minute TTL with graceful degradation — stale tool lists are acceptable for the MCP protocol's discovery phase.

## Metrics and Monitoring

Cache metrics are exposed at `GET /metrics` alongside existing application metrics:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `evolith_cache_hits_total` | Counter | `cache_namespace` | Total cache hits |
| `evolith_cache_misses_total` | Counter | `cache_namespace` | Total cache misses |
| `evolith_cache_errors_total` | Counter | `cache_namespace`, `operation` | Total cache operation errors |

### Hit Rate Calculation

```
hit_rate = evolith_cache_hits_total / (evolith_cache_hits_total + evolith_cache_misses_total)
```

### Grafana Dashboard

Add a panel querying:
```promql
rate(evolith_cache_hits_total[5m]) / (rate(evolith_cache_hits_total[5m]) + rate(evolith_cache_misses_total[5m]))
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | — | Full Redis connection URL (overrides host/port/password) |
| `REDIS_HOST` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | — | Redis authentication password |

### Docker Compose

Redis is defined in `product/infra/docker-compose.yml` as the `redis` service:

- Image: `redis:7.2-alpine`
- Port: `6379`
- Persistent volume: `redis_data`
- Health check: `redis-cli ping`
- Authentication: `--requirepass ${REDIS_PASSWORD}`

### Starting Redis

```bash
# Start only Redis
docker-compose -f product/infra/docker-compose.yml up -d redis

# Start Redis with the full infrastructure
docker-compose -f product/infra/docker-compose.yml up -d
```

## Graceful Degradation

If Redis is unavailable at startup or becomes unreachable:

1. `RedisCacheModule` logs a warning: `Redis unavailable — caching disabled (in-memory fallback)`
2. `CacheModule` falls back to the default in-memory store
3. All API endpoints continue to function normally
4. Cache metrics show increased miss rates
5. No request failures occur due to cache unavailability

## Related Authority

- [Observability Stack](./README.md)
- [OTel Collector Configuration](./otel/otel-collector-config.yaml)
- [ADR-0014: Redis 4-Tier Cache Cluster](../../reference/core/architecture/adrs/core/0046-unified-observability-tracecontext.md)

---
[Back to Operations](./README.md)
