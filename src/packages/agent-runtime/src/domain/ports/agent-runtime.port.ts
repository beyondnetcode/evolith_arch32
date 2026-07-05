/**
 * IAgentRuntime — the primary INBOUND (driving) port.
 *
 * Implemented by the application service ({@link AgentRuntimeService}). Callers
 * (Tracker, CLI, chat, scheduler) depend only on this interface, never on the
 * concrete orchestration or any underlying adapter/engine.
 */

import type { AgentRuntimeRequest } from '../contracts/agent-runtime-request';
import type { AgentRuntimeResult } from '../contracts/agent-runtime-result';
import type { RuntimeEvent } from '../contracts/runtime-event';

export interface IAgentRuntime {
  /**
   * Run the full pipeline for one request: resolve context, select a governed
   * capability, invoke ports, validate, trace, and return a result. Never
   * throws for governed outcomes (returns `blocked`/`warning`); only unexpected
   * runtime failures surface as `status: 'error'`.
   */
  handle(request: AgentRuntimeRequest): Promise<AgentRuntimeResult>;

  /**
   * Run the full pipeline for one request, yielding real-time events as they occur.
   * Returns an AsyncGenerator that yields RuntimeEvents and finally yields a result event.
   */
  handleStream(request: AgentRuntimeRequest): AsyncGenerator<RuntimeEvent, void>;
}
