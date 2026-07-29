#!/usr/bin/env node
/**
 * @file iso-5055-mapping.test.mjs
 * @description GT-598 — executable guard for the ISO/IEC 5055 mapping.
 *
 * Run with: node --test src/rulesets/standards/
 *
 * These assertions are the reason the mapping is worth anything. A mapping table
 * that silently stops covering the corpus is worse than no table: it reports a
 * shrinking denominator as progress. Six things are pinned here —
 *
 *   1. the weakness index really is the 138 of ISO/IEC 5055, per measure;
 *   2. every CWE the mapping cites is one of those 138;
 *   3. every rule in the corpus has a row (add a rule, this fails);
 *   4. the evaluability snapshot still agrees with the counts Core pins, read
 *      OUT OF CORE rather than retyped here (see `pinnedByCore`);
 *   5. the snapshot's counts, its per-rule classes and the classes stamped into
 *      the mapping are three views of one capture, and they agree;
 *   6. nothing in this directory quotes the retired 2011 eight-characteristic
 *      ISO/IEC 25010 model.
 *
 * This job runs without node_modules, so nothing here recomputes the triage. The
 * recomputing guard is `rule-corpus-triage.spec.ts` in core-domain, which
 * compares the committed snapshot against a fresh classification of the corpus.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RULESETS = path.resolve(HERE, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));

const weaknesses = read('iso-5055-weaknesses.json');
const mapping = read('iso-5055-mapping.json');
const evaluability = read('native-evaluability-snapshot.json');

// ---------------------------------------------------------------------------

test('the weakness index is the 138 weaknesses of ISO/IEC 5055, split per measure', () => {
  const ids = Object.keys(weaknesses.weaknesses).map(Number);
  assert.equal(ids.length, 138, 'ISO/IEC 5055 publishes 138 weaknesses');
  assert.equal(weaknesses.standard.weaknessCount, 138);

  // Counts published by CISQ for the four measures. The union is 138 because
  // Reliability and Security overlap heavily.
  assert.deepEqual(weaknesses.measureCounts, {
    Security: 74,
    Reliability: 74,
    'Performance Efficiency': 18,
    Maintainability: 31,
  });

  const union = new Set(Object.values(weaknesses.measures).flat());
  assert.equal(union.size, 138, 'the union of the four measures must be exactly the index');

  for (const [id, w] of Object.entries(weaknesses.weaknesses)) {
    assert.ok(w.name && w.name.length > 5, `CWE-${id} has no usable name`);
    assert.ok(w.measures.length > 0, `CWE-${id} belongs to no measure`);
  }
});

test('every CWE cited by the mapping is one of the 138', () => {
  const known = new Set(Object.keys(weaknesses.weaknesses).map(Number));
  for (const r of mapping.rules) {
    for (const c of r.iso5055.cwes) {
      assert.ok(known.has(c), `${r.ruleId} cites CWE-${c}, which is not in ISO/IEC 5055`);
    }
    // A rule is either mapped with at least one weakness, or explicitly not mapped.
    if (r.iso5055.strength === 'none') assert.equal(r.iso5055.cwes.length, 0, `${r.ruleId}`);
    else assert.ok(r.iso5055.cwes.length > 0, `${r.ruleId} claims a mapping with no CWE`);
  }
});

test('every rule in the corpus has a row, and every row states a verdict', () => {
  // Regenerating in --check mode is the coverage assertion: the generator walks
  // the live corpus and refuses to agree with a table that has fallen behind it.
  const out = execFileSync(process.execPath, [path.join(HERE, 'build-iso-5055-mapping.mjs'), '--check'], {
    cwd: path.resolve(RULESETS, '..', '..'),
    encoding: 'utf8',
  });
  assert.match(out, /up to date/);

  const ids = new Set();
  for (const r of mapping.rules) {
    assert.ok(r.ruleId, 'a row with no rule id');
    assert.ok(r.sourceFile.endsWith('.rules.json'), `${r.ruleId} has no source ruleset`);
    assert.ok(['direct', 'partial', 'none'].includes(r.iso5055.strength), `${r.ruleId} strength`);
    assert.ok(['yes', 'partial', 'no'].includes(r.analyser.adoptable), `${r.ruleId} adoptable`);
    // Every unmapped rule must SAY why it has no international equivalent.
    if (r.iso5055.strength === 'none') assert.ok(r.note && r.note.length > 0, `${r.ruleId} is unmapped with no stated reason`);
    ids.add(`${r.ruleId}@${r.sourceFile}`);
  }
  assert.equal(ids.size, mapping.rules.length, 'duplicate rows');
  assert.equal(mapping.summary.rules, mapping.rules.length);
  assert.ok(mapping.rules.length >= 370, 'the corpus scan collapsed — a shrinking denominator is never a pass');
});

test('the handler backlog is scoped to the unimplemented-native class, not to the whole corpus', () => {
  const backlog = mapping.handlerBacklog;
  assert.equal(backlog.realBacklogSize, evaluability.counts['unimplemented-native']);
  assert.equal(
    backlog.remainderToAuthor,
    backlog.realBacklogSize - backlog.adoptableFromAnalyserIncludingPartial,
  );
  assert.ok(backlog.realBacklogSize < 100, 'the "~240 handlers to write" framing is retired; see GT-595');
  assert.equal(backlog.byEvaluabilityClass['unimplemented-native'].adoptableRuleIds.length, backlog.adoptableFromAnalyser);
});

/**
 * Read the class counts Core pins, from Core.
 *
 * This used to be six numbers typed into this file — the same six that are
 * literals inside the snapshot it was checking. It compared the snapshot to
 * itself, so it passed while `documentation-only` sat at 129 and Core had long
 * since moved to 136, and it passed again when twelve rules got handlers and the
 * snapshot went on calling them `unimplemented-native`. A guard whose expected
 * value is a copy of its actual value is not a guard.
 *
 * This job has no node_modules, so the counts cannot be recomputed here — they
 * are read out of the spec that pins them. Parsing a source file is a real
 * coupling and it is stated rather than hidden: if the const is renamed or
 * reshaped, this THROWS. Failing to find the source of truth must never read as
 * agreement with it.
 *
 * The recomputation-based check lives where the dependencies do: the same spec
 * asserts the committed snapshot against a freshly computed triage, and
 * `capture-native-evaluability-snapshot.mjs --check` re-derives it end to end.
 */
function pinnedByCore() {
  const spec = path.resolve(
    RULESETS,
    '..',
    'packages/core-domain/src/application/validators/rule-corpus-triage.spec.ts',
  );
  if (!fs.existsSync(spec)) {
    throw new Error(`Core's pinned counts are unreadable: ${spec} does not exist. The snapshot cannot be verified.`);
  }

  const source = fs.readFileSync(spec, 'utf8');
  const literal = /const\s+PINNED_CLASS_COUNTS\s*:[^=]*=\s*\{([^}]*)\}\s*;/.exec(source);
  if (!literal) {
    throw new Error(
      `Could not find the PINNED_CLASS_COUNTS literal in ${path.basename(spec)}. ` +
        'It was renamed or reshaped — update this parser rather than deleting the check.',
    );
  }

  const counts = {};
  for (const line of literal[1].split('\n')) {
    const entry = /^\s*'?([a-zA-Z-]+)'?\s*:\s*(\d+)\s*,?\s*$/.exec(line);
    if (entry) counts[entry[1]] = Number(entry[2]);
  }
  if (Object.keys(counts).length === 0) {
    throw new Error(`Parsed the PINNED_CLASS_COUNTS block in ${path.basename(spec)} and read zero counts out of it.`);
  }
  return counts;
}

test('the evaluability snapshot still matches the class counts pinned by Core', () => {
  assert.deepEqual(
    evaluability.counts,
    pinnedByCore(),
    'native-evaluability-snapshot.json disagrees with the counts pinned in rule-corpus-triage.spec.ts. ' +
      'Recapture it (node src/rulesets/standards/capture-native-evaluability-snapshot.mjs), THEN rebuild the ' +
      'mapping (node src/rulesets/standards/build-iso-5055-mapping.mjs) — the generator stamps ' +
      'nativeEvaluability per rule from the snapshot, so rebuilding first launders the stale class into the mapping.',
  );
});

test('the snapshot is internally consistent — its header describes its own body', () => {
  // The counts and the per-rule classes are two views of one capture, and the
  // mapping is stamped from the SECOND one. A header that agrees with Core while
  // the body has drifted would put the wrong class on every affected row.
  const summed = Object.values(evaluability.counts).reduce((a, b) => a + b, 0);
  assert.equal(summed, evaluability.corpusSize, 'the class counts do not sum to the corpus the capture measured');
  assert.equal(Object.keys(evaluability.classes).length, evaluability.distinctRuleIds);
  assert.ok(
    evaluability.distinctRuleIds <= evaluability.corpusSize,
    'more distinct rule ids than rules classified — the capture is not a capture',
  );

  const tally = {};
  for (const klass of Object.values(evaluability.classes)) tally[klass] = (tally[klass] ?? 0) + 1;

  if (evaluability.distinctRuleIds === evaluability.corpusSize) {
    // The usual case: one row per rule id, so the two views must agree exactly.
    assert.deepEqual(tally, evaluability.counts, 'the per-rule classes do not add up to the stated counts');
  } else {
    // A rule id carried by two ruleset files collapses to one key here, so the
    // tally is a lower bound rather than an equality.
    for (const [klass, n] of Object.entries(tally)) {
      assert.ok(n <= evaluability.counts[klass], `${klass}: ${n} classes recorded but only ${evaluability.counts[klass]} counted`);
    }
  }
});

test('every rule the mapping stamps a class onto is a rule the snapshot actually classified', () => {
  // `not-in-snapshot` is a legitimate value for the two single-rule
  // infrastructure files whose rule metadata sits at the document root, which
  // the Core corpus loader does not read. It is NOT a legitimate value for
  // anything else: when the snapshot falls behind the corpus, rows quietly
  // acquire it and drop out of the backlog. So the exception is enumerated.
  const orphans = mapping.rules.filter((r) => r.nativeEvaluability === 'not-in-snapshot').map((r) => r.ruleId).sort();
  assert.deepEqual(
    orphans,
    ['INFRA-001', 'INFRA-OPA-001'],
    `mapping rows carry no class from the snapshot: ${orphans.join(', ')}. Either the snapshot is stale ` +
      '(recapture it) or the corpus grew another rule shape Core does not load (then say so here).',
  );
  for (const r of mapping.rules) {
    if (r.nativeEvaluability === 'not-in-snapshot') continue;
    assert.equal(
      r.nativeEvaluability,
      evaluability.classes[r.ruleId],
      `${r.ruleId} is stamped ${r.nativeEvaluability} in the mapping but ${evaluability.classes[r.ruleId]} in the snapshot`,
    );
  }
});

test('no artifact here quotes the retired 2011 eight-characteristic ISO/IEC 25010 model', () => {
  const stale = [];
  for (const file of fs.readdirSync(HERE)) {
    if (file === path.basename(fileURLToPath(import.meta.url))) continue;
    const text = fs.readFileSync(path.join(HERE, file), 'utf8');
    if (/25010:?\s*2011/i.test(text)) stale.push(`${file}: cites ISO/IEC 25010:2011`);
    if (/eight\s+(top-level\s+)?(quality\s+)?characteristics/i.test(text)) stale.push(`${file}: says "eight characteristics"`);
    // Markdown wraps lines, so every phrase match here has to tolerate a newline.
    if (/25010/.test(text) && /\bUsability\b/.test(text) && !/Interaction\s+capability/i.test(text)) {
      stale.push(`${file}: names Usability without the 2023 rename to Interaction capability`);
    }
  }
  assert.deepEqual(stale, [], stale.join('\n'));
});

test('the 2023 nine-characteristic model is stated where 25010 is referenced', () => {
  assert.match(mapping.taxonomyNote, /NINE/);
  assert.match(mapping.taxonomyNote, /Safety/);
  assert.match(mapping.taxonomyNote, /Interaction capability/);
  assert.match(mapping.taxonomyNote, /Flexibility/);
});
