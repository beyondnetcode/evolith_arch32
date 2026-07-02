import { AgentRuntimeRequest, parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import { InteractionAdapterPort } from '../../domain/ports/interaction-adapter.port';

export interface HermesChatBoxInput {
  readonly message: string;
  readonly conversationId?: string;
  readonly actor?: {
    readonly id?: string;
    readonly roles?: readonly string[];
  };
  readonly context?: {
    readonly tenantId?: string;
    readonly productId?: string;
    readonly initiativeId?: string;
    readonly phase?: string;
    readonly gate?: string;
    readonly correlationId?: string;
  };
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly dryRun?: boolean;
}

export class HermesChatBoxInteractionAdapter implements InteractionAdapterPort<HermesChatBoxInput> {
  readonly sourceInterface = 'hermes_agent_chatbox';

  toRuntimeRequest(input: HermesChatBoxInput): AgentRuntimeRequest {
    return parseAgentRuntimeRequest({
      source_interface: this.sourceInterface,
      intent: input.message,
      tenant: input.context?.tenantId,
      product: input.context?.productId,
      initiative: input.context?.initiativeId,
      phase: input.context?.phase,
      gate: input.context?.gate,
      correlation_id: input.context?.correlationId || input.conversationId,
      requested_by: input.actor?.id,
      parameters: input.parameters,
      dry_run: input.dryRun ?? true, // Hermes chat defaults to dry_run = true
    });
  }
}
