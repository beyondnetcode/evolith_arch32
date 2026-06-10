# Evolith Core

> **Navegación bilingüe:** [English version](./README.md)

**Clasificación:** Corpus de Arquitectura y Gobernanza Core  
**Estado:** Autoritativo  
**Propietario:** Evolith Architecture Board

---

## 1. Qué Es Evolith Core

Evolith Core es la **Constitución de ingeniería neutral respecto de proveedores** compartida por todos los productos Evolith y las implementaciones satélite.

Define:

- principios y patrones arquitectónicos universales;
- ADRs Core y contratos canónicos;
- el SDLC de cinco fases y la gobernanza de Phase Gates;
- estándares de artefactos, evidencia, trazabilidad y responsabilidades;
- rulesets, schemas, taxonomías y requisitos de validación;
- reglas de seguridad, aislamiento por tenant y abstracción de proveedores;
- el proceso para promover upstream lecciones validadas.

Core debe seguir siendo válido aunque cambie un producto, framework, modelo, herramienta o proveedor.

---

## 2. Qué No Es Evolith Core

Evolith Core no es:

- Evolith Tracker;
- Smart CLI, un chatbox o un producto MCP;
- una plataforma de gestión de tareas;
- un LLM o agente autónomo;
- una implementación de dashboards o BI;
- una integración con un proveedor nombrado;
- un despliegue SaaS o edición comercial;
- el diseño interno de un producto de la Suite Evolith.

Los productos consumen Core. No lo redefinen.

---

## 3. Dominios Core

| Dominio Core | Ubicación Canónica | Responsabilidad |
|---|---|---|
| **Arquitectura** | [`reference/architecture/`](../architecture/README.es.md) | Principios, patrones, modelos de referencia, contratos y ADRs Core |
| **Gobernanza SDLC** | [`reference/governance/sdlc/`](../governance/sdlc/README.es.md) | Fases, gates, artefactos, evidencias, roles, excepciones, trazabilidad y métricas |
| **Estándares de Ingeniería** | [`reference/governance/standards/`](../governance/standards/README.es.md) | Estándares reutilizables y reglas de gobernanza |
| **Rulesets y Schemas** | [`rulesets/`](../../rulesets/) | Políticas y contratos de validación consumibles por máquinas |
| **Taxonomía Core** | [`reference/governance/`](../governance/) | Terminología, clasificaciones y límites canónicos |
| **Evidencia Aplicada** | [`reference/knowledge/`](../knowledge/) | Lecciones de satélites pendientes de revisión upstream |

---

## 4. Regla de Dependencia

```text
Evolith Core
    ↓ gobierna
Evolith Product Suite
    ↓ contiene
Tracker · Smart CLI · Servicios MCP · Plugins · Productos Futuros
    ↓ integra mediante abstracciones
Herramientas y Proveedores Nombrados
```

La dependencia es unidireccional:

1. Core define restricciones universales.
2. Los productos de la Suite cumplen Core.
3. Las implementaciones de proveedores cumplen contratos de producto y Core.
4. Las lecciones validadas pueden proponerse upstream.
5. Solo el Architecture Board aprueba cambios Core.

---

## 5. Límites de ADRs

### ADR Core

Un ADR Core:

- aplica entre productos;
- permanece neutral respecto de proveedores;
- define decisiones, patrones, contratos o restricciones universales;
- no puede seleccionar Langfuse, Jira, Claude, Superset, GitHub, Azure DevOps u otro vendor como requisito universal.

### ADR de Producto

Pertenece a un producto de la Suite y puede definir su arquitectura interna, persistencia, APIs, UX o despliegue.

### ADR Específico de Plataforma

Puede seleccionar o evaluar una tecnología, proveedor, perfil de despliegue, licencia o implementación de adapter.

---

## 6. Invariantes Core

1. Core es neutral respecto de proveedores.
2. Las reglas Core están versionadas y son revisables.
3. Los schemas específicos de productos no se filtran a contratos canónicos.
4. Las herramientas nombradas son ejemplos o perfiles de proveedor, no dependencias universales.
5. La responsabilidad humana permanece explícita.
6. Los productos runtime preservan linaje de evidencias y decisiones.
7. Las lecciones satélite requieren evidencia y aprobación del Architecture Board.
8. La documentación Core es bilingüe según la política del repositorio.

---

## 7. Relación con Product Suite

La Product Suite usa Core para entregar capacidades operativas:

- Tracker ejecuta estado de gobernanza y auditoría.
- Smart CLI y MCP exponen interacciones y evaluaciones gobernadas.
- Plugins y adapters conectan capacidades externas.
- Productos futuros pueden consumir la misma Constitución.

La visión de la Suite, posicionamiento comercial, roadmaps, UX, APIs de productos y modelos comerciales pertenecen a [Evolith Product Suite](../product-suite/README.es.md), no a Core.

---

## 8. Navegación

- [Taxonomía de Documentación](../documentation-taxonomy.es.md)
- [Arquitectura](../architecture/README.es.md)
- [Gobernanza SDLC](../governance/sdlc/README.es.md)
- [Estándares de Ingeniería](../governance/standards/README.es.md)
- [Evolith Product Suite](../product-suite/README.es.md)
- [Diseños Específicos de Productos](../products/README.es.md)
- [Guías de Plataformas y Proveedores](../platforms/README.es.md)

---

[Volver al Hub de Referencia](../README.es.md)
