# Índice ADR .NET (C#)

* [0041-canonical-dotnet-backend-architecture](./0041-canonical-dotnet-backend-architecture.md)
* [0070-enterprise-minimal-apis-adoption](./0070-enterprise-minimal-apis-adoption.md)
* **[0071-estrategia-acceso-datos-orm-dotnet](./0071-estrategia-acceso-datos-orm-dotnet.es.md)** — EF Core predeterminado, Dapper para lecturas optimizadas
* [0060-dotnet-multi-tenancy-dual-layer-strategy](./0060-dotnet-multi-tenancy-dual-layer-strategy.md)
* [0061-transactional-event-lifecycle-ef-core](./0061-transactional-event-lifecycle-ef-core.md)
* [0062-dotnet-immutable-audit-trail](./0062-dotnet-immutable-audit-trail.md)
* [0063-dotnet-b2b-idempotency-middleware](./0063-dotnet-b2b-idempotency-middleware.md)
* **[0064-dotnet-request-scope-observability-context](./0064-dotnet-request-scope-observability-context.md)** — propagación de contexto con scope sin IHttpContextAccessor
* **[0065-dotnet-pii-safe-serilog-pipeline](./0065-dotnet-pii-safe-serilog-pipeline.md)** — enmascaramiento de PII a nivel del pipeline de Serilog
* **[0066-dotnet-lightweight-http-idempotency](./0066-dotnet-lightweight-http-idempotency.md)** — idempotencia IMemoryCache/IDistributedCache (complementa ADR-0063)

---
[Volver al Nivel Superior](../README.md) | [Patrones Canónicos](../../canonical-patterns/README.md)
