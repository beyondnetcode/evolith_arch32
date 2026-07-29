/**
 * GT-595 — a skip must say WHY, and a rule nothing can run must leave the
 * denominator.
 *
 * Every assertion below fails against the pre-GT-595 code:
 *  - `classifyRule` / `summarizeEvaluability` / `RULE_TRIAGE` did not exist;
 *  - `RuleEvaluationResult` had no `evaluability`;
 *  - `summarizeRuleCoverage` reported six counters and no classification;
 *  - a documentation-only MUST rule produced a "MUST rule not evaluated"
 *    warning identical to one naming real, closeable debt;
 *  - the coverage threshold divided by the whole corpus, so 129 rules with no
 *    check in them made the floor unreachable by any amount of engineering.
 */

import {
  RULE_TRIAGE,
  classifyRule,
  hasNoAuthoredCheck,
  isNonExecutable,
  summarizeEvaluability,
} from './rule-evaluability';
import { RuleEvaluationEngine, summarizeRuleCoverage } from './rule-evaluation-engine';
import { RulesetValidatorService } from './ruleset-validator.service';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { NormalizedRule } from '../../domain/models/normalized-rule';
import { RuleEvaluationResult } from './evaluators/evaluator.interface';

const logger = (): jest.Mocked<ILogger> =>
  ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), success: jest.fn() }) as never;

const fsMock = (): IFileSystem =>
  ({
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(false),
    readFile: jest.fn().mockResolvedValue(''),
    readJson: jest.fn().mockResolvedValue({}),
    readdirNames: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => false }),
  }) as unknown as IFileSystem;

const rule = (over: Partial<NormalizedRule> & { id: string }): NormalizedRule =>
  ({
    severity: 'MUST',
    category: 'governance',
    title: `Title of ${over.id}`,
    description: '',
    blocking: true,
    sourceFile: 'src/rulesets/test.rules.json',
    ...over,
  }) as NormalizedRule;

describe('GT-595 · classifyRule', () => {
  it('calls a rule a handler evaluates `native-handler`, whatever the triage table says', () => {
    // GIT-02 is triaged `needs-external-system`; if a handler ever runs it, the
    // outcome wins over the table. The table describes rules nobody evaluated.
    expect(classifyRule(rule({ id: 'GIT-02' }), true).evaluability).toBe('native-handler');
    expect(RULE_TRIAGE['GIT-02'].evaluability).toBe('needs-external-system');
  });

  it('reads the triage table for an unhandled rule', () => {
    expect(classifyRule(rule({ id: 'GIT-02' }), false).evaluability).toBe('needs-external-system');
    expect(classifyRule(rule({ id: 'OBS-EVD-01' }), false).evaluability).toBe('needs-runtime');
    expect(classifyRule(rule({ id: 'KI-R01' }), false).evaluability).toBe('underspecified');
    expect(classifyRule(rule({ id: 'PROT-03' }), false).evaluability).toBe('documentation-only');
  });

  it('defaults an UNKNOWN rule to `unimplemented-native` — never out of the denominator', () => {
    const c = classifyRule(rule({ id: 'BRAND-NEW-01' }), false);
    expect(c.evaluability).toBe('unimplemented-native');
    expect(isNonExecutable(c.evaluability)).toBe(false);
  });

  it('recognises the ADR-generator placeholder, and only the placeholder', () => {
    expect(hasNoAuthoredCheck('')).toBe(true);
    expect(hasNoAuthoredCheck(undefined)).toBe(true);
    expect(hasNoAuthoredCheck('Verify X. Concrete checks to be wired into the harness.')).toBe(true);
    expect(hasNoAuthoredCheck('No file under src/domain imports @nestjs/*.')).toBe(false);

    const generated = rule({ id: 'CORE-0111-01', category: 'adr-conformance', validationQuery: undefined });
    expect(classifyRule(generated, false).evaluability).toBe('documentation-only');

    const authored = rule({
      id: 'CORE-0111-01',
      category: 'adr-conformance',
      validationQuery: 'No file under src/domain imports @nestjs/*.',
    });
    expect(classifyRule(authored, false).evaluability).toBe('unimplemented-native');
  });
});

describe('GT-595 · summarizeEvaluability', () => {
  const classified = [
    { ruleId: 'A', sourceFile: 'a.json', blocking: true, evaluability: 'native-handler' as const, why: '' },
    { ruleId: 'B', sourceFile: 'a.json', blocking: true, evaluability: 'unimplemented-native' as const, why: '' },
    { ruleId: 'C', sourceFile: 'b.json', blocking: true, evaluability: 'documentation-only' as const, why: '' },
    { ruleId: 'D', sourceFile: 'b.json', blocking: false, evaluability: 'underspecified' as const, why: '' },
    { ruleId: 'E', sourceFile: 'b.json', blocking: true, evaluability: 'needs-runtime' as const, why: '' },
  ];

  it('excludes only documentation-only and underspecified from the denominator', () => {
    const s = summarizeEvaluability(classified);
    expect(s.nonExecutable).toBe(2);
    expect(s.nonExecutableRuleIds).toEqual(['C', 'D']);
    expect(s.executableTotal).toBe(3);
    expect(s.total).toBe(5);
  });

  it('names blocking rules that can never produce a verdict', () => {
    expect(summarizeEvaluability(classified).blockingNonExecutable).toEqual(['C']);
  });

  it('publishes handled / executable / total per ruleset file', () => {
    expect(summarizeEvaluability(classified).perRuleset).toEqual([
      { sourceFile: 'a.json', handled: 1, executable: 2, total: 2 },
      { sourceFile: 'b.json', handled: 0, executable: 1, total: 3 },
    ]);
  });
});

describe('GT-595 · summarizeRuleCoverage carries the classification', () => {
  const results: RuleEvaluationResult[] = [
    { rule: rule({ id: 'RAN-01' }), result: 'passed' },
    // A handler declared the class explicitly.
    { rule: rule({ id: 'DOC-01' }), result: 'skipped', evaluability: 'documentation-only' },
    // No class declared ⇒ the triage table decides.
    { rule: rule({ id: 'KI-R01' }), result: 'skipped' },
    { rule: rule({ id: 'GIT-02' }), result: 'skipped' },
  ];

  it('keeps the GT-569 identity intact — non-executable is a SUBSET of skipped', () => {
    const c = summarizeRuleCoverage(results);
    expect(c.rulesChecked + c.rulesSkipped + c.rulesErrored).toBe(c.rulesTotal);
    expect(c.rulesSkipped).toBe(3);
    expect(c.rulesNonExecutable).toBe(2); // DOC-01 + KI-R01; GIT-02 is adapter debt
    expect(c.nonExecutableRuleIds).toEqual(['DOC-01', 'KI-R01']);
    expect(c.rulesExecutable).toBe(2);
  });

  it('never classifies a rule that actually RAN as non-executable', () => {
    const c = summarizeRuleCoverage([
      { rule: rule({ id: 'KI-R01' }), result: 'passed' },
      { rule: rule({ id: 'PROT-03' }), result: 'failed' },
    ]);
    expect(c.rulesNonExecutable).toBe(0);
    expect(c.rulesExecutable).toBe(2);
  });
});

describe('GT-595 · the issue list stops drowning real debt in placeholders', () => {
  const engine = () =>
    new RuleEvaluationEngine({
      fileSystem: fsMock(),
      logger: logger(),
      rulesetRepo: {} as never,
      strategy: { evaluateAll: async () => [] } as never,
    });

  it('does NOT emit "MUST rule not evaluated" for a documentation-only rule', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'CORE-0111-01', category: 'adr-conformance' }), result: 'skipped', evaluability: 'documentation-only' },
    ]);
    expect(issues.some(i => i.title.startsWith('MUST rule not evaluated'))).toBe(false);
  });

  it('STILL emits it for a rule that is real, closeable coverage debt', () => {
    // Non-blocking on purpose: GT-595 AC2 escalates the blocking variant of this
    // same case to a run-failing issue, so the advisory is what a MUST rule that
    // does NOT claim to block produces.
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'SEC-INJ-01', blocking: false }), result: 'skipped', message: 'no handler' },
    ]);
    expect(issues.map(i => i.ruleId)).toContain('SEC-INJ-01');
    expect(issues.find(i => i.ruleId === 'SEC-INJ-01')!.title).toContain('MUST rule not evaluated');
  });

  it('reports the non-executable rules ONCE, naming the blocking ones', () => {
    const issues = engine().toValidationIssues([
      { rule: rule({ id: 'CORE-0111-01' }), result: 'skipped', evaluability: 'documentation-only' },
      { rule: rule({ id: 'KI-R01' }), result: 'skipped' },
      { rule: rule({ id: 'SEC-INJ-01' }), result: 'skipped' },
    ]);

    const advisory = issues.find(i => i.ruleId === 'GOV-RULE-NON-EXECUTABLE');
    expect(advisory).toBeDefined();
    expect(advisory!.blocking).toBe(false);
    expect(advisory!.title).toContain('2 corpus rules are not executable');
    expect(advisory!.description).toContain('1 documentation-only');
    expect(advisory!.description).toContain('1 underspecified');
    expect(advisory!.description).toContain('CORE-0111-01');
  });

  it('stays silent when every rule is executable', () => {
    const issues = engine().toValidationIssues([{ rule: rule({ id: 'OK-01' }), result: 'passed' }]);
    expect(issues.some(i => i.ruleId === 'GOV-RULE-NON-EXECUTABLE')).toBe(false);
  });
});

describe('GT-595 · the coverage threshold divides by what CAN run', () => {
  // 5 rules: 1 passed, 1 real skip, 3 non-executable.
  //  - pre-GT-595 denominator: 4 unevaluated / 5 = 80% ⇒ fails a 40% floor.
  //  - post-GT-595 denominator: 1 unevaluated / 2 executable = 50% ⇒ still fails
  //    a 40% floor, but the description now names the exclusion, and a 60% floor
  //    passes where it previously could not.
  const rules = [
    rule({ id: 'RAN-01' }),
    rule({ id: 'SEC-INJ-01' }),
    rule({ id: 'KI-R01' }),
    rule({ id: 'KI-R02' }),
    rule({ id: 'KI-R03' }),
  ];
  const outcomes: ReadonlyArray<RuleEvaluationResult['result']> =
    ['passed', 'skipped', 'skipped', 'skipped', 'skipped'];

  function service(maxSkippedFraction?: number): RulesetValidatorService {
    const svc = new RulesetValidatorService({
      fileSystem: fsMock(),
      logger: logger(),
      configParser: { parse: jest.fn().mockReturnValue({}) } as never,
      rulesetRepo: { loadAllRulesets: jest.fn().mockResolvedValue(rules) } as never,
      maxSkippedFraction,
    });
    (svc as unknown as { engine: RuleEvaluationEngine }).engine = new RuleEvaluationEngine({
      fileSystem: fsMock(),
      logger: logger(),
      rulesetRepo: { loadAllRulesets: jest.fn().mockResolvedValue(rules) } as never,
      strategy: {
        evaluateAll: async () => rules.map((r, i) => ({ rule: r, result: outcomes[i] })),
      } as never,
    });
    return svc;
  }

  it('publishes the evaluability breakdown on the ValidationResult', async () => {
    const result = await service().validate('/sat', '/core');

    expect(result.rulesTotal).toBe(5);
    expect(result.rulesSkipped).toBe(4);
    expect(result.rulesNonExecutable).toBe(3);
    expect(result.rulesExecutable).toBe(2);
    expect(result.nonExecutableRuleIds).toEqual(['KI-R01', 'KI-R02', 'KI-R03']);
    expect(result.blockingNonExecutableRuleIds).toEqual(['KI-R01', 'KI-R02', 'KI-R03']);
    expect(result.perRuleset).toEqual([
      { sourceFile: 'src/rulesets/test.rules.json', handled: 1, executable: 2, total: 5 },
    ]);
  });

  it('passes a 60% floor that the whole-corpus denominator made unreachable', async () => {
    const result = await service(0.6).validate('/sat', '/core');
    // Pre-GT-595: 4/5 = 80% > 60% ⇒ blocking gate. Now: 1/2 = 50% ⇒ no gate.
    expect(result.issues.some(i => i.ruleId === 'GOV-COVERAGE-THRESHOLD')).toBe(false);
  });

  it('still fails a floor the EXECUTABLE corpus genuinely misses, and says what it excluded', async () => {
    const result = await service(0.4).validate('/sat', '/core');

    const gate = result.issues.find(i => i.ruleId === 'GOV-COVERAGE-THRESHOLD');
    expect(gate).toBeDefined();
    expect(gate!.blocking).toBe(true);
    expect(gate!.description).toContain('1 of 2 executable rules were not evaluated');
    expect(gate!.description).toContain('3 further rules are excluded from the denominator as non-executable');
    expect(result.status).toBe('failed');
  });
});
