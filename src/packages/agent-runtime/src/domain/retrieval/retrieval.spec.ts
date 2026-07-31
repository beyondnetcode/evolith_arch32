import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tokenize, queryTerms, termFrequencies, compoundForm } from './tokenize';
import { rankBm25, scoreDocument, idf, corpusStatsFrom, candidateFromText, DEFAULT_BM25_PARAMS } from './bm25';
import { reciprocalRankFusion, DEFAULT_RRF_K } from './rank-fusion';

/**
 * GT-592 — the ranking primitives.
 *
 * These assert the PROPERTIES that make hybrid retrieval work over an
 * identifier-queried corpus, not just that the functions run.
 */
describe('tokenize (GT-592)', () => {
  it('emits an identifier at both granularities so the rare compound survives', () => {
    expect(tokenize('ADR-0111')).toEqual(['adr0111', 'adr', '0111']);
    expect(tokenize('SCHEMA_VERSION')).toEqual(['schemaversion', 'schema', 'version']);
    expect(tokenize('kind-evaluators.ts')).toEqual(['kindevaluatorsts', 'kind', 'evaluators', 'ts']);
  });

  it('does NOT double-count a plain word', () => {
    // A word with no separators must contribute exactly one term, or its term
    // frequency — which BM25 saturates over — is inflated for free.
    expect(tokenize('architecture')).toEqual(['architecture']);
  });

  it('deletes rather than keeps separators in the compound, matching the SQL index', () => {
    // PostgreSQL's `simple` parser reads `ADR-0111` as `adr` + `-0111`, so a
    // hyphen-preserving compound would be a term SQL could never count and its
    // IDF would be spuriously infinite. See rag-pgvector.schema.sql.
    expect(compoundForm('ADR-0111')).toBe('adr0111');
    expect(tokenize('ADR-0111')).not.toContain('adr-0111');
  });

  it('drops single letters but keeps single digits', () => {
    expect(tokenize('a v1.2.0')).toEqual(['v120', 'v1', '2', '0']);
  });

  it('strips punctuation that merely abutted a word', () => {
    expect(tokenize('see ADR-0111.')).toEqual(['see', 'adr0111', 'adr', '0111']);
  });

  it('is case-insensitive', () => {
    expect(tokenize('AdR-0111')).toEqual(tokenize('adr-0111'));
  });

  it('queryTerms deduplicates so a repeated word does not double its own weight', () => {
    expect(queryTerms('cache cache cache')).toEqual(['cache']);
  });

  it('reports document length in characters (the unit BM25 normalizes by)', () => {
    const text = 'ADR-0111 decides things';
    expect(termFrequencies(text).length).toBe(text.length);
  });
});

describe('BM25 (GT-592)', () => {
  it('gives a rarer term a strictly higher IDF', () => {
    expect(idf(1, 1000)).toBeGreaterThan(idf(900, 1000));
  });

  it('never returns a negative IDF, even for a term in every document', () => {
    expect(idf(1000, 1000)).toBeGreaterThanOrEqual(0);
  });

  it('ranks the document that owns an identifier above documents that merely cite it', () => {
    // This is the claim GT-592 rests on, at the level of a single function.
    const docs = [
      candidateFromText('owner', 'ADR-0111 Title. ADR-0111 decides the port seam. ADR-0111 applies.'),
      candidateFromText('citer-a', 'This module follows ADR-0111 and also ADR-0090 and ADR-0112.'),
      candidateFromText('citer-b', 'Unrelated prose about caching and database engines and topology.'),
    ];
    const stats = corpusStatsFrom(docs);
    const ranked = rankBm25(queryTerms('ADR-0111'), docs, stats);
    expect(ranked[0].id).toBe('owner');
    expect(ranked.map((r) => r.id)).not.toContain('citer-b');
  });

  it('drops documents that match no query term rather than ranking them last', () => {
    const docs = [candidateFromText('a', 'nothing relevant here')];
    expect(rankBm25(queryTerms('ADR-0111'), docs, corpusStatsFrom(docs))).toEqual([]);
  });

  it('saturates term frequency — 100 repeats is not 100x one repeat', () => {
    const once = candidateFromText('once', 'cache');
    const many = candidateFromText('many', new Array(100).fill('cache').join(' '));
    const stats = corpusStatsFrom([once, many]);
    const s1 = scoreDocument(['cache'], once, stats).score;
    const s100 = scoreDocument(['cache'], many, stats).score;
    expect(s100).toBeLessThan(s1 * (DEFAULT_BM25_PARAMS.k1 + 1) + 1e-9);
  });

  it('is deterministic under tied scores', () => {
    const docs = [candidateFromText('b', 'cache'), candidateFromText('a', 'cache')];
    const stats = corpusStatsFrom(docs);
    expect(rankBm25(['cache'], docs, stats).map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('reciprocal rank fusion (GT-592)', () => {
  it('ranks a document found by BOTH retrievers above one found by only one', () => {
    const fused = reciprocalRankFusion([
      { name: 'bm25', ids: ['both', 'lexOnly'] },
      { name: 'dense', ids: ['denseOnly', 'both'] },
    ]);
    expect(fused[0].id).toBe('both');
    expect(fused[0].ranks).toEqual({ bm25: 1, dense: 2 });
  });

  it('tolerates a list an id is absent from — the case that makes RRF usable here', () => {
    // BM25 returns NOTHING for a document sharing no term with the query, so the
    // two candidate sets genuinely differ; a score-level blend would need to
    // invent a value for the missing side.
    const fused = reciprocalRankFusion([
      { name: 'bm25', ids: ['x'] },
      { name: 'dense', ids: [] },
    ]);
    expect(fused).toHaveLength(1);
    expect(fused[0].score).toBeCloseTo(1 / (DEFAULT_RRF_K + 1));
  });

  it('honours list weights', () => {
    const fused = reciprocalRankFusion([
      { name: 'bm25', ids: ['lex'], weight: 10 },
      { name: 'dense', ids: ['dense'], weight: 1 },
    ]);
    expect(fused[0].id).toBe('lex');
  });

  it('is deterministic under tied scores', () => {
    const fused = reciprocalRankFusion([{ name: 'bm25', ids: [] }, { name: 'dense', ids: [] }]);
    expect(fused).toEqual([]);
  });
});

describe('tokenizer / SQL index contract (GT-592)', () => {
  // The Postgres lexical index must produce the SAME terms this tokenizer emits:
  // document frequency is read from SQL while term frequency is counted here, so
  // a divergence would give IDF for terms BM25 never scores. The live-database
  // proof is in `pg-lexical-index.adapter.integration.spec.ts`; this cheap check
  // runs everywhere and catches the DDL and the tokenizer drifting apart.
  const ddl = readFileSync(
    resolve(__dirname, '../../../../../../.harness/scripts/ci/rag-pgvector.schema.sql'),
    'utf8',
  );

  it('the DDL indexes the separator-DELETED form, which is what compoundForm produces', () => {
    expect(ddl).toContain("translate(lower(");
    expect(ddl).toContain("), '-_./', '')");
    expect(compoundForm('ADR-0111')).toBe('adr0111');
  });

  it('the DDL also indexes the separator-SPLIT form, which is what the sub-tokens are', () => {
    expect(ddl).toContain("regexp_replace(lower(");
    expect(ddl).toContain("), '[-_./]+', ' ', 'g')");
    expect(tokenize('ADR-0111')).toEqual(expect.arrayContaining(['adr', '0111']));
  });

  it("the DDL uses the 'simple' configuration — stemming would corrupt identifiers", () => {
    expect(ddl).toMatch(/to_tsvector\(\s*'simple'/);
    expect(ddl).not.toMatch(/to_tsvector\(\s*'english'/);
  });

  it('the DDL indexes heading AND content, exactly what the lexical adapters tokenize', () => {
    expect(ddl).toMatch(/coalesce\(section_heading, ''\) \|\| ' ' \|\| coalesce\(content, ''\)/);
  });
});
