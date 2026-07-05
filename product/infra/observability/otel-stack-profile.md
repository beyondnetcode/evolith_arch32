# Provider Profile: OpenTelemetry Stack (Observability)

> **Bilingual navigation:** [Versión en Español](./otel-stack-profile.es.md)

**Category:** Observability (`observability`)
**Provider:** OpenTelemetry (CNCF)
**Profile Status:** Active / Default

## 1. Capability Coverage
The OpenTelemetry (OTel) stack provides vendor-neutral telemetry data collection.
It satisfies the following core observability capabilities:
- Distributed tracing (W3C Trace Context)
- Metrics collection (counters, gauges, histograms)
- Structured log ingestion and correlation
- Unified Collector for parsing, filtering, and exporting telemetry data

## 2. Limitations and Gaps
- OTel is a collection standard, not a storage or visualization backend; it must be paired with backends like Jaeger, Prometheus, or Datadog.
- Overhead considerations apply when sampling 100% of traces in high-throughput services.

## 3. Deployment Modes
- **Supported:** Application SDK (in-process), Local Agent/Sidecar, Gateway Collector.
- **Default:** Agent/Sidecar deployment per node forwarding to a central Gateway Collector.

## 4. Licensing and Redistribution Constraints
- Licensed under Apache License 2.0 (Open Source).
- No redistribution constraints for internal usage.

## 5. Tenant Isolation and Data Residency
- Telemetry data must be tagged with tenant IDs if processed in a multi-tenant backend.
- The OTel Collector can route telemetry to different storage backends based on data residency requirements (e.g., routing EU telemetry to an EU-based storage backend).

## 6. Security and Compliance Considerations
- PII/PHI must be scrubbed using the OTel Collector processor pipeline before export to external systems.
- mTLS must be used between application SDKs, Collectors, and backend storage.

## 7. Adapter and ACL Mapping
Products implement Evolith's abstract `ITelemetryProvider`, which maps internally to OTel SDKs (e.g., `@opentelemetry/api` in Node.js). 

## 8. Evidence Produced
- Correlated Trace IDs across microservice boundaries.
- Error logs linked to specific transaction traces.
- Custom business metrics.

## 9. Replaceability and Migration
While OTel itself is the abstraction layer protecting against vendor lock-in for storage backends, migrating *away* from OTel would involve:
1. Rewriting the `ITelemetryProvider` to use a proprietary vendor SDK (e.g., native Datadog or New Relic libraries).
2. Updating context propagation headers across all services.

## 10. Current Sources and Official References
- [OpenTelemetry Official Documentation](https://opentelemetry.io/docs/)
- [CNCF OTel Project](https://www.cncf.io/projects/opentelemetry/)

## 11. ADRs
- None specific to this provider.
