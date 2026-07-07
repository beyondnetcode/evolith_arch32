# Hub de Referencia

> **Navegación bilingüe:** [English version](./README.md)

Este directorio contiene el corpus de referencia Evolith, separado explícitamente entre la **Constitución Evolith Core** y **Evolith Product Suite**.

## Meta y Objetivos

> **Meta:** organizar todo el corpus de referencia de modo que cada documento tenga exactamente un hogar, desde el dominio más genérico hasta el artefacto más específico.

**Objetivos:**

- Separar los cuatro dominios primarios (Core, Product Suite, Diseños de Producto, Guías de Plataforma) con fronteras explícitas y auditables.
- Dar a cada dominio un hub que declare su propia meta, objetivos y límites antes de listar su contenido.
- Encaminar las preocupaciones de soporte (onboarding, arquitectura, gobernanza, operaciones, conocimiento) a través de hubs de área dedicados.

## Fronteras Principales

Los cuatro dominios primarios, ordenados de lo más genérico (la constitución) a lo más específico (proveedores nombrados):

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Evolith Core](./core/README.es.md) | Arquitectura, gobernanza SDLC, estándares, rulesets, schemas y ADRs Core autoritativos y neutrales respecto de proveedores | Anclar la constitución que todo producto hereda | Hub de dominio | Sí |
| [Evolith Product Suite](../product/suite/README.es.md) | Visión del portafolio, estrategia, posicionamiento, arquitectura de suite, roadmap y comunicación | Dirigir el ecosistema | Hub de dominio | Sí |
| [Diseños Específicos de Productos](../product/products/README.es.md) | Diseño funcional y técnico de Tracker, Smart CLI, servicios MCP y productos futuros | Contener los internos de producto | Hub de área | Sí |
| Guías de Plataformas y Proveedores | Herramientas y vendors nombrados, adapters, licencias, perfiles de despliegue y ADRs específicos | Aislar decisiones de proveedores | Hub de área | Sí |

## Áreas de Referencia de Soporte

Áreas de soporte, ordenadas del onboarding a la meta-navegación:

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| Primeros Pasos | Rutas guiadas de lectura por rol y objetivo | Acelerar el onboarding | Guía de incorporación | No |
| [Arquitectura](./core/architecture/README.es.md) | Blueprints Core, ADRs, topología, contratos y patrones canónicos | Guiar el diseño corporativo | Hub de área | Sí |
| Gobernanza y Estándares | Estándares y gobernanza de ingeniería Core | Alinear equipos a políticas unificadas | Hub de área | Sí |
| [Gobernanza SDLC](./core/sdlc/README.es.md) | Fases, gates, artefactos, evidencias, roles, trazabilidad y métricas | Gobernar el ciclo de vida completo | Hub de dominio | Sí |
| [Operaciones](../product/operations/README.es.md) | Observabilidad, soporte runtime y documentación operacional | Estandarizar operaciones | Hub de área | No |
| [Infraestructura](../product/infra/README.es.md) | Plataforma local, gateway, contenedores y activos de infraestructura | Estandarizar el runtime local | Hub de área | No |
| [Conocimiento](./knowledge/README.md) | Referencias aplicadas, evidencia UMS, investigación, ejemplos y lecciones | Capturar evidencia y aprendizaje | Hub de área | No |
| Acceso Rápido | Camino más corto a los estándares autoritativos por stack | Reducir fricción de navegación | Índice de navegación | No |
| [Navegación](./core/control-center/taxonomy/MASTER_INDEX.es.md) | Índice maestro, índice bilingüe y registro de versiones documentales | Centralizar la navegación | Hub de navegación | Sí |

## Gobernanza Documental

- [Taxonomía de Documentación](./core/control-center/taxonomy/documentation-taxonomy.es.md)
- La arquitectura y gobernanza universales pertenecen a **Evolith Core**.
- La visión de productos, estrategia comercial y relaciones de suite pertenecen a **Product Suite**.
- Los detalles internos pertenecen al dominio del producto correspondiente.
- Las tecnologías y vendors nombrados pertenecen a Platform Guidance.
- Los productos consumen Core y pueden proponer mejoras respaldadas por evidencia; no pueden redefinir Core directamente.

La terminología se centraliza en el [Glosario Arquitectónico](./core/sdlc/glossary/glossary.es.md). El límite entre guía reutilizable y el producto ejecutable UMS se explica en [Referencia Canónica vs Modelo Aplicado UMS](../product/research/demo/demo-vs-reference.es.md).

Para volver a la entrada pública, usa el [README principal](../README.es.md).
