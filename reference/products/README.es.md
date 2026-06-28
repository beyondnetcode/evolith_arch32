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

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Hub del Tracker](./evolith-tracker/README.es.md) | Producto activo: arquitectura e interfaces técnicas de Evolith Tracker | Diseñar el producto de gobernanza | Hub de producto | No |
| [Hub del Smart CLI](./smart-cli/README.es.md) | Producto activo documentado en `smart-cli/` | Entender el producto de tooling | Hub de producto | No |
| [Hub del Core API](./core-api/README.es.md) | Producto activo: servicio central de validación y gobernanza | Motor de evaluación de reglas Core | Hub de producto | No |
| [Evolith MCP Services](./mcp-services/README.es.md) | Producto activo: servicios de interacción MCP gobernados (HTTP, fail-closed, API-key) | Exponer interacciones MCP gobernadas | Hub de producto | No |
| [Hub de Referencia UMS](./ums-reference/README.es.md) | Producto de referencia: el satélite open-source UMS es el modelo aplicado oficial del corpus | Anclar la referencia empresarial aplicada | Hub de producto (referencia) | No |
| Productos futuros | Se añaden solo tras aprobar su Product Vision | Crecer la suite bajo gobernanza | Hub de producto (planificado) | No |

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
