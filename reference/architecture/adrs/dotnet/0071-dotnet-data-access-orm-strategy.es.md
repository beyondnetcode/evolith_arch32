# ADR-0071: .NET Data Access Strategy — EF Core as Default ORM, Dapper for Optimized Reads

> **Nota:** Este archivo es un esqueleto inicial. Por favor, complete la traducción.

---

## 1. Status

*Contenido pendiente de traducción.*

## 2. Context

*Contenido pendiente de traducción.*

## 3. Problem Statement

*Contenido pendiente de traducción.*

## 4. Decision

*Contenido pendiente de traducción.*

## 5. Rationale

*Contenido pendiente de traducción.*

### 5.1 Why EF Core as Default

*Contenido pendiente de traducción.*

### 5.2 Why Dapper Is Conditionally Allowed for Reads

*Contenido pendiente de traducción.*

## 6. Performance Considerations

*Contenido pendiente de traducción.*

### 6.1 EF Core Query Optimization First

*Contenido pendiente de traducción.*

### 6.2 Dapper Authorization Threshold

*Contenido pendiente de traducción.*

### 6.3 Connection and Context Management with Dapper

*Contenido pendiente de traducción.*

## 7. When EF Core Should Be Preferred

*Contenido pendiente de traducción.*

## 8. When Dapper Is Allowed

*Contenido pendiente de traducción.*

## 9. DDD and Clean Architecture Alignment

*Contenido pendiente de traducción.*

### 9.1 Layer Discipline

*Contenido pendiente de traducción.*

### 9.2 Aggregate Consistency Rule

*Contenido pendiente de traducción.*

### 9.3 Read Model Isolation

*Contenido pendiente de traducción.*

## 10. Maintainability Considerations

*Contenido pendiente de traducción.*

### 10.1 Cognitive Overhead of Dual-ORM Codebases

*Contenido pendiente de traducción.*

### 10.2 SQL Maintainability

*Contenido pendiente de traducción.*

### 10.3 Schema Migration Ownership

*Contenido pendiente de traducción.*

## 11. Anti-Patterns to Avoid

*Contenido pendiente de traducción.*

## 12. Recommended Implementation Guidelines

*Contenido pendiente de traducción.*

### 12.1 Repository Pattern (EF Core)

*Contenido pendiente de traducción.*

### 12.2 Dapper Query Service (Read Side)

*Contenido pendiente de traducción.*

### 12.3 DI Registration

*Contenido pendiente de traducción.*

### 12.4 Dapper Authorization Record

*Contenido pendiente de traducción.*

## 13. Benefits

*Contenido pendiente de traducción.*

## 14. Trade-offs

*Contenido pendiente de traducción.*

## 15. Consequences

*Contenido pendiente de traducción.*

### Positive

*Contenido pendiente de traducción.*

### Negative

*Contenido pendiente de traducción.*

## 16. Alternatives Considered

*Contenido pendiente de traducción.*

## 17. Review

*Contenido pendiente de traducción.*

