/**
 * GT-595 (AC2) — `blocking` + `skipped` fails the run.
 *
 * GT-569 made the denominator honest and, in doing so, exposed the combination
 * this suite pins: a rule declared `blocking: true` that the engine reports
 * `skipped` produces exactly the same report as a blocking rule that PASSED —
 * no finding. "0 blocking findings" and "the blocking rules never ran" were
 * indistinguishable, so the verdict claimed coverage it did not earn.
 *
 * Every assertion below fails against the pre-GT-595-AC2 code, where a skipped
 * blocking rule produced at most a `SHOULD`-severity, `blocking: false` advisory
 * (and, for the non-executable classes, nothing at all).
 *
 * The invariant is enforced at ONE place — `RuleEvaluationEngine.toValidationIssues`,
 * which is where both callers in the product (`RulesetValidatorService.validate`
 * and `runArchitectureValidation`) build their verdict — and it is a
 * `blocking: true` ISSUE rather than a thrown error. See the doc comment on
 * `blockingSkippedIssue` for why: `validate` catches engine exceptions and
 * downgrades them to a logged warning, so a throw would be silently suppressed
 * by the only caller, and it would abort the corpus at the first offender
 * instead of enumerating all of them.
 */

import { RuleEvaluationEngine, mergeRuleCoverage, summarizeRuleCoverage } from './rule-evaluation-engine';
import { RulesetValidatorService } from './ruleset-validator.service';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { NormalizedRule } from '../../domain/models/normalized-rule';
import { RuleEvaluationResult } from './evaluators/evaluator.interface';

const logger = (): jest.Mocked<ILogger> =>
  ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), success: jest.fn() }) as never;

const fsMock = (overrides?: Partial<IFileSystem>): IFileSystem =>
  ({
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(false),
    readFile: jest.fn().mockResolvedValue(''),
    readJson: jest.fn().mockResolvedValue({}),
    readdirNames: jest.fn().mockResolvedValue([]),
    writeFile: jest.fn().mockResolvedValue(undefined),
    writeJson: jest.fn().mockResolvedValue(undefined),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => false }),
    ...overrides,
  }) as unknown as IFileSystem;

const rule = (over: Partial<NormalizedRule> & { id: string }): NormalizedRule =>
  ({
    severity: 'MUST',
    category: 'governance',
    title: `Title of ${over.id}`,
    description: `Description of ${over.id}`,
    blocking: true,
    sourceFile: 'rulesets/test.rules.json',
    ...over,
  }) as NormalizedRule;

const engine = () =>
  new RuleEvaluationEngine({
    fileSystem: fsMock(),
    logger: logger(),
    rulesetRepo: {} as never,
    strategy: { evaluateAll: async () => [] } as never,
  });

describe('GT-595 AC2 · the coverage summary names the offending combination', () => {
  it('publishes every blocking rule that did not run', () => {
    const c = summarizeRuleCoverage([
      { rule: rule({ id: 'RAN-01' }), result: 'passed' },
      { rule: rule({ id: 'BLOCK-SKIP-01' }), result: 'skipped' },
      { rule: rule({ id: 'ADVISORY-SKIP-01', blocking: false }), result: 'skipped' },
    ]);

    expect(c.blockingSkippedRuleIds).toEqual(['BLOCK-SKIP-01']);
  });

  it('is a SUPERSET of blockingNonExecutableRuleIds — "no handler yet" counts too', () => {
    const c = summarizeRuleCoverage([
      // Nothing will ever run this one (documentation-only).
      { rule: rule({ id: 'CORE-0111-01' }), result: 'skipped', evaluability: 'documentation-only' },
      // This one is real, closeable handler debt — and still must not block silently.
      { rule: rule({ id: 'SEC-INJ-01' }), result: 'skipped', evaluability: 'unimplemented-native' },
    ]);

    expect(c.blockingNonExecutableRuleIds).toEqual(['CORE-0111-01']);
    expect(c.blockingSkippedRuleIds).toEqual(['CORE-0111-01', 'SEC-INJ-01']);
  });

  it('leaves the GT-569 identity untouched — the rule stays `skipped`, it is not promoted to checked', () => {
    const c = summarizeRuleCoverage([
      { rule: rule({ id: 'RAN-01' }), result: 'passed' },
      { rule: rule({ id: 'BLOCK-SKIP-01' }), result: 'skipped' },
    ]);

    expect(c.rulesChecked).toBe(1);
    expect(c.rulesSkipped).toBe(1);
    expect(c.rulesChecked + c.rulesSkipped + c.rulesErrored).toBe(c.rulesTotal);
  });

  it('accumulates across engine invocations (the architecture-validator path merges coverage)', () => {
    const a = summarizeRuleCoverage([{ rule: rule({ id: 'A-01' }), result: 'skipped' }]);
    const b = summarizeRuleCoverage([{ rule: rule({ id: 'B-01' }), result: 'skipped' }]);
    expect(mergeRuleCoverage(a, b).blockingSkippedRuleIds).toEqual(['A-01', 'B-01']);
  });
});

describe('GT-595 AC2 · the issue is blocking, so the run cannot pass', () => {
  it('emits a BLOCKING issue for a blocking rule that skipped', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'SEC-INJ-01' }), result: 'skipped', message: 'no handler supports it' },
    ]);

    const issue = issues.find(i => i.ruleId === 'SEC-INJ-01');
    expect(issue).toBeDefined();
    expect(issue!.blocking).toBe(true);
    expect(issue!.severity).toBe('MUST');
    expect(issue!.title).toContain('Blocking rule did not run');
    expect(issue!.description).toContain('no handler supports it');
    expect(issue!.description).toContain('unimplemented-native');
  });

  it('emits it for the non-executable classes too — those are the worst case, not an exemption', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'CORE-0111-01', category: 'adr-conformance' }), result: 'skipped', evaluability: 'documentation-only' },
      { rule: rule({ id: 'KI-R01' }), result: 'skipped', evaluability: 'underspecified' },
    ]);

    const blocking = issues.filter(i => i.blocking).map(i => i.ruleId);
    expect(blocking).toEqual(['CORE-0111-01', 'KI-R01']);
    // The remedy must say what a non-executable rule actually needs.
    expect(issues.find(i => i.ruleId === 'KI-R01')!.description).toContain('set `blocking: false`');
  });

  it('reports the rule ONCE — the GT-569 advisory does not double-report it', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'SEC-INJ-01' }), result: 'skipped' },
    ]);

    expect(issues.filter(i => i.ruleId === 'SEC-INJ-01')).toHaveLength(1);
    expect(issues.some(i => i.title.startsWith('MUST rule not evaluated'))).toBe(false);
  });

  it('leaves a NON-blocking skipped rule as the GT-569 advisory it was', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'SEC-INJ-01', blocking: false }), result: 'skipped' },
    ]);

    expect(issues.find(i => i.ruleId === 'SEC-INJ-01')!.blocking).toBe(false);
    expect(issues.find(i => i.ruleId === 'SEC-INJ-01')!.title).toContain('MUST rule not evaluated');
  });

  it('does not fire for a blocking rule that actually ran', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'OK-01' }), result: 'passed' },
    ]);
    expect(issues).toEqual([]);
  });

  it('does not fire for `errored` — GT-569 keeps a crashing handler distinct from a skip', () => {
    // Deliberate scope line: AC2 is about a rule that DECLINED to run. A handler
    // that threw is an engine defect, already surfaced by its own advisory, and
    // conflating the two would undo the distinction GT-569 exists to make.
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'CRASH-01' }), result: 'errored', message: 'boom' },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].blocking).toBe(false);
    expect(issues[0].title).toContain('Rule evaluation errored');
  });
});

describe('GT-595 AC2 · RulesetValidatorService cannot sign off on it', () => {
  class ScriptedStrategy {
    constructor(private readonly script: ReadonlyArray<[NormalizedRule, RuleEvaluationResult['result']]>) {}
    async evaluateAll(): Promise<RuleEvaluationResult[]> {
      return this.script.map(([r, result]) => ({ rule: r, result }));
    }
  }

  function buildService(
    script: ReadonlyArray<[NormalizedRule, RuleEvaluationResult['result']]>,
  ): RulesetValidatorService {
    const rules = script.map(([r]) => r);
    const repo = { loadAllRulesets: jest.fn().mockResolvedValue(rules) } as never;
    const service = new RulesetValidatorService({
      fileSystem: fsMock({ exists: jest.fn().mockResolvedValue(true), readFile: jest.fn().mockResolvedValue('') }),
      logger: logger(),
      configParser: { parse: jest.fn().mockReturnValue({}) } as never,
      rulesetRepo: repo,
      // NO maxSkippedFraction: unlike the GT-569 coverage floor, this invariant
      // is not opt-in. There is no option that turns it off.
    });
    (service as never as { engine: RuleEvaluationEngine }).engine = new RuleEvaluationEngine({
      fileSystem: fsMock(),
      logger: logger(),
      rulesetRepo: repo,
      strategy: new ScriptedStrategy(script) as never,
    });
    return service;
  }

  it('FAILS the run, with no threshold configured and nothing else wrong', async () => {
    const result = await buildService([
      [rule({ id: 'RAN-01' }), 'passed'],
      [rule({ id: 'BLOCK-SKIP-01' }), 'skipped'],
    ]).validate('/satellite', '/core');

    expect(result.status).toBe('failed');
    expect(result.blockingSkippedRuleIds).toEqual(['BLOCK-SKIP-01']);
    expect(result.issues.some(i => i.ruleId === 'BLOCK-SKIP-01' && i.blocking)).toBe(true);
    // The coverage floor is a different, opt-in gate — it must not be what failed.
    expect(result.issues.some(i => i.ruleId === 'GOV-COVERAGE-THRESHOLD')).toBe(false);
  });

  it('still passes when every blocking rule ran and only advisory rules skipped', async () => {
    const result = await buildService([
      [rule({ id: 'RAN-01' }), 'passed'],
      [rule({ id: 'ADVISORY-SKIP-01', severity: 'SHOULD', blocking: false }), 'skipped'],
    ]).validate('/satellite', '/core');

    expect(result.status).not.toBe('failed');
    expect(result.blockingSkippedRuleIds).toEqual([]);
  });
});
