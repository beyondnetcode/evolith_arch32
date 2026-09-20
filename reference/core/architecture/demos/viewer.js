/**
 * viewer.js — the Vision poster page (master-view.html).
 *
 * Owns the stage (pan / zoom / pinch / dblclick, keys + - 0 F while the stage has focus),
 * the exports (PNG / JPG / SVG at 1× 2× 4×, the tour overlay stripped, the guard-45
 * annotation kept as the first child of <svg>), and the guided tour: eleven stops that
 * are the Atlas's chapters[] — hook + narration[level][lang] + evidence chips — with a
 * camera that fits the union of each stop's poster regions (data-bbox on the SVG groups,
 * never hand-typed rectangles). Preferences, i18n, the header and toasts come from
 * shared.js. Every reader-facing string is an i18n.ui key.
 */

import { readPrefs, applyTheme, reducedMotion, createI18n, renderHeader, toast, pageUrl, urlParams, sourceLinksHtml, REPO_URL } from './shared.js';

const $ = (sel, root = document) => root.querySelector(sel);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const isField = (el) => Boolean(el && el.closest && el.closest('input, select, textarea, [contenteditable="true"]'));

function readData() {
  try { return JSON.parse($('#poster-data').textContent); } catch (err) { console.error('[viewer] poster-data unreadable', err); return null; }
}

const data = readData() || { chapters: [], ui: {}, meta: {} };
const prefs = readPrefs();
applyTheme(prefs.theme, prefs.motion);
document.documentElement.lang = prefs.lang;
const i18n = createI18n(data.ui, prefs.lang);
const t = (key, vars) => i18n.t(key, vars);
const docsBase = data.meta.docsBase || `${REPO_URL}/blob/main/`;

// ---------- stage ----------
const stage = $('#stage');
const pz = $('#pz');
const svg = pz && pz.querySelector('svg');
const zoomLabel = $('#zoomLabel');
const vb = svg && svg.viewBox && svg.viewBox.baseVal;
const W = (vb && vb.width) || 1600;
const H = (vb && vb.height) || 1600;
if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); svg.style.width = `${W}px`; svg.style.height = `${H}px`; }

const cam = { scale: 1, tx: 0, ty: 0, MIN: 0.08, MAX: 16, raf: 0 };
function apply() {
  pz.style.transform = `translate(${cam.tx}px,${cam.ty}px) scale(${cam.scale})`;
  if (zoomLabel) zoomLabel.textContent = `${Math.round(cam.scale * 100)} %`;
}
const stageRect = () => stage.getBoundingClientRect();
function stopAnimation() { if (cam.raf) { cancelAnimationFrame(cam.raf); cam.raf = 0; } }
/** Animate to a camera (620 ms ease-out; instant under reduced motion). */
function animateTo(target, animate) {
  stopAnimation();
  const ms = animate && !reducedMotion(prefs.motion) ? 620 : 0;
  if (!ms) { Object.assign(cam, target); apply(); return; }
  const from = { scale: cam.scale, tx: cam.tx, ty: cam.ty };
  const t0 = performance.now();
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const step = (now) => {
    const k = ease(clamp((now - t0) / ms, 0, 1));
    cam.scale = from.scale + (target.scale - from.scale) * k;
    cam.tx = from.tx + (target.tx - from.tx) * k;
    cam.ty = from.ty + (target.ty - from.ty) * k;
    apply();
    cam.raf = k < 1 ? requestAnimationFrame(step) : 0;
  };
  cam.raf = requestAnimationFrame(step);
}
/** What overlays the stage: the toolbar (top ≥ 900 px, bottom below) and a fixed bottom sheet. */
function insets() {
  const out = { top: 0, bottom: 0 };
  const toolbar = $('.toolbar');
  if (toolbar) {
    const h = toolbar.getBoundingClientRect().height + 12;
    if (getComputedStyle(toolbar).top === 'auto') out.bottom += h; else out.top += h;
  }
  const drawer = $('#drawer');
  if (drawer && !drawer.hidden && getComputedStyle(drawer).position === 'fixed') out.bottom = Math.max(out.bottom, drawer.getBoundingClientRect().height);
  return out;
}
/** Fit a viewBox-space box (with `pad` units around it) into the part of the stage nothing covers. */
function fitBox(box, pad, animate) {
  const r = stageRect(); const ins = insets();
  const availW = Math.max(120, r.width); const availH = Math.max(120, r.height - ins.top - ins.bottom);
  const scale = clamp(Math.min(availW / (box.w + 2 * pad), availH / (box.h + 2 * pad)), cam.MIN, cam.MAX);
  animateTo({ scale, tx: (availW - box.w * scale) / 2 - box.x * scale, ty: ins.top + (availH - box.h * scale) / 2 - box.y * scale }, animate);
}
const fit = (animate = false) => fitBox({ x: 0, y: 0, w: W, h: H }, W * 0.03, animate);
function zoomAt(cx, cy, f) {
  stopAnimation();
  const ns = clamp(cam.scale * f, cam.MIN, cam.MAX); const k = ns / cam.scale;
  cam.tx = cx - (cx - cam.tx) * k; cam.ty = cy - (cy - cam.ty) * k; cam.scale = ns; apply();
}
const zoomCentre = (f) => { const r = stageRect(); zoomAt(r.width / 2, r.height / 2, f); };

function wireStage() {
  stage.addEventListener('wheel', (e) => { e.preventDefault(); const r = stageRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  const pts = new Map(); let drag = false; let pinch = 0;
  stage.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch { /* capture is best-effort */ }
    if (pts.size === 1) { drag = true; stage.classList.add('grabbing'); stopAnimation(); }
    tour.pause();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = stageRect();
    if (pts.size === 2) {
      const v = [...pts.values()]; const d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
      if (pinch) zoomAt((v[0].x + v[1].x) / 2 - r.left, (v[0].y + v[1].y) / 2 - r.top, d / pinch);
      pinch = d;
    } else if (drag) { cam.tx += e.clientX - prev.x; cam.ty += e.clientY - prev.y; apply(); }
  });
  const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (pts.size === 0) { drag = false; stage.classList.remove('grabbing'); } };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('dblclick', (e) => { const r = stageRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 1.6); });
  // Single-character shortcuts only while the stage itself has focus (WCAG 2.1.4).
  stage.addEventListener('keydown', (e) => {
    if (e.target !== stage) return;
    const map = { '+': () => zoomCentre(1.25), '=': () => zoomCentre(1.25), '-': () => zoomCentre(1 / 1.25), '_': () => zoomCentre(1 / 1.25), '0': () => fit(true), f: fullscreen, F: fullscreen };
    if (map[e.key]) { e.preventDefault(); map[e.key](); }
  });
}
function fullscreen() {
  if (!document.fullscreenElement) (document.documentElement.requestFullscreen || (() => {})).call(document.documentElement);
  else document.exitFullscreen();
}

// ---------- export ----------
const FILE = 'evolith-e2e-product-vision';
/** A clean copy of the poster: no viewer-only overlay, no inline sizing; the annotation comment stays the first child. */
function exportClone(scale = 1) {
  const clone = svg.cloneNode(true);
  clone.querySelectorAll('[data-viewer-only]').forEach((n) => n.remove());
  clone.style.width = ''; clone.style.height = '';
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox', `0 0 ${W} ${H}`);
  clone.setAttribute('width', String(W * scale)); clone.setAttribute('height', String(H * scale));
  return clone;
}
const annotationText = () => { const c = [...svg.childNodes].find((n) => n.nodeType === Node.COMMENT_NODE); return c ? c.data.trim() : ''; };
function download(href, ext) {
  const a = document.createElement('a'); a.href = href; a.download = `${FILE}.${ext}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
function exportSvg() {
  const body = new XMLSerializer().serializeToString(exportClone(1));
  const note = annotationText();
  const text = `<?xml version="1.0" encoding="UTF-8"?>\n${note ? `<!-- ${note} -->\n` : ''}${body}\n`;
  download(URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' })), 'svg');
}
function exportRaster(mime, ext) {
  const scale = parseInt(($('#res') || {}).value, 10) || 2;
  const buttons = document.querySelectorAll('.toolbar .dl');
  const reset = () => buttons.forEach((b) => { b.disabled = false; });
  buttons.forEach((b) => { b.disabled = true; });
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(exportClone(scale))], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob((blob) => { if (!blob) { toast(t('exportError')); } else download(URL.createObjectURL(blob), ext); reset(); }, mime, mime === 'image/jpeg' ? 0.95 : undefined);
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast(t('exportError')); reset(); };
  img.src = url;
}

// ---------- tour ----------
const chapters = [...(data.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
const stops = [{ overview: true }, ...chapters];
const tour = {
  index: -1,
  timer: 0, t0: 0, dwell: 0, playing: false, raf: 0,
  get open() { return this.index >= 0; },
  pause() { if (this.playing) this.setPlaying(false); },
  setPlaying(on) {
    this.playing = on;
    clearTimeout(this.timer); cancelAnimationFrame(this.raf);
    const bar = $('#progress');
    const btn = $('[data-a="play"]');
    if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', t(on ? 'pause' : 'play')); btn.textContent = on ? '⏸' : '⏵'; }
    if (bar) { bar.hidden = !on; bar.setAttribute('aria-valuenow', '0'); $('.bar', bar).style.width = '0%'; }
    if (!on) return;
    const stop = stops[this.index];
    const words = stop.overview ? 40 : String(narrationOf(stop)).split(/\s+/).length;
    this.dwell = Math.max(9000, words * 320) + 900;
    this.t0 = performance.now();
    const tick = (now) => {
      const k = clamp((now - this.t0) / this.dwell, 0, 1);
      if (bar) { bar.setAttribute('aria-valuenow', String(Math.round(k * 100))); $('.bar', bar).style.width = `${k * 100}%`; }
      if (k < 1) this.raf = requestAnimationFrame(tick);
      else if (this.index < stops.length - 1) { go(this.index + 1); this.setPlaying(true); }
      else this.setPlaying(false);
    };
    this.raf = requestAnimationFrame(tick);
  },
};
const pick = (field) => i18n.pick(field);
/** "as of 2026-09-19" whether the ui string is "as of" or "as of {date}". */
const asOf = (date) => { const s = t('asOf', { date }); return s.includes(date) ? s : `${s} ${date}`; };
const narrationOf = (stop) => pick(stop.narration && (stop.narration[prefs.level] || stop.narration.executive));

function bboxOf(id) {
  const el = svg && svg.getElementById(id);
  const raw = el && el.getAttribute('data-bbox');
  if (!raw) { console.warn(`[viewer] poster region "${id}" not found`); return null; }
  const [x, y, w, h] = raw.split(' ').map(Number);
  return { x, y, w, h };
}
function unionOf(ids) {
  const boxes = ids.map(bboxOf).filter(Boolean);
  if (!boxes.length) return null;
  const x1 = Math.min(...boxes.map((b) => b.x)); const y1 = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w)); const y2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { boxes, union: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } };
}
const SVG_NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => { const el = document.createElementNS(SVG_NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };
/** Viewer-only overlay: a veil masked out over the lit regions plus an accent ring per region. */
function overlay(boxes) {
  svg.querySelectorAll('[data-viewer-only]').forEach((n) => n.remove());
  if (!boxes || !boxes.length) return;
  const defs = svgEl('defs', { 'data-viewer-only': '1' });
  const mask = svgEl('mask', { id: 'tourMask' });
  mask.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));
  for (const b of boxes) mask.appendChild(svgEl('rect', { x: b.x - 6, y: b.y - 6, width: b.w + 12, height: b.h + 12, rx: 14, fill: '#000' }));
  defs.appendChild(mask); svg.appendChild(defs);
  svg.appendChild(svgEl('rect', { class: 'tour-dim', 'data-viewer-only': '1', x: 0, y: 0, width: W, height: H, mask: 'url(#tourMask)' }));
  for (const b of boxes) svg.appendChild(svgEl('rect', { class: 'tour-ring', 'data-viewer-only': '1', x: b.x - 6, y: b.y - 6, width: b.w + 12, height: b.h + 12, rx: 14 }));
}
function camera(stop, animate = true) {
  if (stop.overview) { overlay(null); fit(animate); return; }
  const found = unionOf((stop.poster && stop.poster.regions) || []);
  if (!found) { overlay(null); fit(animate); return; }
  overlay(found.boxes);
  fitBox(found.union, 48, animate);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Inline `code` spans stay language-neutral. */
const rich = (text) => esc(text).replace(/`([^`]+)`/g, '<code lang="en">$1</code>');
function sourceHref(src) {
  if (!src) return null;
  if (/^https?:/.test(src)) return src;
  const m = /^([^:\s]+)(?::(\d+)(?:-(\d+))?)?$/.exec(src);
  if (!m) return null;
  return `${docsBase}${m[1]}${m[2] ? `#L${m[2]}${m[3] ? `-L${m[3]}` : ''}` : ''}`;
}
function chipsHtml(stop) {
  const items = (stop.evidence || []).filter((e) => !e.levels || e.levels.includes(prefs.level));
  if (!items.length) return '';
  const showSource = prefs.level !== 'executive';
  return `<ul class="evidence" aria-label="${esc(t('evidence'))}">${items.map((e) => {
    // Same citation grammar as the Atlas chips: repo paths become links, prose stays text.
    const src = showSource && e.source ? sourceLinksHtml(e.source, docsBase) : '';
    const declared = e.kind === 'declared' || e.kind === 'observed' ? ` title="${esc(asOf(e.asOf || ''))} · ${esc(e.source || '')}"` : '';
    return `<li data-kind="${esc(e.kind || '')}"${declared}><div class="value">${esc(pick(e.value))}</div><div class="label">${esc(pick(e.label))}</div><div class="meta">${esc(asOf(e.asOf || ''))}${src ? ` · ${src}` : ''}</div></li>`;
  }).join('')}</ul>`;
}
function sourcesHtml(stop) {
  const list = (stop.sources || []).filter((s) => s && (s.url || s.path));
  if (!list.length) return '';
  return `<p class="sources">${esc(t('sources'))}: ${list.map((s) => `<a href="${esc(s.url || sourceHref(s.path))}" rel="noopener">${esc(pick(s.label) || s.path)}</a>`).join(' · ')}</p>`;
}
function stopHtml(stop, n) {
  if (stop.overview) {
    const desc = svg && svg.querySelector('desc');
    return `<h2 id="drawerTitle" tabindex="-1">${esc(t('posterAlt'))}</h2><p class="narration t-body" lang="en">${esc(desc ? desc.textContent : '')}</p>`
      + `<a class="btn atlas-link" href="${esc(pageUrl('atlas', prefs))}">${esc(t('openAtlas'))} →</a>`;
  }
  return `<h2 id="drawerTitle" tabindex="-1">${esc(pick(stop.title))}</h2>`
    + (stop.hook ? `<p class="hook t-heading">${esc(pick(stop.hook))}</p>` : '')
    + `<p class="narration t-body">${rich(narrationOf(stop))}</p>${chipsHtml(stop)}${sourcesHtml(stop)}`
    + `<a class="btn atlas-link" href="${esc(pageUrl('atlas', prefs, { ch: stop.id }))}">${esc(t('animateInAtlas'))}</a>`;
}
function renderStop() {
  const stop = stops[tour.index]; if (!stop) return;
  const n = tour.index; const total = chapters.length;
  const title = stop.overview ? t('overview') : t('stepTitle', { n, total, title: pick(stop.title) });
  $('#counter').textContent = title;
  $('#stopLive').innerHTML = stopHtml(stop, n);
  $('[data-a="prev"]').disabled = n === 0;
  $('[data-a="next"]').disabled = n === stops.length - 1;
  document.querySelectorAll('.ticks button').forEach((b, i) => { if (i + 1 === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
}
function writeUrl(stop) {
  const url = new URL(location.href);
  url.searchParams.delete('band');
  if (!stop) { url.searchParams.delete('ch'); url.searchParams.delete('tour'); } else { url.searchParams.set('tour', '1'); if (stop.id) url.searchParams.set('ch', stop.id); else url.searchParams.delete('ch'); }
  history.replaceState(history.state, '', url);
}
function go(index, { animate = true, focus = true } = {}) {
  tour.index = clamp(index, 0, stops.length - 1);
  const drawer = $('#drawer'); drawer.hidden = false; document.body.dataset.tour = '1';
  const tb = $('[data-a="tour"]'); tb.setAttribute('aria-pressed', 'true'); tb.setAttribute('aria-expanded', 'true'); tb.textContent = t('exitTour');
  renderStop();
  writeUrl(stops[tour.index]);
  camera(stops[tour.index], animate);
  if (focus) { const h = $('#drawerTitle'); if (h) h.focus({ preventScroll: true }); }
}
function closeTour() {
  if (!tour.open) return;
  tour.pause(); tour.index = -1;
  $('#drawer').hidden = true; delete document.body.dataset.tour;
  const tb = $('[data-a="tour"]'); tb.setAttribute('aria-pressed', 'false'); tb.setAttribute('aria-expanded', 'false'); tb.textContent = t('startTour');
  overlay(null); writeUrl(null);
  fit(true);
  tb.focus();
}
const stepTour = (d) => { if (tour.open) { tour.pause(); go(tour.index + d); } };
function fitBand(n) {
  const box = bboxOf(`band-${n}`);
  if (box) fitBox(box, 48, false);
}

// ---------- chrome ----------
function relabel() {
  document.title = t('posterAlt');
  const set = (sel, key, attr) => document.querySelectorAll(sel).forEach((el) => { if (attr) el.setAttribute(attr, t(key)); else el.textContent = t(key); });
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); if (el.hasAttribute('title')) el.setAttribute('title', t(el.dataset.i18nLabel)); });
  set('.toolbar', 'diagramControls', 'aria-label');
  $('#caption').textContent = t('posterCaption', { asOf: data.meta.asOf || '', commit: data.meta.commit || '' });
  const tb = $('[data-a="tour"]'); if (tb) tb.textContent = t(tour.open ? 'exitTour' : 'startTour');
  const play = $('[data-a="play"]'); if (play) play.setAttribute('aria-label', t(tour.playing ? 'pause' : 'play'));
  document.querySelectorAll('.ticks button').forEach((b, i) => { b.setAttribute('aria-label', t('stepTitle', { n: i + 1, total: chapters.length, title: pick(chapters[i].title) })); });
  if (tour.open) renderStop();
}
function buildTicks() {
  const rail = $('.ticks'); if (!rail) return;
  rail.innerHTML = chapters.map((c, i) => `<li><button type="button" data-stop="${i + 1}" aria-label="${esc(pick(c.title))}"></button></li>`).join('');
  rail.addEventListener('click', (e) => { const b = e.target.closest('[data-stop]'); if (b) { tour.pause(); go(Number(b.dataset.stop)); } });
}
function wireChrome() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    const actions = {
      in: () => zoomCentre(1.25), out: () => zoomCentre(1 / 1.25), fit: () => fit(true), full: fullscreen,
      png: () => exportRaster('image/png', 'png'), jpg: () => exportRaster('image/jpeg', 'jpg'), svg: exportSvg,
      tour: () => (tour.open ? closeTour() : go(0)), prev: () => stepTour(-1), next: () => stepTour(1), close: closeTour,
      play: () => tour.setPlaying(!tour.playing),
      handle: () => {
        // Snap points of the bottom sheet: half (default) → full → peek → half.
        const d = $('#drawer');
        const next = d.classList.contains('is-full') ? 'is-peek' : d.classList.contains('is-peek') ? '' : 'is-full';
        d.classList.remove('is-full', 'is-peek'); if (next) d.classList.add(next);
        b.setAttribute('aria-expanded', String(next === 'is-full'));
        if (tour.open) camera(stops[tour.index], false);
      },
    };
    if (actions[a]) actions[a]();
  });
  document.addEventListener('keydown', (e) => {
    if (isField(e.target)) return;
    if (e.key === 'Escape') {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      if (tour.open) { e.preventDefault(); closeTour(); }
      return;
    }
    if (!tour.open) return;
    const inScope = e.target === stage || e.target.closest('#drawer, #stage');
    if (!inScope || e.target.closest('button, a')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); stepTour(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); stepTour(-1); }
    else if (e.key === 'Home') { e.preventDefault(); tour.pause(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); tour.pause(); go(stops.length - 1); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) tour.pause(); });
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (tour.open) camera(stops[tour.index], false); }, 120); });
}

// ---------- boot ----------
function boot() {
  if (!stage || !pz || !svg) { console.error('[viewer] stage or SVG missing'); return; }
  renderHeader($('#header'), {
    i18n, page: 'poster', prefs,
    on: {
      lang: () => { relabel(); },
      level: () => { if (tour.open) { renderStop(); if (tour.playing) tour.setPlaying(true); } },
      theme: () => { /* the poster stays light; the shell follows the tokens */ },
    },
  });
  buildTicks();
  relabel();
  wireStage();
  wireChrome();
  fit(false);
  const q = urlParams();
  const ch = q.get('ch');
  const alias = (data.meta.aliases || {})[ch] || ch;
  const idx = alias ? stops.findIndex((s) => s.id === alias) : -1;
  if (idx > 0) go(idx, { animate: false, focus: false });
  else if (q.get('tour') === '1') go(0, { animate: false, focus: false });
  else if (/^[1-6]$/.test(q.get('band') || '')) fitBand(q.get('band'));
}
boot();
