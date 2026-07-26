import { McpTool, McpToolSchema } from '../mcp/tool.interface';

export class KnowledgeSearchTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: 'evolith-knowledge-search',
    description: 'Búsqueda híbrida de conocimiento (BM25 + Dense Reranking)',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Query text' },
        maxResults: { type: 'number', description: 'Number of results to return' },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } },
      },
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  };
  
  readonly scope = 'read';
  readonly mutative = false;

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const query = args.query as string;
    // La implementación híbrida completa se conectaría con un motor BM25 / TSVECTOR
    // y usaría pgvector-knowledge.adapter.ts para reranking o viceversa.
    return {
      results: [
        { chunkId: 'mock-1', content: `Hybrid search result for: ${query}` }
      ]
    };
  }
}

export function createKnowledgeTools(): McpTool[] {
  return [new KnowledgeSearchTool()];
}
