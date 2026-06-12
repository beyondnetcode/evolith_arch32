# [ADR 0014](0014-distributed-caching-strategy-redis.md): Multi-Layer Distributed Caching Strategy

## Status
Approved

## Date
2026-05-08

## Context
Repetitive, high-intensity read throughput during peak operational hours can completely starve physical PostgreSQL resources. Reading generic configuration catalogues, constant status lookups, or frequently access aggregates from raw disks leads to slow responses and unmanageable load scales.

## Decision
Evolve to a comprehensive **Multi-Layer Tiered Caching Strategy** utilizing CDN edge caching and distributed Redis nodes to intercept and resolve read requests as close to the user as possible:

### Level 1: Public Edge (Optional & Configurable CDN)
The system supports the integration of a Content Delivery Network (CDN) (e.g., Cloudflare, Akamai) deployed in front of the Kong Edge Gateway. This layer is **fully optional and dynamically configurable** in the infrastructure topology settings; small-scale deployments can disable this layer to route direct-to-origin, while Enterprise scaling can activate it via environment configuration.
* **Scope**: Static application assets (JS, CSS, images), multi-tenant branding files, and read-only public catalog APIs with low volatility.
* **Impact**: Zero server origin utilization for matching requests.

### Level 2: Application Edge (BFF-Level Redis Cache)
Deploy Redis caching namespaces directly bound to the Tier-2 NestJS BFF instances.
* **Scope**: Tailored View-Models, compiled dashboard JSON responses, and GraphQL aggregate segments.
* **Impact**: Intercepts repeat request cycles AT THE PERIMETER, preventing downstream synchronous gRPC traversals into the core API layer entirely.

### Level 3: Deep Core (Application Redis Cache)
Retain dedicated shared Redis namespaces serving the Core API domain.
* **Scope**: Relational query sets, Authorization Graphs, active permission matrices, and dehydrated Domain aggregates.
* **Abstraction**: Access remains governed strictly via the `ICachePort` interface adhering to Hexagonal purity rules.

## Consequences

### Positive
- Offloads immense query volume from the relational SQL engine.
- Achieves sustained API latency spikes frequently under <50ms for pre-warmed objects.
- Boosts user engagement and experience smoothness for critical app zones.

### Negative
- Cache Invalidation logic creates a non-trivial surface area for synchronization bugs ("Cache is hard" rule).
- Introduces additional persistence-related hardware node setup in operation blueprints.

## References
- [Redis Cache-Aside Pattern](https://redis.io/docs/develop/cache/)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)




## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
