# Microservices — Operations Guide

> **Bilingual Navigation:** [English](./operations.md) | [Español](./operations.es.md)

**Owner:** Architecture Board
**Topology:** Microservices

## Container Orchestration

Kubernetes is the standard orchestration layer for microservices. Each service runs as a Deployment with its own Pod template, resource requests, and readiness/liveness probes. Use Namespaces to enforce logical separation between teams and environments.

## Distributed Tracing

Instrument every service with OpenTelemetry. Propagate trace context across HTTP, gRPC, and message boundaries. Export traces to a collector (Jaeger, Tempo, or Azure Monitor) for correlation across service hops.

## Log Aggregation

Adopt structured JSON logging with correlation IDs. Ship logs to a centralized system (ELK, Loki, or Azure Log Analytics). Ensure each log entry includes service name, trace ID, and request ID for cross-service troubleshooting.

## Service Mesh

Deploy a service mesh (Istio, Linkerd, or Consul Connect) to handle mTLS, traffic management, and observability without application changes. Enforce **MS-R02** (Service Mesh/mTLS) at the mesh layer. Use mesh-native retries and timeouts instead of custom retry logic.

## Deployment Strategies

- **Canary**: Route a percentage of traffic to the new version before full rollout.
- **Blue-Green**: Deploy alongside the current version and switch traffic atomically.
- **Rolling**: Update pods incrementally with configurable surge and unavailable settings.

All strategies must respect **MS-R01** (Independent Deployability) — each service ships independently.

## SLA Monitoring

Define SLOs per service (**MS-R07**). Track error budgets and burn rates. Alert on budget exhaustion before user impact. Publish a live SLO dashboard per service and maintain a centralized SLA compliance report.

## References

| Rule | Description |
|------|-------------|
| **MS-R01** | Independent Deployability |
| **MS-R02** | Service Mesh / mTLS |
| **MS-R07** | SLOs |
| **ADR-0045** | Service mesh adoption decision |
| **ADR-0047** | Observability stack selection |

---
[Back to Microservices Profile](./README.md)
