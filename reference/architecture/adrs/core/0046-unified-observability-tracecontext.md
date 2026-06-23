# ADR-0046: Unified Traceability via W3C TraceContext

## Status
Approved

## Date
2026-05-12

## Context and Problem
The ecosystem originally relied on manually injected distributed correlation identifiers (`x-correlation-id`) at entry points (BFF/Gateway) to aggregate telemetry into elastic/grafana dashboards. As the architecture evolved to incorporate sidecars and complex service meshes, these manual headers caused fractured telemetry streams. Sidecars automatically emit telemetry following the W3C TraceContext standard (`traceparent`). Keeping the manual identifier parallel to the sidecar-injected trace context fractures End-to-End (E2E) visibility and directly violates the corporate unified traceability directive.

## Objective and Scope
Mandate absolute unification of infrastructure and application telemetry to maintain an unbroken chronological timeline of workflows across gateways, sidecars, and domain logic.

## Options Considered
- **Selected:** Unified Traceability via W3C TraceContext
- **Others:** Maintaining parallel correlation IDs (rejected due to fractured telemetry and impossible E2E tracing).

## Decision and Rationale
We hereby mandate the absolute unification of infrastructure and application telemetry governed by the following engineering directives:

1. **Correlation Unification (Pivot to W3C)**: The application MUST **deprecate manual correlation identifier generation**. Instead, it will dynamically extract the `trace-id` from the auto-injected W3C `traceparent` header provided by infrastructure sidecars, setting this as the primary pivot value across all application structured log metadata.
2. **Span Linkage**: Application logs MUST also encompass the active `span-id` to enable direct anchoring between a log line and a specific execution tree segment in distributed tracing.
3. **OpenTelemetry Instrumentation**: The agnostic OpenTelemetry SDK will be utilized at runtime to inherit and propagate the TraceContext header throughout internal domain execution.
4. **Ingestion Alignment**: Transport agents (Filebeat, Vector, APM Server) must be reconfigured to map their indexing fields to the standard `trace_id` field identifier (replacing `x-correlation-id`).

## Evidence and Evaluation Criteria
Evaluated against general architectural principles of maintainability and reliability. Unified tracing is the industry standard (W3C) and guarantees zero blind spots in distributed microservice topologies.

## Consequences, Risks, and Trade-offs

### Positive
- **Holistic Traceability**: Ensures workflows navigating from client requests, traversing edge gateways, through sidecars, and into service logic are presented in a singular, unbroken chronological timeline.
- **Accelerated Diagnostics**: Consolidated dashboards now inherently aggregate granular infrastructure latency bottlenecks and business logic errors under a unified filter criterion.

### Negative
- **Dashboard Refactoring**: Demands a remediation cycle to migrate legacy dashboards and saved queries to track against the revised metadata schema (`trace_id`).
- **Learning Overhead**: Requires delivery team enablement covering technical mastery over the mechanics and topology of the W3C TraceContext standard.

## References
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)

## Related Decisions and Standards
- [ADR-0006: Microservices Transition via Sidecar Pattern](./0006-microservices-transition-sidecar-pattern.md)
- [Node.js ADR-0007: Observability Telemetry OTel](../nodejs/0007-observability-telemetry-loki-opentelemetry.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
