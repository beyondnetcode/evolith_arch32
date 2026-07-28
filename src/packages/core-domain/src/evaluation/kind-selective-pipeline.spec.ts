/**
 * GT-614 — selective execution INSIDE the pipeline.
 *
 * The load-bearing assertion in this file is negative: a gate that WOULD fail is
 * never invoked when its kind was not requested. Anything that merely filtered the
 * output afterwards would still pay for the gate AND would still let its failure
 * shape the verdict, which is the defect the gap describes.
 */

import {
  createKindSelectivePipeline,
  selectGates,
  type PipelineGateSpec,
} from './kind-selective-pipeline';
import {
  createPipelineExecutionPlan,
  type PipelineVerdict,
} from './ports/evaluation-pipeline.port';
import { mapPipelineVerdict } from './canonical-result.mapper';
import type { RuleEvaluation, SatelliteManifest } from '../domain/satellite-manifest';
import { Verdict } from '../domain/verdict/verdict';

const manifest = { satellitePath: '/ws/sat', corePath: '/ws/core' } as unknown as SatelliteManifest;

function passingRule(ruleId: string, gateRef: string): RuleEvaluation {
  return {
    ruleId,
    rulePath: `rulesets/opa/${gateRef}.rego`,
    artifact: 'evolith.yaml',
    passed: true,
    message: 'ok',
    severity: 'error',
    remediation: '',
    gateRef,
  };
}

function failingRule(ruleId: string, gateRef: string): RuleEvaluation {
  return {
    ...passingRule(ruleId, gateRef),
    passed: false,
    message: `${ruleId} failed`,
    remediation: 'fix it',
  };
}

/**
 * A phase gate that FAILS, and a compliance gate that passes. Asking only for
 * `compliance` must cost nothing on the phase gate — not its execution, not its
 * verdict, not a denominator entry.
 */
function fixture() {
  const phaseGate = {
    gateId: 'gate-f2',
    gateName: 'Design Baseline',
    phase: 'f2',
    kinds: ['gate', 'artifact'] as const,
    evaluate: jest.fn(async () => [failingRule('PG-F2-001', 'gate-f2')]),
  };
  const complianceGate = {
    gateId: 'compliance-baseline',
    gateName: 'Compliance Baseline',
    phase: 'cross',
    kinds: ['compliance'] as const,
    evaluate: jest.fn(async () => [passingRule('CMP-01', 'compliance-baseline')]),
  };
  const unclassifiedGate = {
    gateId: 'general-rulesets',
    gateName: 'Canonical Ruleset Enforcement',
    phase: 'cross',
    kinds: [] as const,
    evaluate: jest.fn(async () => [passingRule('HXA-01', 'general-rulesets')]),
  };
  return { phaseGate, complianceGate, unclassifiedGate };
}

const now = () => '2026-07-28T00:00:00.000Z';

describe('createKindSelectivePipeline (GT-614)', () => {
  it('does NOT execute a gate whose kind was not requested — even one that would FAIL', async () => {
    const { phaseGate, complianceGate } = fixture();
    const pipeline = createKindSelectivePipeline([phaseGate, complianceGate], { now });

    const verdict = await pipeline.evaluate(manifest, createPipelineExecutionPlan(['compliance']));

    // The whole point: never invoked. Before GT-614's second half this ran and its
    // failure shaped a verdict for a question nobody asked.
    expect(phaseGate.evaluate).not.toHaveBeenCalled();
    expect(complianceGate.evaluate).toHaveBeenCalledTimes(1);

    // And its failure therefore cannot reach the verdict.
    expect(verdict.passed).toBe(true);
    expect(verdict.gates.map((g) => g.gateId)).toEqual(['compliance-baseline']);
  });

  it('keeps the GT-569 denominator honest: out of scope is neither skipped nor errored', async () => {
    const { phaseGate, complianceGate } = fixture();
    const pipeline = createKindSelectivePipeline([phaseGate, complianceGate], { now });

    const verdict = await pipeline.evaluate(manifest, createPipelineExecutionPlan(['compliance']));

    expect(verdict.summary).toEqual({
      totalGates: 1,
      passedGates: 1,
      failedGates: 0,
      totalRules: 1,
      passedRules: 1,
      failedRules: 0,
    });
    expect(verdict.coverage?.rulesTotal).toBe(1); // the unrun gate is NOT in the denominator
    expect(verdict.coverage?.rulesSkipped).toBe(0);
    expect(verdict.coverage?.rulesErrored).toBe(0);
    expect(verdict.coverage?.skippedRuleIds).toEqual([]);
    expect(verdict.coverage?.erroredRuleIds).toEqual([]);
    // Recorded, once, in its own bucket — so a reader can see what was not bought.
    expect(verdict.coverage?.outOfScopeGateIds).toEqual(['gate-f2']);
    // And never as a `skipped` gate result, which the mapper would read as Verdict.SKIP.
    expect(verdict.gates.some((g) => g.verdict === 'skipped')).toBe(false);
  });

  it('produces NO coverage risk for an out-of-scope gate (an unasked question is not an unanswered one)', async () => {
    const { phaseGate, complianceGate } = fixture();
    const pipeline = createKindSelectivePipeline([phaseGate, complianceGate], { now });

    const verdict: PipelineVerdict = await pipeline.evaluate(
      manifest,
      createPipelineExecutionPlan(['compliance']),
    );
    const result = mapPipelineVerdict(verdict, {
      coreVersion: '1.0.5',
      evaluatedAt: verdict.evaluatedAt,
      coverage: verdict.coverage,
    });

    expect(result.risks).toEqual([]);
    expect(result.results.compliance?.totalChecks).toBe(1);
    expect(result.results.compliance?.skippedChecks).toBe(0);
    expect(result.overallVerdict).toBe(Verdict.PASS);
    expect(result.rulesExecuted.map((r) => r.ruleId)).toEqual(['CMP-01']);
  });

  it('runs a gate whose kind IS requested, and the failure reaches the verdict', async () => {
    const { phaseGate, complianceGate } = fixture();
    const pipeline = createKindSelectivePipeline([phaseGate, complianceGate], { now });

    const verdict = await pipeline.evaluate(manifest, createPipelineExecutionPlan(['gate']));

    expect(phaseGate.evaluate).toHaveBeenCalledTimes(1);
    expect(complianceGate.evaluate).not.toHaveBeenCalled();
    expect(verdict.passed).toBe(false);
    expect(verdict.coverage?.outOfScopeGateIds).toEqual(['compliance-baseline']);
  });

  it('runs an UNCLASSIFIED gate always — a missing annotation must not become a missing check', async () => {
    const { phaseGate, complianceGate, unclassifiedGate } = fixture();
    const pipeline = createKindSelectivePipeline(
      [phaseGate, complianceGate, unclassifiedGate],
      { now },
    );

    await pipeline.evaluate(manifest, createPipelineExecutionPlan(['compliance']));

    expect(unclassifiedGate.evaluate).toHaveBeenCalledTimes(1);
  });

  it('runs everything when no plan is supplied, and when the plan is unrestricted', async () => {
    const a = fixture();
    const noPlan = createKindSelectivePipeline([a.phaseGate, a.complianceGate], { now });
    await noPlan.evaluate(manifest);
    expect(a.phaseGate.evaluate).toHaveBeenCalledTimes(1);
    expect(a.complianceGate.evaluate).toHaveBeenCalledTimes(1);

    const b = fixture();
    const empty = createKindSelectivePipeline([b.phaseGate, b.complianceGate], { now });
    await empty.evaluate(manifest, createPipelineExecutionPlan([]));
    expect(b.phaseGate.evaluate).toHaveBeenCalledTimes(1);
    expect(b.complianceGate.evaluate).toHaveBeenCalledTimes(1);
  });

  it('reports a THROWING gate as errored — a different bucket from out of scope', async () => {
    const boom: PipelineGateSpec = {
      gateId: 'gate-f3',
      gateName: 'Build Gate',
      phase: 'f3',
      kinds: ['gate'],
      evaluate: async () => {
        throw new Error('evaluator exploded');
      },
    };
    const pipeline = createKindSelectivePipeline([boom], { now });

    const verdict = await pipeline.evaluate(manifest, createPipelineExecutionPlan(['gate']));

    expect(verdict.passed).toBe(false);
    expect(verdict.coverage?.erroredRuleIds).toEqual(['gate-f3']);
    expect(verdict.coverage?.rulesTotal).toBe(1); // errored IS in the denominator
    expect(verdict.coverage?.outOfScopeGateIds).toEqual([]);
  });

  it('stamps the resolved topology only when a resolver supplies one', async () => {
    const { complianceGate } = fixture();
    expect(
      (await createKindSelectivePipeline([complianceGate], { now }).evaluate(manifest))
        .resolvedTopology,
    ).toBeNull();
    expect(
      (
        await createKindSelectivePipeline([complianceGate], {
          now,
          resolveTopology: () => 'modular-monolith',
        }).evaluate(manifest)
      ).resolvedTopology,
    ).toBe('modular-monolith');
  });
});

describe('createPipelineExecutionPlan / selectGates (GT-614)', () => {
  it('treats an empty request as unrestricted (nothing declared ≠ nothing wanted)', () => {
    const plan = createPipelineExecutionPlan([]);
    expect(plan.unrestricted).toBe(true);
    expect(plan.includesGate(['gate'])).toBe(true);
  });

  it('admits a gate only when one of its kinds was requested', () => {
    const plan = createPipelineExecutionPlan(['compliance']);
    expect(plan.unrestricted).toBe(false);
    expect(plan.includesGate(['compliance'])).toBe(true);
    expect(plan.includesGate(['gate', 'compliance'])).toBe(true);
    expect(plan.includesGate(['gate'])).toBe(false);
    expect(plan.includesGate([])).toBe(true); // unclassified
  });

  it('deduplicates the requested kinds it reports', () => {
    expect(createPipelineExecutionPlan(['gate', 'gate', 'rule']).requestedKinds).toEqual([
      'gate',
      'rule',
    ]);
  });

  it('partitions gates without executing any of them', () => {
    const { phaseGate, complianceGate } = fixture();
    const { selected, outOfScope } = selectGates(
      [phaseGate, complianceGate],
      createPipelineExecutionPlan(['compliance']),
    );
    expect(selected.map((g) => g.gateId)).toEqual(['compliance-baseline']);
    expect(outOfScope.map((g) => g.gateId)).toEqual(['gate-f2']);
    expect(phaseGate.evaluate).not.toHaveBeenCalled();
    expect(complianceGate.evaluate).not.toHaveBeenCalled();
  });
});
