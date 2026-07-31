import {
  HybridKnowledgeAdapter,
  PgLexicalIndexAdapter,
  PgVectorKnowledgeAdapter,
  HttpEmbeddingAdapter,
} from '@beyondnet/evolith-agent-runtime/adapters';
import type { IKnowledgePort } from '@beyondnet/evolith-agent-runtime/ports';

/**
 * GT-592 — the wiring seam where the MCP gateway acquires a knowledge retriever.
 *
 * GT-538/539/540/541 finished the RAG stack and left it unreachable: the durable
 * pgvector index, the Qwen3 embedder and the delta-sync workflow all existed, and
 * no surface exposed any of them, so no external agent could query a single chunk
 * of the corpus that had been built and paid for. This factory is the wire.
 *
 * Configuration is by environment, and ABSENCE IS NOT A FALLBACK. With no
 * `EVOLITH_RAG_PG_URL` this returns `null` and the tool reports, explicitly, that
 * the corpus is not configured. The tempting alternative — quietly substituting
 * the in-memory token-overlap adapter — would answer every query with something
 * that looks like retrieval and is not, which is worse for an agent grounding a
 * recommendation than a clear refusal.
 *
 * The composition is BM25-FIRST by construction: the lexical index is required,
 * the dense reranker is attached only when an embedding sidecar is configured.
 * A deployment with a database but no sidecar therefore gets honest lexical
 * retrieval, which over an identifier-queried corpus is the more valuable half.
 */

export interface KnowledgeWiringResult {
  readonly port: IKnowledgePort | null;
  /** Human-readable reason when `port` is null, or the composition when it is not. */
  readonly mode: 'hybrid' | 'lexical-only' | 'unconfigured';
  readonly detail: string;
}

export function createKnowledgePort(env: NodeJS.ProcessEnv = process.env): KnowledgeWiringResult {
  const connectionString = env.EVOLITH_RAG_PG_URL ?? env.DATABASE_URL;
  if (!connectionString) {
    return {
      port: null,
      mode: 'unconfigured',
      detail:
        'No RAG store configured. Set EVOLITH_RAG_PG_URL to the pgvector database holding the ' +
        'rag_chunks index (GT-538 schema, populated by the GT-541 delta-sync workflow).',
    };
  }

  const corpusVersion = env.EVOLITH_RAG_CORPUS_VERSION;
  const lexical = new PgLexicalIndexAdapter({ connectionString, corpusVersion });

  if (!env.EVOLITH_RAG_EMBED_URL) {
    return {
      port: new HybridKnowledgeAdapter({ lexical }),
      mode: 'lexical-only',
      detail:
        'BM25 lexical retrieval over pgvector. No EVOLITH_RAG_EMBED_URL, so the dense reranker ' +
        'is not attached (ADR-0112 §4 — embeddings are computed on an on-perimeter sidecar).',
    };
  }

  const embedder = new HttpEmbeddingAdapter({ url: env.EVOLITH_RAG_EMBED_URL });
  const dense = new PgVectorKnowledgeAdapter({
    embed: embedder.asEmbedQuery(),
    connectionString,
    corpusVersion,
  });

  return {
    port: new HybridKnowledgeAdapter({ lexical, dense }),
    mode: 'hybrid',
    detail: `BM25-first hybrid retrieval over pgvector, reranked by ${embedder.modelId}.`,
  };
}
