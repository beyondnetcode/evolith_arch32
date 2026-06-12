# [ADR 0007](0007-observability-telemetry-loki-opentelemetry.md): Observability with OpenTelemetry, Loki, and Jaeger

## Status
Approved

## Date
2026-05-08

## Context
Without structured logging and distributed tracing, diagnosing production issues requires guesswork. Log messages without correlation IDs make it impossible to trace a single user request across multiple service layers (Kong -> BFF -> Core API -> Database). Observability must be a first-class citizen, not an afterthought.

## Decision
Adopt the **OpenTelemetry (OTel)** standard as the unified observability backbone, with the following toolchain:

| Signal | Technology | Purpose |
| :--- | :--- | :--- |
| **Traces** | OpenTelemetry SDK + Jaeger | Distributed request tracing across all tiers |
| **Logs** | Pino + Grafana Loki | Structured JSON log aggregation and querying |
| **Metrics** | Prometheus + Grafana | SRE metrics: latency, error rate, throughput |

**Implementation rules:**

1. **Auto-instrumentation**: NestJS HTTP, TypeORM, and Redis calls are automatically instrumented via OTel auto-instrumentation packages - no manual span creation required for standard flows.
2. **Vendor-Agnostic Routing**: The application MUST ONLY emit vendor-neutral telemetry to a local **OpenTelemetry Collector**. Switching final backends (e.g., from Jaeger to Datadog, or Loki to Elastic) requires changing ONLY the Collector's YAML config, with **zero modifications or redeployments** to application source code.
3. **Manual spans**: Business-significant operations (use case execution, cache misses) get explicit `tracer.startSpan()` wrapping.
4. **Trace propagation**: All outbound HTTP calls include `traceparent` headers (W3C Trace Context standard).
5. **Structured logs**: Every log entry includes `traceId`, `spanId`, `tenantId`, and `userId` for full correlation.

## Consequences

### Positive
- Single `traceId` traces a request from the Kong gateway log all the way to the PostgreSQL query plan.
- Grafana dashboards provide SRE-level visibility with P50/P95/P99 latency breakdowns.
- Zero code changes to the domain Core - all instrumentation lives in the infrastructure and adapter layers.
- **Absolute Tech Sovereignty**: Zero vendor lock-in. The OTel protocol decouples us from Datadog, Dynatrace, Grafana, or any commercial vendor natively.

### Negative
- OTel Collector is an additional infrastructure component to deploy and maintain.
- Careless span creation can introduce performance overhead; auto-instrumentation must be profiled.

## References
- [OpenTelemetry Documentation](https://opentelemetry.io)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)







## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
