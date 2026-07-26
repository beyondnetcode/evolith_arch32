/**
 * GT-569 — the verdict must report its own denominator.
 *
 * Before this suite existed, `rulesChecked` could be read as a coverage claim
 * while the engine silently redefined the denominator underneath it: rules with
 * no handler and rules whose handler CRASHED were both labelled `skipped` and
 * then filtered out before counting. A corpus of N rules of which a handful ran
 * reported a reassuring number and a `passed` status.
 *
 * Every assertion below fails against the pre-GT-569 code:
 *  - `errored` did not exist (a throwing handler returned `skipped`);
 *  - `rulesSkipped` / `rulesErrored` / `rulesTotal` did not exist;
 *  - a skipped MUST rule produced no issue at all;
 *  - there was no coverage threshold.
 */

import { NativeEvaluator } from './evaluators/native-evaluator';
import { RuleEvaluationEngine, summarizeRuleCoverage } from './rule-evaluation-engine';
import { RulesetValidatorService } from './ruleset-validator.service';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { NormalizedRule } from '../../domain/models/normalized-rule';
import { RuleEvaluationResult, WorkspaceEvaluationContext } from './evaluators/evaluator.interface';

const CTX: WorkspaceEvaluationContext = { satellitePath: '/satellite', corePath: '/core' };

const logger = (): jest.Mocked<ILogger> =>
  ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), success: jest.fn() }) as any;

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

/** A strategy that returns whatever outcomes the test declares. */
class ScriptedStrategy {
  constructor(private readonly script: ReadonlyArray<[NormalizedRule, RuleEvaluationResult['result']]>) {}
  async evaluateAll(): Promise<RuleEvaluationResult[]> {
    return this.script.map(([r, result]) => ({ rule: r, result }));
  }
}

describe('GT-569 · a handler exception is `errored`, never `skipped`', () => {
  it('reports `errored` when the handler throws, and keeps `skipped` for an unsupported rule', async () => {
    const boom = new Error('ENOENT: exploded while stat-ing the workspace');
    const evaluator = new NativeEvaluator(
      // TAX-05 is handled by TaxonomyRuleHandler, which calls fs.exists — make it throw.
      fsMock({ exists: jest.fn().mockRejectedValue(boom) }),
      logger(),
      { parse: jest.fn() } as any,
    );

    const [crashed, unsupported] = await evaluator.evaluateAll(
      [
        rule({ id: 'TAX-05', category: 'taxonomy' }),
        // No handler claims this id ⇒ genuinely unsupported, still a skip.
        rule({ id: 'NO-SUCH-HANDLER-01', category: 'governance' }),
      ],
      CTX,
    );

    expect(crashed.result).toBe('errored');
    expect(crashed.message).toContain('exploded while stat-ing the workspace');
    expect(unsupported.result).toBe('skipped');
  });

  it('logs the crash at ERROR level — a crashing evaluator is not a warning', async () => {
    const log = logger();
    const evaluator = new NativeEvaluator(
      fsMock({ exists: jest.fn().mockRejectedValue(new Error('kaboom')) }),
      log,
      { parse: jest.fn() } as any,
    );

    await evaluator.evaluateAll([rule({ id: 'TAX-05', category: 'taxonomy' })], CTX);

    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('TAX-05'));
  });
});

describe('GT-569 · summarizeRuleCoverage produces the denominator', () => {
  const results: RuleEvaluationResult[] = [
    { rule: rule({ id: 'A-01' }), result: 'passed' },
    { rule: rule({ id: 'A-02' }), result: 'failed' },
    { rule: rule({ id: 'A-03' }), result: 'skipped' },
    { rule: rule({ id: 'A-04' }), result: 'skipped' },
    { rule: rule({ id: 'A-05' }), result: 'errored' },
  ];

  it('counts checked / skipped / errored and names the rules that did not run', () => {
    const coverage = summarizeRuleCoverage(results);

    expect(coverage).toEqual({
      rulesChecked: 2,
      rulesSkipped: 2,
      rulesErrored: 1,
      rulesTotal: 5,
      skippedRuleIds: ['A-03', 'A-04'],
      erroredRuleIds: ['A-05'],
    });
  });

  it('keeps the arithmetic identity that makes the number readable', () => {
    const c = summarizeRuleCoverage(results);
    expect(c.rulesChecked + c.rulesSkipped + c.rulesErrored).toBe(c.rulesTotal);
  });

  it('does NOT count an errored rule as checked (a crash is not an evaluation)', () => {
    expect(summarizeRuleCoverage([{ rule: rule({ id: 'X' }), result: 'errored' }]).rulesChecked).toBe(0);
  });
});

describe('GT-569 · unevaluated rules are visible in the issue list', () => {
  const engine = () =>
    new RuleEvaluationEngine({
      fileSystem: fsMock(),
      logger: logger(),
      rulesetRepo: {} as any,
      strategy: { evaluateAll: async () => [] } as any,
    });

  it('emits a non-blocking WARNING issue for a skipped MUST rule', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'MUST-01', severity: 'MUST' }), result: 'skipped', message: 'Requires external system' },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('MUST-01');
    expect(issues[0].severity).toBe('SHOULD');
    expect(issues[0].blocking).toBe(false);
    expect(issues[0].title).toContain('MUST rule not evaluated');
    expect(issues[0].description).toContain('Requires external system');
  });

  it('treats `MUST NOT` as MUST for the skipped-rule warning', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'MUSTNOT-01', severity: 'MUST NOT' }), result: 'skipped' },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('MUSTNOT-01');
  });

  it('stays quiet for a skipped SHOULD/COULD rule (advisory rules are not a coverage claim)', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'SHOULD-01', severity: 'SHOULD' }), result: 'skipped' },
      { rule: rule({ id: 'COULD-01', severity: 'COULD' }), result: 'skipped' },
    ]);
    expect(issues).toEqual([]);
  });

  it('surfaces EVERY errored rule regardless of severity, non-blocking', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'ERR-01', severity: 'COULD' }), result: 'errored', message: 'Evaluator error: boom' },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('ERR-01');
    expect(issues[0].blocking).toBe(false);
    expect(issues[0].title).toContain('Rule evaluation errored');
    expect(issues[0].description).toContain('boom');
  });

  it('still reports a failed rule exactly as before (blocking flag preserved)', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'FAIL-01', blocking: true }), result: 'failed', message: 'violation' },
    ]);
    expect(issues).toEqual([
      expect.objectContaining({ ruleId: 'FAIL-01', severity: 'MUST', blocking: true, description: 'violation' }),
    ]);
  });

  it('does not invent an issue for a passing rule', () => {
    expect(engine().toValidationIssues([{ rule: rule({ id: 'OK-01' }), result: 'passed' }])).toEqual([]);
  });
});

describe('GT-569 · RulesetValidatorService.validate reports the denominator', () => {
  const rules = [
    rule({ id: 'RAN-01' }),
    rule({ id: 'RAN-02' }),
    rule({ id: 'SKIP-01' }),
    rule({ id: 'SKIP-02' }),
    rule({ id: 'SKIP-03', severity: 'SHOULD' }),
    rule({ id: 'CRASH-01' }),
  ];

  const outcomes: ReadonlyArray<RuleEvaluationResult['result']> =
    ['passed', 'failed', 'skipped', 'skipped', 'skipped', 'errored'];

  function buildService(maxSkippedFraction?: number): RulesetValidatorService {
    const service = new RulesetValidatorService({
      // `evolith.yaml` absent would add GOV-000; report on the corpus alone.
      fileSystem: fsMock({ exists: jest.fn().mockResolvedValue(true), readFile: jest.fn().mockResolvedValue('') }),
      logger: logger(),
      configParser: { parse: jest.fn().mockReturnValue({}) } as any,
      rulesetRepo: { loadAllRulesets: jest.fn().mockResolvedValue(rules) } as any,
      maxSkippedFraction,
    });
    // Swap in the scripted strategy so the outcome mix is exact and handler-independent.
    (service as any).engine = new RuleEvaluationEngine({
      fileSystem: fsMock(),
      logger: logger(),
      rulesetRepo: { loadAllRulesets: jest.fn().mockResolvedValue(rules) } as any,
      strategy: new ScriptedStrategy(rules.map((r, i) => [r, outcomes[i]])) as any,
    });
    return service;
  }

  it('emits rulesChecked WITH rulesSkipped / rulesErrored / rulesTotal', async () => {
    const result = await buildService().validate('/satellite', '/core');

    expect(result.rulesChecked).toBe(2);
    expect(result.rulesSkipped).toBe(3);
    expect(result.rulesErrored).toBe(1);
    expect(result.rulesTotal).toBe(6);
    expect(result.skippedRuleIds).toEqual(['SKIP-01', 'SKIP-02', 'SKIP-03']);
    expect(result.erroredRuleIds).toEqual(['CRASH-01']);
  });

  it('keeps `rulesChecked` meaning "actually evaluated" — the wire field is not renamed', async () => {
    const result = await buildService().validate('/satellite', '/core');
    expect(result).toHaveProperty('rulesChecked');
    expect(result.rulesChecked).toBe(result.rulesTotal! - result.rulesSkipped! - result.rulesErrored!);
  });

  it('can no longer report `passed` while MUST rules went unevaluated', async () => {
    const result = await buildService().validate('/satellite', '/core');

    // SKIP-01 / SKIP-02 are MUST rules that never ran → warnings, not silence.
    const coverageWarnings = result.issues.filter(i => i.title.startsWith('MUST rule not evaluated'));
    expect(coverageWarnings.map(i => i.ruleId)).toEqual(['SKIP-01', 'SKIP-02']);
    expect(coverageWarnings.every(i => i.blocking === false)).toBe(true);

    // ...and the crash is present too.
    expect(result.issues.some(i => i.ruleId === 'CRASH-01' && i.title.startsWith('Rule evaluation errored'))).toBe(true);
  });

  it('does NOT gate on coverage when no threshold is configured (opt-in)', async () => {
    const result = await buildService().validate('/satellite', '/core');
    expect(result.issues.some(i => i.ruleId === 'GOV-COVERAGE-THRESHOLD')).toBe(false);
  });

  it('FAILS the run when the unevaluated fraction exceeds the configured threshold', async () => {
    // 4 of 6 rules did not run = 66.7% > 10%.
    const result = await buildService(0.1).validate('/satellite', '/core');

    const gate = result.issues.find(i => i.ruleId === 'GOV-COVERAGE-THRESHOLD');
    expect(gate).toBeDefined();
    expect(gate!.blocking).toBe(true);
    expect(gate!.description).toContain('4 of 6 rules were not evaluated');
    expect(result.status).toBe('failed');
  });

  it('does not fire the threshold when coverage is within the floor', async () => {
    const result = await buildService(0.9).validate('/satellite', '/core');
    expect(result.issues.some(i => i.ruleId === 'GOV-COVERAGE-THRESHOLD')).toBe(false);
  });
});
