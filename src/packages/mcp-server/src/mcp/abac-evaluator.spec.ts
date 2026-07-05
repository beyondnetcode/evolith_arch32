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
});
