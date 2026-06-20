# [ADR 0053](0053-integration-e2e-testing-strategy.md): Integration and E2E Testing Strategy

## 1. Metadata
* **ADR ID:** 0053
* **Title:** Integration and E2E Testing Strategy
* **Status:** Approved
* **Authors:** Enterprise Architecture Office
* **Reviewers:** Corporate Architecture Board, CTO Office
* **Date:** 2026-05-14
* **Tags:** `Testing`, `Integration`, `E2E`, `Testcontainers`, `Quality`
* **Related ADRs:** 
 * [ADR-0018: Testing Pyramid and Automated Quality Gates](./0018-testing-pyramid-quality-gates.md)
 * [ADR-0052: Unit Testing Isolation Strategy](./0052-unit-testing-isolation-strategy.md)

---

## Executive Summary
While unit tests verify business logic in isolation, Integration and E2E tests are required to guarantee that the system works correctly with its real infrastructure and external collaborators. This ADR mandates a "Real-Infrastructure First" approach for integration testing, utilizing **Testcontainers** to eliminate the risks associated with in-memory simulations.

---

## 2. Problem Context
Historically, teams have relied on in-memory database providers (e.g., EF Core In-Memory or SQLite in-memory) to test infrastructure adapters. This has led to critical failures in production due to:
1. **SQL Dialect Incompatibilities:** In-memory providers often don't support specific SQL Server or PostgreSQL features (e.g., RLS, JSONB, specific constraints).
2. **Concurrency Issues:** Real database lock behaviors and transaction isolations are not accurately simulated.
3. **False Confidence:** Tests pass locally but fail in production because the real infrastructure behaves differently.

---

## 3. Decision
We establish a mandatory strategy for heavy-weight testing layers.

### 3.1 Integration Testing (The Adapter Layer)
* **Definition:** Verifying a single **Infrastructure Adapter** against its real external counterpart.
* **Mandatory Rule:** MUST use **Testcontainers** to spin up real instances of SQL Server, PostgreSQL, Redis, or MongoDB.
* **Scope:** 
 - **Persistence Adapters:** Test raw SQL, migrations, and repository implementations.
 - **External API Adapters:** Test HTTP/gRPC clients against **WireMock** (as a container) or real service simulators.
 - **Message Bus Adapters:** Test publishers and consumers against a real RabbitMQ/Redis instance.

### 3.2 E2E Testing (The Vertical Slice)
* **Definition:** Testing a complete business flow from the entry point (API) to the data store.
* **Standard:** Use "In-Process Web Hosts" (e.g., `WebApplicationFactory` in .NET or `TestingModule` in NestJS) but targeting real containers for databases.
* **Authentication:** Tests MUST include real or mocked JWT tokens to verify authorization gates (RBAC/ABAC).

### 3.3 State Management (Clean Slate Policy)
* To ensure test repeatability, the database state MUST be reset between tests.
* **Preferred Tooling:**
 - **.NET:** Use **Respawn** for fast database truncation.
 - **Node.js:** Use custom truncation scripts or `testcontainers` lifecycle hooks.

---

## 4. Tooling Standards
| Layer | .NET Stack | Node.js Stack |
| :--- | :--- | :--- |
| **Orchestration** | **Testcontainers.NET** | **testcontainers-node** |
| **API Testing** | **WebApplicationFactory** | **Supertest** |
| **DB Reset** | **Respawn** | **TypeORM/Drizzle truncate** |
| **API Mocking** | **WireMock.Net** | **Nock** or **WireMock (Container)** |

---

## 5. Consequences

### Positive:
* **Production Parity:** Tests run against the exact same engine version used in production.
* **Catch Schema Issues early:** Migrations and constraints are verified in every CI run.
* **Reliable Contracts:** Integration tests guarantee that Adapters truly fulfill Port contracts.

### Negative:
* **Execution Time:** Integration/E2E tests are slower than unit tests.
* **Resource Intensity:** Requires Docker to be available in the developer machine and CI agent.
* **CI Complexity:** Requires careful orchestration of container lifecycles in pipelines.

---

## Strategic Conclusion
By moving away from in-memory simulations and adopting a container-based integration strategy, we significantly increase the reliability of our deployment pipeline. The extra execution time is a justified trade-off for the confidence gained in our infrastructure-dependent code.





## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Options Considered

- **Selected:** Integration and E2E Testing Strategy
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

---
[Back to Index](../../../../MASTER_INDEX.md)

> **Agent Signature:** Architect Agent
