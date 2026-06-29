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
