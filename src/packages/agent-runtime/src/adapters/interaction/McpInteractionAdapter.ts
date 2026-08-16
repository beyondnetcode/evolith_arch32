import { AgentRuntimeRequest, parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import { InteractionAdapterPort } from '../../domain/ports/interaction-adapter.port';

/**
 * Input shape received from the MCP server tool dispatch layer.
 *
 * MCP tools are identified by `toolName` and receive a flat `args` bag.
 * Context fields (tenant, initiative, phase, correlationId) may arrive as
 * top-level args or nested under `args.context`.
 */
export interface McpToolInput {
  /** MCP tool name (e.g. 'evolith-validate', 'evolith-gate-evaluate'). */
  readonly toolName: string;
  /** Raw arguments from the MCP CallToolRequest. */
  readonly args: Record<string, unknown>;
}

/**
 * GT-405: Routes MCP tool calls through the Agent Runtime's governed
 * InteractionAdapterPort so that mutative/governed capabilities receive
 * the same OPA policy, HITL approval, and trace emission as other
 * interfaces (CLI, Hermes chat, external triggers).
 *
 * Read-only tools that do not require governance may continue to bypass
 * the runtime via direct execution in the MCP dispatch layer.
 */
export class McpInteractionAdapter implements InteractionAdapterPort<McpToolInput> {
  readonly sourceInterface = 'mcp' as const;

  toRuntimeRequest(input: McpToolInput): AgentRuntimeRequest {
    const { toolName, args } = input;
    const ctx = (args.context as Record<string, unknown> | undefined) || {};

    return parseAgentRuntimeRequest({
      source_interface: this.sourceInterface,
      intent: toolName,
      tool: toolName,
      tenant: (args.tenant as string | undefined) ?? (ctx.tenant as string | undefined),
      product: (args.product as string | undefined) ?? (ctx.product as string | undefined),
      initiative: (args.initiative as string | undefined) ?? (ctx.initiative as string | undefined),
      phase: (args.phase as string | undefined) ?? (ctx.phase as string | undefined),
      gate: (args.gate as string | undefined) ?? (ctx.gate as string | undefined),
      correlation_id: (args.correlationId as string | undefined) ?? (ctx.correlationId as string | undefined),
      requested_by: (args.requestedBy as string | undefined) ?? (ctx.requestedBy as string | undefined),
      parameters: args,
      dry_run: args.dry_run === true || args.dryRun === true,
      // GT-679 — a caller-supplied string is NOT an approval.
      //
      // This turned any non-empty `approvalToken` into `{granted: true, approver:
      // 'mcp'}`, which would have pre-satisfied the agent-runtime approval check
      // with an identity nobody authenticated and a decision nobody made. The
      // approver was the literal string 'mcp' — an auditor asking who approved a
      // `satellite-create` was answered with the name of the transport.
      //
      // The grant that authorises an MCP mutative call is minted and verified in
      // the MCP server (`approval-grant.ts`), and it is not readable here: this
      // adapter sees an opaque sealed blob, not a decision. So it now carries
      // nothing, and the agent-runtime approval check does its own job rather
      // than being handed a pre-granted answer.
      approval: undefined,
    });
  }
}
