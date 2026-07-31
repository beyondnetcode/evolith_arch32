import { createKnowledgeTools, KNOWLEDGE_SEARCH_OUTPUT_SCHEMA } from './knowledge.tools';
import { createKnowledgePort } from '../domain/knowledge.factory';
import { ToolRegistryService } from '../mcp/tool-registry.service';
import { DomainException } from '../common/errors';
import type { KnowledgeWiringResult } from '../domain/knowledge.factory';

/**
 * GT-592 — `evolith-knowledge-search`.
 *
 * Before this tool none of the fifty advertised MCP tools was a search or
 * knowledge operation, so the corpus GT-538…GT-541 built was unreachable from
 * outside the process.
 */

const CHUNK = {
  chunkId: 'c1',
  sourceFile: 'reference/core/architecture/adrs/core/0111-port-seam.md',
  sectionHeading: 'ADR-0111: Port Seam',
  adrId: '0111',
  language: 'en',
  tokenEstimate: 12,
  textPreview: 'ADR-0111 defines the port seam',
  text: 'ADR-0111 defines the port seam and its evaluation boundary.',
  score: 0.0328,
  retrievedBy: ['bm25', 'dense'] as const,
  lexicalRank: 1,
  denseRank: 3,
  charStart: 0,
  charEnd: 58,
  corpusVersion: 'rel-2026-07',
};

function wiringWith(chunks: unknown[], retrieval?: unknown): KnowledgeWiringResult {
  return {
    mode: 'hybrid',
    detail: 'test',
    port: {
      async query(request: { query: string }) {
        return { chunks, totalChunks: 1069, query: request.query, retrieval } as never;
      },
      async getDocument() {
        return undefined;
      },
      async corpusSize() {
        return 1069;
      },
    } as never,
  };
}

function tool(wiring: KnowledgeWiringResult) {
  return createKnowledgeTools(wiring)[0];
}

describe('evolith-knowledge-search (GT-592)', () => {
  it('declares a real output schema instead of leaving agents to parse prose', () => {
    const t = tool(wiringWith([]));
    expect(t.outputDataSchema).toBe(KNOWLEDGE_SEARCH_OUTPUT_SCHEMA);
    const props = (t.outputDataSchema as { properties: Record<string, unknown> }).properties;
    expect(Object.keys(props).sort()).toEqual(
      ['chunks', 'query', 'retrievalMode', 'returned', 'terms', 'totalChunks'].sort(),
    );
  });

  it('the registry wraps that schema into the shared envelope contract', () => {
    // The envelope is derived once by the registry (GT-581); a tool declares only
    // its `data` branch, so it cannot ship a stale copy of the envelope shape.
    const t = tool(wiringWith([]));
    const registry = new ToolRegistryService([t]);
    const described = registry.describe(t);
    expect(described.outputSchema?.properties?.data).toBe(KNOWLEDGE_SEARCH_OUTPUT_SCHEMA);
    expect(described.outputSchema?.properties?.meta).toBeDefined();
    expect(described.annotations?.readOnlyHint).toBe(true);
    expect(described.annotations?.destructiveHint).toBe(false);
  });

  it('is a read-scoped, non-mutative operation', () => {
    const t = tool(wiringWith([]));
    expect(t.scope).toBe('read');
    expect(t.mutative).toBeFalsy();
  });

  it('returns citations AND retrieval provenance for every chunk', async () => {
    const t = tool(wiringWith([CHUNK], { mode: 'hybrid', terms: ['adr0111', 'adr', '0111'] }));
    const data = (await t.execute({ query: 'ADR-0111' })) as any;
    expect(data.retrievalMode).toBe('hybrid');
    expect(data.returned).toBe(1);
    expect(data.totalChunks).toBe(1069);
    expect(data.terms).toEqual(['adr0111', 'adr', '0111']);
    expect(data.chunks[0]).toMatchObject({
      chunkId: 'c1',
      sourceFile: 'reference/core/architecture/adrs/core/0111-port-seam.md',
      adrId: '0111',
      corpusVersion: 'rel-2026-07',
      retrievedBy: ['bm25', 'dense'],
      lexicalRank: 1,
      denseRank: 3,
    });
  });

  it('omits the full text unless asked, and includes it when asked', async () => {
    const t = tool(wiringWith([CHUNK]));
    expect(((await t.execute({ query: 'x' })) as any).chunks[0].text).toBeUndefined();
    expect(((await t.execute({ query: 'x', includeText: true })) as any).chunks[0].text).toBe(CHUNK.text);
  });

  it('reports lexical-only when the dense side degraded, rather than claiming hybrid', async () => {
    const t = tool(wiringWith([CHUNK], { mode: 'lexical-only', degradedTo: 'bm25', terms: ['adr0111'] }));
    expect(((await t.execute({ query: 'ADR-0111' })) as any).retrievalMode).toBe('lexical-only');
  });

  it('rejects an empty query', async () => {
    const t = tool(wiringWith([]));
    await expect(t.execute({ query: '   ' })).rejects.toBeInstanceOf(DomainException);
  });

  it('clamps maxResults into a sane range', async () => {
    let seen = 0;
    const wiring = wiringWith([]);
    (wiring.port as any).query = async (r: any) => {
      seen = r.maxResults;
      return { chunks: [], totalChunks: 0, query: r.query };
    };
    const t = tool(wiring);
    await t.execute({ query: 'x', maxResults: 5000 });
    expect(seen).toBe(50);
    await t.execute({ query: 'x', maxResults: -3 });
    expect(seen).toBe(1);
  });

  it('fails loudly when no corpus is configured instead of returning plausible nothing', async () => {
    // An agent handed empty-but-successful results from an unconfigured corpus
    // will conclude the corpus says nothing on the subject, and ground a
    // recommendation on that.
    const t = tool({ port: null, mode: 'unconfigured', detail: 'No RAG store configured.' });
    await expect(t.execute({ query: 'ADR-0111' })).rejects.toThrow(/not configured/i);
  });
});

describe('knowledge wiring (GT-592)', () => {
  it('is unconfigured — not silently in-memory — without a database', () => {
    const wiring = createKnowledgePort({} as NodeJS.ProcessEnv);
    expect(wiring.port).toBeNull();
    expect(wiring.mode).toBe('unconfigured');
    expect(wiring.detail).toMatch(/EVOLITH_RAG_PG_URL/);
  });

  it('is BM25-only when there is a store but no embedding sidecar', () => {
    const wiring = createKnowledgePort({
      EVOLITH_RAG_PG_URL: 'postgres://localhost/x',
    } as NodeJS.ProcessEnv);
    expect(wiring.mode).toBe('lexical-only');
    expect(wiring.port).not.toBeNull();
  });

  it('is full hybrid when both a store and a sidecar are configured', () => {
    const wiring = createKnowledgePort({
      EVOLITH_RAG_PG_URL: 'postgres://localhost/x',
      EVOLITH_RAG_EMBED_URL: 'http://localhost:8085/v1/embeddings',
    } as NodeJS.ProcessEnv);
    expect(wiring.mode).toBe('hybrid');
    expect(wiring.port).not.toBeNull();
  });
});
