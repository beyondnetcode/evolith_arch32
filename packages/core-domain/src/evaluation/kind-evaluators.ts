/**
 * Core Evaluation Engine — canonical KindEvaluators (GT-379 / W-Parity).
 *
 * Each factory wraps a Core domain service and maps its native output to the
 * canonical sub-result so the EvaluationOrchestrator can dispatch the
 * `architecture`, `checkpoint`, `topology`, `blueprint` and `deployment` kinds.
 *
 * These factories used to live in apps/core-api; they were promoted here so ALL
 * surfaces (core-api, CLI, MCP) register the SAME evaluator set — closing the
 * BR-008 parity gap where the CLI/MCP orchestrators registered ZERO evaluators
 * and silently returned nothing for non-core kinds. Use `createDefaultKindEvaluators`
 * for a fully-wired set built from just a filesystem + logger.
 *
 * Lives in the `evaluation` layer (not `application`) because the boundary rules
 * allow evaluation→application but not application→evaluation (the KindEvaluator
 * port is an evaluation contract).
 */

import { Verdict } from '../domain/verdict/verdict';
import { CANONICAL_PHASE_IDS, normalizePhaseId } from '../domain/sdlc/phase-id';
import type { PhaseId } from '../domain/sdlc/phase-id';
import type { IFileSystem, ILogger } from '../domain/interfaces';
import type { KindEvaluator } from './ports/kind-evaluator.port';
import { ArchitectureDriftService } from '../application/validators/architecture-drift.service';
import { PhaseGateValidatorService } from '../application/validators/phase-gate-validator.service';
import { EvaluateGateUseCase } from '../application/use-cases/evaluate-gate.use-case';
import { ProposePhaseAdvanceUseCase } from '../application/use-cases/propose-phase-advance.use-case';
import { TopologyCatalogService } from '../application/services/topology-catalog.service';

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

/** Dependencies for the fully-wired default evaluator set. */
export interface DefaultKindEvaluatorDeps {
  readonly fileSystem: IFileSystem;
  readonly logger: ILogger;
  /** Resolves the Core repository path when a context/workspace omits corePath. */
  readonly resolveCorePath: () => string;
}

/**
 * Build the canonical set of all five KindEvaluators from minimal primitives
 * (a filesystem + logger). This is the single composition root every surface
 * (core-api, CLI, MCP) shares, so the registered evaluator set cannot drift —
 * the structural guarantee behind BR-008 parity.
 */
export function createDefaultKindEvaluators(deps: DefaultKindEvaluatorDeps): KindEvaluator[] {
  const { fileSystem, logger, resolveCorePath } = deps;

  const validatorFactory = (corePath?: string) =>
    new PhaseGateValidatorService(corePath, { fileSystem, logger });
  const evaluateGate = new EvaluateGateUseCase(validatorFactory);
  const proposeAdvance = new ProposePhaseAdvanceUseCase(evaluateGate);
  const driftService = new ArchitectureDriftService(undefined, { fileSystem, logger });
  const topologyCatalog = new TopologyCatalogService(fileSystem, logger);

  const blueprintExists = async (corePath: string, blueprintRef: string): Promise<boolean> => {
    const base = `${corePath}/reference/architecture/blueprints`;
    const candidates = [`${base}/${blueprintRef}`, `${base}/${blueprintRef}.md`, `${corePath}/${blueprintRef}`];
    for (const candidate of candidates) {
      if (await fileSystem.exists(candidate)) return true;
    }
    return false;
  };

  return [
    createArchitectureKindEvaluator(driftService),
    createCheckpointKindEvaluator(proposeAdvance),
    createTopologyKindEvaluator(topologyCatalog, resolveCorePath),
    createBlueprintKindEvaluator(blueprintExists, resolveCorePath),
    createDeploymentKindEvaluator(),
  ];
}
