/**
 * GT-694 AC1 — the falsifiability criterion, against the real compiled bundle.
 *
 * BEFORE: a gate rule of category `multi-tenancy` returned
 *   `OPA Input Schema Validation Failed: data/satellite must have required property 'multiTenancy'`
 * — a failure carrying no information about the repository, indistinguishable at a
 * glance from a real violation, and reachable no matter what the satellite did.
 * Thirteen categories were in that state.
 *
 * AFTER: the caller supplies the facts the Core cannot observe and the policy is
 * reached, returning `MTN-*` — or returning `passed` when the declared posture is
 * compliant, which is the half that proves the run is a real evaluation and not a
 * fixed answer.
 *
 * Uses the real `policy.wasm` deliberately: the defect lived in schema validation
 * ahead of the policy, so a mocked engine skips the thing that was broken. CI
 * compiles the bundle in this job before these tests run, and its absence FAILS the
 * suite rather than skipping it.
 */

import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { OpaEvaluator } from './opa-evaluator';
import type { NormalizedRule } from '../../../domain/models/normalized-rule';

const CORE = path.resolve(__dirname, '../../../../../../..');
const WASM = path.join(CORE, 'src', 'rulesets', 'opa', 'policy.wasm');

const realFs: any = {
  exists: async (p: string) => existsSync(p),
  existsSync: (p: string) => existsSync(p),
  readFile: async (p: string) => readFile(p, 'utf8'),
  readFileBuffer: async (p: string) => readFile(p),
  readJson: async (p: string) => JSON.parse(await readFile(p, 'utf8')),
  readdir: async (p: string) => readdir(p),
  readdirNames: async (p: string) => readdir(p),
  listFiles: async (p: string) => readdir(p),
  isDir: async (p: string) => stat(p).then((s) => s.isDirectory()).catch(() => false),
  isDirectory: async (p: string) => stat(p).then((s) => s.isDirectory()).catch(() => false),
  stat: async (p: string) => {
    const s = await stat(p);
    return { isDirectory: () => s.isDirectory(), isFile: () => s.isFile(), size: s.size };
  },
};

const silentLogger: any = {
  info: () => undefined, warn: () => undefined, error: () => undefined,
  debug: () => undefined, success: () => undefined,
};

const tenancyGate: NormalizedRule = {
  id: 'opa-multi-tenancy',
  severity: 'MUST',
  category: 'multi-tenancy',
  title: 'Multi-tenancy (Rego)',
  description: 'gate rule referencing rulesets/opa/multi-tenancy.rego',
  blocking: true,
  sourceFile: 'gate.json',
} as NormalizedRule;

function bareSatellite(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'gt694-'));
  writeFileSync(path.join(dir, 'evolith.yaml'), 'apiVersion: evolith.dev/v1\nkind: Satellite\nmetadata:\n  name: sat\nspec: {}\n');
  return dir;
}

const evaluate = (satellite: string, facts?: Record<string, unknown>) =>
  new OpaEvaluator(realFs, silentLogger).evaluateAll([tenancyGate], {
    satellitePath: satellite,
    corePath: CORE,
    ...(facts ? { facts } : {}),
  } as any);

describe('a supplied fact reaches the policy · GT-694 AC1', () => {
  it('the compiled bundle is present — this suite must not pass by not running', () => {
    expect([WASM, existsSync(WASM)]).toEqual([WASM, true]);
  });

  it('WITHOUT supplied facts the category still cannot be evaluated, and says exactly that', async () => {
    const [result] = await evaluate(bareSatellite());

    // Not a silent pass. Under GT-595 a blocking rule that cannot run is reported —
    // this asserts the pre-GT-694 behaviour is still what an unsupplied run gets,
    // so the fix did not paper over a missing fact with a green tick.
    expect(result.result).toBe('failed');
    expect(result.message).toMatch(/must have required property 'multiTenancy'/);
  }, 60000);

  it('WITH the facts supplied, the policy is reached and names MTN-*', async () => {
    const [result] = await evaluate(bareSatellite(), {
      satellite: {
        multiTenancy: {
          applicationFiltering: false,
          databaseEnforcement: false,
          tenantContextPropagation: true,
          crossTenantAccess: false,
          schemaStrategyDefined: true,
          apiTenantValidation: true,
        },
      },
    });

    expect(result.result).toBe('failed');
    // The two that were declared false, and only those.
    expect(result.message).toMatch(/tenant_id filter/);
    expect(result.message).toMatch(/RLS/);
    // …and nothing about the four that were declared true.
    expect(result.message).not.toMatch(/Cross-tenant data access/);
    expect(result.message).not.toMatch(/schema strategy not defined/);
  }, 60000);

  /**
   * GT-695 AC1 — the posture is built FROM THE SCHEMA, not hand-listed.
   *
   * Before GT-695 this case had to supply two fields the schema never declared
   * (`tenantAuditTrailEnabled`, `tenantMigrationPathDefined`), because the policy
   * reads them for MTN-06/07. A caller reading the published contract could not
   * know that, so satisfying it in full still failed. Deriving the field set from
   * the schema is what proves the contract is now sufficient: if a field the policy
   * reads went undeclared again, this posture would omit it and the run would fail.
   *
   * Polarity comes from the policy itself — `not input...X` means X must be true to
   * pass, a bare `input...X` means it must be false — so nobody has to remember
   * which flags are the negative ones.
   */
  it('PASSES on a posture built from exactly what the schema declares · GT-695 AC1', async () => {
    const schema = JSON.parse(
      readFileSync(path.join(CORE, 'src/rulesets/opa/schemas/multi-tenancy.input.schema.json'), 'utf8'),
    ) as any;
    const declared: string[] = Object.keys(schema.properties.satellite.properties.multiTenancy.properties);
    const rego = readFileSync(path.join(CORE, 'src/rulesets/opa/multi-tenancy.rego'), 'utf8');

    const posture: Record<string, boolean> = {};
    for (const field of declared) {
      posture[field] = new RegExp(`not input\\.satellite\\.multiTenancy\\.${field}\\b`).test(rego);
    }

    // Guard against a vacuous posture: the schema must actually declare the fields
    // the policy reads, which is the whole claim of GT-695.
    expect(declared.length).toBeGreaterThanOrEqual(8);

    const [result] = await evaluate(bareSatellite(), { satellite: { multiTenancy: posture } });

    expect(result.result).toBe('passed');
  }, 60000);
});
