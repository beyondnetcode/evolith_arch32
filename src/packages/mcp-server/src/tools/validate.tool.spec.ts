import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'fs-extra';
import { ValidateTool } from './validate.tool';
import type { RulesetValidatorService, ValidationResult } from '@beyondnet/evolith-core';

function makeResult(over: Partial<ValidationResult> = {}): ValidationResult {
  return {
    status: 'failed',
    rulesChecked: 3,
    issues: [
      {
        ruleId: 'INH-001',
        severity: 'MUST',
        category: 'inheritance',
        title: 'Must inherit core',
        description: 'd',
        blocking: true,
      },
    ],
    coreRef: { version: '1.0.0', path: '/core' },
    timestamp: 'T',
    ...over,
  };
}

describe('ValidateTool', () => {
  let validator: jest.Mocked<Pick<RulesetValidatorService, 'validate' | 'loadRulesetById'>>;
  let tool: ValidateTool;

  beforeEach(() => {
    validator = {
      validate: jest.fn(),
      loadRulesetById: jest.fn(),
    } as never;
    tool = new ValidateTool(validator as unknown as RulesetValidatorService);
  });

  it('exposes the evolith-validate schema with path required', () => {
    expect(tool.schema.name).toBe('evolith-validate');
    expect(tool.schema.inputSchema.required).toContain('path');
  });

  it('throws when path is missing', async () => {
    await expect(tool.execute({})).rejects.toThrow('path is required');
  });

  it('returns the raw ValidationResult for json format', async () => {
    const result = makeResult();
    validator.validate.mockResolvedValue(result);
    await expect(tool.execute({ path: '/repo' })).resolves.toBe(result);
    // GT-659 — the third argument is the ruleset SELECTION, and `undefined` pins
    // the additive guarantee: a caller naming no ruleset gets the whole corpus.
    //
    // GT-705 — the SECOND argument is no longer `undefined`. Forwarding it was the
    // defect: core-domain then fell back to `<satellite>/../evolith`, a sibling
    // directory named after the vendor's monorepo, and the published server
    // answered RULESET_NOT_FOUND for every corpus-dependent tool. A caller who
    // names no core path now gets a RESOLVED one — here the corpus this package
    // bundles.
    const [satellite, resolvedCore, selection] = validator.validate.mock.calls[0];
    expect(satellite).toBe('/repo');
    expect(selection).toBeUndefined();
    expect(typeof resolvedCore).toBe('string');
    expect(resolvedCore).not.toBe('');
  });

  it('passes corePath through to the validator', async () => {
    validator.validate.mockResolvedValue(makeResult({ status: 'passed', issues: [] }));
    await tool.execute({ path: '/repo', corePath: '/core' });
    expect(validator.validate).toHaveBeenCalledWith('/repo', '/core', undefined);
  });

  it('formats a summary string', async () => {
    validator.validate.mockResolvedValue(makeResult());
    const out = (await tool.execute({ path: '/repo', format: 'summary' })) as string;
    expect(out).toContain('✗ Validation FAILED');
    expect(out).toContain('Rules checked: 3');
    expect(out).toContain('[MUST] INH-001: Must inherit core');
  });

  it('formats a markdown table', async () => {
    validator.validate.mockResolvedValue(makeResult());
    const out = (await tool.execute({ path: '/repo', format: 'table' })) as string;
    expect(out).toContain('| Rule | Severity | Category | Title | Blocking |');
    expect(out).toContain('| INH-001 | MUST | inheritance | Must inherit core | YES |');
  });

  it('loads a single ruleset by id when ruleset is provided', async () => {
    validator.loadRulesetById.mockResolvedValue([]);
    const out = (await tool.execute({
      path: '/repo',
      ruleset: 'INH',
      corePath: '/core',
    })) as { ruleset: string; corePath: string; issues: unknown[] };
    expect(validator.loadRulesetById).toHaveBeenCalledWith('/core', 'INH');
    expect(out.ruleset).toBe('INH');
    expect(out.corePath).toBe('/core');
    expect(out.issues).toEqual([]);
  });

  it('auto-discovers corePath by walking up to a rulesets/ folder', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-core-'));
    const satellite = path.join(root, 'product');
    // GT-705 — the fixture states a CORPUS, not a directory that happens to be
    // called `rulesets`. That distinction is GT-566's defect: the Core repo has a
    // satellite-side `rulesets/agents` holding no rules, and an existence check
    // latches onto it and reports emptiness as an answer. The walk-up itself is
    // unchanged and still what this case is about.
    await fs.ensureDir(path.join(root, 'rulesets', 'governance'));
    await fs.ensureDir(satellite);
    validator.loadRulesetById.mockResolvedValue([]);

    try {
      const out = (await tool.execute({ path: satellite, ruleset: 'INH' })) as {
        corePath: string;
      };
      expect(out.corePath).toBe(root);
      expect(validator.loadRulesetById).toHaveBeenCalledWith(root, 'INH');
    } finally {
      await fs.remove(root);
    }
  });
});
