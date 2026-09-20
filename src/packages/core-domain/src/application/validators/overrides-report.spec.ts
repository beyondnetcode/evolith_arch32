import * as fs from 'fs';
import * as path from 'path';
import { RulesetValidatorService } from './ruleset-validator.service';
import { RuleOverridesInvalidError } from './rule-overrides.loader';
import type { NormalizedRule } from '../../domain/models/normalized-rule';

/**
 * GT-678 — the verdict names every rule it softened, and refuses the ones it
 * must not.
 *
 * This is the production path: `RulesetValidatorService.validate` is what the
 * CLI (`validate`, and `evaluate` through the pipeline), the MCP tools and the
 * REST controllers all traverse, so a document read HERE reaches every surface
 * without any of them having to know it exists. The tests therefore go through
 * the service with a fake filesystem holding a satellite (`evolith.yaml` +
 * override document) and a corpus root (the REAL `rule-overrides.schema.json`).
 */

const REAL_SCHEMA = fs.readFileSync(
  path.resolve(__dirname, '..', '..', '..', '..', '..', 'rulesets', 'schema', 'rule-overrides.schema.json'),
  'utf-8',
);

const rule = (id: string, over: Partial<NormalizedRule> = {}): NormalizedRule => ({
  id,
  sourceFile: 'acl/anti-corruption-layer.rules.json',
  severity: 'MUST',
  category: 'anti-corruption',
  title: id,
  description: '',
  blocking: true,
  ...over,
});

const CORPUS = [
  rule('ACL-02'),
  rule('ACL-03', { blocking: false, severity: 'SHOULD' }),
  rule('SSDF-1', { sourceFile: 'standards/ssdf-v1.1.rules.json', blocking: false, severity: 'SHOULD' }),
];

const SAT = '/sat';
const CORE = '/core';

interface Fixture {
  evolithYaml?: Record<string, unknown>;
  overrides?: unknown;
  overridesRaw?: string;
}

function makeValidator(fixture: Fixture, corpus: NormalizedRule[] = CORPUS) {
  const files: Record<string, string> = {
    [`${CORE}/src/rulesets/schema/rule-overrides.schema.json`]: REAL_SCHEMA,
    [`${CORE}/src/rulesets/acl/a.rules.json`]: '{}',
  };
  const dirs = new Set([`${CORE}/src/rulesets`, `${CORE}/src/rulesets/schema`, `${CORE}/src/rulesets/acl`]);
  if (fixture.evolithYaml) files[`${SAT}/evolith.yaml`] = 'yaml';
  if (fixture.overridesRaw !== undefined) files[`${SAT}/governance/rule-overrides.json`] = fixture.overridesRaw;
  else if (fixture.overrides !== undefined) files[`${SAT}/governance/rule-overrides.json`] = JSON.stringify(fixture.overrides);

  const fakeFs = {
    exists: jest.fn(async (p: string) => p in files || dirs.has(p)),
    readFile: jest.fn(async (p: string) => {
      if (!(p in files)) throw new Error(`ENOENT: ${p}`);
      return files[p];
    }),
    readdirNames: jest.fn(async (p: string) => {
      const prefix = `${p}/`;
      return [...new Set([...Object.keys(files), ...dirs].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length).split('/')[0]))];
    }),
    readDir: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
  };
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  const service = new RulesetValidatorService({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fileSystem: fakeFs as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: logger as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configParser: { parse: jest.fn(() => fixture.evolithYaml ?? {}) } as any,
    rulesetRepo: { loadAllRulesets: jest.fn().mockResolvedValue(corpus) },
    applyRuleApplicability: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return { service, logger };
}

const yamlNaming = (ref = 'governance/rule-overrides.json') => ({
  apiVersion: 'evolith.dev/v1',
  kind: 'Satellite',
  metadata: { name: 'sat', phase: 'F1', architectureVersion: '1.0.0' },
  spec: { coreRef: { version: '1.0.0', rulesetVersion: '1.0.0' }, rulesets: { overrides: ref } },
});

const document = (rules: Record<string, unknown>) => ({
  tenantId: 'acme',
  version: '1.0.0',
  effectiveDate: '2026-09-01',
  approvedBy: 'Head of Engineering',
  rules,
});

describe('ValidationResult.overrides · GT-678', () => {
  it('EMPTY RATHER THAN ABSENT: a clean run reports `{ applied: [], rejected: [] }`', async () => {
    const noRef = { ...yamlNaming(), spec: { coreRef: { version: '1.0.0' } } };
    const { service: clean } = makeValidator({ evolithYaml: noRef });
    const result = await clean.validate(SAT, CORE);
    expect(result.overrides).toEqual({ applied: [], rejected: [] });
    expect(result.overrides).not.toBeUndefined();
    // And a satellite with no evolith.yaml at all reports the same zero value.
    const { service: noYaml } = makeValidator({});
    expect((await noYaml.validate(SAT, CORE)).overrides).toEqual({ applied: [], rejected: [] });
  });

  it('THE PRODUCTION PATH: `spec.rulesets.overrides` is read, a waiver with approver + expiry is applied, and the run names it from -> to', async () => {
    const { service } = makeValidator({
      evolithYaml: yamlNaming(),
      overrides: document({
        'ACL-02': {
          severity: 'SHOULD',
          blocking: false,
          rationale: 'validated at the gateway',
          approvedBy: 'cto@acme.example',
          expiresOn: '2099-12-31',
        },
      }),
    });
    const result = await service.validate(SAT, CORE);

    expect(result.overrides?.source).toBe('governance/rule-overrides.json');
    expect(result.overrides?.rejected).toEqual([]);
    expect(result.overrides?.applied).toEqual([
      expect.objectContaining({
        ruleId: 'ACL-02', field: 'severity', from: 'MUST', to: 'SHOULD',
        approvedBy: 'cto@acme.example', expiresOn: '2099-12-31', source: 'governance/rule-overrides.json',
      }),
      expect.objectContaining({ ruleId: 'ACL-02', field: 'blocking', from: true, to: false }),
    ]);
    // No refusal reached the issues; the waived rule no longer trips the
    // GT-595 blocking-skipped gate, which is precisely what the tenant asked for.
    expect(result.issues.filter((i) => i.category === 'rule-overrides')).toEqual([]);
    expect(result.blockingSkippedRuleIds).toEqual([]);
    expect(result.status).not.toBe('failed');
    // The corpus is intact: 3 rules, none excluded.
    expect(result.rulesTotal).toBe(3);
    expect(result.rulesNotApplicable).toBe(0);
  });

  it('FAILS CLOSED: an override that removes a blocking criterion without approver + expiry is a blocking OVR-BLOCKING-REMOVED issue and the verdict is `failed`', async () => {
    const { service } = makeValidator({
      evolithYaml: yamlNaming(),
      overrides: document({ 'ACL-02': { blocking: false, rationale: 'we accept the risk' } }),
    });
    const result = await service.validate(SAT, CORE);

    expect(result.overrides?.applied).toEqual([]);
    expect(result.overrides?.rejected).toEqual([
      expect.objectContaining({ code: 'OVR-BLOCKING-REMOVED', ruleId: 'ACL-02', source: 'governance/rule-overrides.json' }),
    ]);
    const issue = result.issues.find((i) => i.ruleId === 'OVR-BLOCKING-REMOVED');
    expect(issue).toBeDefined();
    expect(issue!.blocking).toBe(true);
    expect(issue!.description).toMatch(/ACL-02/);
    expect(issue!.description).toMatch(/without approvedBy and expiresOn/);
    expect(result.status).toBe('failed');
  });

  it('a disabled rule is `notApplicable: disabled` — counted in corpusTotal, named, out of rulesTotal', async () => {
    const { service } = makeValidator({
      evolithYaml: yamlNaming(),
      overrides: document({ 'ACL-03': { enabled: false, rationale: 'not relevant here' } }),
    });
    const result = await service.validate(SAT, CORE);

    expect(result.overrides?.applied).toEqual([
      { ruleId: 'ACL-03', field: 'enabled', from: true, to: false, source: 'governance/rule-overrides.json' },
    ]);
    expect(result.rulesNotApplicable).toBe(1);
    expect(result.notApplicableRuleIds).toEqual(['ACL-03']);
    expect(result.rulesTotal).toBe(2);
    expect(result.corpusTotal).toBe(3);
    const advisory = result.issues.find((i) => i.ruleId === 'GOV-RULE-NOT-APPLICABLE');
    expect(advisory?.description).toMatch(/disabled by an authored `enabled: false` or a tenant override/);
  });

  it('an override that changes nothing is a non-blocking OVR-IGNORED advisory, never a failed run', async () => {
    const { service } = makeValidator({
      evolithYaml: yamlNaming(),
      overrides: document({
        'ACL-2': { enabled: false, rationale: 'typo in the id' },
        'ACL-03': { severity: 'SHOULD', rationale: 'already SHOULD' },
      }),
    });
    const result = await service.validate(SAT, CORE);
    expect(result.overrides?.rejected.map((r) => r.code)).toEqual(['OVR-UNKNOWN-RULE', 'OVR-NOOP']);
    const advisory = result.issues.find((i) => i.ruleId === 'OVR-IGNORED');
    expect(advisory).toBeDefined();
    expect(advisory!.blocking).toBe(false);
    expect(advisory!.description).toMatch(/ACL-2/);
    expect(result.issues.some((i) => i.category === 'rule-overrides' && i.blocking)).toBe(false);
  });

  it('an override document that this run did not select reports OVR-NOT-SELECTED, not OVR-UNKNOWN-RULE', async () => {
    const { service } = makeValidator({
      evolithYaml: yamlNaming(),
      overrides: document({ 'ACL-03': { enabled: false, rationale: 'r' } }),
    });
    const result = await service.validate(SAT, CORE, { policyRefs: ['standards/ssdf-v1.1.rules.json'] });
    expect(result.selection?.source).toBe('caller');
    expect(result.overrides?.rejected).toEqual([expect.objectContaining({ code: 'OVR-NOT-SELECTED', ruleId: 'ACL-03' })]);
  });

  it('A NAMED ERROR, NEVER IGNORED: a malformed document aborts the run as RuleOverridesInvalidError (SCHEMA_INVALID)', async () => {
    const offSchema = makeValidator({
      evolithYaml: yamlNaming(),
      overrides: document({ 'ACL-02': { enabeld: false, rationale: 'typo' } }),
    });
    await expect(offSchema.service.validate(SAT, CORE)).rejects.toThrow(RuleOverridesInvalidError);
    await expect(offSchema.service.validate(SAT, CORE)).rejects.toThrow(/enabeld/);

    const missing = makeValidator({ evolithYaml: yamlNaming('governance/nope.json') });
    await expect(missing.service.validate(SAT, CORE)).rejects.toThrow(/no file exists/);

    const broken = makeValidator({ evolithYaml: yamlNaming(), overridesRaw: '{ not json' });
    await expect(broken.service.validate(SAT, CORE)).rejects.toThrow(/not valid JSON/);

    // It is NOT downgraded to the engine's warn-and-continue path.
    expect(offSchema.logger.warn).not.toHaveBeenCalledWith(expect.stringMatching(/Rule engine error/));
  });

  it('the legacy top-level `rulesets.overrides` shape is read too', async () => {
    const { service } = makeValidator({
      evolithYaml: { coreRef: { version: '1.0.0' }, rulesets: { overrides: 'governance/rule-overrides.json' } },
      overrides: document({ 'ACL-03': { severity: 'MUST', rationale: 'stricter' } }),
    });
    const result = await service.validate(SAT, CORE);
    expect(result.overrides?.applied).toEqual([expect.objectContaining({ ruleId: 'ACL-03', from: 'SHOULD', to: 'MUST' })]);
  });
});
