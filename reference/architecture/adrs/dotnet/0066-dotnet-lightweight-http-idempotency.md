# [ADR 0066](0066-dotnet-lightweight-http-idempotency.md): .NET Lightweight HTTP Idempotency via IMemoryCache / IDistributedCache

## 1. Status
**Status**: Accepted  
**Date**: 2026-05-24  
**Scope**: Technology Stack - .NET API Reliability  
**Satellite origin**: UMS ADR-0063 (FIX-06/RISK-05) — promoted to corporate baseline  
**Complements**: [ADR-0063: B2B Request Idempotency Middleware (DB-backed)](./0063-dotnet-b2b-idempotency-middleware.md)

---

## 2. Context

[ADR-0063](./0063-dotnet-b2b-idempotency-middleware.md) defines the enterprise B2B idempotency pattern using a persistent `IdempotencyRequests` database table, supporting complex hash strategies (`IdempotencyKey + UserId + RequestPath`) and long-term audit retention.

This ADR defines the **lightweight variant**: an in-memory (single-node) or distributed-cache (multi-replica) implementation for scenarios where:
- Persistence of idempotency records beyond the TTL window is not required
- A simpler `Idempotency-Key: <UUID>` header contract is sufficient
- Sub-millisecond replay latency is prioritized over cross-restart durability

**When to use which variant:**

| Criterion | ADR-0063 (DB-backed) | ADR-0066 (Cache-backed) |
|-----------|---------------------|------------------------|
| Durability after restart | ✅ Permanent | ❌ TTL only |
| Cross-replica consistency | ✅ DB | ✅ Redis (IDistributedCache) |
| Audit trail of duplicates | ✅ | ❌ |
| Implementation complexity | Moderate | Low |
| Replay latency | ~1ms DB lookup | <0.1ms memory / ~0.5ms Redis |
| Suitable for | Payments, contracts, compliance | Standard CRUD, saga steps |

---

## 3. Decision

**Implement request deduplication as an ASP.NET Core middleware reading the `Idempotency-Key` header, caching the first response in `IMemoryCache` (or `IDistributedCache`), and replaying it verbatim for duplicate requests.**

### A. Behaviour Contract

| Scenario | HTTP Method | Key present | Response | Handler invoked |
|----------|-------------|-------------|----------|-----------------|
| First call | POST/PUT/PATCH | Yes | 2xx (from handler) | ✅ |
| Retry, completed | POST/PUT/PATCH | Yes (cached) | 2xx (replayed) | ❌ |
| Parallel duplicate | POST/PUT/PATCH | Yes (in-flight) | 409 | ❌ |
| No key | POST/PUT/PATCH | No | Pass-through | ✅ |
| Safe method | GET/DELETE | Any | Pass-through | ✅ |
| Handler error | POST/PUT/PATCH | Yes | 4xx/5xx (not cached) | ✅ |

### B. Implementation

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

        // Reject parallel duplicate
        if (cache.TryGetValue(key + InFlight, out _))
        {
            context.Response.StatusCode = 409;
            await context.Response.WriteAsJsonAsync(
                new { error = "request already in progress", idempotencyKey = key });
            return;
        }

        // Replay completed request
        if (cache.TryGetValue(key, out CachedResponse? cached))
        {
            context.Response.StatusCode  = cached!.StatusCode;
            context.Response.ContentType = cached.ContentType;
            await context.Response.Body.WriteAsync(cached.Body);
            return;
        }

        // First call — execute and cache
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

### C. DI and Pipeline Registration

```csharp
// services
services.AddMemoryCache(); // single-node default

// Program.cs — after UseGlobalExceptionHandler, before routing
app.UseIdempotency();
```

**Pipeline position:**
```
UseCorrelationId → UseSessionTracking → UseGlobalExceptionHandler
  → UseIdempotency   ← here
    → UseRateLimiter → Routes
```

Position after `UseGlobalExceptionHandler` prevents caching exception responses. Position before routing ensures replay occurs before endpoint selection.

### D. Multi-Replica Upgrade Path

Replace `IMemoryCache` with `IDistributedCache` to share idempotency state across pods:

```csharp
// services.AddStackExchangeRedisCache(o => o.Configuration = "redis:6379");
// Inject IDistributedCache instead of IMemoryCache in the middleware
```

### E. Key Format

Client-generated UUID (v4), e.g. `550e8400-e29b-41d4-a716-446655440000`. The middleware does not generate keys. Clients must generate and retain the key before the first attempt and reuse it on retries.

### F. TTL

Default: **24 hours** (configurable via `IdempotencyOptions`). After TTL expiry, a re-submitted key is treated as a new request.

---

## 4. Consequences

### Positive
- Zero per-handler boilerplate — one middleware covers all mutating endpoints
- Handler business logic executes exactly once per logical operation regardless of network retries
- Pairs with the Transactional Outbox ([ADR-0061](./0061-transactional-event-lifecycle-ef-core.md)): if the handler committed the outbox message, the cached response is replayed; the domain event is not re-published
- Transparent to clients — duplicate calls receive identical responses

### Trade-offs
- In-memory cache is not shared across pod replicas — a retry routed to a different pod re-executes; mitigate with Redis `IDistributedCache` in multi-replica production deployments
- Response bodies are cached as byte arrays — large responses consume memory proportional to the number of active unique keys
- Only `2xx` responses are cached — error responses are not; clients must retry with the same key on failures
- Key uniqueness is the client's responsibility; a misbehaving client using different keys for the same operation bypasses deduplication
- Idempotency records are not durable across restarts; use ADR-0063 when audit retention is required

---

**[Back to .NET ADR Index](./README.md)** | **[ADR Registry](../README.md)** | **[ADR-0063 DB-backed variant](./0063-dotnet-b2b-idempotency-middleware.md)**
