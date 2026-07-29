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
import { ArchitecturePlanModule } from './architecture-plan/architecture-plan.module';
import { CoreDomainModule } from './core-domain.module';
import { CorrelationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';
import { validateEnv } from './infrastructure/config/env.validation';
import { AuditThrottlerGuard } from './infrastructure/guards/audit-throttler.guard';
import { ApiKeyGuard } from './infrastructure/guards/api-key.guard';
import { MetricsService } from './infrastructure/metrics/metrics.service';
import { CoreReferenceQueryService } from './application/services/core-reference-query.service';
import { ReferenceController } from './presentation/controllers/reference.controller';
import { CapabilitiesController } from './presentation/controllers/capabilities.controller';
import { ComposableValidateController } from './presentation/controllers/composable-validate.controller';
import { SatellitesController } from './presentation/controllers/satellites.controller';
import { WorkspaceReferenceResolverService } from './application/services/workspace-reference-resolver.service';
import { SatelliteRegistryService } from './application/services/satellite-registry.service';
import { ValidateSatelliteUseCase, ProposePhaseAdvanceUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { ArchitectureDriftService } from '@beyondnet/evolith-core-domain/application/validators';
import { TopologyCatalogService } from '@beyondnet/evolith-core-domain/application/services';
import {
  EvaluationOrchestrator,
  type IEvaluationPipeline,
  type IWorkspaceReferenceResolver,
  // KindEvaluator factories now live in @beyondnet/evolith-core-domain/evaluation (W-Parity)
  // so core-api, CLI and MCP register the same evaluator set.
  createArchitectureKindEvaluator,
  createCheckpointKindEvaluator,
  createTopologyKindEvaluator,
  createBlueprintKindEvaluator,
  createDeploymentKindEvaluator,
} from '@beyondnet/evolith-core-domain/evaluation';
import {
  CORE_VERSION,
  EVALUATION_ORCHESTRATOR_FACTORY,
  makeEvaluationOrchestratorFactory,
  type EvaluationOrchestratorFactory,
} from './application/evaluation/evaluation-orchestrator.factory';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolves whether an opaque blueprintRef matches a Core blueprint definition on disk.
 *
 * GT-632: the base was `reference/architecture/blueprints` — a directory the
 * `src/` refactor moved to `reference/core/architecture/blueprints`. Nothing
 * threw: `fs.existsSync` on a missing directory is simply `false`, so every
 * blueprint reference evaluated as "does not exist" and the blueprint kind
 * reported a clean, confident, wrong verdict.
 *
 * Exported so `app.module.spec.ts` can pin it against the real repository
 * layout; the previous shape was module-private and therefore untestable, which
 * is how the wrong path survived.
 */
export const blueprintExists = async (corePath: string, blueprintRef: string): Promise<boolean> => {
  const base = path.join(corePath, 'reference', 'core', 'architecture', 'blueprints');
  return [
    path.join(base, blueprintRef),
    path.join(base, `${blueprintRef}.md`),
    path.join(corePath, blueprintRef),
  ].some((p) => fs.existsSync(p));
};

import { InMemoryCacheModule } from './infrastructure/cache/in-memory-cache.module';
import { CacheMetricsService } from './infrastructure/cache/cache-metrics.service';

@Module({
  imports: [
    ArchitecturePlanModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CoreDomainModule,
    ThrottlerModule.forRoot([{
      ttl: Number(process.env.THROTTLE_TTL_MS) || 60000,
      limit: Number(process.env.THROTTLE_MAX_REQUESTS) || 100,
    }]),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: false,
        quietReqLogger: true,
      },
    }),
    InMemoryCacheModule,
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
    CapabilitiesController,
    ComposableValidateController,
    SatellitesController,
  ],
  providers: [
    HealthService,
    MetricsService,
    CacheMetricsService,
    CoreReferenceQueryService,
    WorkspaceReferenceResolverService,
    SatelliteRegistryService,
    {
      // GT-573: the SINGLE construction site for the Core Evaluation Engine.
      // Both `POST /api/v1/evaluate` branches (canonical workspaceRef and inline
      // evaluationInput.files) build their orchestrator here, so one operation
      // has exactly one response shape.
      //
      // GT-379: dispatch the architecture/checkpoint/topology kinds via dedicated,
      // unit-tested evaluators (see @beyondnet/evolith-core-domain/evaluation).
      provide: EVALUATION_ORCHESTRATOR_FACTORY,
      useFactory: (
        workspaceResolver: WorkspaceReferenceResolverService,
        driftService: ArchitectureDriftService,
        proposeAdvance: ProposePhaseAdvanceUseCase,
        topologyCatalog: TopologyCatalogService,
      ): EvaluationOrchestratorFactory =>
        makeEvaluationOrchestratorFactory([
          createArchitectureKindEvaluator(driftService),
          createCheckpointKindEvaluator(proposeAdvance),
          createTopologyKindEvaluator(topologyCatalog, () => workspaceResolver.corePath()),
          createBlueprintKindEvaluator(blueprintExists, () => workspaceResolver.corePath()),
          createDeploymentKindEvaluator(),
        ], CORE_VERSION),
      inject: [
        WorkspaceReferenceResolverService,
        ArchitectureDriftService,
        ProposePhaseAdvanceUseCase,
        TopologyCatalogService,
      ],
    },
    {
      // GT-378 (L2): the stateless Core Evaluation Engine entry point.
      // Adapts the existing pipeline (via ValidateSatelliteUseCase) and the
      // opaque workspaceRef resolver to the canonical evaluation ports.
      provide: EvaluationOrchestrator,
      useFactory: (
        validateSatellite: ValidateSatelliteUseCase,
        workspaceResolver: WorkspaceReferenceResolverService,
        makeOrchestrator: EvaluationOrchestratorFactory,
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

        return makeOrchestrator(pipeline, resolver);
      },
      inject: [
        ValidateSatelliteUseCase,
        WorkspaceReferenceResolverService,
        EVALUATION_ORCHESTRATOR_FACTORY,
      ],
    },
    {
      provide: APP_GUARD,
      useClass: AuditThrottlerGuard,
    },
    {
      // Closes ARCH item 26: API-key auth on CORE-API. Opt-in (enforced only
      // when EVOLITH_API_KEY is set) so enabling it never breaks prod in one
      // deploy. @Public() routes (health probes) bypass it.
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
