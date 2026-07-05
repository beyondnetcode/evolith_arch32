# Índice de Reglas Codificadas desde ADRs

Codificación machine-readable de ADRs críticos como reglas. Estas reglas se hacen cumplir automáticamente en los pipelines de CI/CD.

| ADR | Archivo de Reglas | Descripción |
|---|---|---|
| **ADR-0002** — Arquitectura Hexagonal | [adr-0002-hexagonal-architecture.rules.json](./adr-0002-hexagonal-architecture.rules.json) | Ports & Adapters, aislamiento de capas, AOP solo en adapters |
| **ADR-0005** — Quality Gates CI/CD | [adr-0005-cicd-quality-gates.rules.json](./adr-0005-cicd-quality-gates.rules.json) | CodeQL, escaneo de dependencias, detección de secretos, cumplimiento de SLA |
| **ADR-0018** — Pirámide de Testing | [adr-0018-testing-pyramid.rules.json](./adr-0018-testing-pyramid.rules.json) | Distribución 70/20/10, umbrales por capa, cobertura >= 80% |
| **ADR-0032** — Selección de Protocolos | [adr-0032-protocol-selection.rules.json](./adr-0032-protocol-selection.rules.json) | gRPC interno, REST externo, GraphQL en agregación BFF |
| **ADR-0040** — Multi-Runtime | [adr-0040-multi-runtime.rules.json](./adr-0040-multi-runtime.rules.json) | Runtime por perfil de carga, gRPC síncrono, RabbitMQ asíncrono |
| **ADR-0050** — GitFlow Branching | [adr-0050-gitflow-branching.rules.json](./adr-0050-gitflow-branching.rules.json) | Nombres de ramas, ramas protegidas, tags semver |
| **ADR-0010** — Multi-Tenancy | [adr-0010-multi-tenancy.rules.json](./adr-0010-multi-tenancy.rules.json) | Filtrado de doble capa, propagación de contexto de tenant (condicional) |

---

Volver al [Rulesets Hub](../README.es.md)
