/**
 * GT-592 — `HybridKnowledgeAdapter`: BM25-first hybrid retrieval.
 *
 * GT-540 shipped a production `IKnowledgePort` that ranks by cosine similarity
 * alone. That is the wrong instrument for THIS corpus. The architecture corpus
 * is queried by exact identifiers — `ADR-0111`, `GT-569`, `SCHEMA_VERSION`,
 * `EVD-01` — and a dense encoder maps every one of those to almost the same
 * point, because it encodes "an ADR reference" and discards the digits that are
 * the entire query. Lexical BM25 has the opposite failure profile: it cannot
 * paraphrase, but a rare token is exactly what it ranks best on.
 *
 * So this adapter composes both, BM25 FIRST:
 *
 *   1. BM25 over {@link ILexicalIndexPort} is the primary recall path and
 *      produces the larger candidate pool.
 *   2. The dense {@link IKnowledgePort} contributes a smaller list, acting as a
 *      reranker that pulls semantically-related chunks up and lets paraphrase
 *      queries still reach documents sharing no term with them.
 *   3. The two rankings are fused by Reciprocal Rank Fusion.
 *
 * Fusion is on RANK, not score: BM25 scores are unbounded and corpus-dependent
 * while cosine sits in [-1,1], so any score-level blend needs normalization
 * constants that are themselves a tuning knob. RRF has one published constant.
 *
 * FAIL-SOFT ON THE DENSE SIDE, FAIL-CLOSED ON THE LEXICAL SIDE. The dense path
 * depends on an embedding sidecar that can be down or unprovisioned; when it
 * fails the adapter degrades to pure BM25 and says so in `degradedTo`, because
 * a lexical-only answer over this corpus is genuinely useful. A lexical failure
 * is not survivable the same way — it would silently return the dense-only
 * ranking this gap exists to replace — so it propagates.
 *
 * Every parameter (k1, b, RRF k, pool sizes) is a literature default fixed
 * before any measurement in this repository, and the CI eval harness reports
 * the values it ran with.
 */

import type {
  IKnowledgePort,
  KnowledgeQuery,
  KnowledgeResult,
  KnowledgeDocument,
  KnowledgeChunk,
} from '../../domain/ports/knowledge.port';
import type { ILexicalIndexPort } from '../../domain/ports/lexical-index.port';
import {
  rankBm25,
  DEFAULT_BM25_PARAMS,
  type Bm25Params,
  type Bm25Candidate,
} from '../../domain/retrieval/bm25';
import { reciprocalRankFusion, DEFAULT_RRF_K } from '../../domain/retrieval/rank-fusion';
import { queryTerms } from '../../domain/retrieval/tokenize';

/** BM25 is the primary recall path, so its pool is the larger one. */
export const DEFAULT_LEXICAL_POOL = 100;
/** The dense list reranks; it does not need to be as deep. */
export const DEFAULT_DENSE_POOL = 50;

/**
 * Fusion weights — this is where "BM25 FIRST" stops being a slogan.
 *
 * Under equal weights, RRF lets a confidently-wrong dense list outvote BM25's
 * top hit: a document BM25 ranked 2nd and dense ranked 2nd beats one BM25
 * ranked 1st and dense ranked 4th. That is exactly the failure mode this gap
 * exists to remove, since a dense encoder IS confidently wrong on identifier
 * queries — it places every `ADR-NNNN` in nearly the same region.
 *
 * Weighting the lexical list twice the dense list makes the precedence explicit:
 * dense reorders among candidates BM25 is indifferent about, and pulls in
 * documents BM25 could not reach at all, but it does not overturn a clear
 * lexical winner. The 2:1 ratio encodes the stated design — BM25 leads, dense
 * reranks — and is fixed BEFORE any evaluation, not fitted to a query set. Both
 * values are echoed in every result's `retrieval.params`.
 *
 * ## What it costs, measured
 *
 * This weighting is not free, and the eval harness says so. Over the frozen
 * query set (`.harness/fixtures/rag-eval`), against a real Qwen3-Embedding-0.6B
 * dense baseline:
 *
 *   identifier queries      dense nDCG@10 0.0297 -> hybrid 0.2460  (top-1: 0/15 -> 14/15)
 *   identifier-in-context   dense nDCG@10 0.0532 -> hybrid 0.2366  (top-1:  0/5  ->  5/5)
 *   paraphrase / semantic   dense nDCG@10 0.5288 -> hybrid 0.4475  (top-1: 10/13 ->  7/13)
 *
 * So dense retrieval NEVER once returned the right document first for an
 * identifier — it maps every `ADR-NNNN` into the same neighbourhood — and BM25
 * fixes that almost completely. The price is three paraphrase queries whose
 * correct answer BM25 noise pushes off the top. That trade is deliberate for a
 * corpus whose traffic is identifiers, and the numbers are reported rather than
 * tuned away: re-weighting after seeing them would make the eval a fit instead
 * of a measurement. If the traffic mix ever changes, the weights are the knob —
 * and re-recording the baseline is what makes the new trade visible.
 */
export const DEFAULT_LEXICAL_WEIGHT = 2;
export const DEFAULT_DENSE_WEIGHT = 1;

/**
 * How many candidates the lexical STORE is asked for, relative to the pool BM25
 * keeps.
 *
 * A store-side prefilter has to cap what it materializes, and that cap is
 * applied before BM25 has scored anything — so if it were equal to the pool, the
 * store's own cheap ordering would effectively become the ranking. Asking for
 * five times the pool means BM25 chooses its top-100 out of ~500 rows the store
 * considered plausible, rather than out of exactly the 100 the store liked most.
 *
 * An in-memory index ignores this: it has the whole corpus already and truncating
 * before scoring would only lose recall for nothing.
 */
export const LEXICAL_CANDIDATE_OVERSAMPLE = 5;

export interface HybridKnowledgeConfig {
  /** Lexical (BM25) seam — the primary recall path. Required. */
  readonly lexical: ILexicalIndexPort;
  /**
   * Dense seam. Optional: with no dense port the adapter is honest pure-BM25
   * retrieval rather than pretending to be hybrid.
   */
  readonly dense?: IKnowledgePort;
  readonly bm25Params?: Bm25Params;
  readonly rrfK?: number;
  readonly lexicalPool?: number;
  readonly densePool?: number;
  readonly lexicalWeight?: number;
  readonly denseWeight?: number;
  readonly defaultMaxResults?: number;
  /**
   * Called when the dense side throws and the adapter degrades to pure BM25.
   * Injected rather than logged directly so the adapter keeps no logger
   * dependency (hexagonal edge).
   */
  readonly onDenseFailure?: (error: unknown) => void;
}

/** Extra diagnostics a hybrid run exposes beyond the port contract. */
export interface HybridRetrievalTrace {
  readonly mode: 'hybrid' | 'lexical-only';
  readonly lexicalCandidates: number;
  readonly denseCandidates: number;
  readonly terms: readonly string[];
  readonly degradedTo?: 'bm25';
  readonly params: {
    readonly k1: number;
    readonly b: number;
    readonly rrfK: number;
    readonly lexicalPool: number;
    readonly densePool: number;
    readonly lexicalWeight: number;
    readonly denseWeight: number;
  };
}

export interface HybridKnowledgeResult extends KnowledgeResult {
  readonly retrieval: HybridRetrievalTrace;
}

export class HybridKnowledgeAdapter implements IKnowledgePort {
  private readonly lexical: ILexicalIndexPort;
  private readonly dense?: IKnowledgePort;
  private readonly bm25Params: Bm25Params;
  private readonly rrfK: number;
  private readonly lexicalPool: number;
  private readonly densePool: number;
  private readonly lexicalWeight: number;
  private readonly denseWeight: number;
  private readonly defaultMaxResults: number;
  private readonly onDenseFailure?: (error: unknown) => void;

  constructor(config: HybridKnowledgeConfig) {
    if (!config.lexical) {
      throw new Error(
        '[hybrid-knowledge] a lexical index is required — BM25 is the primary recall path, not an add-on.',
      );
    }
    this.lexical = config.lexical;
    this.dense = config.dense;
    this.bm25Params = config.bm25Params ?? DEFAULT_BM25_PARAMS;
    this.rrfK = config.rrfK ?? DEFAULT_RRF_K;
    this.lexicalPool = config.lexicalPool ?? DEFAULT_LEXICAL_POOL;
    this.densePool = config.densePool ?? DEFAULT_DENSE_POOL;
    this.lexicalWeight = config.lexicalWeight ?? DEFAULT_LEXICAL_WEIGHT;
    this.denseWeight = config.denseWeight ?? DEFAULT_DENSE_WEIGHT;
    this.defaultMaxResults = config.defaultMaxResults ?? 10;
    this.onDenseFailure = config.onDenseFailure;
  }

  async query(request: KnowledgeQuery): Promise<HybridKnowledgeResult> {
    const maxResults = request.maxResults ?? this.defaultMaxResults;
    const terms = queryTerms(request.query);

    // ---- 1. BM25 first. Primary recall path; a failure here propagates.
    const lexicalSet = await this.lexical.candidates({
      terms,
      limit: this.lexicalPool * LEXICAL_CANDIDATE_OVERSAMPLE,
      filters: {
        language: request.language,
        adrPrefix: request.adrPrefix,
        sourcePrefix: request.sourcePrefix,
      },
    });

    const byId = new Map<string, KnowledgeChunk>();
    const bm25Candidates: Bm25Candidate[] = [];
    for (const candidate of lexicalSet.candidates) {
      byId.set(candidate.chunk.chunkId, candidate.chunk);
      bm25Candidates.push({ id: candidate.chunk.chunkId, terms: candidate.terms });
    }
    const lexicalHits = rankBm25(terms, bm25Candidates, lexicalSet.stats, this.bm25Params).slice(
      0,
      this.lexicalPool,
    );

    // ---- 2. Dense reranker. Fail-soft: degrade to pure BM25, never silently
    //         to dense-only.
    let denseIds: string[] = [];
    let degraded = false;
    if (this.dense) {
      try {
        const denseResult = await this.dense.query({ ...request, maxResults: this.densePool });
        for (const chunk of denseResult.chunks) {
          if (!byId.has(chunk.chunkId)) byId.set(chunk.chunkId, chunk);
          denseIds.push(chunk.chunkId);
        }
      } catch (error) {
        degraded = true;
        denseIds = [];
        this.onDenseFailure?.(error);
      }
    }

    // ---- 3. Fuse on rank.
    const fused = reciprocalRankFusion(
      [
        { name: 'bm25', ids: lexicalHits.map((h) => h.id), weight: this.lexicalWeight },
        { name: 'dense', ids: denseIds, weight: this.denseWeight },
      ],
      this.rrfK,
    );

    const chunks: KnowledgeChunk[] = [];
    for (const hit of fused) {
      if (chunks.length >= maxResults) break;
      const base = byId.get(hit.id);
      // Every fused id came from one of the two lists, both of which populate
      // `byId` — but a dense adapter that returned an id without a chunk would
      // otherwise yield a hollow result carrying a score and no citation, which
      // is the single worst thing to hand an agent. Skip it instead.
      if (!base) continue;
      chunks.push({
        ...base,
        score: hit.score,
        retrievedBy: Object.keys(hit.ranks).sort(),
        lexicalRank: hit.ranks.bm25,
        denseRank: hit.ranks.dense,
      });
    }

    const mode: HybridRetrievalTrace['mode'] =
      this.dense && !degraded ? 'hybrid' : 'lexical-only';

    return {
      chunks,
      totalChunks: lexicalSet.stats.corpusSize,
      query: request.query,
      retrieval: {
        mode,
        lexicalCandidates: lexicalHits.length,
        denseCandidates: denseIds.length,
        terms,
        ...(degraded ? { degradedTo: 'bm25' as const } : {}),
        params: {
          k1: this.bm25Params.k1,
          b: this.bm25Params.b,
          rrfK: this.rrfK,
          lexicalPool: this.lexicalPool,
          densePool: this.densePool,
          lexicalWeight: this.lexicalWeight,
          denseWeight: this.denseWeight,
        },
      },
    };
  }

  /**
   * Document lookup is a metadata read, not a ranking problem: it delegates to
   * the dense adapter when one is wired (it owns the durable store), otherwise
   * it is unavailable rather than faked.
   */
  async getDocument(sourceFile: string): Promise<KnowledgeDocument | undefined> {
    if (!this.dense) return undefined;
    return this.dense.getDocument(sourceFile);
  }

  async corpusSize(): Promise<number> {
    return this.lexical.corpusSize();
  }
}
