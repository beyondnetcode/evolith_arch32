#!/usr/bin/env node
/**
 * @file iso-5055-mapping.test.mjs
 * @description GT-598 — executable guard for the ISO/IEC 5055 mapping.
 *
 * Run with: node --test src/rulesets/standards/
 *
 * These assertions are the reason the mapping is worth anything. A mapping table
 * that silently stops covering the corpus is worse than no table: it reports a
 * shrinking denominator as progress. Four things are pinned here —
 *
 *   1. the weakness index really is the 138 of ISO/IEC 5055, per measure;
 *   2. every CWE the mapping cites is one of those 138;
 *   3. every rule in the corpus has a row (add a rule, this fails);
 *   4. nothing in this directory quotes the retired 2011 eight-characteristic
 *      ISO/IEC 25010 model.
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

test('the evaluability snapshot still matches the class counts pinned by Core', () => {
  // These six numbers are pinned in rule-corpus-triage.spec.ts. If Core moves
  // them, this snapshot is stale and the backlog arithmetic above is wrong.
  assert.deepEqual(evaluability.counts, {
    'native-handler': 139,
    'documentation-only': 129,
    'unimplemented-native': 60,
    'needs-external-system': 20,
    'needs-runtime': 17,
    underspecified: 14,
  });
  assert.equal(Object.keys(evaluability.classes).length, 379);
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
