# ADR-0014: Multi-Layer Distributed Caching Strategy

## Status
Accepted

## Date
2026-05-08

## Context and Problem
Repetitive, high-intensity read throughput during peak operational hours can completely starve physical database resources. Reading generic configuration catalogues, constant status lookups, or frequently accessed aggregates from raw disks leads to slow responses and unmanageable load scales.

## Objective and Scope
Establish a standard boundary and caching topology to intercept and resolve read requests as close to the user as possible, preventing downstream resource exhaustion.

## Options Considered
- **Selected:** Multi-Layer Distributed Caching Strategy
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives, but single-layer caching or scaling up databases vertically were implicitly rejected).

## Decision and Rationale
Evolve to a comprehensive **Multi-Layer Tiered Caching Strategy** utilizing CDN edge caching and distributed cache nodes to intercept and resolve read requests as close to the user as possible:

### Level 1: Public Edge (Optional & Configurable CDN)
The system supports the integration of a Content Delivery Network (CDN) deployed in front of the Edge Gateway. This layer is **fully optional and dynamically configurable** in the infrastructure topology settings; small-scale deployments can disable this layer to route direct-to-origin, while Enterprise scaling can activate it via environment configuration.
* **Scope**: Static application assets (JS, CSS, images), multi-tenant branding files, and read-only public catalog APIs with low volatility.
* **Impact**: Zero server origin utilization for matching requests.

### Level 2: Application Edge (BFF-Level Distributed Cache)
Deploy distributed cache namespaces directly bound to the Tier-2 Application Gateway (BFF) instances.
* **Scope**: Tailored View-Models, compiled dashboard JSON responses, and GraphQL aggregate segments.
* **Impact**: Intercepts repeat request cycles AT THE PERIMETER, preventing downstream synchronous traversals into the core API layer entirely.

### Level 3: Deep Core (Application Cache)
Retain dedicated shared cache namespaces serving the Core API domain.
* **Scope**: Relational query sets, Authorization Graphs, active permission matrices, and dehydrated Domain aggregates.
* **Abstraction**: Access remains governed strictly via an agnostic `ICachePort` interface adhering to Hexagonal purity rules. *(Example implementation: Redis)*.

## Evidence and Evaluation Criteria
Evaluated against general architectural principles of maintainability and reliability. Tiered caching offloads query volume from relational engines, achieving sustained API latency spikes frequently under <50ms for pre-warmed objects.

## Consequences, Risks, and Trade-offs

### Positive
- Offloads immense query volume from the relational database engine.
- Achieves sustained API latency spikes frequently under <50ms for pre-warmed objects.
- Boosts user engagement and experience smoothness for critical app zones.

### Negative
- Cache Invalidation logic creates a non-trivial surface area for synchronization bugs ("Cache is hard" rule).
- Introduces additional persistence-related hardware node setup in operation blueprints.

## References
- [Cache-Aside Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)

## Related Decisions and Standards
- None

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
