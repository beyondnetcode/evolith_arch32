import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AgentRuntimeModule } from './agent-runtime/agent-runtime.module';
import { HealthController } from './health/health.controller';
import { MetricsController } from './health/metrics.controller';
import { ApiKeyGuard } from './auth/api-key.guard';
import { TenantCorpusGuard } from './auth/tenant-corpus.guard';
import { MetricsAuthGuard } from './auth/metrics-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AgentRuntimeModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    // Global guards run in registration order (GT-439):
    //   1. ApiKeyGuard      — authenticate (API key or tenant JWT), attach principal.
    //   2. TenantCorpusGuard — authorize per-tenant corpus isolation.
    // @Public() routes (health, root, metrics) bypass both.
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: TenantCorpusGuard },
    // GT-549: route-level guard for /metrics (see MetricsController). Not an APP_GUARD —
    // it applies only where @UseGuards(MetricsAuthGuard) is declared.
    MetricsAuthGuard,
  ],
})
export class AppModule {}
