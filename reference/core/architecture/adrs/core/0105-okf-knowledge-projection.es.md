> **Navegación bilingüe:** [View English version](./0105-okf-knowledge-projection.md)

# ADR-0105: OKF como proyección portable del Knowledge OS

> **Firma del Agente:** Architect Agent (Winston)

## Estado
Propuesto (2026-07-07)

## Fecha
2026-07-07

## Contexto y Problema

El Knowledge OS de Evolith Core (`reference/knowledge/`, M0) es **YAML-first**: la única fuente de verdad se redacta como `canonical/product.yaml`, `canonical/packs/*.pack.yaml` y un índice maestro `knowledge.index.yaml`, con la prosa autoral en `canonical/**/*.md`. Este modelo es excelente para autoría gobernada — manifiestos de composición, oráculos verificables por máquina, packs en SemVer, revisión en PR— pero es **propietario de Evolith**: un agente externo (Claude, ChatGPT, Gemini, Copilot, un cliente MCP) no puede consumirlo sin aprender nuestro esquema `apiVersion: evolith.dev/knowledge/v1`.

En junio de 2026 Google Cloud publicó **OKF (Open Knowledge Format) v0.1** — una especificación abierta y vendor-neutral que representa conocimiento curado como un directorio de archivos markdown con frontmatter YAML (`type` es el único campo obligatorio), archivos reservados `index.md`/`log.md` y cross-links markdown que forman un grafo. OKF es exactamente la forma de intercambio portable que a nuestro corpus propietario le falta. El problema: **¿cómo hacemos consumible el conocimiento del Core como un bundle estándar y portable sin abandonar el modelo de autoría YAML gobernado que ya funciona?**

## Objetivo y Alcance

**Objetivo:** exponer el conocimiento canónico del Core como un bundle conforme a OKF v0.1 que cualquier humano o agente externo pueda leer, sin cuenta, SDK ni esquema propietario.

**En alcance:**
- Una proyección OKF **publicada y commiteada** de `canonical/` en `reference/knowledge/okf/` — generada (nunca editada a mano, nunca autoridad), legible al clonar y mantenida honesta por un **gate up-to-date** que prueba `publicado == regenerar(canonical)`.
- Un generador determinista integrado en la superficie local M0 existente, más verificación de conformidad + up-to-date para CI.

**Fuera de alcance (explícitamente diferido):**
- Reemplazar el modelo de autoría YAML por autoría OKF nativa (sería una decisión aparte y mayor).
- Servir el bundle vía REST/MCP — diferido a M2, reusando `corpus-resource.handler` e `IKnowledgePort`.
- Ingerir bundles OKF externos _hacia_ el Core (dirección de import).
- Un allow-list editorial/de scoping de packs publicables — un hook documentado, no construido: el Core es open-source y, por ADR-0101, nunca posee estado sensible/tenant, así que hoy todos los packs son publicables.

## Opciones Consideradas

1. **OKF como proyección publicada con gate up-to-date (elegida).** Mantener YAML como formato autoral soberano; añadir un adaptador que proyecte `canonical/` → un bundle OKF commiteado en `reference/knowledge/okf/`, más un gate `--verify` que falla CI si el bundle commiteado driftea de la fuente. Legible al clonar (el sentido de un corpus abierto y colaborativo), con el drift cerrado por el gate. Aditivo, reversible.
2. **OKF como proyección derivada, gitignored.** Mismo generador, pero el bundle queda sin commitear bajo `derived/` y los consumidores lo regeneran. Preserva el invariante `derived/=nunca-commiteado` a la letra, pero un bundle que nadie ve al clonar no tiene público — falla el objetivo "cualquiera que descarga el fuente puede consumirlo" en un proyecto abierto. Rechazada a favor de publicar + un gate que mantiene el drift afuera.
3. **Adoptar OKF como formato de autoría nativo.** Reemplazar `*.pack.yaml`/`product.yaml` por conceptos OKF escritos a mano. Máxima alineación con el estándar, pero descarta los manifiestos de composición, el modelo de oráculo verificable por máquina y los packs en SemVer — una reescritura del Knowledge OS M0 por una interoperabilidad que obtenemos por proyección. Rechazada.
4. **No hacer nada / export ad-hoc bajo demanda.** Dejar el corpus propietario y escribir exports a mano cuando un consumidor lo pida. Rechazada — no repetible, deriva de la fuente, traiciona el objetivo de "arrancar experto sin memoria conversacional".

## Decisión y Justificación

**Adoptamos la Opción 1: OKF v0.1 es el formato de *proyección* portable del Core, no su formato de autoría — publicado y con gate.**

- **La autoría sigue siendo YAML-first.** `canonical/` sigue siendo la única fuente de verdad. El bundle OKF es un **artefacto publicado y generado** en `reference/knowledge/okf/`: commiteado y legible al clonar, pero nunca escrito a mano y nunca autoridad. Un **gate up-to-date** (`--verify`, corrido en CI y en pre-commit cuando cambia el corpus) prueba `publicado == regenerar(canonical)`, así el bundle commiteado no puede driftear ni volverse una segunda fuente de verdad — la intención del invariante `derived/` se preserva por verificación, no por esconder el archivo.
- **La proyección es determinista.** `.harness/scripts/knowledge-okf-project.mjs` lee `knowledge.index.yaml`, rehidrata los cuerpos autorales **siempre desde la fuente** y emite un bundle OKF: `product.md` (`type: Product`), un `type: Knowledge Pack` por pack, un concepto por archivo autoral (`type: Glossary`/`Domain Model`/`Prompt`), nodos de referencia para ADRs/schemas absorbidos (`type: ADR`/`Schema`), un `index.md` reservado por directorio y un `log.md`. Los cross-links son **absolutos desde la raíz del bundle** (`/packs/…`) según la recomendación de estabilidad de la spec.
- **La procedencia se preserva como extensiones OKF.** `owner`, `reviewBy`, `version`, `partOf` y `resource` (ruta repo-relativa o URN `evolith://`) viajan como claves extra del frontmatter — permitidas por OKF e ignoradas por consumidores ingenuos.
- **La conformidad se impone.** El generador auto-verifica que todo archivo no reservado tenga frontmatter parseable con `type` no vacío; `--check` lo corre en CI sin escribir.

Justificación: esto compra interoperabilidad basada en estándares a riesgo casi nulo. Nada del corpus autoral cambia; la proyección es una función pura de él. Si OKF evoluciona o se abandona, solo cambia el adaptador — el conocimiento soberano queda intacto. Es la misma disciplina de altitud del ADR-0101: el Core sigue siendo la autoridad; una superficie portable se deriva, no se posee.

## Evidencia y Criterios de Evaluación

- **Criterios:** (a) cero cambios en el corpus soberano; (b) conformidad OKF v0.1; (c) determinismo/reproducibilidad; (d) drift cerrado por verificación, no por esconder el artefacto.
- **Evidencia:**
  - El generador emite un bundle conforme desde el corpus real: `node .harness/scripts/knowledge-okf-project.mjs --check` → _15 archivos, 0 violaciones_.
  - El gate up-to-date sostiene y atrapa el drift: `--verify` pasa sobre un bundle fresco y devuelve exit 1 cuando `canonical/` cambia sin regenerar (probado mutando un concepto y re-corriéndolo).
  - Los tests unitarios verifican conformidad, rehidratación desde la fuente, cross-links absolutos, acumulación de backlinks, manejo de archivos reservados, determinismo byte a byte para un `--as-of` fijo, y la clasificación de drift de `diffBundle` (changed/missing/orphan).
  - Spec OKF v0.1: solo `type` es obligatorio; los consumidores DEBEN tolerar claves desconocidas y enlaces rotos — así que nuestros campos de extensión y nodos de referencia `evolith://` son seguros.

## Consecuencias, Riesgos y Compensaciones

**Positivo**
- El conocimiento del Core es consumible por cualquier agente/herramienta compatible con OKF sin acoplamiento propietario y **legible directo al clonar** — el objetivo abierto y colaborativo: cualquiera que descarga el fuente puede leer y hacer crecer el corpus.
- Aditivo y reversible: ningún archivo autoral cambia; el adaptador es la única superficie nueva libre de autoridad.
- Deja la costura lista para el serving hosted M2 (REST `/api/v1/knowledge` + resource MCP), que emitirá el mismo bundle.

**Negativo / riesgos**
- **Drift de doble representación** entre la fuente YAML y el bundle OKF commiteado. *Mitigado:* el gate `--verify` (CI `38-validate-okf-projection` + pre-commit cuando cambia el corpus) bloquea todo commit cuyo bundle publicado ≠ `regenerar(canonical)`; el bundle es generado, nunca editado a mano; los cuerpos se rehidratan desde la fuente.
- **La historia de git es permanente** — todo lo publicado viaja para siempre. *Aceptado:* el Core es open-source y, por [ADR-0101](./0101-core-stateless-evaluation-engine.es.md), nunca posee estado sensible/tenant (eso vive en los satélites), así que todos los packs son publicables. Si algún pack debiera retenerse, se añade un exclude editorial a la entrada `projections` del índice — un hook documentado, deliberadamente no construido ahora (YAGNI).
- **OKF v0.1 es joven** ("un punto de partida, no un estándar terminado"). *Mitigado:* aislado tras un único adaptador y vigilado por `knowledge-okf-standard-watch` (ver el playbook de Winston); un cambio de spec es una edición local.
- **Los nodos de referencia usan URNs `evolith://adr/…`**, no rutas de archivo dereferenciables. *Aceptado:* los consumidores OKF deben tolerar enlaces no dereferenciables/rotos; las referencias a schemas sí llevan rutas reales del repo.

**Compensación:** aceptamos mantener un proyector (y su superficie de drift) a cambio de interoperabilidad estándar sin reescribir el corpus.

## Referencias

- Especificación OKF v0.1 — [GoogleCloudPlatform/knowledge-catalog/okf/SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [How the Open Knowledge Format can improve data sharing — Google Cloud Blog](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/)
- Generador: `.harness/scripts/knowledge-okf-project.mjs` · Tests: `.harness/scripts/knowledge-okf-project.test.mjs`
- Fuente de verdad: `reference/knowledge/knowledge.index.yaml`, `reference/knowledge/canonical/`
- Visión del Knowledge OS: `reference/knowledge/README.md`

## Decisiones y Estándares Relacionados

- [ADR-0074: Evolith Core API Exposure Layer](./0074-evolith-core-api-exposure-layer.es.md) — la superficie OKF hosted (M2) expone a través de esta capa.
- [ADR-0080: Remote Repository Reference Contract](./0080-remote-repository-reference-contract.es.md) y [ADR-0101: Core como Motor de Evaluación Stateless](./0101-core-stateless-evaluation-engine.es.md) — misma disciplina de altitud: las superficies derivadas/portables nunca se vuelven autoridad del Core.
- Propuesta de diseño del Knowledge OS: `reference/specs/architecture/knowledge-os-proposal.md` (satélite Tracker).
- Allow-list complementario: `src/rulesets/schema/knowledge-projection.schema.json` (projection de RAG, no confundir con la proyección OKF).

---

[Volver al Registro de ADRs](../README.es.md) · [Matriz de Decisiones ADR](../adr-matrix.es.md) · [ADR-0101](./0101-core-stateless-evaluation-engine.es.md)
