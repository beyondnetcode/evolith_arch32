# [ADR 0054](0054-database-design-normalization-standards.md): Database Design and Normalization Standards

## 1. Metadata
* **ADR ID:** 0054
* **Title:** Database Design and Normalization Standards
* **Status:** Approved
* **Authors:** Enterprise Architecture Office
* **Reviewers:** Corporate Architecture Committee, CTO Office
* **Date:** 2026-05-14
* **Tags:** `Database`, `Design`, `Normalization`, `SQL`, `NoSQL`, `Best-Practices`
* **Related ADRs:**
  * [ADR-0031: Schema-per-Context Isolation](./0031-schema-per-context-domain-event-catalog.es.md)
  * [ADR-0051: Enterprise Database Engine Strategy](./0051-enterprise-database-engine-strategy.es.md)

---

## Executive Summary
Data is the most valuable and permanent asset of the enterprise. While application code is frequently refactored, database schemas often persist for years. This ADR establishes mandatory design and normalization standards for both Relational (SQL) and No Relational (NoSQL) engines to ensure data integrity, minimize redundancy, and optimize performance across the entire polyglot mesh.

---

## 2. Problem Context
Inconsistent modeling patterns between different teams have caused:
1. **Data Anomalies:** Update, insertion, and deletion anomalies due to poor SQL normalization.
2. **Performance Degradation:** Oversized documents and infinite arrays in NoSQL (MongoDB).
3. **Governance Friction:** Difficulty understanding and integrating data between bounded contexts due to non-standard nomenclature and structure.
4. **Inadequate Engine Selection:** Using SQL for unstructured data or NoSQL for complex relational graphs.

---

## 3. Decision
We establish a dual-path modeling standard based on the nature of the persistence engine.

### 3.1 Relational Design (SQL Server / PostgreSQL)
All relational models MUST follow **Third Normal Form (3NF)** as the default baseline.

* **1NF (Atomic Values):** Each column must contain atomic values; no repeating groups or arrays within a cell.
* **2NF (Functional Dependency):** Must be in 1NF and all non-key attributes must depend totally on the primary key.
* **3NF (Transitive Dependency):** Must be in 2NF and no non-key attribute should depend on another non-key attribute.
* **Pragmatic Denormalization:** Only allowed for heavy-read analytical views or proven performance bottlenecks, governed by an ADR.
* **Integrity:** Strict use of Foreign Keys (FK), Not-Null constraints, and unique indexes is MANDATORY.

### 3.2 No Relational Design (MongoDB)
Modeling MUST follow **Design-for-Access** patterns instead of normalization.

* **Embedding (Atomicity):** Favor embedding for data that is always read together and has a 1-to-1 or small 1-to-N relationship.
* **Referencing (Scaling):** Use referencing for large 1-to-N relationships (>1000 sub-items) or when data is shared among multiple entities.
* **Anti-Pattern Warning:** The use of "Infinite Arrays" (arrays that grow without limit) is strictly PROHIBITED. Use the "Bucket Pattern" or referencing instead.

### 3.3 Naming Conventions
| Component | .NET / SQL Server | Node.js / Postgres / Mongo |
| :--- | :--- | :--- |
| **Tables / Collections** | PascalCase (e.g., `UserProfiles`) | snake_case (e.g., `user_profiles`) |
| **Columns / Fields** | PascalCase (e.g., `FirstName`) | snake_case (e.g., `first_name`) |
| **Primary Keys** | `Id` | `id` (or `_id` for Mongo) |

---

## 4. Decision Matrix: SQL vs NoSQL
| Factor | Favor SQL | Favor NoSQL |
| :--- | :--- | :--- |
| **Schema** | Rigid, predefined. | Flexible, dynamic. |
| **Transactions** | Requires strong ACID. | Eventual consistency acceptable. |
| **Relationships** | Complex joins between tables. | Hierarchical or isolated data. |
| **Scaling** | Vertical (typically). | Horizontal (Sharding). |
| **Data Velocity** | Moderate. | High (Write-heavy). |

---

## 5. Consequences

### Positives:
* **Consistency:** Universal language for data modeling across the organization.
* **Integrity:** Reduced risk of data corruption or orphaned records.
* **Predictability:** Database performance is easier to tune when structures are standardized.

### Negatives:
* **Design Effort:** Requires more initial thought compared to ad-hoc "schemaless" development.
* **Complexity:** Managing 3NF can lead to more Joins, requiring efficient indexing strategies.

---

## Strategic Conclusion
A well-designed database is the foundation of a resilient system. By enforcing 3NF for relational data and access-optimized patterns in NoSQL, we ensure our data remains a strategic asset rather than a technical debt liability.





## Objetivo y Alcance

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Opciones Consideradas

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---
[Back to Index](../../../../MASTER_INDEX.es.md)