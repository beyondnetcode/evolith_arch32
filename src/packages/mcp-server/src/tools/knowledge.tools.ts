import { McpTool } from '../mcp/tool.interface';
import { DomainException, ErrorCodes } from '../common/errors';
import type { IKnowledgePort, KnowledgeChunk } from '@beyondnet/evolith-agent-runtime/ports';
import type { KnowledgeWiringResult } from '../domain/knowledge.factory';

/**
 * GT-592 — `evolith-knowledge-search`: the first MCP operation that reaches the
 * RAG corpus.
 *
 * Before this tool, the gateway advertised fifty tools and not one of them was a
 * search or knowledge operation, while GT-538…GT-541 had already built and
 * indexed the corpus. An index nobody can query is the most expensive possible
 * shape of that work — the cost is paid and none of the benefit is collected.
 *
 * Retrieval is BM25-first hybrid (see `HybridKnowledgeAdapter`), because this
 * corpus is queried by exact identifiers (`ADR-0111`, `GT-569`, `SCHEMA_VERSION`)
 * and cosine similarity over dense embeddings is the wrong instrument for that
 * traffic.
 *
 * The result declares a real output schema rather than leaving an agent to
 * `JSON.parse` prose: `outputDataSchema` narrows the `data` branch of the shared
 * ADR-0073 envelope, and `ToolRegistryService.describe()` wraps it into the
 * envelope contract, so the tool never restates the envelope shape.
 *
 * Every returned chunk carries its citation (`sourceFile`, `sectionHeading`,
 * `adrId`, character offsets, `corpusVersion`) AND its retrieval provenance
 * (`retrievedBy`, `lexicalRank`, `denseRank`). The provenance is not decoration:
 * an agent grounding a recommendation should weigh a chunk that matched an exact
 * identifier differently from one that merely sat nearby in embedding space.
 */

/** JSON Schema for a single returned chunk. Kept beside the mapper it describes. */
const CHUNK_SCHEMA = {
  type: 'object',
  description: 'One retrieved corpus chunk with full citation and retrieval provenance.',
  properties: {
    chunkId: { type: 'string', description: 'Deterministic chunk identifier.' },
    sourceFile: { type: 'string', description: 'Repo-relative path of the source document.' },
    sectionHeading: { type: 'string', description: 'Heading of the section the chunk came from.' },
    adrId: { type: ['string', 'null'], description: 'ADR number when the source is an ADR.' },
    language: { type: 'string', description: 'Language of the chunk (en, es).' },
    score: { type: 'number', description: 'Fused relevance score. Comparable within one response only.' },
    retrievedBy: {
      type: 'array',
      items: { type: 'string', enum: ['bm25', 'dense'] },
      description: 'Which retrievers surfaced this chunk. An exact-term match and a semantic neighbour carry different confidence.',
    },
    lexicalRank: { type: 'number', description: '1-based rank in the BM25 list, absent if BM25 did not return it.' },
    denseRank: { type: 'number', description: '1-based rank in the dense list, absent if dense did not return it.' },
    tokenEstimate: { type: 'number', description: 'Approximate token count of `text`.' },
    textPreview: { type: 'string', description: 'Leading characters of the chunk.' },
    text: { type: 'string', description: 'Full chunk text. Omitted unless `includeText` is true.' },
    charStart: { type: 'number', description: 'Start offset of the chunk in its source file.' },
    charEnd: { type: 'number', description: 'End offset of the chunk in its source file.' },
    corpusVersion: { type: 'string', description: 'Indexed corpus release the chunk was embedded under.' },
  },
  required: ['chunkId', 'sourceFile', 'sectionHeading', 'language'],
} as const;

/** Narrows the `data` branch of the ADR-0073 envelope for this tool. */
const KNOWLEDGE_SEARCH_OUTPUT_SCHEMA = {
  type: 'object',
  description: 'Ranked chunks from the Evolith architecture knowledge corpus.',
  properties: {
    query: { type: 'string', description: 'The query as executed.' },
    retrievalMode: {
      type: 'string',
      enum: ['hybrid', 'lexical-only'],
      description: 'hybrid = BM25 fused with a dense reranker; lexical-only = BM25 alone (no embedding sidecar, or the dense side failed and the search degraded rather than returning nothing).',
    },
    returned: { type: 'number', description: 'Number of chunks in `chunks`.' },
    totalChunks: { type: 'number', description: 'Size of the indexed corpus the query ran against.' },
    terms: {
      type: 'array',
      items: { type: 'string' },
      description: 'Normalized lexical terms the query was tokenized into. Exposed so an agent can see why an identifier query matched.',
    },
    chunks: { type: 'array', items: CHUNK_SCHEMA },
  },
  required: ['query', 'retrievalMode', 'returned', 'totalChunks', 'chunks'],
} as const;

interface HybridTraceShape {
  mode?: 'hybrid' | 'lexical-only';
  terms?: string[];
  degradedTo?: string;
}

function toWire(chunk: KnowledgeChunk, includeText: boolean): Record<string, unknown> {
  const wire: Record<string, unknown> = {
    chunkId: chunk.chunkId,
    sourceFile: chunk.sourceFile,
    sectionHeading: chunk.sectionHeading,
    adrId: chunk.adrId ?? null,
    language: chunk.language,
    tokenEstimate: chunk.tokenEstimate,
    textPreview: chunk.textPreview,
  };
  if (chunk.score !== undefined) wire.score = chunk.score;
  if (chunk.retrievedBy !== undefined) wire.retrievedBy = chunk.retrievedBy;
  if (chunk.lexicalRank !== undefined) wire.lexicalRank = chunk.lexicalRank;
  if (chunk.denseRank !== undefined) wire.denseRank = chunk.denseRank;
  if (chunk.charStart !== undefined) wire.charStart = chunk.charStart;
  if (chunk.charEnd !== undefined) wire.charEnd = chunk.charEnd;
  if (chunk.corpusVersion !== undefined) wire.corpusVersion = chunk.corpusVersion;
  // Full text is opt-in: a top-10 over this corpus is tens of kilobytes, and an
  // agent paging through results usually needs the citation, not the body.
  if (includeText) wire.text = chunk.text;
  return wire;
}

/**
 * `evolith-knowledge-search` — search the indexed architecture corpus.
 *
 * `wiring` is passed rather than resolved here so the tool has no knowledge of
 * how the port was built, and a test can hand it any `IKnowledgePort`.
 */
export function createKnowledgeTools(wiring: KnowledgeWiringResult): McpTool[] {
  return [
    {
      scope: 'read',
      mutative: false,
      outputDataSchema: KNOWLEDGE_SEARCH_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      schema: {
        name: 'evolith-knowledge-search',
        description:
          'Search the Evolith architecture knowledge corpus (ADRs, rulesets, standards) with BM25-first hybrid retrieval. Returns ranked chunks with full citations. Optimised for exact identifiers such as ADR-0111 as well as natural-language questions.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search text. An exact identifier (ADR-0111, GT-569) or a natural-language question.',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum chunks to return (default 10, max 50).',
              default: 10,
            },
            language: { type: 'string', description: 'Restrict to a corpus language (en, es).' },
            adrPrefix: { type: 'string', description: 'Restrict to ADR ids starting with this prefix.' },
            sourcePrefix: { type: 'string', description: 'Restrict to source paths starting with this prefix.' },
            includeText: {
              type: 'boolean',
              description: 'Include the full chunk text, not just the preview (default false).',
              default: false,
            },
          },
          required: ['query'],
        },
      },
      execute: async (args: Record<string, unknown>) => {
        const port: IKnowledgePort | null = wiring.port;
        if (!port) {
          // Fail loudly rather than substituting a stand-in retriever: an agent
          // that receives plausible-looking chunks from an unconfigured corpus
          // will ground a recommendation in them.
          throw new DomainException(
            ErrorCodes.NOT_IMPLEMENTED,
            `Knowledge corpus is not configured on this gateway. ${wiring.detail}`,
          );
        }

        const query = typeof args.query === 'string' ? args.query.trim() : '';
        if (!query) {
          throw new DomainException(ErrorCodes.VALIDATION_FAILED, '`query` is required and must be non-empty.');
        }

        const requested = Number(args.maxResults ?? 10);
        const maxResults = Math.min(50, Math.max(1, Number.isFinite(requested) ? requested : 10));
        const includeText = args.includeText === true;

        const result = await port.query({
          query,
          maxResults,
          language: typeof args.language === 'string' ? args.language : undefined,
          adrPrefix: typeof args.adrPrefix === 'string' ? args.adrPrefix : undefined,
          sourcePrefix: typeof args.sourcePrefix === 'string' ? args.sourcePrefix : undefined,
        });

        const trace = (result as unknown as { retrieval?: HybridTraceShape }).retrieval;

        return {
          query: result.query,
          retrievalMode: trace?.mode ?? (wiring.mode === 'unconfigured' ? 'lexical-only' : wiring.mode),
          returned: result.chunks.length,
          totalChunks: result.totalChunks,
          terms: trace?.terms ?? [],
          chunks: result.chunks.map((chunk) => toWire(chunk, includeText)),
        };
      },
    },
  ];
}

export { KNOWLEDGE_SEARCH_OUTPUT_SCHEMA };
