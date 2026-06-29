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
import { ValidateSatelliteUseCase, ProposePhaseAdvanceUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';
import { TopologyCatalogService } from '@evolith/core-domain/application/services';
import {
  EvaluationOrchestrator,
  type IEvaluationPipeline,
  type IWorkspaceReferenceResolver,
  // KindEvaluator factories now live in @evolith/core-domain/evaluation (W-Parity)
  // so core-api, CLI and MCP register the same evaluator set.
  createArchitectureKindEvaluator,
  createCheckpointKindEvaluator,
  createTopologyKindEvaluator,
  createBlueprintKindEvaluator,
  createDeploymentKindEvaluator,
} from '@evolith/core-domain/evaluation';
import * as fs from 'fs';
import * as path from 'path';

/** Resolves whether an opaque blueprintRef matches a Core blueprint definition on disk. */
const blueprintExists = async (corePath: string, blueprintRef: string): Promise<boolean> => {
  const base = path.join(corePath, 'reference', 'architecture', 'blueprints');
  return [
    path.join(base, blueprintRef),
    path.join(base, `${blueprintRef}.md`),
    path.join(corePath, blueprintRef),
  ].some((p) => fs.existsSync(p));
};

/** Core version stamped into EvaluationResult.versions.core (GT-378). */
const CORE_VERSION = '1.0.5';
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
        proposeAdvance: ProposePhaseAdvanceUseCase,
        topologyCatalog: TopologyCatalogService,
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

        // GT-379: dispatch the architecture/checkpoint/topology kinds via dedicated,
        // unit-tested evaluators (see application/evaluation/kind-evaluators.ts).
        return new EvaluationOrchestrator(pipeline, resolver, CORE_VERSION, [
          createArchitectureKindEvaluator(driftService),
          createCheckpointKindEvaluator(proposeAdvance),
          createTopologyKindEvaluator(topologyCatalog, () => workspaceResolver.corePath()),
          createBlueprintKindEvaluator(blueprintExists, () => workspaceResolver.corePath()),
          createDeploymentKindEvaluator(),
        ]);
      },
      inject: [
        ValidateSatelliteUseCase,
        WorkspaceReferenceResolverService,
        ArchitectureDriftService,
        ProposePhaseAdvanceUseCase,
        TopologyCatalogService,
      ],
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
