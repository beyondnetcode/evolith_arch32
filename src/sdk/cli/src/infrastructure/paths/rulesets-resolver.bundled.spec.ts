import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'node:os';
import { resolveRulesets } from './rulesets-resolver';

// `fs`'s own exports are non-configurable, so spying needs a mutable module
// object. Every function keeps the REAL implementation unless a test overrides
// it — these tests exercise the resolver against the real filesystem by default.
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(actual.existsSync),
    readdirSync: jest.fn(actual.readdirSync),
  };
});

const actualFs = jest.requireActual<typeof fs>('fs');

/**
 * GT-562 — the BUNDLED resolution path (`resolveRulesets()` with no `--core`)
 * was entirely uncovered, even though it is the path EVERY installed user takes:
 * a plain `evolith validate` with no override resolves its corpus by walking up
 * from `__dirname` looking for the CLI package root.
 *
 * The failure mode this family has produced before (GT-474, GT-566) is never a
 * crash — it is resolving a directory that merely SHARES A NAME with the corpus
 * and then reporting "0 rules, all good". So these tests assert on what was
 * resolved and on the corpus actually being there, not merely that a string came
 * back.
 */
describe('resolveRulesets — bundled corpus resolution', () => {
  beforeEach(() => {
    (fs.existsSync as jest.Mock).mockImplementation(actualFs.existsSync);
    (fs.readdirSync as jest.Mock).mockImplementation(actualFs.readdirSync);
  });

  it('resolves the corpus bundled in the CLI package when no --core override is given', () => {
    const resolved = resolveRulesets();

    expect(resolved.source).toBe('bundled');
    // `coreRoot` is the package root, `rulesetsRoot` the corpus inside it; the
    // TopologyCatalogService appends `rulesets/...` to `coreRoot`, so the two
    // must stay in this parent/child relationship.
    expect(path.dirname(resolved.rulesetsRoot)).toBe(resolved.coreRoot);
    expect(fs.existsSync(path.join(resolved.coreRoot, 'package.json'))).toBe(true);
  });

  it('resolves a directory that really holds canonical ruleset families, not just any `rulesets` dir', () => {
    const { rulesetsRoot } = resolveRulesets();

    // Content-qualified: this is the check that stops the satellite-side
    // `rulesets/agents` tree from shadowing the real corpus.
    const entries = fs.readdirSync(rulesetsRoot);
    expect(entries).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(architecture|topologies|adr|opa|schema)$/)]),
    );
  });

  it('treats an empty override string as "no override" and falls through to the bundled corpus', () => {
    // `--core ""` (or an unset profile value read as '') must not be taken as a
    // real override — resolving `""` would resolve to cwd, which this resolver
    // deliberately never falls back to.
    expect(resolveRulesets('   ').source).toBe('bundled');
  });

  it('reports an actionable failure, naming every path probed, when an override holds no corpus', () => {
    const empty = actualFs.mkdtempSync(path.join(tmpdir(), 'evolith-nocorpus-'));
    try {
      expect(() => resolveRulesets(empty)).toThrow(new RegExp(empty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    } finally {
      actualFs.rmSync(empty, { recursive: true, force: true });
    }
  });

  it('skips an unreadable candidate directory instead of crashing the whole resolution', () => {
    // A directory that exists but cannot be listed (permissions, a dangling
    // mount) must be treated as "not a corpus" and the walk must continue —
    // otherwise an unrelated unreadable ancestor takes the CLI down.
    let threwAtLeastOnce = false;
    (fs.readdirSync as jest.Mock).mockImplementation((p: fs.PathLike, ...rest: unknown[]) => {
      if (String(p).endsWith(`${path.sep}rulesets`) && !threwAtLeastOnce) {
        threwAtLeastOnce = true;
        const err = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        throw err;
      }
      return (actualFs.readdirSync as (...a: unknown[]) => unknown)(p, ...rest);
    });

    // Resolution either continues up the tree to another package root or throws
    // the actionable "Rulesets not found" error — never an EACCES escaping raw.
    try {
      const resolved = resolveRulesets();
      expect(resolved.source).toBe('bundled');
    } catch (err) {
      expect((err as Error).message).toContain('Rulesets not found');
    }
    expect(threwAtLeastOnce).toBe(true);
  });

  it('gives up with an actionable message rather than falling back to cwd when nothing is bundled', () => {
    // The resolver's stated contract is "never falls back to process.cwd()".
    // Simulate a CLI installed without its corpus: nothing qualifies anywhere.
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(() => resolveRulesets()).toThrow(/Rulesets not found/);
    expect(() => resolveRulesets()).toThrow(/--core/);
  });
});
