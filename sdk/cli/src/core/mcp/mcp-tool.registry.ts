export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface IMcpToolHandler {
  schema: McpToolSchema;
  execute(args: Record<string, unknown>, deps?: any): Promise<unknown>;
}

export class McpToolRegistry {
  private tools: Map<string, IMcpToolHandler> = new Map();

  register(handler: IMcpToolHandler): void {
    if (this.tools.has(handler.schema.name)) {
      throw new Error(`Tool already registered: ${handler.schema.name}`);
    }
    this.tools.set(handler.schema.name, handler);
  }

  getTool(name: string): IMcpToolHandler | undefined {
    return this.tools.get(name);
  }

  listTools(): McpToolSchema[] {
    return Array.from(this.tools.values()).map((t) => t.schema);
  }
}
