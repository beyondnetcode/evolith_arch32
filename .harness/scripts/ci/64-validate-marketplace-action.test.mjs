/**
 * GT-651 — self-test for the Marketplace-prerequisite guard.
 *
 * The guard's whole value is that it goes RED on states that look completely
 * healthy in review: an action that is well-written, well-tested, and in a
 * directory the publishing channel does not read. So the cases that matter here
 * are the negative ones — a guard nobody has watched fail is the defect this
 * backlog keeps finding.
 *
 * Run it with:  node --test .harness/scripts/ci/64-validate-marketplace-action.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BRANDING_COLORS,
  KNOWN_ICONS,
  RESERVED_NAMES,
  checkManifest,
  findActionManifests,
} from './64-validate-marketplace-action.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(HERE, '64-validate-marketplace-action.mjs');
const REPO_ROOT = path.resolve(HERE, '../../..');

const VALID = {
  name: 'Evolith Governance Validation',
  description: 'Validates repository compliance.',
  branding: { icon: 'shield', color: 'blue' },
  runs: { using: 'composite', steps: [] },
};

const errorsOf = (manifest, ctx = {}) =>
  checkManifest(manifest, { path: 'action.yml', ...ctx }).filter((f) => f.level === 'error');

/** Runs the guard against a throwaway tree and returns its exit code and output. */
function runGuard(root) {
  const res = spawnSync(process.execPath, [GUARD, '--root', root], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return { status: res.status, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

function scratch(build) {
  const root = mkdtempSync(path.join(tmpdir(), 'gt651-'));
  build(root);
  return root;
}

describe('64-validate-marketplace-action', () => {
  // --- the rule the gap was about ------------------------------------------

  test('THE GAP: a perfectly good action in a subfolder is RED, not green', () => {
    const root = scratch((r) => {
      mkdirSync(path.join(r, '.github/actions/evolith-validate'), { recursive: true });
      // The real manifest, verbatim. Nothing about it is wrong except where it is.
      cpSync(path.join(REPO_ROOT, 'action.yml'), path.join(r, '.github/actions/evolith-validate/action.yml'));
    });
    try {
      const { status, out } = runGuard(root);
      assert.equal(status, 1, 'the pre-GT-651 layout must fail');
      assert.match(out, /no action metadata file at the repository root/);
      assert.match(out, /\.github\/actions\/evolith-validate\/action\.yml/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('the repository as it stands passes', () => {
    const { status, out } = runGuard(REPO_ROOT);
    assert.equal(status, 0, out);
    assert.match(out, /every prerequisite this repository controls is satisfied/);
  });

  test('and it does NOT claim the listing exists', () => {
    // A guard that said "published" would be lying: publishing is a human step
    // in GitHub's UI. The distinction has to survive in the output a reader sees.
    const { out } = runGuard(REPO_ROOT);
    assert.match(out, /human publish step/);
    assert.doesNotMatch(out, /listed on Marketplace|is published/i);
  });

  // --- anti-vacuous pass ----------------------------------------------------

  test('a tree with no action at all is RED, not vacuously green', () => {
    const root = scratch(() => {});
    try {
      const { status, out } = runGuard(root);
      assert.equal(status, 1);
      assert.match(out, /Scanning zero items is not a pass|zero/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // --- field rules ----------------------------------------------------------

  test('a valid root manifest yields no errors', () => {
    assert.deepEqual(errorsOf(VALID), []);
  });

  test('each required field is required', () => {
    for (const field of ['name', 'description', 'runs']) {
      const errors = errorsOf({ ...VALID, [field]: undefined });
      assert.equal(errors.length, 1, `missing \`${field}\` produced ${errors.length} errors`);
      assert.match(errors[0].message, new RegExp(`\`${field}\``));
    }
  });

  test('branding is required, and both of its fields are', () => {
    assert.match(errorsOf({ ...VALID, branding: undefined })[0].message, /no `branding` block/);
    assert.match(errorsOf({ ...VALID, branding: { icon: 'shield' } })[0].message, /`branding\.color` is missing/);
    assert.match(errorsOf({ ...VALID, branding: { color: 'blue' } })[0].message, /`branding\.icon` is missing/);
  });

  test('a color GitHub does not accept is an error, not a warning', () => {
    // `#0366d6` is a perfectly good color and reads correct in review. GitHub
    // rejects it, at publish time, which is the worst moment to find out.
    const errors = errorsOf({ ...VALID, branding: { icon: 'shield', color: '#0366d6' } });
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /not one of GitHub's eight accepted values/);
    assert.equal(BRANDING_COLORS.has('#0366d6'), false);
    assert.equal(BRANDING_COLORS.size, 8);
  });

  test('an unknown icon is a NOTE, because a false red here is worse than the hole', () => {
    const findings = checkManifest(
      { ...VALID, branding: { icon: 'not-a-feather-icon', color: 'blue' } },
      { path: 'action.yml' },
    );
    assert.equal(findings.filter((f) => f.level === 'error').length, 0);
    assert.equal(findings.filter((f) => f.level === 'note').length, 1);
    assert.equal(KNOWN_ICONS.has('shield'), true);
  });

  test('a reserved name is rejected here rather than at publish time', () => {
    for (const reserved of ['GitHub', 'marketplace', 'Actions']) {
      const errors = errorsOf({ ...VALID, name: reserved });
      assert.equal(errors.length, 1, `\`${reserved}\` was accepted`);
      assert.match(errors[0].message, /reserved GitHub term/);
    }
    assert.equal(RESERVED_NAMES.has('github'), true);
  });

  test('a manifest that does not parse into a mapping is RED', () => {
    assert.match(errorsOf(null)[0].message, /did not parse into a mapping/);
    assert.match(errorsOf('just a string')[0].message, /did not parse into a mapping/);
  });

  // --- identity collision ---------------------------------------------------

  test('a subfolder action is allowed — until it claims the root one\'s name', () => {
    assert.deepEqual(errorsOf(VALID, { others: [{ path: '.github/actions/other/action.yml', name: 'Something Else' }] }), []);

    const clash = errorsOf(VALID, {
      others: [{ path: '.github/actions/copy/action.yml', name: 'evolith governance validation' }],
    });
    assert.equal(clash.length, 1);
    assert.match(clash[0].message, /same `name` as the root manifest/);
  });

  // --- discovery ------------------------------------------------------------

  test('discovery finds the root manifest first and skips node_modules', () => {
    const root = scratch((r) => {
      writeFileSync(path.join(r, 'action.yml'), 'name: Root\n');
      mkdirSync(path.join(r, '.github/actions/inner'), { recursive: true });
      writeFileSync(path.join(r, '.github/actions/inner/action.yaml'), 'name: Inner\n');
      mkdirSync(path.join(r, 'node_modules/some-dep'), { recursive: true });
      writeFileSync(path.join(r, 'node_modules/some-dep/action.yml'), 'name: Dependency\n');
    });
    try {
      const found = findActionManifests(root);
      assert.deepEqual(found, ['action.yml', '.github/actions/inner/action.yaml']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('the root manifest actually carries the branding the repo claims', () => {
    // Reads the file rather than trusting the guard's own output: the guard and
    // this assertion must be able to disagree.
    const src = readFileSync(path.join(REPO_ROOT, 'action.yml'), 'utf8');
    assert.match(src, /^branding:$/m);
    assert.match(src, /^ {2}icon: shield$/m);
    assert.match(src, /^ {2}color: blue$/m);
  });
});
