/**
 * HTTP surface for the Agent Runtime.
 *
 *   POST /v1/agent/handle   — run a request through the governed pipeline
 *   GET  /v1/agent/skills   — list the available capabilities (catalog)
 *
 * The endpoint is thin: it maps the wire payload through the external-trigger
 * interaction adapter, delegates to the runtime, and returns the canonical
 * AgentRuntimeResult. All governance (approval, policy, trazability) happens
 * inside the runtime.
 */

import { BadRequestException, Body, Controller, Get, Inject, Post, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ExternalTriggerInteractionAdapter,
  type AgentRuntimeBundle,
  type AgentRuntimeRequestWire,
} from '@evolith/agent-runtime';
import { AGENT_RUNTIME_BUNDLE } from './runtime.factory';

@Controller('v1/agent')
export class AgentRuntimeController {
  private readonly externalAdapter = new ExternalTriggerInteractionAdapter();

  constructor(@Inject(AGENT_RUNTIME_BUNDLE) private readonly bundle: AgentRuntimeBundle) {}

  @Post('handle')
  async handle(@Body() body: AgentRuntimeRequestWire) {
    let request;
    try {
      request = this.externalAdapter.toRuntimeRequest(body);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid request payload.');
    }
    return this.bundle.runtime.handle(request);
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
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          for await (const event of asyncGenerator) {
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
