# Evolith Core API — Registro de Cambios

Todos los cambios notables en la API de Evolith Core se documentarán en este archivo. Este proyecto se adhiere a Semantic Versioning y cumple con los plazos de deprecación/sunset definidos en [ADR-0098](../../../reference/core/architecture/adrs/core/0098-rest-uri-versioning-deprecation-policy.es.md).

> **Navegación Bilingüe:** [English Version](./changelog.md)

---

## [1.1.0] - 2026-06-21

### Características
- **Conformidad de Envelope (GT-155):** Todos los controladores REST cumplen con el envelope unificado `{success, data, meta}` definido en [ADR-0073](../../../reference/core/architecture/adrs/core/0073-unified-cli-output-contract.md).
- **Versionado de URI (GT-159):** Configuración del versionado de URI de NestJS y decoración explícita de todos los controladores REST para operar bajo las rutas `/api/v1/`.
- **Ciclo de Deprecación (GT-159):** Se agregó un decorador de ruta `@Deprecated()` global e interceptor que inyecta dinámicamente cabeceras de `Deprecation` y `Sunset` según RFC 8594 y RFC 9745.

---

## [1.0.0] - 2026-06-15

### Características
- **Superficie REST Core Inicial:** Exposición de casos de uso de recuperación de rulesets, evaluación de gates y transiciones de fase como rutas de NestJS versionadas.
- **Pipes y Filtros Globales:** Integración de pipes de validación global y filtrado de errores según RFC 9457 Problem Details.
