# Hub de Producto

> **Navegación bilingüe:** [English version](./README.md)

Este directorio contiene el corpus de la **Product Suite** de Evolith: qué son los productos, cómo se diseñan y cómo se operan. La constitución neutral respecto de proveedores que heredan vive en [`reference/`](../reference/README.es.md).

## Meta y Objetivos

> **Meta:** mantener en un solo lugar toda preocupación de producto — visión, diseño, operación, infraestructura, investigación — claramente separada de la constitución Core que la gobierna.

**Objetivos:**

- Separar la dirección del portafolio (Suite) de los internos por producto (Productos).
- Mantener los aspectos de runtime (Operaciones, Infraestructura) navegables por sí mismos.
- Aislar el material exploratorio (Investigación) del diseño ya entregado.

## Áreas

| Área | Descripción | Tipo |
|---|---|---|
| [Suite](./suite/README.es.md) | Visión de portafolio, estrategia, posicionamiento, arquitectura de suite, roadmap y comunicación | Hub de dominio |
| [Productos](./products/README.es.md) | Diseño funcional y técnico por producto — Core API, Tracker, servicios MCP, Evolith CLI | Hub de área |
| [Operaciones](./operations/README.es.md) | Observabilidad, respuesta a incidentes, SLOs, experimentos de caos, soporte de runtime | Hub de área |
| [Infraestructura](./infra/README.es.md) | Stack local de Compose, Docker, Helm, Kubernetes, CI/CD, SCM, seguridad, despliegue en VPS | Hub de área |
| [Investigación](./research/README.es.md) | Casos de adopción, pruebas de concepto, inteligencia de arquitectura, demos de referencia | Hub de área |

## Regla de Dependencia

Los productos consumen Core; no lo redefinen. Las decisiones arquitectónicas van en [`reference/core/architecture/adrs/`](../reference/core/architecture/adrs/README.es.md), no aquí. Ver [Evolith Core](../reference/core/README.es.md) para el límite.

---

[Volver a la Raíz del Repositorio](../README.es.md) · [Hub de Referencia](../reference/README.es.md)
