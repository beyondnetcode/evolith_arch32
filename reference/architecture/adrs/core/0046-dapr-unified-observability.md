# [ADR 0046](0046-dapr-unified-observability.md): Dapr Adoption and Traceability Unification with Existing Observability Stack

## Status
Approved

## Date
2026-05-12

## Context
During **Phase 1 (pre-Dapr)** of architectural evolution, the ecosystem matured a comprehensive corporate observability stack. This stack leverages structured logging (JSON), manually injects a distributed correlation identifier (`x-correlation-id`) at entry points (BFF/Gateway), and aggregates this telemetry into Elastic/Grafana for diagnosis and alerting.

In **Phase 2 (current state)**, we are commencing the systematic adoption of **Dapr** as an infrastructure sidecar to facilitate the evolutionary leap toward microservices and abstract cross-cutting capabilities (State, PubSub, Secrets).

Dapr introduces native, automatic telemetry emission following the W3C TraceContext standard by injecting the `traceparent` header. This creates a **detected design flaw**: should the application persist in utilizing its manual `x-correlation-id` in parallel with the Dapr-injected trace context, observability telemetry will fracture into two disjoint streams within Elastic/Grafana (one for infrastructure, one for runtime). This fractures End-to-End (E2E) visibility and directly violates the corporate unified traceability directive.

## Decision
We hereby mandate the absolute unification of infrastructure and application telemetry governed by the following engineering directives:

1. **Sidecar Adoption**: Standardize on Dapr as the primary mechanism for inter-service communication and infrastructure component integration, in full alignment with [ADR-0006](../core/0006-future-microservices-transition-dapr.md).
2. **Correlation Unification (Pivot to W3C)**: The application MUST **deprecate manual correlation identifier generation**. Instead, it will dynamically extract the `trace-id` from the auto-injected Dapr `traceparent` header and set this as the primary pivot value across all application structured log metadata.
3. **Span Linking**: Application log records MUST also encompass the active `span-id` metadata field to explicitly bind discrete log entries to distinct segments within the distributed execution timeline.
4. **OpenTelemetry-Driven Instrumentation**: Utilize the platform-agnostic OpenTelemetry SDK within the application runtime to naturally inherit and propagate the TraceContext across all internal domain executions, ensuring trace persistence.
5. **Ingestion Alignment**: Log transport and ingestion agents (Filebeat, Vector, APM Server) will be reconfigured to map their centralized indexing fields to the standardized `trace_id` field (superseding `x-correlation-id`), securing dashboard backward-compatibility following a minor query refactor.
6. **Prohibition of Proprietary SDKs**: Importing explicit Dapr or Elastic client SDKs directly into the core domain model remains strictly prohibited. All communication interactions with the Dapr sidecar will strictly route through local HTTP/gRPC channels leveraging infrastructure-tier ports and adapters to preserve framework detachment.

## Consequences

### Positive
- **Holistic Traceability**: Ensures workflows navigating from client requests, traversing the Edge Gateway, through the Dapr Sidecar, and into service logic are presented in a singular, unbroken chronological timeline.
- **Accelerated Diagnostics**: Consolidated dashboards now inherently aggregate granular infrastructure latency bottlenecks (from Dapr) and business logic errors (from app logs) under a unified filter criterion.
- **Asset Preservation**: Retains current robust logging infrastructure with adjustments limited strictly to Edge Middleware/Interceptors responsible for context propagation.

### Negative
- **Dashboard Refactoring**: Demands a remediation cycle to migrate legacy Grafana Dashboards and Elastic saved queries to track against the revised metadata schema (`trace_id`).
- **Learning Overhead**: Requires delivery team enablement covering technical mastery over the mechanics and topology of the W3C TraceContext standard.

## References
- [ADR-0006: Future Microservices Transition with Dapr](../core/0006-future-microservices-transition-dapr.md)
- [Reference Blueprint - Observability Integration](../../blueprints/reference-blueprint.md#31-overall-context-pattern---full-stack-with-gateway-tiers-and-injectable-event-bus)
- [Engineering Manifesto - Infrastructure Isolation](../../../governance/standards/engineering/engineering-manifesto.md)
- [Authoritative Tech Stack - Validated Runtimes](../../blueprints/authoritative-tech-stack.md)

---
[Back to Index](./README.md)
