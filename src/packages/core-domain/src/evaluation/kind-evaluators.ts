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
import { renderChain, summarizeRepoFacts } from './contracts/repo-facts';
import type { StructuralFactsSummary } from './contracts/repo-facts';
import { diffDriftSignalReports, summarizeDriftSignals } from './contracts/drift-signals';
import type { DriftConformanceDelta, DriftSignalReport } from './contracts/drift-signals';
import type { IFileSystem, ILogger, IConfigParser } from '../domain/interfaces';
import type { KindEvaluator } from './ports/kind-evaluator.port';
import { ArchitectureDriftService } from '../application/validators/architecture-drift.service';
import type { RulesetValidatorService } from '../application/validators/ruleset-validator.service';
import { PhaseGateValidatorService } from '../application/validators/phase-gate-validator.service';
import { EvaluateGateUseCase } from '../application/use-cases/evaluate-gate.use-case';
import { ProposePhaseAdvanceUseCase } from '../application/use-cases/propose-phase-advance.use-case';
import { TopologyCatalogService } from '../application/services/topology-catalog.service';
import type { TopologyDesignProfile } from '../application/services/topology-catalog.service';
import { PhaseArtifactProfileService } from '../application/services/phase-artifact-profile.service';
import type { DownstreamPhase } from '../application/services/phase-artifact-profile.service';

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

/**
 * GT-589 — turn a queried fact base into canonical findings.
 *
 * Exported and PURE so the structural half of the architecture verdict can be
 * exercised without a filesystem, a drift service or a workspace: same summary in,
 * same findings out, in the same order.
 */
export function structuralFindingsFrom(summary: StructuralFactsSummary): {
  readonly gaps: Gap[];
  readonly risks: Risk[];
  readonly recommendations: { id: string; kind: 'process'; message: string }[];
} {
  const gaps: Gap[] = [];
  const risks: Risk[] = [];

  for (const cycle of summary.cycles) {
    const id = 'STRUCT-IMPORT-CYCLE-' + cycle.component[0];
    const suffix = cycle.typeOnly ? ' (type-only — erased at runtime)' : '';
    const message = 'Cyclic import chain: ' + renderChain(cycle.chain) + suffix + '.';
    gaps.push({
      id,
      requirementRef: 'structure/no-import-cycles',
      severity: cycle.typeOnly ? 'warning' : 'error',
      message,
      location: cycle.component[0],
    });
    risks.push({ id, level: cycle.typeOnly ? 'low' : 'high', category: 'architecture', message });
  }

  for (const crossing of summary.boundaryCrossings) {
    const id = 'STRUCT-SYMBOL-BOUNDARY-' + crossing.ruleId + '-' + crossing.toSymbol;
    const via = crossing.viaLegalImportsOnly
      ? ' Every import along this path is legal in isolation, so no pairwise import check can express it.'
      : '';
    const message =
      'Boundary "' + crossing.ruleId + '" reaches forbidden symbol "' + crossing.toSymbol +
      '" via ' + renderChain(crossing.symbolChain) +
      ' (modules: ' + renderChain(crossing.moduleChain) + ').' + via;
    gaps.push({
      id,
      requirementRef: crossing.ruleId,
      severity: crossing.severity,
      message,
      location: crossing.moduleChain[0],
    });
    risks.push({
      id,
      level: crossing.severity === 'error' ? 'high' : 'medium',
      category: 'architecture',
      message,
    });
  }

  const recommendations = [
    {
      id: 'structural-facts',
      kind: 'process' as const,
      message:
        'Structural fact base (' + summary.indexer + ', contentHash ' + summary.contentHash + '): ' +
        summary.moduleCount + ' modules, ' + summary.importCount + ' imports, ' +
        summary.symbolCount + ' symbols, ' + summary.referenceCount + ' references; ' +
        summary.cycles.length + ' import cycle(s), ' +
        summary.boundaryCrossings.length + ' symbol boundary crossing(s).',
    },
  ];

  return { gaps, risks, recommendations };
}

/**
 * GT-594 — turn the AI-drift signal report into ADVISORY findings.
 *
 * Every gap this emits carries `severity: 'info'` and every risk `level: 'low'`, and
 * that is load-bearing rather than cosmetic: the architecture verdict is computed from
 * gaps of severity `error`, so by construction no drift signal can move it. The
 * enforcement of that lives one layer down, in `admitEvidenceBlocking` (GT-584), which
 * refuses every one of these signals a blocking verdict because none carries a
 * measured error rate. This function only makes the refusal READABLE — each message
 * states the admissibility class and the reason, so a reviewer looking at a verdict
 * can tell an advisory number from a decisive one without reading the code.
 *
 * Exported and PURE so the advisory half can be exercised without a workspace.
 */
export function driftFindingsFrom(report: DriftSignalReport, delta?: DriftConformanceDelta): {
  readonly gaps: Gap[];
  readonly risks: Risk[];
  readonly recommendations: { id: string; kind: 'process'; message: string }[];
} {
  const gaps: Gap[] = [];
  const risks: Risk[] = [];
  const recommendations: { id: string; kind: 'process'; message: string }[] = [];

  for (const assessed of report.signals) {
    const { measurement, admissibility } = assessed;
    const id = 'DRIFT-' + measurement.signal.toUpperCase();

    if (measurement.status !== 'measured') {
      recommendations.push({
        id,
        kind: 'process',
        message:
          'Drift signal "' + measurement.signal + '" NOT MEASURED: ' +
          (measurement.notMeasurableReason ?? 'no reason recorded'),
      });
      continue;
    }

    const numbers = Object.entries(measurement.metrics)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => key + '=' + value)
      .join(', ');
    const message =
      'Drift signal "' + measurement.signal + '" (' + admissibility.admissibility + ', ' +
      (admissibility.blocking ? 'blocking' : 'ADVISORY — cannot block') + '): ' + numbers + '.';

    gaps.push({
      id,
      requirementRef: 'drift/' + measurement.signal,
      severity: 'info',
      message,
      location: measurement.provenance.contentHash,
    });
    risks.push({ id, level: 'low', category: 'code-quality', message });
    recommendations.push({
      id: id + '-DEFINITION',
      kind: 'process',
      message:
        measurement.definition + ' Blind spots: ' + measurement.blindSpots.join(' ') +
        ' Admissibility: ' + admissibility.rationale,
    });
  }

  if (delta) {
    for (const signal of delta.signals) {
      if (signal.status !== 'comparable') {
        recommendations.push({
          id: 'DRIFT-DELTA-' + signal.signal.toUpperCase(),
          kind: 'process',
          message:
            'Conformance delta for "' + signal.signal + '" INCOMPARABLE: ' +
            (signal.incomparableReason ?? 'no reason recorded'),
        });
        continue;
      }
      const moved = signal.metrics.filter((m) => m.delta !== undefined && m.delta !== 0);
      recommendations.push({
        id: 'DRIFT-DELTA-' + signal.signal.toUpperCase(),
        kind: 'process',
        message:
          'Conformance delta for "' + signal.signal + '" between ' + signal.baselineContentHash +
          ' and ' + signal.currentContentHash + ': ' +
          (moved.length === 0
            ? 'no metric moved.'
            : moved.map((m) => m.metric + ' ' + m.before + '→' + m.after).join(', ') + '.'),
      });
    }
  }

  return { gaps, risks, recommendations };
}

/**
 * architecture kind — wraps ArchitectureDriftService → ArchitectureEvaluationResult,
 * and (GT-589) queries the inline structural fact base when the consumer sends one.
 *
 * Two independent sources, merged: the workspace-scanning drift report, and PURE
 * queries over `ctx.repoFacts`. The Core still runs no indexer and keeps nothing —
 * the facts arrive on the context (ADR-0101). When no workspace is resolved
 * (`satellitePath` empty) the drift half is skipped and the verdict rests on the
 * fact base alone: that is the "judge a repository the Core has never seen" path.
 */
export function createArchitectureKindEvaluator(
  driftService: ArchitectureDriftService,
): KindEvaluator {
  return {
    kind: 'architecture',
    evaluate: async (ctx, ws) => {
      const summary = ctx.repoFacts
        ? summarizeRepoFacts(ctx.repoFacts, ctx.architecture?.symbolBoundaries ?? [])
        : undefined;
      const structural = summary
        ? structuralFindingsFrom(summary)
        : { gaps: [] as Gap[], risks: [] as Risk[], recommendations: [] as { id: string; kind: 'process'; message: string }[] };

      // GT-594 — the advisory half. Pure queries over the same inline fact base, plus
      // the baseline the consumer sent for the two-revision signals. The Core still
      // runs no indexer and remembers no previous revision (ADR-0101).
      const driftSignals = ctx.repoFacts
        ? summarizeDriftSignals(ctx.repoFacts, ctx.baselineRepoFacts ? { baseline: ctx.baselineRepoFacts } : {})
        : undefined;
      const driftSignalDelta =
        driftSignals && ctx.baselineRepoFacts
          ? diffDriftSignalReports(summarizeDriftSignals(ctx.baselineRepoFacts), driftSignals)
          : undefined;
      const drift = driftSignals
        ? driftFindingsFrom(driftSignals, driftSignalDelta)
        : { gaps: [] as Gap[], risks: [] as Risk[], recommendations: [] as { id: string; kind: 'process'; message: string }[] };

      const hasWorkspace = typeof ws?.satellitePath === 'string' && ws.satellitePath.length > 0;
      if (!hasWorkspace && !summary) {
        return { verdict: Verdict.SKIP, results: {} };
      }

      let driftGaps: Gap[] = [];
      let driftRisks: Risk[] = [];
      let driftDetected = false;
      let definitionRef: string | undefined;

      if (hasWorkspace) {
        const report = await driftService.detectDrift({
          projectPath: ws.satellitePath,
          corePath: ws.corePath,
          declaredLevel: ctx.topologyRef as 'F1' | 'F2' | 'F3' | undefined,
        });
        const violations = [...report.newViolations, ...report.persistentViolations];
        driftRisks = violations.map((v) => ({
          id: v.ruleId,
          level: severityToRisk(v.severity),
          category: v.category || 'architecture',
          message: v.title,
        }));
        driftGaps = violations.map((v) => ({
          id: v.ruleId,
          requirementRef: v.ruleId,
          severity: (v.blocking ? 'error' : 'warning') as 'error' | 'warning' | 'info',
          message: v.description,
        }));
        driftDetected = report.driftDetected;
        definitionRef = report.detectedLevel;
      }

      const gaps = [...driftGaps, ...structural.gaps, ...drift.gaps];
      const risks = [...driftRisks, ...structural.risks, ...drift.risks];
      const recommendations = [...structural.recommendations, ...drift.recommendations];
      // The verdict reads ONLY the structural (deterministic) half and the drift
      // report. GT-594's signals contribute `info` gaps exclusively, so they cannot
      // reach this expression — which is the point, and is asserted in the spec.
      const structuralBlocking = structural.gaps.some((g) => g.severity === 'error');
      const verdict = driftDetected || structuralBlocking ? Verdict.FAIL : Verdict.PASS;

      return {
        verdict,
        results: {
          architecture: {
            verdict,
            definitionRef,
            risks,
            gaps,
            recommendations,
            ...(summary ? { structuralFacts: summary } : {}),
            ...(driftSignals ? { driftSignals } : {}),
            ...(driftSignalDelta ? { driftSignalDelta } : {}),
          },
        },
        gaps,
        risks,
        recommendations,
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

type Gap = { id: string; requirementRef: string; severity: 'error' | 'warning' | 'info'; message: string; location?: string };
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

/**
 * Universal design blocks (ADR-0104 / DS-10). Always scored regardless of
 * topology; mirrors the `category: "universal"` entries in
 * `src/rulesets/schema/design-block-registry.json`.
 */
export const UNIVERSAL_DESIGN_BLOCKS: readonly string[] = [
  'architecture-blueprint',
  'testing-strategy',
  'adr-registry',
  'topology-compliance-matrix',
  'technical-maturity-evaluation',
];

/**
 * Blueprint → downstream criteria map (GT-432 / ADR-0104 §8). A composed,
 * validated blueprint is a GENERATIVE contract: each present block derives
 * requirements/criteria for the downstream SDLC phases (Construction / Quality /
 * Deployment). The Core emits these as recommendations; the Tracker uses them to
 * configure the F3/F4/F5 gates. Non-binding.
 */
export const DOWNSTREAM_CRITERIA_BY_BLOCK: Readonly<
  Record<string, readonly { readonly phase: 'construction' | 'quality' | 'deployment'; readonly criterion: string }[]>
> = {
  'devops-cicd-plan': [{ phase: 'construction', criterion: 'CI/CD pipeline implemented and green per the DevOps/CI-CD plan.' }],
  'unit-test-plan': [{ phase: 'construction', criterion: 'Unit tests implemented per the unit-test plan.' }, { phase: 'quality', criterion: 'Unit coverage meets the plan target.' }],
  'build-plan': [{ phase: 'construction', criterion: 'Reproducible build per the build plan.' }],
  'testing-strategy': [{ phase: 'quality', criterion: 'Test distribution and coverage meet the testing pyramid.' }],
  'performance-plan': [{ phase: 'quality', criterion: 'Performance validated within the plan budgets.' }, { phase: 'deployment', criterion: 'Runtime performance stays within operational budgets.' }],
  'infrastructure-plan': [{ phase: 'deployment', criterion: 'Infrastructure provisioned per the infrastructure plan.' }],
  'event-contract-catalog': [{ phase: 'quality', criterion: 'Contract tests pass for every declared event contract.' }],
  'async-payload-schema-set': [{ phase: 'quality', criterion: 'Async payloads validated against their schemas.' }],
  'doma-compliance-matrix': [{ phase: 'construction', criterion: 'Each service maps to exactly one bounded context.' }],
  'data-product-contract-set': [{ phase: 'quality', criterion: 'Data product contracts honored (ports/SLOs/schema).' }],
  'token-budget-plan': [{ phase: 'deployment', criterion: 'Token usage stays within the declared budget.' }],
  'sandbox-policy': [{ phase: 'deployment', criterion: 'Agent sandbox timeout and isolation enforced.' }],
  'mcp-protocol-compliance': [{ phase: 'quality', criterion: 'MCP protocol conformance verified.' }],
};

/**
 * design kind (GT-429 / ADR-0104) — the ADVISORY design evaluator. Derives the
 * expected design-artifact blocks as the UNION of the confirmed topology
 * composition's `designProfile`s (plus the universal blocks), compares them
 * against the blocks the consumer declares in `ctx.design`, and measures the
 * design's TECHNICAL MATURITY (per concern + aggregate). It is NON-BINDING: the
 * verdict is always PASS; missing blocks and deviations become gaps /
 * recommendations / non-blocking requiredActions. The tenant's gate decides any
 * blocking (ADR-0101). SKIP when no `ctx.design` is declared.
 */
export function createDesignKindEvaluator(
  getDesignProfile: (corePath: string, topologyRef: string) => Promise<TopologyDesignProfile | undefined>,
  resolveCorePath: () => string,
): KindEvaluator {
  return {
    kind: 'design',
    evaluate: async (ctx, ws) => {
      const design = ctx.design;
      if (!design) return { verdict: Verdict.SKIP, results: {} };
      const corePath = ws.corePath ?? resolveCorePath();

      // Confirmed topology composition (mixed) — fall back to the single topologyRef.
      const confirmed =
        design.topologyConfirmedRefs && design.topologyConfirmedRefs.length > 0
          ? [...design.topologyConfirmedRefs]
          : ctx.topologyRef
            ? [ctx.topologyRef]
            : [];
      const confirmedSet = new Set(confirmed);

      // Pre-resolve every referenced topology's designProfile once (stateless read).
      const concernTopos = (design.concerns ?? []).flatMap((c) => c.topologies ?? []);
      const profileByTopo = new Map<string, TopologyDesignProfile | undefined>();
      for (const topo of new Set([...confirmed, ...concernTopos])) {
        profileByTopo.set(topo, await getDesignProfile(corePath, topo));
      }
      const requiredOf = (topo: string): string[] =>
        (profileByTopo.get(topo)?.required ?? []).map((d) => d.artifactKind);

      // Required kinds = universal ∪ union(required over the confirmed composition).
      const requiredKinds = new Set<string>(UNIVERSAL_DESIGN_BLOCKS);
      for (const topo of confirmed) for (const k of requiredOf(topo)) requiredKinds.add(k);

      // Declared blocks (blueprint-level + per concern).
      const declared = new Set<string>();
      for (const b of design.blocks ?? []) declared.add(b.blockKind);
      for (const c of design.concerns ?? []) for (const b of c.blocks ?? []) declared.add(b.blockKind);

      const artifactStatus = [...requiredKinds].map((artifactKind) => {
        const present = declared.has(artifactKind);
        return { artifactKind, required: true, present, verdict: present ? Verdict.PASS : Verdict.SKIP };
      });
      const missingArtifacts = [...requiredKinds].filter((k) => !declared.has(k));

      const presentRequired = [...requiredKinds].filter((k) => declared.has(k)).length;
      const technicalMaturity = Math.round((100 * presentRequired) / Math.max(1, requiredKinds.size));

      // Per-concern maturity: expected = union of the concern's topologies' required kinds.
      const perConcernMaturity = (design.concerns ?? []).map((c) => {
        const expected = new Set<string>();
        for (const topo of c.topologies ?? []) for (const k of requiredOf(topo)) expected.add(k);
        const declaredHere = new Set((c.blocks ?? []).map((b) => b.blockKind));
        const present = [...expected].filter((k) => declaredHere.has(k)).length;
        const maturity = Math.round((100 * present) / Math.max(1, expected.size));
        const gaps: Gap[] = [...expected]
          .filter((k) => !declaredHere.has(k))
          .map((k) => ({ id: `DESIGN-MISSING-${c.concern}-${k}`, requirementRef: k, severity: 'warning', message: `Concern "${c.concern}" is missing the "${k}" block.` }));
        return { concern: c.concern, maturity, gaps };
      });

      // Deviations that recommend an ADR: a concern using a topology outside the confirmed set.
      const deviationsRequiringAdr: string[] = [];
      for (const c of design.concerns ?? []) {
        for (const topo of c.topologies ?? []) {
          if (!confirmedSet.has(topo)) {
            deviationsRequiringAdr.push(`Concern "${c.concern}" uses topology "${topo}" outside the confirmed composition — document with an ADR.`);
          }
        }
      }

      const gaps: Gap[] = missingArtifacts.map((k) => ({
        id: `DESIGN-MISSING-${k}`,
        requirementRef: k,
        severity: 'warning',
        message: `Design is missing the "${k}" block (advisory — feeds the maturity score).`,
      }));
      const recommendations = [
        { id: 'design-maturity', kind: 'process' as const, message: `Design technical maturity: ${technicalMaturity}/100 (${presentRequired}/${requiredKinds.size} expected blocks present).` },
        ...missingArtifacts.map((k) => ({ id: `add-${k}`, kind: 'next-step' as const, message: `Add a "${k}" block to raise design maturity.` })),
      ];
      const requiredActions = deviationsRequiringAdr.map((message, i) => ({
        id: `design-deviation-${i}`,
        description: message,
        blocking: false,
        remediation: 'Record an ADR justifying the deviation.',
      }));

      // Blueprint = generative contract: derive downstream (Construction/Quality/
      // Deployment) criteria from the present blocks (GT-432 / ADR-0104 §8).
      const downstreamCriteria = [...declared].flatMap((blockKind) =>
        (DOWNSTREAM_CRITERIA_BY_BLOCK[blockKind] ?? []).map((c) => ({
          id: `downstream-${c.phase}-${blockKind}`,
          kind: 'next-step' as const,
          message: `[${c.phase}] ${c.criterion}`,
          references: [blockKind],
        })),
      );

      return {
        verdict: Verdict.PASS, // advisory / non-binding — never fails the overall verdict
        results: {
          design: {
            verdict: Verdict.PASS,
            technicalMaturity,
            perConcernMaturity,
            artifactStatus,
            missingArtifacts,
            deviationsRequiringAdr,
            gaps,
            recommendations,
            downstreamCriteria,
          },
        },
        gaps,
        recommendations,
        requiredActions,
      };
    },
  };
}

/**
 * Canonical SDLC phase → downstream phase-artifact profile (ADR-0104 · DN-06).
 * The design phase (`design`) produces the blueprint; `discovery` precedes it —
 * neither has a downstream artifact profile, so the phase-artifacts evaluator
 * SKIPs for them. The three build-forward phases map onto the three profiles.
 */
export const PHASE_ID_TO_DOWNSTREAM: Partial<Record<PhaseId, DownstreamPhase>> = {
  construction: 'construction',
  qa: 'quality',
  release: 'deployment',
};

/**
 * phase-artifacts kind (GT-434 / ADR-0104 · DN-06) — the ADVISORY downstream
 * artifact-completeness evaluator, the build-phase mirror of the design
 * evaluator. From `ctx.phaseId` it derives the downstream phase
 * (construction / qa→quality / release→deployment), takes the confirmed topology
 * composition (`ctx.design.topologyConfirmedRefs`, else `ctx.topologyRef`) and
 * the declared artifacts (`ctx.artifacts.presented[].artifactId`), then measures
 * completeness against the UNION of the universal per-phase artifacts and each
 * confirmed topology's `spec.phaseProfiles` via {@link PhaseArtifactProfileService}.
 * NON-BINDING: the verdict is always PASS; missing artifacts become advisory
 * gaps / recommendations. The tenant's gate decides any blocking (ADR-0101).
 * SKIP when `ctx.phaseId` is absent or maps to no downstream phase.
 */
export function createPhaseArtifactKindEvaluator(
  getPhaseProfiles: (
    corePath: string,
    topologyRef: string,
  ) => Promise<Partial<Record<DownstreamPhase, TopologyDesignProfile>> | undefined>,
  resolveCorePath: () => string,
): KindEvaluator {
  const service = new PhaseArtifactProfileService();
  return {
    kind: 'phase-artifacts',
    evaluate: async (ctx, ws) => {
      const canonical = ctx.phaseId ? normalizePhaseId(ctx.phaseId) : undefined;
      const phase = canonical ? PHASE_ID_TO_DOWNSTREAM[canonical] : undefined;
      if (!phase) return { verdict: Verdict.SKIP, results: {} };
      const corePath = ws.corePath ?? resolveCorePath();

      // Confirmed topology composition (mixed) — fall back to the single topologyRef.
      const confirmed =
        ctx.design?.topologyConfirmedRefs && ctx.design.topologyConfirmedRefs.length > 0
          ? [...ctx.design.topologyConfirmedRefs]
          : ctx.topologyRef
            ? [ctx.topologyRef]
            : [];

      // Pre-resolve each confirmed topology's phaseProfiles once (stateless read),
      // then hand the service a synchronous accessor.
      const profilesByTopo = new Map<string, Partial<Record<DownstreamPhase, TopologyDesignProfile>> | undefined>();
      for (const topo of new Set(confirmed)) {
        profilesByTopo.set(topo, await getPhaseProfiles(corePath, topo));
      }
      const getPhaseProfile = (topo: string, p: DownstreamPhase): TopologyDesignProfile | undefined =>
        profilesByTopo.get(topo)?.[p];

      const declared = (ctx.artifacts?.presented ?? []).map((a) => a.artifactId);
      const r = service.evaluate(phase, confirmed, declared, getPhaseProfile);

      const gaps: Gap[] = r.missingArtifacts.map((k) => ({
        id: `PHASE-ARTIFACT-MISSING-${k}`,
        requirementRef: k,
        severity: 'warning',
        message: `Phase "${phase}" is missing the "${k}" artifact (advisory — feeds the completeness score).`,
      }));
      const recommendations = [
        {
          id: 'phase-artifact-completeness',
          kind: 'process' as const,
          message: `Phase "${phase}" artifact completeness: ${r.completeness}/100 (${r.presentArtifacts.length}/${r.requiredArtifacts.length} required artifacts present).`,
        },
        ...r.missingArtifacts.map((k) => ({
          id: `add-${k}`,
          kind: 'next-step' as const,
          message: `Provide a "${k}" artifact to raise phase completeness.`,
        })),
      ];

      return {
        verdict: Verdict.PASS, // advisory / non-binding — never fails the overall verdict
        results: {
          phaseArtifacts: {
            verdict: Verdict.PASS,
            phase: r.phase,
            completeness: r.completeness,
            requiredArtifacts: r.requiredArtifacts,
            presentArtifacts: r.presentArtifacts,
            missingArtifacts: r.missingArtifacts,
            conditionalArtifacts: r.conditionalArtifacts,
            gaps,
            recommendations,
          },
        },
        gaps,
        recommendations,
      };
    },
  };
}

/** Dependencies for the fully-wired default evaluator set. */
export interface DefaultKindEvaluatorDeps {
  readonly fileSystem: IFileSystem;
  readonly logger: ILogger;
  /**
   * Config parser used by the architecture evaluator's default RulesetValidator.
   * Optional for backward compatibility; when omitted the drift service falls back
   * to its own default (which requires a parser and would otherwise throw). Every
   * surface should pass its IConfigParser so the architecture kind evaluates.
   */
  readonly configParser?: IConfigParser;
  /**
   * A fully-wired RulesetValidatorService for the architecture evaluator. Prefer
   * passing this: the default validator also needs an IRulesetRepository, whose
   * concrete implementation lives outside core-domain (infra-providers), so a
   * surface that owns one should inject it here rather than rely on the default.
   */
  readonly rulesetValidator?: RulesetValidatorService;
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
  const { fileSystem, logger, configParser, rulesetValidator, resolveCorePath } = deps;

  const validatorFactory = (corePath?: string) =>
    new PhaseGateValidatorService(corePath, { fileSystem, logger });
  const evaluateGate = new EvaluateGateUseCase(validatorFactory);
  const proposeAdvance = new ProposePhaseAdvanceUseCase(evaluateGate);
  const driftService = new ArchitectureDriftService(undefined, {
    fileSystem,
    logger,
    configParser,
    validator: rulesetValidator,
  });
  const topologyCatalog = new TopologyCatalogService(fileSystem, logger);

  const blueprintExists = async (corePath: string, blueprintRef: string): Promise<boolean> => {
    const base = `${corePath}/reference/architecture/blueprints`;
    const candidates = [`${base}/${blueprintRef}`, `${base}/${blueprintRef}.md`, `${corePath}/${blueprintRef}`];
    for (const candidate of candidates) {
      if (await fileSystem.exists(candidate)) return true;
    }
    return false;
  };

  const getDesignProfile = async (corePath: string, topologyRef: string) =>
    (await topologyCatalog.get(corePath, topologyRef))?.spec.designProfile;

  const getPhaseProfiles = async (corePath: string, topologyRef: string) =>
    (await topologyCatalog.get(corePath, topologyRef))?.spec.phaseProfiles;

  return [
    createArchitectureKindEvaluator(driftService),
    createCheckpointKindEvaluator(proposeAdvance),
    createTopologyKindEvaluator(topologyCatalog, resolveCorePath),
    createBlueprintKindEvaluator(blueprintExists, resolveCorePath),
    createDeploymentKindEvaluator(),
    createDesignKindEvaluator(getDesignProfile, resolveCorePath),
    createPhaseArtifactKindEvaluator(getPhaseProfiles, resolveCorePath),
  ];
}
