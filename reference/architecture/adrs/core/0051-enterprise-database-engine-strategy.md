# [ADR 0051](0051-enterprise-database-engine-strategy.md): Enterprise Database Engine Selection Strategy

## 1. Metadata
* **ADR ID:** 0051
* **Title:** Enterprise Database Engine Selection Strategy
* **Status:** Approved
* **Authors:** Enterprise Architecture Office
* **Reviewers:** Corporate Architecture Board, CTO Office
* **Date:** 2026-05-14
* **Tags:** `Governance`, `Persistence`, `Database`, `Standards`
* **Related ADRs:** 
 * [ADR-0044: Configurable Security Persistence Strategy](./0044-configurable-security-persistence-strategy.md)
 * [ADR-0047: Architectural Patterns Evolution](./0047-architectural-patterns-monolith-soa-microservices.md)

---

## Executive Summary
As the ecosystem matures into a polyglot mesh, standardizing the persistence layer becomes critical for operational efficiency, performance optimization, and vendor support alignment. This ADR establishes the mandatory database engine preferences based on the runtime environment to maximize the synergy between the application framework and the data store.

---

## 2. Problem Context
Historically, the ecosystem leaned towards PostgreSQL as a universal default. While PostgreSQL is highly versatile, certain runtimes achieve better performance, developer experience, and enterprise integration when paired with their "natural" ecosystem counterparts. Specifically, .NET applications benefit significantly from the deep integration with SQL Server, while Node.js environments are highly optimized for PostgreSQL and MongoDB.

---

## 3. Decision
The enterprise standard for database engines is now differentiated by runtime and data model requirements:

### 3.1 .NET / C# Runtime
* **Mandatory Engine:** **Microsoft SQL Server (Latest Stable Version)**
* **Rationale:** native integration with Entity Framework Core, superior performance for enterprise workloads, and advanced management tooling (SSMS, SQL Profiler).
* **Constraint:** All new .NET services MUST target SQL Server unless a specific technical exemption is granted.

### 3.2 Node.js / TypeScript Runtime (Relational)
* **Mandatory Engine:** **PostgreSQL (v16+)**
* **Rationale:** Industry standard for open-source Node.js architectures, excellent support in TypeORM/Drizzle, and robust JSONB support for hybrid models.

### 3.3 Node.js / TypeScript Runtime (Non-Relational)
* **Mandatory Engine:** **MongoDB**
* **Rationale:** Preferred for document-oriented storage, rapid prototyping, and high-velocity unstructured data within the Node.js ecosystem.

---

## 4. Architectural Drivers
1. **Performance Optimization:** Utilizing the most optimized drivers and engine features for each runtime.
2. **Developer Experience (DX):** Aligning with the most common and best-documented stacks in each community.
3. **Operational Efficiency:** Standardizing on high-maturity engines to simplify DBA and DevOps maintenance.
4. **Vendor Support:** Leveraging deep enterprise support for SQL Server in corporate environments.

---

## 5. Implementation Guidelines

### 5.1 Migration Path
* **New Projects:** MUST follow this strategy from inception.
* **Existing Projects:** Should evaluate migration during their next major refactoring cycle if they are currently misaligned with these standards.
* **Satellite Systems:** All systems inheriting from the Reference Architecture MUST adopt these engines to guarantee compatibility with corporate infrastructure templates.

### 5.2 Infrastructure
* Corporate `docker-compose` templates and K8s manifests will provide standard images for SQL Server, PostgreSQL, and MongoDB.

---

## 6. Consequences

### Positive:
* **Higher Throughput:** Better utilization of runtime-specific connection pooling and features.
* **Reduced Friction:** Developers use tools they are most familiar with in their respective ecosystems.
* **Improved Observability:** Better integration with runtime-specific monitoring tools (e.g., SQL Server Extended Events).

### Negative:
* **Increased Infrastructure Diversity:** DevOps must support three distinct database engines instead of one.
* **Polyglot DBA Requirement:** Requires knowledge of both T-SQL and PL/pgSQL within the organization.

---

## Strategic Conclusion
By aligning our persistence strategy with the strengths of each runtime, we ensure that our systems are built on the most stable and performant foundations available. SQL Server for .NET and PostgreSQL/MongoDB for Node.js represent the industry's best practices for enterprise-grade polyglot architectures.




## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Options Considered

- **Selected:** Enterprise Database Engine Selection Strategy
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Related Decisions and Standards

None explicitly linked.

---
[Back to Index](../../../../MASTER_INDEX.md)
