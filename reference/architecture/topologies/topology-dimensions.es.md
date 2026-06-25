# Modelo de Dimensiones Topologicas

> **Navegacion Bilingue:** [English Version](./topology-dimensions.md)

**Estado:** Aceptado  
**Owner:** Evolith Architecture Board  
**Ultima Actualizacion:** 2026-06-18  
**Clasificacion:** Referencia de Arquitectura Core  
**ADR Gobernante:** [ADR-0079: Corpus de Referencia Multi-Topologia](../adrs/core/0079-multi-topology-reference-corpus.es.md)

Este documento define el modelo dimensional del Corpus de Referencia Multi-Topologia de Evolith Core. Es la capa canonica de interpretacion para perfiles topologicos escritos por humanos bajo `reference/architecture/topologies/` y reglas topologicas ejecutables bajo `rulesets/topologies/`.

## 1. Proposito

Evolith Core no trata las topologias de arquitectura como etiquetas de madurez mutuamente excluyentes. Un producto puede ser un monolito modular, usar integracion event-driven, adoptar puntos seleccionados de ejecucion serverless, exponer cargas edge y aun asi permanecer gobernado por un solo framework arquitectonico coherente.

El modelo dimensional previene dos fallas:

- forzar cada producto por una unica escalera de monolito a microservicios;
- fragmentar la gobernanza en superficies separadas de CLI, MCP o Core API por topologia.

## 2. Dimensiones

| Dimension | Pregunta que Responde | Topologias Canonicas | Ruta Primaria del Corpus |
|---|---|---|---|
| `progressive-axis` | Como se descompone y evoluciona el sistema en el tiempo? | `modular-monolith`, `distributed-modules`, `microservices` | `reference/architecture/topologies/progressive-axis/` |
| `execution` | Donde y como ejecuta el codigo? | `serverless`, `edge-computing` | `reference/architecture/topologies/execution/` |
| `integration` | Como coordinan y se comunican los componentes? | `event-driven` | `reference/architecture/topologies/integration/` |
| `data` | Como se distribuye el ownership analitico y de datos de dominio? | `data-mesh` | `reference/architecture/topologies/data/` |
| `ai` | Como se gobiernan agentes IA, contexto de modelo y workflows autonomos? | `agentic-ai` | `reference/architecture/topologies/ai/` |

## 3. Regla de Composicion

Los perfiles topologicos son componibles cuando pertenecen a dimensiones distintas y sus manifiestos permiten explicitamente la combinacion mediante `spec.compatibility.composableWith`.

> **Referencia ejecutable:** [`examples/cross-topology-composition/`](../../knowledge/demo/examples/cross-topology-composition/README.es.md) publica una composición ejecutable `modular-monolith + event-driven`. El script CI `.harness/scripts/ci/22-validate-topology-composition.mjs` la valida en cada commit contra [`topology-composition.schema.json`](../../../rulesets/schema/topology-composition.schema.json).

Ejemplos:

| Estado del Producto | Set Topologico Valido | Razonamiento |
|---|---|---|
| Producto enterprise temprano | `modular-monolith` | Mantiene la entrega simple y evita distribucion prematura. |
| Producto modular con limites asincronos | `modular-monolith` + `event-driven` | Agrega gobernanza de integracion sin forzar microservicios. |
| Plataforma distribuida con ownership analitico | `distributed-modules` + `event-driven` + `data-mesh` | Separa descomposicion runtime, estilo de integracion y ownership de datos. |
| Producto AI-first sobre ejecucion administrada | `modular-monolith` + `serverless` + `agentic-ai` | Combina ownership de dominio simple, ejecucion administrada y gobernanza IA. |
| Producto distribuido de baja latencia | `microservices` + `edge-computing` + `event-driven` | Combina descomposicion de servicios, ubicacion edge y coordinacion por eventos. |

## 4. Compatibilidad del Eje Progresivo

F1, F2 y F3 permanecen como aliases de compatibilidad, no como todo el universo topologico.

| Fase Legacy | Topologia Canonica | Significado |
|---|---|---|
| `F1` | `modular-monolith` | Un sistema desplegable con bounded contexts internos estrictos. |
| `F2` | `distributed-modules` | Multiples modulos o servicios desplegables con extraccion controlada. |
| `F3` | `microservices` | Servicios desplegables independientemente gobernados por contratos explicitos y madurez operativa. |

El CLI puede seguir aceptando `--arch-level F1/F2/F3`, pero el resolver compartido debe mapear esos valores a `--topology modular-monolith`, `--topology distributed-modules` y `--topology microservices`.

## 5. Contrato de Perfil

Cada perfil topologico es un contexto tecnico delimitado. Un perfil completo debe contener o referenciar:

| Familia de Artefactos | Proposito Requerido |
|---|---|
| `topology.manifest.json` | Contrato vinculante legible por maquina validado por `rulesets/schema/topology-manifest.schema.json`. |
| `adrs/` | Decisiones especificas de topologia unicamente; los ADRs Core universales se referencian, no se duplican. |
| `designs/` y `diagrams/` | Guia de diseno legible por humanos y modelos visuales. |
| `ai-rulesets/` | Restricciones para agentes IA y contexto de implementacion para herramientas habilitadas por MCP. |
| `mcp/` | Recursos, herramientas y prompts MCP expuestos por el servidor MCP unificado. |
| `cli/` | Validadores, mapeos de comandos y scaffolds opcionales cargados por el CLI unificado. |
| `ums-contracts/` | Contratos tecnicos o ejemplos de referencia aplicada desde UMS. |

Las reglas ejecutables para la misma topologia viven bajo `rulesets/topologies/<dimension>/<topology>/` y deben preservar paridad Native mas OPA cuando una regla sea ejecutable por ambos motores.

## 6. Frontera de Negocio

Los perfiles topologicos son artefactos de ideacion tecnica de Fase 1. Definen el "que" y el "como" tecnico de la gobernanza arquitectonica. No deben contener presupuesto, ROI, costo, staffing, ownership de negocio, priorizacion, timing de entrega ni datos de decision de Funnel 0.

Evolith Tracker posee tiempos de negocio, ownership, priorizacion y Funnel 0 mediante su ACL. Core manifiesta solo el contrato tecnico requerido por CLI, MCP, Service CORE API y gobernanza arquitectonica.

## 7. Orden de Resolucion

Las interfaces operativas deben resolver contexto topologico en este orden:

1. Cargar el `topology.manifest.json` solicitado.
2. Resolver ADRs Core, estandares y rulesets heredados.
3. Resolver ADRs especificos de topologia y guia legible por humanos.
4. Resolver rulesets Native y politicas OPA.
5. Resolver recursos, herramientas y prompts MCP.
6. Resolver validadores y scaffolds CLI.
7. Retornar resultados mediante el envelope universal de salida gobernado por ADR-0073.

---
[Volver al Hub de Arquitectura](../README.es.md)
