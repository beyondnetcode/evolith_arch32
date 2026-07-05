import { AgentRuntimeRequest, AgentSourceInterface } from '../contracts/agent-runtime-request';

export interface InteractionAdapterPort<TInput = unknown> {
  readonly sourceInterface: AgentSourceInterface;

  toRuntimeRequest(input: TInput): AgentRuntimeRequest;
}
