import {
  PgVectorKnowledgeAdapter,
  EXPECTED_DIM,
  type PgClientLike,
  type EmbedQuery,
} from './pgvector-knowledge.adapter';

/** Deterministic 1024-dim stub embedder — no sidecar, no network. */
const stubEmbed: EmbedQuery = async (text: string) => {
  const vec = new Array<number>(EXPECTED_DIM).fill(0);
  // Cheap, deterministic fill so different queries differ (not semantic).
  for (let i = 0; i < text.length; i++) {
    vec[i % EXPECTED_DIM] += text.charCodeAt(i) / 255;
  }
  return vec;
};

/** Records every SQL + params, returns a scripted set of rows. */
function makeClient(rows: any[]): {
  client: PgClientLike;
  calls: Array<{ text: string; params: readonly unknown[] }>;
} {
  const calls: Array<{ text: string; params: readonly unknown[] }> = [];
  const client: PgClientLike = {
    async query(text: string, params: readonly unknown[] = []) {
      calls.push({ text, params });
      // corpusSize() issues a count(*) query — answer it distinctly.
      if (/count\(\*\)/i.test(text)) {
        return { rows: [{ n: rows.length }] as any };
      }
      return { rows: rows as any };
    },
  };
  return { client, calls };
}

const ROW_A = {
  id: 'chunk-a',
  content: 'ADR-0112 fixes the RAG embedding model to Qwen3 at dimension 1024.',
  section_heading: 'ADR-0112 Embedding Platform',
  char_start: 40,
  char_end: 210,
  source_file: 'reference/core/architecture/adrs/core/0112-rag-embedding.md',
  adr_id: 'ADR-0112',
  language: 'en',
  corpus_version: 'c-2026-07-13',
  score: 0.91,
};
const ROW_B = {
  id: 'chunk-b',
  content: 'The pgvector store uses cosine distance HNSW indexing.',
  section_heading: 'Vector Store',
  char_start: 0,
  char_end: 54,
  source_file: 'reference/core/architecture/adrs/core/0112-rag-embedding.md',
  adr_id: 'ADR-0112',
  language: 'en',
  corpus_version: 'c-2026-07-13',
  score: 0.77,
};

describe('PgVectorKnowledgeAdapter (GT-540)', () => {
  it('embeds the query, runs the cosine SQL and maps rows to ranked cited chunks', async () => {
    const { client, calls } = makeClient([ROW_A, ROW_B]);
    const adapter = new PgVectorKnowledgeAdapter({ embed: stubEmbed, client });

    const result = await adapter.query({ query: 'embedding model dimension' });

    // Result contract: ranked chunks with score + citation metadata.
    expect(result.chunks).toHaveLength(2);
    expect(result.query).toBe('embedding model dimension');
    const first = result.chunks[0];
    expect(first.chunkId).toBe('chunk-a');
    expect(first.score).toBeCloseTo(0.91);
    expect(first.sourceFile).toBe(ROW_A.source_file);
    expect(first.adrId).toBe('ADR-0112');
    expect(first.sectionHeading).toBe('ADR-0112 Embedding Platform');
    expect(first.charStart).toBe(40);
    expect(first.charEnd).toBe(210);
    expect(first.textPreview).toBe(ROW_A.content.slice(0, 120));
    expect(first.tokenEstimate).toBeGreaterThan(0);

    // The retrieval SQL used the pgvector cosine operator and `1 - distance`.
    const searchCall = calls.find(c => c.text.includes('<=>'))!;
    expect(searchCall).toBeDefined();
    expect(searchCall.text).toContain('embedding <=> $1::vector');
    expect(searchCall.text).toContain('1 - (embedding <=> $1::vector) AS score');
    expect(searchCall.text).toContain('ORDER BY embedding <=> $1::vector');
    expect(searchCall.text).toContain('FROM rag_chunks');
    // $1 is the vector literal at the store dimension.
    const vecLiteral = searchCall.params[0] as string;
    expect(vecLiteral.startsWith('[')).toBe(true);
    expect(vecLiteral.split(',')).toHaveLength(EXPECTED_DIM);
  });

  it('translates metadata filters into a parameterized WHERE', async () => {
    const { client, calls } = makeClient([ROW_A]);
    const adapter = new PgVectorKnowledgeAdapter({ embed: stubEmbed, client });

    await adapter.query({
      query: 'q',
      language: 'en',
      adrPrefix: 'ADR-0112',
      sourcePrefix: 'reference/core',
      maxResults: 3,
    });

    const searchCall = calls.find(c => c.text.includes('<=>'))!;
    expect(searchCall.text).toContain('WHERE');
    expect(searchCall.text).toContain('language = $2');
    expect(searchCall.text).toContain('adr_id LIKE $3');
    expect(searchCall.text).toContain('source_file LIKE $4');
    expect(searchCall.text).toContain('LIMIT $5');
    // Params carry the actual values (prefixes get a % wildcard).
    expect(searchCall.params[1]).toBe('en');
    expect(searchCall.params[2]).toBe('ADR-0112%');
    expect(searchCall.params[3]).toBe('reference/core%');
    expect(searchCall.params[4]).toBe(3);
  });

  it('scopes reads to a pinned corpus_version when configured', async () => {
    const { client, calls } = makeClient([ROW_A]);
    const adapter = new PgVectorKnowledgeAdapter({
      embed: stubEmbed,
      client,
      corpusVersion: 'c-2026-07-13',
    });

    await adapter.query({ query: 'q' });

    const searchCall = calls.find(c => c.text.includes('<=>'))!;
    expect(searchCall.text).toContain('corpus_version = $2');
    expect(searchCall.params[1]).toBe('c-2026-07-13');
  });

  it('fails closed when the embedder returns a wrong-dimension vector', async () => {
    const { client } = makeClient([ROW_A]);
    const badEmbed: EmbedQuery = async () => new Array(512).fill(0.1);
    const adapter = new PgVectorKnowledgeAdapter({ embed: badEmbed, client });

    await expect(adapter.query({ query: 'q' })).rejects.toThrow(/!= store dim 1024/);
  });

  it('rejects construction without an embed seam', () => {
    expect(
      () => new PgVectorKnowledgeAdapter({ embed: undefined as unknown as EmbedQuery, client: makeClient([]).client }),
    ).toThrow(/embed/);
  });

  it('getDocument returns ordered chunks with document metadata', async () => {
    const { client, calls } = makeClient([ROW_B, ROW_A]);
    const adapter = new PgVectorKnowledgeAdapter({ embed: stubEmbed, client });

    const doc = await adapter.getDocument(ROW_A.source_file);
    expect(doc).toBeDefined();
    expect(doc!.sourceFile).toBe(ROW_A.source_file);
    expect(doc!.chunks).toHaveLength(2);
    expect(doc!.metadata.adrId).toBe('ADR-0112');
    expect(doc!.metadata.language).toBe('en');
    const docCall = calls[0];
    expect(docCall.text).toContain('WHERE source_file = $1');
    expect(docCall.text).toContain('ORDER BY char_start');
    expect(docCall.params[0]).toBe(ROW_A.source_file);
  });

  it('getDocument returns undefined when no rows match', async () => {
    const { client } = makeClient([]);
    const adapter = new PgVectorKnowledgeAdapter({ embed: stubEmbed, client });
    const doc = await adapter.getDocument('nope.md');
    expect(doc).toBeUndefined();
  });

  it('corpusSize returns the count(*) result', async () => {
    const { client } = makeClient([ROW_A, ROW_B]);
    const adapter = new PgVectorKnowledgeAdapter({ embed: stubEmbed, client });
    expect(await adapter.corpusSize()).toBe(2);
  });
});
