/**
 * Maps the legacy pipeline output (EvaluationVerdict, verdict 'passed'/'failed')
 * to the canonical EvaluationResult (Verdict enum). GT-378 / ADR-0101.
 *
 * GT-601 — the three traceability fields (`rulesExecuted`, `risks`,
 * `missingEvidence`) and the `engine` attribution used to be written as literals
 * (`[]`, `[]`, `[]` and `'opa'`). Everything downstream of this mapper — the SARIF
 * export, the drift-gate evidence manifest, the EVD-01..04 contract — therefore
 * recorded "0 rules evaluated" and attributed every rule to OPA regardless of which
 * evaluator ran. They are now derived from the verdict the pipeline actually
 * returned; nothing here invents data it was not given.
 *
 * Pure function — no I/O, no state.
 */

import type { EvaluationVerdict, RuleEvaluation } from '../domain/satellite-manifest';
import { Verdict, fromLegacyGateEvidence } from '../domain/verdict/verdict';
import { normalizePhaseId } from '../domain/sdlc/phase-id';
import { isKnownEngine } from '../domain/violation';
import type { PipelineRuleCoverage } from './ports/evaluation-pipeline.port';
import {
  EvaluationResult,
  EVALUATION_RESULT_SCHEMA_VERSION,
  GateEvaluationResult,
  ArtifactEvaluationResult,
  ArtifactContext,
  GapFinding,
  RequiredAction,
  RiskFinding,
  RuleEngine,
  RuleExecutionRef,
  ComplianceResult,
  DecisionRecommendation,
  RepositoryRevisionContext,
  RequesterContext,
} from './contracts';

/**
 * GT-601 — a rule path ending in `.rego` was executed by the OPA evaluator; anything
 * else (the canonical ruleset corpus, whose rule paths are `rulesets/<category>/<id>`)
 * was executed by the native evaluator. This is the discriminator the pipeline itself
 * uses today: `evaluateGate` runs `.rego` paths through `OpaEvaluator`, while
 * `buildGeneralRulesetsGate` projects `NativeEvaluator` issues under a non-rego path.
 * An explicit `engine` on the rule evaluation always wins over this derivation.
 */
export const REGO_RULE_PATH_PATTERN = /\.rego$/i;

/** The engine attributed when neither the record nor its rule path says otherwise. */
export const DEFAULT_RULE_ENGINE: RuleEngine = 'native';

/** A pipeline rule evaluation that MAY carry the engine that executed it (GT-601). */
export type EngineAttributedRuleEvaluation = RuleEvaluation & { readonly engine?: string };

/**
 * Resolve which engine executed one rule. Precedence:
 *  1. an explicit, known `engine` stamped on the rule evaluation;
 *  2. the rule path (`*.rego` ⇒ `opa`);
 *  3. the run-level engine the pipeline declared;
 *  4. {@link DEFAULT_RULE_ENGINE}.
 */
export function resolveRuleEngine(
  ev: Pick<EngineAttributedRuleEvaluation, 'rulePath' | 'engine'>,
  runEngine?: RuleEngine,
): RuleEngine {
  if (typeof ev.engine === 'string' && isKnownEngine(ev.engine)) return ev.engine;
  if (ev.rulePath && REGO_RULE_PATH_PATTERN.test(ev.rulePath)) return 'opa';
  return runEngine ?? DEFAULT_RULE_ENGINE;
}

/**
 * GT-601 / GT-569 — a rule whose outcome is UNKNOWN is a risk, not a gap. The two
 * GT-569 outcomes stay distinct: `skipped` (the engine could not evaluate it) is
 * reported at `medium`, `errored` (the engine threw) at `high`.
 */
export function coverageRisks(coverage?: PipelineRuleCoverage): RiskFinding[] {
  if (!coverage) return [];
  const risks: RiskFinding[] = [];
  for (const ruleId of coverage.skippedRuleIds ?? []) {
    risks.push({
      id: `coverage:skipped:${ruleId}`,
      level: 'medium',
      category: 'coverage',
      message: `Rule '${ruleId}' was SKIPPED: the engine could not evaluate it, so its outcome is unknown.`,
      ruleRef: ruleId,
    });
  }
  for (const ruleId of coverage.erroredRuleIds ?? []) {
    risks.push({
      id: `coverage:errored:${ruleId}`,
      level: 'high',
      category: 'coverage',
      message: `Rule '${ruleId}' ERRORED: the engine threw while evaluating it, so its outcome is unknown.`,
      ruleRef: ruleId,
    });
  }
  return risks;
}

/**
 * GT-601 — evidence the consumer DECLARED as required and never presented.
 *
 * Distinct from `incompleteArtifacts` (present, but failing at least one rule):
 * an id lands here only when the context required it, no presented artifact carries
 * it, and the pipeline never evaluated it either. With no declared requirement there
 * is nothing to be missing, and the field is legitimately empty.
 */
export function deriveMissingEvidence(
  artifacts: ArtifactContext | undefined,
  evaluatedArtifactIds: ReadonlySet<string>,
): string[] {
  const required = artifacts?.required ?? [];
  if (required.length === 0) return [];
  const presented = new Set((artifacts?.presented ?? []).map((p) => p.artifactId));
  return [
    ...new Set(required.filter((id) => !presented.has(id) && !evaluatedArtifactIds.has(id))),
  ].sort();
}

export interface MapOptions {
  readonly coreVersion: string;
  readonly correlationId?: string;
  readonly ruleset?: string;
  readonly rulesetVersion?: string;
  readonly evaluatedAt: string;
  /** Optional non-binding decision recommendation (built by the orchestrator from context). */
  readonly decisionRecommendation?: DecisionRecommendation;
  /**
   * GT-601 — engine attributed to a rule whose path does not identify one. The
   * per-rule derivation (see {@link resolveRuleEngine}) always takes precedence.
   */
  readonly engine?: RuleEngine;
  /** GT-601 / GT-569 — rules the engine could not run; become coverage risks. */
  readonly coverage?: PipelineRuleCoverage;
  /** GT-601 — artifacts the context declared, so `missingEvidence` can be derived. */
  readonly declaredArtifacts?: ArtifactContext;
  /**
   * GT-586 — attribution echoed verbatim from the context. Both stay `undefined`
   * when the consumer declared none; this mapper never derives either one.
   */
  readonly requester?: RequesterContext;
  readonly repositoryRevision?: RepositoryRevisionContext;
}

/**
 * GT-614 — the base result for a request that asked for NO pipeline kind.
 *
 * The pipeline (gate/artifact/rule/compliance) did not run because it was not
 * requested, so nothing here reports a gate verdict, a rule execution or a
 * compliance denominator that was never computed. The distinction matters and is
 * deliberate:
 *
 *  - GT-569 `rulesSkipped`/`rulesErrored` mean "the engine tried and produced no
 *    outcome" — they belong in the denominator, because the outcome is UNKNOWN;
 *  - GT-571 not-applicable means "the rule does not apply to this workspace" and
 *    is PRE-FILTERED out of the denominator;
 *  - an UNREQUESTED kind is a third thing: OUT OF SCOPE. It is not unknown and it
 *    is not inapplicable — nobody asked. So it produces no sub-result, no rule
 *    reference and no denominator entry at all, and `results.compliance` is ABSENT
 *    rather than a zeroed object that would read as "0/0 checks passed".
 */
export function pipelineOutOfScopeResult(opts: MapOptions): EvaluationResult {
  return {
    overallVerdict: Verdict.PASS,
    outcome: 'approved',
    results: {},
    rulesExecuted: [],
    policiesApplied: [],
    gaps: [],
    risks: [],
    missingEvidence: [],
    incompleteArtifacts: [],
    recommendations: [],
    requiredActions: [],
    decisionRecommendation: opts.decisionRecommendation,
    confidence: 1,
    rationale:
      'No pipeline kind (gate/artifact/rule/compliance) was requested; the rule pipeline was not executed and contributes nothing to this verdict.',
    versions: {
      core: opts.coreVersion,
      ruleset: opts.ruleset,
      rulesetVersion: opts.rulesetVersion,
    },
    requester: opts.requester,
    repositoryRevision: opts.repositoryRevision,
    evaluatedAt: opts.evaluatedAt,
    correlationId: opts.correlationId,
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
  };
}

export function mapPipelineVerdict(
  verdict: EvaluationVerdict,
  opts: MapOptions,
): EvaluationResult {
  const gates: GateEvaluationResult[] = [];
  const allArtifacts: ArtifactEvaluationResult[] = [];
  const allGaps: GapFinding[] = [];
  const allActions: RequiredAction[] = [];
  const policiesApplied: RuleExecutionRef[] = [];
  /** GT-601: one entry per DISTINCT (rule, engine) actually executed. */
  const executedByKey = new Map<string, RuleExecutionRef>();
  const incompleteArtifacts = new Set<string>();
  const evaluatedArtifactIds = new Set<string>();

  const risksByRuleId = new Map<string, RiskFinding[]>();
  const allRisks = coverageRisks(opts.coverage);
  for (const risk of allRisks) {
    if (!risk.ruleRef) continue;
    const bucket = risksByRuleId.get(risk.ruleRef) ?? [];
    bucket.push(risk);
    risksByRuleId.set(risk.ruleRef, bucket);
  }

  for (const g of verdict.gates) {
    const artifactResults: ArtifactEvaluationResult[] = [];
    const gateGaps: GapFinding[] = [];
    const gateActions: RequiredAction[] = [];
    const gateRisks: RiskFinding[] = [];
    const seenGateRiskIds = new Set<string>();

    for (const ev of g.artifactEvaluations) {
      const evVerdict = ev.passed ? Verdict.PASS : Verdict.FAIL;
      const engine = resolveRuleEngine(ev as EngineAttributedRuleEvaluation, opts.engine);
      evaluatedArtifactIds.add(ev.artifact);
      const ar: ArtifactEvaluationResult = {
        artifactId: ev.artifact,
        verdict: evVerdict,
        present: ev.passed,
        ruleRefs: [ev.ruleId],
        gaps: ev.passed
          ? []
          : [{
              id: `${g.gateId}:${ev.ruleId}`,
              requirementRef: ev.ruleId,
              severity: ev.severity,
              message: ev.message,
              location: ev.artifact,
            }],
      };
      artifactResults.push(ar);
      allArtifacts.push(ar);

      policiesApplied.push({
        ruleId: ev.ruleId,
        rulesetRef: ev.rulePath,
        engine,
        verdict: evVerdict,
      });

      // GT-601: the rule DID execute — record it once per engine, and let a single
      // failing execution decide the aggregate verdict for that rule.
      const key = `${ev.ruleId}::${engine}`;
      const prior = executedByKey.get(key);
      if (!prior) {
        executedByKey.set(key, {
          ruleId: ev.ruleId,
          rulesetRef: ev.rulePath,
          engine,
          verdict: evVerdict,
        });
      } else if (evVerdict === Verdict.FAIL && prior.verdict !== Verdict.FAIL) {
        executedByKey.set(key, { ...prior, verdict: Verdict.FAIL });
      }

      // GT-601: a coverage risk for a rule this gate touched is attributed to the gate.
      for (const risk of risksByRuleId.get(ev.ruleId) ?? []) {
        if (seenGateRiskIds.has(risk.id)) continue;
        seenGateRiskIds.add(risk.id);
        gateRisks.push(risk);
      }

      if (!ev.passed) {
        incompleteArtifacts.add(ev.artifact);
        const gap: GapFinding = {
          id: `${g.gateId}:${ev.ruleId}`,
          requirementRef: ev.ruleId,
          severity: ev.severity,
          message: ev.message,
          location: ev.artifact,
        };
        gateGaps.push(gap);
        allGaps.push(gap);
        const action: RequiredAction = {
          id: `fix:${g.gateId}:${ev.ruleId}`,
          gapId: gap.id,
          description: ev.message,
          blocking: ev.severity === 'error',
          remediation: ev.remediation,
        };
        gateActions.push(action);
        allActions.push(action);
      }
    }

    gates.push({
      gateId: g.gateId,
      phaseId: normalizePhaseId(g.phase) ?? undefined,
      verdict: fromLegacyGateEvidence(g.verdict),
      artifactResults,
      risks: gateRisks,
      gaps: gateGaps,
      requiredActions: gateActions,
    });
  }

  const s = verdict.summary;
  // GT-569 vocabulary: `skipped` (the engine could not) is not `errored` (it threw);
  // both mean the rule produced no outcome, so both are un-checked coverage here.
  const skippedChecks = (opts.coverage?.rulesSkipped ?? 0) + (opts.coverage?.rulesErrored ?? 0);
  const compliance: ComplianceResult = {
    verdict: verdict.passed ? Verdict.PASS : Verdict.FAIL,
    score: s.totalRules > 0 ? s.passedRules / s.totalRules : undefined,
    // The denominator never omits what could not be checked (GT-569).
    totalChecks: s.totalRules + skippedChecks,
    passedChecks: s.passedRules,
    failedChecks: s.failedRules,
    skippedChecks,
  };

  const overallVerdict = verdict.passed ? Verdict.PASS : Verdict.FAIL;

  return {
    overallVerdict,
    outcome: verdict.passed ? 'approved' : 'rejected',
    results: {
      gate: gates,
      artifact: allArtifacts,
      compliance,
    },
    rulesExecuted: [...executedByKey.values()],
    policiesApplied,
    gaps: allGaps,
    risks: allRisks,
    missingEvidence: deriveMissingEvidence(opts.declaredArtifacts, evaluatedArtifactIds),
    incompleteArtifacts: [...incompleteArtifacts],
    recommendations: [],
    requiredActions: allActions,
    decisionRecommendation: opts.decisionRecommendation,
    confidence: s.totalRules > 0 ? s.passedRules / s.totalRules : 1,
    rationale: verdict.passed
      ? `All ${s.totalGates} gate(s) passed (${s.passedRules}/${s.totalRules} rules).`
      : `${s.failedGates}/${s.totalGates} gate(s) failed (${s.failedRules}/${s.totalRules} rules failed).`,
    versions: {
      core: opts.coreVersion,
      ruleset: opts.ruleset,
      rulesetVersion: opts.rulesetVersion,
    },
    // GT-586: attribution is echoed, never derived — absent in, absent out.
    requester: opts.requester,
    repositoryRevision: opts.repositoryRevision,
    evaluatedAt: opts.evaluatedAt,
    correlationId: opts.correlationId,
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
  };
}
