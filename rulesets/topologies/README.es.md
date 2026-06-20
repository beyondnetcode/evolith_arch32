# Hub de Rulesets Topologicos

> **Navegacion Bilingue:** [English Version](./README.md)

Esta area define el modelo canonico de resolucion de rulesets topologicos para la gobernanza de Evolith Core.

La guia topologica legible por humanos vive en `reference/architecture/topologies/`. Esta carpeta contiene las reglas legibles por maquina que consumen CLI, MCP, Service CORE API, CI y futuros resolvers topologicos.

## Modelo de Ejecucion

| Preocupacion | Ubicacion Canonica | Proposito |
|---|---|---|
| Schema de manifiesto | `rulesets/schema/topology-manifest.schema.json` | Validar cada `topology.manifest.json`. |
| Reglas topologicas Native | `spec.artifacts.rulesets[]` declarado por el manifiesto | Ejecutar checks especificos de topologia en el evaluador Native. |
| Politicas topologicas OPA | `spec.artifacts.opaPolicies[]` declarado por el manifiesto | Ejecutar politicas Rego equivalentes para paridad OPA. |
| Corpus humano | `reference/architecture/topologies/` | Explicar intencion, restricciones, ADRs y reglas de composicion topologica. |

## Dimensiones Gobernadas

| Dimension | Topologias | Patron de Ruta de Reglas |
|---|---|---|
| `progressive-axis` | `modular-monolith`, `distributed-modules`, `microservices` | `rulesets/topologies/progressive-axis/<topology>/` |
| `execution` | `serverless`, `edge-computing` | `rulesets/topologies/execution/<topology>/` |
| `integration` | `event-driven` | `rulesets/topologies/integration/<topology>/` |
| `data` | `data-mesh` | `rulesets/topologies/data/<topology>/` |
| `ai` | `agentic-ai` | `rulesets/topologies/ai/<topology>/` |

## Reglas de Enforcement

- No crear un CLI, servidor MCP o Core API separado por topologia.
- No colocar diseno topologico legible por humanos como fuente ejecutable de verdad; manifiestos y sus rulesets declarados son el contrato ejecutable.
- No construyas rutas legacy de archivos F1/F2/F3. Resuelve el alias de compatibilidad mediante el manifiesto topologico del eje progresivo.
- Cada nueva regla topologica ejecutable debe preservar Dual-Engine Parity cuando ambos motores apliquen.
- Las politicas OPA no deben desviarse de la semantica de reglas Native.
- Las reglas topologicas no deben codificar presupuesto, ROI, costo, staffing, priorizacion, timing ni ownership de negocio.

## Estado Actual

La ubicacion de rulesets topologicos esta autorizada. Los perfiles topologicos concretos y sus reglas Native mas OPA se rastrean en el [Tablero de Seguimiento de Gaps](../../reference/governance/standards/vision/gap-tracking.es.md).

---
[Volver al Hub de Rulesets](../README.es.md)
