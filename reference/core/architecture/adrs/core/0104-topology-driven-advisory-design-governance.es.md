> **Navegación Bilingüe:** [See English version](./0104-topology-driven-advisory-design-governance.md)

# ADR-0104: Gobernanza Advisory de la Fase Design Dirigida por Topología (Blueprint como Guía de Desarrollo Componible)

> **Firma del Agente:** Architect Agent (Winston)

## Estado
Propuesto (2026-07-04 — pendiente del Architecture Board) — **extiende [ADR-0079](./0079-multi-topology-reference-corpus.es.md) (corpus multi-topología) y [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) (motor de evaluación stateless)**

## Fecha
2026-07-04

## Contexto y Problema

Discovery y Design son las dos fases más consecuentes del SDLC. En **Design**, Evolith Core debe tomar un rol mayor — como motor de consulta, validación, recomendación y medición de madurez técnica. La implementación actual de la Fase 2 (Design Baseline) no está a la altura y en varios puntos contradice fronteras ya ratificadas:

- **La topología está hardcodeada, no se elige.** La Fase 2 asume `distributed-modules` con 8 reglas bloqueantes `DM-R*` y un Extraction-Readiness ≥70% bloqueante — una única escalera obligatoria. La topología no se persiste en `evolith.yaml`; se pasa en tiempo de comando. No hay mecanismo de recomendación de topología.
- **El blueprint está sub-modelado.** `blueprint.schema.json` es topología/runtime-céntrico. No compone un diseño por concerns (frontend, backend, servicios, mobile, data) ni tiene un modelo de bloques extensible para adiciones continuas dirigidas por la comunidad.
- **Drift de frontera.** El gate de Fase 2 lista *Functional Stories / User Story / Agile Backlog* como evidencia mandatoria, contradiciendo [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) y [ADR-0100](./0100-governance-execution-boundary-product-initiative.es.md) (artefactos ágiles = `ExternalReference`, no entidades de Core).
- **Sin superficie de madurez de diseño.** No hay una evaluación `design` que derive artefactos requeridos/condicionales por topología, mida madurez técnica, compare contra blueprints/ADRs/prácticas de código, ni derive criterios downstream. El drift existe pero es reactivo.
- **Sin loop de colaboración/crecimiento del conocimiento de diseño.** Los tenants no pueden componer templates de diseño reutilizables ni promoverlos aguas arriba; los agentes no proponen proactivamente templates de diseño.

La infraestructura para resolverlo ya existe y es extensible: el `EvaluationOrchestrator` stateless (ADR-0101) con `KindEvaluators` registrables, un contrato `EvaluationContext`/`EvaluationResult` que ya lleva `topologyRef`/`blueprintRef`/`initiative`/`initiativeGroup` y emite `recommendations`/`gaps`/`risks`, el corpus multi-topología y el modelo de composición (ADR-0079), y un blueprint estructurado con `topology`+`phase`. La brecha es de cobertura y postura, no de fundamentos.

## Objetivo y Alcance

Definir la **postura de gobernanza y el modelo canónico** de la fase Design & Architecture para que Core **recomiende, valide y mida madurez técnica** sobre un catálogo extensible de bloques arquitectónicos, dirigido por la topología confirmada (posiblemente mixta), permaneciendo stateless y no vinculante.

**En alcance:** la postura de Design; la definición canónica y el modelo de composición del blueprint; opcionalidad de topología y derivación con topologías mixtas; la unidad de evaluación; clasificación de artefactos mínimos/condicionales; madurez por prácticas de código; el blueprint como contrato generativo para fases downstream; el loop de colaboración tenant→Core; extensibilidad Open-Core de comunidad; extensibilidad bajo Convention over Configuration.

**Fuera de alcance (delegado):** schemas concretos, la implementación del evaluador `design`, el cableado CLI/MCP/API, y la población de `designProfile` por topología (cambios acompañantes, secuenciados tras este ADR). Las **herramientas de autoring de diseño** pertenecen al Evolith Tracker, no a Core.

## Opciones Consideradas

1. **Gate prescriptivo (rechazado).** Mantener/extender un checklist de artefactos mínimos obligatorios que bloquea en Core, con escalera de topología fija. Rechazado: contradice ADR-0101 (Core no vinculante), fuerza una topología, y no escala a diseños mixtos ni al crecimiento de comunidad.
2. **Gobernanza advisory, dirigida por topología, componible por bloques (adoptado).** Core recomienda/valida/mide madurez sobre un catálogo de bloques bajo Convention over Configuration; el blueprint es la guía de desarrollo componible; el consumidor (Tracker) decide el bloqueo.
3. **Delegar a satélites (rechazado).** Dejar la gobernanza de Design a cada producto. Rechazado: pierde la constitución heredada, el control de drift y el loop de aprendizaje upstream que son los diferenciadores de Evolith.

## Decisión y Justificación

Adoptar **Gobernanza Advisory de la Fase Design Dirigida por Topología**. Core es un **asesor stateless** para Design.

### 1. Definición canónica de Blueprint
Un **blueprint es un esquema detallado que sirve como guía para desarrollar un proyecto, proceso o sistema.** Toda otra faceta (catálogo de bloques, artefacto validado, contrato generativo) sirve a este propósito: un buen blueprint es una buena guía de desarrollo. Core mide la madurez de un blueprint = *qué tan buena guía es*.

### 2. Postura advisory (según ADR-0101)
Para Design, Core **recomienda, ayuda a validar y mide madurez técnica** — no impone. Su salida es **no vinculante** (`Recommendation`/`DecisionRecommendation`, `GapFinding`, `RiskFinding`, scores de madurez). **Quién bloquea es el consumidor** (Tracker) vía su gate configurable; Core nunca bloquea por sí mismo.

### 3. El blueprint es la caja de bloques (Convention over Configuration)
El blueprint se compone y valida desde **bloques y referencias**, por **concerns** (`frontend`, `backend`, `services`, `mobile`, `data`, …); cada concern puede variar independientemente (topología, patrones, runtime, planes). Es altamente dinámico y DEBE modelarse bajo **Convention over Configuration**: un **registro de tipos de bloque** + convenciones de composición para que cualquier bloque, concern o propuesta nueva encaje sin rediseñar el motor. **Todos los conceptos técnicos de arquitectura son adicionables en el tiempo, por convención** — el modelo nunca se cierra.

### 4. Topología: opcional, sobreescribible, extensible, mixable
El eje progresivo (F1/F2/F3 = modular-monolith → distributed-modules → microservices) es **opcional, sobreescribible y extensible** por tenant (elegir otra topología, saltarse la progresión, o definir más niveles). Un producto puede componer **topologías mixtas**. La topología se **recomienda en Discovery** y se **confirma en Design** (como composición) vía `evolith.yaml`. El conjunto actual `distributed-modules` + `DM-R*` + Extraction-Readiness se reencuadra de *bloqueante-de-Core* a *advisory que puntúa madurez*.

### 5. Unidad de evaluación = la iniciativa
Core evalúa la **iniciativa** (agrupada vía `initiativeGroup` o sola) que pasó Discovery. **User stories, backlog y epics no son de Core** — son `ExternalReference` del Tracker (según ADR-0101, ADR-0100). La evidencia de stories/backlog del gate de Fase 2 queda deprecada en consecuencia.

### 6. Artefactos mínimos + condicionales como bloques
Los artefactos de diseño recomendados son **bloques/secciones dentro del blueprint**, no documentos sueltos: un pequeño set **universal** (blueprint de arquitectura, estrategia de testing, ADRs, cumplimiento de topología, madurez técnica) recomendado a toda iniciativa, más bloques **derivados por topología** (planes de infraestructura, DevOps/CI-CD, pruebas unitarias, build, performance) cuya exigencia y umbrales son la **unión de los `designProfile` de las topologías confirmadas**, con merge de estricto-gana e incompatibilidad → ADR de reconciliación recomendado. Son **defaults recomendados que alimentan el score de madurez**, overridables/extensibles por tenant — no un piso duro que bloquea.

### 7. Prácticas de código como bloques de madurez
Las prácticas de código de referencia — DRY, YAGNI, clean code, clean architecture, design patterns — son **bloques del catálogo que puntúan la madurez del diseño** (advisory), junto a topología y completitud de artefactos.

### 8. El blueprint como contrato generativo para fases downstream
Un blueprint compuesto y validado **alimenta y define los requerimientos y criterios** de Construcción, Calidad y Despliegue. Core **deriva** esos requerimientos/criterios desde el blueprint como **recomendaciones** (stateless: blueprint entra → criterios derivados salen); el Tracker los usa para configurar cada gate de fase. Un blueprint más maduro produce criterios downstream más ricos y trazables.

### 9. Loop de colaboración y crecimiento (Open-Core)
Los tenants componen diseños desde bloques y pueden **crear templates tenant-scope reutilizables** (persistidos en el **Tracker**), o **solicitar la promoción** de un template a Core vía **Upstream Proposals (UP-NNN)** → Architecture Board → corpus canónico, con tiers `community | certified | official`. Los **agentes de Core proponen proactivamente** templates de diseño e ideas en tres niveles de complejidad (**simple / medio / complejo**). Todo el conocimiento de diseño (topologías, ADRs, blueprints, rulesets, schemas, templates, estándares) es **open source extensible por la comunidad** bajo gobernanza, con un gate de certificación en CI para las contribuciones externas. Este loop de aprendizaje upstream enriquece Core continuamente.

### 10. Statelessness preservada (según ADR-0101)
Core **deriva, recomienda, valida y mide**; **recibe** propuestas de promoción. **Nunca persiste** templates tenant-scope, evidencia ni configuración downstream — eso vive en el Tracker. Las **herramientas de autoring de diseño** viven en el Tracker.

### 11. Colecciones privadas por tenant — inteligencia personalizada
Aunque Core es stateless y solo mantiene el corpus canónico, **un tenant puede mantener su propia colección privada de ADRs, templates, rulesets, blueprints, patrones y estándares a nivel de Tracker** (tenant-scope, persistida por el Tracker), para que sus agentes e inteligencia de diseño sean **más ricos y personalizados a su realidad**.
- El **catálogo efectivo** que ven los agentes y evaluaciones del tenant = **corpus canónico de Core ∪ colección privada del tenant**. El tenant puede **extender/añadir** libremente y **override** donde esté permitido — nunca relajando el piso fijado por Core (modelo de gate inteligente).
- **Core sigue stateless:** el tenant (vía el Tracker) **le pasa sus ADRs/rulesets/blueprints privados como contexto/refs** en el `EvaluationContext` (`rulesetRef`, `policyRefs`, `blueprintRef`, `adrRefs`, `schemaRef`); Core evalúa contra la unión y nunca persiste la colección del tenant.
- Los **agentes propios del tenant** (según el [Modelo de Autoridad de Agentes](../../../foundations/agent-skills/agent-authority-model.es.md)) usan la colección privada como conocimiento personalizado para propuestas y asesoría — más cerca del dominio del tenant que el Core puro.
- Lo que el tenant quiera canonizar sube aguas arriba vía UP-NNN (§9).

## Evidencia y Criterios de Evaluación

- **Consistencia con fronteras ratificadas:** alinea con ADR-0101 (stateless, no vinculante, `initiative`/`initiativeGroup` opacos) y ADR-0079 (corpus multi-topología + composición); resuelve el drift de stories/backlog ya mandatado por ADR-0100/GT-375.
- **Reutilizar antes que reconstruir:** el `EvaluationOrchestrator` + `KindEvaluators`, `EvaluationContext`/`Result`, los topology manifests (`spec.artifacts`, `operationalBudgets`, `composableWith`) y `blueprint.schema.json` ya existen; esta decisión los extiende aditivamente.
- **Madurez como señal primaria:** consistente con el framework de madurez existente (TOGAF ACMM + estados con evidencia, `maturity-evidence.schema.json`).
- **Criterios de aceptación** y un **checklist de validación** están registrados en el plan de implementación y se vuelven `GT-*` acompañantes (paridad Native/OPA R-25, paridad bilingüe, validación de schema con ajv, paridad de resultado CLI/MCP/API BR-008, cero regresión en el gate F2 actual).

## Consecuencias, Riesgos y Trade-offs

**Positivo:** Design se vuelve una superficie advisory de primera clase; la topología dirige los artefactos (incl. mixtos); el blueprint es una guía de desarrollo coherente que además dirige las fases downstream; un loop de crecimiento gobernado enriquece Core; Convention over Configuration mantiene el modelo perpetuamente extensible; cierra las brechas de "gate solo-existencia" (GT-08…GT-11) al volver Design una superficie con madurez medida.

**Negativo / riesgos:**
- *Reencuadrar el gate F2* (distributed-modules bloqueante → advisory) arriesga romper satélites que dependen del bloqueo actual → mitigar con defaults compatibles hacia atrás y deprecación por fases (warning → error); el bloqueo pasa a ser decisión del Tracker.
- *Sacar la evidencia de stories/backlog* → reclasificar como `ExternalReference` (aceptada como referencia opaca, no evaluada); deprecar con warnings.
- *Contribuciones de comunidad* podrían introducir inconsistencia o inseguridad → certificación obligatoria en CI (ajv + paridad Native/OPA + bilingüe + fixtures), revisión del Board vía UP-NNN, y validación con OPA; el tier `community` es no-canónico hasta aprobación.
- *El modelo Convention-over-Configuration* añade costo de diseño inicial en el registro de tipos de bloque → justificado por la extensibilidad perpetua.

**Trade-offs:** Core gana amplitud (recomendar/validar/medir/derivar) mientras rechaza explícitamente la autoridad de enforcement y la persistencia — el valor es guía confiable y medición de madurez, no gatekeeping.

## Referencias

- [ADR-0079 — Corpus de Referencia Multi-Topología y Topology Manifest](./0079-multi-topology-reference-corpus.es.md)
- [ADR-0101 — Evolith Core como Motor de Evaluación Stateless](./0101-core-stateless-evaluation-engine.es.md)
- [ADR-0100 — Frontera Gobernanza ↔ Ejecución](./0100-governance-execution-boundary-product-initiative.es.md)
- [ADR-0045 — Criterios de Extraction Readiness de Microservicios](./0045-microservice-extraction-readiness-criteria.es.md)
- [ADR-0018 — Testing Pyramid y Quality Gates](./0018-testing-pyramid-quality-gates.es.md)
- [Product Vision Master](../../../../../product/suite/vision/evolith-product-vision-master.es.md) §2.4 (Modos de Ejecución), §4.1 (Gobernanza Federada), §8 (Open-Core)

## Decisiones y Estándares Relacionados

- **Extiende:** ADR-0079, ADR-0101. **Reconcilia:** ADR-0100/GT-375 (artefactos ágiles como `ExternalReference`).
- **Cambios acompañantes (secuenciados):** `spec.designProfile` en topology manifests; `EvaluationKind` `design`; `blueprint.schema.json` multi-concern bajo CoC; reglas de `topology-recommendation`; schema de `evolith.yaml` con `design.topology.recommended|confirmed`; `design-template.schema.json`; skills de agente `design-template-proposal` / `template-promotion`; derivación blueprint→criterios downstream.
- **Glosario:** la definición canónica de **Blueprint** (§1 de este ADR) se enshrina en [`reference/core/sdlc/glossary/glossary.es.md`](../../../sdlc/glossary/glossary.es.md).
- **Registros de aprendizaje de agentes:** [Modelo de Autoridad de Agentes](../../../foundations/agent-skills/agent-authority-model.es.md), [Flujo de Discovery del Tracker](../../../foundations/agent-skills/tracker-discovery-flow.es.md).

---
[Volver al Registro de ADRs](./README.es.md)
