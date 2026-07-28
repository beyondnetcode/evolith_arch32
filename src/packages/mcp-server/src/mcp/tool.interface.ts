import type { JsonSchemaObject, McpToolAnnotations } from '../common/tool-output-schema';

/**
 * Contract for an MCP tool exposed by the gateway.
 *
 * A tool is a thin adapter: it declares its JSON schema and delegates execution
 * to the shared business logic (`@beyondnet/evolith-core`). Tools never touch the
 * transport — the {@link McpServerService} wraps their result in an envelope.
 */
export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  /**
   * GT-581 — JSON Schema 2020-12 description of the envelope this tool returns
   * in `structuredContent`. **Never hand-written per tool**: derived from the
   * envelope contract by `buildToolOutputSchema` and stamped onto every schema
   * by {@link ToolRegistryService.describe}. Optional on the interface only so a
   * tool class can keep declaring the three fields it always declared.
   */
  outputSchema?: JsonSchemaObject;
  /**
   * GT-581 — behavioural hints (`readOnlyHint` / `destructiveHint` / …). Also
   * derived, from `mutative` + `scope`, by `deriveToolAnnotations`.
   */
  annotations?: McpToolAnnotations;
}

export interface McpTool {
  readonly schema: McpToolSchema;
  /** When true, execution requires explicit confirmation (see McpServerService). */
  readonly mutative?: boolean;
  /** Declared authorization scope required to execute or view this tool. */
  readonly scope?: 'read' | 'write' | 'admin';
  /**
   * GT-581 — optional narrowing of the `data` branch of the output envelope.
   * A tool declares ONLY its payload here; the envelope around it is generated.
   */
  readonly outputDataSchema?: Record<string, unknown>;
  /** GT-581 — optional override of the derived annotations. */
  readonly annotations?: McpToolAnnotations;
  execute(args: Record<string, unknown>): Promise<unknown>;
}

/** DI token for the aggregated list of tools provided to the registry. */
export const MCP_TOOLS = Symbol('MCP_TOOLS');
