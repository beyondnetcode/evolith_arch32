import * as fs from 'fs';
import * as nodePath from 'path';
import type { IFileSystem, ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { RuleEvaluationEngine } from '@beyondnet/evolith-core-domain/application/validators/rule-evaluation-engine';
import type {
  IRuleEvaluatorStrategy,
  RuleEvaluationResult,
} from '@beyondnet/evolith-core-domain/application/validators/evaluators/evaluator.interface';
import { DiskRulesetRepository } from './disk-ruleset.repository';

/**
 * GT-678 — the catalogue's falsifiability criterion, end to end through the
 * REAL loader and the REAL engine: «a corpus where a tenant pack redefines a
 * Core rule id … the rule appears once at the tenant's severity».
 *
 * Before the fix the loader produced two `ACL-02`s (Core `MUST`/blocking and
 * tenant `SHOULD`/non-blocking) and the engine evaluated both, so the rule
 * fired twice at two severities from two files. Now the loader keeps ONE rule
 * with the tenant's delta attached, and the engine applies that delta under
 * the blocking-criterion policy — so the SAME corpus yields one rule at the
 * tenant's severity when the waiver is approved and time-boxed, and one rule
 * at the CORE's severity, plus a named refusal, when it is not.
 */

const REAL_SCHEMA = fs.readFileSync(
  nodePath.resolve(__dirname, '..', '..', '..', 'rulesets', 'schema', 'ruleset-standard.schema.json'),
  'utf-8',
);

function makeFs(files: Record<string, string>, dirs: string[]): IFileSystem {
  const dirSet = new Set(dirs);
  const has = (p: string) => p in files || dirSet.has(p);
  return {
    async readFile(p: string) {
      if (!(p in files)) throw new Error(`ENOENT: ${p}`);
      return files[p];
    },
    async exists(p: string) {
      return has(p);
    },
    existsSync(p: string) {
      return has(p);
    },
    async readdirNames(p: string) {
      const prefix = `${p}/`;
      return [...new Set([...Object.keys(files), ...dirSet].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length).split('/')[0]))];
    },
    async stat(p: string) {
      return { isDirectory: () => dirSet.has(p), isFile: () => p in files };
    },
  } as unknown as IFileSystem;
}

const logger: ILogger = { debug() {}, info() {}, warn() {}, error() {} };

/** Fails every rule it is handed, so each one surfaces as an issue at its severity. */
const failEverything: IRuleEvaluatorStrategy = {
  async evaluateAll(rules) {
    return rules.map<RuleEvaluationResult>((rule) => ({ rule, result: 'failed', message: `violated ${rule.id}` }));
  },
} as unknown as IRuleEvaluatorStrategy;

function corpus(tenantRule: Record<string, unknown>) {
  return makeFs(
    {
      '/core/src/rulesets/schema/ruleset-standard.schema.json': REAL_SCHEMA,
      '/core/src/rulesets/acl/anti-corruption-layer.rules.json': JSON.stringify({
        rules: [
          { id: 'ACL-02', severity: 'MUST', blocking: true, title: 'Validate inbound payloads', description: 'D' },
          { id: 'ACL-03', severity: 'SHOULD', blocking: false, title: 'Translate external models', description: 'D' },
        ],
      }),
      '/core/src/rulesets/tenants/acme/pack.rules.json': JSON.stringify({ rules: [tenantRule] }),
    },
    ['/core/src/rulesets', '/core/src/rulesets/schema', '/core/src/rulesets/acl', '/core/src/rulesets/tenants', '/core/src/rulesets/tenants/acme'],
  );
}

async function run(fsys: IFileSystem) {
  const engine = new RuleEvaluationEngine({
    fileSystem: fsys,
    logger,
    strategy: failEverything,
    rulesetRepo: new DiskRulesetRepository(fsys, logger),
  });
  const evaluation = await engine.discoverAndEvaluate('/sat', '/core', undefined, undefined, undefined, undefined, new Date('2026-09-19T00:00:00Z'));
  return { evaluation, issues: engine.toValidationIssues(evaluation.results) };
}

describe('GT-678 — a tenant pack over a Core rule, through the real loader and engine', () => {
  it('with approver + expiry: the rule is evaluated ONCE, at the tenant severity, and the merge is a named applied override', async () => {
    const { evaluation, issues } = await run(
      corpus({
        id: 'ACL-02',
        severity: 'SHOULD',
        blocking: false,
        title: 'Validate inbound payloads',
        description: 'Accepted at Acme.',
        rationale: 'Validated at the gateway.',
        approvedBy: 'cto@acme.example',
        expiresOn: '2099-12-31',
      }),
    );

    const acl02 = issues.filter((i) => i.ruleId === 'ACL-02');
    expect(acl02).toHaveLength(1);
    expect(acl02[0]).toMatchObject({ severity: 'SHOULD', blocking: false });
    expect(evaluation.results.map((r) => r.rule.id)).toEqual(['ACL-02', 'ACL-03']);

    expect(evaluation.overrides.rejected).toEqual([]);
    expect(evaluation.overrides.applied).toEqual([
      expect.objectContaining({ ruleId: 'ACL-02', field: 'severity', from: 'MUST', to: 'SHOULD', approvedBy: 'cto@acme.example', expiresOn: '2099-12-31', source: 'src/rulesets/tenants/acme/pack.rules.json' }),
      expect.objectContaining({ ruleId: 'ACL-02', field: 'blocking', from: true, to: false, source: 'src/rulesets/tenants/acme/pack.rules.json' }),
    ]);
  });

  it('without approver + expiry: the rule is evaluated ONCE at the CORE severity and the pack is refused as OVR-BLOCKING-REMOVED', async () => {
    const { evaluation, issues } = await run(
      corpus({
        id: 'ACL-02',
        severity: 'SHOULD',
        blocking: false,
        enabled: false,
        title: 'Validate inbound payloads',
        description: 'Accepted at Acme.',
      }),
    );

    const acl02 = issues.filter((i) => i.ruleId === 'ACL-02');
    expect(acl02).toHaveLength(1);
    // Nothing was loosened, and — unlike before — nothing was duplicated either.
    expect(acl02[0]).toMatchObject({ severity: 'MUST', blocking: true });
    expect(evaluation.overrides.applied).toEqual([]);
    expect(evaluation.overrides.rejected).toEqual([
      expect.objectContaining({ code: 'OVR-BLOCKING-REMOVED', ruleId: 'ACL-02', source: 'src/rulesets/tenants/acme/pack.rules.json' }),
    ]);
  });

  it('a rule disabled in its own file is not evaluated and is reported as disabled with its source', async () => {
    const fsys = makeFs(
      {
        '/core/src/rulesets/schema/ruleset-standard.schema.json': REAL_SCHEMA,
        '/core/src/rulesets/acl/a.rules.json': JSON.stringify({
          rules: [
            { id: 'ACL-02', severity: 'MUST', blocking: true, title: 'T', description: 'D' },
            { id: 'ACL-03', severity: 'SHOULD', blocking: false, enabled: false, title: 'T', description: 'D' },
          ],
        }),
      },
      ['/core/src/rulesets', '/core/src/rulesets/schema', '/core/src/rulesets/acl'],
    );
    const { evaluation } = await run(fsys);
    expect(evaluation.results.map((r) => r.rule.id)).toEqual(['ACL-02']);
    expect(evaluation.notApplicable).toEqual([expect.objectContaining({ reason: 'disabled', rule: expect.objectContaining({ id: 'ACL-03' }) })]);
    expect(evaluation.overrides.applied).toEqual([
      { ruleId: 'ACL-03', field: 'enabled', from: true, to: false, source: 'src/rulesets/acl/a.rules.json' },
    ]);
  });
});
