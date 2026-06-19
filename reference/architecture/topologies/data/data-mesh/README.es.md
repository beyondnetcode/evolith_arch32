# Perfil Topologico Data Mesh

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Draft  
**Dimension:** `data`  
**ID de Topologia:** `data-mesh`  
**Manifiesto:** [topology.manifest.json](./topology.manifest.json)

Data mesh es una topologia de datos para ownership analitico distribuido, productos de datos gobernados, contratos descubribles e interoperabilidad soportada por plataforma entre dominios.

## Proposito

Usa esta topologia cuando el ownership de datos analiticos debe acercarse a los equipos de dominio sin perder gobernanza, calidad, interoperabilidad ni cumplimiento.

Data mesh no debilita el ownership transaccional. Las fronteras de datos de dominio permanecen gobernadas por el bounded context o servicio propietario.

## Reglas de Gobernanza

| Regla | Requisito |
|---|---|
| Ownership de dominio | Los productos de datos deben alinearse a dominios delimitados u ownership de servicio. |
| Productos contratados | Los productos de datos deben publicar schemas, expectativas de calidad y metadata de ciclo de vida. |
| Interoperabilidad | Los datos compartidos deben usar contratos gobernados y semantica descubrible. |
| Evidencia de calidad | Los productos de datos deben exponer validacion, lineage, frescura y senales de confiabilidad. |
| Frontera transaccional | La distribucion analitica no debe saltarse ownership transaccional ni invariantes de dominio. |

## Composicion

`data-mesh` puede combinarse con `distributed-modules`, `microservices`, `event-driven`, `serverless` y `agentic-ai` cuando ownership y contratos son explicitos.

## Frontera de Negocio

Este perfil draft es solo tecnico. No define monetizacion de datos, ROI, asignacion de costos, staffing, priorizacion, timing de entrega ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
