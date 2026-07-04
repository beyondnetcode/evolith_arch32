# Perfil Topologico Serverless

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Accepted  
**Dimension:** `execution`  
**ID de Topologia:** `serverless`  
**Alias de Compatibilidad:** `F1-compatible`  
**Manifiesto:** [topology.manifest.json](./topology.manifest.json)

Serverless es una topologia de ejecucion para workloads administrados y escalados por eventos donde la plataforma posee el aprovisionamiento runtime y Evolith Core gobierna contratos, observabilidad, seguridad, idempotencia y fronteras de integracion.

## Proposito

Usa esta topologia para capacidades aisladas que se benefician de escalamiento administrado, triggers de eventos, jobs programados, procesamiento asincrono o workloads con picos sin introducir una topologia de servicio separada.

Serverless no reemplaza la arquitectura de dominio. Se compone con `modular-monolith`, `distributed-modules` o `microservices` cuando el manifiesto y la revision arquitectonica permiten la frontera de ejecucion.

## Reglas de Gobernanza

| Regla | Requisito |
|---|---|
| Idempotencia | Los handlers disparados por eventos deben tolerar reintentos y entrega duplicada. |
| Contratos | Entradas, salidas, eventos y dependencias externas deben versionarse explicitamente. |
| Observabilidad | Cada funcion o workflow administrado debe emitir evidencia trazable y senales de fallo. |
| Control de frontera | Los handlers serverless no deben saltarse ownership de dominio ni fronteras de persistencia. |
| Neutralidad de proveedor | La guia Core permanece neutral respecto del proveedor; las selecciones de proveedor pertenecen a perfiles de producto o plataforma. |

## Autoridad Requerida

| Artefacto | Rol |
|---|---|
| [ADR-0079: Corpus de Referencia Multi-Topologia](../../../reference/architecture/adrs/core/0079-multi-topology-reference-corpus.md) | Gobierna los manifiestos de topologia y composicion. |
| [ADR-0095: Gobernanza de Arquitectura Serverless](../../../reference/architecture/adrs/core/0095-serverless-architecture-governance.md) | Gobierna las restricciones arquitectonicas especificas de serverless. |
| [Reglas de Arquitectura Serverless](./serverless.rules.json) | Reglas de compatibilidad ejecutables existentes. |
| [Modelo de Dimensiones de Topologia](../../../reference/architecture/topologies/topology-dimensions.md) | Define reglas de composicion y compatibilidad. |

## Contrato Ejecutable

Todo satelite que adopte este perfil proporciona `serverless.config.json`:

```json
{
  "stateless": true,
  "package": { "maxSizeMb": 25 },
  "coldStart": { "maxInitMilliseconds": 500, "lazyInitialization": true }
}
```

SV-R01 a SV-R04 exigen ese contrato, ejecucion sin estado, un paquete no mayor de 50 MB e inicializacion diferida acotada. El evaluador Native y la [politica OPA](./serverless.rego) evalúan los mismos campos.

## Composicion

`serverless` puede combinarse con:

| Topologia | Por Que Puede Componerse |
|---|---|
| `modular-monolith` | Agrega puntos de ejecucion administrados sin forzar extraccion completa de servicios. |
| `distributed-modules` | Permite handlers serverless dentro de fronteras de modulo controladas. |
| `microservices` | Soporta funciones de servicio individual con ejecucion escalada por eventos. |
| `event-driven` | Habilita handlers serverless disparados por eventos gobernados por contratos. |
| `data-mesh` | Proporciona ejecucion de productos de datos analiticos sin acoplamiento transaccional. |
| `agentic-ai` | Aloja workflows de agentes IA gobernados por contexto MCP y rulesets. |

## Frontera de Negocio

Este perfil es solo tecnico. No define ROI, modelo de costos, gasto cloud, staffing, timing de entrega, priorizacion ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

## Presupuestos Operativos

Esta topología declara envelopes arquitectónicos de latencia, cold-start y costo por ejecución en `spec.operationalBudgets` de [`topology.manifest.json`](./topology.manifest.json). Los operadores verifican los satélites contra estos envelopes siguiendo el [Runbook de Presupuestos Operativos](../../../reference/architecture/topologies/execution/operational-budgets-runbook.es.md) compartido.

---
[Volver al Hub de Topologias](../../README.es.md)
