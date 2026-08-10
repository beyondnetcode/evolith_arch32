/**
 * GT-666 — self-test for the standards-rule-class guard.
 *
 * The case that matters is the one this repository actually shipped: a mapping
 * that is complete, current, internally consistent, passes its own `--check` and
 * every other guard — and describes 16 conformance controls of three published
 * standards as Evolith governance invariants «with no international structural
 * equivalent». Nothing looked wrong. That is why the negative fixtures below are
 * built from the REAL pre-fix artifact rather than from a sketch of it.
 *
 * Per `lib/coverage.mjs`: every assertion here was run against the PRE-GT-666
 * generator and watched fail. The two that pass either way are labelled
 * REGRESSION rather than counted as proof of the fix.
 *
 * Run it with:  node --test .harness/scripts/ci/65-validate-standards-rule-class.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FALSE_CLAIMS,
  MAPPING_FILE,
  STANDARD_CLASS,
  checkClassification,
  findPacks,
  ruleIdsOf,
} from './65-validate-standards-rule-class.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(HERE, '65-validate-standards-rule-class.mjs');
const REPO_ROOT = path.resolve(HERE, '../../..');

/** The last commit that carried the defect. `develop` is where this branch left. */
const PRE_FIX_REF = process.env.GT666_PRE_FIX_REF ?? 'origin/develop';

/** The reason text the defect published, verbatim from the pre-fix artifact. */
const GOVERNANCE_NOTE =
  'A governance invariant over Evolith artifacts (inheritance, open-core boundary, satellites, evidence). ' +
  'No international structural equivalent.';

const SSDF_PACK = {
  file: 'src/rulesets/standards/ssdf-v1.1.rules.json',
  standard: { name: 'NIST SP 800-218', edition: 'v1.1' },
  ruleIds: ['SSDF-PW.4.1'],
  inStandardsDir: true,
};

const goodRow = (over = {}) => ({
  ruleId: 'SSDF-PW.4.1',
  sourceFile: 'standards/ssdf-v1.1.rules.json',
  ruleClass: STANDARD_CLASS,
  note: 'A conformance control of NIST SP 800-218 v1.1, a published standard, and NOT an Evolith invariant.',
  ...over,
});

const mappingOf = (...rows) => ({
  rules: rows,
  summary: { byClass: { [STANDARD_CLASS]: { rules: rows.filter((r) => r.ruleClass === STANDARD_CLASS).length } } },
});

const errorsOf = (input) => checkClassification({ undeclaredInDir: [], ...input }).map((f) => f.message);

function runGuard(root) {
  const res = spawnSync(process.execPath, [GUARD, '--root', root], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return { status: res.status, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

function scratch(build) {
  const root = mkdtempSync(path.join(tmpdir(), 'gt666-'));
  build(root);
  return root;
}

/** A repo-shaped tree with one declaring pack and a mapping the caller shapes. */
function treeWith(mapping, { declareStandard = true } = {}) {
  return scratch((root) => {
    const dir = path.join(root, 'src/rulesets/standards');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'ssdf-v1.1.rules.json'),
      JSON.stringify(
        {
          ...(declareStandard ? { standard: { name: 'NIST SP 800-218', edition: 'v1.1' } } : {}),
          rules: [{ id: 'SSDF-PW.4.1', title: 'Verify third-party software', severity: 'MUST' }],
        },
        null,
        2,
      ),
    );
    writeFileSync(path.join(dir, 'iso-5055-mapping.json'), JSON.stringify(mapping, null, 2));
  });
}

describe('65-validate-standards-rule-class', () => {
  // --- THE DEFECT -----------------------------------------------------------

  test('THE GAP: a standards rule classified `governance` is RED', () => {
    const errors = errorsOf({
      packs: [SSDF_PACK],
      mapping: mappingOf(goodRow({ ruleClass: 'governance', note: GOVERNANCE_NOTE })),
    });
    assert.ok(
      errors.some((m) => /is classified `governance`, not `international-standard`/.test(m)),
      `expected a class finding, got:\n${errors.join('\n')}`,
    );
    // And it says WHY `governance` in particular is the tell, not just that it differs.
    assert.ok(errors.some((m) => /CLASS_BY_FILE fallback/.test(m)));
  });

  test('THE GAP, second half: the note denying it is an international standard is RED', () => {
    const errors = errorsOf({
      packs: [SSDF_PACK],
      // The class is CORRECT here and only the note is the pre-fix one, so this
      // isolates the note rule from the class rule rather than letting one
      // finding stand in for both.
      mapping: mappingOf(goodRow({ note: GOVERNANCE_NOTE })),
    });
    assert.ok(errors.some((m) => /no international structural equivalent/.test(m)));
    assert.ok(errors.some((m) => /a governance invariant over Evolith artifacts/.test(m)));
  });

  test('the whole pre-fix shape, end to end through the process, is RED', () => {
    const root = treeWith(mappingOf(goodRow({ ruleClass: 'governance', note: GOVERNANCE_NOTE })));
    try {
      const { status, out } = runGuard(root);
      assert.equal(status, 1, out);
      assert.match(out, /misdescribes the standards corpus/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // --- THE WAY BACK IN: a fourth pack that declares nothing -----------------

  test('a NEW pack dropped into standards/ without a `standard` block is RED', () => {
    // This is the failure mode a hard-coded list of three filenames would have
    // left wide open, and the reason classification derives from the declaration.
    const errors = errorsOf({
      packs: [SSDF_PACK],
      undeclaredInDir: [
        { file: 'src/rulesets/standards/cra-annex-i.rules.json', standard: null, ruleIds: ['CRA-01', 'CRA-02'], inStandardsDir: true },
      ],
      mapping: mappingOf(goodRow()),
    });
    assert.equal(errors.length, 1, errors.join('\n'));
    assert.match(errors[0], /declares no top-level/);
    assert.match(errors[0], /falls through to the `governance` default/);
  });

  test('and the GENERATOR refuses to build it, so the failure precedes the commit', () => {
    // Belt and braces on purpose: the generator's refusal protects whoever runs
    // it, this guard protects a tree where a stale mapping was committed anyway.
    const root = treeWith(mappingOf(goodRow()), { declareStandard: false });
    try {
      const { status, out } = runGuard(root);
      assert.equal(status, 1, out);
      assert.match(out, /declares no top-level/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // --- The note has to be true, not merely inoffensive ----------------------

  test('a note that names no standard at all is RED even with the right class', () => {
    const errors = errorsOf({
      packs: [SSDF_PACK],
      mapping: mappingOf(goodRow({ note: 'A rule of an international standard pack.' })),
    });
    assert.equal(errors.length, 1, errors.join('\n'));
    assert.match(errors[0], /never names NIST SP 800-218/);
    assert.match(errors[0], /no longer false/);
  });

  test('a note naming the WRONG standard is RED — one pack cannot answer for another', () => {
    const errors = errorsOf({
      packs: [SSDF_PACK],
      mapping: mappingOf(goodRow({ note: 'A conformance control of ISO/IEC 5055:2021.' })),
    });
    assert.ok(errors.some((m) => /never names NIST SP 800-218/.test(m)), errors.join('\n'));
  });

  // --- Rows that are simply missing -----------------------------------------

  test('a pack rule with no mapping row at all is RED', () => {
    const errors = errorsOf({ packs: [SSDF_PACK], mapping: mappingOf() });
    assert.equal(errors.length, 1, errors.join('\n'));
    assert.match(errors[0], /has NO row/);
    assert.match(errors[0], /build-iso-5055-mapping\.mjs/);
  });

  test('a summary that disagrees with its own rows is RED', () => {
    const mapping = mappingOf(goodRow());
    mapping.summary.byClass[STANDARD_CLASS].rules = 9;
    assert.ok(errorsOf({ packs: [SSDF_PACK], mapping }).some((m) => /says 9 but 1 row/.test(m)));
  });

  test('a `standard` block naming nothing is RED', () => {
    const errors = errorsOf({
      packs: [{ ...SSDF_PACK, standard: { edition: 'v1.1' } }],
      mapping: mappingOf(goodRow()),
    });
    assert.equal(errors.length, 1, errors.join('\n'));
    assert.match(errors[0], /names no standard/);
  });

  // --- Anti-vacuous pass ----------------------------------------------------

  test('a tree with no standards pack is RED, not vacuously green', () => {
    const root = scratch(() => {});
    try {
      const { status, out } = runGuard(root);
      assert.equal(status, 1);
      assert.match(out, /ZERO standards ruleset packs/);
      assert.match(out, /Scanning zero items is not a pass/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('a tree with packs but no mapping is RED', () => {
    const root = scratch((r) => {
      const dir = path.join(r, 'src/rulesets/standards');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, 'ssdf-v1.1.rules.json'),
        JSON.stringify({ standard: { name: 'NIST SP 800-218' }, rules: [{ id: 'SSDF-PW.4.1', title: 'x' }] }),
      );
    });
    try {
      const { status, out } = runGuard(root);
      assert.equal(status, 1);
      assert.match(out, /could not be read/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // --- The repository as it stands ------------------------------------------

  test('the repository passes, over a denominator it states out loud', () => {
    const { status, out } = runGuard(REPO_ROOT);
    assert.equal(status, 0, out);
    assert.match(out, /declaring packs \.+ 3/);
    assert.match(out, /their rules \.+ 16/);
    assert.match(out, /all 16 rule\(s\) across 3 declaring pack\(s\)/);
  });

  test('all three shipped packs are found, whichever shape they name themselves in', () => {
    // `{ id }` for ISO/IEC 5055 and `{ name, edition }` for SSDF and SLSA. A
    // reader of one shape only would silently drop two of the three packs and
    // still report a pass over the third.
    const { packs } = findPacks(REPO_ROOT);
    const standards = packs.map((p) => p.standard?.id ?? p.standard?.name).sort();
    assert.deepEqual(standards, ['ISO/IEC 5055:2021', 'NIST SP 800-218', 'SLSA']);
    assert.equal(packs.reduce((n, p) => n + p.ruleIds.length, 0), 16);
  });

  test("the real mapping's notes each name their own pack's standard", () => {
    const { packs } = findPacks(REPO_ROOT);
    const mapping = JSON.parse(readFileSync(path.join(REPO_ROOT, MAPPING_FILE), 'utf8'));
    assert.deepEqual(checkClassification({ packs, undeclaredInDir: [], mapping }), []);
  });

  test('the REAL pre-fix artifact, against the REAL packs, is RED — 16 rules, 4 findings each', () => {
    // The strongest available fixture: the mapping exactly as it was committed
    // before this fix, read out of git rather than reconstructed, checked against
    // today's packs. Reconstructed fixtures agree with whatever the author
    // believed was wrong; this one cannot.
    const before = spawnSync('git', ['show', `${PRE_FIX_REF}:${MAPPING_FILE}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (before.status !== 0) {
      // A shallow clone or a detached history cannot answer this. Skipping is
      // honest; passing silently would not be.
      return void assert.ok(true, `SKIPPED: git show ${PRE_FIX_REF}:${MAPPING_FILE} is unavailable here`);
    }
    const { packs } = findPacks(REPO_ROOT);
    const findings = checkClassification({ packs, undeclaredInDir: [], mapping: JSON.parse(before.stdout) });
    assert.equal(findings.length, 64, 'each of the 16 rules should fail the class rule, the naming rule and both false-claim rules');
    assert.equal(findings.filter((f) => /is classified `governance`/.test(f.message)).length, 16);
  });

  // --- REGRESSION (passes before and after the fix; kept, not counted as proof)

  test('REGRESSION: a valid row yields no findings', () => {
    assert.deepEqual(errorsOf({ packs: [SSDF_PACK], mapping: mappingOf(goodRow()) }), []);
  });

  test('REGRESSION: the rule extractor reads the three corpus shapes', () => {
    assert.deepEqual(ruleIdsOf({ rules: [{ id: 'A' }, { id: 'B' }, {}] }), ['A', 'B']);
    assert.deepEqual(ruleIdsOf({ principles: [{ id: 'P' }] }), ['P']);
    assert.deepEqual(ruleIdsOf({ id: 'INFRA-001', name: 'single-rule file' }), ['INFRA-001']);
    assert.deepEqual(ruleIdsOf({ gates: [] }), []);
  });

  test('REGRESSION: both published false claims are still patterns, not one', () => {
    assert.equal(FALSE_CLAIMS.length, 2);
    for (const { pattern } of FALSE_CLAIMS) assert.ok(pattern.test(GOVERNANCE_NOTE));
  });
});
