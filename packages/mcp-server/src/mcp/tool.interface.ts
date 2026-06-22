/**
 * Contract for an MCP tool exposed by the gateway.
 *
 * A tool is a thin adapter: it declares its JSON schema and delegates execution
 * to the shared business logic (`@evolith/core`). Tools never touch the
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
}

export interface McpTool {
  readonly schema: McpToolSchema;
  /** When true, execution requires explicit confirmation (see McpServerService). */
  readonly mutative?: boolean;
  /** Declared authorization scope required to execute or view this tool. */
  readonly scope?: 'read' | 'write' | 'admin';
  execute(args: Record<string, unknown>): Promise<unknown>;
}

/** DI token for the aggregated list of tools provided to the registry. */
export const MCP_TOOLS = Symbol('MCP_TOOLS');
