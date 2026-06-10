# [ADR 0045](0045-microservice-extraction-readiness-criteria.md): Microservice Extraction Readiness Criteria

## Status
Approved

## Date
2026-05-12

## Context
[ADR 0006](../core/0006-future-microservices-transition-dapr.md) outlines the evolution milestones from a Modular Monolith toward Microservices, and [ADR-0047](../core/0047-architectural-patterns-monolith-soa-microservices.md) provides the overarching macro selection framework. However, specific quantitative triggers were needed to physically activate a service extraction. Without these explicit rules, partition decisions run the risk of being driven by intuition or pressure, which often result in migration failures and premature operational burden.

## Decision
Formalize the **"2 out of 4" rule** as the mandatory quantitative trigger for extracting a Bounded Context into an independent service.

A domain module MUST be deemed a valid candidate for the extraction phase (Milestone 2) if, and only if, it satisfies at least 2 of the following 4 criteria over a sustained evaluation period of at least 15 days:

| Criterion | Target Threshold | Architectural Rationale |
| :--- | :--- | :--- |
| **1. Critical Latency** | Sustained latency P95 > 200ms. | Indicates module-specific CPU/Memory contention bleeding into the rest of the monolith. |
| **2. Release Frequency** | > 4 independent deployments per week. | High velocity demanding isolated CI/CD cycles to avoid blocking concurrent squad releases. |
| **3. Team Autonomy** | > 80% of commits belong to a single Squad. | Clear organizational boundary (Conway's Law); minimizes inter-squad communication overhead. |
| **4. Data Density** | DB engine payload > 20% of total instances. | I/O bottleneck justifying migration to a physically dedicated per-service database. |

### Extraction Operational Procedure:
1. **Validation:** Squad Lead Developer presents verified telemetry metrics to the Architectural Board.
2. **Temporal Isolation:** Configuration of API Gateway (Kong) routing to enable the Strangler Fig pattern.
3. **DB Decoupling:** Database schema migration into an independent instance following Phase 2 of the Database Migration Path ([ADR-0031](../core/0031-schema-per-context-domain-event-catalog.md)).

## Consequences

### Positive
- Eliminates subjectivity in the surgical partition of distributed systems.
- Prevents the "Premature Microservices" antipattern, safeguarding DevOps bandwidth.
- Explicit alignment with data-driven metrics and observable telemetry.

### Negative
- Mandates fully operational observability ([ADR-0007](../nodejs/0007-observability-telemetry-loki-opentelemetry.md)) to accurately capture per-module P95 health indicators.

## References
- [ADR 0006: Future Microservices Transition](../core/0006-future-microservices-transition-dapr.md)
- [ADR 0047: Selection Framework: Monolith vs SOA vs Microservices](../core/0047-architectural-patterns-monolith-soa-microservices.md)
- Sam Newman - *Building Microservices* (2nd Ed. 2021)




## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
