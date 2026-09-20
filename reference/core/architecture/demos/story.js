/**
 * story.js — story mode (design-spec §2.2–§2.4, §4 rendering).
 *
 * Owns chapter sequencing, the narration card (one live region), evidence chips, the
 * stepper + tick rail, autoplay dwell + progress bar, packets, badges, the end card and
 * the transcript. It never touches the SVG directly except through the `canvas` API
 * app.js hands it (spotlight · fitBounds · boundsFor · edge · node · groups), so the
 * chapter logic stays testable without a DOM.
 */

import { formatNumber, pageUrl, toast, copyText, sourceLinksHtml } from './shared.js';
import { pointAt } from './layout.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LEVELS = ['executive', 'architect', 'engineer'];
const CHIP_KINDS = new Set(['generated', 'measured', 'package', 'observed', 'declared']);
const TRY_IT_DEFAULT = ['npx -y @beyondnet/evolith-cli init --name my-project --yes', 'npx -y @beyondnet/evolith-cli validate --engine opa'];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const svg = (tag, attrs = {}) => { const el = document.createElementNS(SVG_NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };

/** `code` spans (backticks) → <code lang="en">, everything else escaped. */
export function richText(text) {
  return esc(text).replace(/`([^`]+)`/g, '<code lang="en">$1</code>');
}

export const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;
export const sortChapters = (chapters) => [...(chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/** Autoplay dwell (§2.4): max(9 s, words × 320 ms) + 900 ms. */
export function chapterDwellMs(chapter, level, lang) {
  const text = chapter?.narration?.[level]?.[lang] || chapter?.narration?.[level]?.en || '';
  return Math.max(9000, wordCount(text) * 320) + 900;
}

/** Chips visible at a level: `levels` missing means every level. */
export const chipsForLevel = (evidence, level) => (evidence || []).filter((c) => !Array.isArray(c.levels) || c.levels.includes(level));

const lookup = (obj, dotted) => String(dotted || '').split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/** A chip → { value, label, asOf, source, kind, unresolved } using meta.metrics + meta.sources. */
export function resolveChip(chip, meta, i18n) {
  const out = { label: i18n.pick(chip.label), asOf: chip.asOf, source: chip.source, kind: chip.kind || 'measured', unresolved: false };
  if (chip.metric) {
    const v = lookup(meta?.metrics, chip.metric);
    const src = meta?.sources?.[chip.metric] || {};
    out.unresolved = v === undefined || v === null || typeof v === 'object';
    out.value = out.unresolved ? i18n.t('unresolvedMetric') : (typeof v === 'number' ? formatNumber(v, i18n.lang) : String(v));
    out.asOf = chip.asOf || src.asOf; out.source = chip.source || src.source; out.kind = chip.kind || src.kind || out.kind;
    if (out.unresolved) console.warn(`[atlas] unresolved metric in chip: ${chip.metric}`);
  } else {
    out.value = i18n.pick(chip.value);
  }
  return out;
}

/** Packet duration: clamp(1.6 s, length / 220 px·s⁻¹, 4 s). */
export const packetDurationMs = (length) => clamp((length / 220) * 1000, 1600, 4000);

/** Remove every packet. */
export function clearPackets(canvas) {
  while (canvas.packetsGroup.firstChild) canvas.packetsGroup.removeChild(canvas.packetsGroup.firstChild);
}

/** Static numbered packets (reduced motion, §2.3). */
function renderStaticPackets(canvas, edgeIds) {
  edgeIds.forEach((id, i) => {
    const e = canvas.edge(id);
    if (!e || e.hidden) return;
    const p = pointAt(e.points, 0.5);
    const g = svg('g', { class: 'packet-static', transform: `translate(${p.x} ${p.y})` });
    g.appendChild(svg('circle', { r: 8 }));
    const t = svg('text'); t.textContent = String(i + 1); g.appendChild(t);
    canvas.packetsGroup.appendChild(g);
  });
}

/**
 * Animated packets: one `animateMotion` per edge, scheduled by JS. Modes: relay (hand-off),
 * stagger (fixed offset), loop (relay that repeats while active). ≤ 8 in flight.
 * Returns { cancel }. Throws on an unknown edge id (no silent skips).
 */
export function runPackets(canvas, packets, { reduced = false, onArrive, bad = false } = {}) {
  const ids = packets?.edges || [];
  for (const id of ids) if (!canvas.edge(id)) throw new Error(`packets: unknown edge "${id}"`);
  clearPackets(canvas);
  if (!ids.length) return { cancel() {} };
  if (reduced) { renderStaticPackets(canvas, ids); return { cancel: () => clearPackets(canvas) }; }
  const timers = new Set();
  let active = true;
  let inFlight = 0;
  const queue = [];
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (active) fn(); }, ms); timers.add(t); };
  const launch = (id, index) => {
    const e = canvas.edge(id);
    if (!e || e.hidden) return 0;
    const dur = packetDurationMs(e.length);
    const c = svg('circle', { class: `packet${bad && e.kind === 'verdict' ? ' is-bad' : ''}`, r: 5, 'data-kind': e.kind });
    const am = svg('animateMotion', { dur: `${dur}ms`, begin: 'indefinite', fill: 'freeze', path: e.d });
    if (e.offByDefault) { am.setAttribute('keyPoints', '0;0.5'); am.setAttribute('keyTimes', '0;1'); am.setAttribute('calcMode', 'linear'); }
    c.appendChild(am);
    canvas.packetsGroup.appendChild(c);
    inFlight += 1;
    try { am.beginElement(); } catch { /* SMIL unavailable: the static dot below still tells the story */ }
    later(() => {
      inFlight -= 1;
      if (e.offByDefault) { c.classList.add('is-pulsing'); later(() => c.remove(), 1100); } else { c.remove(); onArrive?.(e.target, index); }
      pump();
    }, dur);
    return dur;
  };
  const pump = () => { while (queue.length && inFlight < 8) queue.shift()(); };
  const schedule = () => {
    const mode = packets.mode || 'relay';
    const stagger = packets.staggerMs ?? 350;
    let t = 0;
    ids.forEach((id, i) => {
      const e = canvas.edge(id);
      const dur = packetDurationMs(e.length);
      const at = mode === 'stagger' ? i * stagger : t;
      later(() => { queue.push(() => launch(id, i)); pump(); }, at);
      t = mode === 'stagger' ? Math.max(t, at + dur) : t + dur + (mode === 'loop' ? stagger : 0);
    });
    if (mode === 'loop') later(schedule, t + stagger);
  };
  schedule();
  return { cancel() { active = false; for (const t of timers) clearTimeout(t); timers.clear(); clearPackets(canvas); } };
}

export function clearBadges(canvas) {
  while (canvas.badgesGroup.firstChild) canvas.badgesGroup.removeChild(canvas.badgesGroup.firstChild);
}

/** Transient badges at the top-right of their node (mono 11 on --accent). */
export function showBadges(canvas, badges, i18n) {
  clearBadges(canvas);
  for (const b of badges || []) {
    const n = canvas.node(b.node);
    if (!n || n.hidden) continue;
    const text = i18n.pick(b.text);
    const w = Math.round(text.length * 6.7 + 16);
    const g = svg('g', { class: 'badge', transform: `translate(${n.x + n.w - w + 10} ${n.y - 11})` });
    g.appendChild(svg('rect', { width: w, height: 22 }));
    const t = svg('text', { x: 8, y: 15 }); t.textContent = text; g.appendChild(t);
    canvas.badgesGroup.appendChild(g);
  }
}

/** Evidence chips → <li> markup at a level (Executive: value + date; others + source path). */
export function renderChips(chips, { meta, i18n, level, docsBase }) {
  return chips.map((raw) => {
    const c = resolveChip(raw, meta, i18n);
    const declared = c.kind === 'declared' || c.kind === 'external';
    const title = declared ? ` title="${esc(i18n.t('declaredFigure', { date: c.asOf || '—', source: c.source || '—' }))}"` : '';
    const cls = `value${declared ? ' is-declared' : ''}${c.unresolved ? ' is-na' : ''}`;
    // Citations are prose-shaped ("a.ts:33-72; b.rego (ADR-0101)", "git shortlog -sn"): link only the repo paths.
    const src = c.source ? sourceLinksHtml(c.source, docsBase) : '';
    const kindText = CHIP_KINDS.has(c.kind) ? i18n.t(`evidence${c.kind[0].toUpperCase()}${c.kind.slice(1)}`) : c.kind;
    const meta2 = [c.asOf ? esc(i18n.t('asOf', { date: c.asOf })) : '', level === 'executive' ? '' : src, level === 'executive' ? '' : esc(kindText)].filter(Boolean).join(' · ');
    return `<li class="chip-card" data-kind="${esc(c.kind)}"><span class="${cls}"${title}>${esc(c.value)}</span><span class="label">${esc(c.label)}</span>${meta2 ? `<span class="meta">${meta2}</span>` : ''}</li>`;
  }).join('');
}

const sourcePath = (s) => (typeof s === 'string' ? s : (typeof s.path === 'string' ? s.path : (s.url || '')));
const sourceHref = (docsBase, s) => (typeof s === 'string' ? docsBase + s : s.url || (docsBase + sourcePath(s) + (s.anchor ? `#${s.anchor}` : '')));
export function renderSources(sources, { docsBase, i18n }) {
  if (!sources?.length) return '';
  const links = sources.map((s) => `<a class="ext" href="${esc(sourceHref(docsBase, s))}" rel="noopener">${esc(sourcePath(s))}${s.anchor && typeof s !== 'string' ? `#${esc(s.anchor)}` : ''}</a>`).join(' · ');
  return `<p class="sources"><strong>${esc(i18n.t('sources'))}:</strong> ${links}</p>`;
}

/**
 * createStory(deps) → the story controller.
 * deps: { map, i18n, prefs, canvas, els: { controls, panelHead, panelBody, transcript }, on: { exploreChapter, changed }, reduced() }
 */
export function createStory(deps) {
  const { map, i18n, prefs, canvas, els, on } = deps;
  const chapters = sortChapters(map.chapters);
  const docsBase = map.meta?.docsBase || '';
  const state = { index: 0, playing: false, seq: 0, packets: null, dwellTimer: null, dwellStart: 0, dwellMs: 0, raf: 0 };
  const reduced = () => Boolean(deps.reduced?.());
  const lanesById = new Map((map.layers || []).map((l) => [l.id, l]));
  const nodesById = new Map((map.nodes || []).map((n) => [n.id, n]));

  function updateUrl(id) {
    const url = new URL(location.href);
    if (id) url.searchParams.set('ch', id); else url.searchParams.delete('ch');
    url.searchParams.delete('node');
    history.replaceState(history.state, '', url);
  }

  function litLanes(ch) {
    const seen = new Set();
    for (const id of ch.focus?.nodes || []) { const n = nodesById.get(id); if (n) seen.add(n.layer); }
    return [...seen].map((id) => i18n.pick(lanesById.get(id)?.label)).filter(Boolean).join(' · ');
  }

  /** The narration card. Built once; later chapters rewrite its parts in one pass. */
  function renderCard(ch) {
    const level = prefs.level;
    const prev = state.index > 0 ? chapters[state.index - 1] : null;
    const kicker = [prev ? i18n.pick(prev.question) : '', litLanes(ch)].filter(Boolean).join(' · ');
    const field = ch.narration?.[level];
    const fallbackEn = i18n.lang === 'es' && field && !field.es;
    const chips = chipsForLevel(ch.evidence, level);
    const posterHref = pageUrl('poster', prefs, { ch: ch.id, tour: 1 });
    els.panelBody.innerHTML = `
      <article class="narration-card">
        <p class="kicker t-caption">${esc(kicker)}</p>
        <h2 id="panelTitle" class="t-title">${esc(i18n.pick(ch.title))}</h2>
        <p class="hook t-heading">${esc(i18n.pick(ch.hook))}</p>
        <p id="narration" class="narration t-body" aria-live="polite" aria-atomic="true">${richText(i18n.pick(field))}${fallbackEn ? `<span class="en-caption" lang="en">${esc(i18n.t('enCaption'))}</span>` : ''}</p>
        <ul class="evidence" aria-label="${esc(i18n.t('evidence'))}">${renderChips(chips, { meta: map.meta, i18n, level, docsBase })}</ul>
        ${reduced() && ch.packets?.edges?.length ? `<p class="t-caption">${esc(i18n.t('reducedMotionNote'))}</p>` : ''}
        ${renderSources(ch.sources, { docsBase, i18n })}
        <p class="links">
          <a class="ext" href="${esc(posterHref)}">${esc(i18n.t('seeOnPoster'))}</a>
          <button type="button" class="btn" data-action="explore-chapter">${esc(i18n.t('exploreChapter'))}</button>
        </p>
      </article>`;
    els.panelBody.querySelector('[data-action="explore-chapter"]').addEventListener('click', () => on.exploreChapter?.(ch));
  }

  const TRY_IT = [map.i18n?.ui?.tryItInit?.en || TRY_IT_DEFAULT[0], map.i18n?.ui?.tryItValidate?.en || TRY_IT_DEFAULT[1]];
  function renderEndCard() {
    const cmds = TRY_IT.map((c, i) => `<div class="cmd"><code lang="en">${esc(c)}</code><button type="button" class="btn" data-copy="${i}">${esc(i18n.t('copy'))}</button></div>`).join('');
    els.panelBody.innerHTML = `
      <section class="end-card">
        <h2 id="panelTitle" class="t-title">${esc(i18n.t('endTitle'))}</h2>
        <div class="actions">
          <button type="button" class="btn btn-primary" data-action="replay">${esc(i18n.t('replay'))}</button>
          <button type="button" class="btn" data-action="explore">${esc(i18n.t('exploreMap'))}</button>
          <a class="btn" href="#transcript">${esc(i18n.t('readTranscript'))}</a>
        </div>
        <h3 class="t-heading">${esc(i18n.t('tryIt'))}</h3>
        <div class="try-it">${cmds}<p class="note">${esc(i18n.t('tryItNote'))}</p></div>
      </section>`;
    els.panelBody.querySelector('[data-action="replay"]').addEventListener('click', () => { goTo(0); });
    els.panelBody.querySelector('[data-action="explore"]').addEventListener('click', () => on.exploreChapter?.(null));
    for (const b of els.panelBody.querySelectorAll('[data-copy]')) {
      b.addEventListener('click', async () => { toast(i18n.t((await copyText(TRY_IT[Number(b.dataset.copy)])) ? 'copied' : 'exportError')); });
    }
  }

  const total = () => chapters.length;
  const atEnd = () => state.index >= total();

  function stepperHtml(compact) {
    const n = Math.min(state.index + 1, total());
    const ticks = compact ? '' : `<div class="ticks" role="group" aria-label="${esc(i18n.t('chapterRail'))}">${chapters.map((c, i) => `<button type="button" class="tick${i < state.index ? ' is-done' : ''}" data-go="${i}" aria-label="${esc(i18n.pick(c.title))}" ${i === state.index ? 'aria-current="step"' : ''}></button>`).join('')}</div>`;
    const play = compact ? '' : `<span class="play-wrap"><button type="button" class="btn" data-action="play" aria-pressed="${state.playing}">${esc(i18n.t(state.playing ? 'pause' : 'play'))}</button><span class="progress" role="progressbar" aria-label="${esc(i18n.t('autoplayProgress'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden><i></i></span></span>`;
    const title = compact ? '' : `<span class="bar-title" aria-hidden="true">${esc(atEnd() ? i18n.t('endTitle') : i18n.pick(chapters[state.index]?.title))}</span>`;
    return `${ticks}<div class="stepper">
      <button type="button" class="btn btn-icon" data-action="prev" aria-label="${esc(i18n.t('previousChapter'))}" ${state.index === 0 ? 'disabled' : ''}>←</button>
      <span class="counter" aria-hidden="true">${esc(i18n.t('chapterOf', { n, total: total() }))}</span>
      <button type="button" class="btn btn-icon" data-action="next" aria-label="${esc(i18n.t('nextChapter'))}" ${atEnd() ? 'disabled' : ''}>→</button>
      ${play}</div>${title}`;
  }

  function wireStepper(root) {
    root.querySelector('[data-action="prev"]')?.addEventListener('click', prev);
    root.querySelector('[data-action="next"]')?.addEventListener('click', next);
    root.querySelector('[data-action="play"]')?.addEventListener('click', toggle);
    for (const b of root.querySelectorAll('[data-go]')) b.addEventListener('click', () => goTo(Number(b.dataset.go)));
  }

  function renderStepper() {
    if (els.controls) { els.controls.innerHTML = stepperHtml(false); wireStepper(els.controls); }
    if (els.panelHead) {
      const levelSelect = `<select aria-label="${esc(i18n.t('readingLevel'))}" data-level-select>${LEVELS.map((l) => `<option value="${l}" ${prefs.level === l ? 'selected' : ''}>${esc(i18n.t(l))}</option>`).join('')}</select>`;
      els.panelHead.innerHTML = `${stepperHtml(true)}${levelSelect}`;
      wireStepper(els.panelHead);
      els.panelHead.querySelector('[data-level-select]').addEventListener('change', (e) => on.level?.(e.target.value));
    }
    if (state.playing) showProgress();
  }

  // ---------- autoplay (§2.4) ----------
  function showProgress() {
    const bar = els.controls?.querySelector('.progress');
    if (bar) bar.hidden = false;
  }
  function tickProgress() {
    const bar = els.controls?.querySelector('.progress');
    if (!bar || !state.playing) return;
    const pct = clamp(((performance.now() - state.dwellStart) / state.dwellMs) * 100, 0, 100);
    bar.setAttribute('aria-valuenow', String(Math.round(pct)));
    bar.firstElementChild.style.width = `${pct}%`;
    state.raf = requestAnimationFrame(tickProgress);
  }
  function scheduleDwell() {
    clearTimeout(state.dwellTimer); cancelAnimationFrame(state.raf);
    if (!state.playing || atEnd()) return;
    state.dwellMs = chapterDwellMs(chapters[state.index], prefs.level, i18n.lang);
    state.dwellStart = performance.now();
    showProgress();
    state.raf = requestAnimationFrame(tickProgress);
    state.dwellTimer = setTimeout(() => { if (state.playing) goTo(state.index + 1); }, state.dwellMs);
  }
  function play() {
    if (atEnd()) { goTo(0); }
    state.playing = true;
    renderStepper();
    scheduleDwell();
    on.changed?.();
  }
  function pause() {
    if (!state.playing) return;
    state.playing = false;
    clearTimeout(state.dwellTimer); cancelAnimationFrame(state.raf);
    renderStepper();
    on.changed?.();
  }
  const toggle = () => (state.playing ? pause() : play());

  // ---------- chapter change (§2.3) ----------
  function cancelPending() {
    state.seq += 1;
    state.packets?.cancel(); state.packets = null;
    clearBadges(canvas);
  }

  async function goTo(index, { fromUrl = false } = {}) {
    cancelPending();
    state.index = clamp(index, 0, total());
    clearTimeout(state.dwellTimer); cancelAnimationFrame(state.raf);
    if (atEnd()) {
      state.playing = false;
      updateUrl(null);
      canvas.clearSpotlight();
      renderEndCard(); renderStepper();
      on.changed?.();
      return;
    }
    const ch = chapters[state.index];
    if (!fromUrl) updateUrl(ch.id);
    renderCard(ch); renderStepper();
    canvas.spotlight(ch.focus || {});
    const token = state.seq;
    const bounds = canvas.boundsFor(ch.camera || { fit: 'focus' }, ch.focus || {});
    await canvas.fitBounds(bounds, { animate: !reduced() });
    if (token !== state.seq) return;
    try {
      state.packets = runPackets(canvas, ch.packets, { reduced: reduced(), bad: /exit 2/.test(i18n.pick(ch.badges?.[0]?.text)), onArrive: (id) => canvas.pulseNode?.(id) });
    } catch (err) { console.error(err); toast(String(err.message)); }
    const badgeDelay = reduced() ? 0 : 200;
    setTimeout(() => { if (token === state.seq) showBadges(canvas, ch.badges, i18n); }, badgeDelay);
    scheduleDwell();
    on.changed?.();
  }

  const next = () => { if (!atEnd()) goTo(state.index + 1); };
  const prev = () => { if (state.index > 0) goTo(state.index - 1); };
  const first = () => goTo(0);
  const last = () => goTo(total() - 1);

  /** Re-render text only (level/language change): no camera, no packets restart. */
  function rerender() {
    if (atEnd()) { renderEndCard(); renderStepper(); return; }
    const ch = chapters[state.index];
    renderCard(ch); renderStepper();
    state.packets?.cancel();
    try { state.packets = runPackets(canvas, ch.packets, { reduced: reduced(), onArrive: (id) => canvas.pulseNode?.(id) }); } catch (err) { console.error(err); }
    showBadges(canvas, ch.badges, i18n);
    if (state.playing) scheduleDwell();
  }
  /** Restore the chapter card after a peek detail (no camera move). */
  const showCard = () => rerender();

  function renderTranscript(el) {
    const level = prefs.level;
    const parts = chapters.map((ch) => `
      <article>
        <h2>${esc(String(ch.order))}. ${esc(i18n.pick(ch.title))}</h2>
        <p class="hook">${esc(i18n.pick(ch.hook))}</p>
        <p>${richText(i18n.pick(ch.narration?.[level]))}</p>
        <ul class="evidence" aria-label="${esc(i18n.t('evidence'))}">${renderChips(chipsForLevel(ch.evidence, level), { meta: map.meta, i18n, level, docsBase })}</ul>
        ${renderSources(ch.sources, { docsBase, i18n })}
      </article>`).join('');
    el.innerHTML = `<h2 id="transcriptTitle" class="t-display">${esc(i18n.t('transcript'))}</h2>${parts}`;
  }

  function indexOf(id) {
    const real = map.meta?.aliases?.[id] || id;
    return chapters.findIndex((c) => c.id === real);
  }

  return {
    chapters, goTo, next, prev, first, last, play, pause, toggle, rerender, showCard, renderTranscript, renderStepper, indexOf,
    index: () => state.index, chapter: () => (atEnd() ? null : chapters[state.index]), isPlaying: () => state.playing, atEnd,
    stop() { cancelPending(); state.playing = false; clearTimeout(state.dwellTimer); cancelAnimationFrame(state.raf); },
  };
}
