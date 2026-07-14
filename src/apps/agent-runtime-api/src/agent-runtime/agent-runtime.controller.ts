/**
 * HTTP surface for the Agent Runtime.
 *
 *   POST /v1/agent/handle    — run a request through the governed pipeline
 *   POST /v1/agent/converse  — CANONICAL adapter-neutral conversational entry
 *   POST /v1/agent/hermes    — DEPRECATED alias of /converse (back-compat only)
 *   POST /v1/agent/stream    — SSE stream of runtime events
 *   GET  /v1/agent/skills    — list the available capabilities (catalog)
 *
 * The conversational surface is intentionally ADAPTER-NEUTRAL: `/converse` is
 * the public name, so the engine adapter behind IAgentEnginePort can be swapped
 * without renaming anything public. `HermesChatBoxInteractionAdapter` remains a
 * legitimate adapter implementation name, but it is no longer the public
 * surface name; `/hermes` is kept only as a thin deprecated back-compat alias
 * that delegates to the exact same handler as `/converse`.
 *
 * The endpoint is thin: it maps the wire payload through the appropriate
 * interaction adapter, delegates to the runtime, and returns the canonical
 * AgentRuntimeResult. All governance (approval, policy, trazability) happens
 * inside the runtime.
 */

import { BadRequestException, Body, Controller, Get, Inject, Optional, Post, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ExternalTriggerInteractionAdapter,
  HermesChatBoxInteractionAdapter,
  type AgentRuntimeBundle,
  type AgentRuntimeRequest,
  type AgentRuntimeRequestWire,
  type AgentRuntimeResult,
} from '@beyondnet/evolith-agent-runtime';
import { AGENT_RUNTIME_BUNDLE } from './runtime.factory';
import { AgentMetricsService } from '../health/agent-metrics.service';

/**
 * Adapter-neutral conversational input shape shared by `/converse` (canonical)
 * and `/hermes` (deprecated alias). Matches the HermesChatBoxInput contract the
 * interaction adapter expects, but is named engine-agnostically.
 */
interface ConversationalInput {
  message: string;
  conversationId?: string;
  actor?: { id?: string; roles?: string[] };
  context?: {
    tenantId?: string;
    productId?: string;
    initiativeId?: string;
    phase?: string;
    gate?: string;
    correlationId?: string;
  };
  parameters?: Record<string, unknown>;
  dryRun?: boolean;
}

@Controller('v1/agent')
export class AgentRuntimeController {
  private readonly externalAdapter = new ExternalTriggerInteractionAdapter();
  private readonly hermesAdapter = new HermesChatBoxInteractionAdapter();

  constructor(
    @Inject(AGENT_RUNTIME_BUNDLE) private readonly bundle: AgentRuntimeBundle,
    // Optional so unit tests that don't assert metrics need not provide it.
    @Optional() private readonly metrics?: AgentMetricsService,
  ) {}

  @Post('handle')
  async handle(@Body() body: AgentRuntimeRequestWire) {
    let request;
    try {
      request = this.externalAdapter.toRuntimeRequest(body);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid request payload.');
    }
    return this.runInstrumented(request);
  }

  /**
   * Run the governed pipeline and record the GT-546 agent-execution metrics
   * (run volume/verdict, latency, skill, Core call, HITL) from the result. The
   * metrics are a side-observation — the returned result is unchanged.
   */
  private async runInstrumented(request: AgentRuntimeRequest): Promise<AgentRuntimeResult> {
    const start = Date.now();
    const result = await this.bundle.runtime.handle(request);
    this.metrics?.recordRun(result, (Date.now() - start) / 1000);
    return result;
  }

  /**
   * CANONICAL adapter-neutral conversational entry point.
   *
   * Accepts the conversational input shape (message, conversationId, actor,
   * context, parameters, dryRun) and routes it through the governed runtime
   * pipeline. The interaction adapter used underneath is an implementation
   * detail; the public surface name is intentionally engine-agnostic.
   */
  @Post('converse')
  async converse(@Body() body: ConversationalInput) {
    return this.handleConversation(body);
  }

  /**
   * GT-400: DEPRECATED conversational alias, kept for back-compat only.
   *
   * Delegates to the exact same handler as `/converse`. Prefer `/converse`;
   * this alias may be removed in a future major version.
   *
   * @deprecated Use `POST /v1/agent/converse` instead.
   */
  @Post('hermes')
  async hermes(@Body() body: ConversationalInput) {
    return this.handleConversation(body);
  }

  /**
   * Shared conversational handler backing both `/converse` (canonical) and
   * `/hermes` (deprecated alias). Maps the wire payload through the interaction
   * adapter and delegates to the governed runtime.
   */
  private handleConversation(body: ConversationalInput) {
    let request;
    try {
      request = this.hermesAdapter.toRuntimeRequest(body);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid request payload.');
    }
    return this.runInstrumented(request);
  }

  @Post('stream')
  @Sse('stream')
  stream(@Body() body: AgentRuntimeRequestWire): Observable<MessageEvent> {
    let request;
    try {
      request = this.externalAdapter.toRuntimeRequest(body);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid request payload.');
    }

    // Convert AsyncGenerator to Observable
    const asyncGenerator = this.bundle.runtime.handleStream(request);
    const metrics = this.metrics;
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        const start = Date.now();
        try {
          for await (const event of asyncGenerator) {
            // GT-546: the terminal event carries the assembled result — record the run
            // metrics for streamed executions too, at parity with handle()/converse().
            if (event.result) metrics?.recordRun(event.result, (Date.now() - start) / 1000);
            subscriber.next({
              data: event,
              id: Date.now().toString(),
              type: event.type
            });
          }
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }

  @Get('skills')
  async skills() {
    const skills = await this.bundle.deps.skillRegistry.list();
    return {
      count: skills.length,
      skills: skills.map((s) => ({
        id: s.id,
        description: s.description,
        intents: s.intents,
        kind: s.kind,
        requiresApproval: s.requiresApproval,
        requiresPolicy: s.requiresPolicy,
        emitsTrace: s.emitsTrace,
      })),
    };
  }
}
