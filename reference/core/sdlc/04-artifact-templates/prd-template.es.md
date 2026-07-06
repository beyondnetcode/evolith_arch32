# Plantilla: Documento de Requisitos de Producto (PRD)

> **Navegación bilingüe:** [English](./prd-template.md)
> **Fase:** 1 — Concepción y Descubrimiento
> **Puerta de salida:** Aprobación de Negocio (Alcance Congelado)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

Un PRD define qué debe lograr el producto y para quién antes de iniciar diseño o arquitectura. Es el contrato de negocio que ancla Historias Funcionales, ADRs, Historias Técnicas, validación y evidencia de release.

**Formato estándar:** 13 secciones con enfoque exclusivamente funcional y de negocio. Las decisiones técnicas viven en ADRs y artefactos de arquitectura.

---

## Elige tu Vista

| Vista | Link | Úsalo cuando |
|---|---|---|
| **Fuente Markdown** | [Abrir fuente Markdown reutilizable](./source/prd-template-source.es.md) | Necesites copiar la estructura canónica del PRD en un repositorio de producto o delivery. |
| **Ejemplo Renderizado** | [Abrir ejemplo renderizado UMS](./examples/prd-example-ums.es.md) | Quieras entender el formato completado esperado y el nivel de detalle. |

---

## Estructura del PRD (13 Secciones)

| # | Sección | Propósito |
|---|---------|-----------|
| 1 | **Metadatos** | ID, producto, versión, estado, autor, aprobador |
| 2 | **Resumen Ejecutivo** | Problema, solución, alcance MVP, beneficios, fases |
| 3 | **Contexto y Problema** | Contexto actual, problema identificado, impacto estimado, visión estratégica |
| 4 | **Objetivos y Métricas** | Tabla de objetivos con valor inicial, meta y horizonte |
| 5 | **Alcance** | Dentro del alcance, fuera del alcance, alcance funcional |
| 6 | **Actores y Casos de Uso** | Descripción de actores, casos de uso por actor, matriz de interacción |
| 7 | **Funcionalidades Detalladas** | Tabla F-01..F-XX con descripción |
| 8 | **Reglas de Negocio** | RN-01..RN-XX con priorización MoSCoW (M/S/C) |
| 9 | **Restricciones y Supuestos** | Restricciones y supuestos con riesgos |
| 10 | **Riesgos de Negocio** | Probabilidad, impacto, mitigación |
| 11 | **Criterios de Aceptación del PRD** | Checklist de aprobación (Contenido/Producto/Proyecto) |
| 12 | **Glosario** | Términos del dominio |
| 13 | **Historial de Cambios** | Versiones con fecha, autor y cambios |

---

## Reglas de Autoría

- Usa el archivo fuente como punto de partida para cada nuevo PRD.
- Mantén el PRD legible para negocio; no diseñes arquitectura dentro de él.
- El PRD es **solo funcional** — las decisiones técnicas viven en ADRs y artefactos de arquitectura.
- Usa priorización MoSCoW (Must/Should/Could) en todas las reglas de negocio.
- Incluye placeholders `{X}` para valores de negocio aún no cuantificados.
- Incluye criterios de aceptación del PRD (sección 11) con checklist de aprobación.
- Incluye glosario del dominio (sección 12) para consistencia semántica.
- Enlaza toda Historia Funcional posterior al PRD.
- La Aprobación de Negocio no puede pasar sin un PRD aprobado.

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Mapeo SDLC–Artefactos](../sdlc-evolith-artifact-mapping.es.md) | Define cuándo el PRD es requerido. |
| [Modelo de Trazabilidad](../traceability-model.es.md) | Explica cómo el PRD enlaza con evidencia posterior. |
| [Plantilla de Historia Funcional](./functional-story-template.es.md) | Siguiente artefacto creado desde el alcance del PRD. |
