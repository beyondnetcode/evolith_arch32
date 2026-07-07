# Plan de Implementación del Corpus de Referencia Multi-Topología

> **Navegación Bilingüe:** [English](./multi-topology-reference-corpus-implementation-plan.md)

**Estado:** Seguimiento Activo  
**Owner:** Evolith Architecture Board  
**Última Actualización:** 2026-06-18  
**Alcance:** Taxonomía de Evolith Core, rulesets, CLI, MCP y Service CORE API  
**Visión Relacionada:** [Framework Estratégico de Validación y Composición de Evolith](../../../../product/suite/methods/evolith-strategic-validation-and-composition-framework.es.md)

Este documento es el tracker de implementación para evolucionar Evolith Core desde un corpus de referencia de monolito progresivo hacia un **Corpus de Referencia Multi-Topología** con gobernanza ejecutable. Está escrito para que cualquier modelo de arquitectura o agente de código entienda la corrección esperada, preserve la autoridad existente del repositorio y pueda continuar el trabajo sin volver a debatir la decisión central.

---

## 1. Decisión Ejecutiva

Evolith Core debe soportar múltiples topologías de arquitectura, pero la implementación debe ser **orientada por manifiestos, dimensional y compatible con el plano de control existente**.

La dirección aprobada es:

1. Mantener CLI, MCP y Service CORE API como un único plano de control operativo.
2. Tratar cada topología como un perfil gobernado declarado por un `topology.manifest.json`.
3. Mantener los ADRs universales en el registro ADR existente y referenciarlos desde los perfiles topológicos.
4. Ubicar la documentación topológica escrita por humanos bajo `reference/core/architecture/topologies/`.
5. Ubicar las reglas topológicas ejecutables bajo `rulesets/topologies/`.
6. Preservar la Paridad de Dos Motores: cada nueva regla de validación topológica requiere cobertura de ruleset JSON nativo y cobertura OPA/Rego equivalente.
7. No crear un directorio `/topologies/` en la raíz salvo que un ADR futuro cambie explícitamente la taxonomía de raíz.

## 2. Baseline Actual

El repositorio ya tiene los bloques principales, pero todavía no se resuelven por topología.

| Área | Ubicación Actual | Estado Actual |
|---|---|---|
| Autoridad ADR | [Registro ADR](../../architecture/adrs/README.es.md) | Los ADRs están agrupados por Core/runtime, no por topología. |
| Reglas progresivas | [Rulesets de Arquitectura](../../../../src/rulesets/architecture/README.es.md) | F1/F2/F3 ya codifican reglas de monolito modular, módulos distribuidos y microservicios. |
| Paridad OPA | [Reglas OPA](../../architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rego) | OPA existe para las reglas de arquitectura actuales, pero no para nuevas familias topológicas. |
| Validación CLI | [Comando Validate](../../../../src/sdk/cli/src/commands/validate/validate.command.ts) | Soporta `--arch-level F1/F2/F3`, no `--topology`. |
| Scaffolding CLI | [Comando Scaffold](../../../../src/sdk/cli/src/commands/architecture/scaffold.command.ts) | Enfocado en monolito modular y microfrontends. |
| Recursos MCP | [Resources Service](../../../../src/packages/mcp-server/src/mcp/resources.service.ts) | Expone recursos globales, no recursos direccionados por topología. |
| Herramientas MCP | [Architecture Tools](../../../../src/packages/mcp-server/src/tools/architecture.tools.ts) | Valida niveles F1/F2/F3, no manifiestos topológicos. |
| Service CORE API | [Architecture Controller](../../../../src/apps/core-api/src/presentation/controllers/architecture.controller.ts) | Expone validación de arquitectura y detección de drift, no endpoints de catálogo topológico. |
| Taxonomía del repositorio | [Taxonomía del Repositorio](../taxonomy/repository-taxonomy.md) | Todavía no autoriza directorios topológicos como áreas de primer nivel del corpus de arquitectura. |

## 3. Guardrails Innegociables

Cualquier agente o modelo que trabaje en este cambio debe obedecer estas reglas:

1. No crear `/topologies/` en la raíz del repositorio sin un nuevo ADR aceptado que modifique la taxonomía.
2. No duplicar ADRs Core dentro de carpetas de topología. Los perfiles topológicos referencian ADRs Core y agregan solo decisiones específicas de topología.
3. No crear un CLI separado por topología.
4. No crear un servidor MCP separado por topología.
5. No tratar `serverless`, `event-driven`, `data-mesh`, `edge-computing` y `agentic-ai` como estados de producto mutuamente excluyentes.
6. No agregar una nueva regla de validación sin actualizar tanto el ruleset nativo como la política OPA/Rego correspondiente.
7. No poner presupuestos, ROI, costos, staffing u otros datos de ownership de negocio dentro de artefactos topológicos de Core.
8. Mantener a Evolith Tracker como responsable de tiempos de negocio, ownership, priorización y decisiones de Funnel 0.
9. Mantener enlaces internos relativos y validar anchors antes de completar.
10. Mantener paridad bilingüe en cada artefacto Markdown.

## 4. Taxonomía Objetivo

El corpus topológico es dimensional. Un producto puede combinar perfiles de más de una dimensión.

```text
reference/core/architecture/topologies/
  README.md
  progressive-axis/
    modular-monolith/
    distributed-modules/
    microservices/
  execution/
    serverless/
    edge-computing/
  integration/
    event-driven/
  data/
    data-mesh/
  ai/
    agentic-ai/
```

Las reglas ejecutables viven separadas:

```text
rulesets/topologies/
  README.md
  progressive-axis/
    modular-monolith/
      native/
      opa/
    distributed-modules/
      native/
      opa/
    microservices/
      native/
      opa/
  execution/
    serverless/
      native/
      opa/
    edge-computing/
      native/
      opa/
  integration/
    event-driven/
      native/
      opa/
  data/
    data-mesh/
      native/
      opa/
  ai/
    agentic-ai/
      native/
      opa/
```

## 5. Contrato de Perfil Topológico

Cada perfil topológico debe exponer las mismas familias de artefactos, incluso si los perfiles iniciales comienzan como `Draft` o `Proposed`.

```text
reference/core/architecture/topologies/<dimension>/<topology>/
  README.md
  topology.manifest.json
  designs/
  diagrams/
  adrs/
  ai-rulesets/
  mcp/
    resources.json
    tools.json
    prompts/
  cli/
    commands.json
    scaffolds/
    validators/
  ums-contracts/
```

El `topology.manifest.json` es el contrato vinculante. Debe identificar:

| Campo | Propósito |
|---|---|
| `id` | Identificador estable de topología, como `modular-monolith` o `serverless`. |
| `dimension` | Uno de `progressive-axis`, `execution`, `integration`, `data` o `ai`. |
| `status` | `draft`, `proposed`, `accepted` o `deprecated`. |
| `inherits` | ADRs Core, estándares, rulesets y políticas heredadas por la topología. |
| `adrs` | ADRs específicos de la topología únicamente. |
| `rulesets.native` | Rulesets JSON nativos para esta topología. |
| `rulesets.opa` | Políticas OPA/Rego equivalentes para esta topología. |
| `mcp.resources` | Descriptores de recursos MCP expuestos a agentes IA. |
| `mcp.tools` | Descriptores de herramientas MCP o mapeos de herramientas para acciones gobernadas. |
| `cli.validators` | Validadores CLI cargados cuando se selecciona `--topology`. |
| `cli.scaffolds` | Scaffolds opcionales disponibles para la topología seleccionada. |
| `umsContracts` | Contratos de referencia aplicada UMS relevantes para esta topología. |

## 6. Autoridad de Tracking

[Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) es la fuente única de verdad para deuda, gaps, oportunidades, habilitadores, prioridad y estado de Multi-Topology. Las actividades `MT-A*` viven allí con criticidad, complejidad, estado y orden canónico.

Este plan de implementación es un documento de detalle y handoff. Úsalo para entender la arquitectura objetivo, contratos, dependencias y expectativas de validación, pero actualiza el estado de actividades solo en [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md).

## 7. Fases de Ejecución

El tablero en [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) es autoritativo. Las fases siguientes explican el orden de ejecución de las actividades `MT-A*`.

| Fase | Actividades | Meta |
|---|---|---|
| Foundation | `MT-A01` a `MT-A08` | Bloquear gobernanza, taxonomía, schema y compatibilidad antes de crear contenido topológico. |
| Corpus | `MT-A09` a `MT-A16` | Crear el corpus topológico legible por humanos y los perfiles topológicos draft. |
| Enforcement | `MT-A17` a `MT-A21` | Hacer ejecutables los perfiles topológicos mediante schema, reglas Native, reglas OPA y resolución compartida. |
| Interfaces | `MT-A22` a `MT-A25` | Exponer gobernanza topológica mediante CLI, MCP y Service CORE API. |
| Evidence | `MT-A26` | Actualizar navegación y registrar evidencia de validación. |

## 8. Contrato CLI

El CLI debe seguir siendo una única superficie ejecutable. Agregar conciencia topológica como parámetro, no como producto nuevo.

Comandos requeridos:

```bash
evolith topology list
evolith topology inspect modular-monolith
evolith validate --topology modular-monolith
evolith validate --topology serverless --engine native
evolith validate --topology serverless --engine opa
evolith adr create --topology event-driven
evolith scaffold --topology agentic-ai --pattern mcp-enabled-context
```

Regla de compatibilidad:

```text
--arch-level F1 -> --topology modular-monolith
--arch-level F2 -> --topology distributed-modules
--arch-level F3 -> --topology microservices
```

El CLI debe resolver:

1. manifiesto topológico;
2. rulesets Core heredados;
3. rulesets nativos específicos de topología;
4. políticas OPA específicas de topología;
5. schemas;
6. scaffolds;
7. envelope de salida definido por ADR-0073.

## 9. Contrato MCP

MCP debe exponer contexto topológico mediante primitivas estándar MCP: Recursos, Herramientas y Prompts.

Recursos requeridos:

```text
evolith://topologies
evolith://topologies/{id}/manifest
evolith://topologies/{id}/adrs
evolith://topologies/{id}/rulesets
evolith://topologies/{id}/mcp
evolith://topologies/{id}/cli
evolith://topologies/{id}/ums-contracts
```

Herramientas requeridas:

```text
evolith-topology-list
evolith-topology-inspect
evolith-topology-validate
evolith-adr-recommend
evolith-ruleset-explain
evolith-scaffold-plan
```

Prompts requeridos:

```text
topology-aware-implementation
adr-impact-analysis
extraction-readiness-review
serverless-readiness-review
agentic-ai-governance-review
```

Las herramientas MCP deben llamar los mismos casos de uso de capa de aplicación que el CLI y Service CORE API.

## 10. Contrato Service CORE API

La Service CORE API debe exponer descubrimiento y validación topológica para orquestadores externos como Evolith Tracker.

Endpoints requeridos:

```text
GET  /topologies
GET  /topologies/:id
GET  /topologies/:id/manifest
POST /topologies/:id/validate
POST /topologies/:id/scaffold-plan
```

La API no debe aceptar ejecución arbitraria de comandos. Solo puede invocar casos de uso de aplicación registrados.

## 11. Secuencia de Migración

Usar este orden. No avanzar a implementación antes de que existan el ADR y el schema.

1. Escribir y aceptar el ADR Multi-Topology.
2. Actualizar taxonomía del repositorio y reglas de taxonomía.
3. Agregar `topology-manifest.schema.json`.
4. Crear `reference/core/architecture/topologies/README.md` y `.es.md`.
5. Crear `rulesets/topologies/README.md` y `.es.md`.
6. Crear los perfiles `progressive-axis` y mapear F1/F2/F3.
7. Crear perfiles draft para serverless, edge, event-driven, data mesh y agentic AI.
8. Agregar carga de rulesets topológicos a la capa compartida Core Domain.
9. Agregar soporte CLI para `--topology`.
10. Agregar recursos MCP topológicos.
11. Agregar herramientas MCP topológicas.
12. Agregar endpoints topológicos a Service CORE API.
13. Actualizar navegación e índices maestros.
14. Ejecutar validación.
15. Registrar evidencia y actualizar estados de seguimiento.

## 12. Comandos de Validación

Ejecutar estos comandos después de cada cambio documental o de rulesets:

```bash
node .harness/scripts/ci/04-check-bilingual-parity.mjs
node .harness/scripts/ci/01-validate-docs.mjs
node .harness/scripts/validate-rulesets.mjs
```

Ejecutar este comando cuando cambien diagramas Mermaid:

```bash
node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid
```

Ejecutar estos comandos cuando cambien CLI, MCP, Core API o código compartido de dominio:

```bash
npm test
npm run mcp:smoke
```

Si los comandos de test por paquete difieren, usar el README del paquete y reportar los comandos exactos ejecutados.

## 13. Definition of Done

La transición al Corpus de Referencia Multi-Topología está completa solo cuando:

1. El ADR Multi-Topology está aceptado.
2. El schema de manifiesto topológico existe y se valida.
3. `reference/core/architecture/topologies/` está enlazado desde Architecture Hub e índices de navegación.
4. `rulesets/topologies/` existe y está enlazado desde Rulesets Hub.
5. Modular monolith está representado como el primer perfil topológico.
6. La compatibilidad F1/F2/F3 se preserva.
7. Los perfiles serverless, edge computing, event-driven, data mesh y agentic AI existen al menos como draft.
8. El CLI puede validar por `--topology`.
9. MCP expone recursos topológicos.
10. Service CORE API expone endpoints de descubrimiento y validación topológica.
11. Las reglas Native y OPA son equivalentes para cada nueva regla topológica.
12. La paridad bilingüe pasa.
13. La validación documental pasa.
14. La validación de rulesets pasa.
15. La evidencia queda registrada y este tracker queda actualizado.

## 14. Instrucciones de Handoff para Agentes

Cuando un agente retome este trabajo:

1. Leer este documento primero.
2. Leer [Taxonomía del Repositorio](../taxonomy/repository-taxonomy.md), [ADR-0048](../../architecture/adrs/core/0048-enterprise-taxonomy-reference-layout.md), [ADR-0070](../../architecture/adrs/core/0070-lean-root-repository-taxonomy.md), [ADR-0073](../../architecture/adrs/core/0073-unified-cli-output-contract.md), [ADR-0074](../../architecture/adrs/core/0074-evolith-core-api-exposure-layer.md) y [ADR-0041](../../architecture/adrs/core/0041-dual-engine-policy-evaluation.md).
3. Revisar `git status --short` y preservar cambios no relacionados del usuario.
4. Implementar solo la siguiente actividad `PENDING`.
5. Mantener archivos en inglés y español estructuralmente alineados.
6. Ejecutar los comandos de validación relevantes para los archivos modificados.
7. Actualizar el estado de actividades solo en [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md), y solo cuando exista evidencia.

---
[Volver al Índice de Visión](../../README.es.md)
