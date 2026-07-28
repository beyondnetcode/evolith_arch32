---
id: glossary.knowledge
owner: "@winston"
reviewBy: "2026-10-06"
---

# Glossary — Knowledge & Corpus

Terms from Evolith Core's `ctx.knowledge` bounded context. This is the single source of
truth: agents load it so they speak the same language as the product.

- **Knowledge Pack** — A *composition* manifest that packages one bounded context's
  knowledge: it **absorbs by reference** what already exists (ADRs, topologies, rulesets)
  and adds **authored body** (domain, glossary, prompts) only where there is a gap.
  Versioned with SemVer; its version covers the authored part alone, never the referenced
  material.

- **Canonical vs. derived** — `canonical/` is the only source of truth: authored and
  reviewable in a PR. `derived/` (embeddings, indexes) is a **regenerable cache**: never
  authoritative, never hand-edited, produced by `rag-sync`.

- **Oracle** — A **machine-verifiable** link between a knowledge claim and its reference
  implementation. Three kinds: `link-check` (the cited file exists), `symbol-exists` (the
  cited symbol exists), `executable-test` (the test proving the claim exists and CI runs
  it). **Never prose.**

- **Drift** — When the reference code changes and leaves the knowledge behind. Oracle drift
  **blocks** the PR that introduced it; date-based expiry only **warns** (`STALE`) and never
  blocks the branch.

- **Intake (KI/SRC)** — The capture pipeline for **external** knowledge (books, sources): a
  `KI-*` (knowledge item) references a `SRC-*` (source registry) and moves through
  `candidate → … → accepted`. It lives in `product/research/intake/`. Distinct from a pack:
  intake *ingests* outside material, a pack *organizes* the product's own knowledge.

- **Projection** — An explicit allow-list of `KI-*` approved for RAG retrieval
  (`src/rulesets/schema/knowledge-projection.schema.json`). Not a pack.

- **IKnowledgePort** — The *read-side* port (GT-408) for querying the indexed corpus with
  artifact citations: `src/packages/agent-runtime/src/domain/ports/knowledge.port.ts`.
