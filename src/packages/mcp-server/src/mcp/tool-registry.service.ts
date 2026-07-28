import { Inject, Injectable } from '@nestjs/common';
import { McpTool, McpToolSchema, MCP_TOOLS } from './tool.interface';
import { buildToolOutputSchema, deriveToolAnnotations } from '../common/tool-output-schema';

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

  /**
   * GT-581 — tools in a **deterministic** order (lexicographic by name).
   *
   * `tools/list` used to answer in DI-registration order, which is an accident of
   * module composition: reordering an import reshuffled the response, defeating
   * client-side and prompt caches for no semantic change. Sorting here makes the
   * order a property of the registry rather than of the module graph, and it is
   * the single place every listing path funnels through.
   */
  list(): McpTool[] {
    return Array.from(this.tools.values()).sort((a, b) => a.schema.name.localeCompare(b.schema.name, 'en'));
  }

  /**
   * GT-581 — the schema as it goes on the wire: the tool's own declaration plus
   * the derived output contract and behavioural annotations.
   *
   * Derivation lives here, not in the fifty tool classes, so no tool can be
   * registered without an output contract and no tool can carry a stale copy of
   * the envelope shape.
   */
  describe(tool: McpTool): McpToolSchema {
    return {
      ...tool.schema,
      outputSchema: tool.schema.outputSchema ?? buildToolOutputSchema(tool.outputDataSchema),
      annotations: deriveToolAnnotations({
        mutative: tool.mutative,
        scope: tool.scope,
        annotations: tool.annotations ?? tool.schema.annotations,
      }),
    };
  }

  listSchemas(): McpToolSchema[] {
    return this.list().map((t) => this.describe(t));
  }
}
