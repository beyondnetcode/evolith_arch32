# Hub de Topologias

> **Navegacion Bilingue:** [English Version](./README.md)

Esta area es el corpus canonico legible por humanos para topologias de arquitectura de Evolith Core.

La guia topologica es dimensional, orientada por manifiestos y ejecutable mediante el plano de control compartido de Evolith. Un producto puede combinar perfiles topologicos entre dimensiones cuando los archivos `topology.manifest.json` correspondientes permiten esa composicion.

## Orden de Lectura

| Documento | Proposito | Obligatorio |
|---|---|---|
| [Modelo de Dimensiones Topologicas](./topology-dimensions.es.md) | Define dimensiones, reglas de composicion, compatibilidad F1/F2/F3, contrato de perfil y frontera de negocio | Si |
| [Perfil de Monolito Modular](./progressive-axis/modular-monolith/README.es.md) | Topologia inicial canonica compatible con F1 | Si |
| [Perfil de Modulos Distribuidos](./progressive-axis/distributed-modules/README.es.md) | Topologia canonica de extraccion controlada compatible con F2 | Si |
| [Perfil de Microservicios](./progressive-axis/microservices/README.es.md) | Topologia canonica de servicios compatible con F3 | Si |
| [Perfil Serverless](./execution/serverless/README.es.md) | Topologia draft de ejecucion administrada | No |
| [Perfil Edge Computing](./execution/edge-computing/README.es.md) | Topologia draft de ejecucion orientada a localidad | No |
| [Perfil Event-Driven](./integration/event-driven/README.es.md) | Topologia draft de integracion asincrona | No |
| [Perfil Data Mesh](./data/data-mesh/README.es.md) | Topologia draft de ownership analitico distribuido | No |
| [Perfil Agentic AI](./ai/agentic-ai/README.es.md) | Topologia draft AI-first y de workflows agentic | No |

## Dimensiones Gobernadas

| Dimension | Topologias Canonicas | Proposito |
|---|---|---|
| `progressive-axis` | `modular-monolith`, `distributed-modules`, `microservices` | Preservar compatibilidad F1/F2/F3 dentro del modelo topologico amplio. |
| `execution` | `serverless`, `edge-computing` | Gobernar modelos de ejecucion administrada, escalada por eventos y edge. |
| `integration` | `event-driven` | Gobernar coordinacion asincrona y contratos de eventos. |
| `data` | `data-mesh` | Gobernar ownership distribuido de datos analiticos y de dominio. |
| `ai` | `agentic-ai` | Gobernar patrones arquitectonicos AI-first y agentic. |

## Reglas de Autoridad

- Los perfiles topologicos referencian ADRs Core universales; no los duplican.
- Cada perfil topologico debe proveer un `topology.manifest.json` antes de volverse ejecutable.
- La guia topologica legible por humanos vive aqui bajo `reference/architecture/topologies/`.
- Las reglas topologicas ejecutables viven bajo `rulesets/topologies/`.
- CLI, MCP y Service CORE API permanecen como un solo plano de control; el comportamiento topologico se resuelve mediante manifiestos.
- Los artefactos topologicos de Core permanecen solo tecnicos. Evolith Tracker posee timing de negocio, ownership, priorizacion, ROI, costo y Funnel 0.

## Autoridad Relacionada

| Artefacto | Rol |
|---|---|
| [ADR-0079: Corpus de Referencia Multi-Topologia](../adrs/core/0079-multi-topology-reference-corpus.es.md) | Decision gobernante del modelo de corpus |
| [Taxonomia del Repositorio](../../governance/standards/repository-taxonomy.es.md) | Autoriza esta ruta y prohibe `/topologies/` en raiz |
| [Schema de Manifiesto Topologico](../../../rulesets/schema/topology-manifest.schema.json) | Contrato de manifiesto legible por maquina |
| [Plan de Implementacion Multi-Topology](../../governance/standards/vision/multi-topology-reference-corpus-implementation-plan.es.md) | Plan de ejecucion de apoyo |
| [Tablero de Seguimiento de Gaps](../../governance/standards/vision/gap-tracking.es.md) | Tracker canonico de estado |

---
[Volver al Hub de Arquitectura](../README.es.md)
