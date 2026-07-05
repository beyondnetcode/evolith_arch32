import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AgentRuntimeModule } from './agent-runtime/agent-runtime.module';
import { HealthController } from './health/health.controller';
import { MetricsController } from './health/metrics.controller';
import { ApiKeyGuard } from './auth/api-key.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AgentRuntimeModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    // Global API-key guard; @Public() routes (health, root) bypass it.
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
