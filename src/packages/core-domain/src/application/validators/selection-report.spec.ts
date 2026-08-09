import { RulesetValidatorService } from './ruleset-validator.service';
import type { NormalizedRule } from '../../domain/models/normalized-rule';

/**
 * GT-661 — a verdict must say WHY its scope is what it is.
 *
 * Measured on the Evolith Core repository, `validate` with no selection returns
 * **85 blocking issues of 113** — every one from a rule the caller never chose.
 * Before this the report was silent about that, so «the pack I adopted failed»
 * and «the Core evaluated all 402 of its opinions and something failed» produced
 * the same shape. They are different facts and the person acting on them acts
 * differently.
 *
 * This does NOT change what runs. The default stays the whole corpus, blocking
 * rules included, because the Core has no tenant configuration to consult and a
 * default that stopped blocking would silently disarm every gate working today.
 * What changes is that the report can be READ.
 */

const rule = (id: string, sourceFile: string): NormalizedRule =>
  ({ id, sourceFile, severity: 'MUST', category: 'c', title: id, description: '', blocking: false }) as NormalizedRule;

const CORPUS = [
  rule('SSDF-1', 'standards/ssdf-v1.1.rules.json'),
  rule('SSDF-2', 'standards/ssdf-v1.1.rules.json'),
  rule('ACL-1', 'acl/anti-corruption-layer.rules.json'),
];

function makeValidator(corpus: NormalizedRule[] = CORPUS) {
  const fs = {
    exists: jest.fn().mockResolvedValue(false),
    readFile: jest.fn().mockResolvedValue(''),
    readDir: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
  };
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return new RulesetValidatorService({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fileSystem: fs as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: logger as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configParser: { parse: jest.fn() } as any,
    rulesetRepo: { loadAllRulesets: jest.fn().mockResolvedValue(corpus) },
    applyRuleApplicability: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('ValidationResult.selection · GT-661', () => {
  it('THE DISTINCTION: no selection is reported as `core-default`, not as a caller choice', async () => {
    const result = await makeValidator().validate('/repo', '/core');
    expect(result.selection).toEqual({
      source: 'core-default',
      requested: [],
      matched: [],
      unmatched: [],
      rulesSelected: 3,
      corpusTotal: 3,
    });
  });

  it('a caller selection is reported as `caller`, with what it narrowed to', async () => {
    const result = await makeValidator().validate('/repo', '/core', {
      policyRefs: ['standards/ssdf-v1.1.rules.json'],
    });
    expect(result.selection?.source).toBe('caller');
    expect(result.selection?.matched).toEqual(['standards/ssdf-v1.1.rules.json']);
    expect(result.selection?.rulesSelected).toBe(2);
    // The corpus survives the narrowing, so 2-of-3 cannot read as a corpus of 2.
    expect(result.selection?.corpusTotal).toBe(3);
  });

  it('an unknown ref is BOTH a blocking SEL-01 and a named `unmatched` entry', async () => {
    const result = await makeValidator().validate('/repo', '/core', {
      policyRefs: ['standards/nope.rules.json'],
    });
    // Published as a field so a consumer never has to parse issue text: zero
    // rules with zero violations is indistinguishable from a clean repository.
    expect(result.selection?.unmatched).toEqual(['standards/nope.rules.json']);
    expect(result.selection?.rulesSelected).toBe(0);
    expect(result.issues.some((i) => i.ruleId === 'SEL-01' && i.blocking)).toBe(true);
    expect(result.status).toBe('failed');
  });

  it('a partly-unknown selection reports both halves', async () => {
    const result = await makeValidator().validate('/repo', '/core', {
      policyRefs: ['standards/ssdf-v1.1.rules.json', 'standards/nope.rules.json'],
    });
    expect(result.selection?.matched).toEqual(['standards/ssdf-v1.1.rules.json']);
    expect(result.selection?.unmatched).toEqual(['standards/nope.rules.json']);
    expect(result.selection?.requested).toHaveLength(2);
  });

  it('THE GUARANTEE THAT NOTHING WAS DISARMED: the default still evaluates the whole corpus', async () => {
    // GT-661's third criterion. The report gained a field; the run did not lose
    // a rule. A default that stopped blocking would silently disarm gates that
    // work today, which is a worse failure than the one being fixed.
    const withoutSelection = await makeValidator().validate('/repo', '/core');
    expect(withoutSelection.selection?.rulesSelected).toBe(CORPUS.length);
    expect(withoutSelection.rulesTotal).toBe(CORPUS.length);
  });
});
