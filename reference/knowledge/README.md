# reference/knowledge — Evolith Core Knowledge OS (M0)

Conocimiento **del producto**, canónico y versionado, para que cualquier agente
(Claude / ChatGPT / Gemini / BMAD / Copilot / MCP) "arranque experto" sin depender
de memoria conversacional. *Memoria para el producto, no para la IA.*

Diseño completo: `reference/specs/architecture/knowledge-os-proposal.md` (en el satélite Tracker).

## Zonas

- `canonical/` — **única fuente de verdad**, autoral, revisable en PR.
  - `product.yaml` — identidad del producto (cadencia larga, sin oráculo).
  - `packs/*.pack.yaml` — packs de conocimiento por bounded-context (manifiestos de
    **composición**: absorben por referencia; cuerpo autoral solo donde hay hueco).
- `knowledge.index.yaml` — índice maestro (plano, estratificado en capas L0..L3).
- `derived/` — **caché regenerable** (embeddings/índices). `.gitignore`-ado; NUNCA
  autoridad, NUNCA editado a mano. Lo produce `rag-sync.mjs`.

## Qué REUSA (no duplica)

| Necesidad | Ya existe en el Core |
|---|---|
| Intake de conocimiento externo (KI/SRC) | `product/research/intake/`, `.harness/scripts/ci/17-validate-knowledge-intake.mjs` |
| Anti-drift dual native+OPA | `.harness/scripts/ci/18-validate-knowledge-parity.mjs` |
| Embeddings / RAG (write-side) | `.harness/scripts/ci/rag-sync.mjs`, `14-rag-index-sync.mjs` |
| Query del corpus (read-side) | `IKnowledgePort` (`src/packages/agent-runtime/src/domain/ports/knowledge.port.ts`) |
| Superficie MCP | `corpus-resource.handler.ts` (`src/packages/mcp-server`) |
| Frescura de ADRs | `.harness/scripts/adr-freshness-monitor.mjs` |
| Allow-list de KI para RAG | `src/rulesets/schema/knowledge-projection.schema.json` |

## Uso (M0, resolver local)

```bash
node .harness/scripts/knowledge-resolve.mjs --list
node .harness/scripts/knowledge-resolve.mjs --pack knowledge-and-corpus
node .harness/scripts/knowledge-resolve.mjs --freshness   # STALE avisa; drift de oráculo bloquea
```

La superficie *hosted* (REST `/api/v1/knowledge` + resource MCP) reusa
`corpus-resource.handler`; se cablea en M2.

## Regla de oro

Ningún gate de conocimiento pone la rama en rojo por el **paso del tiempo**: la
frescura vencida degrada a `STALE` (aviso), nunca bloquea. Solo el **drift de
oráculo** (un símbolo/archivo referenciado que desapareció) bloquea el PR que lo tocó.

## Decisiones abiertas (necesitan tu call)

1. **Migración en curso:** algunos scripts apuntan a `reference/knowledge/intake` y
   `reference/architecture/…`, pero el contenido vive en `product/research/intake`
   y `reference/core/architecture/…`. ¿Se unifica todo bajo `reference/knowledge/`?
2. **`projection` vs `pack`:** `knowledge-projection.schema.json` es un allow-list de
   KI para RAG; el `pack` es conocimiento de producto por bounded-context. Son
   complementarios — conviene confirmar que no se solapan y darle schema al `pack`.

> Estado: **M0 / DRAFT** — Fase 0 "Coexistencia": cataloga lo existente, no mueve archivos.
