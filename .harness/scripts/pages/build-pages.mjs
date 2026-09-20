#!/usr/bin/env node
/**
 * @file build-pages.mjs
 * @description Builds the two GitHub Pages views from their sources and the tree.
 *
 *   node .harness/scripts/pages/build-pages.mjs --out dist/pages   # assemble the site
 *   node .harness/scripts/pages/build-pages.mjs --check            # tracked SVG, tokens.css and map are current
 *   node .harness/scripts/pages/build-pages.mjs --write-svg        # refresh the tracked SVG + tokens.css only
 *   node .harness/scripts/pages/build-pages.mjs --as-of 2026-09-19 # pin the as-of date
 *
 * In order: derive every metric the pages print (`derive-page-metrics.mjs`); validate the
 * authored model (`validate-map.mjs`) and resolve its `{{placeholders}}`; render the E2E
 * poster SVG (`generate-master-view.mjs`) — the same bytes go to
 * `reference/core/sdlc/assets/master-view.svg` (embedded by README.md) and to the site —
 * and wrap it in the viewer; write `tokens.css` from `shared/tokens.json`; assemble
 * `dist/pages/` with the map inlined into `index.html`.
 *
 * `--check` renders in memory and exits 1 when a tracked generated file (the SVG,
 * `tokens.css`) differs from what the tree would produce, or when the model is invalid,
 * so a count can no longer age inside the README's picture.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from '../lib/paths.mjs';
import { deriveMetrics } from './derive-page-metrics.mjs';
import { interpolate } from './interpolate.mjs';
import { renderTokensCss } from './render-tokens.mjs';
import { validateMap } from './validate-map.mjs';
import { renderMasterView, posterRegions } from '../generate-master-view.mjs';
import { renderViewer } from '../generate-master-view-viewer.mjs';

const DEMOS = 'reference/core/architecture/demos';
const SVG_OUT = 'reference/core/sdlc/assets/master-view.svg';
const TOKENS_CSS = `${DEMOS}/tokens.css`;
/** Files copied verbatim from the demos folder into the site (index.html is inlined separately). */
const STATIC_FILES = ['app.js', 'layout.js', 'story.js', 'shared.js', 'viewer.js', 'pages.css', 'styles.css', 'viewer.css', '404.html'];
/** UI strings both pages read through shared.js (header, nav pill, toasts); the model must carry them in both languages. */
const REQUIRED_UI = ['pagesNav', 'navAtlas', 'navPoster', 'settings', 'readingLevel', 'executive', 'architect', 'engineer', 'switchLang', 'themeAria', 'themeAuto', 'themeLight', 'themeDark', 'openRepo', 'openAtlas', 'exportError', 'copied'];
const GUARD_45 = '.harness/scripts/ci/45-validate-port-inventory-honesty.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };

function fail(message, details = []) {
  process.stderr.write(`\n✗ build-pages: ${message}\n`);
  for (const d of details) process.stderr.write(`  ${d}\n`);
  process.exit(1);
}

const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

/** The newest date any printed number carries: the build is reproducible for a given tree. */
function latestDate(metrics) {
  const dates = [metrics.corpus.inventoryDate, metrics.governance.gaps.asOf, metrics.governance.scorecard.observedOn];
  for (const fact of Object.values(metrics.observed)) if (fact?.asOf) dates.push(fact.asOf);
  return dates.filter(Boolean).sort().at(-1);
}

/** Observed facts older than the evidence window become warnings the status strip renders. */
function staleWarnings(metrics, asOf) {
  const limit = Date.parse(asOf) - 30 * 86400000;
  return Object.entries(metrics.observed)
    .filter(([, fact]) => fact?.asOf && Date.parse(fact.asOf) < limit)
    .map(([key, fact]) => `observed.${key} was measured on ${fact.asOf}, more than 30 days before ${asOf}`);
}

/**
 * Phase nodes print their gate from `reference/governance/sdlc/gates/*.json` (already read into
 * `metrics.sdlc`), never from typed text: a renamed gate cannot survive as stale copy (spec §3.1).
 */
function gateProblems(map, metrics) {
  const byGate = new Map((metrics.sdlc || []).map((p) => [p.gateId, p]));
  const out = [];
  for (const n of map.nodes || []) {
    if (n.kind !== 'phase') continue;
    const phase = byGate.get(n.gate?.id);
    if (!phase) { out.push(`node ${n.id}: gate "${n.gate?.id}" is not in reference/governance/sdlc/gates`); continue; }
    n.gate = { ...n.gate, name: phase.gateName, accountable: phase.accountableRole ?? undefined };
  }
  return out;
}

/** The authored model, validated, placeholders resolved, doc paths made absolute, metrics attached. */
export function publishedMap(root, metrics, asOf = latestDate(metrics)) {
  const authored = readJson(root, `${DEMOS}/architecture-map.json`);
  const problems = validateMap(authored, root, REQUIRED_UI);
  if (problems.length) fail(`architecture-map.json has ${problems.length} problem(s)`, problems);
  const unknown = new Set();
  const map = interpolate(authored, { ...metrics, asOf, commit: metrics.commit }, { unknown });
  if (unknown.size) fail(`architecture-map.json names ${unknown.size} metric(s) the build cannot derive`, [...unknown]);
  const gates = gateProblems(map, metrics);
  if (gates.length) fail(`${gates.length} phase node(s) name a gate the SDLC JSON does not declare`, gates);
  const docsBase = map.meta.docsBase || 'https://github.com/beyondnetcode/evolith_arch32/blob/main/';
  const href = (d) => ({ ...(typeof d === 'string' ? { path: d } : d), url: /^https?:/.test(d.path || d) ? (d.path || d) : docsBase + (d.path || d) + (d.anchor ? `#${d.anchor}` : '') });
  for (const n of map.nodes) n.docs = (n.docs || []).map(href);
  for (const c of map.chapters || []) c.sources = (c.sources || []).map(href);
  for (const t of map.timeline || []) if (t.path) t.url = docsBase + t.path;
  map.meta = { ...map.meta, metrics, asOf, commit: metrics.commit, generatedAt: new Date().toISOString(), warnings: staleWarnings(metrics, asOf) };
  return map;
}

/** Every poster region a chapter names must exist in the rendered SVG. */
function regionProblems(map, svg) {
  const known = new Set(posterRegions(svg));
  const out = [];
  for (const c of map.chapters || []) for (const r of c.poster?.regions || []) if (!known.has(r)) out.push(`chapter ${c.id}: poster region "${r}" is not in the SVG`);
  return out;
}

function render(root, metrics, asOf) {
  const map = publishedMap(root, metrics, asOf);
  const svg = renderMasterView(map);
  const problems = regionProblems(map, svg);
  if (problems.length) fail(`${problems.length} poster region reference(s) do not resolve`, problems);
  if (/\{\{[\w.-]+\}\}/.test(svg)) fail('the rendered SVG still contains a {{placeholder}}');
  const tokensCss = renderTokensCss(readJson(root, `${DEMOS}/shared/tokens.json`));
  return { map, svg, tokensCss };
}

function writeSite(root, outDir, built) {
  const { map, svg, tokensCss } = built;
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of STATIC_FILES) {
    const src = path.join(root, DEMOS, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, file));
  }
  const json = JSON.stringify(map);
  const index = fs.readFileSync(path.join(root, DEMOS, 'index.html'), 'utf8');
  const slot = /<script type="application\/json" id="atlas-data">[\s\S]*?<\/script>/;
  if (!slot.test(index)) fail('index.html has no <script type="application/json" id="atlas-data"> slot');
  fs.writeFileSync(path.join(outDir, 'index.html'), index.replace(slot, `<script type="application/json" id="atlas-data">${json.replace(/<\//g, '<\\/')}</script>`));
  fs.writeFileSync(path.join(outDir, 'architecture-map.json'), `${JSON.stringify(map, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'metrics.json'), `${JSON.stringify(map.meta.metrics, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'tokens.css'), tokensCss);
  fs.writeFileSync(path.join(outDir, 'master-view.svg'), svg);
  fs.writeFileSync(path.join(outDir, 'master-view.html'), renderViewer(svg, map));
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
  const stray = fs.readdirSync(outDir).filter((f) => /\.(html|js|json|css)$/.test(f) && fs.readFileSync(path.join(outDir, f), 'utf8').includes('../'));
  if (stray.length) fail('relative parent links found in the built site', stray);
}

function check(root, built) {
  const tracked = (rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : '');
  const stale = [];
  if (tracked(SVG_OUT) !== built.svg) stale.push(SVG_OUT);
  if (tracked(TOKENS_CSS) !== built.tokensCss) stale.push(TOKENS_CSS);
  if (stale.length) fail('generated files are stale — run: node .harness/scripts/pages/build-pages.mjs --write-svg', stale);
  execFileSync(process.execPath, [path.join(root, GUARD_45)], { cwd: root, stdio: 'inherit' });
  process.stdout.write(`✓ build-pages --check: model valid (${built.map.nodes.length} nodes, ${built.map.chapters.length} chapters), ${SVG_OUT} and ${TOKENS_CSS} match the tree\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = REPO_ROOT;
  const metrics = deriveMetrics(root);
  const built = render(root, metrics, option('--as-of') || undefined);
  if (flag('--check')) {
    check(root, built);
  } else {
    const outDir = option('--out') ? path.resolve(process.cwd(), option('--out')) : null;
    if (outDir) writeSite(root, outDir, built);
    if (outDir || flag('--write-svg')) {
      fs.writeFileSync(path.join(root, SVG_OUT), built.svg);
      fs.writeFileSync(path.join(root, TOKENS_CSS), built.tokensCss);
    }
    process.stdout.write(`✓ build-pages: ${built.map.nodes.length} nodes, ${built.map.chapters.length} chapters, as of ${built.map.meta.asOf}${outDir ? `, site at ${outDir}` : ''}\n`);
  }
}
