# reference/knowledge — Evolith Core Knowledge OS (M0)

> Navegación bilingüe: [English](./README.md)

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
- `okf/` — **proyección OKF v0.1 publicada** (Open Knowledge Format): el corpus canónico
  exportado como bundle markdown+frontmatter portable, **commiteado y legible al clonar**,
  consumible por cualquier agente externo sin conocer nuestro esquema YAML. Es **generado**
  (nunca editado a mano, nunca autoridad); un gate `--verify` prueba que
  `publicado == regenerar(canonical)`. El Core es **YAML-first**; OKF es superficie de
  **intercambio**, no de autoría. Diseño: [ADR-0105](../core/architecture/adrs/core/0105-okf-knowledge-projection.es.md).
- `derived/` — **caché regenerable** (embeddings/índices RAG). `.gitignore`-ado; NUNCA
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

### Proyección OKF publicada (bundle → `okf/`)

```bash
node .harness/scripts/knowledge-okf-project.mjs                 # regenera el bundle publicado
node .harness/scripts/knowledge-okf-project.mjs --verify        # conformidad + up-to-date (gate CI)
node .harness/scripts/knowledge-okf-project.mjs --check         # solo conformidad, sin escribir
node --test .harness/scripts/knowledge-okf-project.test.mjs     # tests unitarios
```

> Editaste `canonical/`? **Regenera y re-stagea** el bundle: `node .harness/scripts/knowledge-okf-project.mjs && git add reference/knowledge/okf`. El gate `--verify` (y el pre-commit) bloquean si el bundle publicado quedó desincronizado.

Gobernanza de la proyección (habilidad de Winston — ver
[playbook](../../.harness/playbooks/okf-standard-watch-playbook.es.md)):

```bash
node .harness/scripts/knowledge-okf-standard-watch.mjs          # vigía del estándar OKF (red, manual)
node .harness/scripts/knowledge-okf-standard-watch.mjs --accept # reconoce un cambio upstream revisado
```

- **Guarda pre-commit** (`.husky/pre-commit`): si stageas cambios del corpus, corre `--verify`
  y **bloquea** si el bundle publicado quedó desincronizado; avisa STALE si el vigía no corre
  hace >30 días. Corre en cualquier modo, incluso `skip`; paga costo solo si tocaste el corpus.
- **Gate up-to-date** (`ci/38-validate-okf-projection.mjs`): bloquea CI si el bundle no conforma
  o quedó desincronizado del corpus (modos governance/auto/full).
- **Regla de oro:** drift de conformidad/sincronía **bloquea**; vencimiento del estándar solo **avisa**.

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
