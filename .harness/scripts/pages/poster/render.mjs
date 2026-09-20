/**
 * @file render.mjs
 * @description Assembles the poster: the root <svg> (title, desc, the guard-45 annotation
 * as the first child), defs, background, header, the six bands with y accumulated from
 * their declared heights, and the footer. Also the read-only helpers the build and the
 * viewer use on a rendered SVG: region ids and a transcript.
 */

import { esc } from './canvas.mjs';
import { W, BAND_X, BAND_W, GAP, renderDefs, renderHeader, renderFooter, HEADER_H, FOOTER_H } from './frame.mjs';
import { band as doors, renderLink, LINK_H } from './band-doors.mjs';
import { band as core } from './band-core.mjs';
import { band as suite } from './band-suite.mjs';
import { band as agents } from './band-agents.mjs';
import { band as federation } from './band-federation.mjs';
import { band as evidence } from './band-evidence.mjs';

export const BANDS = [doors, core, suite, agents, federation, evidence];

/** Total height: header + (gap + band) × 6 + the doors→core link strip + footer. */
export function posterHeight() {
  return HEADER_H + BANDS.reduce((h, b) => h + GAP + b.height, 0) + LINK_H + FOOTER_H;
}

function renderBand(ctx, b, y) {
  const { c } = ctx;
  c.open({ id: `band-${b.n}`, 'data-band': b.key, 'data-bbox': `${BAND_X} ${y} ${BAND_W} ${b.height}` });
  const h = b.render(ctx, y);
  c.close();
  if (h !== b.height) throw new Error(`poster: band ${b.n} rendered ${h} units but declares ${b.height}`);
  return y + h;
}

/** The whole SVG document as a string. */
export function renderSvg(ctx) {
  const { c, p, s } = ctx;
  const H = posterHeight();
  const annotation = `<!-- ${s.annotation} -->`;
  const desc = BANDS.map((b) => s.desc[b.key]).join(' ');
  c.raw(annotation);
  c.raw(`<!-- ${s.annotationNote} -->`);
  c.raw(`<title id="mvTitle">${esc(s.title)}</title>`);
  c.raw(`<desc id="mvDesc">${esc(desc)}</desc>`);
  renderDefs(ctx);
  c.rect({ x: 0, y: 0, w: W, h: H }, { rx: 0, fill: 'url(#bg)' });
  c.open({ id: 'header' });
  let y = renderHeader(ctx);
  c.close();
  for (const b of BANDS) {
    y = renderBand(ctx, b, y + GAP);
    if (b === doors) y += renderLink(ctx, y);
  }
  renderFooter(ctx, y);
  const root = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="mvTitle mvDesc" font-family="${esc(p.font)}">`;
  return `${annotation}\n${root}\n${c.toString()}\n</svg>\n`;
}

/** Every `band-N` / `region-…` group id in a rendered SVG. */
export function posterRegions(svg) {
  return [...String(svg).matchAll(/<g id="((?:band|region)-[a-z0-9-]+)"/g)].map((m) => m[1]);
}

/**
 * A plain-text reading of a rendered SVG, band by band: the header, then each band's
 * title (data-role="title") and text lines in drawing order, then the footer. Text is
 * returned as it sits in the SVG (XML-escaped), which is also valid HTML.
 */
export function posterTranscript(svg) {
  const sections = [];
  let current = null; let depth = 0;
  for (const m of String(svg).matchAll(/<g\b([^>]*)>|<\/g>|<text\b([^>]*)>([^<]*)<\/text>/g)) {
    if (m[0] === '</g>') {
      depth -= 1;
    } else if (m[0].startsWith('<g')) {
      depth += 1;
      if (depth === 1) {
        current = { id: /id="([^"]+)"/.exec(m[1])?.[1] ?? '', band: /data-band="([a-z]+)"/.exec(m[1])?.[1] ?? null, title: '', lines: [] };
        sections.push(current);
      }
    } else if (!current) {
      continue;
    } else if (/data-role="title"/.test(m[2]) && !current.title) {
      current.title = m[3];
    } else if (m[3].trim()) {
      current.lines.push(m[3]);
    }
  }
  return sections.filter((sec) => sec.title || sec.lines.length);
}
