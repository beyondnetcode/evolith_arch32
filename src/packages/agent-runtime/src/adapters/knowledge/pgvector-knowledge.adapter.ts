import type {
  IKnowledgePort,
  KnowledgeQuery,
  KnowledgeResult,
  KnowledgeDocument,
  KnowledgeChunk,
} from '../../domain/ports/knowledge.port';

/**
 * GT-540 / ADR-0090 / ADR-0112 — Production `IKnowledgePort` retrieval adapter.
 *
 * The RUNTIME READ-SIDE of the RAG stack. It runs a cosine top-k search over
 * the durable pgvector index created by the write-side (GT-538: `rag_chunks`,
 * `embedding vector(1024)`, HNSW `vector_cosine_ops`) and returns ranked,
 * fully-cited `KnowledgeChunk[]` so agents can ground recommendations over the
 * ADR/ruleset corpus instead of the token-overlap `InMemoryKnowledgeAdapter`.
 *
 * Hexagonal edges — nothing here is hard-wired:
 *
 *   1. EMBEDDING is an INJECTED seam (`EmbedQuery`): `(text) => Promise<number[]>`.
 *      The adapter never picks a model — production wires GT-539's Qwen3 sidecar
 *      embedder, tests inject a deterministic stub. The port stays model-agnostic
 *      (ADR-0090 §3). The returned vector MUST be exactly `EXPECTED_DIM` (1024,
 *      ADR-0112 §2) — a mismatch is not cosine-comparable with the store, so the
 *      adapter FAILS CLOSED rather than returning meaningless rankings.
 *
 *   2. The database CLIENT is an INJECTED node-postgres-shaped seam
 *      (`{ query(text, params) }`). There is NO compile-time `pg` dependency:
 *      only a real run with no injected client lazy-imports `pg` (`await import`)
 *      and builds a Pool from `config.connectionString` / env. Tests inject a
 *      minimal fake client and never touch a live Postgres.
 *
 * Retrieval SQL uses the pgvector cosine-distance operator `<=>`; the similarity
 * `score` is `1 - distance` in [0,1]. Metadata filters (ADR-0090 §2:
 * language / adr_id / source_file / corpus_version) are plain parameterized
 * WHERE clauses over the first-class columns.
 *
 * The live pgvector + live Qwen3 sidecar run is DEPLOY-GATED (needs Postgres +
 * the on-perimeter inference sidecar); this adapter is the code path that runs
 * once those are provisioned.
 */

/** ADR-0112 §2 — the pgvector column is `vector(1024)`; enforced fail-closed. */
export const EXPECTED_DIM = 1024;

/** Chunk table name — matches the GT-538 DDL (`rag-pgvector.schema.sql`). */
export const RAG_CHUNKS_TABLE = 'rag_chunks';

/**
 * Injected embedding seam. Embeds a single query string into a dense vector at
 * the store dimension. Production wires GT-539's Qwen3 sidecar embedder; tests
 * inject a deterministic stub. Model choice lives at the wiring edge, never here.
 */
export type EmbedQuery = (text: string) => Promise<number[]>;

/** Minimal node-postgres-shaped client seam (no compile-time `pg` dependency). */
export interface PgClientLike {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: PgChunkRow[] }>;
}

/** Shape of a `rag_chunks` row plus the computed `score` column. */
interface PgChunkRow {
  id: string;
  content: string | null;
  section_heading: string | null;
  char_start: number | null;
  char_end: number | null;
  source_file: string;
  adr_id: string | null;
  language: string;
  corpus_version: string;
  score?: number | string | null;
}

export interface PgVectorKnowledgeConfig {
  /** Injected query embedder (required — the port is model-agnostic). */
  readonly embed: EmbedQuery;
  /**
   * Injected node-postgres-shaped client. When omitted, the adapter lazy-imports
   * `pg` at first use and builds a Pool from `connectionString` / env.
   */
  readonly client?: PgClientLike;
  /** Postgres connection string used only when no `client` is injected. */
  readonly connectionString?: string;
  /**
   * Optional corpus-version pin. When set, every read is scoped to this corpus
   * release (`corpus_version = $n`) so a deployment retrieves against exactly the
   * index snapshot it was built for (ADR-0090 §2 / ADR-0112 §1).
   */
  readonly corpusVersion?: string;
  /** Default result count when a query omits `maxResults`. */
  readonly defaultMaxResults?: number;
}

/** pgvector text literal for a numeric vector: `[0.1,0.2,...]`. */
function toVectorLiteral(vec: readonly number[]): string {
  return `[${vec.join(',')}]`;
}

function estimateTokens(text: string): number {
  // Coarse ~4 chars/token estimate; the port field is documented as an estimate.
  return Math.max(1, Math.ceil(text.length / 4));
}

function rowToChunk(row: PgChunkRow): KnowledgeChunk {
  const text = row.content ?? '';
  const rawScore = row.score;
  const score =
    rawScore === null || rawScore === undefined ? undefined : Number(rawScore);
  return {
    chunkId: row.id,
    sourceFile: row.source_file,
    sectionHeading: row.section_heading ?? '',
    adrId: row.adr_id ?? null,
    language: row.language,
    tokenEstimate: estimateTokens(text),
    textPreview: text.slice(0, 120),
    text,
    score,
    charStart: row.char_start ?? undefined,
    charEnd: row.char_end ?? undefined,
    corpusVersion: row.corpus_version, // GT-541: cite the exact indexed corpus release
  };
}

export class PgVectorKnowledgeAdapter implements IKnowledgePort {
  private readonly embed: EmbedQuery;
  private readonly corpusVersion?: string;
  private readonly defaultMaxResults: number;
  private readonly injectedClient?: PgClientLike;
  private readonly connectionString?: string;
  private clientPromise: Promise<PgClientLike> | null = null;

  constructor(config: PgVectorKnowledgeConfig) {
    if (typeof config.embed !== 'function') {
      throw new Error(
        '[pgvector-knowledge] an `embed` seam is required — inject GT-539 Qwen3 (prod) or a stub (tests).',
      );
    }
    this.embed = config.embed;
    this.injectedClient = config.client;
    this.connectionString = config.connectionString;
    this.corpusVersion = config.corpusVersion;
    this.defaultMaxResults = config.defaultMaxResults ?? 10;
  }

  /** Resolve the db client — injected wins; otherwise lazy-import `pg` once. */
  private getClient(): Promise<PgClientLike> {
    if (this.injectedClient) return Promise.resolve(this.injectedClient);
    if (!this.clientPromise) this.clientPromise = this.buildPgClient();
    return this.clientPromise;
  }

  private async buildPgClient(): Promise<PgClientLike> {
    const connectionString =
      this.connectionString ??
      process.env.EVOLITH_RAG_PG_URL ??
      process.env.DATABASE_URL;
    // Lazy — `pg` is never imported at module load, keeping the offline/test
    // default free of a native dependency (design rule #5).
    const pg: any = await import('pg');
    const Pool = pg.default?.Pool ?? pg.Pool;
    if (typeof Pool !== 'function') {
      throw new Error('[pgvector-knowledge] could not resolve a pg Pool constructor');
    }
    return new Pool(connectionString ? { connectionString } : {}) as PgClientLike;
  }

  /** Embed the query text and assert the store dimension (fail closed). */
  private async embedQuery(text: string): Promise<number[]> {
    const vec = await this.embed(text);
    if (!Array.isArray(vec) || vec.length !== EXPECTED_DIM) {
      throw new Error(
        `[pgvector-knowledge] query embedding dimension ${
          Array.isArray(vec) ? vec.length : typeof vec
        } != store dim ${EXPECTED_DIM} (ADR-0112 §2 — fail closed).`,
      );
    }
    return vec;
  }

  async query(request: KnowledgeQuery): Promise<KnowledgeResult> {
    const maxResults = request.maxResults ?? this.defaultMaxResults;
    const vec = await this.embedQuery(request.query);

    // $1 is always the query vector; filter values follow, LIMIT is last.
    const params: unknown[] = [toVectorLiteral(vec)];
    const where: string[] = [];

    if (request.language) {
      params.push(request.language);
      where.push(`language = $${params.length}`);
    }
    if (request.adrPrefix) {
      params.push(`${request.adrPrefix}%`);
      where.push(`adr_id LIKE $${params.length}`);
    }
    if (request.sourcePrefix) {
      params.push(`${request.sourcePrefix}%`);
      where.push(`source_file LIKE $${params.length}`);
    }
    if (this.corpusVersion) {
      params.push(this.corpusVersion);
      where.push(`corpus_version = $${params.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    params.push(maxResults);
    const limitPlaceholder = `$${params.length}`;

    // Cosine distance operator `<=>` (HNSW vector_cosine_ops); score = 1 - dist.
    const sql =
      `SELECT id, content, section_heading, char_start, char_end, source_file, ` +
      `adr_id, language, corpus_version, ` +
      `1 - (embedding <=> $1::vector) AS score ` +
      `FROM ${RAG_CHUNKS_TABLE} ` +
      `${whereSql} ` +
      `ORDER BY embedding <=> $1::vector ASC ` +
      `LIMIT ${limitPlaceholder}`;

    const client = await this.getClient();
    const { rows } = await client.query(sql, params);
    const chunks = rows.map(rowToChunk);

    return {
      chunks,
      totalChunks: await this.corpusSize(),
      query: request.query,
    };
  }

  async getDocument(sourceFile: string): Promise<KnowledgeDocument | undefined> {
    const params: unknown[] = [sourceFile];
    let corpusClause = '';
    if (this.corpusVersion) {
      params.push(this.corpusVersion);
      corpusClause = ` AND corpus_version = $${params.length}`;
    }
    const sql =
      `SELECT id, content, section_heading, char_start, char_end, source_file, ` +
      `adr_id, language, corpus_version ` +
      `FROM ${RAG_CHUNKS_TABLE} ` +
      `WHERE source_file = $1${corpusClause} ` +
      `ORDER BY char_start ASC NULLS FIRST`;

    const client = await this.getClient();
    const { rows } = await client.query(sql, params);
    if (rows.length === 0) return undefined;

    const chunks = rows.map(rowToChunk);
    return {
      sourceFile,
      chunks,
      metadata: {
        adrId: chunks[0].adrId ?? undefined,
        language: chunks[0].language,
      },
    };
  }

  async corpusSize(): Promise<number> {
    const params: unknown[] = [];
    let whereSql = '';
    if (this.corpusVersion) {
      params.push(this.corpusVersion);
      whereSql = ` WHERE corpus_version = $1`;
    }
    const client = await this.getClient();
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM ${RAG_CHUNKS_TABLE}${whereSql}`,
      params,
    );
    const n = (rows[0] as unknown as { n?: number } | undefined)?.n;
    return typeof n === 'number' ? n : Number(n ?? 0);
  }
}
