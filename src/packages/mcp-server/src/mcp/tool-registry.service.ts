import { Inject, Injectable } from '@nestjs/common';
import {
  OPERATION_SCHEMA_DIALECT,
  type CapabilityOperation,
} from '@beyondnet/evolith-core-domain/capabilities/capability-operations';
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
      // GT-583 — the dialect is stamped HERE for the same reason the output
      // schema is: a tool declaring `$schema` by hand is a fifty-times-copied
      // constant, and the MCP specification expects 2020-12 keywords on BOTH
      // sides of a tool schema, not only the output.
      inputSchema: { $schema: OPERATION_SCHEMA_DIALECT, ...base.inputSchema },
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

  /**
   * GT-583 — the registry describing itself as the capability manifest's
   * per-operation contract.
   *
   * This is the ONE function the operation catalog is generated from
   * (`.harness/scripts/generate-capability-operations.mjs`), in the same shape
   * as GT-602's `AbacEvaluator.toolProjection()`: the generator CALLS the
   * runtime instead of re-reading the data the runtime reads. A second reader of
   * the tool files would be a third copy of the contract, which is the disease
   * GT-583 exists to cure, not the cure.
   *
   * It projects from {@link listSchemas} and NOT from the `tools/list` wire
   * response, because `handleListTools` filters the inventory by the ambient
   * principal's scopes (GT-609). A generator fed from the wire would emit
   * whatever subset the generating principal could see and silently drop the
   * rest — the GT-602 trap, where a generator fed from the wrong source deleted
   * nine tools and would have denied them in production.
   */
  operationProjection(): CapabilityOperation[] {
    return this.list().map((tool) => {
      const schema = this.describe(tool);
      return {
        name: schema.name,
        description: schema.description,
        surfaces: ['mcp'],
        mutative: tool.mutative === true,
        scope: tool.scope ?? (tool.mutative ? 'write' : 'read'),
        inputSchema: schema.inputSchema as Readonly<Record<string, unknown>>,
        outputSchema: schema.outputSchema as Readonly<Record<string, unknown>>,
      };
    });
  }
}
