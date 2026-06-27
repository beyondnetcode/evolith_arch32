/**
 * EvolithMcpClient — typed wrapper for calling Evolith MCP tools via the
 * JSON-RPC 2.0 `tools/call` method.
 *
 * This client sends typed inputs and casts responses to the correct output
 * types for each named tool. It is transport-agnostic: supply any function
 * that sends a `tools/call` request and returns the raw content array.
 */

import type {
  McpToolName,
  McpToolInputMap,
  McpToolOutputMap,
  GateEvaluateInput,
  GateEvaluateOutput,
  ValidateInput,
  ValidateOutput,
  PhaseAdvanceInput,
  PhaseAdvanceOutput,
  TopologyListInput,
  TopologyListOutput,
  TopologyGetInput,
  TopologyGetOutput,
} from './types.js';

export interface McpCallResult<T> {
  content: Array<{ type: string; text?: string }>;
  parsed: T;
  isError: boolean;
}

/**
 * Transport function signature. Implement this to connect to an MCP server
 * via stdio, HTTP+SSE, or any other transport.
 */
export type McpTransport = <N extends McpToolName>(
  toolName: N,
  input: McpToolInputMap[N],
) => Promise<Array<{ type: string; text?: string; [key: string]: unknown }>>;

export interface EvolithMcpClientOptions {
  /** Transport function that sends tool calls to the MCP server */
  transport: McpTransport;
}

export class EvolithMcpClient {
  private readonly transport: McpTransport;

  constructor(options: EvolithMcpClientOptions) {
    this.transport = options.transport;
  }

  // ─── evolith-gate-evaluate ─────────────────────────────────────────────────

  /**
   * Evaluate a specific SDLC phase gate.
   */
  async evaluateGate(input: GateEvaluateInput): Promise<McpCallResult<GateEvaluateOutput>> {
    return this.call('evolith-gate-evaluate', input);
  }

  // ─── evolith-validate ──────────────────────────────────────────────────────

  /**
   * Validate a satellite repository against Evolith rules.
   */
  async validate(input: ValidateInput): Promise<McpCallResult<ValidateOutput>> {
    return this.call('evolith-validate', input);
  }

  // ─── evolith-phase-advance ─────────────────────────────────────────────────

  /**
   * Propose an SDLC phase transition.
   */
  async advancePhase(input: PhaseAdvanceInput): Promise<McpCallResult<PhaseAdvanceOutput>> {
    return this.call('evolith-phase-advance', input);
  }

  // ─── evolith-topology-list ─────────────────────────────────────────────────

  /**
   * List all available architecture topologies.
   */
  async listTopologies(input?: TopologyListInput): Promise<McpCallResult<TopologyListOutput>> {
    return this.call('evolith-topology-list', input ?? {});
  }

  // ─── evolith-topology-get ──────────────────────────────────────────────────

  /**
   * Get a specific architecture topology by ID.
   */
  async getTopology(input: TopologyGetInput): Promise<McpCallResult<TopologyGetOutput>> {
    return this.call('evolith-topology-get', input);
  }

  // ─── Generic typed call ───────────────────────────────────────────────────

  /**
   * Send a typed tool call and parse the response.
   */
  async call<N extends McpToolName>(
    toolName: N,
    input: McpToolInputMap[N],
  ): Promise<McpCallResult<McpToolOutputMap[N]>> {
    const content = await this.transport(toolName, input);

    const isError = content.some((c) => c.type === 'error' || (c as any).isError === true);
    const textContent = content.find((c) => c.type === 'text');
    const text = textContent?.text ?? '';

    let parsed: McpToolOutputMap[N];
    try {
      parsed = JSON.parse(text) as McpToolOutputMap[N];
    } catch {
      parsed = text as unknown as McpToolOutputMap[N];
    }

    return { content, parsed, isError };
  }
}

/**
 * Create a simple stdio-based MCP transport for use in Node.js.
 * This is a factory helper — wire it to a spawned MCP server process.
 *
 * For production use, prefer the `@modelcontextprotocol/sdk` Client transport.
 */
export function createJsonRpcTransport(
  sendRequest: (method: string, params: unknown) => Promise<unknown>,
): McpTransport {
  return async (toolName, input) => {
    const result = await sendRequest('tools/call', { name: toolName, arguments: input });
    const r = result as { content?: Array<{ type: string; text?: string }> };
    return r.content ?? [];
  };
}
