# Glossary: Bilingual Technical Terminology

> **Purpose:** Standardize translation of technical terms across all documentation.
> This ensures consistency and makes cross-referencing between EN/ES versions easier.

## Format

| English | Spanish | Notes |
|---------|---------|-------|
| Term | Término | Usage context |

## Architecture & Patterns

| English | Spanish | Notes |
|---------|---------|-------|
| ADR (Architectural Decision Record) | ADR | Keep as-is in both languages |
| Bounded Context | Bounded Context / Contexto Delimitado | Use EN in technical contexts |
| Hexagonal Architecture | Arquitectura Hexagonal | |
| Ports & Adapters | Puertos y Adaptadores | |
| Modular Monolith | Monolito Modular | |
| Microservices | Microservicios | |
| Service Mesh | Service Mesh / Malla de Servicios | |
| CQRS (Command Query Responsibility Segregation) | CQRS | Keep as-is |
| Event-Driven | Orientado a Eventos / Event-Driven | |
| Event Bus | Bus de Eventos | |
| Outbox Pattern | Transactional Outbox / Patrón Outbox | |
| Saga Pattern | Saga | Keep as-is |
| Circuit Breaker | Circuit Breaker | Keep as-is |
| Bulkhead | Bulkhead | Keep as-is |
| Retry | Retry / Reintento | Context-dependent |
| DDD (Domain-Driven Design) | DDD | Keep as-is in technical contexts |
| Tactical DDD | DDD Táctico | |
| Aggregates | Aggregates / Agregados | |
| Value Objects | Objetos de Valor | |
| Entities | Entidades | |
| Domain Events | Eventos de Dominio | |
| Anti-Pattern | Anti-Patrón | |

## Technical Stack

| English | Spanish | Notes |
|---------|---------|-------|
| API Gateway | API Gateway | Keep as-is |
| BFF (Backend for Frontend) | BFF | Keep as-is |
| ORM (Object-Relational Mapping) | ORM | Keep as-is |
| REST API | API REST | |
| gRPC | gRPC | Keep as-is |
| GraphQL | GraphQL | Keep as-is |
| WebSocket | WebSocket | Keep as-is |
| OTel (OpenTelemetry) | OTel (OpenTelemetry) | Keep as-is |
| Observability | Observabilidad | |
| Tracing | Trazado / Tracing | Context-dependent |
| Logging | Logging / Registro | Context-dependent |
| Metrics | Métricas | |
| Kubernetes | Kubernetes / K8s | |
| Docker Compose | Docker Compose | Keep as-is |
| Redis | Redis | Keep as-is |
| PostgreSQL | PostgreSQL | Keep as-is |
| SQL Server | SQL Server | Keep as-is |
| Entity Framework | Entity Framework / EF Core | |
| NestJS | NestJS | Keep as-is |
| .NET / .NET Core | .NET / .NET Core | Keep as-is |
| TypeScript | TypeScript | Keep as-is |
| JavaScript | JavaScript | Keep as-is |
| Python | Python | Keep as-is |

## Security & Auth

| English | Spanish | Notes |
|---------|---------|-------|
| RBAC (Role-Based Access Control) | RBAC | Keep as-is |
| ABAC (Attribute-Based Access Control) | ABAC | Keep as-is |
| MFA (Multi-Factor Authentication) | MFA | Keep as-is |
| OAuth 2.0 | OAuth 2.0 | Keep as-is |
| OIDC (OpenID Connect) | OIDC | Keep as-is |
| JWT (JSON Web Token) | JWT | Keep as-is |
| Zero Trust | Zero Trust | Keep as-is |
| RLS (Row-Level Security) | RLS (Row-Level Security) | Keep as-is |
| PII (Personally Identifiable Information) | PII (Información de Identificación Personal) | Keep EN acronym |
| Identity Provider | Identity Provider / Proveedor de Identidad | |
| Audit Trail | Registro de Auditoría / Audit Trail | |

## SDLC & Process

| English | Spanish | Notes |
|---------|---------|-------|
| CI/CD (Continuous Integration/Deployment) | CI/CD | Keep as-is |
| Pipeline | Pipeline | |
| Branching Strategy | Estrategia de Ramificación | |
| Gitflow | Gitflow | Keep as-is |
| Pull Request | Pull Request / Merge Request | Context-dependent |
| Code Review | Revisión de Código | |
| Definition of Done | Definition of Done / Criterios de Terminación | |
| Technical Debt | Deuda Técnica | |
| MVP (Minimum Viable Product) | MVP | Keep as-is |
| Sprint | Sprint | Keep as-is |

## Architecture Evolution Phases

| English | Spanish | Notes |
|---------|---------|-------|
| Phase 0 — Vision | Fase 0 — Visión | |
| Phase 1 — Modular Monolith | Fase 1 — Monolito Modular | |
| Phase 2 — Service Extraction | Fase 2 — Extracción de Servicios | |
| Phase 3 — Full Microservices | Fase 3 — Microservicios Completos | |
| Extraction Readiness | Preparación para Extracción | |

## Documentation Conventions

| English | Spanish | Notes |
|---------|---------|-------|
| Bilingual Navigation | Navegación Bilingüe | |
| Pattern A (file.es.md) | Patrón A (archivo.es.md) | |
| Pattern B (-es/ subdirectory) | Patrón B (subdirectorio -es/) | |
| Structural Parity | Paridad Estructural | |
| Header Count | Conteo de Headers | |

## Observability Signals

| English | Spanish | Notes |
|---------|---------|-------|
| Correlation ID | Correlation ID / Identificador de Correlación | |
| Session Tracking ID | Session Tracking ID | Keep as-is |
| Trace ID | Trace ID | Keep as-is |
| Span ID | Span ID | Keep as-is |
| Activity | Activity | In .NET context |

## Testing

| English | Spanish | Notes |
|---------|---------|-------|
| Unit Testing | Pruebas Unitarias | |
| Integration Testing | Pruebas de Integración | |
| E2E Testing | Pruebas E2E | Keep as-is |
| Contract Testing | Contract Testing / Pruebas de Contrato | |
| Test Pyramid | Pirámide de Testing | |
| Testcontainers | Testcontainers | Keep as-is |

## Quality Attributes

| English | Spanish | Notes |
|---------|---------|-------|
| Maintainability | Mantenibilidad | |
| Scalability | Escalabilidad | |
| Performance | Rendimiento | |
| Reliability | Fiabilidad / Resiliencia | Context-dependent |
| Security | Seguridad | |
| Observability | Observabilidad | |
| Portability | Portabilidad | |

---

*This glossary is maintained in `.harness/scripts/bilingual-terminology-glossary.md`. When adding new terms, update both EN and ES versions together.*