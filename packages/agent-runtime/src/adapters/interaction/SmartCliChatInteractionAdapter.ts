import { AgentRuntimeRequest, AgentRuntimeRequestWire, parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import { InteractionAdapterPort } from '../../domain/ports/interaction-adapter.port';

export class SmartCliChatInteractionAdapter implements InteractionAdapterPort<AgentRuntimeRequestWire> {
  readonly sourceInterface = 'smart_cli_chat' as const;

  toRuntimeRequest(input: AgentRuntimeRequestWire): AgentRuntimeRequest {
    const wireRequest: AgentRuntimeRequestWire = {
      ...input,
      source_interface: this.sourceInterface,
      dry_run: input.dry_run ?? true,
    };
    
    return parseAgentRuntimeRequest(wireRequest);
  }
}
