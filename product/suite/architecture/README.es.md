# Evolith Product Suite — Arquitectura

> **Navegación bilingüe:** [English version](./README.md)

**Clasificación:** Product Suite Architecture

Esta área describe cómo colaboran los productos Evolith como suite. Puede definir responsabilidades transversales, diagramas de contexto, capacidades compartidas y la dirección de dependencia desde Core hacia los productos.

No debe contener principios universales que pertenecen a Evolith Core ni detalles internos que pertenecen a un producto específico.

> **Meta:** describir cómo los productos se refuerzan entre sí como una suite coherente.
>
> **Objetivos:** definir responsabilidades transversales y capacidades compartidas, y mantener explícita la dirección de dependencia: Core gobierna a los productos, nunca al revés.

## Documentos Actuales

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Diseño Objetivo de Composición Gobernada](./evolith-governed-composition-target-design.es.md) | Diseño objetivo de la composición gobernada de productos | Diseñar el estado objetivo compuesto | Referencia de diseño | Sí |
| [Modelo de Abstracción de Proveedores y Plugins](../../../reference/core/foundations/principles/evolith-provider-abstraction-plugin-model.es.md) | Modelo de abstracción de proveedores y plugins (destino de migración: Core Architecture Principle) | Mantener los proveedores reemplazables | Referencia de diseño | Sí |
| [Interfaces Técnicas de Tracker](../../products/evolith-tracker/sdlc-tracker-technical-interfaces.es.md) | Interfaces técnicas del Tracker (destino de migración: Tracker Product Design) | Especificar las superficies de integración del Tracker | Referencia de diseño | No |

Durante la migración, este índice separa arquitectura de Suite, principios Core e implementación de productos.

[Volver a Product Suite](../README.es.md)
