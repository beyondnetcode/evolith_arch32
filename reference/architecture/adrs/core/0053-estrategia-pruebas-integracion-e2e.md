# [ADR 0053](0053-integration-e2e-testing-strategy.md): Integration and E2E Testing Strategy

## 1. Metadata
* **ADR ID:** 0053
* **Title:** Integration and E2E Testing Strategy
* **Status:** Approved
* **Authors:** Enterprise Architecture Office
* **Reviewers:** Corporate Architecture Committee, CTO Office
* **Date:** 2026-05-14
* **Tags:** `Testing`, `Integration`, `E2E`, `Testcontainers`, `Quality`
* **Related ADRs:**
  * [ADR-0018: Testing Pyramid and Automated Quality Gates](./0018-testing-pyramid-quality-gates.md)
  * [ADR-0052: Unit Testing Isolation Strategy](./0052-unit-testing-isolation-strategy.md)

---

## Executive Summary
While unit tests verify business logic in isolation, Integration and E2E tests are necessary to ensure the system functions correctly with its real infrastructure and external collaborators. This ADR establishes a "Real Infrastructure First" approach for integration testing, using **Testcontainers** to eliminate risks associated with in-memory simulations.

---

## 2. Problem Context
Historically, teams have relied on in-memory database providers (e.g., EF Core In-Memory or SQLite in-memory) to test infrastructure adapters. This has caused critical failures in production due to:
1. **SQL Dialect Incompatibilities:** In-memory providers often don't support specific SQL Server or PostgreSQL features (e.g., RLS, JSONB, specific constraints).
2. **Concurrency Issues:** Real database locking behaviors and transaction isolations are not accurately simulated.
3. **False Confidence:** Tests pass locally but fail in production because real infrastructure behaves differently.

---

## 3. Decision
We establish a mandatory strategy for heavy testing layers.

### 3.1 Integration Tests (Adapter Layer)
* **Definition:** Verify a single **Infrastructure Adapter** against its real external counterpart.
* **Mandatory Rule:** MUST use **Testcontainers** to spin up real instances of SQL Server, PostgreSQL, Redis, or MongoDB.
* **Scope:**
  - **Persistence Adapters:** Test pure SQL, migrations, and repository implementations.
  - **External API Adapters:** Test HTTP/gRPC clients against **WireMock** (as container) or real service simulators.
  - **Message Bus Adapters:** Test publishers and consumers against a real RabbitMQ or Redis instance.

### 3.2 E2E Tests (Vertical Slice)
* **Definition:** Test a complete business flow from entry point (API) to data store.
* **Standard:** Use "In-Process Web Hosts" (e.g., `WebApplicationFactory` in .NET or `TestingModule` in NestJS) but pointing to real containers for databases.
* **Authentication:** Tests MUST include real or simulated JWT tokens to verify authorization gates (RBAC/ABAC).

### 3.3 State Management (Clean Board Policy)
* To guarantee test repeatability, database state MUST be reset between tests.
* **Preferred Tools:**
  - **.NET:** Use **Respawn** for fast database truncation.
  - **Node.js:** Use custom truncation scripts or `testcontainers` lifecycle hooks.

---

## 4. Tool Standards
| Layer | .NET Stack | Node.js Stack |
| :--- | :--- | :--- |
| **Orchestration** | **Testcontainers.NET** | **testcontainers-node** |
| **API Testing** | **WebApplicationFactory** | **Supertest** |
| **DB Reset** | **Respawn** | **TypeORM/Drizzle Truncation** |
| **API Mocking** | **WireMock.Net** | **Nock** or **WireMock (Container)** |

---

## 5. Consequences

### Positives:
* **Production Parity:** Tests run against the same engine version used in production.
* **Early Schema Problem Detection:** Migrations and constraints are verified in every CI run.
* **Reliable Contracts:** Integration tests ensure Adapters actually fulfill Port contracts.

### Negatives:
* **Execution Time:** Integration/E2E tests are slower than unit tests.
* **Resource Intensity:** Requires Docker to be available on the developer's machine and CI agent.
* **CI Complexity:** Requires careful orchestration of container lifecycles in pipelines.

---

## Strategic Conclusion
By moving away from in-memory simulations and adopting a container-based integration strategy, we significantly increase the reliability of our deployment pipeline. The additional execution time is a justified trade-off for the confidence gained in our infrastructure-dependent code.

---
[Back to Index](../../../../MASTER_INDEX.md)