import { AgentRuntimeRequest, AgentRuntimeRequestWire, parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import { InteractionAdapterPort } from '../../domain/ports/interaction-adapter.port';

export class SmartCliCommandInteractionAdapter implements InteractionAdapterPort<AgentRuntimeRequestWire> {
  readonly sourceInterface = 'smart_cli_command' as const;

  toRuntimeRequest(input: AgentRuntimeRequestWire): AgentRuntimeRequest {
    // We enforce the source interface for this specific adapter
    const wireRequest: AgentRuntimeRequestWire = { ...input, source_interface: this.sourceInterface };
    
    // Command interactions are generally not dry_run by default, but we respect if it's explicitly set
    return parseAgentRuntimeRequest(wireRequest);
  }
}
