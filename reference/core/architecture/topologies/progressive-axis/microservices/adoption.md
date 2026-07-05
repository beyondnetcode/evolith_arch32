# Microservices — Adoption Guide

> **Bilingual Navigation:** [English](./adoption.md) | [Español](./adoption.es.md)

**Owner:** Architecture Board
**Topology:** Microservices

## Entry Criteria

Microservices adoption requires reaching at least 80% maturity in the Foundation (F2) phase. Premature decomposition creates distributed monoliths. Validate the following before entering F3:

- CI/CD pipeline operational with automated testing
- Container runtime proven in staging
- Observability stack deployed (tracing, logging, metrics)
- Team readiness assessment completed

## Team Ownership

Apply **MS-R08** (On-Call Ownership). Each service must have a designated owning team. The owning team is responsible for development, testing, deployment, and on-call support. No service may exist without clear ownership.

## Polyglot Support

Microservices enable polyglot technology choices per service. Teams may choose different languages and frameworks based on domain fit. Enforce common standards for: logging format, trace propagation, health probe endpoints, and API contracts.

## Adoption Checklist

- [ ] F2 maturity >= 80% validated
- [ ] Service decomposition boundaries defined (DDD bounded contexts)
- [ ] CI/CD pipeline per service (or pipeline factory)
- [ ] Service mesh deployed and mTLS enforced
- [ ] Contract testing framework integrated
- [ ] Observability stack operational (tracing, logging, metrics, dashboards)
- [ ] On-call rotation established per service
- [ ] Secret management integrated
- [ ] Cost attribution labels applied
- [ ] Decommissioning process documented

## Migration Strategy

Migrate incrementally using the Strangler Fig pattern. Extract one bounded context at a time. Validate each extraction before proceeding. Never attempt a big-bang migration.

## Anti-Patterns to Avoid

- Distributed monolith: services that must deploy together
- Nano-services: services too small to justify operational overhead
- Shared databases: violating MS-R06
- Missing ownership: services without on-call coverage (MS-R08)

## References

| Rule | Description |
|------|-------------|
| **MS-R08** | On-Call Ownership |

---
[Back to Microservices Profile](./README.md)
