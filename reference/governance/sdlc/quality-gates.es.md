# Gates de Calidad SDLC

> **Navegación bilingüe:** [English version](./quality-gates.md)
> **Owner:** Evolith Architecture Board
> **Estado:** Referencia activa
> **Padre:** [Centro de Gobernanza SDLC Corporativa](./README.es.md)

---

## Propósito

Este documento define los gates objetivos de calidad usados por Evolith para evitar progresión insegura dentro del ciclo de vida.

Un gate de calidad no es una recomendación. Es un punto de control basado en evidencia que puede bloquear el avance a la siguiente fase cuando los criterios obligatorios faltan o fallan.

---

## Principio de Gate

Una fase solo puede avanzar cuando su evidencia requerida existe y sus criterios bloqueantes pasan.

La confianza manual, la aprobación verbal o el acuerdo informal no pueden reemplazar un gate obligatorio fallido. Las excepciones requieren un waiver explícito de gobernanza con owner responsable, fecha de expiración y plan de mitigación.

---

## Baseline Canónica de Umbrales

| Métrica | Umbral canónico | Aplica a | Impacto en gate |
|---|---:|---|---|
| Cobertura de código sobre lógica de negocio | >= 80% | Construcción, Validación | Bloquea Build Exitoso o RC Sellado si está por debajo del umbral |
| Complejidad ciclomática | <= 15 por método/función | Construcción, Validación | Bloquea merge o RC si se excede sin refactorización o waiver |
| CVEs High/Critical | 0 tolerados | Construcción, Validación, Entrega | Bloquea merge, RC y release productivo |
| Ratio de deuda técnica | < 5% | Validación | Bloquea RC Sellado si se excede sin plan de remediación aprobado |
| Distribución de pirámide de testing | Objetivo 70% unitarias / 20% integración / 10% E2E | Diseño, Validación | Requiere explicación cuando la distribución del release se desvía materialmente |
| Delta documental | Requerido cuando cambia comportamiento, arquitectura, API u operación | Construcción, Entrega | Bloquea merge o Producción Activa cuando falta |
| Evidencia de observabilidad | Requerida para rutas productivas | Entrega | Bloquea Producción Activa cuando telemetría o logs no son verificables |

---

## Regla de Cobertura

Evolith usa un único estándar de cobertura bloqueante para release:

- El gate mínimo de release para cobertura de lógica de negocio es **>= 80%**.
- La distribución de pirámide de testing de ADR-0018 sigue siendo la forma objetivo de composición de pruebas: **70% unitarias / 20% integración / 10% E2E**.
- La distribución de pirámide no reemplaza la cobertura. Un release puede tener la distribución correcta y aun así fallar cobertura.

---

## Resumen de Gates por Fase

| Fase | Gate | Evidencia obligatoria | Criterios bloqueantes |
|---|---|---|---|
| Fase 1 — Concepción y Descubrimiento | Aprobación de Negocio | PRD, alcance, personas, objetivos, restricciones | Alcance ambiguo, resultado de inversión poco claro, restricciones arquitectónicas ignoradas |
| Fase 2 — Diseño y Arquitectura | Baseline de Diseño Aprobado | ADRs, Historias Funcionales, alineamiento con blueprint, estándares aplicables | Decisiones arquitectónicas significativas no documentadas o contradictorias |
| Fase 3 — Construcción | Build Exitoso | Historias Técnicas, ejecución CI, Definición de Terminado, delta documental | CI falla, cobertura bajo umbral, CVEs high/critical, revisión faltante |
| Fase 4 — Validación y QA | RC Sellado | Test Summary Report, validación de aceptación, métricas de calidad | Cualquier métrica obligatoria falla o quedan criterios de aceptación sin verificar |
| Fase 5 — Entrega y Operaciones | Producción Activa | Release Notes, plan de rollback, checklist de observabilidad, evidencia de despliegue | Monitoreo no nominal, rollback indefinido, release no trazable al RC |

---

## Política de Waiver

Un waiver solo puede usarse cuando la organización acepta deliberadamente una desviación temporal.

Todo waiver debe incluir:

- El criterio de gate faltante o fallido.
- Justificación de negocio.
- Declaración de riesgo.
- Owner responsable.
- Fecha de expiración.
- Plan de mitigación.
- Autoridad aprobadora.

Los waivers no deben usarse para omitir vulnerabilidades high/critical sin resolver en releases productivos, salvo que exista una aceptación explícita de riesgo ejecutivo.

---

## Expectativas de Evidencia

| Tipo de evidencia | Expectativa mínima |
|---|---|
| PRD | Aprobado y versionado antes de iniciar arquitectura |
| ADR | Una decisión por ADR con contexto, opciones, decisión, trade-offs y consecuencias |
| Historia Funcional | Legible para negocio y conforme al Estándar de Escritura de Historias Funcionales |
| Historia Técnica | Trazable a una Historia Funcional y verificable en CI |
| Test Summary Report | Incluye métricas de umbral, resumen de pirámide, escaneo de seguridad y validación de historias |
| Release Notes | Incluye alcance de release, pasos de despliegue, rollback, checklist de observabilidad y enlaces a evidencia RC |

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Framework SDLC Orientado a Construcción](./02-engineering/construction-focused-sdlc-framework.es.md) | Define bucle de construcción, DoD y métricas centrales de umbral. |
| [Plantilla de Test Summary Report](./04-artifact-templates/test-summary-report-template.es.md) | Captura evidencia de calidad del RC. |
| [Plantilla de Release Notes](./04-artifact-templates/release-notes-template.es.md) | Captura evidencia de despliegue productivo. |
| [Mapeo SDLC–Artefactos Evolith](./sdlc-evolith-artifact-mapping.es.md) | Muestra qué artefactos son requeridos por fase. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Gates de Calidad SDLC</sub>
</div>
