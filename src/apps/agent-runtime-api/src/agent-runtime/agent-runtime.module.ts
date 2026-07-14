import { Module } from '@nestjs/common';
import { AgentRuntimeController } from './agent-runtime.controller';
import { AGENT_RUNTIME_BUNDLE, createRuntimeFromEnv } from './runtime.factory';
import { AgentMetricsService } from '../health/agent-metrics.service';

/**
 * Wires the Agent Runtime bundle as a singleton provider built from the
 * environment. Swapping adapters is a config change (env vars), never a code
 * change here.
 */
@Module({
  controllers: [AgentRuntimeController],
  providers: [
    {
      provide: AGENT_RUNTIME_BUNDLE,
      useFactory: () => createRuntimeFromEnv(),
    },
    // GT-546: agent-execution metrics. Registers on the default prom registry, so the
    // @Public /metrics controller exposes them; instantiated here so the controller can inject it.
    AgentMetricsService,
  ],
})
export class AgentRuntimeModule {}
