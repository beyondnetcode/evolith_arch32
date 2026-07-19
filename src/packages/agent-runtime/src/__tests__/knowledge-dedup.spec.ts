import {
  resolveDuplicate,
  actionForSimilarity,
  DEFAULT_DEDUP_THRESHOLDS,
} from '../application/knowledge-dedup';
import type { IKnowledgePort, KnowledgeChunk } from '../domain/ports/knowledge.port';

const chunk = (sourceFile: string, score: number | undefined, heading = 'Section'): KnowledgeChunk =>
  ({
    chunkId: `${sourceFile}#${heading}`,
    sourceFile,
    sectionHeading: heading,
    adrId: null,
    language: 'en',
    tokenEstimate: 10,
    textPreview: '',
    text: '',
    ...(score === undefined ? {} : { score }),
  }) as KnowledgeChunk;

const portWith = (chunks: KnowledgeChunk[], totalChunks = 500): IKnowledgePort =>
  ({
    query: async () => ({ chunks, totalChunks, query: 'q' }),
    getDocument: async () => undefined,
    corpusSize: async () => totalChunks,
  }) as unknown as IKnowledgePort;

const failingPort = (): IKnowledgePort =>
  ({
    query: async () => {
      throw new Error('vector store unreachable');
    },
    getDocument: async () => undefined,
    corpusSize: async () => 0,
  }) as unknown as IKnowledgePort;

describe('actionForSimilarity', () => {
  it('orders reuse above extend above relate above create', () => {
    expect(actionForSimilarity(0.95)).toBe('reuse');
    expect(actionForSimilarity(0.8)).toBe('extend');
    expect(actionForSimilarity(0.6)).toBe('relate');
    expect(actionForSimilarity(0.2)).toBe('create');
  });

  it('treats each threshold as inclusive at its boundary', () => {
    expect(actionForSimilarity(DEFAULT_DEDUP_THRESHOLDS.reuse)).toBe('reuse');
    expect(actionForSimilarity(DEFAULT_DEDUP_THRESHOLDS.extend)).toBe('extend');
    expect(actionForSimilarity(DEFAULT_DEDUP_THRESHOLDS.relate)).toBe('relate');
  });

  it('honours custom thresholds', () => {
    expect(actionForSimilarity(0.6, { reuse: 0.5, extend: 0.4, relate: 0.3 })).toBe('reuse');
  });
});

describe('resolveDuplicate', () => {
  it('recommends reuse when the corpus already covers the finding', async () => {
    const v = await resolveDuplicate(portWith([chunk('kb/aggregates.md', 0.93)]), 'aggregate transaction boundaries');
    expect(v.action).toBe('reuse');
    expect(v.similarity).toBeCloseTo(0.93);
    expect(v.rationale).toContain('already covered');
    expect(v.inconclusive).toBe(false);
  });

  it('recommends extending the existing entry rather than creating a sibling', async () => {
    const v = await resolveDuplicate(portWith([chunk('kb/aggregates.md', 0.8)]), 'x');
    expect(v.action).toBe('extend');
    expect(v.rationale).toContain('INSIDE');
  });

  it('recommends relating when distinct but adjacent', async () => {
    const v = await resolveDuplicate(portWith([chunk('kb/outbox.md', 0.6)]), 'x');
    expect(v.action).toBe('relate');
    expect(v.rationale).toContain('cross-reference');
  });

  it('recommends creating only when nothing comes close', async () => {
    const v = await resolveDuplicate(portWith([chunk('kb/unrelated.md', 0.1)]), 'x');
    expect(v.action).toBe('create');
    expect(v.inconclusive).toBe(false);
  });

  it('ranks matches best-first so the reviewer lands on the closest one', async () => {
    const v = await resolveDuplicate(
      portWith([chunk('kb/c.md', 0.3), chunk('kb/a.md', 0.92), chunk('kb/b.md', 0.5)]),
      'x',
    );
    expect(v.matches.map((m) => m.sourceFile)).toEqual(['kb/a.md', 'kb/b.md', 'kb/c.md']);
    expect(v.action).toBe('reuse');
  });

  it('scores an unscored chunk as zero instead of dropping it', async () => {
    const v = await resolveDuplicate(portWith([chunk('kb/noscore.md', undefined)]), 'x');
    expect(v.matches).toHaveLength(1);
    expect(v.matches[0].score).toBe(0);
    expect(v.action).toBe('create');
  });

  // The two cases that matter most: a `create` that does not mean "this is new".
  it('marks an empty corpus inconclusive — create there means "we know nothing"', async () => {
    const v = await resolveDuplicate(portWith([], 0), 'x');
    expect(v.action).toBe('create');
    expect(v.inconclusive).toBe(true);
    expect(v.corpusSize).toBe(0);
    expect(v.rationale).toContain('NOT evidence');
  });

  it('marks a retrieval failure inconclusive rather than inferring novelty', async () => {
    const v = await resolveDuplicate(failingPort(), 'x');
    expect(v.action).toBe('create');
    expect(v.inconclusive).toBe(true);
    expect(v.rationale).toContain('NOT evidence');
  });

  it('does not mark a populated corpus inconclusive just because nothing matched', async () => {
    const v = await resolveDuplicate(portWith([], 500), 'x');
    expect(v.action).toBe('create');
    expect(v.inconclusive).toBe(false);
    expect(v.rationale).toContain('justified');
  });

  it('reports the corpus size so callers can judge how much the verdict is worth', async () => {
    const v = await resolveDuplicate(portWith([chunk('kb/a.md', 0.4)], 7), 'x');
    expect(v.corpusSize).toBe(7);
  });

  it('points at a section, not just a document', async () => {
    const v = await resolveDuplicate(portWith([chunk('kb/a.md', 0.95, 'Transaction Boundaries')]), 'x');
    expect(v.rationale).toContain('kb/a.md#Transaction Boundaries');
  });
});
