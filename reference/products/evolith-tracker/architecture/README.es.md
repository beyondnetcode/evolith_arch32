# Evolith Tracker — Arquitectura

> **Navegación bilingüe:** [English version](./README.md)

**Clasificación:** Product-Specific Architecture  
**Producto:** Evolith Tracker  
**Core Gobernante:** [Evolith Core](../../../core/README.es.md)

Esta área contiene la arquitectura interna de Evolith Tracker.

## Alcance

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

- [Diseño de Interfaces Técnicas de Tracker](../../../governance/standards/vision/sdlc-tracker-technical-interfaces.es.md)
- Secciones específicas de Tracker del [Diseño Objetivo de Composición Gobernada](../../../governance/standards/vision/evolith-governed-composition-target-design.es.md)

## Límite

Esta área implementa, pero no redefine:

- principios arquitectónicos Core;
- fases SDLC y semántica de Phase Gates;
- requisitos canónicos de artefactos y evidencias;
- contratos universales de abstracción de proveedores.

[Volver a Evolith Tracker](../README.es.md)
