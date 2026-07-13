> **Bilingual Navigation:** [Ver versión en Español](./0112-rag-embedding-and-vector-store-platform.es.md)

# ADR-0112: RAG Embedding & Vector-Store Platform (Qwen3-Embedding on pgvector)

## Status
Accepted

## Date
2026-07-13

## Context and Problem
[ADR-0090](./0090-rag-knowledge-governance.md) established the RAG governance **contract** — chunking, metadata schema, embedding rules, sync trigger — but deliberately left two things unspecified: the concrete **embedding model** (§3, "model agnostic") and the concrete **vector-store provider** (§5, "vector store agnosticism"). [ADR-0003](../ai-augmented/0003-model-selection-governance.md) governs *how* models are selected (registry, policy, telemetry) but never fixed *which* embedding model Evolith uses.

The consequence is a scaffold with an empty integration slot. `.harness/scripts/ci/rag-port.mjs` ships only a non-durable `memory` adapter whose `embed()` is a `hashEmbed` sha256 pseudo-embedding; `registerRagAdapter()` is defined but never called with a real vendor; and the runtime read-side (`InMemoryKnowledgeAdapter`) scores by substring/token-overlap with no embeddings at all. Nothing is operational — this is exactly what gaps [`GT-538`](../../../control-center/gaps/gap-reference-catalog.md#gt-538) (durable vector store), [`GT-539`](../../../control-center/gaps/gap-reference-catalog.md#gt-539) (real embedding model), and [`GT-540`](../../../control-center/gaps/gap-reference-catalog.md#gt-540) (production retrieval adapter) exist to close.

Wiring those three gaps requires a concrete platform decision. Making it **once, here** avoids cabling the vector store, the embedding model, and the read-side against three different provisional choices and then re-embedding the corpus to reconcile them.

The decision is constrained by a first principle repeated across the architecture: **no external tool is ever a Core dependency**. Sovereignty ([ADR-0088](./0088-sovereign-identity-agentic-ai.md)), data-egress governance ([ADR-0001](../ai-augmented/0001-harness-engineering.md)), and self-hosting are the default posture — ADR-0090 §5 already names pgvector the "preferred self-hosted" target. A managed embedding vendor (Voyage AI, OpenAI) would send the corpus off-perimeter and introduce a paid external dependency, contrary to that posture.

## Decision
We fix the RAG platform as **fully open-source and self-hosted**. This ADR selects the concrete platform; ADR-0090 remains the governing contract and the port stays model-agnostic (the choice below is the *default*, not a lock-in).

### 1. Embedding model — Qwen3-Embedding (Apache-2.0)
The default embedding model is **`Qwen3-Embedding-0.6B`** for a lean self-hosted footprint, with **`Qwen3-Embedding-4B` / `-8B`** as the max-quality scale-up.

Rationale:
- **Best open retrieval quality.** Qwen3-Embedding tops the MTEB multilingual leaderboard (8B ≈ 70.58), surpassing OpenAI's `text-embedding-3` by roughly +6 points — the point at which open-weight retrieval overtook the managed APIs.
- **Maximally open.** Apache-2.0 license (permissive, commercial-safe) — it satisfies "most open **and** best-ranked" simultaneously, which the fully-reproducible-but-lower-ranked options (nomic) and the MIT hybrid workhorse (BGE-M3) do not both do.
- **Fits our corpus.** 100+ natural **and** programming languages — our corpus is English ADRs/rulesets with embedded code fences, which this model handles natively.
- **Tunable footprint.** Matryoshka output dimensions 32–1024, so storage/latency can be traded against recall per deployment without changing models.

The selected model MUST be registered in the ADR-0003 `model-registry.json` with capability `embedding`, and its identifier MUST be recorded in each chunk's `corpus_version` metadata per ADR-0090 §3 (for cache invalidation and exact reconstruction).

### 2. Embedding dimension — 1024 (Matryoshka)
Default output dimension **1024** (Qwen3 Matryoshka maximum). The pgvector column is `vector(1024)`. A smaller Matryoshka dimension (e.g. 512 / 256) MAY be selected per deployment for storage/latency; the chosen dimension is part of the corpus identity and MUST be declared in `corpus_version`.

### 3. Vector store — pgvector on the existing PostgreSQL
The vector store is **pgvector** on the PostgreSQL instance Evolith already runs (`:5432`) — the ADR-0090 §5 preferred self-hosted target. Use an **HNSW** index for approximate nearest-neighbour search, with metadata columns for the ADR-0090 §2 filter fields (`source_file`, `adr_id`, `language`, `corpus_version`). This is the durable adapter that `registerRagAdapter('pgvector', …)` wires in (GT-538).

### 4. Runtime — Node.js host + local inference sidecar
The model runs behind a **local inference service on the same perimeter** (ONNX Runtime, `text-embeddings-inference` / `llama.cpp`, or Ollama) that the Node `rag-port.mjs` (write-side) and `IKnowledgePort` (read-side) adapters call over localhost. **Node does not run the model in-process**; the sidecar is the platform boundary. Embeddings are computed on-perimeter — **there is no corpus egress**.

### 5. Write-side vs query-side
- **Write-side (ingest):** the delta re-embed on `reference/` commits (ADR-0090 §4) is offline/batch — quality-first; run `4B`/`8B` where hardware allows.
- **Query-side (retrieval, GT-540):** latency-sensitive; `0.6B` is sufficient given the small corpus. The query-side **MUST** use the same model and dimension as the write-side, or the vectors are not comparable.

## Alternatives Considered
| Option | License | Verdict |
|---|---|---|
| **BGE-M3** | MIT | Documented alternate adapter. Hybrid dense + sparse + multi-vector in one model, 8192-token context, a battle-tested self-hosted-pgvector workhorse. Choose it when hybrid (dense+sparse) retrieval is wanted; slightly below Qwen3 on pure dense MTEB. |
| **nomic-embed-text-v2** | Apache-2.0 (+ open training data) | Documented alternate adapter. The "most reproducible" option (open weights **and** data) and the fastest/lowest-memory; ranks below Qwen3. Choose for maximal reproducibility or ultra-low-latency query-side. |
| **Voyage AI (`voyage-3.5`)** | Proprietary (managed) | Rejected as default. Anthropic's recommended embeddings partner and high quality, but a **paid external dependency with corpus egress** — contrary to the sovereignty / no-external-Core-dependency principle. Remains a valid opt-in adapter behind the model-agnostic port. |
| **OpenAI (`text-embedding-3-small/large`)** | Proprietary (managed) | Rejected as default. Ubiquitous and cheap, and cited illustratively in ADR-0003, but introduces an OpenAI dependency into an Anthropic-centric stack **and** egresses the corpus. Valid opt-in adapter only. |

## Consequences

### Positive
- **Fully OSS, zero per-token cost, zero corpus egress** — sovereign by construction ([ADR-0088](./0088-sovereign-identity-agentic-ai.md), [ADR-0001](../ai-augmented/0001-harness-engineering.md)).
- **Best-in-class open retrieval quality** without a managed vendor.
- **Provider neutrality preserved** — the ADR-0090 §3 model-agnostic port is intact; switching model or dimension is a re-embed, not a code change.
- **Unblocks GT-538 / GT-539 / GT-540** with a single coherent platform, avoiding double wiring.

### Negative
- **Operational burden** of hosting an inference sidecar (GPU optional for `0.6B`; `4B`/`8B` benefit from a GPU). New deploy artifact to run and monitor.
- **Model/dimension changes force a full re-index** (ADR-0090 §3 full-reindex trigger) — the chunk vectors are only comparable within one `corpus_version`.

### Neutral
- The concrete choice lives in the ADR-0003 model registry and in each chunk's `corpus_version`; migrating to a managed vendor later is a documented adapter swap plus a re-index, not a rewrite.

## References
- [ADR-0090: RAG Knowledge Governance](./0090-rag-knowledge-governance.md) — the governing contract this platform realizes
- [ADR-0003: Model Selection Governance](../ai-augmented/0003-model-selection-governance.md) — the registry/policy this embedding entry conforms to
- [ADR-0001: Harness Engineering](../ai-augmented/0001-harness-engineering.md) — external-provider egress routing and provider ports
- [ADR-0088: Sovereign Identity for Agentic AI](./0088-sovereign-identity-agentic-ai.md) — the sovereignty posture that favours self-hosting
- Gaps [`GT-538`](../../../control-center/gaps/gap-reference-catalog.md#gt-538) · [`GT-539`](../../../control-center/gaps/gap-reference-catalog.md#gt-539) · [`GT-540`](../../../control-center/gaps/gap-reference-catalog.md#gt-540) — the operationalization wave this ADR unblocks
- MTEB / MMTEB embedding leaderboard (Qwen3-Embedding #1 open, Apache-2.0), 2026

---
[Back to Core ADR Index](./README.md)

> **Agent Signature:** Architect Agent
