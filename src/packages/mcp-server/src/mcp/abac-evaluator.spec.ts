import { AbacEvaluator, AbacInput } from './abac-evaluator';

const baseUser = { id: 'u1', roles: ['developer'], tenant: 't1' };
const input = (over: Partial<AbacInput> = {}): AbacInput => ({
  user: baseUser,
  tool_name: 'evolith-read-file',
  resource_domain: 'mcp-server',
  environment: 'staging',
  ...over,
});

// A path guaranteed not to contain a compiled policy.wasm.
const MISSING_CORE = '/nonexistent-evolith-core-path-for-tests';

describe('AbacEvaluator', () => {
  const abac = new AbacEvaluator();

  describe('evaluateNative', () => {
    it('denies when no roles present (ABAC-02)', () => {
      const d = abac.evaluateNative(input({ user: { ...baseUser, roles: [] } }));
      expect(d.allowed).toBe(false);
      expect(d.violations[0].id).toBe('ABAC-02');
    });

    it('allows read tools for any authenticated user with roles', () => {
      expect(abac.evaluateNative(input()).allowed).toBe(true);
    });

    it('denies an unknown/unclassified evolith- tool (ABAC-03)', () => {
      const d = abac.evaluateNative(input({ tool_name: 'evolith-frobnicate' }));
      expect(d.allowed).toBe(false);
      expect(d.violations[0].id).toBe('ABAC-03');
    });

    it('denies deploy tools in production for non-architects (ABAC-01)', () => {
      const d = abac.evaluateNative(input({
        tool_name: 'evolith-deploy',
        environment: 'production',
        user: { ...baseUser, roles: ['operator'] },
      }));
      expect(d.allowed).toBe(false);
    });
  });

  describe('evaluateOpa fail-closed on missing policy (GT-349)', () => {
    it('DENIES in production when policy.wasm is absent (no fail-open)', async () => {
      const d = await abac.evaluateOpa(input({ environment: 'production' }), MISSING_CORE);
      expect(d.allowed).toBe(false);
      expect(d.violations[0].id).toBe('ABAC_POLICY_MISSING');
    });

    it('abstains in non-production when policy.wasm is absent (native still governs)', async () => {
      const d = await abac.evaluateOpa(input({ environment: 'staging' }), MISSING_CORE);
      expect(d.allowed).toBe(true);
      expect(d.violations).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // GT-572 — EVOLITH_ABAC_POLICY_PATH
  //
  // The two built-in candidates are repository-layout paths under the process
  // cwd, which the published npm package can never satisfy: policy.wasm is a
  // build artifact that lives outside the package directory. Without an override
  // a tarball install fail-closes in production with no way out, so the override
  // is the difference between "strict" and "unsatisfiable".
  // -------------------------------------------------------------------------
  describe('policy location override (GT-572)', () => {
    const ORIGINAL = process.env.EVOLITH_ABAC_POLICY_PATH;
    afterEach(() => {
      if (ORIGINAL === undefined) delete process.env.EVOLITH_ABAC_POLICY_PATH;
      else process.env.EVOLITH_ABAC_POLICY_PATH = ORIGINAL;
    });

    it('reports the CONFIGURED path when the override points nowhere', async () => {
      process.env.EVOLITH_ABAC_POLICY_PATH = '/nonexistent-override/policy.wasm';
      const d = await abac.evaluateOpa(input({ environment: 'production' }), MISSING_CORE);

      expect(d.allowed).toBe(false);
      expect(d.violations[0].id).toBe('ABAC_POLICY_MISSING');
      // Naming the configured path is the point: an operator who set the variable
      // must see THAT path in the denial, not the repo-layout default.
      expect(d.violations[0].message).toContain('/nonexistent-override/policy.wasm');
    });

    it('loads the policy from the override and returns a real OPA decision', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('node:fs') as typeof import('node:fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodePath = require('node:path') as typeof import('node:path');
      const compiled = nodePath.resolve(
        __dirname, '..', '..', '..', '..', 'sdk', 'cli', 'rulesets', 'opa', 'policy.wasm',
      );
      if (!fs.existsSync(compiled)) {
        // policy.wasm is gitignored; skip rather than assert a local artifact.
        // The negative case above carries the contract either way.
        return;
      }

      process.env.EVOLITH_ABAC_POLICY_PATH = compiled;
      const d = await abac.evaluateOpa(input({ environment: 'production' }), MISSING_CORE);

      // Whatever the verdict, it must NOT be the missing-policy fail-closed one:
      // the override made the bundle reachable from a cwd that has no repo layout.
      expect(d.violations.map((v) => v.id)).not.toContain('ABAC_POLICY_MISSING');
    });

    it('ignores a blank override rather than resolving it to the cwd', async () => {
      process.env.EVOLITH_ABAC_POLICY_PATH = '   ';
      const d = await abac.evaluateOpa(input({ environment: 'production' }), MISSING_CORE);

      expect(d.violations[0].id).toBe('ABAC_POLICY_MISSING');
      expect(d.violations[0].message).toContain(MISSING_CORE);
    });
  });
});
