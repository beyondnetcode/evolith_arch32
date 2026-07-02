import { InMemoryKnowledgeAdapter } from './in-memory-knowledge.adapter';
import type { KnowledgeChunk } from '../../domain/ports/knowledge.port';

function makeChunk(overrides: Partial<KnowledgeChunk> = {}): KnowledgeChunk {
  return {
    chunkId: 'chunk-1',
    sourceFile: 'reference/architecture/adrs/core/0073-unified-cli-mcp-output-contract.md',
    sectionHeading: 'ADR-0073: Unified Output Contract',
    adrId: 'ADR-0073',
    language: 'en',
    tokenEstimate: 150,
    textPreview: 'All surfaces must return the same envelope structure...',
    text: 'ADR-0073 defines the unified output contract for CLI, MCP, and Core API. All surfaces must return the same envelope structure with success, data, and meta fields.',
    ...overrides,
  };
}

describe('InMemoryKnowledgeAdapter (GT-408)', () => {
  let adapter: InMemoryKnowledgeAdapter;

  beforeEach(() => {
    adapter = new InMemoryKnowledgeAdapter();
    adapter.seed([
      makeChunk({ chunkId: 'c1', sectionHeading: 'ADR-0073 Overview', text: 'ADR-0073 defines the unified output contract for CLI, MCP, and Core API surfaces.' }),
      makeChunk({ chunkId: 'c2', sectionHeading: 'ADR-0073 Envelope', adrId: 'ADR-0073', text: 'The envelope structure includes success, data, and meta fields with correlation ID.' }),
      makeChunk({ chunkId: 'c3', sourceFile: 'reference/core/README.md', adrId: null, sectionHeading: 'Core Constitution', text: 'Evolith Core is the engineering Constitution shared by all products.' }),
      makeChunk({ chunkId: 'c4', sourceFile: 'reference/architecture/adrs/core/0101-core-stateless-evaluation-engine.md', adrId: 'ADR-0101', sectionHeading: 'Stateless Engine', text: 'Core is a stateless evaluation engine that receives context and returns verdicts.' }),
    ]);
  });

  it('queries corpus by text overlap and returns ranked results', async () => {
    const result = await adapter.query({ query: 'unified output contract envelope' });
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].chunkId).toBe('c1');
    expect(result.totalChunks).toBe(4);
  });

  it('filters by language', async () => {
    adapter.seed([makeChunk({ chunkId: 'c-es', language: 'es', text: 'Contrato unificado de salida' })]);
    const result = await adapter.query({ query: 'contrato unificado', language: 'es' });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].chunkId).toBe('c-es');
  });

  it('filters by ADR prefix', async () => {
    const result = await adapter.query({ query: 'stateless evaluation engine', adrPrefix: 'ADR-0101' });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].adrId).toBe('ADR-0101');
  });

  it('filters by source prefix', async () => {
    const result = await adapter.query({ query: 'Core', sourcePrefix: 'reference/core' });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].sourceFile).toBe('reference/core/README.md');
  });

  it('respects maxResults', async () => {
    const result = await adapter.query({ query: 'ADR', maxResults: 2 });
    expect(result.chunks.length).toBeLessThanOrEqual(2);
  });

  it('returns empty results for unmatched query', async () => {
    const result = await adapter.query({ query: 'xyznonexistent' });
    expect(result.chunks).toHaveLength(0);
  });

  it('retrieves full document by source file', async () => {
    const doc = await adapter.getDocument('reference/architecture/adrs/core/0073-unified-cli-mcp-output-contract.md');
    expect(doc).toBeDefined();
    expect(doc!.chunks).toHaveLength(2);
    expect(doc!.metadata.adrId).toBe('ADR-0073');
  });

  it('returns undefined for non-existent document', async () => {
    const doc = await adapter.getDocument('nonexistent.md');
    expect(doc).toBeUndefined();
  });

  it('reports corpus size', async () => {
    const size = await adapter.corpusSize();
    expect(size).toBe(4);
  });

  it('clears corpus', async () => {
    adapter.clear();
    const size = await adapter.corpusSize();
    expect(size).toBe(0);
  });
});
