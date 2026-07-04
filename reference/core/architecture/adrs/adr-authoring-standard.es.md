# Estándar de Autoría de ADRs

> **Navegación Bilingüe:** [English Version](./adr-authoring-standard.md)

**Estado:** Aprobado
**Responsable:** Evolith Architecture Board
**Creado:** 2026-06-10
**Aplica a:** todo ADR bajo `reference/architecture/adrs/` (categorías core y de plataforma)

---

## 1. Clasificación — Core vs Específico de Plataforma

Todo ADR pertenece exactamente a una categoría, y la categoría determina su ubicación y su profundidad requerida:

| | **ADR Core** (`adrs/core/`) | **ADR de Plataforma** (`adrs/nodejs/`, `adrs/dotnet/`, `adrs/android/`, …) |
|---|---|---|
| **Decide** | Decisiones transversales de diseño: patrones, artefactos, principios, reglas y prácticas que todo satélite hereda sin importar el stack | Decisiones técnicas ligadas a una tecnología, producto o proveedor específico |
| **Puede referenciar herramientas** | Solo como *ejemplos ilustrativos* del principio | Como *sujeto* de la decisión, con comparación explícita |
| **NO debe** | Centrar la decisión en comparar herramientas o proveedores específicos | Repetir principios transversales (enlazar el ADR Core en su lugar) |
| **Prueba de fuego** | Si la herramienta elegida desapareciera mañana, ¿la decisión seguiría en pie? Si sí → Core | Si la decisión *es* la elección de herramienta/proveedor → Plataforma |

Un ADR Core que necesite una elección tecnológica concreta la delega: el ADR Core enuncia la regla agnóstica, y un ADR de Plataforma compañero registra la selección de herramienta (p. ej., Core "estrategia de caching distribuido" → Plataforma "Redis como motor de caché para runtime Node.js").

## 2. Secciones Requeridas — Todos los ADRs

Todo ADR debe contener estas secciones. Los alias legados (de plantillas anteriores) siguen siendo válidos; los ADRs nuevos deben usar los nombres canónicos.

| # | Sección canónica | Contenido | Alias legados aceptados |
|---|---|---|---|
| 1 | **Contexto y Problema** | Las fuerzas, restricciones y el problema que exige una decisión | `Context`, `Problem Context`, `Problem Statement`, `Context and Problem Statement` |
| 2 | **Objetivo y Alcance** | Qué debe lograr la decisión y los límites explícitos de su aplicabilidad | `Scope`, `Objective` |
| 3 | **Opciones Consideradas** | Cada opción viable, incluidas las rechazadas, con resumen honesto | `Alternatives Considered`, `Alternatives`, `Considered Options` |
| 4 | **Decisión y Justificación** | La opción adoptada y por qué ganó | `Decision`, `Rationale` (como acompañante) |
| 5 | **Evidencias y Criterios de Evaluación** | Los criterios usados para comparar opciones y la evidencia que respalda la elección (benchmarks, spikes, referencias, arte previo) | `Evaluation Criteria`, `Architectural Drivers` |
| 6 | **Consecuencias, Riesgos y Trade-offs** | Consecuencias positivas y negativas, riesgos aceptados, trade-offs explícitos | `Consequences` (+ subsecciones `Positive`/`Negative`), `Trade-offs`, `Risks` |
| 7 | **Referencias** | Enlaces verificables: specs, documentación, issues, benchmarks | `Links` |
| 8 | **Decisiones y Estándares Relacionados** | Enlaces a ADRs relacionados, estándares Evolith, rulesets y artefactos impactados | `Related ADRs`, `Relationships` |

Más la metadata estándar de cabecera: **Estado** (`Propuesto` / `Aprobado` / `Reemplazado por ADR-XXXX` / `Obsoleto`) y **Fecha**.

## 3. Secciones Adicionales Requeridas — Solo ADRs de Plataforma

Como los ADRs de plataforma apuestan por tecnologías concretas, deben además justificar la durabilidad de la apuesta:

| # | Sección | Contenido |
|---|---|---|
| 9 | **Vigilancia Tecnológica** | Análisis de tendencias: dirección del mercado, etapa de madurez (emergente/crecimiento/madura/declive), señales de adopción de la comunidad (descargas, stars, encuestas), modelo de soporte del vendor/mantenedor y SLA, y vigencia tecnológica esperada (cuánto tiempo es defendible la elección). |
| 10 | **Fuentes Actuales** | Fuentes verificables y fechadas para el análisis de vigilancia (release notes, roadmaps, encuestas de adopción, avisos de seguridad). Indicar fecha de consulta — fuentes obsoletas invalidan la sección. |

Los ADRs de plataforma deben definir un **disparador de revisión**: la condición (fecha o evento, p. ej., "anuncio de EOL de versión mayor") que fuerza la re-evaluación.

## 4. Reglas de Archivo e Identidad

- **Un ADR = una decisión = un par de archivos con slug en inglés**: `NNNN-slug-en-ingles.md` (EN) + `NNNN-slug-en-ingles.es.md` (ES). Los nombres de archivo con slug en español están prohibidos (los duplicados legados se eliminaron el 2026-06-10).
- **IDs**: tomar el siguiente número libre considerando *todas* las categorías. Las colisiones históricas por categoría (p. ej., `core/0044` vs `nodejs/0044`) quedan asumidas; al citar un ID en colisión, calificar siempre con la categoría (`core/ADR-0044`).
- **Trazabilidad**: un ADR con enforcement por regla machine-readable debe ser referenciado desde el `rulesets/adr/*.rules.json` correspondiente, y viceversa.
- **Reubicación**: mover un ADR entre categorías exige actualizar todo enlace entrante en el mismo cambio y una nota en la cabecera del ADR (`Reubicado desde <categoría> el <fecha>`).

## 5. Cumplimiento

- ADRs nuevos: el cumplimiento total de este estándar es criterio del gate Design Baseline.
- ADRs existentes: las secciones estructurales se normalizaron el 2026-06-10; el backfill de contenido de las secciones 2, 3, 5, 8 (y 9–10 para plataforma) se trackea como [GT-20](../../governance/standards/vision/gap-reference-catalog.es.md#gt-20). La revisión de ubicación de ADRs Core centrados en herramientas se trackea como [GT-21](../../governance/standards/vision/gap-reference-catalog.es.md#gt-21).
- Plantilla canónica: [Plantilla ADR](../../governance/sdlc/04-artifact-templates/adr-template.es.md).

---
[Volver al Registro de ADRs](./README.es.md)
