/**
 * Negative fixtures for the pages build: the guard is only worth its step in
 * `Validate documentation` if each thing it promises to refuse is actually refused.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMap } from './validate-map.mjs';
import { interpolate, placeholders } from './interpolate.mjs';
import { renderTokensCss } from './render-tokens.mjs';
import { deriveMetrics } from './derive-page-metrics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DEMOS = path.join(ROOT, 'reference/core/architecture/demos');
const authored = () => JSON.parse(fs.readFileSync(path.join(DEMOS, 'architecture-map.json'), 'utf8'));

test('the authored model is valid as tracked', () => {
  assert.deepEqual(validateMap(authored(), ROOT, ['pagesNav']), []);
});

test('an unknown edge endpoint, a dead doc path and a half-translated chapter are refused', () => {
  const map = authored();
  map.edges[0].target = 'no-such-node';
  map.nodes[0].docs.push({ path: 'reference/does-not-exist.md' });
  map.chapters[0].narration.architect.es = map.chapters[0].narration.architect.en;
  delete map.chapters[1].narration.engineer.es;
  const problems = validateMap(map, ROOT);
  assert.ok(problems.some((p) => p.includes('unknown node "no-such-node"')), problems.join('\n'));
  assert.ok(problems.some((p) => p.includes('reference/does-not-exist.md')));
  assert.ok(problems.some((p) => p.includes('narration.architect.es equals en')));
  assert.ok(problems.some((p) => p.includes('narration.engineer incomplete')));
});

test('a narration over its word budget is refused', () => {
  const map = authored();
  map.chapters[0].narration.executive.en = Array.from({ length: 80 }, () => 'word').join(' ');
  assert.ok(validateMap(map, ROOT).some((p) => /narration\.executive\.en has 80 words/.test(p)));
});

test('every placeholder the model names resolves against the derived metrics', () => {
  const metrics = deriveMetrics(ROOT, '2026-09-19');
  const unknown = new Set();
  interpolate(authored(), { ...metrics, asOf: '2026-09-19', commit: metrics.commit }, { unknown });
  assert.deepEqual([...unknown], []);
  assert.ok(placeholders(authored()).size > 100);
});

test('an unknown placeholder is reported, never printed as text', () => {
  const unknown = new Set();
  const out = interpolate({ en: '{{corpus.nope}} ADRs' }, { corpus: {} }, { unknown });
  assert.deepEqual([...unknown], ['corpus.nope']);
  assert.equal(out.en, '{{corpus.nope}} ADRs');
});

test('numbers are grouped per language', () => {
  const out = interpolate({ en: '{{n}}', es: '{{n}}' }, { n: 1492 }, { unknown: new Set() });
  assert.deepEqual(out, { en: '1,492', es: '1.492' });
});

test('tracked tokens.css is what tokens.json renders', () => {
  const tokens = JSON.parse(fs.readFileSync(path.join(DEMOS, 'shared/tokens.json'), 'utf8'));
  assert.equal(fs.readFileSync(path.join(DEMOS, 'tokens.css'), 'utf8'), renderTokensCss(tokens));
});

test('the ports split the metrics print is the split guard 45 enforces', () => {
  const m = deriveMetrics(ROOT, '2026-09-19').runtime;
  assert.equal(m.portsHot, m.portsRequired + m.portsOptional);
  const svg = fs.readFileSync(path.join(ROOT, 'reference/core/sdlc/assets/master-view.svg'), 'utf8');
  assert.ok(svg.startsWith(`<!-- port-inventory: ${m.portsHot} hot / ${m.portsDeclared} declared -->`));
});
