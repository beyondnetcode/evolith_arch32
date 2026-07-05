# Mapeo SDLC–Artefactos Evolith

> **Navegación bilingüe:** [English](./sdlc-evolith-artifact-mapping.md)
> **Propietario:** Evolith Architecture Board
> **Estado:** Referencia activa
> **Padre:** [Centro de Gobernanza SDLC](./README.es.md)

---

## Propósito

El [Framework SDLC Orientado a Construcción](./02-engineering/construction-focused-sdlc-framework.es.md) define cinco fases formales del ciclo de vida y sus puertas de salida. Este documento responde una pregunta diferente: **en cada fase, qué artefactos Evolith son obligatorios como entradas, cuáles son recomendados y qué papel juega la plataforma en esa fase?**

Usa este mapeo para:

- Incorporar un nuevo equipo de producto y comunicar exactamente qué debe consultar en cada etapa.
- Realizar revisiones de gates del Architecture Board con una lista trazable de artefactos.
- Identificar brechas cuando una fase carece de artefactos requeridos.
- Alinear equipos técnicos, QA, Producto, Operaciones y Directores de Tecnología alrededor del mismo modelo de evidencia.

---

## Cómo Leer Este Documento

| Símbolo | Significado |
|---|---|
| **Requerido** | Debe consultarse o producirse antes de activar el gate de salida de fase. Su ausencia bloquea el gate. |
| **Opcional** | Buena práctica recomendada; situacional según complejidad del producto, madurez del equipo o fase de roadmap evolutivo. |
| **Condicional** | Requerido solo cuando aplica la condición detonante, como multi-tenancy, APIs públicas, datos regulados o flujos críticos de producción. |

Los cinco artefactos de la Baseline de Cumplimiento Evolith listados en la Sección 7 son **siempre requeridos** independientemente de la fase. No se repiten en cada tabla por fase.

---

## Propiedad de artefactos — definiciones del Core vs. work items externos (ADR-0101 / GT-380)

> **Normativo (ADR-0101, Aceptado 2026-06-29):** Evolith Core es un **motor de evaluación stateless**. Solo posee **definiciones/estándares versionados** (fases, gates, *plantillas* de artefactos, blueprints, topologías, rulesets, policies OPA) y **evalúa** el contexto que el consumidor envía. Nunca posee, persiste ni exige **work items operativos**.

Los work items ágiles/de entrega — **Epics, Functional Stories, Technical Stories, Evolith User Stories, el Agile Backlog, Story Seeds, la Epic Candidate Matrix, Sprints y tareas** — son **`ExternalReferenceContext`**: propiedad de **Evolith Tracker** y las herramientas de entrega externas (Jira / Azure DevOps / GitHub Projects), que los persisten. Entran a la evaluación del Core solo como **referencias** (sistema + id + hash de contenido) o como **evidencia/facts declarados** dentro del `EvaluationContext`, **nunca como artefactos de gate propiedad del Core**.

En consecuencia, **desde GT-380 ningún gate del Core exige un artefacto de story/epic/backlog**: los gates canónicos `gate-f2.json` / `gate-f3.json` ya no requieren "Functional Stories" / "Technical Stories", y `dod.rego` lee los facts de DoD desde `input.context.dod` (no un `input.story` del Tracker). Donde las tablas por fase de abajo aún listan estos work items como entradas, léelas como el **flujo de autoría ágil que ejecuta el consumidor (Tracker)** — son responsabilidad del consumidor y llegan al Core como `ExternalReferenceContext`, **no** como evidencia de gate del Core cuya ausencia el Core bloquea. Las **plantillas/estándares** de artefacto que el Core publica (ej. `functional-story-template.md`) siguen válidos como **guía de autoría** (definiciones del Core), distintos de las **instancias** (referencias propiedad del Tracker).

---

## 1. Vista General: Dónde Entra Evolith en el Ciclo de Vida

```mermaid
flowchart LR
    classDef phase fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef evolith fill:#14532d,stroke:#22c55e,color:#fff,font-size:12px

    P1["Fase 1\nConcepción y\nDescubrimiento"]:::phase
    P2["Fase 2\nDiseño y\nArquitectura"]:::phase
    P3["Fase 3\nConstrucción"]:::phase
    P4["Fase 4\nValidación\ny QA"]:::phase
    P5["Fase 5\nEntrega\ny Operaciones"]:::phase

    G1["Gate: Aprobación\nde Negocio"]:::gate
    G2["Gate: Baseline\nde Diseño"]:::gate
    G3["Gate: Build\nExitoso"]:::gate
    G4["Gate: RC\nSellado"]:::gate
    G5["Gate: Producción\nActiva"]:::gate

    E1["Directivas\nTaxonomía\nBaseline Agnóstica\nPRD"]:::evolith
    E2["Blueprint de Referencia\nRegistro ADR\nHistorias Funcionales\nEstándares de Diseño"]:::evolith
    E3["Historias Técnicas\nChecklist DoD\nADRs CI/CD\nPatrones Canónicos"]:::evolith
    E4["Gates de Calidad\nTest Summary Report\nEscaneos de Seguridad\nEvidencia de Aceptación"]:::evolith
    E5["Release Notes\nObservabilidad\nRollback\nOperations Hub"]:::evolith

    P1 --> G1 --> P2 --> G2 --> P3 --> G3 --> P4 --> G4 --> P5 --> G5
    E1 -.-> P1
    E2 -.-> P2
    E3 -.-> P3
    E4 -.-> P4
    E5 -.-> P5
```

---

## 2. Fase 1 — Concepción y Descubrimiento

**Rol de Evolith en esta fase:** Establecer restricciones no negociables antes de congelar alcance. Cualquier instanciación de producto debe alinearse con la baseline agnóstica, la taxonomía de repositorio y el framework de selección topológica antes de activar el gate de Aprobación de Negocio.

**Gate de salida:** Aprobación de Negocio — Alcance Congelado

### Artefactos Requeridos

| Artefacto | Ubicación | Por qué es requerido |
|---|---|---|
| **Discovery Canvas** | [discovery-canvas-template.es.md](./04-artifact-templates/discovery-canvas-template.es.md) | Registro de iniciativa, dolor del cliente y valor esperado. En KDD Nivel 1+, informar este artefacto desde el Discovery Knowledge Brief. |
| **Technical Feasibility Canvas** | [technical-feasibility-template.es.md](./04-artifact-templates/technical-feasibility-template.es.md) | Factibilidad técnica, cuotas de cloud y NFRs. |
| **Ballpark Estimation** | [ballpark-estimation-template.es.md](./04-artifact-templates/ballpark-estimation-template.es.md) | Estimación T-Shirt Sizing de esfuerzo y equipo. En KDD Nivel 2+, incorporar sizing del Story Seed Bank. |
| **PRD — Documento de Requisitos de Producto** | [prd-template.es.md](./04-artifact-templates/prd-template.es.md) | Captura alcance, personas, objetivos, restricciones, no-objetivos y evidencia de aprobación. |
| **Matriz de Priorización MoSCoW** | [plantilla MoSCoW](./04-artifact-templates/ballpark-estimation-template.es.md) | Análisis MoSCoW con al menos un ítem MUST. En KDD Nivel 2+, derivado de la Matriz de Candidatos a Épica. |
| **Análisis Build-versus-Compose** | [build-vs-compose.schema.json](../../../rulesets/schema/build-vs-compose.schema.json) | Disposición Adopt/Embed/Integrate/Extend/Build/Reject según Product Vision §5.3. |

> **Baseline de Cumplimiento Evolith (§7):** Directivas Arquitectónicas, Taxonomía de Repositorio, Baseline Agnóstica, ADR-0047 y Manifiesto de Ingeniería son estándares transversales gobernados por la Compliance Baseline. Consúltese durante la Fase 1 pero no se producen aquí — ya están gobernados.

### Artefactos Opcionales

| Artefacto | Ubicación | Cuándo usarlo |
|---|---|---|
| Roadmap de Estrategia Evolutiva | [evolutionary-strategy-roadmap.md](../standards/vision/evolutionary-strategy-roadmap.md) | Cuando el roadmap del producto abarca múltiples fases Evolith. |
| Evaluación de Madurez | [maturity-assessment.es.md](../standards/vision/maturity-assessment.es.md) | Cuando se evalúa un producto brownfield o una posición formal de madurez. |
| Estrategia de Comunicación Arquitectónica | [architecture-communication-strategy.md](../standards/communication/architecture-communication-strategy.md) | Al preparar briefings de arquitectura para stakeholders o ejecutivos. |
| Modelo de Referencia UMS | [ums-reference-model.md](../../knowledge/demo/ums-reference-model.md) | Cuando el producto opera en identidad, access management o autorización multi-tenant. |

### Subfase 01.1 — Knowledge-First Discovery (Opcional)

| Artefacto | Ubicación | Nivel | Cuándo usarlo |
|---|---|---|---|
| Discovery Knowledge Brief | [discovery-knowledge-brief-template.es.md](./04-artifact-templates/discovery-knowledge-brief-template.es.md) | 1+ | Cualquier iniciativa donde brechas de conocimiento puedan causar retrabajo |
| Log de Supuestos y Preguntas | [assumptions-questions-log-template.es.md](./04-artifact-templates/assumptions-questions-log-template.es.md) | 1+ | Cuando los supuestos necesitan seguimiento y validación |
| Discovery Context Pack | [discovery-context-pack-template.es.md](./04-artifact-templates/discovery-context-pack-template.es.md) | 1+ | Cuando agentes IA o repos satélite necesitan contexto exportable |
| Mapa de Capacidades | [capability-map-template.es.md](./04-artifact-templates/capability-map-template.es.md) | 2+ | Cuando se necesita descomposición del dominio antes de planificación de épicas |
| Matriz de Candidatos a Épica | [epic-candidate-matrix-template.es.md](./04-artifact-templates/epic-candidate-matrix-template.es.md) | 2+ | Cuando las capacidades deben rastrearse a candidatos de épica |
| Banco de Semillas de Historia | [story-seed-bank-template.es.md](./04-artifact-templates/story-seed-bank-template.es.md) | 2+ | Cuando se necesitan semillas mínimas de historia antes del refinamiento del backlog |
| Gate de Preparación de Discovery | [discovery-readiness-gate-template.es.md](./04-artifact-templates/discovery-readiness-gate-template.es.md) | 3+ | Cuando se requiere validación formal de suficiencia del conocimiento |

---

## 3. Fase 2 — Diseño y Arquitectura

**Rol de Evolith en esta fase:** Proveer el blueprint canónico, el framework de decisión ADR y los límites tecnológicos aprobados. Toda decisión arquitectónica mayor debe referenciar un ADR Evolith existente o producir un ADR a nivel producto que lo extienda.

**Gate de salida:** Baseline de Diseño Aprobado

### Artefactos Requeridos

| Artefacto | Ubicación | Por qué es requerido |
|---|---|---|
| **Blueprint de Referencia** | [reference-blueprint.md](../../../core/architecture/blueprints/reference-blueprint.md) | Consultar — no es un artefacto que produces. El Gate F2 verifica que tus diagramas de arquitectura sean trazables a él; las desviaciones requieren ADRs. |
| **ADR-0002 — Arquitectura Hexagonal** | [ADR-0002](../../../core/architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md) | Límite obligatorio de Puertos y Adaptadores. |
| **ADR-0018 — Pirámide de Testing** | [ADR-0018](../../../core/architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md) | La arquitectura de pruebas y la distribución por tipo deben diseñarse antes de validación. |
| **ADR-0031 — Schema-per-Context** | [ADR-0031](../../../core/architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md) | Los límites de esquema por bounded context deben decidirse antes de construcción. |
| **ADR-0032 — Matriz de Selección de Protocolo** | [ADR-0032](../../../core/architecture/adrs/core/0032-api-protocol-decision-matrix-rest-grpc-graphql.es.md) | El uso de REST, gRPC y GraphQL debe resolverse antes de producir contratos API. |
| **ADR-0056 — Convenciones de Naming y Diseño** | [ADR-0056](../../../core/architecture/adrs/core/0056-enterprise-naming-design-conventions.es.md) | El lenguaje ubicuo y las reglas de naming deben establecerse antes de nombrar entidades y endpoints. |
| **ADR-0045 — Criterios de Readiness para Extracción** | [ADR-0045](../../../core/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.es.md) | Requerido — los satélites que declaran F2 deben documentar su Extraction Readiness Score (≥70%). Enforcido por la regla de contrato satélite SVC-04. |
| **Historias Funcionales** | [functional-story-template.es.md](./04-artifact-templates/functional-story-template.es.md) | Historias listas para BDD en estado Ready, trazables al PRD. Usar Plantilla de Historia Funcional como formato y Estándar de Escritura como guía. Si existen Story Seeds de Fase 1.1 KDD Nivel 2+, refinarlas en Historias Funcionales aquí. |
| **Checklist de Simplicidad Fase 1** | [simplicity-checklist-phase-01.md](../../../core/architecture/blueprints/simplicity-checklist-phase-01.md) | A pesar del nombre 'Fase 1', este checklist se ejecuta en Fase 2. Su propósito: verificar que no entre sobre-ingeniería prematura en la baseline de diseño. El identificador del artefacto está registrado en el validador de máquina — no renombrar. |
| **Análisis de Impacto CLI** | [cli-impact-analysis.es.md](./04-artifact-templates/cli-impact-analysis.es.md) | Capacidades CLI requeridas una vez que el diseño está baselined. |

### Declaración y Validación de Topología

La Fase 2 implica una topología progresiva específica. Las siguientes acciones son requeridas antes de que la compuerta Design Baseline pueda ser evaluada:

| Acción | Mecanismo | Dónde se Declara |
|--------|-----------|------------------|
| Declarar fase de topología | Establecer `metadata.phase: F2` en `evolith.yaml` | Raíz del repositorio satélite |
| Validar reglas de topología | `evolith validate --topology distributed-modules` | CLI |
| Documentar elección de topología | ADR que referencie ADR-0047 y ADR-0045 | Registro ADR |

**F2 Topología — Módulos Distribuidos (8 reglas obligatorias):**

| ID Regla | Categoría | Requisito |
|----------|-----------|----------|
| DM-R01 | module-autonomy | Cada módulo posee su ciclo de vida CI/CD independientemente |
| DM-R02 | contract-stability | Los contratos entre módulos son explícitos y versionados |
| DM-R03 | data-ownership | Cada módulo posee sus datos — sin esquema compartido |
| DM-R04 | async-communication | Los eventos async carry payloads validados por esquema |
| DM-R05 | observability | El tracing distribuido sigue W3C TraceContext entre módulos |
| DM-R06 | deployment | Los módulos son desplegables independientemente |
| DM-R07 | resiliency | Circuit breaker gobierna todas las llamadas entre módulos |
| DM-R08 | extraction-readiness | Extraction Readiness Score mantenido (≥80% para avanzar a F3) |

**Dimensiones componibles (opcionales, declarar en evolith.yaml):** `event-driven` · `data-mesh` · `serverless` · `edge-computing` · `agentic-ai`

### Artefactos de Soporte (consultar o seguir — no evidencia de gate)

| Artefacto | Ubicación | Por qué se consulta |
|---|---|---|
| **Estándar de Escritura de Historias Funcionales** | [functional-story-writing-standard.es.md](./03-documentation/functional-story-writing-standard.es.md) | Guía de calidad para Historias Funcionales — no se produce como evidencia de gate. |
| **Buenas Prácticas de Documentación SDLC** | [sdlc-documentation-best-practices.es.md](./03-documentation/sdlc-documentation-best-practices.es.md) | Gobierna cómo se producen, versionan y revisan los artefactos de diseño. |
| **Tech Stack Autoritativo** | [authoritative-tech-stack.md](../../../core/architecture/blueprints/authoritative-tech-stack.md) | Solo pueden introducirse tecnologías aprobadas salvo que se apruebe un nuevo ADR. |
| **Matriz de Decisión ADR** | [adr-matrix.md](../../../core/architecture/adrs/adr-matrix.md) | Previene decisiones arquitectónicas duplicadas o contradictorias. |

### Artefactos Opcionales o Condicionales

| Artefacto | Ubicación | Cuándo usarlo |
|---|---|---|
| ADR-0010 — Multi-Tenancy | [ADR-0010](../../../core/architecture/adrs/core/0010-multi-tenancy-architecture-strategy.es.md) | Condicional: requerido cuando el producto sirve múltiples tenants. |
| ADR-0076 — DOMA | [ADR-0076](../../../core/architecture/adrs/core/0076-domain-oriented-microservice-architecture.es.md) | Condicional: requerido cuando la topología F3 está en alcance. Cada servicio debe mapear a exactamente un bounded context. |
| C4 Topology Spec | [c4-topology-spec.md](../../../core/architecture/blueprints/c4-topology-spec.md) | Cuando se producen diagramas C4 formales. |
| Análisis Estratégico CAP | [cap-strategic-analysis.md](../../../core/architecture/blueprints/cap-strategic-analysis.md) | Cuando se hacen tradeoffs explícitos entre consistencia y disponibilidad. |
| Flujo de Arquitectura de Observabilidad | [observability-architecture-flow.md](../../../core/architecture/blueprints/observability-architecture-flow.md) | Al diseñar tracing distribuido y agregación de logs. |
| Patrones Canónicos | [canonical-patterns](../../../architecture/canonical-patterns/README.es.md) | Cuando se adoptan implementaciones de referencia runtime-specific. |
| UMS Technical Overview | [ums-technical-overview.md](../../knowledge/demo/ums-technical-overview.md) | Cuando patrones de identidad o autorización de UMS son directamente aplicables. |

### Orden de Consulta ADR Recomendado

| Paso | ADR | Por qué primero |
|------|-----|------------------|
| 1 | ADR-0056 — Convenciones de Naming y Diseño | Establece lenguaje ubicuo para todos los artefactos |
| 2 | ADR-0047 — Selección de Monolito Modular | Confirma que la progresión F1→F2 está justificada |
| 2 | ADR-0045 — Criterios de Readiness para Extracción | Cuantifica el score de readiness (≥70% para F2) |
| 3 | ADR-0002 — Arquitectura Hexagonal | FUNDAMENTAL port/adapter boundary |
| 4 | ADR-0031 — Schema-per-Context | Gobierna aislamiento de datos por módulo (DM-R03) |
| 4 | ADR-0032 — Matriz de Selección de Protocolo | Gobierna contratos entre módulos (DM-R02) |
| 5 | ADR-0018 — Pirámide de Testing | Define estrategia de pruebas antes de marcar historias como Ready |
| C | ADR-0010 — Multi-Tenancy | Requerido si multi-tenant |
| C | ADR-0076 — DOMA | Requerido si topología F3 en roadmap |

### Orden de Ejecución Recomendado dentro de Fase 2

| Paso | Actividad | Salida |
|------|-----------|--------|
| 0 | Verificar gate Fase 1 APPROVED; confirmar evolith.yaml `metadata.phase: F2` | Condiciones previas |
| 1 | Consultar ADR-0056; establecer lenguaje ubicuo; inicializar Registro ADR | Registro ADR iniciado |
| 2 | Evaluar Extraction Readiness (ADR-0045 ≥70%); confirmar progresión ADR-0047 justificada | Score documentado |
| 3 | Confirmar ADR-0002; ejecutar Checklist de Simplicidad Fase 1 | Baseline de arquitectura |
| 4 | Producir Mapa de Bounded Contexts (Plantilla DDD); aplicar ADR-0031 + ADR-0032 | Mapa de Bounded Contexts |
| 5 | Refinar Story Seeds → Historias Funcionales (KDD L2+) o escribir desde cero | Historias Funcionales |
| 6 | Documentar decisiones de límites como ADRs; completar Análisis de Impacto CLI; consultar ADR-0018; verificar Alineación con Blueprint | Registro ADR (completo) |
| 7 | Ejecutar `evolith validate --topology distributed-modules` — las 8 reglas DM deben pasar | Validación de topología |
| 8 | (Condicional) Validar DOMA si topología F3 en roadmap (ADR-0076) | Cumplimiento DOMA |
| 9 | Revisión Gate F2: completitud ADR, readiness de historias, alineación con blueprint, simplicidad, reglas de topología | APPROVED / BLOCKED / WAIVED |

---

## 4. Fase 3 — Construcción

**Rol de Evolith en esta fase:** Aplicar calidad de código, límites arquitectónicos y Definición de Terminado en cada Pull Request. El ciclo interno de construcción es gobernado por el Framework SDLC Orientado a Construcción.

**Gate de salida:** Build Exitoso — Merge de PR Autorizado

### Artefactos Requeridos

| Artefacto | Ubicación | Por qué es requerido |
|---|---|---|
| **Historias Técnicas** | [technical-story-template.es.md](./04-artifact-templates/technical-story-template.es.md) | Descompone Historias Funcionales en unidades de implementación con criterios técnicos y evidencia DoD. Cada una debe llevar `functionalStoryRef` vinculando a una Historia Funcional de Fase 2. |
| **Manifiesto de Ingeniería** | [engineering-manifesto.md](../standards/engineering/engineering-manifesto.md) | Gobierna SOLID, DRY, KISS, YAGNI, anti-patrones y disciplina de PR. |
| **Framework SDLC Orientado a Construcción — §3 y §4** | [construction-focused-sdlc-framework.es.md](./02-engineering/construction-focused-sdlc-framework.es.md) | Define ciclo de construcción, métricas de umbral y checklist DoD. |
| **Gates de Calidad SDLC** | [quality-gates.es.md](./quality-gates.es.md) | Define la baseline canónica bloqueante: cobertura >= 80%, complejidad <= 15, cero CVEs high/critical, deuda técnica < 5%. |
| **ADR-0005 — Pipeline CI/CD** | [ADR-0005](../../../core/architecture/adrs/core/0005-automated-sast-quality-gates.es.md) | Ningún merge se autoriza sin CI, linting, testing y escaneo de seguridad aprobados. |
| **ADR-0018 — Pirámide de Testing** | [ADR-0018](../../../core/architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md) | Define la distribución objetivo de pruebas: 70% unitarias / 20% integración / 10% E2E. El umbral bloqueante de cobertura lo gobiernan los Gates de Calidad SDLC. |
| **ADR-0049 — Naming Semantics y Código Limpio** | [ADR-0049](../../../core/architecture/adrs/core/0049-naming-semantics-clean-code-policy.es.md) | La disciplina de naming se valida desde el primer commit. |
| **ADR-0050 — Estrategia GitFlow Branching** | [ADR-0050](../../../core/architecture/adrs/core/0050-gitflow-branching-strategy.es.md) | Naming de ramas, políticas de merge y tagging de release son contractuales. Alternativas requieren excepción ADR explícita. |
| **Buenas Prácticas de Documentación SDLC** | [sdlc-documentation-best-practices.es.md](./03-documentation/sdlc-documentation-best-practices.es.md) | El delta documental es parte del DoD. |
| **Patrones Canónicos** | [canonical-patterns](../../../architecture/canonical-patterns/README.es.md) | Las implementaciones runtime-specific deben seguir patrones gobernados por ADR. |

### Artefactos Opcionales o Condicionales

| Artefacto | Ubicación | Cuándo usarlo |
|---|---|---|
| Guía de Contract Testing | [contract-testing-guideline.md](../standards/engineering/contract-testing-guideline.md) | Condicional: cuando el producto expone o consume contratos entre servicios. |
| Vendor Risk Assessment | [vendor-risk-assessment.md](../standards/engineering/vendor-risk-assessment.md) | Al introducir una librería o servicio de tercero. |
| ADR-0019 — Primitivas DDD Tácticas | [ADR-0019](../../../core/architecture/adrs/core/0019-tactical-design-patterns-future-proofing.es.md) | Al aplicar Agregados, Objetos de Valor, Eventos de Dominio o patrones DDD tácticos similares. |
| ADR-0033 — Transactional Outbox | [ADR-0033](../../../core/architecture/adrs/core/0033-transactional-outbox-pattern.es.md) | Al implementar publicación asíncrona confiable de eventos. |
| ADR-0034 — Aplicabilidad CQRS | [ADR-0034](../../../core/architecture/adrs/core/0034-cqrs-pattern-applicability-matrix.es.md) | Al aplicar separación comando/consulta. |
| ADR-0035 — Sagas Distribuidas | [ADR-0035](../../../core/architecture/adrs/core/0035-distributed-saga-pattern-strategy.es.md) | Al implementar workflows de múltiples pasos con compensaciones. |
| AI Architecture Assistant | [AI Architecture Assistant](../standards/ai-augmented/08-architecture-ai-assistant/README.es.md) | Cuando el equipo opera bajo un flujo de ingeniería aumentado por IA. |
| Modelo de Referencia UMS | [ums-reference-model.md](../../knowledge/demo/ums-reference-model.md) | Referencia concreta para .NET, límites hexagonales, bounded contexts y RLS. |

---

## 5. Fase 4 — Validación y QA

**Rol de Evolith en esta fase:** Definir los umbrales obligatorios de calidad que debe satisfacer el release candidate. El documento Gates de Calidad SDLC es la fuente canónica de umbrales. ADR-0018 gobierna la distribución objetivo de pruebas.

**Gate de salida:** RC Sellado

### Evidencia de Gate (bloquea la compuerta RC Stamp)

| Artefacto | Archivo / Sistema | Validación |
|---|---|---|
| Test Summary Report | [test-summary-report-template.es.md](./04-artifact-templates/test-summary-report-template.es.md) | Todos los gates de calidad en verde o con waiver; RC sellado por QA Lead y Tech Lead |
| Acceptance Validation | `.evolith/acceptance-validation.json` | Product Owner firma verificación de criterios de aceptación |
| Security Scan Report | [security-scan-report-template.es.md](./04-artifact-templates/security-scan-report-template.es.md) | Cero CVEs High/Critical; estructura conforme a security-scan-report.schema.json |
| Integration Evidence | [integration-evidence-template.es.md](./04-artifact-templates/integration-evidence-template.es.md) | Cada contrato declarado ejercitado; sin entradas FAIL sin waiver; integration-evidence.schema.json |
| Pyramid Distribution | `coverage/coverage-summary.json` | Objetivo 70% unit / 20% integración / 10% E2E alcanzado o desviación explicada |

> **Notas de criterios de bloqueo:**
> - "Any mandatory quality metric fails" → proxy: coverage-summary.json ≥ 80%
> - "Technical debt ratio exceeds 5%" → requiere tech-debt-report.json (formato pendiente de definición)
> - "Acceptance criteria remain unverified" → verifica que exista .evolith/acceptance-validation.json

### Umbrales de Calidad

La Fase 4 aplica las 8 reglas de `quality-thresholds.rules.json`. Los rulesets OPA `sdlc/pyramid-distribution.rego` (±10pp tolerancia en objetivo 70/20/10) y `sdlc/coverage.rego` (≥80%) se ejecutan automáticamente via `evolith gate evaluate --phase qa`.

### Documentos de Marco (consultar y seguir)

| Artefacto | Ubicación | Por qué se consulta |
|---|---|---|
| **Gates de Calidad SDLC** | [quality-gates.es.md](./quality-gates.es.md) | Gate matemático: cobertura >= 80%, complejidad ciclomática <= 15, cero CVEs high/critical, deuda técnica < 5%. |
| **ADR-0018 — Pirámide de Testing** | [ADR-0018](../../../core/architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md) | Define la distribución objetivo de pruebas: 70% unitarias / 20% integración / 10% E2E. |
| **ADR-0052 — Estrategia de Aislamiento Pruebas Unitarias** | [ADR-0052](../../../core/architecture/adrs/core/0052-unit-testing-isolation-strategy.es.md) | Gobierna disciplina de mocks y stubs. |
| **ADR-0053 — Estrategia Integration y Pruebas E2E** | [ADR-0053](../../../core/architecture/adrs/core/0053-integration-e2e-testing-strategy.es.md) | Define pruebas de Integración basado en Testcontainers y alcance E2E. |
| **Guía de Contract Testing** | [contract-testing-guideline.md](../standards/engineering/contract-testing-guideline.md) | Condicional: requerido cuando el producto expone contratos entre servicios. |

### Artefactos Opcionales

| Artefacto | Ubicación | Cuándo usarlo |
|---|---|---|
| ADR-0037 — Verificación Rendimiento y Chaos | [ADR-0037](../../../core/architecture/adrs/core/0037-performance-concurrency-chaos-strategy.es.md) | Cuando validación incluye carga, stress, performance o chaos scenarios. |
| Vendor Risk Assessment | [vendor-risk-assessment.md](../standards/engineering/vendor-risk-assessment.md) | Cuando validación incluye auditoría de dependencias de terceros. |
| Flujo de Arquitectura de Observabilidad | [observability-architecture-flow.md](../../../core/architecture/blueprints/observability-architecture-flow.md) | Al validar telemetría, logs estructurados y especificación de cobertura productiva. |
| UMS Architecture Portal | https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md | Referencia para un producto .NET real aplicando guías de testing Evolith. |

---

## 6. Fase 5 — Entrega y Operaciones

**Rol de Evolith en esta fase:** Especificar stack obligatorio de observabilidad, topología de infraestructura, evidencia de despliegue y readiness de rollback. Producción Activa se valida contra nominalidad de monitoreo y evidencia de release.

**Gate de salida:** Producción Activa — Monitoreo Nominal

### Evidencia de Gate (bloquea la compuerta Production Live)

| Artefacto | Archivo / Sistema | Validación |
|---|---|---|
| Release Notes | [release-notes-template.es.md](./04-artifact-templates/release-notes-template.es.md) | Alcance, pasos de despliegue, rollback, checklist de observabilidad — release-notes.schema.json |
| Observability Validation | [observability-validation-template.es.md](./04-artifact-templates/observability-validation-template.es.md) | Métricas nominales, logs fluyendo, traces completos — observability-validation.schema.json |
| Rollback Procedure | [rollback-rehearsal-template.es.md](./04-artifact-templates/rollback-rehearsal-template.es.md) | Pasos documentados y ensayados — rollback-rehearsal.schema.json |
| On-Call Handoff | [on-call-handoff-template.es.md](./04-artifact-templates/on-call-handoff-template.es.md) | Equipo informado, runbooks, escalación, SLA — on-call-handoff.schema.json |
| Deployment Evidence | `.evolith/deployment-evidence.json` | Imágenes, configs trazables al RC sellado |

### Documentos de Marco (consultar y seguir)

| Artefacto | Ubicación | Por qué se consulta |
|---|---|---|
| **ADR-0007 — OTel y Loki Observability** | [ADR-0007](../../../core/architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md) | Tracing distribuido y logging estructurado son obligatorios en todo despliegue productivo. |
| **ADR-0013 — Cloud Topology y DR** | [ADR-0013](../../../core/architecture/adrs/core/0013-cloud-infrastructure-topology-dr.es.md) | Define topología objetivo de despliegue y runbook de disaster recovery. |
| **ADR-0005 — Pipeline CI/CD** | [ADR-0005](../../../core/architecture/adrs/core/0005-automated-sast-quality-gates.es.md) | El pipeline de despliegue debe aplicar los mismos gates de calidad que la ruta de construcción. |
| **Operations Hub** | [Operations Hub](../../operations/README.es.md) | Especificación de despliegue de observabilidad y runbooks. |
| **Infrastructure Hub** | [Infrastructure Hub](../../infrastructure/README.es.md) | Especificaciones de aprovisionamiento de infraestructura. |
| **Buenas Prácticas de Documentación SDLC** | [sdlc-documentation-best-practices.es.md](./03-documentation/sdlc-documentation-best-practices.es.md) | Release Notes y runbooks de despliegue deben versionarse con el release. |

### Artefactos Opcionales

| Artefacto | Ubicación | Cuándo usarlo |
|---|---|---|
| ADR-0011 — Patrones de Resiliencia | [ADR-0011](../../../core/architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.es.md) | Cuando producción incluye circuit breakers, bulkheads, retry policies o fallback strategies. |
| ADR-0017 — Estrategia Feature Flagging | [ADR-0017](../../../core/architecture/adrs/core/0017-feature-flagging-strategy.es.md) | Cuando se usa rollout gradual, dark launches o exposición controlada en runtime. |
| ADR-0028 — Infraestructura OSS Self-Hosted | [ADR-0028](../../../core/architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.es.md) | Cuando se despliega on-premise o en cloud híbrida. |
| ADR-0046 — Dapr Unified Observability | [ADR-0046](../../../core/architecture/adrs/core/0046-unified-observability-tracecontext.es.md) | Cuando Dapr está activo y la observabilidad de sidecars debe unificarse. |
| Multi-Cloud Deployment Scenarios | [multi-cloud-deployment-scenarios.md](../../../core/architecture/blueprints/multi-cloud-deployment-scenarios.md) | Cuando el target productivo abarca múltiples cloud providers. |
| Flujo de Arquitectura de Observabilidad | [observability-architecture-flow.md](../../../core/architecture/blueprints/observability-architecture-flow.md) | Al construir o validar pipelines Grafana, Loki, Tempo y OTel Collector. |

---

## 7. Artefactos Transversales — Siempre Requeridos

Estos cinco artefactos constituyen la **Baseline de Cumplimiento Evolith**. No son específicos de fase: gobiernan todo el ciclo de vida y deben estar activos desde el primer artefacto producido hasta el último despliegue ejecutado.

| # | Artefacto | Ubicación | Restricción |
|---|---|---|---|
| 1 | **Baseline Agnóstica** | [authoritative-tech-stack-agnostic.md](../../../core/architecture/blueprints/authoritative-tech-stack-agnostic.md) | Ninguna decisión tecnológica puede violar esta baseline. |
| 2 | **Arquitectura de Referencia (Blueprint)** | [reference-blueprint.md](../../../core/architecture/blueprints/reference-blueprint.md) | Toda arquitectura de producto se mide contra este blueprint. |
| 3 | **Manifiesto de Ingeniería** | [engineering-manifesto.md](../standards/engineering/engineering-manifesto.md) | Define principios de ingeniería que gobiernan código y comportamiento del equipo. |
| 4 | **Definición de Terminado** | [construction-focused-sdlc-framework.es.md](./02-engineering/construction-focused-sdlc-framework.es.md) | Aplica a cada iteración, sprint y transición de fase. |
| 5 | **Taxonomía de Repositorio** | [repository-taxonomy.md](../standards/repository-taxonomy.md) | Reglas de naming, estructura y taxonomía aplican desde la creación del repositorio. |

---

## 8. Matriz Consolidada de Cumplimiento

La siguiente matriz ofrece una vista de una página de la densidad de artefactos por fase. Un artefacto marcado **R** es Requerido; **O** es Opcional; **C** es Condicional.

| Artefacto | F1 | F2 | F3 | F4 | F5 |
|---|:---:|:---:|:---:|:---:|:---:|
| PRD | **R** | — | — | — | — |
| Discovery Canvas | **R** | — | — | — | — |
| Technical Feasibility Canvas | **R** | — | — | — | — |
| Ballpark Estimation | **R** | — | — | — | — |
| Matriz de Priorización MoSCoW | **R** | — | — | — | — |
| Análisis Build-versus-Compose | **R** | — | — | — | — |
| Análisis de Impacto CLI | — | **R** | — | — | — |
| Directivas Arquitectónicas | — | — | — | — | — |
| Baseline Agnóstica | — | — | — | — | — |
| Taxonomía de Repositorio | — | — | — | — | — |
| ADR-0047 — Monolito Modular | — | O | — | — | — |
| Manifiesto de Ingeniería | — | — | — | — | — |
| Plantilla / Estándar de Historia Funcional | O | **R** | — | — | — |
| Blueprint de Referencia | — | **R** | **R** | — | — |
| Tech Stack Autoritativo | — | **R** | **R** | — | — |
| Matriz de Decisión ADR | — | **R** | **R** | — | — |
| ADR-0002 — Arquitectura Hexagonal | — | **R** | **R** | — | — |
| ADR-0010 — Multi-Tenancy | — | C | C | C | — |
| ADR-0045 — Extraction Readiness | — | **R** | — | — | — |
| ADR-0076 — DOMA | — | C | — | — | — |
| ADR-0018 — Pirámide de Testing | — | **R** | **R** | **R** | — |
| Declaración F2 de Topología (evolith.yaml) | — | **R** | — | — | — |
| Gates de Calidad SDLC | — | — | **R** | **R** | **R** |
| Plantilla de Historia Técnica | — | — | **R** | — | — |
| ADR-0005 — Pipeline CI/CD | — | — | **R** | **R** | **R** |
| ADR-0050 — GitFlow Branching | — | — | **R** | — | — |
| Test Summary Report | — | — | — | **R** | — |
| Acceptance Validation | — | — | — | **R** | — |
| Security Scan Report | — | — | — | **R** | — |
| Integration Evidence | — | — | — | **R** | — |
| Pyramid Distribution | — | — | — | **R** | — |
| Release Notes | — | — | — | — | **R** |
| Operations Hub | — | — | — | — | **R** |
| Infrastructure Hub | — | — | — | — | **R** |
| UMS Technical Overview / Reference | O | O | O | O | — |

> ADR-0010 es condicional: requerido cuando el producto es multi-tenant. Productos single-tenant pueden diferirlo.

---

## 9. Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Centro de Gobernanza SDLC Corporativa](./README.es.md) | Hub principal de fases SDLC y navegación. |
| [Vista Ejecutiva para Directores de Tecnología](./executive-view.es.md) | Modelo operativo SDLC a nivel directivo. |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Umbrales canónicos de calidad y política de waivers. |
| [Matriz de Responsabilidades SDLC](./responsibility-matrix.es.md) | Accountability de gates y expectativas por rol. |
| [Modelo de Trazabilidad SDLC](./traceability-model.es.md) | Cadena de evidencia end-to-end desde PRD hasta producción. |
| [Framework SDLC Orientado a Construcción](./02-engineering/construction-focused-sdlc-framework.es.md) | Definiciones de fase, ciclo de construcción y condiciones DoD. |
| [Buenas Prácticas de Documentación SDLC](./03-documentation/sdlc-documentation-best-practices.es.md) | Cómo deben escribirse y versionarse los artefactos producidos en cada fase. |
| [Hub de Plantillas de Artefactos](./04-artifact-templates/README.es.md) | Plantillas oficiales en blanco y ejemplos trabajados con UMS. |
| [Architecture Hub](../../../architecture/README.es.md) | Punto de entrada al registro completo de ADRs, blueprints y patrones canónicos. |
| [Getting Started by Role](../../getting-started/README.es.md) | Rutas de lectura por rol alineadas con las fases del ciclo de vida. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Mapeo SDLC–Artefactos</sub>
</div>
