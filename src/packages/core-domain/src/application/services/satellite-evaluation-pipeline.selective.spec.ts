/**
 * GT-614 — selective execution in the pipeline the deployed Core actually runs.
 *
 * The contract half of GT-614 (the plan, the reference `createKindSelectivePipeline`)
 * already had its own suite. It proved nothing about the product, because no surface
 * had adopted it: `SatelliteEvaluationPipeline` — the pipeline behind
 * `POST /api/v1/evaluate`, `evolith evaluate` and the MCP `evaluate` tool — took no
 * plan at all, so asking for `compliance` alone still loaded the f1..f5 gate corpus
 * and ran every Rego rule in it. That is the gap's own sentence, still true.
 *
 * The load-bearing assertions here are NEGATIVE and about OUTCOMES, not counts: the
 * out-of-scope stage is one that WOULD FAIL the run if it executed. A call-count or
 * timing assertion would keep passing under a refactor that quietly re-ran the gate
 * and discarded its result afterwards; a verdict assertion cannot.
 */

import { SatelliteEvaluationPipeline } from './satellite-evaluation-pipeline.service';
import { createPipelineExecutionPlan } from '../../evaluation/ports/evaluation-pipeline.port';
import { mapPipelineVerdict } from '../../evaluation/canonical-result.mapper';
import { IFileSystem, ILogger } from '../../domain/interfaces';

const mockLoadGatesForPhase = jest.fn();
jest.mock('./sdlc-data-loader.service', () => ({
  SdlcDataLoaderService: jest.fn().mockImplementation(() => ({
    loadGatesForPhase: mockLoadGatesForPhase,
    loadPhase: jest.fn(),
    loadAllPhases: jest.fn(),
    loadAllGates: jest.fn(),
  })),
}));

const mockEvaluateAll = jest.fn();
jest.mock('../validators/evaluators/opa-evaluator', () => ({
  OpaEvaluator: jest.fn().mockImplementation(() => ({ evaluateAll: mockEvaluateAll })),
}));

jest.mock('./topology-catalog.service');

/**
 * A phase gate that FAILS: its required artifact is absent (`fs.exists` → false),
 * which `evaluateGate` turns into a failed, error-severity evaluation and a failed
 * gate. If the stage runs, the run cannot pass — that is what makes the assertions
 * below impossible to satisfy by accident.
 */
const FAILING_PHASE_GATE = {
  id: 'gate-f2',
  name: 'Design Baseline',
  phase: 'f2',
  description: 'Design frozen',
  requiredArtifacts: [
    {
      artifact: 'docs/adrs',
      validation: 'At least one ADR must exist',
      rules: ['rulesets/opa/governance.rego'],
    },
  ],
  blockingCriteria: [{ criterion: 'adrs missing', action: 'BLOCK' }],
};

/** A clean corpus run: 12 rules evaluated, nothing skipped, nothing errored. */
const CLEAN_GENERAL_RESULT = {
  status: 'passed',
  rulesChecked: 12,
  rulesSkipped: 0,
  rulesErrored: 0,
  rulesTotal: 12,
  skippedRuleIds: [],
  erroredRuleIds: [],
  issues: [],
  coreRef: { version: null, path: '/core' },
  timestamp: '2026-07-29T00:00:00.000Z',
};

const MANIFEST = { satellitePath: '/satellite', corePath: '/core', topology: 'modular-monolith' };

describe('SatelliteEvaluationPipeline · kind-selective execution (GT-614)', () => {
  let fs: jest.Mocked<IFileSystem>;
  let logger: jest.Mocked<ILogger>;
  let validator: { validate: jest.Mock };
  let pipeline: SatelliteEvaluationPipeline;

  beforeEach(() => {
    mockLoadGatesForPhase.mockReset().mockResolvedValue([FAILING_PHASE_GATE]);
    mockEvaluateAll.mockReset().mockResolvedValue([{ rule: {} as never, result: 'passed' }]);

    fs = {
      // The gate's required artifact is MISSING — the phase-gate stage fails.
      exists: jest.fn().mockResolvedValue(false),
      existsSync: jest.fn().mockReturnValue(false),
      readFile: jest.fn(),
      readdir: jest.fn(),
    } as unknown as jest.Mocked<IFileSystem>;
    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as jest.Mocked<ILogger>;
    validator = { validate: jest.fn().mockResolvedValue(CLEAN_GENERAL_RESULT) };

    pipeline = new SatelliteEvaluationPipeline(fs, logger, validator as never, '/core');
  });

  it('BASELINE: the phase gate really does fail the run when it is in scope', async () => {
    const verdict = await pipeline.evaluate(MANIFEST as never);

    expect(verdict.passed).toBe(false);
    expect(verdict.gates.find((g) => g.gateId === 'gate-f2')?.verdict).toBe('failed');
  });

  it('does NOT execute the phase-gate stage for a `compliance`-only request — the gate that would FAIL never runs', async () => {
    const verdict = await pipeline.evaluate(
      MANIFEST as never,
      createPipelineExecutionPlan(['compliance']),
    );

    // The outcome assertion: the failure of a gate nobody asked for cannot reach
    // this verdict, because the gate was never evaluated.
    expect(verdict.passed).toBe(true);
    expect(verdict.gates.map((g) => g.gateId)).not.toContain('gate-f2');
    // …and it was not merely filtered afterwards: nothing was even loaded.
    expect(mockLoadGatesForPhase).not.toHaveBeenCalled();
    expect(mockEvaluateAll).not.toHaveBeenCalled();
    // The stage that WAS requested still ran.
    expect(validator.validate).toHaveBeenCalledTimes(1);
  });

  it('does NOT run the ruleset corpus for a `gate`-only request', async () => {
    fs.exists.mockResolvedValue(true); // let the phase gate pass, to isolate the stage
    const verdict = await pipeline.evaluate(
      MANIFEST as never,
      createPipelineExecutionPlan(['gate']),
    );

    expect(validator.validate).not.toHaveBeenCalled();
    expect(mockLoadGatesForPhase).toHaveBeenCalled();
    expect(verdict.coverage?.outOfScopeGateIds).toEqual(['general-rulesets']);
  });

  it('records the unrun stage as OUT OF SCOPE — neither checked, nor skipped, nor errored', async () => {
    const verdict = await pipeline.evaluate(
      MANIFEST as never,
      createPipelineExecutionPlan(['compliance']),
    );

    expect(verdict.coverage?.outOfScopeGateIds).toEqual(['sdlc-phase-gates']);
    // GT-595: `skipped` would now FAIL the run for a blocking rule, and it would be
    // a lie — the engine never tried. Out of scope is its own bucket.
    expect(verdict.coverage?.rulesSkipped).toBe(0);
    expect(verdict.coverage?.skippedRuleIds).toEqual([]);
    expect(verdict.coverage?.rulesErrored).toBe(0);
    expect(verdict.coverage?.erroredRuleIds).toEqual([]);
    // Nor a gate result carrying a `skipped` verdict, which the canonical mapper
    // would read as Verdict.SKIP for a gate that was never considered.
    expect(verdict.gates.some((g) => g.verdict === 'skipped')).toBe(false);
  });

  it('keeps the published ratio honest: the denominator counts only the in-scope stage', async () => {
    const full = await pipeline.evaluate(MANIFEST as never);
    const scoped = await pipeline.evaluate(
      MANIFEST as never,
      createPipelineExecutionPlan(['compliance']),
    );

    // Before: the phase-gate rules are in the denominator of a request that never
    // asked for them. The manifest names no phase, so the pipeline walks f1..f5 —
    // 5 gate evaluations here — plus the 12 corpus rules.
    expect(full.summary.totalRules).toBe(17);
    expect(full.coverage?.rulesChecked).toBe(17);
    expect(full.coverage?.rulesTotal).toBe(17);

    // After: only the corpus the request asked for. The out-of-scope stage is not
    // in the numerator OR the denominator — the ratio still describes what ran.
    expect(scoped.summary.totalRules).toBe(12);
    expect(scoped.coverage?.rulesChecked).toBe(12);
    expect(scoped.coverage?.rulesTotal).toBe(12);
    expect(scoped.coverage!.rulesChecked).toBe(scoped.coverage!.rulesTotal);
  });

  it('produces NO coverage risk for the out-of-scope stage (an unasked question is not an unanswered one)', async () => {
    const verdict = await pipeline.evaluate(
      MANIFEST as never,
      createPipelineExecutionPlan(['compliance']),
    );
    const result = mapPipelineVerdict(verdict, {
      coreVersion: '1.0.5',
      evaluatedAt: verdict.evaluatedAt,
      coverage: verdict.coverage,
    });

    expect(result.risks).toEqual([]);
    expect(result.results.compliance?.skippedChecks).toBe(0);
    expect(result.results.compliance?.totalChecks).toBe(12);
  });

  it('runs both stages when no plan is supplied, and when the plan is unrestricted', async () => {
    await pipeline.evaluate(MANIFEST as never);
    expect(mockLoadGatesForPhase).toHaveBeenCalled();
    expect(validator.validate).toHaveBeenCalledTimes(1);

    mockLoadGatesForPhase.mockClear();
    validator.validate.mockClear();

    // `kinds: []` is what the inline REST callers that predate the field still
    // send: nothing DECLARED, not nothing wanted.
    const verdict = await pipeline.evaluate(MANIFEST as never, createPipelineExecutionPlan([]));
    expect(mockLoadGatesForPhase).toHaveBeenCalled();
    expect(validator.validate).toHaveBeenCalledTimes(1);
    expect(verdict.coverage?.outOfScopeGateIds).toEqual([]);
    expect(verdict.passed).toBe(false); // the failing gate is in scope again
  });

  it('serves `artifact` from the phase-gate stage and `rule` from the corpus stage', async () => {
    fs.exists.mockResolvedValue(true);

    await pipeline.evaluate(MANIFEST as never, createPipelineExecutionPlan(['artifact']));
    expect(mockLoadGatesForPhase).toHaveBeenCalled();
    expect(validator.validate).not.toHaveBeenCalled();

    mockLoadGatesForPhase.mockClear();

    await pipeline.evaluate(MANIFEST as never, createPipelineExecutionPlan(['rule']));
    expect(mockLoadGatesForPhase).not.toHaveBeenCalled();
    expect(validator.validate).toHaveBeenCalledTimes(1);
  });

  it('GT-595 invariant is untouched: a blocking rule the ENGINE skipped is still reported as skipped', async () => {
    // The corpus stage IS in scope here; its own skipped/errored accounting must
    // travel unchanged. Out-of-scope must never be a hiding place for coverage debt.
    validator.validate.mockResolvedValue({
      ...CLEAN_GENERAL_RESULT,
      status: 'failed',
      rulesChecked: 10,
      rulesSkipped: 2,
      rulesTotal: 12,
      skippedRuleIds: ['BLOCKING-01', 'BLOCKING-02'],
      blockingSkippedRuleIds: ['BLOCKING-01'],
      issues: [
        {
          ruleId: 'GOV-RULE-BLOCKING-SKIPPED',
          severity: 'MUST',
          category: 'governance',
          title: '1 blocking rule did not run',
          description: 'BLOCKING-01 is blocking and was skipped.',
          blocking: true,
        },
      ],
    });

    const verdict = await pipeline.evaluate(
      MANIFEST as never,
      createPipelineExecutionPlan(['compliance']),
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.gates.find((g) => g.gateId === 'general-rulesets')?.verdict).toBe('failed');
    expect(verdict.coverage?.rulesSkipped).toBe(2);
    expect(verdict.coverage?.skippedRuleIds).toEqual(['BLOCKING-01', 'BLOCKING-02']);
    // checked + skipped + errored === total (GT-569), with out-of-scope outside it.
    expect(verdict.coverage!.rulesChecked + verdict.coverage!.rulesSkipped).toBe(
      verdict.coverage!.rulesTotal,
    );
    expect(verdict.coverage?.outOfScopeGateIds).toEqual(['sdlc-phase-gates']);
  });
});
