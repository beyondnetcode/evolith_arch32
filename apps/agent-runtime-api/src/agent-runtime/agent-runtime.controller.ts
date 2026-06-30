/**
 * HTTP surface for the Agent Runtime.
 *
 *   POST /v1/agent/handle   — run a request through the governed pipeline
 *   GET  /v1/agent/skills   — list the available capabilities (catalog)
 *
 * The endpoint is thin: it parses the wire payload into an AgentRuntimeRequest,
 * delegates to the runtime, and returns the canonical AgentRuntimeResult. All
 * governance (approval, policy, trazability) happens inside the runtime.
 */

import { BadRequestException, Body, Controller, Get, Inject, Post } from '@nestjs/common';
import {
  parseAgentRuntimeRequest,
  type AgentRuntimeBundle,
  type AgentRuntimeRequestWire,
} from '@evolith/agent-runtime';
import { AGENT_RUNTIME_BUNDLE } from './runtime.factory';

@Controller('v1/agent')
export class AgentRuntimeController {
  constructor(@Inject(AGENT_RUNTIME_BUNDLE) private readonly bundle: AgentRuntimeBundle) {}

  @Post('handle')
  async handle(@Body() body: AgentRuntimeRequestWire) {
    let request;
    try {
      request = parseAgentRuntimeRequest(body);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid request payload.');
    }
    return this.bundle.runtime.handle(request);
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
