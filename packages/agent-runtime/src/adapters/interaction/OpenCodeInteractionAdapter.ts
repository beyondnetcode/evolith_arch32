import { AgentRuntimeRequest, parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import { InteractionAdapterPort } from '../../domain/ports/interaction-adapter.port';

/**
 * GT-404: OpenCode interaction adapter.
 *
 * Maps OpenCode tool call inputs to the canonical AgentRuntimeRequest.
 * OpenCode uses a similar tool-call pattern to MCP but with its own
 * input shape. This adapter normalizes it to the runtime contract.
 */
export interface OpenCodeToolInput {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly sessionId?: string;
  readonly userId?: string;
}

export class OpenCodeInteractionAdapter implements InteractionAdapterPort<OpenCodeToolInput> {
  readonly sourceInterface = 'mcp' as const; // OpenCode reuses MCP source interface

  toRuntimeRequest(input: OpenCodeToolInput): AgentRuntimeRequest {
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
      correlation_id: input.sessionId ?? (args.correlationId as string | undefined),
      requested_by: input.userId,
      parameters: args,
      dry_run: args.dry_run === true || args.dryRun === true,
    });
  }
}
