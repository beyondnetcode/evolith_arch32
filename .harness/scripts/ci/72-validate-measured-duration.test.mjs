/**
 * GT-686 — the guard's own falsifiability: it must recognise the literal, must
 * NOT be tripped by prose about the literal, and must reject a zero VALUE from
 * an executed run. Each case was written against the wrong version first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { literalZeroLines, scanTree, stripComments, probeCli, ALLOWED_ZERO_SITES } from './72-validate-measured-duration.mjs';

test('it finds the literal, in either spacing, and reports the line', () => {
  const src = "const meta = {\n  command: 'x',\n  durationMs: 0,\n};\nconst other = { durationMs:0 };\n";
  assert.deepEqual(literalZeroLines(src), [3, 5]);
});

test('it is not tripped by a comment that describes the defect', () => {
  const src = "// shipped `durationMs: 0` as a literal\n/* durationMs: 0 was the bug */\nconst x = { durationMs: clock.elapsedMs() };\n";
  assert.deepEqual(literalZeroLines(src), []);
  assert.equal(stripComments(src).includes('durationMs: 0'), false);
});

test('it does not mistake a measurement, a different key, or a non-zero literal for the defect', () => {
  const src = [
    'const a = { durationMs: Date.now() - startedAt };',
    'const b = { maxDurationMs: 0 };',
    'const c = { durationMs: 0.5 };',
    'const d = { durationMs: 01 };',
    "const e = 'durationMs: 0';",
  ].join('\n');
  // The string literal on the last line is text, not an envelope — but the guard is
  // deliberately conservative and reports it; a string that spells the defect is
  // reviewed, not ignored. Everything else must stay clean.
  assert.deepEqual(literalZeroLines(src), [5]);
});

test('it scans a tree, skips specs and dist, and names the offending file', () => {
  const root = mkdtempSync(join(tmpdir(), 'gt686-'));
  try {
    mkdirSync(join(root, 'src', 'a', 'dist'), { recursive: true });
    writeFileSync(join(root, 'src', 'a', 'ok.ts'), 'export const m = { durationMs: clock.elapsedMs() };\n');
    writeFileSync(join(root, 'src', 'a', 'bad.ts'), 'export const m = { durationMs: 0 };\n');
    writeFileSync(join(root, 'src', 'a', 'bad.spec.ts'), 'export const m = { durationMs: 0 };\n');
    writeFileSync(join(root, 'src', 'a', 'dist', 'built.ts'), 'export const m = { durationMs: 0 };\n');
    const { scanned, findings } = scanTree(root);
    assert.equal(scanned, 2);
    assert.deepEqual(findings, [{ file: 'src/a/bad.ts', lines: [1] }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the allow-list is empty: every site found could measure, and did', () => {
  assert.deepEqual([...ALLOWED_ZERO_SITES], []);
});

test('the executed half rejects a zero VALUE from a run, not merely a missing key', () => {
  const root = mkdtempSync(join(tmpdir(), 'gt686-cli-'));
  try {
    // A fake CLI that does real work (spins a little) and then reports 0 anyway.
    const entry = join(root, 'fake-cli.js');
    writeFileSync(
      entry,
      "const t = Date.now(); while (Date.now() - t < 5) {}\n" +
        "process.stdout.write(JSON.stringify({ success: true, data: [], meta: { command: 'evolith rulesets', durationMs: 0 } }));\n",
    );
    const zero = probeCli(root, entry);
    assert.equal(zero.ok, false);
    assert.match(zero.detail, /wall clock moved/);

    const honest = join(root, 'honest-cli.js');
    writeFileSync(
      honest,
      "const t = Date.now(); while (Date.now() - t < 5) {}\n" +
        "process.stdout.write(JSON.stringify({ success: true, data: [], meta: { command: 'evolith rulesets', durationMs: Date.now() - t } }));\n",
    );
    const measured = probeCli(root, honest);
    assert.equal(measured.ok, true);
    assert.ok(measured.durationMs >= 5);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
