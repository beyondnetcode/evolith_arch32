#!/usr/bin/env node

/**
 * GT-630 — negative fixtures for the derived-artifact order guard.
 *
 * The defect this guard exists for is subtle and cost three red required checks
 * in one day: every artifact passes its own `--check`, and the composite is still
 * wrong, because a downstream artifact was generated before its input settled.
 *
 * So the case that matters here is the one where **each link is individually
 * current and the chain is still not at a fixed point**. If that test ever goes
 * green for the wrong reason, the guard is decoration.
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '46-validate-derived-artifact-order.mjs');

// The guard only runs main() when invoked directly, so importing CHAIN is safe.
const { CHAIN, writeArgsFor } = await import('./46-validate-derived-artifact-order.mjs');

/**
 * Where a link sits, DERIVED rather than typed.
 *
 * These positions were hardcoded ("link 2 of 3"), so every link added to the
 * chain broke assertions that were not about the new link at all — which reads
 * as the change being wrong rather than the test being brittle.
 */
const linkPosition = (producerSuffix) => {
  const i = CHAIN.findIndex((l) => l.producer.endsWith(producerSuffix));
  assert.notEqual(i, -1, `no chain link produces ${producerSuffix} — the fixture is describing a chain that moved`);
  return { position: i + 1, total: CHAIN.length };
};

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt630-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

const run = (root, extra = []) => {
  const r = spawnSync(process.execPath, [GUARD, '--root', root, ...extra], {
    encoding: 'utf8', timeout: 120000,
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

test('the real repository is current and at a fixed point', () => {
  const { status, out } = run(resolve(__dirname, '../../..'));
  assert.equal(status, 0, out);
  assert.match(out, /at a fixed point/);
  // 6 -> 8 with GT-650: the universal-phase-artifacts projection and the served gate corpus,
  // both appended so no other link's
  // reported position moved. Pinned rather than loosened to `\d+` — the count is the point:
  // a link silently dropped from the chain is an artifact nobody verifies any more.
  assert.match(out, /links declared \.+ 8/);
});

test('the guard leaves the real tree byte-identical', () => {
  // The fixed-point pass regenerates in place. If it did not restore exactly, it
  // would "fix" the very drift it is meant to report — and every later run would
  // pass for the wrong reason.
  const repo = resolve(__dirname, '../../..');
  const artifacts = [
    'reference/core/control-center/maturity-reports/maturity-reconciliation.json',
    'reference/core/control-center/maturity-reports/executive-summary.md',
    'reference/core/control-center/maturity-reports/executive-summary.es.md',
    // GT-598's pair. The snapshot is the sharper case: its producer stamps a
    // `capturedOn` date, and it is deliberately STICKY when the classification
    // is unchanged. Were it not, a replay would rewrite the date, this assertion
    // would fail, and the fixed-point pass would report drift every day.
    'src/rulesets/standards/native-evaluability-snapshot.json',
    'src/rulesets/standards/iso-5055-mapping.json',
    'src/rulesets/standards/iso-5055-mapping.csv',
  ];
  const before = artifacts.map((a) => readFileSync(join(repo, a)));
  run(repo);
  artifacts.forEach((a, i) => {
    assert.ok(readFileSync(join(repo, a)).equals(before[i]), `${a} was left modified`);
  });
});


/**
 * Every REAL chain link that is not the behaviour under test needs a trivial
 * producer/artifact pair in each mini-repo, or the shape check trips before the
 * test gets to run. These fixtures are about ORDER — not about ABAC, the
 * evaluability snapshot, or the 5055 mapping.
 *
 * Keep this in step with CHAIN. A link added to the guard without a stub here
 * fails every fixture below with "declared producer does not exist", which
 * points at the fixture rather than at the change that caused it.
 */
const stubProducer = (artifacts) =>
  "import fs from 'node:fs';\n" +
  `const files = ${JSON.stringify(artifacts)}.map(f => process.cwd() + '/' + f);\n` +
  "if (process.argv.includes('--check')) " +
  "process.exit(files.every(f => fs.readFileSync(f, 'utf8') === 'stable\\n') ? 0 : 1);\n" +
  "for (const f of files) fs.writeFileSync(f, 'stable\\n');\n";

const PRELUDE_STUBS = {
  // link 7 — universal phase artifacts (GT-650 / ADR-0125), derived from the artifact registry
  '.harness/scripts/generate-universal-phase-artifacts.mjs': stubProducer([
    'src/packages/core-domain/src/application/services/universal-phase-artifacts.generated.ts',
  ]),
  'src/rulesets/sdlc/artifact-registry.json': '// stub\n',
  'src/packages/core-domain/src/application/services/universal-phase-artifacts.generated.ts': 'stable\n',

  // link 8 — served phase-gate corpus (GT-650), generated from the registry and the gates
  '.harness/scripts/generate-phase-gates-rules.mjs': stubProducer([
    'src/rulesets/sdlc/phase-gates.rules.json',
  ]),
  'reference/governance/sdlc/gates/gate-f1.json': '// stub\n',
  'src/rulesets/sdlc/phase-gates.rules.json': 'stable\n',

  // link 1 — ABAC rego (GT-602)
  '.harness/scripts/generate-abac-tool-sets.mjs': stubProducer(['src/rulesets/opa/abac-mcp-tool-access.rego']),
  'src/packages/mcp-server/src/mcp/abac-evaluator.ts': '// stub\n',
  'src/rulesets/opa/abac-mcp-tool-access.rego': 'stable\n',

  // link 2 — capability operation schemas (GT-583)
  '.harness/scripts/generate-capability-operations.mjs': stubProducer([
    'src/packages/core-domain/src/capabilities/capability-operations.generated.ts',
    'src/sdk/cli/src/commands/api/api.catalog.tool-schemas.generated.ts',
  ]),
  'src/packages/mcp-server/src/mcp/tool-registry.service.ts': '// stub\n',
  'src/packages/mcp-server/src/tools/tools.module.ts': '// stub\n',
  'src/packages/core-domain/src/capabilities/capability-operations.generated.ts': 'stable\n',
  'src/sdk/cli/src/commands/api/api.catalog.tool-schemas.generated.ts': 'stable\n',

  // link 3 — native evaluability snapshot (GT-598)
  'src/rulesets/standards/capture-native-evaluability-snapshot.mjs':
    stubProducer(['src/rulesets/standards/native-evaluability-snapshot.json']),
  'src/packages/core-domain/test/rule-corpus-triage.ts': '// stub\n',
  'src/packages/core-domain/src/application/validators/rule-evaluability.ts': '// stub\n',
  'src/packages/core-domain/src/application/validators/evaluators/native-evaluator.ts': '// stub\n',
  'src/rulesets/standards/native-evaluability-snapshot.json': 'stable\n',

  // link 3 — ISO/IEC 5055 mapping (GT-598), which consumes link 2's artifact
  'src/rulesets/standards/build-iso-5055-mapping.mjs':
    stubProducer(['src/rulesets/standards/iso-5055-mapping.json', 'src/rulesets/standards/iso-5055-mapping.csv']),
  'src/rulesets/standards/iso-5055-mapping.json': 'stable\n',
  'src/rulesets/standards/iso-5055-mapping.csv': 'stable\n',
};

// --- the shape of the declaration itself ------------------------------------

describe('chain declaration (anti-vacuous)', () => {
  const fixture = (name, files) => {
    const root = join(sandbox, name);
    for (const [rel, body] of Object.entries({ ...PRELUDE_STUBS, ...files })) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
      if (rel.endsWith('.mjs')) chmodSync(join(root, rel), 0o755);
    }
    return root;
  };

  it('refuses a root whose declared producer does not exist', () => {
    // Deliberately WITHOUT the stub, so a producer really is absent.
    const root = join(sandbox, 'no-producer');
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'placeholder.txt'), 'x');
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /declared producer does not exist/);
    // The message must point at the declaration, not invite deleting the link.
    assert.match(out, /fix the declaration rather than deleting the link/);
  });

  it('refuses a root where a declared artifact is missing', () => {
    // Producers present, artifact absent: the chain describes something that is
    // not there, and a "pass" would mean nothing was compared.
    const root = fixture('no-artifact', {
      '.harness/scripts/ci/09-reconcile-maturity.mjs': 'process.exit(0)\n',
      '.harness/scripts/generate-executive-summary.mjs': 'process.exit(0)\n',
      'reference/core/control-center/gaps/gap-tracking.md': '# board\n',
      'reference/core/control-center/maturity-reports/maturity-assessment.md': '# a\n',
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /declared artifact is missing/);
  });
});

// --- the two failures the guard exists to tell apart -------------------------

describe('stale versus out-of-order', () => {
  /**
   * A miniature repository with the same SHAPE as the real chain: a reconciler
   * that copies a counter out of the board, and a summary that copies it out of
   * the reconciliation. `--check` on each compares its own output to what it
   * would write now.
   */
  const miniRepo = (name, { boardCount, reconCount, summaryCount }) => {
    const root = join(sandbox, name);
    const w = (rel, body) => {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    };
    for (const [rel, body] of Object.entries(PRELUDE_STUBS)) w(rel, body);
    w('reference/core/control-center/gaps/gap-tracking.md', `count: ${boardCount}\n`);
    w('reference/core/control-center/maturity-reports/maturity-assessment.md', '# assessment\n');
    w('reference/core/control-center/maturity-reports/maturity-reconciliation.json', `{"count":${reconCount}}\n`);
    w('reference/core/control-center/maturity-reports/executive-summary.md', `summary count: ${summaryCount}\n`);
    w('reference/core/control-center/maturity-reports/executive-summary.es.md', `resumen count: ${summaryCount}\n`);

    w('.harness/scripts/ci/09-reconcile-maturity.mjs', `
import fs from 'node:fs';
const root = process.cwd();
const board = fs.readFileSync(root + '/reference/core/control-center/gaps/gap-tracking.md', 'utf8');
const n = Number(board.match(/count: (\\d+)/)[1]);
const out = root + '/reference/core/control-center/maturity-reports/maturity-reconciliation.json';
const next = JSON.stringify({ count: n }) + '\\n';
if (process.argv.includes('--check')) {
  process.exit(fs.readFileSync(out, 'utf8') === next ? 0 : 1);
}
fs.writeFileSync(out, next);
`);
    w('.harness/scripts/generate-executive-summary.mjs', `
import fs from 'node:fs';
const root = process.cwd();
const dir = root + '/reference/core/control-center/maturity-reports/';
const n = JSON.parse(fs.readFileSync(dir + 'maturity-reconciliation.json', 'utf8')).count;
const en = 'summary count: ' + n + '\\n', es = 'resumen count: ' + n + '\\n';
if (process.argv.includes('--check')) {
  const ok = fs.readFileSync(dir + 'executive-summary.md', 'utf8') === en
          && fs.readFileSync(dir + 'executive-summary.es.md', 'utf8') === es;
  process.exit(ok ? 0 : 1);
}
fs.writeFileSync(dir + 'executive-summary.md', en);
fs.writeFileSync(dir + 'executive-summary.es.md', es);
`);
    return root;
  };

  it('passes when the chain really was run in order', () => {
    const root = miniRepo('in-order', { boardCount: 7, reconCount: 7, summaryCount: 7 });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /at a fixed point/);
  });

  it('names the FIRST stale link, and the inputs it must wait for', () => {
    // The board moved and nothing was regenerated: ordinary staleness. The guard
    // must stop at the reconciliation, not blame the summary downstream of it.
    const root = miniRepo('stale-upstream', { boardCount: 9, reconCount: 7, summaryCount: 7 });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    const { position, total } = linkPosition('09-reconcile-maturity.mjs');
    assert.match(out, new RegExp(`maturity reconciliation is STALE \\(link ${position} of ${total}\\)`));
    assert.match(out, /Stopping at the FIRST stale link on purpose/);
    assert.doesNotMatch(out, /executive governance summary is STALE/);
  });

  it('THE defect: every link is individually current, and the chain is still wrong', () => {
    // The exact mistake this guard was written for, reproduced. The summary was
    // generated FIRST, against the old reconciliation, and only then was the
    // reconciliation refreshed. Both `--check` calls now pass — the summary
    // matches what it would write from the value it read — and the composite is
    // still not what running the chain in order produces.
    const root = miniRepo('out-of-order', { boardCount: 9, reconCount: 9, summaryCount: 7 });

    // Prove the premise rather than assume it: currency alone says nothing.
    const currency = run(root, ['--no-fixed-point']);
    assert.equal(currency.status, 1, 'the mini-repo must have a genuinely stale summary for this fixture');

    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /executive governance summary/);
  });

  it('the fixed point catches a NON-DETERMINISTIC generator, which currency cannot', () => {
    // Worth stating plainly, because it bounds what this guard is worth: with
    // deterministic generators, currency-in-order already subsumes the fixed
    // point — if every link matches what it would write now, replaying changes
    // nothing. The fixed point earns its place on the OTHER failure: a generator
    // whose output does not depend only on its declared inputs. Then `--check`
    // passes against whatever was last written, and only a replay disagrees.
    const root = miniRepo('nondeterministic', { boardCount: 7, reconCount: 7, summaryCount: 7 });
    writeFileSync(join(root, '.harness/scripts/generate-executive-summary.mjs'), `
import fs from 'node:fs';
const root = process.cwd();
const dir = root + '/reference/core/control-center/maturity-reports/';
const n = JSON.parse(fs.readFileSync(dir + 'maturity-reconciliation.json', 'utf8')).count;
// The defect: an undeclared input. A run counter nobody listed in \`consumes\`.
const counterFile = root + '/.harness/runs.txt';
let runs = 0;
try { runs = Number(fs.readFileSync(counterFile, 'utf8')); } catch {}
// Increment BEFORE stamping, so a --check straight after a write agrees with
// itself: the artifact and the counter must describe the same run.
if (!process.argv.includes('--check')) { runs += 1; fs.writeFileSync(counterFile, String(runs)); }
const en = 'summary count: ' + n + ' run ' + runs + '\\n';
const es = 'resumen count: ' + n + ' run ' + runs + '\\n';
if (process.argv.includes('--check')) {
  const ok = fs.readFileSync(dir + 'executive-summary.md', 'utf8') === en
          && fs.readFileSync(dir + 'executive-summary.es.md', 'utf8') === es;
  process.exit(ok ? 0 : 1);
}
fs.writeFileSync(dir + 'executive-summary.md', en);
fs.writeFileSync(dir + 'executive-summary.es.md', es);
`);
    // Bring it to a state where BOTH links are individually current.
    spawnSync(process.execPath, [join(root, '.harness/scripts/generate-executive-summary.mjs')], { cwd: root });
    const currency = run(root, ['--no-fixed-point']);
    assert.equal(currency.status, 0, `premise: both links must be current\n${currency.out}`);

    // The replay moves the undeclared counter, so the artifact differs.
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /differ after replaying the chain IN ORDER/);
    assert.match(out, /Fix by regenerating in the declared order/);
    // The remediation must list the chain in order, with the reconciler at its
    // real position — derived, so adding a link ahead of it does not break this.
    const { position } = linkPosition('09-reconcile-maturity.mjs');
    assert.match(out, new RegExp(`${position}\\. node \\.harness/scripts/ci/09-reconcile-maturity\\.mjs`));
  });
});


/**
 * GT-703 — the repair mode.
 *
 * The end-to-end behaviour is exercised against the real tree by the test above and
 * was measured on the two-stale-link shape that motivated the gap. What is worth
 * pinning HERE is the derivation, because it is the part that can rot silently: the
 * write invocation is the check invocation minus the flag that makes it a check, so
 * a link that gains a `--root` keeps it instead of quietly losing it.
 */
describe('write-mode arguments (GT-703)', () => {
  it('drops --check and nothing else', () => {
    assert.deepEqual(writeArgsFor({ checkArgs: ['--check'] }), []);
    assert.deepEqual(writeArgsFor({ checkArgs: ['--root', '/tmp/x', '--check'] }), ['--root', '/tmp/x']);
  });

  it('honours an explicit writeArgs when a generator stops being symmetric', () => {
    assert.deepEqual(writeArgsFor({ checkArgs: ['--check'], writeArgs: ['--write'] }), ['--write']);
  });

  it('every declared link yields a write invocation that is not itself a check', () => {
    for (const link of CHAIN) {
      const args = writeArgsFor(link);
      assert.ok(!args.includes('--check'), `${link.name} would still run in check mode`);
    }
  });
});

test('--fix repairs a chain with TWO stale links in one invocation', () => {
  // The GT-702 shape: reconciliation stale, and the summary that derives from it
  // stale behind it. One pass must clear both and reach the fixed point.
  const artifacts = CHAIN.flatMap((l) => l.writes);
  const before = new Map(artifacts.map((a) => [a, readFileSync(resolve(__dirname, '../../..', a))]));

  const idx = CHAIN.findIndex((l) => l.writes.some((w) => w.includes('maturity-reconciliation')));
  assert.ok(idx > 0, 'expected the maturity reconciliation to be a declared link');

  // Make that link and everything after it stale by truncating its artifact.
  const target = resolve(__dirname, '../../..', CHAIN[idx].writes[0]);
  const saved = readFileSync(target);
  writeFileSync(target, '{}\n');
  try {
    const fixed = spawnSync(process.execPath, [GUARD, '--fix'], { encoding: 'utf8' });
    assert.equal(fixed.status, 0, `--fix failed:\n${fixed.stdout}\n${fixed.stderr}`);
    assert.match(fixed.stdout, /regenerated/, 'expected --fix to report what it regenerated');
    const after = spawnSync(process.execPath, [GUARD], { encoding: 'utf8' });
    assert.equal(after.status, 0, 'chain still not current after --fix');
  } finally {
    // Restore byte-for-byte whatever the repair rewrote — a test that leaves the
    // tree changed is indistinguishable from the drift this guard reports on.
    for (const [rel, buf] of before) writeFileSync(resolve(__dirname, '../../..', rel), buf);
    writeFileSync(target, saved);
  }
});
