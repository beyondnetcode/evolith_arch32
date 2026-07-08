---
type: Glossary
title: Glosario — Knowledge & Corpus
resource: reference/knowledge/canonical/glossary/knowledge.md
tags:
  - glossary
  - ctx.knowledge
timestamp: '2026-07-08'
owner: '@winston'
reviewBy: '2026-10-06'
partOf: /packs/knowledge-and-corpus.md
---

# Glosario — Knowledge & Corpus

Términos del bounded context `ctx.knowledge` de Evolith Core. Fuente única de verdad:
los agentes lo cargan para hablar el mismo idioma que el producto.

- **Knowledge Pack** — Manifiesto de *composición* que empaqueta el conocimiento de un
  bounded-context: **absorbe por referencia** lo que ya existe (ADRs, topologías, rulesets)
  y añade **cuerpo autoral** (dominio, glosario, prompts) solo donde hay hueco. Versionado
  en SemVer; su versión cubre únicamente lo autoral, no lo referenciado.

- **Canónico vs. derivado** — `canonical/` es la única fuente de verdad: autoral y revisable
  en PR. `derived/` (embeddings, índices) es **caché regenerable**: nunca autoridad, nunca
  editada a mano; la produce `rag-sync`.

- **Oráculo (oracle)** — Vínculo **verificable por máquina** entre una afirmación de
  conocimiento y su implementación de referencia. Tipos: `link-check` (el archivo citado
  existe), `symbol-exists` (el símbolo citado existe), `executable-test` (el test que prueba
  la afirmación existe y CI lo corre). **Nunca prosa.**

- **Drift** — Cuando el código de referencia cambia y deja obsoleto al conocimiento. El drift
  de oráculo **bloquea** el PR que lo introdujo; el vencimiento por fecha solo **avisa**
  (`STALE`), nunca bloquea la rama.

- **Intake (KI/SRC)** — Pipeline de captura de conocimiento **externo** (libros, fuentes): un
  `KI-*` (knowledge item) referencia un `SRC-*` (source registry) y transita
  `candidate → … → accepted`. Vive en `product/research/intake/`. Distinto del pack: el intake
  *ingiere* material externo; el pack *organiza* el conocimiento propio del producto.

- **Projection** — Allow-list explícito de `KI-*` aprobados para recuperación por RAG
  (`src/rulesets/schema/knowledge-projection.schema.json`). No es un pack.

- **IKnowledgePort** — Puerto *read-side* (GT-408) para consultar el corpus indexado con
  citación de artefactos: `src/packages/agent-runtime/src/domain/ports/knowledge.port.ts`.
