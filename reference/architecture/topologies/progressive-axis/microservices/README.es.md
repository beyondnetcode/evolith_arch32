# Perfil Topologico de Microservicios

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Aceptado  
**Dimension:** `progressive-axis`  
**ID de Topologia:** `microservices`  
**Alias de Compatibilidad:** `F3`  
**Manifiesto:** [topology.manifest.json](./topology.manifest.json)

Los microservicios son la topologia de Evolith para servicios desplegables de forma independiente con contratos explicitos, ownership orientado a dominio, operaciones maduras y observabilidad fuerte. Esta topologia se adopta solo cuando la evidencia de producto y operacion justifica el costo de distribucion.

## Proposito

Usa esta topologia cuando los bounded contexts requieren despliegue independiente, escalamiento, aislamiento de confiabilidad o autonomia de equipos que no puede satisfacerse con monolito modular o modulos distribuidos.

Esta topologia no es una recompensa por crecimiento del codigo. Es un modelo operativo de alta gobernanza que requiere disciplina de contratos, automatizacion de despliegue, aislamiento de fallos, ownership de servicios y readiness medible.

## Reglas de Gobernanza

| Regla | Requisito |
|---|---|
| Evidencia de readiness | La adopcion F3 debe satisfacer umbrales de readiness de extraccion de ADR-0045. |
| Orientacion a dominio | Los servicios deben alinearse a dominios delimitados, no a capas tecnicas ni entidades individuales. |
| Ownership de contratos | APIs, eventos y contratos de datos de servicios deben ser explicitos, versionados y backward-compatible. |
| Madurez operativa | Los servicios requieren observabilidad, automatizacion de despliegue, estrategia de rollback y contencion de fallos. |
| Aislamiento de datos | Cada servicio debe poseer su frontera de datos; el acoplamiento por base de datos compartida esta prohibido salvo waiver explicito. |

## Autoridad Requerida

| Artefacto | Rol |
|---|---|
| [ADR-0045: Criterios de Readiness para Extraccion de Microservicios](../../../adrs/core/0045-microservice-extraction-readiness-criteria.es.md) | Define readiness cuantitativo para extraccion de servicios. |
| [ADR-0047: Framework de Evolucion Arquitectonica Progresiva](../../../adrs/core/0047-architectural-patterns-monolith-soa-microservices.es.md) | Gobierna la evolucion progresiva y la prevencion de sobre-diseno. |
| [ADR-0076: Arquitectura de Microservicios Orientada a Dominio](../../../adrs/core/0076-domain-oriented-microservice-architecture.es.md) | Gobierna agrupacion de servicios F3 por dominios delimitados. |
| [ADR-0079: Corpus de Referencia Multi-Topologia](../../../adrs/core/0079-multi-topology-reference-corpus.es.md) | Gobierna manifiestos topologicos y composicion. |
| [Reglas de Arquitectura F3](../../../../../rulesets/architecture/f3-microservices.rules.json) | Reglas ejecutables existentes de compatibilidad. |
| [Modelo de Dimensiones Topologicas](../../topology-dimensions.es.md) | Define reglas de composicion y compatibilidad. |

## Composicion

`microservices` puede combinarse con:

| Topologia | Por que Puede Componerse |
|---|---|
| `event-driven` | Reduce acoplamiento sincrono y soporta coordinacion resiliente entre servicios. |
| `data-mesh` | Alinea productos de datos analiticos con ownership de servicios orientado a dominio. |
| `edge-computing` | Permite que capacidades seleccionadas de servicio ejecuten cerca de usuarios, dispositivos o regiones. |
| `serverless` | Soporta ejecucion administrada para workflows seleccionados adyacentes a servicios. |
| `agentic-ai` | Habilita workflows de agentes IA gobernados a traves de limites de servicios. |

## Frontera de Negocio

Este perfil es solo tecnico. Define restricciones de arquitectura y contexto de validacion. No define timing de entrega, ownership, staffing, ROI, costo, presupuesto ni priorizacion de Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
