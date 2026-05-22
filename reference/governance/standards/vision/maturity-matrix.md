# Reference Skeleton Architecture Maturity Model (AMM)

## Framework Reference: TOGAF ACMM & Well-Architected Framework

## Status
Approved

## Date
2026-05-10

## Context & Purpose
As the Technical Manager and Enterprise Architect, it is critical to measure the objective quality and evolution of the Reference System using internationally recognized standards. 

This assessment document leverages a hybrid framework combining the **TOGAF Architecture Capability Maturity Model (ACMM)** (for enterprise process and governance maturity) and the **Cloud Well-Architected Framework (WAF)** (for technical and cloud-native maturity across pillars like Security, Reliability, and Operational Excellence).

---

## 1. Maturity Levels Definition (Based on TOGAF ACMM)

We evaluate the Reference Skeleton across 5 standard levels of maturity:

* **Level 1: Initial (Ad-Hoc)** - No formal architecture. IT processes are chaotic, undocumented, and reactive.
* **Level 2: Under Development** - Basic architecture process is in place. Some standards exist but are not consistently enforced.
* **Level 3: Defined** - Architecture is well-defined, documented (C4 Model, ADRs), and integrated into the SDLC.
* **Level 4: Managed** - Architecture is quantitatively measured (CodeQL, Sonar, Coverage) and governed automatically.
* **Level 5: Optimizing** - Continuous architectural improvement (Dapr evolution, progressive decoupling, auto-scaling).

---

## 2. Reference Skeleton Current Maturity Assessment (Well-Architected Pillars)

We evaluate the Reference Skeleton architecture against the 5 critical pillars of the Well-Architected Framework.

### Pillar 1: Security & Compliance
**Current Maturity Level: 4 (Managed)**
* **Evidence**: 
 * Zero-Cost Security Pipeline implemented via CodeQL ([ADR-0005](../../../architecture/adrs/core/0005-ci-cd-quality-codeql.md)).
 * Strict Dependency Pinning prevents Supply Chain attacks ([ADR-0009](../../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)).
 * Data Isolation enforced at the DB level using Row-Level Security (RLS) for multi-tenancy ([ADR-0010](../../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)).
 * Immutable Audit Trails via CDC ([ADR-0016](../../../architecture/adrs/core/0016-immutable-business-audit-trail.md)).
* **Path to Level 5**: Implement automated penetration testing in CI and dynamic secrets rotation via HashiCorp Vault.

### Jump to: Pillar 2: Performance Efficiency
**Current Maturity Level: 4 (Managed)**
* **Evidence**: 
 * High-Performance Auth Graph compilation under <5ms using Redis ([ADR-0021](../../../architecture/adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)).
 * Dual-Protocol Strategy (REST for public, gRPC for internal speed) ([ADR-0027](../../../architecture/adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)).
 * Frontend optimized payloads via BFF Gateway ([ADR-0008](../../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)).
* **Path to Level 5**: Implement serverless auto-scaling and predictive caching algorithms.

### Pillar 3: Reliability & Resiliency
**Current Maturity Level: 3 (Defined) -> Moving to 4**
* **Evidence**: 
 * Frontend Offline Resilience via React Query ([ADR-0004](../../../architecture/adrs/nodejs/0004-frontend-offline-resilience.md)).
 * Fault Tolerance via Circuit Breakers (`opossum`) and Retries ([ADR-0011](../../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)).
 * Cloud Infrastructure Multi-Region DR limits proposed ([ADR-0013](../../../architecture/adrs/core/0013-cloud-infrastructure-topology-dr.md)).
* **Path to Level 5**: Execute regular Chaos Engineering drills (Chaos Monkey) and fully active-active multi-region deployment.

### Pillar 4: Operational Excellence
**Current Maturity Level: 4 (Managed)**
* **Evidence**: 
 * Monorepo Orchestration via Nx ensures deterministic builds ([ADR-0001](../../../architecture/adrs/core/0001-monorepo-orchestration-nx.md)).
 * Comprehensive Telemetry using LGTM and OpenTelemetry ([ADR-0007](../../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)).
 * Feature Flagging allows decoupling deployment from release ([ADR-0017](../../../architecture/adrs/core/0017-feature-flagging-strategy.md)).
 * Quality Gates enforce >70% test coverage strictly via CI ([ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)).
* **Path to Level 5**: Achieve fully autonomous, zero-downtime Blue/Green automated deployments with AI-driven anomaly detection in logs.

### Pillar 5: Maintainability & Extensibility (Clean Architecture)
**Current Maturity Level: 4 (Managed)**
* **Evidence**: 
 * Strict Hexagonal Boundaries decoupling core from infra ([ADR-0002](../../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)).
 * Tactical Design Patterns (Result Monad) future-proofing the core ([ADR-0019](../../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)).
 * Event-Driven Architecture decoupling domain modules ([ADR-0015](../../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)).
 * Vendor Lock-In mitigation strategies clearly defined (Feature Flags, IdPs).
* **Path to Level 5**: Seamless transition from Modular Monolith to Dapr Microservices with zero domain code changes ([ADR-0006](../../../architecture/adrs/core/0006-future-microservices-transition-dapr.md)).

---

## 3. Executive Summary & Scoring

Based on the TOGAF ACMM criteria applied to our current architecture evaluated with support from the spec-driven AI-DD method:

**Overall Reference Skeleton Architectural Maturity Score: 3.8 / 5.0 (Defined to Managed)**

The Reference Skeleton architecture is currently transitioning from a perfectly documented system (Level 3) to a fully automated and governed system (Level 4). The strict enforcement of ADRs, static boundaries (`eslint-plugin-boundaries`), and CI/CD quality gates ensures that the system will not degrade into technical debt. 

To reach **Level 5 (Optimizing)**, the engineering organization must focus on Chaos Engineering, Multi-Region Active-Active deployments, and the eventual split into Dapr microservices as operational load demands it.

---

## AI-Augmented Dimension (Optional)

For products that adopt the AI-Augmented engineering section, a complementary maturity matrix exists with 3 levels: AI-Assisted, AI-Integrated, and AI-Orchestrated.

-> [View AI Maturity Matrix](../ai-augmented/07-maturity-model/ai-maturity-matrix.md)


---
[Back to Index](./README.md)
