# .NET (C#) ADR Index

* [0041-canonical-dotnet-backend-architecture](./0041-canonical-dotnet-backend-architecture.md)
* [0070-enterprise-minimal-apis-adoption](./0070-enterprise-minimal-apis-adoption.md)
* **[0071-dotnet-data-access-orm-strategy](./0071-dotnet-data-access-orm-strategy.md)** — EF Core default, Dapper for optimized reads
* [0060-dotnet-multi-tenancy-dual-layer-strategy](./0060-dotnet-multi-tenancy-dual-layer-strategy.md)
* [0061-transactional-event-lifecycle-ef-core](./0061-transactional-event-lifecycle-ef-core.md)
* [0062-dotnet-immutable-audit-trail](./0062-dotnet-immutable-audit-trail.md)
* [0063-dotnet-b2b-idempotency-middleware](./0063-dotnet-b2b-idempotency-middleware.md)
* **[0064-dotnet-request-scope-observability-context](./0064-dotnet-request-scope-observability-context.md)** — scoped context propagation without IHttpContextAccessor
* **[0065-dotnet-pii-safe-serilog-pipeline](./0065-dotnet-pii-safe-serilog-pipeline.md)** — PII masking at Serilog pipeline level
* **[0066-dotnet-lightweight-http-idempotency](./0066-dotnet-lightweight-http-idempotency.md)** — IMemoryCache/IDistributedCache idempotency (complements ADR-0063)
* **[0069-dotnet-grpc-service-setup-protobuf-contracts](./0069-dotnet-grpc-service-setup-protobuf-contracts.md)** — canonical .NET gRPC server setup, IHttpClientFactory clients, OTel instrumentation

---
[Back to Upper Level](../README.md) | [Canonical Patterns](../../canonical-patterns/README.md)
