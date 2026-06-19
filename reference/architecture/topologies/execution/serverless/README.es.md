# Perfil Topologico Serverless

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Draft  
**Dimension:** `execution`  
**ID de Topologia:** `serverless`  
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

## Composicion

`serverless` puede combinarse con `modular-monolith`, `distributed-modules`, `microservices`, `event-driven`, `data-mesh` y `agentic-ai` cuando la unidad de ejecucion esta gobernada por contratos y telemetria explicitos.

## Frontera de Negocio

Este perfil draft es solo tecnico. No define ROI, modelo de costos, gasto cloud, staffing, timing de entrega, priorizacion ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
