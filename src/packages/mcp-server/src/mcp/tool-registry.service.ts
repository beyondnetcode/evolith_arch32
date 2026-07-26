import { Inject, Injectable } from '@nestjs/common';
import { McpTool, McpToolSchema, MCP_TOOLS } from './tool.interface';

/**
 * In-memory registry of MCP tools, keyed by tool name.
 *
 * Populated at construction from the {@link MCP_TOOLS} provider so the set of
 * tools is fixed by the module graph and discoverable via `listSchemas()`.
 */
@Injectable()
export class ToolRegistryService {
  private readonly tools = new Map<string, McpTool>();

  constructor(@Inject(MCP_TOOLS) tools: McpTool[]) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  register(tool: McpTool): void {
    const name = tool.schema.name;
    if (this.tools.has(name)) {
      throw new Error(`Tool already registered: ${name}`);
    }
    this.tools.set(name, tool);
  }

  get(name: string): McpTool | undefined {
    return this.tools.get(name);
  }

  list(): McpTool[] {
    return Array.from(this.tools.values());
  }

  listSchemas(): McpToolSchema[] {
    return this.list()
      .map((t) => t.schema)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
