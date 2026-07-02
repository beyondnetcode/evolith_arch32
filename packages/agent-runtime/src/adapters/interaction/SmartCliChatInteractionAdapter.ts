import { AgentRuntimeRequest, AgentRuntimeRequestWire, parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import { InteractionAdapterPort } from '../../domain/ports/interaction-adapter.port';

export class SmartCliChatInteractionAdapter implements InteractionAdapterPort<AgentRuntimeRequestWire> {
  readonly sourceInterface = 'smart_cli_chat';

  toRuntimeRequest(input: AgentRuntimeRequestWire): AgentRuntimeRequest {
    const wireRequest = { ...input, source_interface: this.sourceInterface };
    
    // Chat interactions are heavily guarded, dry_run = true by default unless explicitly provided (handled downstream usually, but we can set it here if missing)
    if (wireRequest.dry_run === undefined) {
        wireRequest.dry_run = true;
    }
    
    return parseAgentRuntimeRequest(wireRequest);
  }
}
