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

| Área | Propósito |
|---|---|
| [Evolith Core](./core/README.es.md) | Arquitectura, gobernanza SDLC, estándares, rulesets, schemas y ADRs Core autoritativos y neutrales respecto de proveedores |
| [Evolith Product Suite](./product-suite/README.es.md) | Visión del portafolio, estrategia, posicionamiento, arquitectura de suite, roadmap y comunicación |
| [Diseños Específicos de Productos](./products/README.es.md) | Diseño funcional y técnico de Tracker, Smart CLI, servicios MCP y productos futuros |
| [Guías de Plataformas y Proveedores](./platforms/README.es.md) | Herramientas y vendors nombrados, adapters, licencias, perfiles de despliegue y ADRs específicos |

## Áreas de Referencia de Soporte

| Área | Propósito |
|---|---|
| [getting-started/](./getting-started/README.es.md) | Rutas guiadas de lectura por rol y objetivo |
| [architecture/](./architecture/README.es.md) | Blueprints Core, ADRs, topología, contratos y patrones canónicos |
| [governance/](./governance/standards/README.es.md) | Estándares y gobernanza de ingeniería Core |
| [Gobernanza SDLC](./governance/sdlc/README.es.md) | Fases, gates, artefactos, evidencias, roles, trazabilidad y métricas |
| [operations/](./operations/README.es.md) | Observabilidad, soporte runtime y documentación operacional |
| [infrastructure/](./infrastructure/README.es.md) | Plataforma local, gateway, contenedores y activos de infraestructura |
| [knowledge/](./knowledge/demo/README.es.md) | Referencias aplicadas, evidencia UMS, investigación, ejemplos y lecciones |
| [quick-access/](./quick-access/README.es.md) | Camino más corto a los estándares autoritativos por stack |
| [navigation/](./navigation/README.es.md) | Índice maestro, índice bilingüe y registro de versiones documentales |

## Gobernanza Documental

- [Taxonomía de Documentación](./documentation-taxonomy.es.md)
- La arquitectura y gobernanza universales pertenecen a **Evolith Core**.
- La visión de productos, estrategia comercial y relaciones de suite pertenecen a **Product Suite**.
- Los detalles internos pertenecen al dominio del producto correspondiente.
- Las tecnologías y vendors nombrados pertenecen a Platform Guidance.
- Los productos consumen Core y pueden proponer mejoras respaldadas por evidencia; no pueden redefinir Core directamente.

La terminología se centraliza en el [Glosario Arquitectónico](./governance/glossary.es.md). El límite entre guía reutilizable y el producto ejecutable UMS se explica en [Referencia Canónica vs Modelo Aplicado UMS](./knowledge/demo/demo-vs-reference.es.md).

Para volver a la entrada pública, usa el [README principal](../README.es.md).
