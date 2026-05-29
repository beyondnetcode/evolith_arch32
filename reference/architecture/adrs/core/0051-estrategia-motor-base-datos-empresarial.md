# [ADR 0051](0051-enterprise-database-engine-strategy.md): Enterprise Database Engine Selection Strategy

## 1. Metadata
* **ADR ID:** 0051
* **Title:** Enterprise Database Engine Selection Strategy
* **Status:** Approved
* **Authors:** Enterprise Architecture Office
* **Reviewers:** Corporate Architecture Committee, CTO Office
* **Date:** 2026-05-14
* **Tags:** `Governance`, `Persistence`, `Database`, `Standards`
* **Related ADRs:**
  * [ADR-0044: Configurable Security Persistence Strategy](./0044-configurable-security-persistence-strategy.md)
  * [ADR-0047: Architectural Patterns Evolution](./0047-architectural-patterns-monolith-soa-microservices.md)

---

## Executive Summary
As the ecosystem matures toward a polyglot mesh, standardizing the persistence layer becomes critical for operational efficiency, performance optimization, and vendor support alignment. This ADR establishes mandatory database engine preferences by runtime environment to maximize synergy between the application framework and data storage.

---

## 2. Problem Context
Historically, the ecosystem leaned toward PostgreSQL as a universal default. While PostgreSQL is highly versatile, certain runtimes achieve better performance, developer experience, and enterprise integration when combined with their "natural" ecosystem counterparts. Specifically, .NET applications benefit significantly from deep SQL Server integration, while Node.js environments are highly optimized for PostgreSQL and MongoDB.

---

## 3. Decision
The enterprise standard for database engines is now differentiated by runtime and data model requirements:

### 3.1 .NET / C# Runtime
* **Mandatory Engine:** **Microsoft SQL Server (Latest Stable Version)**
* **Rationale:** Native integration with Entity Framework Core, superior performance for enterprise workloads, and advanced management tools (SSMS, SQL Profiler).
* **Restriction:** All new .NET services MUST use SQL Server unless a specific technical exemption is granted.

### 3.2 Node.js / TypeScript Runtime (Relational)
* **Mandatory Engine:** **PostgreSQL (v16+)**
* **Rationale:** Industry standard for open-source Node.js architectures, excellent support in TypeORM/Drizzle, and robust JSONB support for hybrid models.

### 3.3 Node.js / TypeScript Runtime (Non-Relational)
* **Mandatory Engine:** **MongoDB**
* **Rationale:** Preferred for document-oriented storage, fast prototyping, and high-speed unstructured data within the Node.js ecosystem.

---

## 4. Architectural Drivers
1. **Performance Optimization:** Utilizing the most optimized drivers and features for each runtime.
2. **Developer Experience (DX):** Alignment with the most common and well-documented stacks in each community.
3. **Operational Efficiency:** Standardization on high-maturity engines to simplify DBA and DevOps maintenance.
4. **Vendor Support:** Leveraging deep enterprise support for SQL Server in corporate environments.

---

## 5. Implementation Guides

### 5.1 Migration Path
* **New Projects:** MUST follow this strategy from inception.
* **Existing Projects:** Should evaluate migration during their next major refactoring cycle if currently misaligned with these standards.
* **Satellite Systems:** All systems inheriting from the Reference Architecture MUST adopt these engines to ensure compatibility with corporate infrastructure templates.

### 5.2 Infrastructure
* Corporate `docker-compose` templates and K8s manifests will provide standard images for SQL Server, PostgreSQL, and MongoDB.

---

## 6. Consequences

### Positives:
* **Higher Performance:** Better utilization of connection pools and runtime-specific features.
* **Reduced Friction:** Developers use tools they are most familiar with in their respective ecosystems.
* **Improved Observability:** Better integration with runtime-specific monitoring tools (e.g., SQL Server Extended Events).

### Negatives:
* **Greater Infrastructure Diversity:** DevOps must support three distinct database engines instead of one.
* **Polyglot DBA Requirement:** Requires both T-SQL and PL/pgSQL knowledge within the organization.

---

## Strategic Conclusion
By aligning our persistence strategy with the strengths of each runtime, we ensure our systems are built on the most stable and efficient foundations available. SQL Server for .NET and PostgreSQL/MongoDB for Node.js represent industry best practices for enterprise-grade polyglot architectures.

---
[Back to Index](../../../../MASTER_INDEX.md)