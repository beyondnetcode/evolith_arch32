# [ADR 0006](0006-microservices-transition-sidecar-pattern.md): Microservices Transition via Sidecar Pattern

## Status
Approved - Backlog (Phase 3 Milestone)

## Date
2026-05-08

## Context and Problem
The system is currently a Modular Monolith (single process, logically isolated bounded contexts). As business requirements scale - higher traffic, independent deployment cycles, or polyglot service integration - a clear and safe path to microservices is required. The transition must not require rewriting any domain logic.

## Objective and Scope
Establish the standard architectural pattern for managing distributed infrastructure concerns (state, pub/sub, secrets) when extracting services from the monolith, abstracting these from the application code.

## Options Considered
- **Selected:** Sidecar Pattern for Microservices Transition
- **Others:** 
  - Thick SDKs / Shared Libraries (rejected due to language coupling and deployment friction).
  - Service Mesh only (rejected as it doesn't abstract application-level resources like State or Pub/Sub).

## Decision and Rationale
Adopt the **Sidecar Pattern** as the standard distributed application runtime when splitting the monolith into independent services.

**Migration milestones:**
| Milestone | Description |
| :--- | :--- |
| **M1 - Modular Monolith** | Current state. Single process with isolated bounded context modules. |
| **M2 - Service Extraction** | High-traffic or independently-deployable contexts extracted as isolated micro-projects. Activates via rules in [ADR-0045](../core/0045-microservice-extraction-readiness-criteria.md). |
| **M3 - Full Mesh** | Advanced ecosystem state where infrastructure-level interaction utilizes the Sidecar abstraction. |

### Sidecar Activation Gate
To prevent premature over-engineering, Sidecars are **NOT** active by default in Milestone 2. The organization will initially operate via pure Kubernetes deployments using explicit gRPC communication between services. Sidecar activation is gated by:
- Total pool of extracted services exceeds five (5).
- OR: Advanced transparent automatic retry / circuit breaking is mandated exceeding standard client capability.
- OR: Polyglot integration requiring uniform Pub/Sub abstraction (Go/Python workloads).

### Strangler Fig Mechanics via Gateway
Evolution utilizes the **Strangler Fig Pattern** leveraging the existing edge API Gateway to govern gradual traffic diversion from legacy endpoints to extracted micro-units without modifying the monolith.

**Key constraint:** The domain Core must change **zero lines** when the sidecar is introduced. All infrastructure calls are wrapped behind existing `IEventBusPort` and `ICachePort` abstractions ([ADR-0015](0015-event-driven-architecture-intra-domain.md), [ADR-0014](0014-multi-layer-distributed-caching-strategy.md)). *(Example implementation: Dapr)*.

## Evidence and Evaluation Criteria
Evaluated against general architectural principles of maintainability and reliability. Abstracting infrastructure via a Sidecar (like Dapr) allows changing underlying components (Redis to Kafka) without application redeployment.

## Consequences, Risks, and Trade-offs

### Positive
- Polyglot architecture: other services can be written in Go or Python while sharing infrastructure capabilities.
- Infrastructure swapping only requires a YAML change in the sidecar component.
- Native retry policies, circuit breakers, and distributed tracing built into the sidecar.

### Negative
- Adds container orchestration overhead as a prerequisite for the full mesh phase.
- Local development adds sidecar process overhead per service.

## Addenda: Observability Integration (Sidecar + App)
With the subsequent introduction of sidecars, explicit observability mandates are enacted to prevent fragmented correlation strands:
1. **Zero SDKs in Core**: Infrastructure instrumentation must be invoked EXCLUSIVELY via sidecar HTTP/gRPC, strictly preventing native SDK leakage into domain layers.
2. **TraceContext Convergence**: Pre-sidecar manual correlation identifiers (`x-correlation-id`) must merge seamlessly into the W3C TraceContext (`traceparent`) injected by the sidecar, governed by **[ADR-0046](0046-unified-observability-tracecontext.md)**.
3. **Unified Export**: Both telemetry streams (Sidecar + App) must funnel via the unified OpenTelemetry collector to maintain true end-to-end spanning visualizations.

## References
- None

## Related Decisions and Standards
- [ADR-0015: Event-Driven Architecture](../../adrs/core/0015-event-driven-architecture-intra-domain.md)
- [ADR-0031: Schema-per-Context & Domain Event Catalog](../../adrs/core/0031-schema-per-context-domain-event-catalog.md)
- [ADR-0046: Unified Observability](./0046-unified-observability-tracecontext.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
