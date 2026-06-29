import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from './presentation/controllers/health.controller';
import { HealthService } from './application/services/health.service';
import { GatesController } from './presentation/controllers/gates.controller';
import { ProjectsController } from './presentation/controllers/projects.controller';
import { ArchitectureController } from './presentation/controllers/architecture.controller';
import { PhasesController } from './presentation/controllers/phases.controller';
import { MetricsController } from './presentation/controllers/metrics.controller';
import { EvaluationController } from './presentation/controllers/evaluation.controller';
import { CoreDomainModule } from './core-domain.module';
import { CorrelationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';
import { validateEnv } from './infrastructure/config/env.validation';
import { AuditThrottlerGuard } from './infrastructure/guards/audit-throttler.guard';
import { MetricsService } from './infrastructure/metrics/metrics.service';
import { CircuitBreakerService } from './infrastructure/resilience/circuit-breaker.service';
import { CoreReferenceQueryService } from './application/services/core-reference-query.service';
import { ReferenceController } from './presentation/controllers/reference.controller';
import { ComposableValidateController } from './presentation/controllers/composable-validate.controller';
import { SatellitesController } from './presentation/controllers/satellites.controller';
import { WorkspaceReferenceResolverService } from './application/services/workspace-reference-resolver.service';
import { SatelliteRegistryService } from './application/services/satellite-registry.service';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';
import { Verdict } from '@evolith/core-domain';
import {
  EvaluationOrchestrator,
  type IEvaluationPipeline,
  type IWorkspaceReferenceResolver,
  type KindEvaluator,
} from '@evolith/core-domain/evaluation';

/** Core version stamped into EvaluationResult.versions.core (GT-378). */
const CORE_VERSION = '1.0.5';

/** Maps a MUST/SHOULD/COULD severity to a canonical RiskLevel. */
function severityToRisk(s: string): 'low' | 'medium' | 'high' | 'critical' {
  if (s === 'MUST') return 'high';
  if (s === 'SHOULD') return 'medium';
  return 'low';
}
import { RedisCacheModule } from './infrastructure/cache/redis-cache.module';
import { CacheMetricsService } from './infrastructure/cache/cache-metrics.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CoreDomainModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: false,
        quietReqLogger: true,
      },
    }),
    RedisCacheModule,
  ],
  controllers: [
    HealthController,
    GatesController,
    ProjectsController,
    ArchitectureController,
    PhasesController,
    MetricsController,
    EvaluationController,
    ReferenceController,
    ComposableValidateController,
    SatellitesController,
  ],
  providers: [
    HealthService,
    MetricsService,
    CacheMetricsService,
    CircuitBreakerService,
    CoreReferenceQueryService,
    WorkspaceReferenceResolverService,
    SatelliteRegistryService,
    {
      // GT-378 (L2): the stateless Core Evaluation Engine entry point.
      // Adapts the existing pipeline (via ValidateSatelliteUseCase) and the
      // opaque workspaceRef resolver to the canonical evaluation ports.
      provide: EvaluationOrchestrator,
      useFactory: (
        validateSatellite: ValidateSatelliteUseCase,
        workspaceResolver: WorkspaceReferenceResolverService,
        driftService: ArchitectureDriftService,
      ) => {
        const pipeline: IEvaluationPipeline = {
          evaluate: async (manifest) => {
            const out = await validateSatellite.execute({
              satellitePath: manifest.satellitePath,
              corePath: manifest.corePath,
              manifest,
            });
            if (!out.evaluationVerdict) {
              throw new Error('Evaluation pipeline produced no verdict');
            }
            return out.evaluationVerdict;
          },
        };
        const resolver: IWorkspaceReferenceResolver = {
          resolve: async (workspaceRef: string) => ({
            satellitePath: workspaceResolver.resolve(workspaceRef),
            corePath: workspaceResolver.corePath(),
          }),
        };

        // GT-379: architecture kind — wraps ArchitectureDriftService and maps
        // its DriftReport to the canonical ArchitectureEvaluationResult.
        const architectureEvaluator: KindEvaluator = {
          kind: 'architecture',
          evaluate: async (ctx, ws) => {
            const report = await driftService.detectDrift({
              projectPath: ws.satellitePath,
              corePath: ws.corePath,
              declaredLevel: ctx.topologyRef as 'F1' | 'F2' | 'F3' | undefined,
            });
            const violations = [...report.newViolations, ...report.persistentViolations];
            const risks = violations.map((v) => ({
              id: v.ruleId,
              level: severityToRisk(v.severity),
              category: v.category || 'architecture',
              message: v.title,
            }));
            const gaps = violations.map((v) => ({
              id: v.ruleId,
              requirementRef: v.ruleId,
              severity: (v.blocking ? 'error' : 'warning') as 'error' | 'warning' | 'info',
              message: v.description,
            }));
            const verdict = report.driftDetected ? Verdict.FAIL : Verdict.PASS;
            return {
              verdict,
              results: {
                architecture: { verdict, definitionRef: report.detectedLevel, risks, gaps, recommendations: [] },
              },
              gaps,
              risks,
            };
          },
        };

        return new EvaluationOrchestrator(pipeline, resolver, CORE_VERSION, [architectureEvaluator]);
      },
      inject: [ValidateSatelliteUseCase, WorkspaceReferenceResolverService, ArchitectureDriftService],
    },
    {
      provide: APP_GUARD,
      useClass: AuditThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
