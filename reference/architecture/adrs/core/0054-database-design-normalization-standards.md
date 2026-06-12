# [ADR 0054](0054-database-design-normalization-standards.md): Database Design and Normalization Standards

## 1. Metadata
* **ADR ID:** 0054
* **Title:** Database Design and Normalization Standards
* **Status:** Approved
* **Authors:** Enterprise Architecture Office
* **Reviewers:** Corporate Architecture Board, CTO Office
* **Date:** 2026-05-14
* **Tags:** `Database`, `Design`, `Normalization`, `SQL`, `NoSQL`, `Best-Practices`
* **Related ADRs:** 
 * [ADR-0031: Schema-per-Context Isolation](./0031-schema-per-context-domain-event-catalog.md)
 * [ADR-0051: Enterprise Database Engine Strategy](./0051-enterprise-database-engine-strategy.md)

---

## Executive Summary
Data is the most valuable and permanent asset of the enterprise. While application code is frequently refactored, database schemas often persist for years. This ADR establishes the mandatory design and normalization standards for both Relational (SQL) and Non-Relational (NoSQL) engines to ensure data integrity, minimize redundancy, and optimize performance across the polyglot mesh.

---

## 2. Problem Context
Inconsistent modeling patterns across different teams have led to:
1. **Data Anomalies:** Update, insertion, and deletion anomalies due to poor normalization in SQL.
2. **Performance Degradation:** Oversized documents and infinite arrays in NoSQL (MongoDB).
3. **Governance Friction:** Difficulty in understanding and integrating data across bounded contexts due to non-standard naming and structure.
4. **Improper Engine Selection:** Using SQL for unstructured data or NoSQL for complex relational graphs.

---

## 3. Decision
We establish a dual-track modeling standard based on the nature of the persistence engine.

### 3.1 Relational Design (SQL Server / PostgreSQL)
All relational models MUST follow the **Third Normal Form (3NF)** as the default baseline.

* **1NF (Atomic Values):** Every column must contain atomic values; no repeating groups or arrays within a cell.
* **2NF (Functional Dependency):** Must be in 1NF and all non-key attributes must be fully dependent on the primary key.
* **3NF (Transitive Dependency):** Must be in 2NF and no non-key attribute should depend on another non-key attribute.
* **Pragmatic Denormalization:** Only permitted for read-heavy analytical views or proven performance bottlenecks, governed by an ADR.
* **Integrity:** Strict use of Foreign Keys (FK), Not-Null constraints, and Unique indexes is MANDATORY.

### 3.2 Non-Relational Design (MongoDB)
Modeling MUST follow **Design-for-Access** patterns rather than normalization.

* **Embedding (Atomicity):** Favour embedding for data that is always read together and has a 1-to-1 or small 1-to-N relationship.
* **Referencing (Scaling):** Use referencing for large 1-to-N relationships (>1000 sub-items) or when data is shared across multiple entities.
* **Anti-pattern Warning:** Strictly FORBIDDEN to use "Infinite Arrays" (arrays that grow without bound). Use "Bucket Pattern" or referencing instead.

### 3.3 Naming Conventions
| Component | .NET / SQL Server | Node.js / Postgres / Mongo |
| :--- | :--- | :--- |
| **Tables / Collections** | PascalCase (e.g., `UserProfiles`) | snake_case (e.g., `user_profiles`) |
| **Columns / Fields** | PascalCase (e.g., `FirstName`) | snake_case (e.g., `first_name`) |
| **Primary Keys** | `Id` | `id` (or `_id` for Mongo) |

---

## 4. Decision Matrix: SQL vs NoSQL
| Factor | Favour SQL | Favour NoSQL |
| :--- | :--- | :--- |
| **Schema** | Rigid, predefined. | Flexible, dynamic. |
| **Transactions** | Strong ACID required. | Eventual consistency acceptable. |
| **Relationships** | Complex Joins across many tables. | Data is hierarchical or isolated. |
| **Scaling** | Vertical (typically). | Horizontal (Sharding). |
| **Data Velocity** | Moderate. | High (Write-heavy). |

---

## 5. Consequences

### Positive:
* **Consistency:** Universal language for data modeling across the organization.
* **Integrity:** Reduced risk of data corruption or orphaned records.
* **Predictability:** Database performance becomes easier to tune when structures are standardized.

### Negative:
* **Design Effort:** Requires more upfront thinking compared to "schema-less" ad-hoc development.
* **Complexity:** Managing 3NF can lead to more Joins, requiring efficient indexing strategies.

---

## Strategic Conclusion
A well-designed database is the foundation of a resilient system. By enforcing 3NF for relational data and access-optimized patterns for NoSQL, we ensure that our data remains a strategic asset rather than a technical debt liability.





## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](../../../../MASTER_INDEX.md)
