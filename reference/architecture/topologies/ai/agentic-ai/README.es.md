# Perfil Topologico Agentic AI

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Draft  
**Dimension:** `ai`  
**ID de Topologia:** `agentic-ai`  
**Manifiesto:** [topology.manifest.json](./topology.manifest.json)

Agentic AI es una topologia de arquitectura para sistemas AI-first, agentes autonomos o semi-autonomos, workflows habilitados por MCP y asistencia de implementacion orientada por contexto de modelo gobernada por Evolith Core.

## Proposito

Usa esta topologia cuando agentes IA participan en diseno, codigo, validacion, orquestacion, soporte de decisiones o ejecucion de workflows y deben operar con contexto arquitectonico explicito antes de actuar.

Agentic AI no salta la gobernanza arquitectonica. Los agentes deben recibir contexto gobernado, respetar bounded contexts, seguir rulesets, preservar auditabilidad y enrutar acciones mutativas mediante interfaces controladas.

## Reglas de Gobernanza

| Regla | Requisito |
|---|---|
| Inyeccion de contexto | Los agentes deben recibir contexto arquitectonico mediante recursos, prompts y herramientas MCP antes de generar o cambiar codigo. |
| Fronteras de tools | Las herramientas mutativas deben preservar human-in-the-loop o aprobacion gobernada por politica cuando aplique. |
| Auditabilidad | Las acciones de agentes deben producir evidencia trazable, entradas, salidas y referencias de reglas. |
| Aislamiento de dominio | Los agentes deben respetar bounded contexts, contratos y taxonomia del repositorio. |
| Seguridad | Los workflows IA no deben codificar decisiones de presupuesto, ROI, staffing, timing u ownership de negocio en artefactos Core. |

## Composicion

`agentic-ai` puede combinarse con cada perfil progressive-axis y con `serverless`, `event-driven`, `data-mesh` y `edge-computing` cuando el contexto del agente y las fronteras de tools son explicitos.

## Frontera de Negocio

Este perfil draft es solo tecnico. Define gobernanza de arquitectura IA y contexto operativo. No define ownership de negocio, priorizacion, ROI, costo, presupuesto, staffing, timing de entrega ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
