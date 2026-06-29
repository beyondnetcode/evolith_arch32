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
import { Verdict, CANONICAL_PHASE_IDS, normalizePhaseId } from '@evolith/core-domain';
import type { PhaseId } from '@evolith/core-domain';
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

/** Next canonical SDLC phase after `phase` (or itself if it is the last). */
function nextPhase(phase: PhaseId): PhaseId {
  const i = CANONICAL_PHASE_IDS.indexOf(phase);
  return i >= 0 && i < CANONICAL_PHASE_IDS.length - 1 ? CANONICAL_PHASE_IDS[i + 1] : phase;
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

        // GT-379: checkpoint kind — proposes phase advance (non-mutating) via the
        // existing gate evaluation, mapped to a CheckpointEvaluationResult.
        const checkpointEvaluator: KindEvaluator = {
          kind: 'checkpoint',
          evaluate: async (ctx, ws) => {
            const fromPhase = ctx.phaseId ? normalizePhaseId(ctx.phaseId) : undefined;
            if (!fromPhase) {
              return { verdict: Verdict.SKIP, results: {} };
            }
            const proposal = await proposeAdvance.execute({
              fromPhase,
              toPhase: nextPhase(fromPhase),
              projectPath: ws.satellitePath,
              corePath: ws.corePath,
              evaluatedBy: 'agent',
            });
            const verdict = proposal.isRecommended ? Verdict.PASS : Verdict.FAIL;
            const gaps = (proposal.evidence.violations ?? []).map((v) => ({
              id: v.ruleId,
              requirementRef: v.ruleId,
              severity: (v.severity === 'error' ? 'error' : v.severity === 'warning' ? 'warning' : 'info') as 'error' | 'warning' | 'info',
              message: v.message,
            }));
            return {
              verdict,
              results: {
                checkpoint: [{
                  checkpointId: ctx.checkpoint?.checkpointId ?? `${fromPhase}->${proposal.toPhase}`,
                  phaseId: fromPhase,
                  verdict,
                  gaps,
                }],
              },
              gaps,
            };
          },
        };

        // GT-379: topology kind — validates the requested topology against the
        // Core catalog (Topology Recommendation Engine), mapped to TopologyEvaluationResult.
        const topologyEvaluator: KindEvaluator = {
          kind: 'topology',
          evaluate: async (ctx, ws) => {
            const corePath = ws.corePath ?? workspaceResolver.corePath();
            if (!ctx.topologyRef) {
              return { verdict: Verdict.SKIP, results: {} };
            }
            const found = await topologyCatalog.get(corePath, ctx.topologyRef);
            const conformant = !!found;
            const verdict = conformant ? Verdict.PASS : Verdict.FAIL;
            const gaps = conformant
              ? []
              : [{
                  id: 'TOPOLOGY_UNKNOWN',
                  requirementRef: ctx.topologyRef,
                  severity: 'error' as const,
                  message: `Topology "${ctx.topologyRef}" not found in the Core catalog.`,
                }];
            const recommendations = conformant
              ? [{ id: 'topology', kind: 'topology' as const, message: `Topology "${ctx.topologyRef}" is applicable.` }]
              : [{
                  id: 'topology-options',
                  kind: 'topology' as const,
                  message: 'Pick a topology from the Core catalog.',
                  references: (await topologyCatalog.list(corePath)).map((m) => m.metadata.id),
                }];
            return {
              verdict,
              results: { topology: { topologyRef: ctx.topologyRef, verdict, conformant, gaps, recommendations } },
              gaps,
              recommendations,
            };
          },
        };

        return new EvaluationOrchestrator(pipeline, resolver, CORE_VERSION, [
          architectureEvaluator,
          checkpointEvaluator,
          topologyEvaluator,
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
