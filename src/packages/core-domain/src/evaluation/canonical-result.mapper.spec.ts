/**
 * GT-601 — the canonical mapper must write a TRUTHFUL audit trail.
 *
 * Every test in this file fails against the pre-GT-601 mapper, which wrote
 * `rulesExecuted: []`, `risks: []` and `missingEvidence: []` unconditionally and
 * hardcoded `engine: 'opa'` on every policy reference.
 */

import {
  DEFAULT_RULE_ENGINE,
  coverageRisks,
  deriveMissingEvidence,
  mapPipelineVerdict,
  resolveRuleEngine,
  type MapOptions,
} from './canonical-result.mapper';
import type { PipelineRuleCoverage } from './ports/evaluation-pipeline.port';
import type { EvaluationVerdict, RuleEvaluation } from '../domain/satellite-manifest';
import { Verdict } from '../domain/verdict/verdict';
import { emitEvaluationEvidence, exportEvaluationResultToSarif } from './sarif-exporter';
import { evaluateDriftGate } from './drift-gate';

const OPA_RULE_PATH = 'rulesets/opa/phase-gates.rego';
const NATIVE_RULE_PATH = 'rulesets/hexagonal/HXA-01';

function rule(o: Partial<RuleEvaluation> & { ruleId: string; rulePath: string }): RuleEvaluation {
  return {
    artifact: `${o.ruleId}.md`,
    passed: true,
    message: 'ok',
    severity: 'error',
    remediation: '',
    gateRef: 'gate-f1',
    ...o,
  } as RuleEvaluation;
}

/**
 * Two gates reproducing the pipeline's REAL dual-engine shape: the phase gate runs
 * `.rego` rules through the OPA evaluator, the synthetic `general-rulesets` gate
 * projects native-evaluator issues under a non-rego rule path.
 */
function dualEngineVerdict(): EvaluationVerdict {
  return {
    passed: false,
    resolvedTopology: 'modular-monolith',
    gates: [
      {
        gateId: 'gate-f1',
        gateName: 'Business Sign-Off',
        phase: 'f1',
        verdict: 'passed',
        artifactEvaluations: [
          rule({ ruleId: 'PG-F1-001', rulePath: OPA_RULE_PATH, artifact: 'prd.md' }),
          rule({ ruleId: 'PG-F1-002', rulePath: OPA_RULE_PATH, artifact: 'vision.md' }),
        ],
      },
      {
        gateId: 'general-rulesets',
        gateName: 'Canonical Ruleset Enforcement',
        phase: 'cross',
        verdict: 'failed',
        artifactEvaluations: [
          rule({
            ruleId: 'HXA-01',
            rulePath: NATIVE_RULE_PATH,
            artifact: 'src/domain/x.ts',
            passed: false,
            message: 'domain imports infrastructure',
            gateRef: 'general-rulesets',
            remediation: 'invert the dependency',
          }),
        ],
      },
    ],
    summary: {
      totalGates: 2,
      passedGates: 1,
      failedGates: 1,
      totalRules: 3,
      passedRules: 2,
      failedRules: 1,
    },
    evaluatedAt: '2026-07-27T00:00:00.000Z',
  };
}

const baseOpts: MapOptions = {
  coreVersion: '1.2.0',
  evaluatedAt: '2026-07-27T00:00:00.000Z',
  correlationId: 'corr-601',
};

describe('resolveRuleEngine (GT-601 — engine attribution)', () => {
  it('attributes a `.rego` rule path to the OPA evaluator', () => {
    expect(resolveRuleEngine({ rulePath: OPA_RULE_PATH })).toBe('opa');
  });

  it('attributes a non-rego rule path to the native evaluator', () => {
    expect(resolveRuleEngine({ rulePath: NATIVE_RULE_PATH })).toBe('native');
  });

  it('lets an explicit engine stamped on the record win over the path derivation', () => {
    expect(resolveRuleEngine({ rulePath: OPA_RULE_PATH, engine: 'enforcer' })).toBe('enforcer');
  });

  it('ignores an unknown engine string and falls back to the run engine, then the default', () => {
    expect(resolveRuleEngine({ rulePath: 'rulesets/x/Y', engine: 'made-up' }, 'enforcer')).toBe('enforcer');
    expect(resolveRuleEngine({ rulePath: 'rulesets/x/Y' })).toBe(DEFAULT_RULE_ENGINE);
  });
});

describe('mapPipelineVerdict — rulesExecuted (GT-601 AC1)', () => {
  it('records EVERY rule the evaluation executed, with a count matching the fixture', () => {
    const result = mapPipelineVerdict(dualEngineVerdict(), baseOpts);

    expect(result.rulesExecuted).toHaveLength(3); // was [] before GT-601
    expect(result.rulesExecuted.map((r) => r.ruleId).sort()).toEqual([
      'HXA-01',
      'PG-F1-001',
      'PG-F1-002',
    ]);
  });

  it('carries each rule verdict, and keeps the ruleset ref for traceability', () => {
    const result = mapPipelineVerdict(dualEngineVerdict(), baseOpts);
    const hxa = result.rulesExecuted.find((r) => r.ruleId === 'HXA-01');

    expect(hxa).toMatchObject({ verdict: Verdict.FAIL, engine: 'native', rulesetRef: NATIVE_RULE_PATH });
    expect(result.rulesExecuted.find((r) => r.ruleId === 'PG-F1-001')?.verdict).toBe(Verdict.PASS);
  });

  it('dedupes a rule executed against several artifacts, and one failure decides its verdict', () => {
    const verdict = dualEngineVerdict();
    verdict.gates[0].artifactEvaluations.push(
      rule({ ruleId: 'PG-F1-001', rulePath: OPA_RULE_PATH, artifact: 'other.md', passed: false, message: 'nope' }),
    );

    const result = mapPipelineVerdict(verdict, baseOpts);

    expect(result.rulesExecuted.filter((r) => r.ruleId === 'PG-F1-001')).toHaveLength(1);
    expect(result.rulesExecuted.find((r) => r.ruleId === 'PG-F1-001')?.verdict).toBe(Verdict.FAIL);
    // policiesApplied stays one entry per application (4 evaluations → 4 refs).
    expect(result.policiesApplied).toHaveLength(4);
  });
});

describe('mapPipelineVerdict — engine (GT-601 AC2, native AND opa paths)', () => {
  it('attributes each rule to the evaluator that ran it instead of hardcoding opa', () => {
    const result = mapPipelineVerdict(dualEngineVerdict(), baseOpts);

    const byRule = new Map(result.policiesApplied.map((p) => [p.ruleId, p.engine]));
    expect(byRule.get('PG-F1-001')).toBe('opa');
    expect(byRule.get('HXA-01')).toBe('native'); // was 'opa' before GT-601
    expect(new Set(result.rulesExecuted.map((r) => r.engine))).toEqual(new Set(['opa', 'native']));
  });

  it('honours an engine stamped on the individual rule evaluation', () => {
    const verdict = dualEngineVerdict();
    (verdict.gates[1].artifactEvaluations[0] as RuleEvaluation & { engine?: string }).engine = 'enforcer';

    const result = mapPipelineVerdict(verdict, baseOpts);

    expect(result.rulesExecuted.find((r) => r.ruleId === 'HXA-01')?.engine).toBe('enforcer');
  });

  it('falls back to the run-level engine only for a path that identifies none', () => {
    const verdict = dualEngineVerdict();
    verdict.gates[1].artifactEvaluations[0] = rule({
      ruleId: 'ANY-01',
      rulePath: 'rulesets/any/ANY-01',
      passed: false,
      message: 'x',
    });

    const result = mapPipelineVerdict(verdict, { ...baseOpts, engine: 'enforcer' });

    expect(result.rulesExecuted.find((r) => r.ruleId === 'ANY-01')?.engine).toBe('enforcer');
    // the .rego rules are still attributed to OPA, not to the run-level engine
    expect(result.rulesExecuted.find((r) => r.ruleId === 'PG-F1-001')?.engine).toBe('opa');
  });
});

describe('mapPipelineVerdict — risks (GT-601 AC4, GT-569 vocabulary)', () => {
  const coverage: PipelineRuleCoverage = {
    rulesChecked: 3,
    rulesSkipped: 1,
    rulesErrored: 1,
    rulesTotal: 5,
    skippedRuleIds: ['PG-F1-002'],
    erroredRuleIds: ['CFG-09'],
  };

  it('turns a rule the engine could NOT evaluate into a risk, distinct from one that threw', () => {
    const result = mapPipelineVerdict(dualEngineVerdict(), { ...baseOpts, coverage });

    expect(result.risks).toHaveLength(2); // was [] before GT-601
    const skipped = result.risks.find((r) => r.ruleRef === 'PG-F1-002');
    const errored = result.risks.find((r) => r.ruleRef === 'CFG-09');
    expect(skipped).toMatchObject({ level: 'medium', category: 'coverage' });
    expect(errored).toMatchObject({ level: 'high', category: 'coverage' });
    expect(skipped?.id).not.toBe(errored?.id);
    expect(skipped?.message).toMatch(/SKIPPED/);
    expect(errored?.message).toMatch(/ERRORED/);
  });

  it('attributes a coverage risk to the gate whose rule it concerns', () => {
    const result = mapPipelineVerdict(dualEngineVerdict(), { ...baseOpts, coverage });

    const f1 = result.results.gate?.find((g) => g.gateId === 'gate-f1');
    const general = result.results.gate?.find((g) => g.gateId === 'general-rulesets');
    expect(f1?.risks.map((r) => r.ruleRef)).toEqual(['PG-F1-002']); // was [] before GT-601
    expect(general?.risks).toHaveLength(0); // no coverage risk concerns its rules
  });

  it('never counts what could not be checked as checked (GT-569 denominator)', () => {
    const result = mapPipelineVerdict(dualEngineVerdict(), { ...baseOpts, coverage });

    expect(result.results.compliance?.skippedChecks).toBe(2); // skipped + errored
    expect(result.results.compliance?.totalChecks).toBe(5); // 3 evaluated + 2 unknown
  });

  it('reports no risk when the pipeline declared no coverage shortfall', () => {
    expect(coverageRisks(undefined)).toEqual([]);
    expect(mapPipelineVerdict(dualEngineVerdict(), baseOpts).risks).toEqual([]);
  });
});

describe('mapPipelineVerdict — missingEvidence (GT-601 AC4)', () => {
  it('names the artifacts the consumer required and never presented', () => {
    const result = mapPipelineVerdict(dualEngineVerdict(), {
      ...baseOpts,
      declaredArtifacts: {
        required: ['prd.md', 'threat-model.md', 'adr-registry.md'],
        presented: [{ artifactId: 'adr-registry.md' }],
      },
    });

    // prd.md was evaluated by the pipeline, adr-registry.md was presented.
    expect(result.missingEvidence).toEqual(['threat-model.md']); // was [] before GT-601
  });

  it('is empty when nothing was declared as required (nothing can be missing)', () => {
    expect(mapPipelineVerdict(dualEngineVerdict(), baseOpts).missingEvidence).toEqual([]);
    expect(deriveMissingEvidence(undefined, new Set())).toEqual([]);
  });

  it('stays distinct from incompleteArtifacts (present but failing)', () => {
    const result = mapPipelineVerdict(dualEngineVerdict(), {
      ...baseOpts,
      declaredArtifacts: { required: ['src/domain/x.ts', 'threat-model.md'] },
    });

    expect(result.incompleteArtifacts).toContain('src/domain/x.ts');
    expect(result.missingEvidence).toEqual(['threat-model.md']);
  });
});

describe('downstream consumers of the traceability fields (GT-601 AC3)', () => {
  it('emits a NON-ZERO evaluatedRules on the evidence manifest of a real evaluation', () => {
    const result = mapPipelineVerdict(dualEngineVerdict(), baseOpts);
    const manifest = emitEvaluationEvidence(result, 'evaluation-result');

    expect(manifest.evaluatedRules).toEqual(['HXA-01', 'PG-F1-001', 'PG-F1-002']); // was undefined
    expect(manifest.evaluatedRules?.length).toBeGreaterThan(0);
  });

  it('lists the executed rules in the SARIF driver catalog, not only the ones that failed', () => {
    const log = exportEvaluationResultToSarif(mapPipelineVerdict(dualEngineVerdict(), baseOpts));

    expect(log.runs[0].tool.driver.rules.map((r) => r.id)).toEqual([
      'HXA-01',
      'PG-F1-001',
      'PG-F1-002',
    ]);
  });

  it('reports a non-zero evaluatedRules on the PR drift-gate evidence manifest', () => {
    const decision = evaluateDriftGate({ result: mapPipelineVerdict(dualEngineVerdict(), baseOpts) });

    expect(decision.evidence.evaluatedRules).toEqual(['HXA-01', 'PG-F1-001', 'PG-F1-002']);
    expect(decision.blocked).toBe(true);
  });

  it('a clean (all-passing) evaluation still proves which rules ran', () => {
    const verdict = dualEngineVerdict();
    verdict.passed = true;
    verdict.gates[1].verdict = 'passed';
    verdict.gates[1].artifactEvaluations[0].passed = true;

    const result = mapPipelineVerdict(verdict, baseOpts);
    const manifest = emitEvaluationEvidence(result, 'evaluation-result');

    expect(result.gaps).toHaveLength(0);
    expect(manifest.evaluatedRules).toHaveLength(3); // the whole point: PASS ≠ "0 rules evaluated"
  });
});
