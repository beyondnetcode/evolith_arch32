# ADR 0090 – Política de idioma para rulesets machine‑readable

**Estado:** Aceptado

## Contexto
- Los *rulesets* (archivos JSON) representan la lógica de validación de gobernanza que es consumida directamente por herramientas automáticas (CLI, pipelines, OPA, etc.).
- Mantener versiones duplicadas del mismo ruleset en distintos idiomas provoca:
  - Desincronización inevitable.
  - Incremento de carga de mantenimiento.
  - Riesgo de que una versión quede obsoleta y cause falsos positivos/negativos.

## Decisión
1. **Canonicalidad en Inglés** – El archivo JSON de cada ruleset será **único y definitivo** en idioma inglés.
2. **Exención de Bilingüismo** – No se crearán ni mantendrán archivos `*.es.json`.
3. **Documentación Bilingüe** – Cada ruleset debe disponer de un README (o sección en el catálogo) con descripciones en inglés y español, pero la *definición estructural* sigue siendo solo la versión en inglés.
4. **Validación** – Los scripts de pre‑commit (`check-orphan-bilingual.mjs`, `validate-docs.mjs`) se configuran para ignorar los files `*.json` al validar paridad de idioma.

## Consecuencias
- Reducción del *deuda Técnica* asociado a la traducción de artefactos de máquina.
- Los equipos deben consultar la documentación bilingüe para comprender la intención de la regla.
- En caso de que se requiera una regla distinta para una región, se deberá crear un nuevo ruleset con su propio identificador.

## Referencias
- GT‑36 – Política de cobertura lingüística para reglas machine‑readable.
- `.harness/scripts/check-orphan-bilingual.mjs` – actualizado para excluir `*.json`.
- `reference/core/control-center/gaps/gap-tracking.md` – marcado como **DONE**.
