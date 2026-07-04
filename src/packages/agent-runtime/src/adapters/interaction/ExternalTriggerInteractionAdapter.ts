import {
  AgentRuntimeRequest,
  AgentRuntimeRequestWire,
  parseAgentRuntimeRequest,
} from '../../domain/contracts/agent-runtime-request';
import { InteractionAdapterPort } from '../../domain/ports/interaction-adapter.port';

export class ExternalTriggerInteractionAdapter implements InteractionAdapterPort<AgentRuntimeRequestWire> {
  readonly sourceInterface = 'external_trigger' as const;

  toRuntimeRequest(input: AgentRuntimeRequestWire): AgentRuntimeRequest {
    return parseAgentRuntimeRequest({
      ...input,
      source_interface: this.sourceInterface,
    });
  }
}
