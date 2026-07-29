#!/usr/bin/env node

/**
 * GT-632 criterion 3 — negative fixtures for the joined-path guard.
 *
 * The guard exists because a path that is BUILT is invisible to the literal
 * scanner, and twelve of them survived the `src/` move — one denying every MCP
 * tool in production. But the first draft of this guard was WRONG in three ways
 * that all pointed the same direction: it demanded changes that would have made
 * the codebase worse (rewriting joins on a customer's workspace, deleting the
 * fallbacks that keep deployed images booting, inverting a prohibition into its
 * opposite). Each of those corrections is now a rule with no syntax to reveal
 * it, so each gets a fixture here. A guard whose leniency is untested is a guard
 * one "cleanup" away from arguing for broken code.
 *
 * Every case runs the real script in a temp sandbox via `--root`, and asserts on
 * the MESSAGE, not merely the exit code: the exit code says something is wrong,
 * the message is what decides whether the reader fixes the right thing.
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '47-validate-joined-paths.mjs');
const REPO = resolve(__dirname, '../../..');

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt632-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

const run = (root, extra = []) => {
  const r = spawnSync(process.execPath, [GUARD, '--root', root, ...extra], {
    encoding: 'utf8', timeout: 120000,
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

/**
 * A mini-repository with the SHAPE the guard scans: at least one TypeScript file
 * under `src/packages`, so the anti-vacuous floors are satisfied and the case
 * under test is the thing that decides the verdict.
 *
 * @param {string} name    unique directory under the sandbox
 * @param {object} files   repo-relative path → contents (sources AND the targets
 *                         a join is supposed to resolve to)
 */
const fixture = (name, files) => {
  const root = join(sandbox, name);
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  return root;
};

// --- the corpus this guard is actually deployed against ----------------------

test('the real repository passes, and reports both denominators', () => {
  // Not decoration: the guard is only worth wiring if the tree it guards is
  // clean today. If this goes red the repository has a built path pointing at
  // nothing, which is the defect itself — not a broken test.
  const { status, out } = run(REPO);
  assert.equal(status, 0, out);
  assert.match(out, /every repo-rooted joined path resolves to something that exists/);
  assert.match(out, /files scanned \.+ \d+/);
  assert.match(out, /path\.join calls \.+ \d+/);
});

// --- the defect it was written for -------------------------------------------

describe('a built path that resolves to nothing', () => {
  it('goes RED and names the file and the resolved path', () => {
    // The whole point of the guard: `path.join(corePath, 'sdk', 'cli', …)` is a
    // path a human never typed, so a reader cannot grep for it. The message has
    // to hand them both halves — WHICH file, and WHAT it resolved to — or they
    // will have to re-derive the join by hand to act on it.
    const root = fixture('lone-broken', {
      'src/packages/demo/resolver.ts':
        "import path from 'node:path';\n" +
        "export const policy = (corePath: string) => path.join(corePath, 'nope', 'policy.wasm');\n",
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /1 built path\(s\) resolve to nothing that exists/);
    assert.match(out, /src\/packages\/demo\/resolver\.ts/);
    assert.match(out, /path\.join\(corePath, …\) → nope\/policy\.wasm/);
    // A lone join is a bare assertion, NOT a chain — mislabelling it would tell
    // the reader to go looking for a sibling candidate that does not exist.
    assert.doesNotMatch(out, /NO member of this fallback chain exists/);
  });

  it('passes once the target exists', () => {
    // The control. Without it, the red above could come from any incidental
    // property of the fixture rather than from the missing file.
    const root = fixture('lone-present', {
      'src/packages/demo/resolver.ts':
        "import path from 'node:path';\n" +
        "export const policy = (corePath: string) => path.join(corePath, 'dist', 'policy.wasm');\n",
      'dist/policy.wasm': 'binary\n',
    });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
  });
});

// --- leniency #1: the fallback chain -----------------------------------------

describe('fallback chains (ONE member resolving is the contract)', () => {
  /**
   * Sibling joins in one array literal are a chain across historical layouts.
   * Scoring them independently would demand every layout exist at once, and the
   * obvious way to silence that is to delete the fallbacks — which breaks
   * already-deployed images that still have the old layout. The guard must be
   * lenient here, and that leniency has to be pinned down or a later "stricter
   * is safer" edit will quietly remove it.
   */
  const chainSource =
    "import path from 'node:path';\n" +
    'export const candidates = (corePath: string) => [\n' +
    "  path.join(corePath, 'src', 'rulesets', 'topologies'),\n" +
    "  path.join(corePath, 'rulesets', 'topologies'),\n" +
    '];\n';

  it('passes when ONE member exists', () => {
    const root = fixture('chain-one', {
      'src/packages/demo/candidates.ts': chainSource,
      // Only the LEGACY arm is present. The modern one is absent on purpose:
      // this is exactly the state a deployed image is in.
      'rulesets/topologies/.keep': '',
    });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /fallback chains \.+ 1/);
  });

  it('goes RED only when NO member exists, and lists every candidate', () => {
    // The reader cannot fix a chain from one candidate: they need to see which
    // layouts were tried before deciding whether to add a file or add an arm.
    const root = fixture('chain-none', {
      'src/packages/demo/candidates.ts': chainSource,
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /NO member of this fallback chain exists/);
    assert.match(out, /- src\/rulesets\/topologies/);
    assert.match(out, /- rulesets\/topologies/);
    // One finding, not two: the chain is a single assertion.
    assert.match(out, /1 built path\(s\) resolve to nothing that exists/);
  });

  it('groups a ternary-expressed chain the same way as an array', () => {
    // `a ? join(x) : join(y)` is a fallback chain written as an expression. If
    // grouping keyed on the comma alone, this would split into two bare
    // assertions and demand both layouts simultaneously. The chain WORDING in
    // the failure is what proves the grouping happened, so the fixture makes
    // neither arm exist in order to see it.
    const root = fixture('chain-ternary', {
      'src/packages/demo/ternary.ts':
        "import path from 'node:path';\n" +
        'export const p = (corePath: string, legacy: boolean) =>\n' +
        "  legacy ? path.join(corePath, 'old', 'layout') : path.join(corePath, 'new', 'layout');\n",
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /NO member of this fallback chain exists/);
    assert.match(out, /- old\/layout/);
    assert.match(out, /- new\/layout/);
    assert.match(out, /1 built path\(s\) resolve to nothing that exists/);
  });

  it('a ternary chain with ONE arm present is green', () => {
    const root = fixture('chain-ternary-one', {
      'src/packages/demo/ternary.ts':
        "import path from 'node:path';\n" +
        'export const p = (corePath: string, legacy: boolean) =>\n' +
        "  legacy ? path.join(corePath, 'old', 'layout') : path.join(corePath, 'new', 'layout');\n",
      'old/layout/.keep': '',
    });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /fallback chains \.+ 1/);
  });
});

// --- leniency #2: abstention beats a guess -----------------------------------

test('a join with a variable segment is COUNTED, never guessed at', () => {
  // `path.join(corePath, 'sdk', name)` cannot be resolved without running the
  // program. Reporting a path the guard had to invent would produce findings the
  // reader cannot act on, and a guard whose findings are unactionable is a guard
  // people learn to skip. So it abstains — but VISIBLY, in the denominator, so
  // the abstention is auditable rather than silent.
  const root = fixture('variable-segment', {
    'src/packages/demo/dynamic.ts':
      "import path from 'node:path';\n" +
      "export const p = (corePath: string, name: string) => path.join(corePath, 'sdk', name);\n",
  });
  const { status, out } = run(root);
  assert.equal(status, 0, out);
  assert.match(out, /\(1 carry a variable segment\)/);
  assert.doesNotMatch(out, /resolve to nothing that exists/);
  // It must not appear as a missing path under ANY invented spelling.
  assert.doesNotMatch(out, /sdk/);
});

// --- leniency #3: bases that are not this repository -------------------------

test('a join on a non-root base is ignored entirely', () => {
  // `root` in the evaluators is a PARAMETER naming the customer workspace under
  // evaluation, and `satellitePath` addresses another repository. A file being
  // absent HERE says nothing about either. Six of these were reported as
  // breakage on the first draft; "fixing" them would have broken working
  // features to satisfy a guard.
  const root = fixture('foreign-bases', {
    'src/packages/demo/evaluator.ts':
      "import path from 'node:path';\n" +
      "export const a = (root: string) => path.join(root, 'agent.config.json');\n" +
      "export const b = (satellitePath: string) => path.join(satellitePath, 'evolith.yaml');\n",
  });
  const { status, out } = run(root);
  assert.equal(status, 0, out);
  // Counted as joins (the scan saw them) but not as repo-rooted assertions.
  assert.match(out, /path\.join calls \.+ 2/);
  assert.match(out, /rooted at the repo \.+ 0/);
  assert.doesNotMatch(out, /resolve to nothing that exists/);
});

// --- the anti-vacuous floors -------------------------------------------------

describe('anti-vacuous floors', () => {
  it('refuses a root with ZERO TypeScript files', () => {
    // This is how the guard would go quiet without anyone noticing: the tree is
    // renamed, the scan finds nothing, and "no missing paths" reads exactly like
    // a clean run. It is also the state 43-validate-guard-negative-fixtures puts
    // every scanning guard in, so this exit code is what its SELF_GUARDED
    // registration rests on.
    const root = fixture('no-sources', { 'placeholder.txt': 'x\n' });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /found ZERO TypeScript files/);
    assert.match(out, /src\/packages, src\/apps, src\/sdk/);
  });

  it('refuses a non-empty scan that yields ZERO path.join calls', () => {
    // The subtler floor: the files are there, so the first check is satisfied,
    // and the SHAPE the guard matches has moved (to `resolve()`, to a helper, to
    // template literals). Nothing is being checked and the run is still green
    // without this.
    const root = fixture('no-joins', {
      'src/packages/demo/plain.ts': 'export const x = 1;\n',
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /found ZERO path\.join calls/);
    assert.match(out, /the shape moved and nothing was checked/);
    // It must have gotten past the file floor to be a meaningful claim.
    assert.match(out, /scanned 1 file\(s\)/);
  });
});
