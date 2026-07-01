# Hub de Arquitectura

> Navegación bilingüe: [English](./README.md)

Esta área contiene el modelo de arquitectura reutilizable. Léelo desde la política general hasta la evidencia concreta.

## Meta y Objetivos

> **Meta:** definir el modelo de arquitectura reutilizable y neutral respecto de proveedores que todo producto hereda — desde los principios base hasta los patrones por runtime.

**Objetivos:**

- Mantener la línea base agnóstica al runtime y los blueprints como única fuente de política arquitectónica.
- Registrar cada trade-off aceptado como ADR, descubrible a través de la matriz de decisiones.
- Proveer guía de implementación condicionada por runtime sin convertirla en política universal.

## Capas

Ordenadas de la [[política]] general a la evidencia concreta:

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Baseline Agnóstica](./agnostic-baseline.es.md) | Principios, patrones y restricciones no negociables agnósticos al runtime de máximo nivel | Anclar cada producto y runtime a una sola baseline | Política de baseline | Sí |
| [Arquitectura Maestra C4](./C4-MASTER-ARCHITECTURE.es.md) | Diseño de sistema end-to-end consolidado y verificado (core-api, servidor MCP y Agent Runtime desplegados) | Ver la arquitectura tal como está construida y desplegada | Diseño de sistema | No |
| [Visual Map](./visual-map/index.html) | Explorador interactivo de la arquitectura de Evolith | Navegar visualmente el modelo C4 y sus componentes | Mapa interactivo | No |
| [Flujos de Interfaces del Core](./views/view-by-interface-flow.es.md) | Contratos IN/OUT, rutas de procesamiento, resiliencia, auditoría y guía de clientes para interfaces Core | Entender cómo la comunicación cruza cada límite del Core | Vista de arquitectura | No |
| [Principios](./principles/README.es.md) | Principios arquitectónicos fundacionales | Fundamentar todas las decisiones en principios compartidos | Hub de área | Sí |
| [Hub de Blueprints](./blueprints/README.es.md) | Principios agnósticos al runtime, topología y criterios de selección | Definir la línea base arquitectónica | Hub de área | Sí |
| [Registro ADR](./adrs/README.es.md) | Registra los trade-offs aceptados y su alcance | Preservar el histórico de decisiones | Hub de área | Sí |
| [Matriz ADR](./adrs/adr-matrix.es.md) | Encuentra los ADRs controladores por preocupación arquitectónica | Acelerar el descubrimiento de decisiones | Índice de decisiones | Sí |
| [Hub de Topologias](./topologies/README.es.md) | Corpus de Referencia Multi-Topologia legible por humanos | Gobernar dimensiones topologicas y composicion | Hub de area | Si |
| [Patrones Canónicos](./canonical-patterns/README.es.md) | Patrones de código gobernados por ADRs específicos de runtime | Estandarizar implementaciones por runtime | Hub de área | No |
| [Evolith SDK](./evolith-sdk/README.es.md) | Modelo de dominio y diseño técnico del SDK de Evolith | Diseñar el SDK compartido | Referencia de diseño | No |
| [Catálogo de Herramientas MCP](../governance/standards/ai-augmented/03-tools-catalog/evolith-mcp-tools.es.md) | Catálogo de 11 herramientas MCP para automatización con agentes de IA | Habilitar automatización con agentes de IA | Referencia de herramientas | No |
| [Modelo de Referencia UMS](../knowledge/demo/ums-reference-model.es.md) | Muestra cómo un producto real adopta o especializa la referencia | Demostrar evidencia aplicada | Referencia aplicada | No |

## Regla de Lectura

La línea base y los ADRs aceptados definen la política. Los perfiles de runtime y los patrones canónicos definen guía de implementación condicionada. UMS es el modelo de referencia aplicado oficial: demuestra decisiones en un producto completo, pero sus elecciones específicas de producto no son automáticamente estándares universales.

---

[Volver al Hub de Referencia](../README.es.md)
