#!/usr/bin/env node
/**
 * @file generate-master-view-viewer.mjs
 * @description Wraps the rendered poster SVG in `master-view.html`: the shared shell
 * (pages.css / tokens.css / shared.js header), the pan-zoom stage, the toolbar, the
 * guided-tour drawer, the caption strip and a generated "read the poster as text"
 * transcript. Behaviour lives in `reference/core/architecture/demos/viewer.js`, styling
 * in `viewer.css`; this template only lays the DOM out and embeds the data the page
 * needs (`chapters[]`, `i18n.ui`, meta) as a JS value in `<script id="poster-data">` (never DOM text).
 *
 *   renderViewer(svg, map) → string
 *
 * The HTML is pre-labelled in English from `i18n.ui`; viewer.js re-labels at runtime for
 * the reader's language. A missing ui key falls back to the key itself and is reported on
 * stderr so the content table can be completed.
 */

import { posterTranscript } from './pages/poster/render.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap';
/** The i18n.ui keys this page reads (shared.js header + viewer.js); the rest of the table stays in the Atlas. */
export const VIEWER_UI_KEYS = [
  'pagesNav', 'navAtlas', 'navPoster', 'settings', 'readingLevel', 'executive', 'architect', 'engineer', 'switchLang', 'themeAria', 'themeAuto', 'themeLight', 'themeDark', 'openRepo', 'openAtlas',
  'posterAlt', 'posterCaption', 'posterKeys', 'readPosterAsText', 'skipPoster', 'diagramControls', 'zoom', 'zoomIn', 'zoomOut', 'fit', 'fullscreen',
  'tour', 'startTour', 'exitTour', 'chapterRail', 'overview', 'previous', 'next', 'play', 'pause', 'resolution', 'downloadPng', 'downloadJpg', 'downloadSvg', 'stepTitle',
  'stepOf', 'evidence', 'sources', 'asOf', 'animateInAtlas', 'exportError',
];
/** Reads the preference chain before first paint so the shell never flashes the wrong theme. */
const THEME_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get("theme"),s=JSON.parse(localStorage.getItem("evolith.pages.v1")||"{}"),t=q||s.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;var m=q?null:s.motion;if(m==="on"||m==="off")document.documentElement.dataset.motion=m;}catch(e){}})();`;

function labeller(ui) {
  const missing = new Set();
  const t = (key) => { const e = ui && ui[key]; if (e && e.en) return e.en; missing.add(key); return key; };
  return { t, missing };
}

function transcriptHtml(svg, t) {
  const sections = posterTranscript(svg).map((sec) => {
    const heading = sec.title || sec.id;
    return `<section aria-labelledby="tx-${esc(sec.id)}"><h2 id="tx-${esc(sec.id)}">${heading}</h2>${sec.lines.map((l) => `<p>${l}</p>`).join('')}</section>`;
  }).join('\n');
  return `<details id="transcript" class="poster-transcript"><summary data-i18n="readPosterAsText">${esc(t('readPosterAsText'))}</summary><div lang="en">${sections}</div></details>`;
}

function toolbarHtml(t) {
  const btn = (a, key, glyph) => `<button type="button" class="btn btn-icon" data-a="${a}" data-i18n-label="${key}" aria-label="${esc(t(key))}" title="${esc(t(key))}"><span aria-hidden="true">${glyph}</span></button>`;
  const dl = (a, key, glyph) => `<button type="button" class="btn dl" data-a="${a}" data-i18n-label="${key}" aria-label="${esc(t(key))}" title="${esc(t(key))}"><span aria-hidden="true">${glyph}</span></button>`;
  return `<div class="toolbar" role="toolbar" aria-label="${esc(t('diagramControls'))}">
  <div class="tb-group">
    ${btn('out', 'zoomOut', '−')}<output class="zoom" id="zoomLabel" data-i18n-label="zoom" aria-label="${esc(t('zoom'))}">100 %</output>${btn('in', 'zoomIn', '+')}${btn('fit', 'fit', '⤢')}${btn('full', 'fullscreen', '⛶')}
  </div>
  <div class="tb-group" role="group" data-i18n-label="tour" aria-label="${esc(t('tour'))}">
    ${btn('prev', 'previous', '◀')}<button type="button" class="btn" data-a="tour" aria-pressed="false" aria-expanded="false" aria-controls="drawer">${esc(t('startTour'))}</button>${btn('next', 'next', '▶')}
    <ol class="ticks" data-i18n-label="chapterRail" aria-label="${esc(t('chapterRail'))}"></ol>
  </div>
  <div class="tb-group">
    <select id="res" class="res" data-i18n-label="resolution" aria-label="${esc(t('resolution'))}"><option value="1">1×</option><option value="2" selected>2×</option><option value="4">4×</option></select>
    ${dl('png', 'downloadPng', 'PNG')}${dl('jpg', 'downloadJpg', 'JPG')}${dl('svg', 'downloadSvg', 'SVG')}
  </div>
</div>`;
}

function drawerHtml(t) {
  const btn = (a, key, glyph) => `<button type="button" class="btn btn-icon" data-a="${a}" data-i18n-label="${key}" aria-label="${esc(t(key))}"><span aria-hidden="true">${glyph}</span></button>`;
  return `<aside id="drawer" class="drawer" hidden aria-labelledby="drawerTitle">
  <button type="button" class="sheet-handle" data-a="handle" aria-expanded="false" data-i18n-label="tour" aria-label="${esc(t('tour'))}"></button>
  <div class="drawer-head">
    <p class="counter t-caption" id="counter" aria-hidden="true"></p>
    <div class="drawer-actions">${btn('prev', 'previous', '◀')}${btn('play', 'play', '⏵')}${btn('next', 'next', '▶')}<span class="spacer"></span>${btn('close', 'exitTour', '✕')}</div>
    <div class="progress" id="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden><div class="bar"></div></div>
  </div>
  <div class="drawer-body" id="stopLive" aria-live="polite" aria-atomic="true"></div>
</aside>`;
}

/**
 * @param {string} svg the rendered poster (renderMasterView)
 * @param {object} map the published map: chapters[], i18n.ui, meta.{asOf,commit,docsBase,aliases,generatedAt}
 * @returns {string} master-view.html
 */
export function renderViewer(svg, map) {
  const ui = (map.i18n && map.i18n.ui) || {};
  const { t, missing } = labeller(ui);
  const meta = map.meta || {};
  const posterData = {
    chapters: (map.chapters || []).map((c) => ({ id: c.id, order: c.order, title: c.title, hook: c.hook, narration: c.narration, evidence: c.evidence || [], sources: c.sources || [], poster: c.poster || {} })),
    ui: Object.fromEntries(VIEWER_UI_KEYS.filter((k) => ui[k]).map((k) => [k, ui[k]])),
    meta: { asOf: meta.asOf, commit: meta.commit, generatedAt: meta.generatedAt, docsBase: meta.docsBase, aliases: meta.aliases || {} },
  };
  const svgTitle = /<title id="mvTitle">([^<]*)<\/title>/.exec(svg)?.[1] ?? '';
  const html = `<!doctype html>
<html lang="en" data-page="poster">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t('posterAlt'))}</title>
<meta name="description" content="${svgTitle}">
<meta name="theme-color" content="#F4F6F8">
<link rel="alternate" hreflang="en" href="./master-view.html?lang=en">
<link rel="alternate" hreflang="es" href="./master-view.html?lang=es">
<script>${THEME_SCRIPT}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="./tokens.css">
<link rel="stylesheet" href="./pages.css">
<link rel="stylesheet" href="./viewer.css">
</head>
<body>
<a class="skip-link" href="#transcript" data-i18n="skipPoster">${esc(t('skipPoster'))}</a>
<header class="shell-header" id="header" role="banner"></header>
<main class="viewer" id="viewer">
  <section class="stage-wrap">
    <div id="stage" class="stage" tabindex="0" role="group" aria-labelledby="mvTitle" aria-describedby="caption posterKeys">
      <div id="pz">${svg.trim()}</div>
    </div>
    ${toolbarHtml(t)}
    <p class="hint" id="posterKeys" data-i18n="posterKeys">${esc(t('posterKeys'))}</p>
  </section>
  ${drawerHtml(t)}
</main>
<footer class="status-strip poster-strip"><span class="caption" id="caption"></span><a href="${esc(meta.repoUrl || 'https://github.com/beyondnetcode/evolith_arch32')}" rel="noopener" data-i18n="openRepo">${esc(t('openRepo'))}</a></footer>
${transcriptHtml(svg, t)}
<script id="poster-data">window.__POSTER_DATA__=${JSON.stringify(posterData).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')};</script>
<script type="module" src="./viewer.js"></script>
</body>
</html>
`;
  if (missing.size) process.stderr.write(`⚠ master-view.html: ${missing.size} i18n.ui key(s) missing (English fallback = key): ${[...missing].join(', ')}\n`);
  return html;
}
