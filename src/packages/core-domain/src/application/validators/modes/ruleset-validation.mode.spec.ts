/**
 * GT-312: Ruleset Validation Mode - Unit Tests
 * GT-701: parsing is not checking.
 */

import { RulesetValidationMode } from './ruleset-validation.mode';
import {
  RulesetEvaluationOutcome,
  RulesetEvaluationPort,
  ValidationContext,
} from './validation-mode.interface';
import path from 'path';

/** `<repo>/src` — the corpus root the RULESET_ID_MAP paths are relative to. */
const CORPUS_ROOT = path.resolve(__dirname, '../../../../../..');

function contextFor(rulesetId: string, extra: Partial<ValidationContext> = {}): ValidationContext {
  return {
    satellitePath: CORPUS_ROOT,
    corePath: CORPUS_ROOT,
    engine: 'native',
    rulesetId,
    ...extra,
  };
}

function evaluatorReturning(outcome: Partial<RulesetEvaluationOutcome>): RulesetEvaluationPort & {
  calls: Array<[string, string | undefined, unknown]>;
} {
  const calls: Array<[string, string | undefined, unknown]> = [];
  return {
    calls,
    async validate(satellitePath, corePath, selection) {
      calls.push([satellitePath, corePath, selection]);
      return {
        status: 'passed',
        rulesChecked: 0,
        issues: [],
        ...outcome,
      } as RulesetEvaluationOutcome;
    },
  };
}

describe('RulesetValidationMode', () => {
  let mode: RulesetValidationMode;

  beforeEach(() => {
    mode = new RulesetValidationMode();
  });

  describe('canHandle', () => {
    it('should return true when rulesetId is provided', () => {
      expect(mode.canHandle(contextFor('compliance-baseline'))).toBe(true);
    });

    it('should return false when rulesetId is not provided', () => {
      expect(mode.canHandle({ satellitePath: '/test', engine: 'native' })).toBe(false);
    });
  });

  /**
   * GT-701 — the regression these tests exist for.
   *
   * The previous version of this suite asserted `status: 'passed'` and
   * `rulesChecked: 10` for a ruleset nothing had evaluated. It passed green
   * against a mode that only read JSON, which is why the defect survived: the
   * test encoded the bug as the expectation.
   */
  describe('without an evaluator, it refuses instead of passing', () => {
    it.each([
      ['compliance-baseline', 7],
      ['definition-of-done', 10],
      ['engineering-manifesto', 10],
      ['repository-taxonomy', 11],
      ['quality-thresholds', 8],
    ])('reports %s as skipped, never passed', async (rulesetId, ruleCount) => {
      const result = await mode.validate(contextFor(rulesetId));

      expect(result.mode).toBe('ruleset');
      expect(result.status).toBe('failed');
      expect(result.rulesChecked).toBe(0);
      expect(result.rulesSkipped).toBe(ruleCount);
      expect(result.rulesTotal).toBe(ruleCount);
      expect(result.skippedRuleIds).toHaveLength(ruleCount);

      // The heart of the row: not one `pass` for a rule that was only parsed.
      expect(result.issues.filter((issue) => issue.status === 'pass')).toEqual([]);
      expect(result.issues).toEqual([
        expect.objectContaining({ ruleId: 'RULESET_NOT_EVALUATED', status: 'fail' }),
      ]);
      expect(result.metadata).toEqual({ rulesetId, evaluated: false });
    });

    it('refuses a ruleset whose file declares no rules at all', async () => {
      // `acl` is one of the eight shipped ruleset files with no `rules[]`. It used
      // to come back `passed` having examined nothing whatsoever.
      const result = await mode.validate(contextFor('acl'));

      expect(result.status).toBe('failed');
      expect(result.rulesChecked).toBe(0);
      expect(result.issues.some((issue) => issue.status === 'pass')).toBe(false);
    });
  });

  describe('with an evaluator, it reports what the engine actually returned', () => {
    it('selects the ruleset by its corpus-relative path and passes the satellite through', async () => {
      const evaluator = evaluatorReturning({});
      await mode.validate(contextFor('definition-of-done', { evaluator }));

      expect(evaluator.calls).toHaveLength(1);
      const [satellitePath, corePath, selection] = evaluator.calls[0];
      expect(satellitePath).toBe(CORPUS_ROOT);
      expect(corePath).toBe(CORPUS_ROOT);
      expect(selection).toEqual({ rulesetRef: 'rulesets/cross-cutting/definition-of-done.rules.json' });
    });

    it('marks a blocking finding as fail and clears the untouched rules as pass', async () => {
      const evaluator = evaluatorReturning({
        status: 'failed',
        rulesChecked: 10,
        rulesTotal: 10,
        issues: [{
          ruleId: 'DOD-01', severity: 'MUST', title: 'Definition of done missing',
          blocking: true, evaluated: true,
        }],
      });

      const result = await mode.validate(contextFor('definition-of-done', { evaluator }));

      expect(result.status).toBe('failed');
      expect(result.issues).toContainEqual(
        expect.objectContaining({ ruleId: 'DOD-01', status: 'fail', severity: 'error' }),
      );
      // 10 rules in the file, one with a finding, nine cleared by the engine.
      expect(result.rulesChecked).toBe(10);
      expect(result.issues.filter((issue) => issue.status === 'pass')).toHaveLength(9);
      expect(result.metadata).toEqual({ rulesetId: 'definition-of-done', evaluated: true, engine: 'native' });
    });

    it('counts an unevaluated finding as skipped, not checked, and never as pass', async () => {
      // GT-699: `evaluated: false` is an admission the rule never ran.
      const evaluator = evaluatorReturning({
        status: 'failed',
        rulesChecked: 10,
        rulesTotal: 10,
        issues: [{
          ruleId: 'DOD-02', severity: 'MUST', title: 'Rule could not be evaluated',
          blocking: true, evaluated: false,
        }],
      });

      const result = await mode.validate(contextFor('definition-of-done', { evaluator }));

      expect(result.rulesChecked).toBe(9);
      expect(result.rulesSkipped).toBe(1);
      expect(result.skippedRuleIds).toEqual(['DOD-02']);
      // GT-595 AC2: an unevaluated BLOCKING rule fails the run. It is counted as
      // skipped and it is still a `fail` — the two are not the same axis.
      expect(result.status).toBe('failed');
      expect(result.issues).toContainEqual(
        expect.objectContaining({ ruleId: 'DOD-02', status: 'fail' }),
      );
      expect(result.issues.filter((issue) => issue.ruleId === 'DOD-02' && issue.status === 'pass')).toEqual([]);
    });

    it('does not clear a rule the engine reported as skipped', async () => {
      const evaluator = evaluatorReturning({
        rulesChecked: 8,
        rulesTotal: 10,
        skippedRuleIds: ['DOD-03', 'DOD-04'],
      });

      const result = await mode.validate(contextFor('definition-of-done', { evaluator }));

      expect(result.rulesChecked).toBe(8);
      expect(result.rulesSkipped).toBe(2);
      expect(result.issues.map((issue) => issue.ruleId)).not.toContain('DOD-03');
    });

    /**
     * GT-701 AC3 — `engine` reaches something. Before this row it was merged into
     * the context at `composable-validation-engine.ts:77` and read by nobody, so
     * `--engine opa` and `--engine native` produced identical output on all three
     * surfaces.
     */
    it('records the engine the host built the evaluator for', async () => {
      const evaluator = evaluatorReturning({});
      const result = await mode.validate(contextFor('definition-of-done', { evaluator, engine: 'opa' }));

      expect(result.metadata).toEqual(
        expect.objectContaining({ engine: 'opa', evaluated: true }),
      );
    });
  });
});
