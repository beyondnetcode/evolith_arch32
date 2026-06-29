/**
 * Core Evaluation Engine — concrete KindEvaluators for core-api (GT-379).
 *
 * Each factory wraps an existing DI-provided service and maps its native output
 * to the canonical sub-result, so the EvaluationOrchestrator can dispatch the
 * `architecture`, `checkpoint` and `topology` kinds. Extracted from AppModule
 * for testability (the mapping logic now has unit tests).
 */

import { Verdict, CANONICAL_PHASE_IDS, normalizePhaseId } from '@evolith/core-domain';
import type { PhaseId } from '@evolith/core-domain';
import type { KindEvaluator } from '@evolith/core-domain/evaluation';
import type { ArchitectureDriftService } from '@evolith/core-domain/application/validators';
import type { ProposePhaseAdvanceUseCase } from '@evolith/core-domain/application/use-cases';
import type { TopologyCatalogService } from '@evolith/core-domain/application/services';

/** Maps a MUST/SHOULD/COULD severity to a canonical RiskLevel. */
export function severityToRisk(s: string): 'low' | 'medium' | 'high' | 'critical' {
  if (s === 'MUST') return 'high';
  if (s === 'SHOULD') return 'medium';
  return 'low';
}

/** Next canonical SDLC phase after `phase` (or itself if it is the last). */
export function nextPhase(phase: PhaseId): PhaseId {
  const i = CANONICAL_PHASE_IDS.indexOf(phase);
  return i >= 0 && i < CANONICAL_PHASE_IDS.length - 1 ? CANONICAL_PHASE_IDS[i + 1] : phase;
}

/** architecture kind — wraps ArchitectureDriftService → ArchitectureEvaluationResult. */
export function createArchitectureKindEvaluator(
  driftService: ArchitectureDriftService,
): KindEvaluator {
  return {
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
}

/** checkpoint kind — non-mutating phase-advance proposal → CheckpointEvaluationResult. */
export function createCheckpointKindEvaluator(
  proposeAdvance: ProposePhaseAdvanceUseCase,
): KindEvaluator {
  return {
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
}

/** topology kind — validates ctx.topologyRef against the Core catalog → TopologyEvaluationResult. */
export function createTopologyKindEvaluator(
  topologyCatalog: TopologyCatalogService,
  resolveCorePath: () => string,
): KindEvaluator {
  return {
    kind: 'topology',
    evaluate: async (ctx, ws) => {
      const corePath = ws.corePath ?? resolveCorePath();
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
}

type Gap = { id: string; requirementRef: string; severity: 'error' | 'warning' | 'info'; message: string };
type Risk = { id: string; level: 'low' | 'medium' | 'high' | 'critical'; category: string; message: string };

/**
 * blueprint kind (GT-379) — stateless conformance of the declared `ctx.blueprintRef`
 * against the Core's published blueprint definitions. The Core receives an opaque ref
 * (not a Blueprint entity), so evaluation is ref-resolution against the Core catalog —
 * the same altitude as the topology evaluator, and side-effect-free (does NOT use the
 * mutating ValidateBlueprintUseCase). SKIP when no blueprintRef is declared.
 */
export function createBlueprintKindEvaluator(
  blueprintExists: (corePath: string, blueprintRef: string) => Promise<boolean>,
  resolveCorePath: () => string,
): KindEvaluator {
  return {
    kind: 'blueprint',
    evaluate: async (ctx, ws) => {
      if (!ctx.blueprintRef) {
        return { verdict: Verdict.SKIP, results: {} };
      }
      const corePath = ws.corePath ?? resolveCorePath();
      const found = await blueprintExists(corePath, ctx.blueprintRef);
      const verdict = found ? Verdict.PASS : Verdict.FAIL;
      const gaps: Gap[] = found
        ? []
        : [{
            id: 'BLUEPRINT_UNKNOWN',
            requirementRef: ctx.blueprintRef,
            severity: 'error',
            message: `Blueprint "${ctx.blueprintRef}" does not resolve to a Core blueprint definition.`,
          }];
      const requiredActions = found
        ? []
        : [{
            id: 'declare-known-blueprint',
            description: 'Reference a blueprint published in the Core (reference/architecture/blueprints/).',
            blocking: true,
            remediation: 'Use a blueprintRef that resolves to a Core blueprint definition.',
          }];
      return {
        verdict,
        results: { blueprint: { blueprintRef: ctx.blueprintRef, verdict, gaps, requiredActions } },
        gaps,
        requiredActions,
      };
    },
  };
}

/**
 * deployment kind (GT-379) — stateless evaluation of the declared `ctx.deployment`
 * (environment/releaseRef/status). The Core has no deployment engine; it evaluates the
 * facts the consumer declares. SKIP when no deployment context is declared.
 */
export function createDeploymentKindEvaluator(): KindEvaluator {
  return {
    kind: 'deployment',
    evaluate: async (ctx) => {
      const dep = ctx.deployment;
      if (!dep) {
        return { verdict: Verdict.SKIP, results: {} };
      }
      const gaps: Gap[] = [];
      if (!dep.environment) {
        gaps.push({ id: 'DEPLOY-ENV-MISSING', requirementRef: 'deployment.environment', severity: 'error', message: 'Deployment environment is required.' });
      }
      if (!dep.releaseRef) {
        gaps.push({ id: 'DEPLOY-RELEASE-MISSING', requirementRef: 'deployment.releaseRef', severity: 'error', message: 'Deployment releaseRef is required.' });
      }
      const risks: Risk[] = [];
      if (dep.status === 'failed' || dep.status === 'rolled-back') {
        risks.push({ id: 'DEPLOY-STATUS-ADVERSE', level: 'high', category: 'deployment', message: `Declared deployment status is "${dep.status}".` });
      }
      const verdict = gaps.length > 0 ? Verdict.FAIL : Verdict.PASS;
      return {
        verdict,
        results: { deployment: { environment: dep.environment ?? '', releaseRef: dep.releaseRef ?? '', verdict, gaps, risks } },
        gaps,
        risks,
      };
    },
  };
}
