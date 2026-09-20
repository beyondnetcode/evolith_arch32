/**
 * app.js — the Atlas entry module (design-spec §2).
 *
 * Orchestrator: loads the published map, owns the state (mode · chapter · selection ·
 * lens · scenario · hidden layers · compact · list view), renders the SVG from the
 * computed layout (layout.js) and wires the story controller (story.js), the explore
 * tools, the list view, the status strip, the phone sheet and the keyboard map.
 * Every reader-facing string comes from `i18n.ui`; ids, paths and commands are
 * language-neutral and wrapped in <code lang="en">.
 */

import {
  readPrefs, setPref, applyTheme, reducedMotion, createI18n, daysSince, renderHeader,
  toast, trapFocus, LEVELS, REPO_URL, PREF_KEY,
} from './shared.js';
import { computeLayout, nodesBounds, laneBounds, unionBounds, mapBounds, nearestNode, chevronPath, truncate } from './layout.js';
import { createStory, runPackets, clearPackets, clearBadges, richText } from './story.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const svg = (tag, attrs = {}, text) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
};
/** SVG elements have no `hidden` IDL property: toggle the real attribute (spec §7). */
const setHidden = (el, on) => { if (on) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); };
const EDGE_KINDS = ['call', 'verdict', 'read', 'drive', 'gate', 'inherit', 'propose', 'evidence', 'ship', 'orthogonal'];
const PHONE = 759;

/** Bilingual fallback for the one state where the ui table itself is unreachable (§2.11). */
const FALLBACK_UI = {
  loadError: { en: 'The interactive map failed to load ({reason}). The poster is still here; the sources are on GitHub.', es: 'El mapa interactivo no se pudo cargar ({reason}). El póster sigue aquí; las fuentes están en GitHub.' },
  loadErrorDev: { en: "Couldn't load the map (HTTP {status}). Open this folder through a static server, or read the source on GitHub.", es: 'No se pudo cargar el mapa (HTTP {status}). Abre esta carpeta con un servidor estático o lee el código en GitHub.' },
  posterAlt: { en: 'Evolith — E2E Product Vision', es: 'Evolith — Visión de producto E2E' },
  skipMap: { en: 'Skip the map', es: 'Saltar el mapa' },
};

const app = {
  map: null, layout: null, i18n: null, prefs: null, story: null, canvas: null, header: null,
  mode: 'story', selected: null, peek: false, lens: null, scenario: null, scenarioStep: 0, scenarioTimer: null,
  hiddenLayers: new Set(), compact: false, listView: false, columns: 12, tab: 'scenarios', shortcutsOn: true, releaseTrap: null, scenarioPackets: null,
};

// ---------------------------------------------------------------- data
async function loadMap() {
  // The build inlines the published map as a JS value (`window.__ATLAS_DATA__`), not as
  // DOM text: nothing on this page is ever parsed out of the document and re-rendered.
  if (globalThis.__ATLAS_DATA__) return globalThis.__ATLAS_DATA__;
  const res = await fetch('./architecture-map.json', { cache: 'no-cache' });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

function showFatal(err) {
  console.error(err);
  const i18n = app.i18n || createI18n(FALLBACK_UI, (app.prefs || readPrefs()).lang);
  const text = err?.status ? i18n.t('loadErrorDev', { status: err.status }) : i18n.t('loadError', { reason: err?.message || String(err) });
  const box = $('canvasError');
  box.innerHTML = `<p role="alert">${esc(text)}</p><img src="./master-view.svg" alt="${esc(i18n.t('posterAlt'))}" width="1600" height="1936"><p><a href="${REPO_URL}" rel="noopener">${esc(REPO_URL)}</a></p>`;
  box.hidden = false;
  $('canvasWrap').classList.remove('is-loading');
  $('skipLink').textContent = i18n.t('skipMap');
}

// ---------------------------------------------------------------- canvas
function createCanvas() {
  const wrap = $('canvasWrap');
  const svgEl = $('atlas');
  const groups = { lanes: $('lanes'), edges: $('edges'), nodes: $('nodes'), packets: $('packets'), badges: $('badges'), veil: $('veil'), defs: $('atlasDefs') };
  const view = { x: 0, y: 0, w: 1600, h: 1000 };
  let fitView = { ...view };
  let lastBounds = null;
  let anim = null;
  let current = null;
  let suppressClick = false;
  const nodeEls = new Map();
  const edgeEls = new Map();
  const laneEls = new Map();
  const edgeData = new Map();
  let layout = null;

  const aspect = () => { const r = wrap.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r.width / r.height : 1.6; };
  const boundsToView = (b) => {
    const a = aspect(); let { w, h } = b;
    if (w / h > a) h = w / a; else w = h * a;
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
  };
  const clampView = (v) => {
    const w = clamp(v.w, fitView.w / 2.2, fitView.w);
    const h = w / aspect();
    const cx = v.x + v.w / 2; const cy = v.y + v.h / 2;
    const lim = layout ? mapBounds(layout) : { x: 0, y: 0, w: 1600, h: 1000 };
    return { w, h, x: clamp(cx - w / 2, lim.x - w / 2, lim.x + lim.w - w / 2), y: clamp(cy - h / 2, lim.y - h / 2, lim.y + lim.h - h / 2) };
  };
  function setView(v) {
    Object.assign(view, v);
    svgEl.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    const label = $('zoomLevel');
    if (label) label.textContent = app.i18n.t('zoomLevel', { pct: Math.round((fitView.w / view.w) * 100) });
  }
  const ease = (t) => 1 - (1 - t) ** 3;
  function animateTo(target, ms) {
    if (anim) { cancelAnimationFrame(anim.raf); anim.resolve(); anim = null; }
    if (ms <= 0) { setView(target); return Promise.resolve(); }
    const from = { ...view }; const t0 = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const t = clamp((now - t0) / ms, 0, 1); const k = ease(t);
        setView({ x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k, w: from.w + (target.w - from.w) * k, h: from.h + (target.h - from.h) * k });
        if (t < 1) anim.raf = requestAnimationFrame(step); else { anim = null; resolve(); }
      };
      anim = { raf: requestAnimationFrame(step), resolve };
    });
  }
  function fitBounds(b, { animate = true } = {}) {
    lastBounds = b;
    return animateTo(clampView(boundsToView(b)), animate && !reducedMotion(app.prefs.motion) ? 620 : 0);
  }
  function refit() { if (lastBounds) setView(clampView(boundsToView(lastBounds))); }
  function fitAll(animate) { return fitBounds({ x: -16, y: -16, w: layout.width + 32, h: layout.height + 32 }, { animate }); }
  function zoomBy(factor, cx = view.x + view.w / 2, cy = view.y + view.h / 2) {
    const w = clamp(view.w / factor, fitView.w / 2.2, fitView.w); const h = w / aspect();
    const fx = (cx - view.x) / view.w; const fy = (cy - view.y) / view.h;
    setView(clampView({ x: cx - fx * w, y: cy - fy * h, w, h }));
  }
  function panBy(px, py) {
    const r = wrap.getBoundingClientRect();
    setView(clampView({ ...view, x: view.x + (px * view.w) / r.width, y: view.y + (py * view.h) / r.height }));
  }
  function toViewBox(clientX, clientY) {
    const r = svgEl.getBoundingClientRect();
    return { x: view.x + ((clientX - r.left) / r.width) * view.w, y: view.y + ((clientY - r.top) / r.height) * view.h };
  }
  function boundsFor(camera = {}, focus = {}) {
    const pad = camera.pad ?? 96; const fit = camera.fit || 'focus';
    let b = null;
    if (fit.startsWith('lane:')) b = laneBounds(layout, fit.slice(5), 0);
    if (camera.nodes?.length) b = unionBounds(b, nodesBounds(layout, camera.nodes, 0));
    if (fit === 'focus' || fit === 'focus+halfLit' || !b) b = unionBounds(b, nodesBounds(layout, [...(focus.nodes || []), ...(fit === 'focus+halfLit' ? focus.halfLit || [] : [])], 0));
    if (!b) b = mapBounds(layout);
    return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  }
  function ensureVisible(id) {
    const n = layout.nodes.get(id);
    if (!n || n.hidden) return;
    const inside = n.x >= view.x && n.y >= view.y && n.x + n.w <= view.x + view.w && n.y + n.h <= view.y + view.h;
    if (inside) return;
    const cx = n.x + n.w / 2; const cy = n.y + n.h / 2;
    animateTo(clampView({ ...view, x: cx - view.w / 2, y: cy - view.h / 2 }), reducedMotion(app.prefs.motion) ? 0 : 400);
  }

  // ---- defs
  function renderDefs() {
    groups.defs.innerHTML = '';
    const arrow = (id, open) => {
      const m = svg('marker', { id, markerWidth: 9, markerHeight: 9, refX: 8, refY: 4.5, orient: 'auto', markerUnits: 'userSpaceOnUse' });
      m.appendChild(svg('path', { class: open ? 'mk-open' : 'mk', d: open ? 'M1 1 L8 4.5 L1 8' : 'M0 0.5 L8 4.5 L0 8.5 Z' }));
      groups.defs.appendChild(m);
    };
    for (const k of ['call', 'verdict', 'drive', 'inherit', 'propose', 'active', 'related']) arrow(`mk-${k}`, false);
    arrow('mk-read', true);
    const dot = svg('marker', { id: 'mk-evidence', markerWidth: 8, markerHeight: 8, refX: 4, refY: 4, markerUnits: 'userSpaceOnUse' });
    dot.appendChild(svg('circle', { cx: 4, cy: 4, r: 3 }));
    groups.defs.appendChild(dot);
    const hatch = svg('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    hatch.appendChild(svg('rect', { width: 6, height: 6, fill: 'var(--surface)' }));
    hatch.appendChild(svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--line)', 'stroke-width': 2 }));
    groups.defs.appendChild(hatch);
  }
  const markerFor = (kind) => (['gate', 'ship', 'orthogonal'].includes(kind) ? null : `url(#mk-${kind})`);

  // ---- lanes
  const laneMeta = () => new Map((app.map.layers || []).map((l) => [l.id, l]));
  function renderLanes() {
    groups.lanes.innerHTML = ''; laneEls.clear();
    const meta = laneMeta(); const { i18n } = app;
    for (const lane of layout.lanes) {
      const l = meta.get(lane.id) || {};
      const g = svg('g', { class: 'lane', 'data-id': lane.id });
      g.style.setProperty('--lane-fill', `var(--lane-${l.hue || lane.id}-fill)`);
      g.style.setProperty('--lane-text', `var(--lane-${l.hue || lane.id}-text)`);
      g.appendChild(svg('rect', { class: 'lane-bg', x: lane.x + 4, y: lane.y, width: lane.w - 8, height: lane.h }));
      const label = svg('text', { class: 'lane-label', x: lane.x + 44, y: lane.y + 20 }, i18n.pick(l.label));
      if (!lane.hidden) { const sub = svg('tspan', { class: 'lane-sub', dx: 12 }, i18n.pick(l.subtitle || l.description)); label.appendChild(sub); }
      g.appendChild(label);
      if (lane.hidden) {
        const text = i18n.t('hiddenShow');
        const b = svg('g', { class: 'lane-show', role: 'button', tabindex: 0, 'aria-label': `${i18n.pick(l.label)}: ${text}` });
        const bw = text.length * 6.6 + 20;
        b.appendChild(svg('rect', { x: lane.w - bw - 16, y: lane.y + 5, width: bw, height: 22 }));
        b.appendChild(svg('text', { x: lane.w - bw - 6, y: lane.y + 20 }, text));
        const show = () => setLayerHidden(lane.id, false);
        b.addEventListener('click', show);
        b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
        g.appendChild(b);
      }
      groups.lanes.appendChild(g); laneEls.set(lane.id, g);
    }
    renderBrackets();
  }
  function renderBrackets() {
    const { i18n } = app;
    const spans = new Map();
    for (const lane of layout.lanes) {
      const key = lane.bracket || 'open-core';
      const cur = spans.get(key) || { y0: lane.y, y1: lane.y + lane.h };
      spans.set(key, { y0: Math.min(cur.y0, lane.y), y1: Math.max(cur.y1, lane.y + lane.h) });
    }
    const keys = { 'open-core': 'bracketOpenCore', suite: 'bracketSuite', evidence: 'bracketEvidence' };
    for (const [key, s] of spans) {
      const g = svg('g', { class: 'bracket', 'aria-hidden': 'true' });
      g.appendChild(svg('line', { x1: 12, y1: s.y0 + 6, x2: 12, y2: s.y1 - 6 }));
      const t = svg('text', { transform: `translate(24 ${(s.y0 + s.y1) / 2}) rotate(-90)`, 'text-anchor': 'middle' }, i18n.t(keys[key] || 'bracketOpenCore'));
      g.appendChild(t);
      groups.lanes.appendChild(g);
    }
  }

  // ---- nodes
  const textW = (s, per) => Math.round(String(s).length * per + 14);
  function maturityLabel(m) {
    if (!m) return '';
    const entry = (app.map.maturityLegend || []).find((x) => x.id === m);
    return entry ? app.i18n.pick(entry.label) : m;
  }
  function pillGroup(cls, x, y, text, extra = {}) {
    const w = textW(text, 6.3);
    const g = svg('g', { class: cls, transform: `translate(${x} ${y})`, ...extra });
    g.appendChild(svg('rect', { width: w, height: 16 }));
    g.appendChild(svg('text', { x: 7, y: 11.5 }, text));
    return { g, w };
  }
  function chipGroup(x, y, text, maxChars) {
    const s = truncate(text, Math.max(3, maxChars));
    const w = textW(s, 6.7);
    const g = svg('g', { class: 'chip-svg', transform: `translate(${x} ${y})` });
    g.appendChild(svg('rect', { width: w, height: 16 }));
    g.appendChild(svg('text', { x: 7, y: 11.5 }, s));
    return { g, w };
  }
  function nodeAria(n) {
    const { i18n } = app; const lane = laneMeta().get(n.layer);
    return [i18n.pick(n.label), i18n.pick(lane?.label), maturityLabel(n.status?.maturity), i18n.pick(n.status?.qualifier)].filter(Boolean).join(' · ');
  }
  function renderNode(n, data) {
    const { i18n } = app; const lane = laneMeta().get(n.layer) || {};
    const phase = n.kind === 'phase'; const compact = layout.compact;
    const g = svg('g', { class: `node${phase ? ' is-phase' : ''}${n.kind === 'axis' ? ' is-axis' : ''}`, role: 'button', tabindex: -1, 'data-id': n.id, 'data-layer': n.layer, 'aria-label': nodeAria(data) });
    g.style.setProperty('--lane-text', `var(--lane-${lane.hue || n.layer}-text)`);
    if (phase) g.style.setProperty('--phase', `var(--phase-${phaseIndex(n.id)})`);
    g.appendChild(svg('rect', { class: 'halo', x: n.x - 3, y: n.y - 3, width: n.w + 6, height: n.h + 6 }));
    g.appendChild(phase ? svg('path', { class: 'card', d: chevronPath(n.x, n.y, n.w, n.h) }) : svg('rect', { class: 'card', x: n.x, y: n.y, width: n.w, height: n.h }));
    if (!phase) g.appendChild(svg('rect', { class: 'accent-bar', x: n.x + 1, y: n.y + 10, width: 4, height: n.h - 20, rx: 2 }));
    const lines = n.title[i18n.lang] || n.title.en || [];
    const tx = n.x + (phase ? 22 : 14);
    const title = svg('text', { class: 'node-title', x: tx, y: n.y + (compact ? 22 : 25) });
    lines.slice(0, 2).forEach((line, i) => title.appendChild(svg('tspan', { x: tx, dy: i === 0 ? 0 : 18 }, line)));
    g.appendChild(title);
    const rowY = n.y + n.h - (compact ? 20 : 26);
    if (phase) {
      if (!compact) g.appendChild(svg('text', { class: 'node-meta', x: tx, y: n.y + 62 }, data.code || ''));
      const gate = data.gate?.name ? i18n.t('gateChip', { name: data.gate.name }) : '';
      if (gate) g.appendChild(pillGroup('gate-pill', tx, compact ? n.y + 40 : n.y + 70, gate).g);
      if (!compact && data.gate?.accountable) g.appendChild(svg('text', { class: 'node-meta', x: tx, y: n.y + 104 }, `${i18n.t('accountable')}: ${data.gate.accountable}`));
    } else {
      let x = n.x + 14;
      const m = data.status?.maturity;
      if (m) { const p = pillGroup('pill-svg', x, rowY, maturityLabel(m), { 'data-m': m }); g.appendChild(p.g); x += p.w + 6; }
      const metric = i18n.pick(data.metric?.text);
      if (metric && !compact) {
        const room = Math.floor((n.x + n.w - 14 - x - 14) / 6.7);
        if (room >= 3) g.appendChild(chipGroup(x, rowY, metric, room).g);
      }
    }
    g.appendChild(svg('rect', { class: 'focus-ring', x: n.x - 5, y: n.y - 5, width: n.w + 10, height: n.h + 10 }));
    if (n.hidden) setHidden(g, true);
    return g;
  }
  const phaseIndex = (id) => (app.map.nodes || []).filter((x) => x.kind === 'phase').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).findIndex((x) => x.id === id) + 1;
  function renderNodes() {
    groups.nodes.innerHTML = ''; nodeEls.clear();
    const byId = new Map((app.map.nodes || []).map((n) => [n.id, n]));
    for (const n of layout.nodes.values()) {
      const g = renderNode(n, byId.get(n.id) || {});
      groups.nodes.appendChild(g); nodeEls.set(n.id, g);
    }
    if (!current || !nodeEls.has(current) || layout.nodes.get(current)?.hidden) current = [...layout.nodes.values()].find((n) => !n.hidden)?.id || null;
    setCurrent(current);
  }
  function setCurrent(id) {
    if (!id || !nodeEls.has(id)) return;
    if (current && nodeEls.get(current)) nodeEls.get(current).setAttribute('tabindex', '-1');
    current = id; nodeEls.get(id).setAttribute('tabindex', '0');
  }

  // ---- edges
  function renderEdges() {
    groups.edges.innerHTML = ''; edgeEls.clear(); edgeData.clear();
    const byId = new Map((app.map.edges || []).map((e) => [e.id, e]));
    const { i18n } = app;
    for (const e of layout.edges) {
      const data = byId.get(e.id) || {};
      edgeData.set(e.id, { ...e, offByDefault: Boolean(data.offByDefault), visibility: data.visibility || 'always', pair: data.pair });
      const g = svg('g', { class: 'edge', 'data-id': e.id, 'data-kind': e.kind });
      if (e.kind === 'gate') g.style.setProperty('--phase', `var(--phase-${e.phaseIndex || 1})`);
      g.appendChild(svg('path', { class: 'edge-path', d: e.d, 'marker-end': markerFor(e.kind) }));
      if (e.kind === 'orthogonal') {
        const gl = svg('g', { class: 'edge-glyph', transform: `translate(${e.mid.x} ${e.mid.y})` });
        gl.appendChild(svg('circle', { r: 9 })); gl.appendChild(svg('text', {}, '⟂')); g.appendChild(gl);
      }
      if (data.offByDefault) {
        const gl = svg('g', { class: 'edge-glyph gate-glyph', transform: `translate(${e.mid.x} ${e.mid.y})` });
        gl.appendChild(svg('circle', { r: 8 })); gl.appendChild(svg('line', { x1: -4, y1: 0, x2: 4, y2: 0 })); g.appendChild(gl);
      }
      const label = truncate(i18n.pick(data.protocol) || i18n.pick(data.label) || e.id, 44);
      const lw = textW(label, 6.7);
      const lg = svg('g', { class: 'edge-label', transform: `translate(${e.label.x - lw / 2} ${e.label.y - 9})` });
      lg.appendChild(svg('rect', { width: lw, height: 18 })); lg.appendChild(svg('text', { x: 7, y: 12.5 }, label));
      g.appendChild(lg);
      if (e.hidden || (data.visibility === 'focus-only')) setHidden(g, true);
      groups.edges.appendChild(g); edgeEls.set(e.id, g);
    }
  }

  // ---- state application (spotlight / lens / selection)
  function applyState({ lit = [], half = [], dim = false, active = [], related = [], halfEdges = [], veil = false, visibleFocusOnly = [] } = {}) {
    const L = new Set(lit); const H = new Set(half); const A = new Set(active); const R = new Set(related); const HE = new Set(halfEdges); const V = new Set([...visibleFocusOnly, ...active, ...related, ...halfEdges]);
    const litLanes = new Set();
    for (const [id, g] of nodeEls) {
      const n = layout.nodes.get(id);
      const isLit = L.has(id); const isHalf = !isLit && H.has(id);
      g.classList.toggle('is-lit', isLit && veil); g.classList.toggle('is-half', isHalf); g.classList.toggle('is-dim', dim && !isLit && !isHalf);
      if (isLit || isHalf) litLanes.add(n.layer);
    }
    for (const [id, g] of edgeEls) {
      const d = edgeData.get(id);
      const isA = A.has(id); const isR = !isA && R.has(id); const isH = !isA && !isR && HE.has(id);
      g.classList.toggle('is-active', isA); g.classList.toggle('is-related', isR); g.classList.toggle('is-half', isH); g.classList.toggle('is-dim', dim && !isA && !isR && !isH);
      const p = g.querySelector('.edge-path');
      const marker = isA ? 'url(#mk-active)' : isR ? 'url(#mk-related)' : markerFor(d.kind);
      if (marker) p.setAttribute('marker-end', marker); else p.removeAttribute('marker-end');
      g.dataset.marker = marker || '';
      g.classList.remove('sel-related');
      g.dataset.focusVisible = V.has(id) ? '1' : '0';
      setHidden(g, d.hidden || (d.visibility === 'focus-only' && !V.has(id)));
    }
    for (const [id, g] of laneEls) g.classList.toggle('is-dim', dim && !litLanes.has(id));
    setHidden(groups.veil, !veil); groups.veil.classList.toggle('is-on', veil);
  }
  const spotlight = (focus) => applyState({ lit: focus.nodes, half: focus.halfLit, active: focus.edges, halfEdges: focus.halfLitEdges, dim: true, veil: true });
  const clearSpotlight = () => applyState({});
  function markSelected(id, edgeIds = []) {
    for (const [nid, g] of nodeEls) g.classList.toggle('is-selected', nid === id);
    const S = new Set(edgeIds);
    for (const [eid, g] of edgeEls) {
      const p = g.querySelector('.edge-path');
      if (S.has(eid)) { g.classList.add('sel-related'); setHidden(g, edgeData.get(eid).hidden); p.setAttribute('marker-end', 'url(#mk-related)'); }
      else if (g.classList.contains('sel-related')) {
        g.classList.remove('sel-related');
        if (g.dataset.marker) p.setAttribute('marker-end', g.dataset.marker); else p.removeAttribute('marker-end');
        setHidden(g, edgeData.get(eid).hidden || (edgeData.get(eid).visibility === 'focus-only' && g.dataset.focusVisible !== '1'));
      }
    }
  }
  function markMatches(ids) { const S = new Set(ids); for (const [id, g] of nodeEls) g.classList.toggle('is-match', S.has(id)); }
  function pulseNode(id) {
    const card = nodeEls.get(id)?.querySelector('.card');
    if (!card || reducedMotion(app.prefs.motion)) return;
    card.classList.remove('arrive'); void card.getBoundingClientRect(); card.classList.add('arrive');
    setTimeout(() => card.classList.remove('arrive'), 400);
  }

  function render(nextLayout) {
    layout = nextLayout;
    groups.veil.setAttribute('x', -200); groups.veil.setAttribute('y', -200); groups.veil.setAttribute('width', layout.width + 400); groups.veil.setAttribute('height', layout.height + 400);
    renderDefs(); renderLanes(); renderEdges(); renderNodes(); clearPackets(api); clearBadges(api);
    fitView = boundsToView({ x: -16, y: -16, w: layout.width + 32, h: layout.height + 32 });
    wrap.classList.remove('is-loading');
  }

  // ---- pointer: pan / pinch / tap / wheel (§2.8)
  const pointers = new Map();
  let gesture = null;
  const hideHint = () => { const h = $('canvasHint'); if (h && !h.hidden) h.hidden = true; };
  svgEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    hideHint(); app.story?.pause();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svgEl.setPointerCapture?.(e.pointerId);
    if (pointers.size === 1) gesture = { kind: 'pan', x: e.clientX, y: e.clientY, moved: false, view: { ...view } };
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), mid: toViewBox((a.x + b.x) / 2, (a.y + b.y) / 2), view: { ...view } };
    }
  });
  svgEl.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = svgEl.getBoundingClientRect();
    if (gesture.kind === 'pan' && pointers.size === 1) {
      const dx = e.clientX - gesture.x; const dy = e.clientY - gesture.y;
      if (!gesture.moved && Math.hypot(dx, dy) < 6) return;
      gesture.moved = true; wrap.classList.add('is-panning');
      setView(clampView({ ...gesture.view, x: gesture.view.x - (dx * gesture.view.w) / r.width, y: gesture.view.y - (dy * gesture.view.h) / r.height }));
    } else if (gesture.kind === 'pinch' && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const w = clamp(gesture.view.w * (gesture.d0 / d), fitView.w / 2.2, fitView.w); const h = w / aspect();
      const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
      const fx = (mx - r.left) / r.width; const fy = (my - r.top) / r.height;
      setView(clampView({ x: gesture.mid.x - fx * w, y: gesture.mid.y - fy * h, w, h }));
      gesture.moved = true;
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (gesture?.moved) suppressClick = true;
    if (pointers.size === 0) { gesture = null; wrap.classList.remove('is-panning'); setTimeout(() => { suppressClick = false; }, 0); }
    else if (pointers.size === 1) { const p = [...pointers.values()][0]; gesture = { kind: 'pan', x: p.x, y: p.y, moved: true, view: { ...view } }; }
  };
  svgEl.addEventListener('pointerup', endPointer);
  svgEl.addEventListener('pointercancel', endPointer);
  svgEl.addEventListener('wheel', (e) => { e.preventDefault(); hideHint(); const p = toViewBox(e.clientX, e.clientY); zoomBy(Math.exp(-e.deltaY * 0.0015), p.x, p.y); }, { passive: false });
  svgEl.addEventListener('dblclick', (e) => { const p = toViewBox(e.clientX, e.clientY); zoomBy(1.6, p.x, p.y); });
  groups.nodes.addEventListener('click', (e) => {
    if (suppressClick) return;
    const g = e.target.closest('.node'); if (!g) return;
    setCurrent(g.dataset.id); selectNode(g.dataset.id, { opener: g });
  });
  groups.nodes.addEventListener('focusin', (e) => { const g = e.target.closest('.node'); if (g) setCurrent(g.dataset.id); });
  // keyboard on nodes (§2.7)
  groups.nodes.addEventListener('keydown', (e) => {
    const g = e.target.closest('.node'); if (!g) return;
    const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (dirs[e.key]) {
      e.preventDefault(); e.stopPropagation();
      if (e.shiftKey) { panBy(e.key === 'ArrowLeft' ? -120 : e.key === 'ArrowRight' ? 120 : 0, e.key === 'ArrowUp' ? -120 : e.key === 'ArrowDown' ? 120 : 0); return; }
      const next = nearestNode(layout, g.dataset.id, dirs[e.key]);
      if (next) { setCurrent(next); nodeEls.get(next).focus(); ensureVisible(next); }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); selectNode(g.dataset.id, { opener: g }); }
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.25); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / 1.25); }
    else if (e.key === '0') { e.preventDefault(); fitAll(true); }
  });
  wrap.addEventListener('pointerdown', hideHint, { once: true });

  const api = {
    wrap, svgEl, packetsGroup: groups.packets, badgesGroup: groups.badges,
    render, fitBounds, fitAll, refit, zoomBy, boundsFor, ensureVisible, spotlight, clearSpotlight, applyState, markSelected, markMatches, pulseNode, setCurrent,
    edge: (id) => edgeData.get(id) || null, node: (id) => layout?.nodes.get(id) || null, nodeEl: (id) => nodeEls.get(id) || null,
    focusCurrent() { const g = nodeEls.get(current); if (g) g.focus(); },
    layout: () => layout, view: () => ({ ...view }),
  };
  return api;
}

// ---------------------------------------------------------------- selection / detail card
const nodeById = (id) => (app.map.nodes || []).find((n) => n.id === id);
const edgesOf = (id) => (app.map.edges || []).filter((e) => e.source === id || e.target === id);
const docHref = (d) => d.url || (app.map.meta?.docsBase || '') + (typeof d === 'string' ? d : d.path || '');
const docPath = (d) => (typeof d === 'string' ? d : (typeof d.path === 'object' ? (d.path?.path || '') : (d.path || d.url || '')));

function maturityText(n) {
  const m = n.status?.maturity;
  const legend = (app.map.maturityLegend || []).find((x) => x.id === m);
  return m ? (legend ? app.i18n.pick(legend.label) : m) : '';
}

function detailHtml(n) {
  const { i18n, prefs } = app; const lane = (app.map.layers || []).find((l) => l.id === n.layer) || {};
  const level = prefs.level;
  const facts = (n.facts || []).filter((f) => !f.levels || f.levels.includes(level));
  const chapters = app.story.chapters.filter((c) => (c.focus?.nodes || []).includes(n.id)).map((c) => c.order);
  const m = n.status?.maturity;
  const conns = edgesOf(n.id).map((e) => {
    const out = e.source === n.id; const other = nodeById(out ? e.target : e.source);
    const head = `${out ? '→' : '←'} ${i18n.t(out ? 'to' : 'from')} ${i18n.pick(other?.label) || (out ? e.target : e.source)}`;
    const cite = e.sourceRef || ''; // v3: the edge's citation is `sourceRef` (`source` is the node id)
    return `<li><button type="button" data-edge="${esc(e.id)}" aria-pressed="false"><strong>${esc(head)}</strong> · ${esc(e.kind)}<span class="proto">${esc(i18n.pick(e.protocol))}${e.ownership ? ` · ${esc(i18n.pick(e.ownership))}` : ''}${cite ? ` · ${esc(cite)}` : ''}</span></button></li>`;
  }).join('');
  const status = [maturityText(n), i18n.pick(n.status?.qualifier), n.status?.asOf ? i18n.t('asOf', { date: n.status.asOf }) : '', n.status?.source ? `${i18n.t('source').toLowerCase()}: <code lang="en">${esc(n.status.source)}</code>` : ''].filter(Boolean).join(' · ');
  const phase = n.kind === 'phase' && n.gate ? `<h3>${esc(i18n.t('gate'))}</h3><p>${esc(n.gate.name || n.gate.id)}${n.gate.accountable ? ` · ${esc(i18n.t('accountable'))}: ${esc(n.gate.accountable)}` : ''}${n.gate.waiver ? ` · ${esc(i18n.t('waiver'))}: ${esc(n.gate.waiver)}` : ''}</p>` : '';
  return `<div class="detail">
    <div class="head">
      <span class="pill lane-pill" style="background: var(--lane-${esc(lane.hue || n.layer)}-fill); color: var(--lane-${esc(lane.hue || n.layer)}-text)">${esc(i18n.pick(lane.label))}</span>
      ${m ? `<span class="pill pill-${esc(m)}">${esc(maturityText(n))}</span>` : ''}
      ${n.status?.qualifier ? `<span class="qualifier">${esc(i18n.pick(n.status.qualifier))}</span>` : ''}
      ${(n.tags || []).includes('wedge') ? `<span class="chip">${esc(i18n.t('wedge'))}</span>` : ''}
      ${n.kind ? `<span class="chip kind-chip">${esc(i18n.t(`nodeKind${n.kind[0].toUpperCase()}${n.kind.slice(1)}`))}</span>` : ''}
    </div>
    <h2 id="panelTitle" class="t-title" tabindex="-1">${esc(i18n.pick(n.label))}</h2>
    ${n.subtitle ? `<p class="subtitle"><code lang="en">${esc(n.subtitle)}</code></p>` : ''}
    <h3>${esc(i18n.t('summary'))}</h3><p>${richText(i18n.pick(n.summary?.[level] || n.summary?.executive || n.summary))}</p>
    ${facts.length ? `<h3>${esc(i18n.t('facts'))}</h3><ul>${facts.map((f) => `<li>${richText(i18n.pick(f.text))}</li>`).join('')}</ul>` : ''}
    ${phase}
    ${status ? `<h3>${esc(i18n.t('status'))}</h3><p>${status}</p>` : ''}
    ${conns ? `<h3>${esc(i18n.t('connectedTo'))}</h3><ul class="connections">${conns}</ul>` : ''}
    ${(n.docs || []).length ? `<h3>${esc(i18n.t('sources'))}</h3><ul class="docs">${(n.docs || []).map((d) => `<li><a class="ext" href="${esc(docHref(d))}" rel="noopener">${esc(d.label ? i18n.pick(d.label) : docPath(d))}</a></li>`).join('')}</ul>` : ''}
    ${chapters.length ? `<p class="t-body-s">${esc(i18n.t('chaptersIn', { list: chapters.join(', ') }))}</p>` : ''}
  </div>`;
}

function wireDetail(root) {
  for (const b of root.querySelectorAll('[data-edge]')) {
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      for (const o of root.querySelectorAll('[data-edge]')) o.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-pressed', String(on));
      app.canvas.markSelected(app.selected, on ? [b.dataset.edge] : edgesOf(app.selected).map((e) => e.id));
    });
  }
}

function selectNode(id, { opener } = {}) {
  const n = nodeById(id); if (!n) return;
  app.selected = id;
  const body = $('panelBody');
  refreshCanvasState();
  if (app.mode === 'story') {
    app.story.pause(); app.peek = true;
    body.innerHTML = `<button type="button" class="btn panel-back" data-action="back">${esc(app.i18n.t('backToChapter'))}</button>${detailHtml(n)}`;
    body.querySelector('[data-action="back"]').addEventListener('click', () => closePeek());
  } else {
    app.canvas.ensureVisible(id);
    renderExplorePanel();
  }
  wireDetail(body);
  const url = new URL(location.href); url.searchParams.set('node', id); history.replaceState(history.state, '', url);
  openDetailSheet(opener);
}

function closePeek() {
  app.peek = false; app.selected = null;
  app.canvas.markSelected(null, []);
  refreshCanvasState();
  app.story.showCard();
  const url = new URL(location.href); url.searchParams.delete('node'); history.replaceState(history.state, '', url);
  closeDetailSheet();
}

function clearSelection() {
  if (app.mode === 'story') { if (app.peek) closePeek(); return; }
  app.selected = null; app.canvas.markSelected(null, []);
  refreshCanvasState(); renderExplorePanel();
  const url = new URL(location.href); url.searchParams.delete('node'); history.replaceState(history.state, '', url);
  closeDetailSheet();
}

// ---------------------------------------------------------------- modes
function setMode(mode, { silent = false } = {}) {
  if (app.mode === mode && !silent) return;
  app.mode = mode; app.peek = false;
  $('storyControls').hidden = mode !== 'story'; $('exploreControls').hidden = mode !== 'explore';
  for (const b of $('modeSwitch').querySelectorAll('[data-mode]')) { const on = b.dataset.mode === mode; b.setAttribute('aria-checked', String(on)); b.setAttribute('tabindex', on ? '0' : '-1'); }
  const url = new URL(location.href);
  if (mode === 'explore') url.searchParams.set('mode', 'explore'); else { url.searchParams.delete('mode'); url.searchParams.delete('lens'); url.searchParams.delete('scenario'); }
  history.replaceState(history.state, '', url);
  if (mode === 'story') {
    stopScenario(); app.lens = null; app.selected = null; app.canvas.markSelected(null, []); app.canvas.markMatches([]);
    $('panelHead').hidden = window.innerWidth > PHONE;
    if (!silent) app.story.goTo(app.story.index());
  } else {
    app.story.stop(); clearPackets(app.canvas); clearBadges(app.canvas);
    $('panelHead').hidden = true;
    refreshCanvasState(); renderExplorePanel();
  }
  updateSheet();
}

/** Re-apply the canvas state for the current mode (after a re-render or a layer toggle). */
function refreshCanvasState() {
  if (app.mode === 'story') {
    const ch = app.story.chapter();
    if (ch) app.canvas.spotlight(ch.focus || {}); else app.canvas.clearSpotlight();
  } else if (app.scenario) {
    showScenarioStep();
  } else if (app.lens) {
    const lens = (app.map.lenses || []).find((l) => l.id === app.lens);
    app.canvas.applyState({ lit: lens?.nodes || [], related: lens?.edges || [], dim: true, veil: false });
  } else app.canvas.clearSpotlight();
  if (app.selected) app.canvas.markSelected(app.selected, edgesOf(app.selected).map((e) => e.id));
}

// ---------------------------------------------------------------- story bar
function renderModeSwitch() {
  const { i18n } = app; const el = $('modeSwitch');
  el.setAttribute('aria-label', i18n.t('mode'));
  el.innerHTML = ['story', 'explore'].map((m) => `<button type="button" role="radio" data-mode="${m}" aria-checked="${app.mode === m}" tabindex="${app.mode === m ? 0 : -1}">${esc(i18n.t(m))}</button>`).join('');
  for (const b of el.querySelectorAll('[data-mode]')) b.addEventListener('click', () => setMode(b.dataset.mode));
  // renderModeSwitch runs again on every language change: wire the container once or the arrow keys flip twice.
  if (el.dataset.wired) return;
  el.dataset.wired = '1';
  el.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); const next = app.mode === 'story' ? 'explore' : 'story'; setMode(next); el.querySelector(`[data-mode="${next}"]`).focus();
  });
}

function renderExploreControls() {
  const { i18n } = app; const el = $('exploreControls');
  const lenses = [{ id: null, label: i18n.t('free') }, ...(app.map.lenses || []).map((l) => ({ id: l.id, label: i18n.pick(l.label) }))];
  el.innerHTML = `
    <div class="lenses" role="group" aria-label="${esc(i18n.t('lenses'))}">${lenses.map((l) => `<button type="button" class="btn" data-lens="${esc(l.id ?? '')}" aria-pressed="${String((app.lens || '') === (l.id || ''))}">${esc(l.label)}</button>`).join('')}</div>
    <div class="search"><label class="search-label t-caption" for="searchInput">${esc(i18n.t('searchLabel'))}</label>
      <input id="searchInput" type="search" autocomplete="off" placeholder="${esc(i18n.t('searchPlaceholder'))}" aria-describedby="searchStatus">
      <ul class="search-results" id="searchResults" hidden></ul></div>
    <span class="search-status" id="searchStatus" role="status"></span>
    <button type="button" class="btn" id="listToggle" aria-pressed="${app.listView}">${esc(i18n.t('listView'))}</button>
    <button type="button" class="btn" id="backToStory">${esc(i18n.t('backToStory'))}</button>`;
  for (const b of el.querySelectorAll('[data-lens]')) b.addEventListener('click', () => setLens(b.dataset.lens || null));
  $('listToggle').addEventListener('click', () => setListView(!app.listView));
  $('backToStory').addEventListener('click', () => setMode('story'));
  const input = $('searchInput');
  input.addEventListener('input', () => runSearch(input.value));
  input.addEventListener('focus', () => app.story.pause());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const first = $('searchResults').querySelector('button'); if (first) first.click(); }
    if (e.key === 'Escape') { e.stopPropagation(); input.value = ''; runSearch(''); }
  });
}

function setLens(id, { keepScenario = false } = {}) {
  app.lens = id;
  if (!keepScenario) stopScenario();
  for (const b of $('exploreControls').querySelectorAll('[data-lens]')) b.setAttribute('aria-pressed', String((b.dataset.lens || '') === (id || '')));
  const url = new URL(location.href); if (id) url.searchParams.set('lens', id); else url.searchParams.delete('lens'); history.replaceState(history.state, '', url);
  const lens = id ? (app.map.lenses || []).find((l) => l.id === id) : null;
  if (id && !lens) throw new Error(`lens: unknown id "${id}"`);
  refreshCanvasState();
  if (keepScenario) return;
  if (lens) app.canvas.fitBounds(app.canvas.boundsFor({ fit: 'nodes', nodes: lens.nodes, pad: 64 }, {}));
  else app.canvas.fitAll(true);
}

// ---------------------------------------------------------------- search (§2.9)
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function searchFields(n) {
  const out = [];
  for (const f of [n.label, n.shortLabel]) for (const l of ['en', 'es']) if (f?.[l]) out.push(f[l]);
  if (n.subtitle) out.push(n.subtitle);
  for (const l of LEVELS) for (const lang of ['en', 'es']) if (n.summary?.[l]?.[lang]) out.push(n.summary[l][lang]);
  for (const f of n.facts || []) for (const l of ['en', 'es']) if (f.text?.[l]) out.push(f.text[l]);
  for (const d of n.docs || []) out.push(docPath(d));
  out.push(n.id);
  return out;
}
function runSearch(q) {
  const { i18n } = app; const list = $('searchResults'); const status = $('searchStatus');
  const needle = fold(q.trim());
  if (!needle) { list.hidden = true; list.innerHTML = ''; status.textContent = ''; app.canvas.markMatches([]); return; }
  const hits = [];
  for (const n of app.map.nodes || []) {
    let best = null;
    for (const f of searchFields(n)) { const i = fold(f).indexOf(needle); if (i !== -1 && (best === null || i < best.i)) best = { i, f }; }
    if (best) hits.push({ n, ...best });
  }
  hits.sort((a, b) => a.i - b.i);
  app.canvas.markMatches(hits.map((h) => h.n.id));
  status.textContent = hits.length ? i18n.t('matchCount', { n: hits.length }) : i18n.t('noMatch', { q: q.trim() });
  list.innerHTML = hits.slice(0, 8).map((h) => {
    const label = i18n.pick(h.n.label); const li = fold(label).indexOf(needle);
    const shown = li !== -1 ? `${esc(label.slice(0, li))}<mark>${esc(label.slice(li, li + needle.length))}</mark>${esc(label.slice(li + needle.length))}` : esc(label);
    const frag = li === -1 ? `<span class="meta">…${esc(h.f.slice(Math.max(0, h.i - 20), h.i + needle.length + 24))}…</span>` : '';
    const lane = (app.map.layers || []).find((l) => l.id === h.n.layer);
    return `<li><button type="button" data-id="${esc(h.n.id)}"><span>${shown}</span><span class="meta">${esc(i18n.pick(lane?.label))}${h.n.status?.maturity ? ` · ${esc(maturityText(h.n))}` : ''}</span>${frag}</button></li>`;
  }).join('');
  list.hidden = !hits.length;
  for (const b of list.querySelectorAll('[data-id]')) b.addEventListener('click', () => { list.hidden = true; selectNode(b.dataset.id, { opener: $('searchInput') }); });
}
function focusSearch() { if (app.mode !== 'explore') setMode('explore'); $('searchInput')?.focus(); }

// ---------------------------------------------------------------- explore panel
function renderExplorePanel() {
  const { i18n, prefs } = app; const body = $('panelBody');
  if (app.listView) return;
  const intro = `<div class="intro"><h2 id="panelTitle" class="t-title">${esc(i18n.t('introTitle'))}</h2><p class="t-body">${esc(i18n.t(`intro${prefs.level[0].toUpperCase()}${prefs.level.slice(1)}`))}</p></div>`;
  const top = app.selected ? detailHtml(nodeById(app.selected)) : (app.scenario ? scenarioHtml() : intro);
  const tabs = [['scenarios', 'scenariosTitle'], ['layers', 'layersTitle'], ['timeline', 'timelineTitle'], ['glossary', 'glossaryTitle']];
  body.innerHTML = `${top}
    <div class="tabs" role="tablist">${tabs.map(([id, key]) => `<button type="button" role="tab" id="tab-${id}" aria-selected="${app.tab === id}" aria-controls="tabpanel" tabindex="${app.tab === id ? 0 : -1}" data-tab="${id}">${esc(i18n.t(key))}</button>`).join('')}</div>
    <div class="tabpanel" id="tabpanel" role="tabpanel" aria-labelledby="tab-${esc(app.tab)}">${tabHtml(app.tab)}</div>`;
  if (app.selected) wireDetail(body);
  if (app.scenario && !app.selected) wireScenarioPlayer(body);
  for (const b of body.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { app.tab = b.dataset.tab; renderExplorePanel(); body.querySelector(`[data-tab="${app.tab}"]`)?.focus(); });
  body.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const ids = tabs.map((t) => t[0]); const i = ids.indexOf(app.tab);
    app.tab = ids[(i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length]; renderExplorePanel(); body.querySelector(`[data-tab="${app.tab}"]`)?.focus();
  });
  wireTab(app.tab, body);
}

function tabHtml(tab) {
  const { i18n } = app;
  if (tab === 'scenarios') {
    return `<ul>${(app.map.scenarios || []).map((s) => `<li><button type="button" data-scenario="${esc(s.id)}" aria-pressed="${app.scenario?.id === s.id}">${esc(i18n.pick(s.label))}</button></li>`).join('')}</ul>`;
  }
  if (tab === 'layers') {
    return `<ul>${(app.map.layers || []).sort((a, b) => a.order - b.order).map((l) => `<li><label><input type="checkbox" data-layer="${esc(l.id)}" ${app.hiddenLayers.has(l.id) ? '' : 'checked'}> <span class="legend-swatch" style="background: var(--lane-${esc(l.hue || l.id)}-fill); border-color: var(--lane-${esc(l.hue || l.id)}-stroke)"></span> ${esc(i18n.pick(l.label))} <span class="meta">— ${esc(i18n.pick(l.subtitle || l.description))}</span></label></li>`).join('')}</ul>`;
  }
  if (tab === 'timeline') {
    const base = app.map.meta?.docsBase || '';
    return `<dl>${(app.map.timeline || []).map((t) => `<dt class="tl-date">${esc(t.date)}</dt><dd>${t.url || t.path ? `<a class="ext" href="${esc(t.url || base + t.path)}" rel="noopener">${esc(i18n.pick(t.label))}</a>` : esc(i18n.pick(t.label))}</dd>`).join('')}</dl>`;
  }
  return `<dl>${(app.map.glossary || []).map((g) => `<dt>${esc(g.term)}</dt><dd>${esc(g[i18n.lang] || g.en || '')}</dd>`).join('')}</dl>`;
}

function wireTab(tab, body) {
  if (tab === 'scenarios') for (const b of body.querySelectorAll('[data-scenario]')) b.addEventListener('click', () => startScenario(b.dataset.scenario));
  if (tab === 'layers') for (const c of body.querySelectorAll('[data-layer]')) c.addEventListener('change', () => setLayerHidden(c.dataset.layer, !c.checked));
}

// ---------------------------------------------------------------- scenarios (edge-driven)
function scenarioSteps(s) {
  return (s.steps || []).map((st) => {
    if (st.edge) { const e = (app.map.edges || []).find((x) => x.id === st.edge); if (!e) throw new Error(`scenario ${s.id}: unknown edge "${st.edge}"`); return { edge: e, note: st.note }; }
    if (st.node) { if (!nodeById(st.node)) throw new Error(`scenario ${s.id}: unknown node "${st.node}"`); return { node: st.node, note: st.note }; }
    return null;
  }).filter(Boolean);
}
function startScenario(id) {
  const s = (app.map.scenarios || []).find((x) => x.id === id);
  if (!s) throw new Error(`scenario: unknown id "${id}"`);
  try { s._steps = scenarioSteps(s); } catch (err) { console.error(err); toast(err.message); return; }
  app.scenario = s; app.scenarioStep = 0; app.tab = 'scenarios';
  if (s.lens && s.lens !== app.lens && (app.map.lenses || []).some((l) => l.id === s.lens)) setLens(s.lens, { keepScenario: true });
  const url = new URL(location.href); url.searchParams.set('scenario', id); history.replaceState(history.state, '', url);
  showScenarioStep(); renderExplorePanel();
}
function stopScenario() {
  clearTimeout(app.scenarioTimer); app.scenarioTimer = null;
  if (!app.scenario) return;
  app.scenario = null; app.scenarioPackets?.cancel(); app.scenarioPackets = null; clearPackets(app.canvas);
  const url = new URL(location.href); url.searchParams.delete('scenario'); history.replaceState(history.state, '', url);
}
function showScenarioStep() {
  const s = app.scenario; if (!s) return;
  const steps = s._steps; const k = app.scenarioStep;
  const done = steps.slice(0, k).filter((x) => x.edge).map((x) => x.edge.id);
  const cur = steps[k]?.edge;
  const lit = new Set();
  for (const st of steps.slice(0, k + 1)) { if (st.edge) { lit.add(st.edge.source); lit.add(st.edge.target); } if (st.node) lit.add(st.node); }
  app.canvas.applyState({ lit: [...lit], related: done, active: cur ? [cur.id] : [], dim: true, veil: false });
  app.scenarioPackets?.cancel(); app.scenarioPackets = null; clearPackets(app.canvas);
  if (cur) {
    try { app.scenarioPackets = runPackets(app.canvas, { mode: 'relay', edges: [cur.id] }, { reduced: reducedMotion(app.prefs.motion), onArrive: (id) => app.canvas.pulseNode(id) }); } catch (err) { console.error(err); }
    const b = unionBounds(nodesBounds(app.canvas.layout(), [cur.source, cur.target], 0), null);
    if (b) app.canvas.fitBounds({ x: b.x - 120, y: b.y - 120, w: b.w + 240, h: b.h + 240 });
  }
}
function scenarioHtml() {
  const { i18n } = app; const s = app.scenario; const steps = s._steps; const k = app.scenarioStep; const st = steps[k];
  const e = st?.edge;
  const who = e ? `${esc(i18n.pick(nodeById(e.source)?.label))} → ${esc(i18n.pick(nodeById(e.target)?.label))}` : esc(i18n.pick(nodeById(st?.node)?.label));
  return `<div class="scenario-player">
    <h2 id="panelTitle" class="t-title">${esc(i18n.pick(s.label))}</h2>
    ${s.intro ? `<p class="t-body-s">${esc(i18n.pick(s.intro))}</p>` : ''}
    <p class="t-caption">${esc(i18n.t('stepOf', { n: k + 1, total: steps.length }))}</p>
    <div class="step"><strong>${who}</strong>${e ? `<div class="proto">${esc(e.kind)} · ${esc(i18n.pick(e.protocol))}</div>` : ''}${st?.note ? `<p>${richText(i18n.pick(typeof st.note === 'object' && st.note[app.prefs.level] ? st.note[app.prefs.level] : st.note))}</p>` : ''}</div>
    <div class="controls">
      <button type="button" class="btn btn-icon" data-sc="prev" aria-label="${esc(i18n.t('previous'))}" ${k === 0 ? 'disabled' : ''}>←</button>
      <button type="button" class="btn btn-icon" data-sc="next" aria-label="${esc(i18n.t('next'))}" ${k >= steps.length - 1 ? 'disabled' : ''}>→</button>
      <button type="button" class="btn" data-sc="play" aria-pressed="${Boolean(app.scenarioTimer)}">${esc(i18n.t(app.scenarioTimer ? 'pause' : 'play'))}</button>
      <button type="button" class="btn" data-sc="stop">${esc(i18n.t('close'))}</button>
    </div></div>`;
}
function wireScenarioPlayer(body) {
  const go = (k) => { app.scenarioStep = clamp(k, 0, app.scenario._steps.length - 1); showScenarioStep(); renderExplorePanel(); };
  body.querySelector('[data-sc="prev"]')?.addEventListener('click', () => { clearTimeout(app.scenarioTimer); app.scenarioTimer = null; go(app.scenarioStep - 1); });
  body.querySelector('[data-sc="next"]')?.addEventListener('click', () => { clearTimeout(app.scenarioTimer); app.scenarioTimer = null; go(app.scenarioStep + 1); });
  body.querySelector('[data-sc="stop"]')?.addEventListener('click', () => { stopScenario(); refreshCanvasState(); renderExplorePanel(); });
  body.querySelector('[data-sc="play"]')?.addEventListener('click', () => {
    if (app.scenarioTimer) { clearTimeout(app.scenarioTimer); app.scenarioTimer = null; renderExplorePanel(); return; }
    const tick = () => {
      if (!app.scenario || app.scenarioStep >= app.scenario._steps.length - 1) { app.scenarioTimer = null; renderExplorePanel(); return; }
      app.scenarioStep += 1; showScenarioStep(); renderExplorePanel();
      app.scenarioTimer = setTimeout(tick, 2600);
    };
    app.scenarioTimer = setTimeout(tick, 2600); renderExplorePanel();
  });
}

// ---------------------------------------------------------------- layers / compact / list view
function relayout() {
  app.layout = computeLayout(app.map, { columns: app.columns, compact: app.compact, hiddenLayers: app.hiddenLayers });
  app.canvas.render(app.layout);
  refreshCanvasState();
}
function setLayerHidden(id, hidden) {
  if (hidden) app.hiddenLayers.add(id); else app.hiddenLayers.delete(id);
  const url = new URL(location.href);
  const list = [...app.hiddenLayers].map((l) => `-${l}`).join(',');
  if (list) url.searchParams.set('layers', list); else url.searchParams.delete('layers');
  history.replaceState(history.state, '', url);
  relayout(); app.canvas.refit();
  renderLayersPop(); if (app.mode === 'explore' && app.tab === 'layers') renderExplorePanel();
}
function setListView(on) {
  app.listView = on;
  $('listView').hidden = !on; $('canvasWrap').hidden = on; $('panel').hidden = on; $('main').classList.toggle('is-list', on);
  $('listToggle')?.setAttribute('aria-pressed', String(on));
  if (on) { app.story.pause(); renderListView(); $('listTitle')?.focus(); } else renderExplorePanel();
}
const listSort = { col: 'layer', dir: 'ascending' };
function renderListView() {
  const { i18n, prefs } = app; const el = $('listView');
  const layers = new Map((app.map.layers || []).map((l) => [l.id, l]));
  const cols = [['layer', 'colLayer'], ['node', 'colNode'], ['status', 'colStatus'], ['fact', 'colKeyFact'], ['sources', 'colSources']];
  const rows = (app.map.nodes || []).map((n) => ({
    id: n.id, layer: i18n.pick(layers.get(n.layer)?.label), order: (layers.get(n.layer)?.order ?? 0) * 100 + (n.order ?? 0),
    node: i18n.pick(n.label), status: [maturityText(n), i18n.pick(n.status?.qualifier)].filter(Boolean).join(' · '), qualifier: i18n.pick(n.status?.qualifier),
    fact: i18n.pick(n.summary?.[prefs.level] || n.summary?.executive), docs: n.docs || [],
  }));
  const key = listSort.col; const dir = listSort.dir === 'ascending' ? 1 : -1;
  rows.sort((a, b) => (key === 'layer' ? (a.order - b.order) : String(a[key]).localeCompare(String(b[key]), i18n.lang)) * dir);
  el.innerHTML = `<h2 id="listTitle" class="t-title" tabindex="-1">${esc(i18n.t('listView'))}</h2>
    <table><thead><tr>${cols.map(([c, k]) => `<th scope="col" ${listSort.col === c ? `aria-sort="${listSort.dir}"` : ''}><button type="button" data-sort="${c}" aria-label="${esc(i18n.t('sortBy', { column: i18n.t(k) }))}">${esc(i18n.t(k))}</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr><td data-col="${esc(i18n.t('colLayer'))}">${esc(r.layer)}</td><td data-col="${esc(i18n.t('colNode'))}"><button type="button" class="link-btn" data-id="${esc(r.id)}">${esc(r.node)}</button></td><td data-col="${esc(i18n.t('colStatus'))}">${esc(r.status)}</td><td data-col="${esc(i18n.t('colKeyFact'))}">${richText(r.fact)}</td><td data-col="${esc(i18n.t('colSources'))}">${r.docs.map((d) => `<a class="ext" href="${esc(docHref(d))}" rel="noopener">${esc(docPath(d))}</a>`).join('<br>')}</td></tr>`).join('')}</tbody></table>`;
  for (const b of el.querySelectorAll('[data-sort]')) b.addEventListener('click', () => {
    if (listSort.col === b.dataset.sort) listSort.dir = listSort.dir === 'ascending' ? 'descending' : 'ascending'; else { listSort.col = b.dataset.sort; listSort.dir = 'ascending'; }
    renderListView(); el.querySelector(`[data-sort="${listSort.col}"]`)?.focus();
  });
  for (const b of el.querySelectorAll('[data-id]')) b.addEventListener('click', () => { setListView(false); if (app.mode !== 'explore') setMode('explore'); selectNode(b.dataset.id, { opener: b }); });
}

// ---------------------------------------------------------------- canvas tools, legend, layers popover
function renderTools() {
  const { i18n } = app; const el = $('canvasTools');
  const btn = (id, key, label, extra = '') => `<button type="button" class="btn${label.length <= 2 ? ' btn-icon' : ''}" id="${id}" aria-label="${esc(i18n.t(key))}" title="${esc(i18n.t(key))}" ${extra}>${esc(label)}</button>`;
  el.innerHTML = `${btn('zoomOut', 'zoomOut', '−')}<output class="btn zoom-level" id="zoomLevel" aria-live="off" aria-label="${esc(i18n.t('zoom'))}">${esc(i18n.t('zoomLevel', { pct: 100 }))}</output>${btn('zoomIn', 'zoomIn', '+')}${btn('fitBtn', 'fit', i18n.t('fit'))}${btn('fsBtn', 'fullscreen', '⛶')}${btn('compactBtn', 'compact', i18n.t('compact'), `aria-pressed="${app.compact}"`)}${btn('legendBtn', 'legend', i18n.t('legend'), 'aria-expanded="false" aria-controls="legendPop"')}${btn('layersBtn', 'layers', i18n.t('layers'), 'aria-expanded="false" aria-controls="layersPop"')}`;
  $('zoomOut').addEventListener('click', () => app.canvas.zoomBy(1 / 1.25));
  $('zoomIn').addEventListener('click', () => app.canvas.zoomBy(1.25));
  $('fitBtn').addEventListener('click', () => app.canvas.fitAll(true));
  $('fsBtn').addEventListener('click', () => { const w = $('canvasWrap'); if (document.fullscreenElement) document.exitFullscreen?.(); else w.requestFullscreen?.(); });
  $('compactBtn').addEventListener('click', () => { app.compact = !app.compact; $('compactBtn').setAttribute('aria-pressed', String(app.compact)); relayout(); app.canvas.refit(); });
  $('legendBtn').addEventListener('click', () => togglePop('legendPop', 'legendBtn'));
  $('layersBtn').addEventListener('click', () => togglePop('layersPop', 'layersBtn'));
  $('canvasHint').textContent = i18n.t('canvasHint');
  renderLegendPop(); renderLayersPop();
}
function togglePop(popId, btnId, force) {
  const pop = $(popId); const btn = $(btnId);
  const open = force ?? pop.hidden;
  for (const other of ['legendPop', 'layersPop']) if (other !== popId) { $(other).hidden = true; }
  $('legendBtn').setAttribute('aria-expanded', 'false'); $('layersBtn').setAttribute('aria-expanded', 'false');
  pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  if (open) { app.story.pause(); pop.querySelector('button, input')?.focus(); } else btn.focus();
}
function renderLegendPop() {
  const { i18n } = app; const pop = $('legendPop');
  const mats = (app.map.maturityLegend || []).map((m) => `<li><span class="pill pill-${esc(m.id)}">${esc(i18n.pick(m.label))}</span><span>${esc(i18n.pick(m.meaning))}</span></li>`).join('');
  const lanes = (app.map.layers || []).map((l) => `<li><span class="legend-swatch" style="background: var(--lane-${esc(l.hue || l.id)}-fill); border-color: var(--lane-${esc(l.hue || l.id)}-stroke)"></span><span><strong style="color: var(--lane-${esc(l.hue || l.id)}-text)">${esc(i18n.pick(l.label))}</strong> — ${esc(i18n.pick(l.subtitle || l.description))}</span></li>`).join('');
  const dash = { call: '', verdict: '', read: '2 4', drive: '', gate: '', inherit: '8 4', propose: '2 3', evidence: '1 3', ship: '4 4', orthogonal: '6 3' };
  const kinds = EDGE_KINDS.map((k) => `<li><svg class="legend-edge" viewBox="0 0 34 14" aria-hidden="true"><line x1="1" y1="7" x2="33" y2="7" stroke="currentColor" stroke-width="${k === 'gate' ? 3 : 2}" stroke-dasharray="${dash[k]}"/></svg><span>${esc(i18n.t(`kind${k[0].toUpperCase()}${k.slice(1)}`))}</span></li>`).join('');
  pop.innerHTML = `<h3>${esc(i18n.t('legendMaturity'))}</h3><ul>${mats}</ul><h3>${esc(i18n.t('legendLanes'))}</h3><ul>${lanes}</ul><h3>${esc(i18n.t('legendEdges'))}</h3><ul>${kinds}</ul><div class="close-row"><button type="button" class="btn" data-close>${esc(i18n.t('close'))}</button></div>`;
  pop.querySelector('[data-close]').addEventListener('click', () => togglePop('legendPop', 'legendBtn', false));
}
function renderLayersPop() {
  const { i18n } = app; const pop = $('layersPop');
  pop.innerHTML = `<h3>${esc(i18n.t('layers'))}</h3><ul>${(app.map.layers || []).sort((a, b) => a.order - b.order).map((l) => `<li><label><input type="checkbox" data-layer="${esc(l.id)}" ${app.hiddenLayers.has(l.id) ? '' : 'checked'}> ${esc(i18n.pick(l.label))}</label></li>`).join('')}</ul><div class="close-row"><button type="button" class="btn" data-close>${esc(i18n.t('close'))}</button></div>`;
  for (const c of pop.querySelectorAll('[data-layer]')) c.addEventListener('change', () => setLayerHidden(c.dataset.layer, !c.checked));
  pop.querySelector('[data-close]').addEventListener('click', () => togglePop('layersPop', 'layersBtn', false));
}

// ---------------------------------------------------------------- status strip
function renderStatusStrip() {
  const { i18n, map } = app; const meta = map.meta || {}; const el = $('statusStrip');
  const base = meta.docsBase || '';
  const stale = Number.isFinite(daysSince(meta.asOf)) && daysSince(meta.asOf) > (meta.evidenceWindowDays || 30);
  const banners = [...(stale ? [i18n.t('staleBanner', { date: meta.asOf, asOf: meta.asOf })] : []), ...(meta.warnings || [])];
  el.innerHTML = `${banners.map((b) => `<div class="banner" role="status">${esc(b)} <a href="${esc(`${base}docs/known-limitations.md`)}" rel="noopener">${esc(i18n.t('knownLimitations'))}</a></div>`).join('')}
    <span>${esc(i18n.t('numbersAsOf', { date: meta.asOf || '—' }))}</span><span>·</span>
    <span>${esc(i18n.t('repoAt', { commit: '' })).trim()} <code lang="en">${esc(meta.commit || '—')}</code></span><span>·</span>
    <span>${esc(i18n.t('builtAt', { time: meta.generatedAt || '—', timestamp: meta.generatedAt || '—' }))}</span><span>·</span><span>${esc(i18n.t('license'))}</span><span>·</span>
    <a href="${esc(`${base}docs/known-limitations.md`)}" rel="noopener">${esc(i18n.t('knownLimitations'))}</a><span>·</span>
    <a href="#transcript">${esc(i18n.t('transcript'))}</a><span>·</span>
    <a href="${esc(meta.repoUrl || REPO_URL)}" rel="noopener">${esc(i18n.t('source'))}</a>`;
}

// ---------------------------------------------------------------- phone sheet (§1.4)
const isPhone = () => window.innerWidth <= PHONE;
const SNAPS = ['peek', 'half', 'full'];
function updateSheet() {
  const panel = $('panel'); const handle = $('sheetHandle');
  if (!isPhone()) { handle.hidden = true; panel.classList.remove('is-detail'); $('panelHead').hidden = true; return; }
  handle.hidden = false; $('panelHead').hidden = app.mode !== 'story';
  handle.setAttribute('aria-label', app.i18n.t(panel.dataset.snap === 'full' ? 'hide' : 'show'));
  handle.setAttribute('aria-expanded', String(panel.dataset.snap !== 'peek'));
}
function setSnap(snap) { $('panel').dataset.snap = snap; updateSheet(); }
function wireSheet() {
  const handle = $('sheetHandle'); const panel = $('panel');
  let drag = null;
  handle.addEventListener('pointerdown', (e) => { drag = { y: e.clientY, t: performance.now(), moved: false }; handle.setPointerCapture?.(e.pointerId); });
  handle.addEventListener('pointermove', (e) => { if (drag && Math.abs(e.clientY - drag.y) > 6) drag.moved = true; });
  const end = (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y; const v = dy / Math.max(1, performance.now() - drag.t);
    const i = SNAPS.indexOf(panel.dataset.snap || 'half');
    if (!drag.moved) setSnap(SNAPS[(i + 1) % SNAPS.length]);
    else if (dy < -40 || v < -0.3) setSnap(SNAPS[Math.min(2, i + 1)]);
    else if (dy > 40 || v > 0.3) { if (panel.classList.contains('is-detail')) closeDetailSheet(true); else setSnap(SNAPS[Math.max(0, i - 1)]); }
    drag = null;
  };
  handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', () => { drag = null; });
  handle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const i = SNAPS.indexOf(panel.dataset.snap || 'half'); setSnap(SNAPS[(i + 1) % SNAPS.length]); } });
}
let sheetOpener = null;
function openDetailSheet(opener) {
  sheetOpener = opener || document.activeElement;
  if (isPhone()) {
    const panel = $('panel'); panel.classList.add('is-detail'); app.story.pause();
    const head = $('panelHead'); head.hidden = false;
    head.innerHTML = `<button type="button" class="btn" data-action="close-sheet">${esc(app.i18n.t('close'))}</button>`;
    head.querySelector('[data-action="close-sheet"]').addEventListener('click', () => closeDetailSheet(true));
  }
  $('panelTitle')?.focus?.();
}
function closeDetailSheet(viaUser = false) {
  const panel = $('panel');
  if (panel.classList.contains('is-detail')) {
    panel.classList.remove('is-detail');
    if (app.mode === 'story') app.story.renderStepper(); else $('panelHead').hidden = true;
    if (viaUser) { if (app.mode === 'story' && app.peek) { app.peek = false; app.selected = null; app.canvas.markSelected(null, []); refreshCanvasState(); app.story.showCard(); } else if (app.mode === 'explore') { app.selected = null; app.canvas.markSelected(null, []); refreshCanvasState(); renderExplorePanel(); } }
  }
  updateSheet();
  sheetOpener?.focus?.(); sheetOpener = null;
}

// ---------------------------------------------------------------- shortcuts sheet (?)
function openShortcuts() {
  const { i18n, prefs } = app; const d = $('shortcuts');
  const keys = ['kbTab', 'kbEsc', 'kbSearch', 'kbHelp', 'kbChapters', 'kbHomeEnd', 'kbSpace', 'kbArrows', 'kbSelect', 'kbZoom', 'kbPan'];
  d.innerHTML = `<div class="card"><h2 id="shortcutsTitle" class="t-title">${esc(i18n.t('keyboardShortcuts'))}</h2><ul>${keys.map((k) => `<li>${esc(i18n.t(k))}</li>`).join('')}</ul>
    <label><input type="checkbox" id="shortcutsOn" ${app.shortcutsOn ? 'checked' : ''}> ${esc(i18n.t('shortcutsEnabled'))}</label>
    <label><input type="checkbox" id="motionOn" ${prefs.motion === 'off' ? '' : 'checked'}> ${esc(i18n.t('motion'))}: ${esc(i18n.t(prefs.motion === 'off' ? 'motionOff' : 'motionOn'))}</label>
    <div class="close-row"><button type="button" class="btn" id="shortcutsClose">${esc(i18n.t('close'))}</button></div></div>`;
  d.hidden = false; app.story.pause();
  app.releaseTrap = trapFocus(d, closeShortcuts);
  $('shortcutsOn').addEventListener('change', (e) => { app.shortcutsOn = e.target.checked; try { const s = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); s.shortcuts = app.shortcutsOn ? 'on' : 'off'; localStorage.setItem(PREF_KEY, JSON.stringify(s)); } catch { /* session only */ } });
  $('motionOn').addEventListener('change', (e) => { prefs.motion = e.target.checked ? 'auto' : 'off'; setPref('motion', prefs.motion); applyTheme(prefs.theme, prefs.motion); openShortcuts(); });
  $('shortcutsClose').addEventListener('click', closeShortcuts);
  $('shortcutsClose').focus();
}
function closeShortcuts() { const d = $('shortcuts'); if (d.hidden) return; d.hidden = true; app.releaseTrap?.(); app.releaseTrap = null; }

// ---------------------------------------------------------------- keyboard (§2.7)
function onKeydown(e) {
  const t = e.target; const inInput = t.matches?.('input, select, textarea, [contenteditable="true"]');
  if (e.key === 'Escape') {
    if (!$('shortcuts').hidden) { closeShortcuts(); return; }
    if (!$('legendPop').hidden) { togglePop('legendPop', 'legendBtn', false); return; }
    if (!$('layersPop').hidden) { togglePop('layersPop', 'layersBtn', false); return; }
    const results = $('searchResults'); if (results && !results.hidden) { results.hidden = true; return; }
    if (app.selected || app.peek) { clearSelection(); return; }
    if (app.story.isPlaying()) { app.story.pause(); return; }
    if (app.scenarioTimer) { clearTimeout(app.scenarioTimer); app.scenarioTimer = null; renderExplorePanel(); return; }
    if (document.fullscreenElement) document.exitFullscreen?.();
    return;
  }
  if (inInput) return;
  if (app.shortcutsOn && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.key === '/') { e.preventDefault(); focusSearch(); return; }
    if (e.key === '?') { e.preventDefault(); openShortcuts(); return; }
  }
  const inStory = app.mode === 'story' && ($('panel').contains(t) || $('canvasWrap').contains(t) || $('storyBar').contains(t));
  if (!inStory) return;
  const onControl = t.matches?.('button, a, input, select, textarea, [role="button"]');
  if ((e.key === 'ArrowRight' || e.key === 'PageDown') && !t.closest?.('.node')) { e.preventDefault(); app.story.next(); }
  else if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && !t.closest?.('.node')) { e.preventDefault(); app.story.prev(); }
  else if (e.key === 'Home') { e.preventDefault(); app.story.first(); }
  else if (e.key === 'End') { e.preventDefault(); app.story.last(); }
  else if (e.key === ' ' && !onControl) { e.preventDefault(); app.story.toggle(); }
}

// ---------------------------------------------------------------- language / level re-render
function applyLangToDocument() {
  const { i18n, map } = app;
  document.documentElement.lang = i18n.lang;
  document.title = i18n.pick(map.meta?.title) || document.title;
  $('atlasTitle').textContent = i18n.t('mapAria'); $('atlasDesc').textContent = i18n.t('mapDescription');
  $('canvasWrap').setAttribute('aria-label', i18n.t('mapAria'));
  $('skipLink').textContent = i18n.t('skipMap');
  $('shortcuts').setAttribute('aria-label', i18n.t('keyboardShortcuts'));
}
function renderAll() {
  applyLangToDocument();
  renderModeSwitch(); renderExploreControls(); renderTools(); renderStatusStrip();
  relayout();
  if (app.mode === 'story') { app.story.rerender(); if (app.peek && app.selected) selectNode(app.selected); }
  else renderExplorePanel();
  if (app.listView) renderListView();
  app.story.renderTranscript($('transcript'));
  updateSheet();
}
function onLevelChange(level) {
  app.prefs.level = level; setPref('level', level);
  if (app.mode === 'story') { if (app.peek && app.selected) selectNode(app.selected); else app.story.rerender(); }
  else renderExplorePanel();
  if (app.listView) renderListView();
  app.story.renderTranscript($('transcript'));
  app.header?.refresh();
}

// ---------------------------------------------------------------- boot
function readShortcutsPref() { try { return (JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}).shortcuts !== 'off'; } catch { return true; } }

function start(map) {
  app.map = map;
  app.prefs = readPrefs();
  app.i18n = createI18n(map.i18n?.ui || {}, app.prefs.lang);
  app.shortcutsOn = readShortcutsPref();
  applyTheme(app.prefs.theme, app.prefs.motion);
  const params = new URLSearchParams(location.search);
  app.columns = isPhone() ? 6 : 12;
  for (const l of (params.get('layers') || '').split(',')) if (l.startsWith('-')) app.hiddenLayers.add(l.slice(1));
  app.canvas = createCanvas();
  app.header = renderHeader($('header'), {
    i18n: app.i18n, page: 'atlas', prefs: app.prefs,
    on: { level: onLevelChange, lang: () => renderAll(), theme: () => {} },
  });
  app.story = createStory({
    map, i18n: app.i18n, prefs: app.prefs, canvas: app.canvas,
    els: { controls: $('storyControls'), panelHead: $('panelHead'), panelBody: $('panelBody'), transcript: $('transcript') },
    on: { exploreChapter: (ch) => { setMode('explore'); if (ch) app.canvas.applyState({ lit: ch.focus?.nodes, half: ch.focus?.halfLit, related: ch.focus?.edges, halfEdges: ch.focus?.halfLitEdges, dim: true, veil: false }); }, level: onLevelChange, changed: () => {} },
    reduced: () => reducedMotion(app.prefs.motion),
  });
  applyLangToDocument();
  renderModeSwitch(); renderExploreControls(); renderTools(); renderStatusStrip();
  app.layout = computeLayout(map, { columns: app.columns, compact: false, hiddenLayers: app.hiddenLayers });
  app.canvas.render(app.layout);
  app.story.renderTranscript($('transcript'));
  wireSheet();
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('visibilitychange', () => { if (document.hidden) app.story.pause(); });
  $('panel').addEventListener('pointerdown', (e) => { if (!e.target.closest('[data-action="play"], [data-go], [data-action="next"], [data-action="prev"]')) app.story.pause(); }, { passive: true });
  document.addEventListener('fullscreenchange', () => app.canvas.refit());
  let resizeTimer = null;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const cols = isPhone() ? 6 : 12;
      if (cols !== app.columns) { app.columns = cols; relayout(); }
      app.canvas.refit(); updateSheet();
    }, 80);
  }).observe($('canvasWrap'));

  // deep links (§2.10)
  const mode = params.get('mode') === 'explore' ? 'explore' : (map.meta?.defaults?.mode || 'story');
  const ch = params.get('ch') || map.meta?.defaults?.chapter;
  const startIndex = Math.max(0, app.story.indexOf(ch));
  if (mode === 'explore') {
    setMode('explore', { silent: true });
    app.canvas.fitAll(false);
    const lens = params.get('lens'); const scenario = params.get('scenario'); const node = params.get('node');
    try { if (lens) setLens(lens); if (scenario) startScenario(scenario); } catch (err) { console.error(err); toast(err.message); }
    if (node && nodeById(node)) selectNode(node);
  } else {
    setMode('story', { silent: true });
    app.canvas.fitAll(false);
    app.story.goTo(startIndex, { fromUrl: true }).then(() => { const node = params.get('node'); if (node && nodeById(node)) selectNode(node); }).catch((err) => console.error('[atlas] boot', err));
  }
  updateSheet();
}

loadMap().then(start).catch(showFatal);
