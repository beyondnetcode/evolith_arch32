# Evolith — Master Architectural Directives & Evolution Strategy

> **Bilingual Navigation:** [Versión en Español](../../standards/vision/architectural-directives.md)

**Status:** Approved
**Owner:** Evolith Architecture Board
**Last reviewed:** 2026-05-22

This document establishes the non-negotiable architectural directives that govern every product instantiated from this reference. It defines the baseline quality bar, the evolution philosophy, and the constraints that any architectural decision must satisfy.

---

## 1. Global System Objectives

The **Evolith** platform is designed to anchor all corporate products upon delivery standards that secure long-term technical viability without sacrificing early-stage simplicity.

---

## 2. Master Technical Requirements & Evolution

All products instantiated from this blueprint MUST align with the following directives:

### 2.1 Progressive Progression
Systems are initiated as a **Modular Monolith** (Nx-based) to guarantee rapid initial time-to-market. Domain modules are logically isolated via strict library boundaries from day one, enabling surgical extraction into independent **Microservices** without requiring domain-layer rewrites. See the quantitative extraction triggers in [ADR-0045](../../../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md) and the selection framework in [ADR-0047](../../../architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md).

**Stages:**
```text
Simple Monolith -> Modular Monolith -> Distributed Modules -> Microservices
```

No stage is skipped. No stage is mandatory beyond what the business, team size, and operational complexity objectively demand.

### 2.2 High Concurrency Readiness
The system MUST sustain sudden, non-uniform bursts of user load. This is achieved through:
- Auto-scaling container topology ([ADR-0028](../../../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md))
- 4-tier caching strategies ([ADR-0014](../../../architecture/adrs/core/0014-multi-layer-distributed-caching-strategy.md))
- Non-blocking Event Bus abstraction ([ADR-0015](../../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md))

### 2.3 Transactional Integrity
Every state mutation must be strictly atomic. Inconsistent write states are prevented through explicit Unit of Work controls and, where async propagation is required, the Transactional Outbox pattern ([ADR-0033](../../../architecture/adrs/core/0033-transactional-outbox-pattern.md)).

### 2.4 Secure, Dynamic, and Extensible
Zero-Trust architecture principles apply from Phase 1. Infrastructure adapters are fully decoupled from domain logic, allowing new external tools or services to be hot-swapped without impacting core value streams. Identity providers, event buses, caches, and storage engines are all injectable via the Port/Adapter boundary.

### 2.5 Domain Sovereignty
The Domain layer must contain zero references to cloud SDKs, ORM libraries, or HTTP frameworks. The Domain is the stable center; infrastructure is the replaceable detail. Violation of this rule automatically fails Architecture Gate validation.

---

## 3. Governing Constraints

| Constraint | Enforcement Mechanism | Reference |
| :--- | :--- | :--- |
| Hexagonal Architecture mandatory | `eslint-plugin-boundaries` CI gate | [ADR-0002](../../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md) |
| No premature microservice extraction | "2 of 4" quantitative rule enforced by Architecture Board | [ADR-0045](../../../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md) |
| Schema-per-Context from day one | Cross-schema SQL joins are architecturally prohibited | [ADR-0031](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md) |
| Contract-First inter-service communication | OpenAPI (public), gRPC/Protobuf (internal), AsyncAPI (async) | [ADR-0040](../../../architecture/adrs/core/0040-multi-runtime-selection-contracts.md) |
| Infrastructure portability | S3-compatible storage, OSS-first tool selection | [ADR-0028](../../../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md) |
| Minimum test coverage | 70% enforced in CI; Testcontainers for integration tests | [ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md) |
| Unified distributed tracing | OpenTelemetry W3C TraceContext, no proprietary APM agents | [ADR-0007](../../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md) |
| Naming standards | Ubiquitous Language as source of truth, automated linting | [ADR-0056](../../../architecture/adrs/core/0056-enterprise-naming-design-conventions.md) |

---

## 4. Supplemental Reading

- [Evolutionary Strategy Roadmap](./evolutionary-strategy-roadmap.md) — Phase-by-phase technical roadmap with measurable KPIs
- [Maturity Assessment](./maturity-assessment.md) — TOGAF ACMM assessment, anti-pattern immunization, and pattern readiness
- [Reference Blueprint](../../../architecture/blueprints/reference-blueprint.md) — Full C4 architectural model

---

*Extracted from original scope analysis for universal enforcement.*

---
[Back to Index](./README.md)
