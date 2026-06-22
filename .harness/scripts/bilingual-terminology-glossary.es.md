# Glosario: Terminología Técnica Bilingüe

> **Propósito:** Estandarizar la traducción de términos técnicos en toda la documentación.
> Esto asegura consistencia y facilita las referencias cruzadas entre versiones EN/ES.

## Formato

| Inglés | Español | Notas |
|--------|---------|-------|
| Term | Término | Contexto de uso |

## Arquitectura y Patrones

| Inglés | Español | Notas |
|--------|---------|-------|
| ADR (Architectural Decision Record) | ADR | Mantener igual en ambos idiomas |
| Bounded Context | Bounded Context / Contexto Delimitado | Usar EN en contextos técnicos |
| Hexagonal Architecture | Arquitectura Hexagonal | |
| Ports & Adaptadores | Puertos y Adaptadores | |
| Modular Monolith | Monolito Modular | |
| Microservices | Microservicios | |
| Service Mesh | Service Mesh / Malla de Servicios | |
| CQRS (Command Query Responsibility Segregation) | CQRS | Mantener igual |
| Event-Driven | Orientado a Eventos / Event-Driven | |
| Event Bus | Bus de Eventos | |
| Outbox Pattern | Transactional Outbox / Patrón Outbox | |
| Saga Pattern | Saga | Mantener igual |
| Circuit Breaker | Circuit Breaker | Mantener igual |
| Bulkhead | Bulkhead | Mantener igual |
| Retry | Retry / Reintento | Depende del contexto |
| DDD (Domain-Driven Design) | DDD | Mantener igual en contextos técnicos |
| Tactical DDD | DDD Táctico | |
| Aggregates | Aggregates / Agregados | |
| Value Objects | Objetos de Valor | |
| Entities | Entidades | |
| Domain Events | Eventos de Dominio | |
| Anti-Pattern | Anti-Patrón | |

## Stack Técnico

| Inglés | Español | Notas |
|--------|---------|-------|
| API Gateway | API Gateway | Mantener igual |
| BFF (Backend for Frontend) | BFF | Mantener igual |
| ORM (Object-Relational Mapping) | ORM | Mantener igual |
| REST API | API REST | |
| gRPC | gRPC | Mantener igual |
| GraphQL | GraphQL | Mantener igual |
| WebSocket | WebSocket | Mantener igual |
| OTel (OpenTelemetry) | OTel (OpenTelemetry) | Mantener igual |
| Observability | Observabilidad | |
| Tracing | Trazado / Tracing | Depende del contexto |
| Logging | Logging / Registro | Depende del contexto |
| Metrics | Métricas | |
| Kubernetes | Kubernetes / K8s | |
| Docker Compose | Docker Compose | Mantener igual |
| Redis | Redis | Mantener igual |
| PostgreSQL | PostgreSQL | Mantener igual |
| SQL Server | SQL Server | Mantener igual |
| Entity Framework | Entity Framework / EF Core | |
| NestJS | NestJS | Mantener igual |
| .NET / .NET Core | .NET / .NET Core | Mantener igual |
| TypeScript | TypeScript | Mantener igual |
| JavaScript | JavaScript | Mantener igual |
| Python | Python | Mantener igual |

## Seguridad y Autenticación

| Inglés | Español | Notas |
|--------|---------|-------|
| RBAC (Role-Based Access Control) | RBAC | Mantener igual |
| ABAC (Attribute-Based Access Control) | ABAC | Mantener igual |
| MFA (Multi-Factor Authentication) | MFA | Mantener igual |
| OAuth 2.0 | OAuth 2.0 | Mantener igual |
| OIDC (OpenID Connect) | OIDC | Mantener igual |
| JWT (JSON Web Token) | JWT | Mantener igual |
| Zero Trust | Zero Trust | Mantener igual |
| RLS (Row-Level Security) | RLS (Row-Level Security) | Mantener igual |
| PII (Personally Identifiable Information) | PII (Información de Identificación Personal) | Mantener siglas EN |
| Identity Provider | Identity Provider / Proveedor de Identidad | |
| Audit Trail | Registro de Auditoría / Audit Trail | |

## SDLC y Procesos

| Inglés | Español | Notas |
|--------|---------|-------|
| CI/CD (Continuous Integration/Deployment) | CI/CD | Mantener igual |
| Pipeline | Pipeline | |
| Branching Strategy | Estrategia de Ramificación | |
| Gitflow | Gitflow | Mantener igual |
| Pull Request | Pull Request / Merge Request | Depende del contexto |
| Code Review | Revisión de Código | |
| Definition of Done | Definition of Done / Criterios de Terminación | |
| Technical Debt | Deuda Técnica | |
| MVP (Minimum Viable Product) | MVP | Mantener igual |
| Sprint | Sprint | Mantener igual |

## Fases de Evolución Arquitectónica

| Inglés | Español | Notas |
|--------|---------|-------|
| Phase 0 — Vision | Fase 0 — Visión | |
| Phase 1 — Modular Monolith | Fase 1 — Monolito Modular | |
| Phase 2 — Service Extraction | Fase 2 — Extracción de Servicios | |
| Phase 3 — Full Microservices | Fase 3 — Microservicios Completos | |
| Extraction Readiness | Preparación para Extracción | |

## Convenciones de Documentación

| Inglés | Español | Notas |
|--------|---------|-------|
| Bilingual Navigation | Navegación Bilingüe | |
| Pattern A (file.es.md) | Patrón A (archivo.es.md) | |
| Pattern B (-es/ subdirectory) | Patrón B (subdirectorio -es/) | |
| Structural Parity | Paridad Estructural | |
| Header Count | Conteo de Headers | |

## Señales de Observabilidad

| Inglés | Español | Notas |
|--------|---------|-------|
| Correlation ID | Correlation ID / Identificador de Correlación | |
| Session Tracking ID | Session Tracking ID | Mantener igual |
| Trace ID | Trace ID | Mantener igual |
| Span ID | Span ID | Mantener igual |
| Activity | Activity | En contexto .NET |

## Testing

| Inglés | Español | Notas |
|--------|---------|-------|
| Unit Testing | Pruebas Unitarias | |
| Integration Testing | Pruebas de Integración | |
| E2E Testing | Pruebas E2E | Mantener igual |
| Contract Testing | Contract Testing / Pruebas de Contrato | |
| Test Pyramid | Pirámide de Testing | |
| Testcontainers | Testcontainers | Mantener igual |

## Atributos de Calidad

| Inglés | Español | Notas |
|--------|---------|-------|
| Maintainability | Mantenibilidad | |
| Scalability | Escalabilidad | |
| Performance | Rendimiento | |
| Reliability | Fiabilidad / Resiliencia | Depende del contexto |
| Security | Seguridad | |
| Observability | Observabilidad | |
| Portability | Portabilidad | |

---

*Este glosario se mantiene en `.harness/scripts/bilingual-terminology-glossary.md`. Al agregar nuevos términos, actualice ambas versiones EN y ES juntas.*
