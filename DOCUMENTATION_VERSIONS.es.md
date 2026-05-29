# Registro de Versiones de Documentación

> **Navegación Bilingüe:** [English Version](./DOCUMENTATION_VERSIONS.md)

Este registro rastrea todos los lanzamientos de documentación de producción con sus etiquetas de versión, fechas y cambios clave. Actualizado automáticamente vía CI en cada release a `main`.

---

## Lanzamientos de Producción

| Versión | Fecha | Rama | Cambios Clave | Hotfixes |
|---------|------|--------|-------------|----------|
| docs-v1.0.2 | 2026-05-29 | hotfix/docs-v1.0.2 | README highlights: punto de entrada Comunicacion de Arquitectura y Documentacion (con sub-enlaces a Hub de Arquitectura, backlog Visual, Indice Maestro, Rutas por Rol), punto de entrada Flujo SDLC y Gobernanza de Entrega (con sub-enlaces a SDLC de Construccion, Manifiesto de Ingenieria, Contract Testing, Registro ADR); paridad bilingüe mantenida EN/ES | 0 |
| docs-v1.0.1 | 2026-05-29 | hotfix/docs-v1.0.1 | BMAD Agents v1.0.1: Add Docs Agent and DevOps Agent with documentation pipeline awareness, update architect/qa/sm/pm/dev agents with bilingual documentation requirements | 0 |
| docs-v1.0.0 | 2026-05-29 | release/docs-v1.0.0 | Lanzamiento inicial de documentación de producción: herramientas bilingües (17 scripts), estrategia GitFlow (ADR-0068), pipeline de validación, dashboard de cobertura, ADR-0067 modular monolith | 0 |

## Próximos (desde `develop`)

| Versión Objetivo | Fecha Planeada | En Progreso |
|------------------|----------------|-------------|
| docs-v1.1.0 | 2026-06-15 | feature/docs-add-security-section |
| docs-v2.0.0 | 2026-09-01 | Reestructuración mayor planeada para documentación de modular monolith |

## Política de Versiones

| Incremento | Cuándo Usar | Ejemplo |
|-----------|-------------|---------|
| **Major** (`X.0.0`) | Cambios estructurales rompecompatibilidad, secciones renombradas que rompen links, renumeración ADR | `docs-v2.0.0` |
| **Minor** (`X.Y.0`) | Nuevas secciones de documentación, nuevos ADR, nuevas áreas de arquitectura | `docs-v1.3.0` |
| **Patch** (`X.Y.Z`) | Correcciones de bugs, corrección de links, corrección de diagramas, corrección de typos | `docs-v1.1.1` |

## Criterios de Release

Todos los lanzamientos de producción deben cumplir:

- [x] Todos los checks de CI pasan (validate-docs.mjs, check-bilingual-parity.mjs)
- [x] Paridad bilingüe verificada para todos los pares de archivos afectados
- [x] Log de versiones actualizado con entrada de release
- [x] Tag de Git creado en formato `docs-vX.Y.Z`
- [x] GitHub Release creado con changelog
- [x] Navegación de MASTER_INDEX.md verificada

## SLA de Hotfix

| Prioridad | Tiempo de Respuesta | Duración Máxima Abierta |
|-----------|---------------------|------------------------|
| Crítico (links rotos en producción) | 4 horas | 24 horas |
| Alto (info técnica incorrecta) | 8 horas | 48 horas |
| Medio (corrección de diagramas) | 24 horas | 72 horas |

---

Ver [ADR-0068](./reference/architecture/adrs/core/0068-documentation-release-gitflow.es.md) para la política completa de GitFlow de lanzamiento de documentación.

*Este archivo es auto-actualizado por `.github/workflows/docs-release.yml`.*
*No editar manualmente. Última actualización: 2026-05-29*