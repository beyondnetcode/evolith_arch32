# Evolith Tracker — Arquitectura

> **Navegación bilingüe:** [English version](./README.md)

**Clasificación:** Product-Specific Architecture  
**Producto:** Evolith Tracker  
**Core Gobernante:** [Evolith Core](../../../../reference/core/README.es.md)  
**Estado:** Conceptual / en fase de diseño — describe la arquitectura *objetivo*; aún no hay código de Tracker implementado.

Esta área define la arquitectura interna prevista de Evolith Tracker (diseño objetivo, no código entregado).

## Alcance (diseño objetivo)

- arquitectura de contenedores y componentes;
- bounded contexts y límites de agregados;
- Gate Decision Engine y Phase Orchestrator;
- implementación runtime del Evidence Graph;
- Provider Registry y runtime de plugins;
- Agent Execution Coordinator;
- integración de autorización con UMS;
- persistencia, eventos, despliegue y observabilidad del producto;
- decisiones arquitectónicas específicas de Tracker.

## Destinos Actuales de Migración

- [Diseño de Interfaces Técnicas de Tracker](../sdlc-tracker-technical-interfaces.es.md)
- Secciones específicas de Tracker del [Diseño Objetivo de Composición Gobernada](../../../suite/architecture/evolith-governed-composition-target-design.es.md)

> **Qué existe hoy.** No hay arquitectura de Tracker construida. Las únicas costuras entregadas que habilitan a Tracker viven en Core (`src/apps/core-api` solo REST bajo `/api/v1`, `src/packages/core-domain`); ver el delta [Qué Existe Hoy vs. el Objetivo](../README.es.md#31-qué-existe-hoy-vs-el-objetivo) en el README del producto para el inventario de costuras en vivo y sus referencias de gap-tracking.

## Límite

Por diseño, esta área implementa, pero no redefine:

- principios arquitectónicos Core;
- fases SDLC y semántica de Phase Gates;
- requisitos canónicos de artefactos y evidencias;
- contratos universales de abstracción de proveedores.

[Volver a Evolith Tracker](../README.es.md)
