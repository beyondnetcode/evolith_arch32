/**
 * @file band-evidence.mjs
 * @description Band 6 · EVIDENCE — eight generated, dated, linked tiles in mono, four by
 * two; every figure is a metric placeholder resolved by the build.
 */

import { BAND_X, BAND_W, IX, IW } from './frame.mjs';

const H = 140;
const COLS = 4;
const TILE_GAP = 8;
const TILE_W = (IW - (COLS - 1) * TILE_GAP) / COLS;
const TILE_H = 46;

function renderTile(ctx, lines, at) {
  const { c, p } = ctx;
  const hue = p.lane('evidence');
  c.rect({ x: at.x, y: at.y, w: TILE_W, h: TILE_H }, { rx: 8, fill: p.surface, stroke: hue.stroke, sw: 1 });
  const [head, ...rest] = lines;
  c.text(head, { x: at.x + 8, y: at.y + 14, max: TILE_W - 16 }, { size: 12, weight: 600, mono: true, fill: p.ink });
  c.lines(rest, { x: at.x + 8, y: at.y + 28, max: TILE_W - 16, lh: 14 }, { size: 12, mono: true, fill: p['ink-2'] });
}

function render(ctx, y) {
  const { c, p, s } = ctx;
  const hue = p.lane('evidence');
  c.rect({ x: BAND_X, y, w: BAND_W, h: H }, { rx: 14, fill: hue.fill, stroke: hue.stroke, sw: 1.2 });
  c.bandTitle({ x: IX, y: y + 26, max: IW }, { num: 6, text: s.evidence.title, fill: hue.text });
  s.evidence.tiles.forEach((tile, i) => {
    renderTile(ctx, tile, { x: IX + (i % COLS) * (TILE_W + TILE_GAP), y: y + 36 + Math.floor(i / COLS) * (TILE_H + 6) });
  });
  return H;
}

export const band = { n: 6, key: 'evidence', height: H, render };
