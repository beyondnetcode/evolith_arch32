/**
 * GT-592 — Postgres {@link ILexicalIndexPort} over the GT-538 `rag_chunks` table.
 *
 * Postgres does the RECALL, the domain does the RANKING. The generated
 * `content_tsv` column plus its GIN index answer "which chunks contain any of
 * these terms" in one indexed scan; BM25 in `domain/retrieval/bm25.ts` then
 * ranks them. `ts_rank_cd` is deliberately not used — it is not BM25, and
 * scoring in SQL would fork the ranking so the CI eval and production would be
 * measuring two different functions.
 *
 * Document frequency is read with one lateral subquery per term against the
 * same GIN index, so IDF is computed over the WHOLE corpus rather than over the
 * candidate set. That distinction is the entire point: IDF derived from the
 * candidates would make every retrieved term look equally rare and erase the
 * identifier advantage.
 *
 * The tokenizer bridge: `plainto_tsquery('simple', term)` is used for the SQL
 * side. `simple` does no stemming and no stop-word removal, which is what keeps
 * `adr-0111` reachable; the domain tokenizer additionally emits sub-tokens, and
 * those are matched by the same mechanism because Postgres's default parser also
 * splits hyphenated words into their parts.
 *
 * Same hexagonal edges as the GT-540 dense adapter: the db client is an INJECTED
 * node-postgres-shaped seam and `pg` is only lazy-imported on a real run.
 */

import type {
  ILexicalIndexPort,
  LexicalCandidate,
  LexicalCandidateRequest,
  LexicalCandidateSet,
} from '../../domain/ports/lexical-index.port';
import type { KnowledgeChunk } from '../../domain/ports/knowledge.port';
import type { Bm25CorpusStats } from '../../domain/retrieval/bm25';
import { termFrequencies } from '../../domain/retrieval/tokenize';
import { RAG_CHUNKS_TABLE, type PgClientLike } from './pgvector-knowledge.adapter';

export interface PgLexicalIndexConfig {
  /** Injected node-postgres-shaped client; omitted means lazy-import `pg`. */
  readonly client?: PgClientLike;
  readonly connectionString?: string;
  /** Optional corpus-release pin, matching the dense adapter (ADR-0090 §2). */
  readonly corpusVersion?: string;
}

interface LexicalRow {
  id: string;
  content: string | null;
  section_heading: string | null;
  char_start: number | null;
  char_end: number | null;
  source_file: string;
  adr_id: string | null;
  language: string;
  corpus_version: string;
}

function rowToChunk(row: LexicalRow): KnowledgeChunk {
  const text = row.content ?? '';
  return {
    chunkId: row.id,
    sourceFile: row.source_file,
    sectionHeading: row.section_heading ?? '',
    adrId: row.adr_id ?? null,
    language: row.language,
    tokenEstimate: Math.max(1, Math.ceil(text.length / 4)),
    textPreview: text.slice(0, Number(process.env.KNOWLEDGE_TEXT_PREVIEW_LENGTH) || 120),
    text,
    charStart: row.char_start ?? undefined,
    charEnd: row.char_end ?? undefined,
    corpusVersion: row.corpus_version,
  };
}

export class PgLexicalIndexAdapter implements ILexicalIndexPort {
  private readonly injectedClient?: PgClientLike;
  private readonly connectionString?: string;
  private readonly corpusVersion?: string;
  private clientPromise: Promise<PgClientLike> | null = null;

  constructor(config: PgLexicalIndexConfig = {}) {
    this.injectedClient = config.client;
    this.connectionString = config.connectionString;
    this.corpusVersion = config.corpusVersion;
  }

  private getClient(): Promise<PgClientLike> {
    if (this.injectedClient) return Promise.resolve(this.injectedClient);
    if (!this.clientPromise) this.clientPromise = this.buildPgClient();
    return this.clientPromise;
  }

  private async buildPgClient(): Promise<PgClientLike> {
    const connectionString =
      this.connectionString ?? process.env.EVOLITH_RAG_PG_URL ?? process.env.DATABASE_URL;
    const pg: any = await import('pg');
    const Pool = pg.default?.Pool ?? pg.Pool;
    if (typeof Pool !== 'function') {
      throw new Error('[pg-lexical-index] could not resolve a pg Pool constructor');
    }
    return new Pool(connectionString ? { connectionString } : {}) as PgClientLike;
  }

  async corpusSize(): Promise<number> {
    const params: unknown[] = [];
    let whereSql = '';
    if (this.corpusVersion) {
      params.push(this.corpusVersion);
      whereSql = ' WHERE corpus_version = $1';
    }
    const client = await this.getClient();
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM ${RAG_CHUNKS_TABLE}${whereSql}`,
      params,
    );
    const n = (rows[0] as unknown as { n?: number } | undefined)?.n;
    return typeof n === 'number' ? n : Number(n ?? 0);
  }

  async candidates(request: LexicalCandidateRequest): Promise<LexicalCandidateSet> {
    const terms = [...request.terms];
    const stats = await this.corpusStats(terms);
    if (terms.length === 0) return { candidates: [], stats };

    const client = await this.getClient();

    // Recall: any chunk whose tsvector matches ANY query term. One GIN scan.
    //
    // The terms are OR-ed into a single tsquery server-side. `quote_literal`
    // makes each term one exact lexeme rather than re-parsing it — the terms
    // arrive already normalized by the shared tokenizer (`[a-z0-9]+` only), and
    // re-parsing would reintroduce the very split the normalization removed.
    const params: unknown[] = [terms];
    const tsquery = `(SELECT string_agg(quote_literal(t), ' | ') FROM unnest($1::text[]) AS t)::tsquery`;
    const where: string[] = [`content_tsv @@ ${tsquery}`];

    if (request.filters?.language) {
      params.push(request.filters.language);
      where.push(`language = $${params.length}`);
    }
    if (request.filters?.adrPrefix) {
      params.push(`${request.filters.adrPrefix}%`);
      where.push(`adr_id LIKE $${params.length}`);
    }
    if (request.filters?.sourcePrefix) {
      params.push(`${request.filters.sourcePrefix}%`);
      where.push(`source_file LIKE $${params.length}`);
    }
    if (this.corpusVersion) {
      params.push(this.corpusVersion);
      where.push(`corpus_version = $${params.length}`);
    }
    params.push(request.limit);

    // ORDERING THE PREFILTER IS NOT SCORING IT.
    //
    // The candidate set has to be truncated somewhere — a term as common as `adr`
    // matches most of this corpus. Truncating in `id` order would be a silent
    // recall bug: for `ADR-0034` the database would hand back the first N chunks
    // alphabetically and the chunk that actually owns the identifier might never
    // reach BM25 at all.
    //
    // So the prefilter is ordered by `ts_rank_cd`, which measures how densely the
    // query lexemes cluster in the document. It decides ONLY which rows are
    // materialized; the ranking that is returned to the caller is computed by
    // BM25 in `domain/retrieval/bm25.ts` over these rows. `ts_rank_cd` is not
    // BM25 and is never allowed to become the answer — using it to rank would
    // fork the ranking so the CI eval and production measured different
    // functions. `id` breaks ties so a truncated set is deterministic.
    const sql =
      `SELECT id, content, section_heading, char_start, char_end, source_file, ` +
      `adr_id, language, corpus_version ` +
      `FROM ${RAG_CHUNKS_TABLE} ` +
      `WHERE ${where.join(' AND ')} ` +
      `ORDER BY ts_rank_cd(content_tsv, ${tsquery}) DESC, id ASC ` +
      `LIMIT $${params.length}`;

    const { rows } = await client.query(sql, params);
    const candidates: LexicalCandidate[] = (rows as unknown as LexicalRow[]).map((row) => {
      const chunk = rowToChunk(row);
      return {
        chunk,
        terms: termFrequencies(`${chunk.sectionHeading} ${chunk.text}`),
      };
    });

    return { candidates, stats };
  }

  /**
   * Corpus size, mean document length, and per-term document frequency — all
   * measured over the whole corpus, never over the candidate set.
   *
   * `avg_len` is the mean CHARACTER length of exactly the text the tokenizer
   * indexes (`section_heading || ' ' || content`), which is the same unit
   * `TermFrequencies.length` reports. Both ends of BM25's `dl / avgdl` are
   * therefore exact measurements of the same quantity — no estimated
   * chars-per-token constant sits between them.
   */
  private async corpusStats(terms: readonly string[]): Promise<Bm25CorpusStats> {
    const client = await this.getClient();
    const params: unknown[] = [terms];
    let corpusClause = '';
    if (this.corpusVersion) {
      params.push(this.corpusVersion);
      corpusClause = ` WHERE corpus_version = $${params.length}`;
    }

    const sql =
      `SELECT ` +
      `(SELECT count(*)::int FROM ${RAG_CHUNKS_TABLE}${corpusClause}) AS corpus_size, ` +
      `(SELECT coalesce(avg(length(coalesce(section_heading,'') || ' ' || coalesce(content,''))), 0)::float ` +
      `   FROM ${RAG_CHUNKS_TABLE}${corpusClause}) AS avg_chars, ` +
      `(SELECT coalesce(json_object_agg(t.term, t.df), '{}'::json) FROM (` +
      `  SELECT term, (SELECT count(*)::int FROM ${RAG_CHUNKS_TABLE} r ` +
      `    WHERE r.content_tsv @@ quote_literal(term)::tsquery` +
      (this.corpusVersion ? ` AND r.corpus_version = $${params.length}` : '') +
      `  ) AS df FROM unnest($1::text[]) AS term` +
      `) t) AS doc_freq`;

    const { rows } = await client.query(sql, params);
    const row = rows[0] as unknown as
      | { corpus_size?: number; avg_chars?: number | string; doc_freq?: Record<string, number> }
      | undefined;

    const documentFrequency = new Map<string, number>();
    for (const [term, df] of Object.entries(row?.doc_freq ?? {})) {
      documentFrequency.set(term, Number(df));
    }

    return {
      corpusSize: Number(row?.corpus_size ?? 0),
      averageDocumentLength: Number(row?.avg_chars ?? 0),
      documentFrequency,
    };
  }
}
