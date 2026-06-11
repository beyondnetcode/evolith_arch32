# Diseños Específicos de Productos Evolith

> **Navegación bilingüe:** [English version](./README.md)

Este dominio contiene el diseño funcional y técnico de cada producto de Evolith Product Suite.

Los documentos de producto implementan Evolith Core y SDLC Governance. No pueden redefinir reglas universales del Core.

## Meta y Objetivos

> **Meta:** mantener el diseño funcional y técnico de cada producto autocontenido, trazable y conforme a la Constitución Core.

**Objetivos:**

- Dar a cada producto de la Suite un único hub para su visión, modelo de dominio, interfaces y ADRs de producto.
- Separar los internos de producto de la estrategia de suite (Product Suite) y de las reglas universales (Core).
- Hacer auditable la dirección de dependencia: los productos consumen Core; nunca lo redefinen.

## Productos

| Producto | Hub | Estado |
|---|---|---|
| Evolith Tracker | [Hub del Tracker](./evolith-tracker/README.es.md) | Activo |
| Evolith Smart CLI | [Hub del Smart CLI](../../sdk/cli/README.es.md) | Documentado en `sdk/cli/` — migración a este dominio pendiente |
| Evolith MCP Services | — | Migración pendiente |
| Productos futuros | — | Solo después de aprobar su Product Vision |

## Contenido Permitido

- visión y alcance del producto;
- bounded contexts y modelo de dominio;
- interfaces y APIs;
- persistencia y despliegue;
- UX del producto;
- seguridad y autorización específicas;
- ADRs del producto;
- uso de integraciones y adapters.

## Contenido Excluido

- principios arquitectónicos universales;
- ADRs Core;
- gates y reglas genéricas del SDLC;
- selección de proveedores sin alcance explícito del producto;
- posicionamiento y estrategia comercial de la Suite.

[Volver al Hub de Referencia](../README.es.md)
