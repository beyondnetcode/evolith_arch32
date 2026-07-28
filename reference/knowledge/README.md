# reference/knowledge — Evolith Core Knowledge OS (M0)

Canonical, versioned knowledge **about the product**, so that any agent (Claude /
ChatGPT / Gemini / BMAD / Copilot / MCP) "starts expert" without depending on
conversational memory. *Memory for the product, not for the AI.*

Full design: `reference/specs/architecture/knowledge-os-proposal.md` (in the Tracker satellite).

## Zones

- `canonical/` — the **single source of truth**: authored, reviewable in a PR.
  - `product.yaml` — product identity (slow cadence, no oracle).
  - `packs/*.pack.yaml` — knowledge packs per bounded context (**composition**
    manifests: they absorb by reference, and carry authored body only where there
    is a gap).
- `knowledge.index.yaml` — master index (flat, layered L0..L3).
- `okf/` — the **published OKF v0.1 projection** (Open Knowledge Format): the canonical
  corpus exported as a portable markdown+frontmatter bundle, **committed and readable on
  clone**, consumable by any external agent without knowing our YAML schema. It is
  **generated** (never hand-edited, never authoritative); a `--verify` gate proves that
  `published == regenerate(canonical)`. The Core is **YAML-first**; OKF is an **exchange**
  surface, not an authoring one. Design: [ADR-0105](../core/architecture/adrs/core/0105-okf-knowledge-projection.md).
- `derived/` — a **regenerable cache** (RAG embeddings and indexes). Gitignored; NEVER
  authoritative, NEVER hand-edited. Produced by `rag-sync.mjs`.

## What it REUSES (rather than duplicating)

| Need | Already in the Core |
|---|---|
| External knowledge intake (KI/SRC) | `product/research/intake/`, `.harness/scripts/ci/17-validate-knowledge-intake.mjs` |
| Dual native+OPA anti-drift | `.harness/scripts/ci/18-validate-knowledge-parity.mjs` |
| Embeddings / RAG (write side) | `.harness/scripts/ci/rag-sync.mjs`, `14-rag-index-sync.mjs` |
| Corpus queries (read side) | `IKnowledgePort` (`src/packages/agent-runtime/src/domain/ports/knowledge.port.ts`) |
| MCP surface | `corpus-resource.handler.ts` (`src/packages/mcp-server`) |
| ADR freshness | `.harness/scripts/adr-freshness-monitor.mjs` |
| KI allow-list for RAG | `src/rulesets/schema/knowledge-projection.schema.json` |

## Usage (M0, local resolver)

```bash
node .harness/scripts/knowledge-resolve.mjs --list
node .harness/scripts/knowledge-resolve.mjs --pack knowledge-and-corpus
node .harness/scripts/knowledge-resolve.mjs --freshness   # STALE warns; oracle drift blocks
```

### Published OKF projection (bundle → `okf/`)

```bash
node .harness/scripts/knowledge-okf-project.mjs                 # regenerate the published bundle
node .harness/scripts/knowledge-okf-project.mjs --verify        # conformance + up-to-date (CI gate)
node .harness/scripts/knowledge-okf-project.mjs --check         # conformance only, writes nothing
node --test .harness/scripts/knowledge-okf-project.test.mjs     # unit tests
```

> Edited `canonical/`? **Regenerate and re-stage** the bundle: `node .harness/scripts/knowledge-okf-project.mjs && git add reference/knowledge/okf`. The `--verify` gate (and the pre-commit hook) block if the published bundle fell out of sync.

Governance of the projection (one of Winston's skills — see the
[playbook](../../.harness/playbooks/okf-standard-watch-playbook.md)):

```bash
node .harness/scripts/knowledge-okf-standard-watch.mjs          # OKF standard watch (network, manual)
node .harness/scripts/knowledge-okf-standard-watch.mjs --accept # acknowledge a reviewed upstream change
```

- **Pre-commit guard** (`.husky/pre-commit`): if you stage corpus changes it runs `--verify`
  and **blocks** when the published bundle is out of sync; it warns STALE if the watch has
  not run in over 30 days. It runs in every mode, including `skip`, and costs nothing unless
  you touched the corpus.
- **Up-to-date gate** (`ci/38-validate-okf-projection.mjs`): blocks CI when the bundle does
  not conform or has drifted from the corpus (governance/auto/full modes).
- **Golden rule:** conformance and sync drift **block**; an expired standard only **warns**.

The *hosted* surface (REST `/api/v1/knowledge` + the MCP resource) reuses
`corpus-resource.handler`; it is wired in M2.

## Golden rule

No knowledge gate turns the branch red for **the passage of time**: expired freshness
degrades to `STALE` (a warning) and never blocks. Only **oracle drift** — a referenced
symbol or file that disappeared — blocks the PR that touched it.

## Open decisions (they need your call)

1. **Migration in flight:** some scripts point at `reference/knowledge/intake` and
   `reference/architecture/…`, while the content lives in `product/research/intake`
   and `reference/core/architecture/…`. Should everything be unified under
   `reference/knowledge/`?
2. **`projection` vs `pack`:** `knowledge-projection.schema.json` is a KI allow-list for
   RAG; a `pack` is per-bounded-context product knowledge. They are complementary — worth
   confirming they do not overlap, and giving the `pack` a schema.

> Status: **M0 / DRAFT** — Phase 0 "Coexistence": it catalogs what exists, it moves no files.
