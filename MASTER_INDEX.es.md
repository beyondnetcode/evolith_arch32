# Índice Maestro Global

> Navegación bilingüe: [English](./MASTER_INDEX.md) 
> Portal principal: [README](./README.es.md)

Este es el índice completo de navegación para esta referencia de arquitectura progresiva. Úsalo cuando ya sepas qué tipo de artefacto necesitas o cuando quieras moverte entre áreas del repositorio sin explorar directorios manualmente.

---

## 1. Empieza por Intención

| Intención | Entrada principal | Referencia de apoyo |
|---|---|---|
| Entender la visión arquitectónica | [Directivas Arquitectónicas](./reference/governance/standards-es/vision/architectural-directives.md) | [Roadmap Evolutivo](./reference/governance/standards-es/vision/evolutionary-strategy-roadmap.md) |
| Entender el modelo de arquitectura progresiva | [Blueprint de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md) | [Criterios de Extracción a Microservicios](./reference/architecture/adrs-es/core/0045-microservice-extraction-readiness-criteria.md) |
| Revisar decisiones tecnológicas | [Stack Tecnológico Autorizado](./reference/architecture/blueprints-es/authoritative-tech-stack.md) | [Línea Base Agnóstica](./reference/architecture/blueprints-es/authoritative-tech-stack-agnostic.md) |
| Revisar decisiones arquitectónicas | [Registro ADR](./reference/architecture/adrs-es/README.md) | [ADRs Core](./reference/architecture/adrs-es/core/README.es.md) |
| Aprender estándares de ingeniería | [Manifiesto de Ingeniería](./reference/governance/standards-es/engineering/engineering-manifesto.md) | [Guía de Contract Testing](./reference/governance/standards-es/engineering/contract-testing-guideline.md) |
| Entender expectativas SDLC | [Framework SDLC](./reference/governance/sdlc-es/README.md) | [SDLC enfocado en Construcción](./reference/governance/sdlc-es/02-engineering/construction-focused-sdlc-framework.md) |
| Explorar el demo sandbox | [Hub Demo](./reference/knowledge/demo/README.md) | [Matriz de Verificación Sandbox](./reference/knowledge/demo/technical/sandbox-verification.md) |
| Operar o desplegar localmente | [Hub de Operaciones](./reference/operations/README.es.md) | [Hub de Infraestructura](./reference/infrastructure/README.es.md) |

---

## 2. Lectura Recomendada por Rol

| Rol | Ruta de lectura |
|---|---|
| **Ejecutivo / Sponsor** | [Directivas Arquitectónicas](./reference/governance/standards-es/vision/architectural-directives.md) -> [Roadmap Evolutivo](./reference/governance/standards-es/vision/evolutionary-strategy-roadmap.md) -> [Matriz de Madurez](./reference/governance/standards-es/vision/maturity-matrix.md) |
| **Product Owner / PM** | [PRD Demo](./reference/knowledge/demo/project/01-prd-demo-sandbox-es.md) -> [Glosario de Negocio](./reference/knowledge/demo/functional/business-glossary.es.md) -> [Backlog y Epics](./reference/knowledge/demo/project/02-backlog-and-epics-es.md) |
| **Arquitecto de Software** | [Blueprint de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md) -> [Registro ADR](./reference/architecture/adrs-es/README.md) -> [Criterios de Extracción](./reference/architecture/adrs-es/core/0045-microservice-extraction-readiness-criteria.md) |
| **Principal / Staff Engineer** | [Línea Base Agnóstica](./reference/architecture/blueprints-es/authoritative-tech-stack-agnostic.md) -> [Patrones Tácticos](./reference/architecture/adrs-es/core/0019-tactical-design-patterns-future-proofing.md) -> [Checklist de Simplicidad](./reference/architecture/blueprints-es/simplicity-checklist-phase-01.md) |
| **Backend Developer** | [Manifiesto de Ingeniería](./reference/governance/standards-es/engineering/engineering-manifesto.md) -> [ADR Clean Architecture](./reference/architecture/adrs-es/nodejs/0002-clean-architecture-nestjs.md) -> [Verificación Sandbox](./reference/knowledge/demo/technical/sandbox-verification.md) |
| **Frontend Developer** | [ADR Resiliencia Frontend](./reference/architecture/adrs-es/nodejs/0004-frontend-offline-resilience.md) -> [ADR Gateway/BFF](./reference/architecture/adrs-es/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md) -> [ADR Microfrontends](./reference/architecture/adrs-es/core/0055-estrategia-arquitectura-microfrontends.md) -> [To-Do Web App](./src/apps/todo-web/README.md) |

| **DevOps / SRE** | [Hub de Infraestructura](./reference/infrastructure/README.es.md) -> [Hub de Operaciones](./reference/operations/README.es.md) -> [ADR Observabilidad](./reference/architecture/adrs-es/nodejs/0007-observability-telemetry-loki-opentelemetry.md) |
| **QA / SDET** | [ADR Pirámide de Testing](./reference/architecture/adrs-es/core/0018-testing-pyramid-quality-gates.md) -> [Guía de Contract Testing](./reference/governance/standards-es/engineering/contract-testing-guideline.md) -> [ADR Integración y E2E](./reference/architecture/adrs-es/core/0053-estrategia-pruebas-integracion-e2e.md) |
| **Security Engineer** | [Vendor Risk Assessment](./reference/governance/standards-es/engineering/vendor-risk-assessment.md) -> [ADR Multi-Tenancy](./reference/architecture/adrs-es/core/0010-multi-tenancy-architecture-strategy.md) -> [ADR Auditoría Inmutable](./reference/architecture/adrs-es/core/0016-immutable-business-audit-trail.md) |
| **AI Contributor** | [Estándares AI-Augmented](./reference/governance/standards-es/ai-augmented/README.md) -> [Reglas Harness](./.harness/rules/global-rules.md) -> [Agentes AGENTS.es.md](./AGENTS.es.md) -> [ADRs de IA](./reference/governance/standards-es/ai-augmented/06-adrs/README.md) |
| **New Joiner** | [Product Quick Start](./reference/governance/standards-es/onboarding/product-quick-start.md) -> [Taxonomía del Repositorio](./reference/governance/standards-es/repository-taxonomy.es.md) -> [Portal README](./README.es.md) |

---

## 3. Arquitectura

| Área | Entrada |
|---|---|
| Blueprints | [reference/architecture/blueprints-es](./reference/architecture/blueprints-es/README.md) |
| Registro ADR | [reference/architecture/adrs-es](./reference/architecture/adrs-es/README.md) |
| ADRs Core | [reference/architecture/adrs-es/core](./reference/architecture/adrs-es/core/README.es.md) |
| ADRs Node.js | [reference/architecture/adrs-es/nodejs](./reference/architecture/adrs-es/nodejs/README.es.md) |
| ADRs .NET | [reference/architecture/adrs-es/dotnet](./reference/architecture/adrs-es/dotnet/README.es.md) |
| ADRs Android | [reference/architecture/adrs-es/android](./reference/architecture/adrs-es/android/README.es.md) |

Referencias clave:

- [Blueprint de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md)
- [Índice del Stack Tecnológico Autorizado](./reference/architecture/blueprints-es/authoritative-tech-stack.md)
- [Especificación C4](./reference/architecture/blueprints-es/c4-topology-spec.md)
- [Análisis CAP](./reference/architecture/blueprints-es/cap-strategic-analysis.md)
- [Escenarios Multi-Cloud](./reference/architecture/blueprints-es/multi-cloud-deployment-scenarios.md)

---

## 4. Gobernanza

| Área | Entrada |
|---|---|
| Estándares | [reference/governance/standards-es](./reference/governance/standards-es/README.md) |
| Visión | [reference/governance/standards-es/vision](./reference/governance/standards-es/vision/README.es.md) |
| Ingeniería | [reference/governance/standards-es/engineering](./reference/governance/standards-es/engineering/README.es.md) |
| Onboarding | [reference/governance/standards-es/onboarding](./reference/governance/standards-es/onboarding/README.es.md) |
| AI-Augmented Engineering | [reference/governance/standards-es/ai-augmented](./reference/governance/standards-es/ai-augmented/README.md) |
| SDLC | [reference/governance/sdlc-es](./reference/governance/sdlc-es/README.md) |
| Estándares de Documentación | [reference/governance/sdlc-es/03-documentation](./reference/governance/sdlc-es/03-documentation/README.es.md) |

Referencias clave:

- [Manifiesto de Ingeniería](./reference/governance/standards-es/engineering/engineering-manifesto.md)
- [Taxonomía del Repositorio](./reference/governance/standards-es/repository-taxonomy.es.md)
- [Product Quick Start](./reference/governance/standards-es/onboarding/product-quick-start.md)
- [Estándar de Escritura de Functional Stories](./reference/governance/sdlc-es/03-documentation/functional-story-writing-standard.md)
- [Buenas Prácticas de Documentación SDLC](./reference/governance/sdlc-es/03-documentation/sdlc-documentation-best-practices.md)

---

## 5. Demo y Base de Conocimiento

| Área | Entrada |
|---|---|
| Hub Demo | [reference/knowledge/demo](./reference/knowledge/demo/README.md) |
| Planificación Demo | [reference/knowledge/demo/project](./reference/knowledge/demo/project/README.es.md) |
| Capa Funcional Demo | [reference/knowledge/demo/functional](./reference/knowledge/demo/functional/README.md) |
| Capa Técnica Demo | [reference/knowledge/demo/technical](./reference/knowledge/demo/technical/README.md) |
| Investigación | [reference/knowledge/research](./reference/knowledge/research/README.md) |
| Proofs of Concept | [reference/knowledge/poc](./reference/knowledge/poc/README.md) |

Referencias clave:

- [PRD Demo](./reference/knowledge/demo/project/01-prd-demo-sandbox-es.md)
- [Backlog y Epics](./reference/knowledge/demo/project/02-backlog-and-epics-es.md)
- [Glosario de Negocio](./reference/knowledge/demo/functional/business-glossary.es.md)
- [Mapa de Bounded Contexts](./reference/knowledge/demo/technical/bounded-context-map.es.md)
- [Matriz de Verificación Sandbox](./reference/knowledge/demo/technical/sandbox-verification.es.md)

---

## 6. Operaciones e Infraestructura

| Área | Entrada |
|---|---|
| Operaciones | [reference/operations](./reference/operations/README.es.md) |
| OpenTelemetry | [reference/operations/otel](./reference/operations/otel/README.md) |
| Grafana | [reference/operations/grafana](./reference/operations/grafana/README.md) |
| Tempo | [reference/operations/tempo](./reference/operations/tempo/README.md) |
| Infraestructura | [reference/infrastructure](./reference/infrastructure/README.es.md) |

---

## 7. Código Fuente

| Componente | Entrada |
|---|---|
| To-Do API | [src/apps/todo-api](./src/apps/todo-api/README.md) |
| To-Do Web | [src/apps/todo-web](./src/apps/todo-web/README.md) |
| Librería AOP compartida | [src/libs/aop](./src/libs/aop/package.json) |

---

## 8. Línea Base Mandatoria

Todo artefacto e implementación debe respetar estos pilares:

1. [Baseline Agnóstico](./reference/architecture/blueprints-es/authoritative-tech-stack-agnostic.md)
2. [Arquitectura de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md)
3. [Manifiesto de Ingeniería](./reference/governance/standards-es/engineering/engineering-manifesto.md)
4. [Definition of Done](./reference/governance/sdlc-es/02-engineering/construction-focused-sdlc-framework.md)
5. [Taxonomía del Repositorio](./reference/governance/standards-es/repository-taxonomy.es.md)

---

<div align="center">
 <a href="./README.es.md">Volver al Portal Principal</a>
</div>
