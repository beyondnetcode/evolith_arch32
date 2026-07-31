import { HybridKnowledgeAdapter } from './hybrid-knowledge.adapter';
import { InMemoryLexicalIndexAdapter } from './in-memory-lexical-index.adapter';
import { VectorMemoryKnowledgeAdapter } from './vector-memory-knowledge.adapter';
import type { KnowledgeChunk } from '../../domain/ports/knowledge.port';
import type { IKnowledgePort } from '../../domain/ports/knowledge.port';

function chunk(id: string, sourceFile: string, heading: string, text: string): KnowledgeChunk {
  return {
    chunkId: id,
    sourceFile,
    sectionHeading: heading,
    adrId: /(\d{4})-/.exec(sourceFile)?.[1] ?? null,
    language: 'en',
    tokenEstimate: Math.ceil(text.length / 4),
    textPreview: text.slice(0, 120),
    text,
  };
}

const CORPUS: KnowledgeChunk[] = [
  chunk('c1', 'adrs/0111-port-seam.md', 'ADR-0111: Port Seam', 'ADR-0111 defines the port seam and its evaluation boundary.'),
  chunk('c2', 'adrs/0112-embeddings.md', 'ADR-0112: Embeddings', 'ADR-0112 pins the embedding model and the vector dimension at 1024.'),
  chunk('c3', 'adrs/0090-knowledge.md', 'ADR-0090: Knowledge', 'Governed access to the corpus. Cites ADR-0111 and ADR-0112 in passing.'),
  chunk('c4', 'caching-strategy.md', 'Caching Strategy', 'Multi-layer distributed memoisation across the request path.'),
];

function lexicalIndex(): InMemoryLexicalIndexAdapter {
  const lexical = new InMemoryLexicalIndexAdapter();
  lexical.seed(CORPUS);
  return lexical;
}

/**
 * A dense port that ranks by a supplied order. Standing in for the embedding
 * model lets these tests assert the COMPOSITION — which is what this adapter is
 * — without asserting anything about model quality, which is the eval harness's
 * job (`.harness/scripts/ci/rag-eval.mjs`) and is measured against the real model.
 */
function denseReturning(ids: string[]): IKnowledgePort {
  return {
    async query(request) {
      const chunks = ids
        .map((id) => CORPUS.find((c) => c.chunkId === id))
        .filter((c): c is KnowledgeChunk => Boolean(c))
        .slice(0, request.maxResults ?? 10);
      return { chunks, totalChunks: CORPUS.length, query: request.query };
    },
    async getDocument() {
      return undefined;
    },
    async corpusSize() {
      return CORPUS.length;
    },
  };
}

describe('HybridKnowledgeAdapter (GT-592)', () => {
  it('refuses to be constructed without a lexical index', () => {
    // BM25 is the primary recall path, not an optional enhancement; a "hybrid"
    // adapter with only a dense side is the dense-only retrieval this replaces.
    expect(() => new HybridKnowledgeAdapter({} as never)).toThrow(/lexical index is required/);
  });

  it('puts the owning document first for an exact identifier query', async () => {
    // The dense side is deliberately WRONG here (it ranks the caching ADR first,
    // which is what a cosine over "ADR-0111" plausibly does), and BM25 still
    // carries the answer to the top.
    const hybrid = new HybridKnowledgeAdapter({
      lexical: lexicalIndex(),
      dense: denseReturning(['c4', 'c3', 'c2', 'c1']),
    });
    const result = await hybrid.query({ query: 'ADR-0111' });
    expect(result.chunks[0].sourceFile).toBe('adrs/0111-port-seam.md');
  });

  it('labels each hit with the retrievers that surfaced it', async () => {
    const hybrid = new HybridKnowledgeAdapter({
      lexical: lexicalIndex(),
      dense: denseReturning(['c4']),
    });
    const result = await hybrid.query({ query: 'ADR-0111' });
    const owner = result.chunks.find((c) => c.chunkId === 'c1');
    const cachingOnly = result.chunks.find((c) => c.chunkId === 'c4');
    expect(owner?.retrievedBy).toEqual(['bm25']);
    expect(owner?.lexicalRank).toBe(1);
    expect(cachingOnly?.retrievedBy).toEqual(['dense']);
    expect(cachingOnly?.denseRank).toBe(1);
  });

  it('reaches a document sharing no term with the query, via the dense side', async () => {
    // The half BM25 cannot do. Without a dense list this query returns nothing.
    const hybrid = new HybridKnowledgeAdapter({
      lexical: lexicalIndex(),
      dense: denseReturning(['c4']),
    });
    const result = await hybrid.query({ query: 'memoisation tiers' });
    expect(result.chunks.map((c) => c.chunkId)).toContain('c4');
    expect(result.retrieval.mode).toBe('hybrid');
  });

  it('degrades to pure BM25 when the dense side throws, and says so', async () => {
    // Fail-soft on dense, because a lexical answer over this corpus is genuinely
    // useful; the alternative — returning nothing — loses the identifier queries
    // that work best without any model at all.
    const failures: unknown[] = [];
    const hybrid = new HybridKnowledgeAdapter({
      lexical: lexicalIndex(),
      dense: {
        async query() {
          throw new Error('sidecar unreachable');
        },
        async getDocument() {
          return undefined;
        },
        async corpusSize() {
          return 0;
        },
      },
      onDenseFailure: (e) => failures.push(e),
    });
    const result = await hybrid.query({ query: 'ADR-0111' });
    expect(result.retrieval.mode).toBe('lexical-only');
    expect(result.retrieval.degradedTo).toBe('bm25');
    expect(result.chunks[0].chunkId).toBe('c1');
    expect(failures).toHaveLength(1);
  });

  it('propagates a LEXICAL failure instead of degrading', async () => {
    // Degrading here would silently produce the dense-only ranking GT-592 exists
    // to replace — a regression that looks exactly like success.
    const hybrid = new HybridKnowledgeAdapter({
      lexical: {
        async candidates() {
          throw new Error('index unavailable');
        },
        async corpusSize() {
          return 0;
        },
      },
      dense: denseReturning(['c1']),
    });
    await expect(hybrid.query({ query: 'ADR-0111' })).rejects.toThrow(/index unavailable/);
  });

  it('is honest pure-BM25 when no dense port is wired', async () => {
    const hybrid = new HybridKnowledgeAdapter({ lexical: lexicalIndex() });
    const result = await hybrid.query({ query: 'ADR-0112' });
    expect(result.retrieval.mode).toBe('lexical-only');
    expect(result.retrieval.degradedTo).toBeUndefined();
    expect(result.chunks[0].chunkId).toBe('c2');
  });

  it('honours metadata filters on the lexical side', async () => {
    const hybrid = new HybridKnowledgeAdapter({ lexical: lexicalIndex() });
    const result = await hybrid.query({ query: 'ADR-0111', sourcePrefix: 'adrs/0090' });
    expect(result.chunks.every((c) => c.sourceFile.startsWith('adrs/0090'))).toBe(true);
  });

  it('reports the parameters it ran with, so a number can be traced to a configuration', async () => {
    const hybrid = new HybridKnowledgeAdapter({ lexical: lexicalIndex() });
    const result = await hybrid.query({ query: 'ADR-0111' });
    expect(result.retrieval.params).toEqual({
      k1: 1.2,
      b: 0.75,
      rrfK: 60,
      lexicalPool: 100,
      densePool: 50,
      lexicalWeight: 2,
      denseWeight: 1,
    });
  });
});

describe('InMemoryLexicalIndexAdapter (GT-592)', () => {
  it('computes document frequency over the WHOLE corpus, not the candidate set', async () => {
    // IDF from the candidate set would make every retrieved term look equally
    // rare and erase the identifier advantage entirely.
    const lexical = lexicalIndex();
    const { stats } = await lexical.candidates({ terms: ['adr', 'adr0111'], limit: 100 });
    expect(stats.corpusSize).toBe(4);
    expect(stats.documentFrequency.get('adr')).toBe(3); // the three ADR chunks, not the caching one
    expect(stats.documentFrequency.get('adr0111')).toBe(2); // c1 and c3
  });

  it('re-seeding a chunkId replaces its postings rather than duplicating them', async () => {
    const lexical = lexicalIndex();
    lexical.seed([chunk('c1', 'adrs/0111-port-seam.md', 'ADR-0111', 'now about caching only')]);
    const { stats } = await lexical.candidates({ terms: ['adr0111'], limit: 100 });
    expect(await lexical.corpusSize()).toBe(4);
    expect(stats.documentFrequency.get('adr0111')).toBe(2); // heading still carries it
  });

  it('returns no candidates for a query sharing no term', async () => {
    const lexical = lexicalIndex();
    const { candidates } = await lexical.candidates({ terms: ['quantum'], limit: 100 });
    expect(candidates).toEqual([]);
  });
});

describe('VectorMemoryKnowledgeAdapter (GT-592)', () => {
  const unit = (i: number, n: number) => Array.from({ length: n }, (_, j) => (j === i ? 1 : 0));

  it('ranks by exact cosine similarity', async () => {
    const dense = new VectorMemoryKnowledgeAdapter({ embed: async () => unit(0, 3) });
    dense.seed([
      { chunk: CORPUS[0], embedding: unit(1, 3) },
      { chunk: CORPUS[1], embedding: unit(0, 3) },
    ]);
    const result = await dense.query({ query: 'anything' });
    expect(result.chunks[0].chunkId).toBe(CORPUS[1].chunkId);
    expect(result.chunks[0].score).toBeCloseTo(1);
  });

  it('fails closed on a dimension mismatch rather than ranking on nonsense', async () => {
    const dense = new VectorMemoryKnowledgeAdapter({ embed: async () => unit(0, 5) });
    dense.seed([{ chunk: CORPUS[0], embedding: unit(0, 3) }]);
    await expect(dense.query({ query: 'x' })).rejects.toThrow(/not cosine-comparable|!= store dim/);
  });

  it('refuses a seeded vector of the wrong dimension', () => {
    const dense = new VectorMemoryKnowledgeAdapter({ embed: async () => unit(0, 3) });
    dense.seed([{ chunk: CORPUS[0], embedding: unit(0, 3) }]);
    expect(() => dense.seed([{ chunk: CORPUS[1], embedding: unit(0, 4) }])).toThrow(/not cosine-comparable/);
  });
});
