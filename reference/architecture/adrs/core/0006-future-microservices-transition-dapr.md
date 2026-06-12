# [ADR 0006](0006-future-microservices-transition-dapr.md): Future Microservices Transition with Dapr Sidecars

## Status
Approved - Backlog (Phase 3 Milestone)

## Date
2026-05-08

## Context
The system is currently a Modular Monolith (single process, logically isolated bounded contexts). As business requirements scale - higher traffic, independent deployment cycles, or polyglot service integration - a clear and safe path to microservices is required. The transition must not require rewriting any domain logic.

## Decision
Adopt **Dapr (Distributed Application Runtime)** as the microservices sidecar runtime when splitting the monolith into independent services.

**Migration milestones:**

| Milestone | Description |
| :--- | :--- |
| **M1 - Modular Monolith** | Current state. Single process with isolated bounded context modules. |
| **M2 - Service Extraction** | High-traffic or independently-deployable contexts extracted as Nx micro-projects. Activates via rules in [ADR-0045](../core/0045-microservice-extraction-readiness-criteria.md). |
| **M3 - Full Mesh** | Advanced ecosystem state where infrastructure-level interaction uses Sidecar abstraction. |

### Dapr Activation Gate
To prevent premature over-engineering, Dapr Sidecars are **NOT** active by default at Milestone 2. The organization will operate via pure Kubernetes deployment using explicit gRPC communication between services. Dapr activation is gated by the following conditions:
- The total pool of extracted services exceeds five (5).
- OR: Advanced automatic retry / transparent circuit breaking between services is demanded beyond standard client implementation capacity.
- OR: Polyglot integration requiring uniform Pub/Sub abstraction (Go/Python workloads).

### Strangler Fig Mechanics via Kong
The evolution involves the **Strangler Fig Pattern** utilizing the existing edge API Gateway (Kong) to govern gradual traffic diversion from legacy endpoints to extracted micro-units without monolith modifications:

```yaml
# Standard Strangler Routing Sample in Kong
routes:
 - name: billing-new-service
 paths: ["/api/v2/billing"] # Targeted new service version
 service: billing-service
 - name: billing-legacy
 paths: ["/api/billing"] # Gracefully retired route on monolith
 service: core-monolith
```

**Key constraint:** The domain Core must change **zero lines** when Dapr is introduced. All Dapr SDK calls are wrapped behind existing `IEventBusPort` and `ICachePort` abstractions ([ADR-0015](0015-event-driven-architecture-intra-domain.md), [ADR-0014](0014-distributed-caching-strategy-redis.md)).

## Consequences

### Positive
- Polyglot architecture: other services can be written in Go or Python while sharing Dapr capabilities.
- Swapping infrastructure (Redis -> Kafka, PostgreSQL -> Cosmos DB) requires only a Dapr component YAML change.
- Native retry policies, circuit breakers, and distributed tracing built into Dapr sidecar.

### Negative
- Adds Kubernetes/container orchestration as a prerequisite for the full mesh phase.
- Local Dapr development adds sidecar process overhead per service.

---

## Addenda: Observability Integration (Dapr + App)
With the subsequent introduction of Dapr, explicit observability mandates are enacted to prevent fragmented correlation strands:
1. **Zero SDKs in Core**: Dapr instrumentation must be invoked EXCLUSIVELY via sidecar HTTP/gRPC, strictly preventing native Dapr SDK leakage into domain layers.
2. **TraceContext Convergence**: Pre-Dapr manual correlation identifiers (`x-correlation-id`) must merge seamlessly into the W3C TraceContext (`traceparent`) injected by Dapr, governed by **[ADR-0046](0046-dapr-unified-observability.md)**.
3. **Unified Export**: Both telemetry streams (Sidecar + App) must funnel via the unified OpenTelemetry collector to maintain true end-to-end spanning visualizations.

## References
- [ADR-0015: Event-Driven Architecture](../../adrs/core/0015-event-driven-architecture-intra-domain.md)
- [ADR-0031: Schema-per-Context & Domain Event Catalog](../../adrs/core/0031-schema-per-context-domain-event-catalog.md)
- [ADR-0046: Dapr Unified Observability](./0046-dapr-unified-observability.md)
- [Dapr Documentation](https://dapr.io)





## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
