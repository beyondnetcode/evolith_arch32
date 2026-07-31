# Rulesets de Evidencia

> **Navegación bilingüe:** [English version](./README.md)

Reglas para evidencia trazable usada por gates SDLC, auditorías, revisiones de release y reportes ejecutivos.

## Rulesets

| Ruleset | Propósito |
|---|---|
| [Manifest de Evidencia](./evidence-manifest.rules.json) | Define los metadatos mínimos de evidencia necesarios para probar cumplimiento de gates, reglas o waivers. |
| [Admisibilidad de Evidencia Probabilística](./probabilistic-evidence-admissibility.rules.json) | Decide si una señal de calidad PROBABILÍSTICA (ADR-0111) puede contribuir a un veredicto bloqueante: solo mientras sus tasas medidas de verdadero positivo y verdadero negativo superen los pisos declarados y la medición siga fresca. La calibración ausente significa no-puede-bloquear, nunca «asumir que está bien». |

