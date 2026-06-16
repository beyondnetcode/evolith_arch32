# Node.js Reference Stack Cheat Sheet (Runtime-Specific / Demo-Oriented)

> Scope: this document is **not** the universal architecture policy.
>
> It is a runtime-specific quick reference for the Node.js / TypeScript reference implementation and the repository demo sandbox. Cross-runtime rules live in [Universal Agnostic Baseline](./authoritative-tech-stack-agnostic.md). Runtime alternatives live in [.NET](./authoritative-tech-stack-dotnet.md), [Node.js](./authoritative-tech-stack-nodejs.md), and [Android](./authoritative-tech-stack-android.md) profiles.

This cheat sheet serves as a high-density tool reference by architectural layer for developers and autonomous agents working on the Node.js reference implementation.

---

### 1. Runtime & Language
* **Runtime Environment:** Node.js v20 LTS
* **Language:** TypeScript v5.4+ (Strict Mode)
* **Compiler Engine:** SWC (`@swc/core`) inside Nx Monorepo
* **Code Quality:** ESLint v8 + Prettier v3
* **Git Quality Gates:** Husky + lint-staged

### 2. API Layer
* **Internal Protocols:** gRPC (NestJS Microservices)
* **External Protocols:** REST API (NestJS Express)
* **Validation Standard:** `class-validator` + `class-transformer`
* **API Documentation:** OpenAPI v3 (Swagger) via NestJS decorators

### 3. Gateway Layer
* **API Gateway:** Kong Gateway (Open Source Edition)
* **Session Management:** RS256 Signed JSON Web Tokens (JWT)
* **Internal Security:** Mutual TLS (mTLS) via Istio Service Mesh
* **Rate Limiting:** Sliding-Window Rate Limiter (Kong Redis plugin)

### 4. Domain & Application Layer
* **Architectural Pattern:** Hexagonal Architecture (Ports & Adapters)
* **Monorepo Strategy:** Nx Monorepo
* **Execution Pattern:** Modular Monolith (Dapr-Ready)
* **Segregation Pattern:** Hybrid CQRS ([ADR-0034](../adrs/core/0034-cqrs-pattern-applicability-matrix.md) Matrix regulated)
* **Dependency Injection:** Native NestJS DI Container

### 5. Data Layer
* **Primary Relational Database:** PostgreSQL v16 (Schema Per Context isolation, [ADR-0031](../adrs/core/0031-schema-per-context-domain-event-catalog.md))
* **Relational Mapping (ORM):** TypeORM (TypeScript)
* **High-Performance Queries:** Native `pg` driver
* **Schema Migration Engine:** TypeORM Migrations via Kubernetes Init-Containers
* **In-Memory Caching:** Redis v7.2 (Sentinel / Cluster Replications)
* **Object & Asset Store:** MinIO (S3-Compatible, Self-hosted)
* **Asynchronous Message Broker:** RabbitMQ governed by flow control ([ADR-0036](../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.md)) & Outbox ([ADR-0033](../adrs/core/0033-transactional-outbox-pattern.md))

### 6. Multi-tenancy Strategy
* **Data Isolation Model:** Shared Database with Row-Level Security (RLS)
* **Tenant Resolution Context:** JWT claim extraction via NestJS Guards
* **Isolation Enforcement:** Dynamic database transaction session injection (`SET LOCAL app.current_tenant`)

### 7. Infrastructure & Deployment
* **Container Engine:** Docker v25 (Multi-Stage Distroless node images)
* **Orchestrator Platform:** Kubernetes (K8s v1.28+)
* **Secrets & Key Management:** OpenBao (Vault fork, Linux Foundation)
* **Deployment Packager:** Helm v3 parameterized charts

### 8. Observability
* **Instrumentation Standard:** OpenTelemetry (Vendor-Neutral SDKs)
* **Log Aggregator:** Grafana Loki (OSS)
* **Distributed Traces:** Jaeger (OSS)
* **Metric Server:** Prometheus Pulling Engine

### 9. Security
* **Auth Registries:** Federated OIDC & SAML + Reference Skeleton Native BCrypt Store
* **Access Control:** Hierarchical RBAC + Attribute-Based Access Control (ABAC)
* **Dependency Audit:** Snyk CLI + `npm audit` inside CI/CD pipelines

### 10. Error Management Strategy
* **Pattern Standard:** Functional Result Pattern (`neverthrow`) per [ADR-0038](../adrs/nodejs/0038-error-handling-result-pattern-strategy.md)
* **Global Barrier:** NestJS ExceptionFilter capturing opaque internal trace IDs.

### 11. Developer Experience (DevEx)
* **Local Services:** Docker Compose Spec
* **Unit Testing Framework:** Jest
* **Integration Testing:** Jest + Supertest with **Testcontainers**
* **Contract Verification:** Pact JS (Microservice consumer-driven)
* **Performance Injection:** **k6** (Grafana) TypeScript dynamic scripts
* **End-to-End (E2E) Testing:** Playwright

---
[Back to Index](./README.md)
