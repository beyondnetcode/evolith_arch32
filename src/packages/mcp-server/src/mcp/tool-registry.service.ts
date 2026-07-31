import { Inject, Injectable } from '@nestjs/common';
import { McpTool, McpToolSchema, MCP_TOOLS } from './tool.interface';
import { buildToolOutputSchema, deriveToolAnnotations } from '../common/tool-output-schema';
import { withBaseShaParameter } from './workspace-concurrency';

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
   *
   * GT-606 — the same argument applies to ADR-0093's `baseSha`: every mutative
   * tool advertises it, derived from the `mutative` flag rather than hand-copied
   * into twenty input schemas, so the declared surface and what the dispatch
   * actually enforces cannot drift apart.
   */
  describe(tool: McpTool): McpToolSchema {
    const base = tool.mutative ? withBaseShaParameter(tool.schema) : tool.schema;
    return {
      ...base,
      outputSchema: base.outputSchema ?? buildToolOutputSchema(tool.outputDataSchema),
      annotations: deriveToolAnnotations({
        mutative: tool.mutative,
        scope: tool.scope,
        annotations: tool.annotations ?? base.annotations,
      }),
    };
  }

  listSchemas(): McpToolSchema[] {
    return this.list().map((t) => this.describe(t));
  }
}
