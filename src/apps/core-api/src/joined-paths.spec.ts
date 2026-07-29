import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from './test-support/repo-root';

/**
 * GT-632 criterion 3 — a path core-api BUILDS must resolve, not just a path it
 * writes.
 *
 * `.harness/scripts/ci/40-validate-path-literals` scans string literals, so a
 * reference assembled as `path.join(corePath, 'reference', 'architecture', …)`
 * is invisible to it. That is how three core-api paths survived the `src/`
 * refactor pointing at directories that no longer exist:
 *
 *   - `reference/architecture/blueprints`  (blueprint resolution in app.module)
 *   - `reference/architecture/topologies`  (the doc-side ruleset corpus)
 *   - `rulesets/sdlc/phase-gates.rules.json`
 *
 * None of them crashed. A missing directory makes a reference query return
 * nothing, and an empty answer reads exactly like a clean run — which is why
 * nothing went red for the length of a refactor.
 *
 * `.harness/scripts/ci/47-validate-joined-paths.mjs` enforces this repo-wide.
 * This spec is its in-package twin: it fails under `npm test -w core-api`,
 * before CI, and it covers files this package adds tomorrow rather than only
 * the three known offenders.
 */

/** Bases whose value is the root of THIS repository at runtime. */
const REPO_ROOTED_BASES = new Set(['corePath', 'ctx.corePath', 'repoRoot']);

interface JoinedPath {
  file: string;
  base: string;
  segments: string[];
  /** false when a segment is a variable, which makes the path uncomputable. */
  resolvable: boolean;
  text: string;
}

/** Recursively collect the package's non-spec TypeScript sources. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage'].includes(entry.name)) continue;
      sourceFiles(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Extract `path.join(base, 'a', 'b')` calls whose segments are all literals.
 *
 * A join carrying a variable segment is reported as unresolvable rather than
 * guessed at: inventing a path this spec cannot compute would produce failures
 * nobody can act on, and a guard people learn to ignore enforces nothing.
 */
function extractJoins(file: string, source: string): JoinedPath[] {
  const found: JoinedPath[] = [];
  const re = /path\.join\(\s*([A-Za-z_$][\w.$]*)\s*,\s*([^)]*)\)/g;
  for (const match of source.matchAll(re)) {
    const [text, base, rest] = match;
    const literals = [...rest.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    const args = rest.split(',').map((a) => a.trim()).filter(Boolean);
    found.push({
      file,
      base,
      segments: literals,
      resolvable: args.length === literals.length && literals.length > 0,
      text,
    });
  }
  return found;
}

describe('core-api paths that are built, not written', () => {
  const packageRoot = path.resolve(__dirname);
  const files = sourceFiles(packageRoot);
  const joins = files.flatMap((f) => extractJoins(path.relative(REPO_ROOT, f), fs.readFileSync(f, 'utf8')));
  const repoRooted = joins.filter((j) => REPO_ROOTED_BASES.has(j.base));

  it('scans a non-empty corpus of sources and joins', () => {
    // Anti-vacuous: if the shape of the package moves and this spec silently
    // scans nothing, it would pass forever while checking nothing at all.
    expect(files.length).toBeGreaterThan(20);
    expect(joins.length).toBeGreaterThan(0);
    expect(repoRooted.length).toBeGreaterThan(0);
  });

  it('resolves every repo-rooted joined path to something that exists', () => {
    const broken = repoRooted
      .filter((j) => j.resolvable)
      .filter((j) => !fs.existsSync(path.join(REPO_ROOT, ...j.segments)))
      .map((j) => `${j.file}: ${j.text} → ${j.segments.join('/')}`);

    expect(broken).toEqual([]);
  });
});
