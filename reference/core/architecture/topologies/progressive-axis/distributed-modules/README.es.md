# Perfil Topologico de Modulos Distribuidos

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Aceptado  
**Dimension:** `progressive-axis`  
**ID de Topologia:** `distributed-modules`  
**Alias de Compatibilidad:** `F2`  
**Manifiesto:** [topology.manifest.json](./topology.manifest.json)

Los modulos distribuidos son la topologia de Evolith para extraccion controlada cuando un monolito modular necesita limites desplegables o escalables de forma independiente, pero antes de que la organizacion acepte la complejidad operativa completa de microservicios.

## Proposito

Usa esta topologia cuando los modulos necesitan mayor autonomia de despliegue o escalamiento y el producto tiene contratos explicitos, evidencia de readiness de extraccion y ownership operativo suficientemente maduro para soportar distribucion.

Esta topologia no es un monolito distribuido a medias. Cada modulo distribuido debe exponer contratos claros, poseer su frontera de integracion y preservar aislamiento de dominio.

## Reglas de Gobernanza

| Regla | Requisito |
|---|---|
| Evidencia de extraccion | La adopcion F2 debe justificarse con criterios de readiness de ADR-0045. |
| Autonomia de modulo | Los modulos distribuidos deben tener ownership, contratos y limites de despliegue explicitos. |
| Integracion contract-first | La comunicacion entre modulos debe usar schemas, APIs o contratos de eventos explicitos. |
| Ownership de datos | El acoplamiento por datos compartidos debe reducirse o gobernarse antes de la extraccion. |
| Observabilidad | Los limites distribuidos requieren trazabilidad, senales de salud y visibilidad de fallos. |

## Autoridad Requerida

| Artefacto | Rol |
|---|---|
| [ADR-0045: Criterios de Readiness para Extraccion de Microservicios](../../../adrs/core/0045-microservice-extraction-readiness-criteria.es.md) | Define readiness cuantitativo para extraccion. |
| [ADR-0047: Framework de Evolucion Arquitectonica Progresiva](../../../adrs/core/0047-architectural-patterns-monolith-soa-microservices.es.md) | Gobierna la evolucion progresiva y la prevencion de sobre-diseno. |
| [ADR-0079: Corpus de Referencia Multi-Topologia](../../../adrs/core/0079-multi-topology-reference-corpus.es.md) | Gobierna manifiestos topologicos y composicion. |
| [Reglas de Arquitectura F2](./distributed-modules.rules.json) | Reglas ejecutables existentes de compatibilidad. |
| [Modelo de Dimensiones Topologicas](../../topology-dimensions.es.md) | Define reglas de composicion y compatibilidad. |

## Composicion

`distributed-modules` puede combinarse con:

| Topologia | Por que Puede Componerse |
|---|---|
| `event-driven` | Provee coordinacion resiliente entre modulos desplegables de forma independiente. |
| `data-mesh` | Alinea limites de modulo con ownership de productos de datos analiticos. |
| `serverless` | Permite que capacidades seleccionadas del modulo ejecuten como unidades administradas. |
| `edge-computing` | Permite mover workloads seleccionados mas cerca de usuarios o dispositivos. |
| `agentic-ai` | Agrega workflows de agentes IA gobernados a traves de limites de modulos distribuidos. |

## Frontera de Negocio

Este perfil es solo tecnico. Define restricciones de arquitectura y contexto de validacion. No define timing de entrega, ownership, staffing, ROI, costo, presupuesto ni priorizacion de Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
