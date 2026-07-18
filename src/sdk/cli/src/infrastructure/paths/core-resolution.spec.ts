import * as fs from 'fs';
import * as path from 'path';
import { resolveCoreOverride } from './core-resolver';
import { resolveRulesets } from './rulesets-resolver';

/**
 * GT-456 — unified Core resolution.
 *
 * Two layers are covered here:
 *  1. `resolveCoreOverride` — the shared override chain (`--core` →
 *     `EVOLITH_CORE_PATH` → `profile.core`) that validate/evaluate/gate/phase/
 *     sdlc gate-status now share instead of each re-implementing a subset.
 *  2. `resolveRulesets` against a REAL Core checkout — proving that a valid
 *     `--core` resolves the named (architecture/adr) AND topology ruleset
 *     families and echoes the Core root (which validate copies into
 *     `coreRef.path`), while a missing Core raises an ACTIONABLE error rather
 *     than silently resolving zero rules.
 */
describe('GT-456 unified Core resolution', () => {
  describe('resolveCoreOverride — the shared override chain', () => {
    const ENV_KEY = 'EVOLITH_CORE_PATH';
    let savedEnv: string | undefined;

    beforeEach(() => {
      savedEnv = process.env[ENV_KEY];
      delete process.env[ENV_KEY];
    });

    afterEach(() => {
      if (savedEnv === undefined) delete process.env[ENV_KEY];
      else process.env[ENV_KEY] = savedEnv;
    });

    it('prefers an explicit --core over EVOLITH_CORE_PATH and profile.core', () => {
      process.env[ENV_KEY] = '/from/env';
      expect(resolveCoreOverride({ explicit: '/from/flag', profileCore: '/from/profile' })).toBe('/from/flag');
    });

    it('falls back to EVOLITH_CORE_PATH when no --core is given', () => {
      process.env[ENV_KEY] = '/from/env';
      expect(resolveCoreOverride({ profileCore: '/from/profile' })).toBe('/from/env');
    });

    it('falls back to profile.core when neither --core nor EVOLITH_CORE_PATH is set', () => {
      expect(resolveCoreOverride({ profileCore: '/from/profile' })).toBe('/from/profile');
    });

    it('returns undefined (auto-detect) when nothing is configured', () => {
      expect(resolveCoreOverride({})).toBeUndefined();
    });

    it('treats empty / whitespace-only values as unset', () => {
      expect(resolveCoreOverride({ explicit: '   ', profileCore: '' })).toBeUndefined();
    });
  });

  describe('resolveRulesets against a real Core checkout', () => {
    // Walk up from this test file until we find the repo whose src/rulesets holds
    // the canonical topology family — that directory is a valid Core root.
    function findRepoRoot(): string {
      let dir = __dirname;
      for (let i = 0; i < 12; i++) {
        if (fs.existsSync(path.join(dir, 'src', 'rulesets', 'topologies'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
      throw new Error('Could not locate a Core checkout with src/rulesets/topologies for the test.');
    }

    it('resolves the named + topology ruleset families and echoes the Core root', () => {
      // Point --core at the checkout's `src` dir so `${core}/rulesets` is the
      // real family root (architecture/, adr/, topologies/, …).
      const coreDir = path.join(findRepoRoot(), 'src');

      const resolved = resolveRulesets(coreDir);

      // coreRoot is echoed back — validate copies this into coreRef.path.
      expect(resolved.coreRoot).toBe(path.resolve(coreDir));
      expect(resolved.source).toBe('override');

      // The resolved rulesets root must actually hold the canonical families:
      // named rulesets (architecture/, adr/) AND topologies/.
      expect(fs.existsSync(resolved.rulesetsRoot)).toBe(true);
      expect(fs.existsSync(path.join(resolved.rulesetsRoot, 'architecture'))).toBe(true);
      expect(fs.existsSync(path.join(resolved.rulesetsRoot, 'adr'))).toBe(true);
      expect(fs.existsSync(path.join(resolved.rulesetsRoot, 'topologies'))).toBe(true);
    });

    it('raises an actionable error when --core points at a Core with no rulesets', () => {
      const missing = path.join(__dirname, '__no_such_core__');
      // GT-566: the message now names each candidate and whether it existed,
      // rather than a single "no rulesets at X or Y" line. Assert the intent —
      // it says what could not be found and where to point --core.
      expect(() => resolveRulesets(missing)).toThrow(/could not locate the evolith ruleset corpus/i);
      expect(() => resolveRulesets(missing)).toThrow(/__no_such_core__[/\\]src[/\\]rulesets/);
    });

    // GT-566: `--core <Core monorepo checkout>` must reach the real corpus at
    // `src/rulesets` and NOT stop at the repo-root `rulesets/` tree, which holds
    // only the satellite-side `agents/` directory. Qualifying candidates by mere
    // directory existence made this override resolve the agents tree, which then
    // loaded zero rules.
    it('skips the repo-root rulesets/agents tree and resolves src/rulesets', () => {
      const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
      // Guard the fixture: if the decoy is gone the regression cannot reproduce.
      expect(fs.existsSync(path.join(repoRoot, 'rulesets', 'agents'))).toBe(true);

      const resolved = resolveRulesets(repoRoot);
      expect(resolved.rulesetsRoot).toBe(path.join(repoRoot, 'src', 'rulesets'));
      expect(fs.existsSync(path.join(resolved.rulesetsRoot, 'topologies'))).toBe(true);
    });
  });
});
