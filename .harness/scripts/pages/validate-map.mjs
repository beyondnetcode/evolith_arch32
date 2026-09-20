/**
 * @file validate-map.mjs
 * @description Structural invariants of the authored Atlas model (architecture-map.json v3).
 * A broken link, an unknown id, a half-translated chapter or a narration over its word
 * budget is a build failure here — not a 404 discovered on somebody's phone.
 */

import fs from 'node:fs';
import path from 'node:path';

const LEVELS = ['executive', 'architect', 'engineer'];
/** Word budgets per level: [warn, error] (design-spec §4, "Level contract"). */
const WORD_CAPS = { executive: [60, 70], architect: [100, 115], engineer: [135, 150] };
const MATURITY = new Set(['visioned', 'designed', 'prototyped', 'implemented', 'validated', 'scaled']);
const I18N_KEYS = new Set(['label', 'shortLabel', 'subtitle', 'title', 'hook', 'question', 'description', 'protocol', 'ownership', 'qualifier', 'text', 'intro', 'value', 'meaning']);

const exists = (root, p) => fs.existsSync(path.join(root, p));
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/** Collect every `{en, es}`-shaped field missing a half, plus plain strings where a pair is expected. */
function halfTranslated(value, trail, out) {
  if (Array.isArray(value)) { value.forEach((v, i) => halfTranslated(v, `${trail}[${i}]`, out)); return; }
  if (!value || typeof value !== 'object') return;
  const keys = Object.keys(value);
  if (keys.includes('en') || keys.includes('es')) {
    if (!value.en || !value.es) out.push(`${trail}: has ${keys.filter((k) => k === 'en' || k === 'es').join('/')} only`);
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    if (I18N_KEYS.has(k) && typeof v === 'string' && k !== 'subtitle') out.push(`${trail}.${k}: plain string, expected {en, es}`);
    else halfTranslated(v, `${trail}.${k}`, out);
  }
}

function pathProblems(root, items, label) {
  return (items || []).map((d) => (typeof d === 'string' ? d : d.path)).filter((p) => p && !exists(root, p)).map((p) => `${label}: path does not exist: ${p}`);
}

function nodeProblems(map, ids, root) {
  const out = [];
  for (const n of map.nodes || []) {
    if (!ids.layers.has(n.layer)) out.push(`node ${n.id}: layer "${n.layer}" is not declared`);
    if (ids.edges.has(n.id)) out.push(`id "${n.id}" is both a node and an edge`);
    if (n.status?.maturity != null && !MATURITY.has(n.status.maturity)) out.push(`node ${n.id}: maturity "${n.status.maturity}" is not on the ladder`);
    if (n.status?.maturity != null && !n.status.source) out.push(`node ${n.id}: status.source missing`);
    if (n.kind === 'phase' && !(n.code && n.gate?.id)) out.push(`node ${n.id}: phase node needs code + gate`);
    out.push(...pathProblems(root, n.docs, `node ${n.id}`));
  }
  return out;
}

function edgeProblems(map, ids) {
  const out = [];
  for (const e of map.edges || []) {
    for (const end of [e.source, e.target]) if (!ids.nodes.has(end)) out.push(`edge ${e.id}: unknown node "${end}"`);
    if (e.pair && !ids.edges.has(e.pair)) out.push(`edge ${e.id}: pair "${e.pair}" does not exist`);
  }
  return out;
}

function narrationProblems(chapter) {
  const out = [];
  for (const level of LEVELS) {
    const n = chapter.narration?.[level];
    if (!n?.en || !n?.es) { out.push(`chapter ${chapter.id}: narration.${level} incomplete`); continue; }
    if (n.en.trim() === n.es.trim()) out.push(`chapter ${chapter.id}: narration.${level}.es equals en`);
    const cap = WORD_CAPS[level][1];
    for (const lang of ['en', 'es']) {
      // Spanish runs ~15 % longer than English for the same content.
      const limit = lang === 'es' ? Math.round(cap * 1.2) : cap;
      if (words(n[lang]) > limit) out.push(`chapter ${chapter.id}: narration.${level}.${lang} has ${words(n[lang])} words (limit ${limit})`);
    }
  }
  return out;
}

const nodeRefs = (c) => [...(c.focus?.nodes || []), ...(c.focus?.halfLit || []), ...(c.camera?.nodes || []), ...(c.badges || []).map((b) => b.node)];
const edgeRefs = (c) => [...(c.focus?.edges || []), ...(c.focus?.halfLitEdges || []), ...(c.packets?.edges || [])];

function chapterProblems(map, ids, root) {
  const out = [];
  const orders = (map.chapters || []).map((c) => c.order).sort((a, b) => a - b);
  if (orders.some((o, i) => o !== i + 1)) out.push(`chapters: orders are not contiguous 1…n (found ${orders.join(',')})`);
  for (const c of map.chapters || []) {
    out.push(...nodeRefs(c).filter((id) => !ids.nodes.has(id)).map((id) => `chapter ${c.id}: unknown node "${id}"`));
    out.push(...edgeRefs(c).filter((id) => !ids.edges.has(id)).map((id) => `chapter ${c.id}: unknown edge "${id}"`));
    out.push(...pathProblems(root, c.sources, `chapter ${c.id}`), ...narrationProblems(c));
  }
  return out;
}

function collectionProblems(map, ids, root) {
  const out = [];
  for (const l of map.lenses || []) {
    for (const id of l.nodes || []) if (!ids.nodes.has(id)) out.push(`lens ${l.id}: unknown node "${id}"`);
    for (const id of l.edges || []) if (!ids.edges.has(id)) out.push(`lens ${l.id}: unknown edge "${id}"`);
  }
  for (const s of map.scenarios || []) {
    for (const step of s.steps || []) {
      if (step.edge && !ids.edges.has(step.edge)) out.push(`scenario ${s.id}: unknown edge "${step.edge}"`);
      if (step.node && !ids.nodes.has(step.node)) out.push(`scenario ${s.id}: unknown node "${step.node}"`);
    }
  }
  out.push(...pathProblems(root, map.timeline, 'timeline'), ...pathProblems(root, map.meta?.sourceDocs, 'meta.sourceDocs'));
  return out;
}

/** Validate; returns the list of violations (empty = valid). `requiredUi` = ui keys the pages read. */
export function validateMap(map, root, requiredUi = []) {
  const ids = {
    nodes: new Set((map.nodes || []).map((n) => n.id)),
    layers: new Set((map.layers || []).map((l) => l.id)),
    edges: new Set((map.edges || []).map((e) => e.id)),
  };
  const problems = [];
  if (map.meta?.schemaVersion !== '3.0.0') problems.push(`meta.schemaVersion must be "3.0.0"`);
  if ((map.nodes || []).length > 60) problems.push(`nodes: ${map.nodes.length} > 60`);
  const dup = (map.nodes || []).map((n) => n.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (dup.length) problems.push(`duplicate node ids: ${dup.join(', ')}`);
  for (const key of requiredUi) if (!map.i18n?.ui?.[key]) problems.push(`i18n.ui: missing key "${key}"`);
  const i18n = [];
  halfTranslated({ layers: map.layers, nodes: map.nodes, edges: map.edges, chapters: map.chapters, lenses: map.lenses, scenarios: map.scenarios, ui: map.i18n?.ui, bands: map.bands }, 'map', i18n);
  return [...problems, ...nodeProblems(map, ids, root), ...edgeProblems(map, ids), ...chapterProblems(map, ids, root), ...collectionProblems(map, ids, root), ...i18n];
}
