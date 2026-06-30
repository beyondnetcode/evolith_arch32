import { Module } from '@nestjs/common';
import { AgentRuntimeController } from './agent-runtime.controller';
import { AGENT_RUNTIME_BUNDLE, createRuntimeFromEnv } from './runtime.factory';

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
  ],
})
export class AgentRuntimeModule {}
