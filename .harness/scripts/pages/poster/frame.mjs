/**
 * @file frame.mjs
 * @description Layout constants shared by every band, plus the parts outside the bands:
 * <defs> (marker + the two gradients kept from the original — no <filter>), the header
 * and the footer. Y is never declared here: the assembler accumulates it band by band.
 */

import { textWidth } from './canvas.mjs';

export const W = 1600;
export const BAND_X = 36;
export const BAND_W = 1528;
export const GAP = 12;
/** Inner content edges of a full-width band. */
export const IX = 56;
export const IR = 1544;
export const IW = IR - IX;
export const HEADER_H = 96;
export const FOOTER_H = 36;
/** The three-bar brand mark, the same colours shared.js paints in the page header. */
const BRAND = ['#52a69c', '#214d70', '#17344d'];

export function renderDefs(ctx) {
  const { c, p } = ctx;
  c.raw(`<defs>
<marker id="arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${p['ink-3']}"/></marker>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.surface}"/><stop offset="1" stop-color="${p.bg}"/></linearGradient>
<linearGradient id="domg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p['ink-2']}"/><stop offset="1" stop-color="${p.ink}"/></linearGradient>
</defs>`);
}

/** Header: brand mark, wordmark, tagline, subtitle, repo/commit line and the ADR list. Returns its height. */
export function renderHeader(ctx) {
  const { c, p, s } = ctx;
  const lx = 40; const ly = 30;
  BRAND.forEach((col, i) => {
    const dy = i * 14;
    c.raw(`<path d="M${lx},${ly + dy + 12} L${lx + 26},${ly + dy} L${lx + 52},${ly + dy + 12} L${lx + 26},${ly + dy + 24} Z" fill="${col}"/>`);
  });
  const brandW = textWidth(s.header.brand, 34, { ls: 1 });
  c.text(s.header.brand, { x: 108, y: 52, max: 300 }, { size: 34, weight: 800, ls: 1, fill: p.ink, role: 'title' });
  c.text(s.header.tagline, { x: 108 + brandW + 14, y: 52, max: 560 }, { size: 30, weight: 300, ls: 0.5, fill: p['ink-2'] });
  c.text(s.header.subtitle, { x: 110, y: 80, max: 800 }, { size: 13.5, weight: 600, fill: p.lane('authority').text });
  c.text(s.header.repo, { x: W - 40, y: 52, max: 520, anchor: 'end' }, { size: 13, weight: 600, fill: p['ink-2'] });
  c.text(s.header.adrs, { x: W - 40, y: 72, max: 620, anchor: 'end' }, { size: 12, weight: 600, fill: p['ink-3'] });
  return HEADER_H;
}

/** Footer: two right-aligned italic lines naming the sources of every number. Returns its height. */
export function renderFooter(ctx, y) {
  const { c, p, s } = ctx;
  c.open({ id: 'footer' });
  c.lines(s.footer, { x: W - BAND_X, y: y + 14, max: BAND_W, lh: 14, anchor: 'end' }, { size: 12, italic: true, fill: p['ink-3'] });
  c.close();
  return FOOTER_H;
}
