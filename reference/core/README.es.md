# Evolith Core

> **Navegación bilingüe:** [English version](./README.md)

**Clasificación:** Corpus de Arquitectura y Gobernanza Core  
**Estado:** Autoritativo  
**Propietario:** Evolith Architecture Board

---

## Meta y Objetivos

> **Meta:** mantener una única Constitución de ingeniería, neutral respecto de proveedores, que todo producto Evolith y repositorio satélite pueda heredar sin modificarla.

**Objetivos:**

- Centralizar en un único lugar autoritativo los principios universales de arquitectura, los ADRs Core y los contratos canónicos.
- Garantizar que la gobernanza (SDLC, estándares, rulesets) sobreviva a cambios de producto, framework, herramienta o proveedor.
- Establecer una dirección de dependencia clara: Core gobierna la Suite; los productos consumen Core y proponen mejoras upstream con evidencia.

---

## 1. Qué Es Evolith Core

Evolith Core es la **Constitución de ingeniería neutral respecto de proveedores** compartida por todos los productos Evolith y las implementaciones satélite.

Define:

- principios y patrones arquitectónicos universales;
- ADRs Core y contratos canónicos;
- el SDLC de cinco fases y la gobernanza de Phase Gates;
- estándares de artefactos, evidencia, trazabilidad y responsabilidades;
- rulesets, schemas, taxonomías y requisitos de validación;
- reglas de seguridad y abstracción de proveedores;
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

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Hub de Arquitectura](./architecture/README.es.md) | Principios, patrones, modelos de referencia, contratos y ADRs Core | Guiar el diseño corporativo | Hub de área | Sí |
| [Centro de Gobernanza SDLC](./sdlc/README.es.md) | Fases, gates, artefactos, evidencias, roles, excepciones, trazabilidad y métricas | Gobernar el ciclo de vida completo | Hub de dominio | Sí |
| Centro de Estándares y Gobernanza | Estándares reutilizables y reglas de gobernanza | Alinear equipos a políticas unificadas | Hub de área | Sí |
| [Guías de Interfaces](./interfaces/README.md) | Guías legibles para operar el Core por CLI, MCP y REST — cada comando/tool/endpoint con sus opciones y ejemplos | Aprender y consultar las interfaces | Hub de área | Sí |
| [Rulesets Hub](../../src/rulesets/README.es.md) | Políticas y contratos de validación consumibles por máquinas | Validar cumplimiento automáticamente | Hub de reglas | Sí |
| [Hub de Gobernanza](./sdlc/governance/README.es.md) | Terminología, clasificaciones y límites canónicos | Mantener consistentes el lenguaje y los límites | Hub de área | Sí |
| [Hub de Conocimiento](../knowledge/README.md) | Lecciones de satélites pendientes de revisión upstream | Capturar evidencia y aprendizaje | Hub de área | No |

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
- no puede imponer ningún proveedor, herramienta o plataforma como dependencia universal — la selección de vendors corresponde a ADRs Específicos de Plataforma.

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

La visión de la Suite, posicionamiento comercial, roadmaps, UX, APIs de productos y modelos comerciales pertenecen a [Evolith Product Suite](../../product/suite/README.es.md), no a Core.

---

## 8. Navegación Relacionada

Documentos fuera de Core que completan el panorama (los dominios propios de Core están listados en la sección 3):

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Taxonomía de Documentación](./control-center/taxonomy/documentation-taxonomy.es.md) | Define qué tipo de documento pertenece a cada lugar | Mantener el corpus organizado | Estándar de gobernanza | Sí |
| [Evolith Product Suite](../../product/suite/README.es.md) | Visión del portafolio, estrategia, posicionamiento y comunicación | Dirigir el ecosistema | Hub de dominio | Sí |
| [Diseños Específicos de Productos](../../product/products/README.es.md) | Diseño funcional y técnico por producto | Contener los internos de producto | Hub de área | Sí |
| Guías de Plataformas y Proveedores | Herramientas nombradas, vendors, adapters y perfiles de despliegue | Aislar decisiones de proveedores | Hub de área | Sí |

---

[Volver al Hub de Referencia](../README.es.md)
