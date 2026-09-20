/**
 * @file band-federation.mjs
 * @description Band 5 · FEDERATED GOVERNANCE — Core (level 0), satellites (level 1) and
 * the Architecture Board, the INH-* lines and the day-zero command line. It occupies the
 * left column only: the GOVERNED COMPOSITION rail of band 4 runs beside it.
 */

import { BAND_X, IX, GAP } from './frame.mjs';

const H = 188;
export const LEFT_W = 1144;
const INNER_W = LEFT_W - 2 * (IX - BAND_X);
const BOX_W = 340;
const BOX_GAP = (INNER_W - 3 * BOX_W) / 2;
const BOX_Y = 36;
const BOX_H = 58;

function renderBoxes(ctx, y, hue) {
  const { c, p, s } = ctx;
  s.federation.boxes.forEach((box, i) => {
    const x = IX + i * (BOX_W + BOX_GAP);
    c.rect({ x, y: y + BOX_Y, w: BOX_W, h: BOX_H }, { rx: 10, fill: p.surface, stroke: hue.stroke, sw: 1.3 });
    c.text(box.name, { x: x + 12, y: y + BOX_Y + 18, max: BOX_W - 24 }, { size: 13, weight: 700, fill: hue.text });
    c.lines(box.lines, { x: x + 12, y: y + BOX_Y + 34, max: BOX_W - 24, lh: 14 }, { size: 12, fill: p['ink-2'] });
    if (i > 0) c.arrow({ x: x - BOX_GAP + 2, y: y + BOX_Y + BOX_H / 2 }, { x: x - 2, y: y + BOX_Y + BOX_H / 2 }, { color: hue.text, sw: 2.2 });
  });
}

function render(ctx, y) {
  const { c, p, s } = ctx;
  const hue = p.lane('constitution');
  c.rect({ x: BAND_X, y, w: LEFT_W, h: H }, { rx: 14, fill: hue.fill, stroke: hue.stroke, sw: 1.2 });
  c.bandTitle({ x: IX, y: y + 26, max: INNER_W }, { num: 5, text: s.federation.title, fill: hue.text });
  renderBoxes(ctx, y, hue);
  c.text(s.federation.arrows, { x: IX, y: y + 112, max: INNER_W }, { size: 12, weight: 600, fill: hue.text });
  c.lines(s.federation.returnLines, { x: IX, y: y + 128, max: INNER_W, lh: 14 }, { size: 12, fill: p['ink-2'] });
  c.region('region-day-zero', { x: IX, y: y + 150, w: INNER_W, h: 34 }, () => {
    c.lines(s.federation.dayZero, { x: IX, y: y + 162, max: INNER_W, lh: 16 }, { size: 12, mono: true, fill: p.ink });
  });
  return H;
}

export const band = { n: 5, key: 'federation', height: H, render };
/** How far below band 4's top the composition rail must reach to cover band 5 too. */
export const RAIL_EXTRA = GAP + H;
