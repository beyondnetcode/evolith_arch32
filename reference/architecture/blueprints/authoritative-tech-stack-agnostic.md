# Universal Architecture Standards (Agnostic Baseline)

> **Bilingual Navigation:** [Versión en Español](../blueprints/authoritative-tech-stack-agnostic.md)

**Document Type:** Corporate Standard 
**Applicability:** Mandatory for all Runtimes (.NET, Node.js, Android) 
**Sovereignty:** 100% Cloud-Agnostic / On-Premise Capable

---

## Scope Boundary

This document defines **runtime-agnostic architectural rules**. It must not be read as a Node.js, .NET, database, gateway, or cloud-provider mandate.

Concrete tooling belongs in runtime profiles:

- [.NET / C# stack profile](./authoritative-tech-stack-dotnet.md)
- [Node.js / TypeScript stack profile](./authoritative-tech-stack-nodejs.md)
- [Android / Kotlin stack profile](./authoritative-tech-stack-android.md)

The applied reference implementation lives in the [UMS repository](https://github.com/beyondnetcode/ums). Evolith keeps only reusable standards, ADRs, blueprints, governance rules, and reference documentation; executable details, concrete product tooling, and applied example code belong in UMS or other satellite repositories.

## 1. Executive Constraints & Non-Negotiables

Regardless of the concrete technology stack chosen (Node.js, .NET, or Kotlin), every component integrating into the ecosystem MUST strictly adhere to these systemic architectural invariants. Violation of these constraints will automatically fail Architecture Gate validation.

* **Architectural Core:** Hexagonal Architecture (Ports & Adapters). In Phase 1, Ports (domain contracts) and Adapters (concrete implementations) are MANDATORY but must remain simple and direct. Each port should have a single direct implementation, without additional layers. Complex anti-corruption wrappers and facades are postponed to phases involving external integration. 
* **Zero SDK Policy:** The absolute Domain layer MUST contain ZERO references, imports, or dependencies to Cloud-Provider SDKs (AWS, Azure), ORM libraries, or specific HTTP Frameworks.
* **Infrastructure as Detail:** Persistence layers, message buses, and caching stores MUST only be interacted with via abstract Domain Ports.
* **Progressive Deployment Guarantee:** All backend components MUST be packaged as standard containers (OCI). Infrastructure complexity evolves alongside system maturity: Phase 1 allows deployment on minimum compute (VM, App Service, or Docker Compose); Kubernetes is mandatory from decoupled service architectures onward (Phase 3+). Air-gapped compatibility is planned from onset but scales into full execution later.

---

## 2. Communication & Contract Standards

Inter-service integration follows the "Contract First" doctrine to guarantee polyglot interoperability.

| Standard Domain | Required Definition | Rationale |
| :--- | :--- | :--- |
| **Internal Sync Communication** | **gRPC (Protocol Buffers)** | Mandated from Phase 2 for cross-service invocations ([ADR-0047](../adrs/core/0047-architectural-patterns-monolith-soa-microservices.md)). Phase 1 operations are natively intra-process. |
| **Public Web API Standard** | **RESTful (OpenAPI v3)** | Canonical interoperability for third-party Integrators and downstream Frontend SDKs. |
| **Async Event Bus Architecture** | **AMQP / CloudEvents** | Self-describing event structure following Transactional Outbox patterns for safe propagation. |

---

## 3. Frontend & User Interface Strategy

Mandatory for all client-facing applications to ensure consistent evolution and scalability.

| Standard | Required Implementation | Rationale |
| :--- | :--- | :--- |
| **Progressive UI Delivery** | **Phase 1-2: Modular monolithic UI. Phase 3+: Microfrontends by exception.** | Phase 1 MUST NOT implement microfrontends. Start with one modular React application and one deployable. Move to **Module Federation** ([ADR-0055](../adrs/core/0055-microfrontends-architecture-strategy.md)) only upon reaching Phase 3+ or when team scale, deployment contention, or independent technology lifecycles demand independent deployability. |
| **State Management** | **Asynchronous Cache-first** | Use `stale-while-revalidate` patterns (e.g., React Query) for resilience against backend latency ([ADR-0004](../adrs/nodejs/0004-frontend-offline-resilience.md)). |
| **Design Consistency** | **Atomic Design System** | All UI modules MUST share corporate CSS tokens and atomic components to prevent visual drift. |

---

## 4. Cross-Cutting Foundation Infrastructure


Approved centralized primitives serving the polyglot mesh. Concrete Runtime Adapters must simply point to these standard protocols.

### 3.1 Relational Persistence (SQL)
* **Engine Strategy:** Runtime-dependent selection governed by [ADR-0051](../adrs/core/0051-enterprise-database-engine-strategy.md). The universal rule is relational consistency, schema ownership, transaction safety, and domain isolation; the concrete engine is selected by the runtime profile or product ADR.
 * **Reference .NET profile:** Microsoft SQL Server.
 * **Reference Node.js profile:** PostgreSQL.
* **Maturity Constraint:** Schema-per-Context isolation REQUIRED. Direct SQL Joins across bounded context schema boundaries are FORBIDDEN.
* **Design Standards:** All data modeling MUST adhere to the standards defined in [ADR-0054](../adrs/core/0054-database-design-normalization-standards.md) (3NF baseline for SQL).
* **Isolation Pattern:** Configurable Security Strategy ([ADR-0044](../adrs/core/0044-configurable-security-persistence-strategy.md)). Native Row-Level Security (RLS) is OPTIONAL/RECOMMENDED for dense multi-tenant scenarios, managed via the structural `SECURITY_STRATEGY_MODE` flag.

### 3.2 Distributed Caching
* **Contract:** Distributed cache accessed via a cache port. Redis-compatible implementations are the reference option, not a domain-layer dependency.
* **Role:** Ephemeral graph acceleration, session-adjacent read optimization, and rate-limiting state.

### 3.3 Object Storage
* **Homologated Contract:** **S3-Compatible Protocol** (Industry de-facto open standard) via self-hosted MinIO.
* **Rationale:** The S3-API acts as a universal wire protocol, enabling vendor-neutrality.
* **Rule:** Direct usage of proprietary provider binary SDKs is prohibited. Storage logic MUST be accessed exclusively via Domain Ports, targeting S3-compliant endpoints.

---

## 4. Hardened Security & Perimeter

### 4.1 Identity & Authorization
* **Protocol:** OpenID Connect (OIDC) / OAuth 2.0 / SAML 2.0 Federation.
* **Token Type:** Statistically verify RS256 signed JWTs.
* **Enforcement:** Zero Trust networking. Mutual TLS (mTLS) only mandatory upon activating the distributed network mesh (Phase 3+).

### 4.2 Secret Hygiene
* **Engine:** OpenBao (Community, Linux Foundation — API-compatible Vault fork).
* **Rule:** No plaintext secrets in Helm charts, Git repositories, or K8s ConfigMaps. Sidecar injection is the ONLY approved consumption pattern.

---

## 5. Native Enterprise Observability

Runtime-agnostic telemetry is mandatory. Teams are forbidden from locking their logic into specific SaaS vendor agents.

* **Tracing/Logs Instrumentation:** **OpenTelemetry (W3C Trace Context)** standard.
* **Collector Hierarchy:** OpenTelemetry Collector as the vendor-neutral handoff point. Prometheus, Jaeger, Tempo, Loki, or other OSS/SaaS backends are deployment choices.
* **Log Format:** Structured JSON logging is mandated for reliable indexing and correlation.

---

## 6. Containerization & Deployment Strategy

Standardization of packaging and execution to guarantee cloud and on-premise parity.

* **Container Engine:** **Docker v25+** utilizing multi-stage builds with **Distroless** (Google Container Tools) base images to minimize production attack surface.
* **Progressive Orchestration:** In Phase 1, **Docker Compose** or standard container hosts (VM, Container Apps) suffice. **Kubernetes (K8s v1.28+)** is mandated starting Phase 3+ to manage decoupled topologies. Chart manifests MUST remain agnostic to flavors (EKS/AKS/MicroK8s).
* **Package Management:** **Helm v3**. Charts MUST fully parameterize resources, allowing easy swap-outs between real cloud infrastructure and local simulators.

---

## 7. Holistic Verification Pyramid

Mandatory to guarantee that polyglot software respects contracts before rollout.

* **Integration Testing:** Must validate against real infrastructure-compatible dependencies. Testcontainers is the reference strategy, but the rule is fidelity: do not replace critical SQL/cache/message-bus behavior with unrealistic in-memory fakes.
* **Contract Safety:** Contract testing is required for externally consumed APIs and remote service boundaries. Pact is the reference implementation where applicable.
* **Performance & Load:** Load testing must be automated for latency-sensitive flows. k6 is the reference implementation, not the only valid tool.

---

## 8. Third-Party Services Guidelines

For air-gapped environments, external SaaS integrations MUST be optional and abstracted.

| Service Name | Use Case | Local Constraint / Mitigation | Required Domain Port Interface |
| :--- | :--- | :--- | :--- |
| **Twilio** | SMS OTP / Alerts | Provide configuration for local SMTP-to-SMS Gateway or hardware modem. | `ISmsPort` |
| **SendGrid** | Transactional Emails | Compatible fallback via self-hosted SMTP server (Postfix/Haraka). | `IEmailPort` |

---

## 9. Vendor Lock-in Risk Registry

All base infrastructure choices are audited through the lens of technological sovereignty.

| Component | Reference Solution | Risk Level | Exit / Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Database** | Runtime-specific SQL engine | **Low** | ANSI SQL discipline. Domain layer decoupled via Ports. Engine changes require a product ADR. |
| **Object Storage** | S3-compatible API | **Low** | S3-compatible port contract. Concrete providers can be swapped by configuration/adapter. |
| **Secrets**| OpenBao | **Low** | Resolution abstracted by dynamic injection via native K8s sidecars. |
| **Gateway** | Standards-based API gateway / ingress | **Low** | Gateway behavior must be declarative and replaceable through ingress/API-management configuration. |

---

## 10. Structural Next-Steps for Reading

This document covers only the **universal laws**. You MUST now identify your active Runtime and consume the concrete technical compliance mapping:

1. -> **[.NET / C# Specific Technology Stack](./authoritative-tech-stack-dotnet.md)**
2. -> **[Node.js / TypeScript Specific Technology Stack](./authoritative-tech-stack-nodejs.md)**
3. -> **[Android / Kotlin Mobile Specific Technology Stack](./authoritative-tech-stack-android.md)**

---
[Back to Index](./README.md)