import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { findProjectRoot } from './project-root';

/**
 * GT-632 — these build a real directory tree on disk rather than stubbing the
 * probe, so the assertion is about the LAYOUT THIS REPOSITORY ACTUALLY HAS,
 * not about a fixture that agrees with the code. That agreement between code
 * and fixture is precisely what let the stale paths survive the src/ move.
 */
describe('findProjectRoot', () => {
  let tmp: string;

  const mk = (root: string, ...rels: string[]) => {
    for (const rel of rels) fs.mkdirSync(path.join(root, rel), { recursive: true });
  };

  beforeEach(() => {
    tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gt632-root-')));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('finds the root of a CURRENT core layout from a nested cwd', () => {
    const root = path.join(tmp, 'core');
    mk(
      root,
      path.join('reference', 'core', 'sdlc', '04-artifact-templates'),
      path.join('src', 'rulesets'),
      path.join('src', 'sdk', 'cli'),
    );
    const nested = path.join(root, 'src', 'sdk', 'cli');

    expect(findProjectRoot(nested)).toBe(root);
  });

  it('still finds the root of the PRE-refactor layout', () => {
    const root = path.join(tmp, 'legacy');
    mk(
      root,
      path.join('reference', 'governance', 'sdlc', '04-artifact-templates'),
      'rulesets',
      'packages',
    );

    expect(findProjectRoot(path.join(root, 'packages'))).toBe(root);
  });

  it('accepts the mixed layout: new templates location, bundled flat rulesets', () => {
    const root = path.join(tmp, 'bundled');
    mk(
      root,
      path.join('reference', 'core', 'sdlc', '04-artifact-templates'),
      'rulesets',
      'work',
    );

    expect(findProjectRoot(path.join(root, 'work'))).toBe(root);
  });

  it('requires BOTH markers — rulesets alone is not a project root', () => {
    const root = path.join(tmp, 'half');
    mk(root, path.join('src', 'rulesets'), 'work');
    const start = path.join(root, 'work');

    expect(findProjectRoot(start)).toBe(start);
  });

  it('falls back to startPath, unresolved, when no ancestor is marked', () => {
    const start = path.join(tmp, 'bare', 'deep');
    fs.mkdirSync(start, { recursive: true });

    expect(findProjectRoot(start)).toBe(start);
  });

  /**
   * The regression bite: this repository is a current-layout core. Before the
   * fix the walk-up matched nothing here and returned the starting directory,
   * so `evolith sdlc handoff` graded gate evidence relative to wherever it
   * happened to be invoked.
   */
  it('resolves THIS repository from a deep subdirectory', () => {
    const repoRoot = path.resolve(__dirname, '../../../../../..');
    // Guard the anchor itself: if the CLI ever moves, fail loudly here rather
    // than silently asserting against the wrong tree.
    expect(fs.existsSync(path.join(repoRoot, 'src', 'rulesets'))).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, 'reference', 'core', 'sdlc', '04-artifact-templates')),
    ).toBe(true);

    expect(findProjectRoot(__dirname)).toBe(repoRoot);
  });
});
