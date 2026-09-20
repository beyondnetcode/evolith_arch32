/**
 * @file band-core.mjs
 * @description Band 2 · THE CORE — the stateless engine (formula, three engines, the
 * closed set of outcomes) on the left, the Constitution's six hero tiles on the right,
 * and the WHO CAN SAY YES strip across the bottom.
 */

import { textWidth } from './canvas.mjs';
import { BAND_X, BAND_W, IX, IW } from './frame.mjs';

const H = 354;
const LEFT_W = 1024;
const RAIL_X = 1100;
const RAIL_W = 444;
const TILE_W = (RAIL_W - 8) / 2;
const TILE_H = 48;
const STRIP_Y = 312;

function renderFormula(ctx, y, hue) {
  const { c, p, s } = ctx;
  c.region('region-formula', { x: IX, y: y + 56, w: LEFT_W, h: 48 }, () => {
    c.rect({ x: IX, y: y + 56, w: LEFT_W, h: 48 }, { rx: 10, fill: 'url(#domg)', stroke: hue.text, sw: 1 });
    c.text(s.core.formula, { x: IX + 16, y: y + 86, max: 520 }, { size: 22, weight: 800, mono: true, fill: p.mint });
    c.lines(s.core.formulaNotes, { x: IX + LEFT_W - 16, y: y + 76, max: 480, lh: 16, anchor: 'end' }, { size: 12, fill: hue.stroke });
  });
}

function renderEngines(ctx, y, hue) {
  const { c, p, s } = ctx;
  const w = (LEFT_W - 46) / 3;
  s.core.engines.forEach((eng, i) => {
    const x = IX + i * (w + 23);
    c.rect({ x, y: y + 112, w, h: 70 }, { rx: 10, fill: p.surface, stroke: hue.stroke, sw: 1.2 });
    c.text(eng.name, { x: x + 12, y: y + 134, max: w - 24 }, { size: 15, weight: 700, fill: hue.text });
    c.lines(eng.lines, { x: x + 12, y: y + 150, max: w - 24, lh: 14 }, { size: 12, fill: p['ink-2'] });
  });
}

function renderOutcomes(ctx, y, hue) {
  const { c, p, s } = ctx;
  c.region('region-outcomes', { x: IX, y: y + 190, w: LEFT_W, h: 62 }, () => {
    s.core.outcomes.forEach((o, i) => c.chip(o, { x: IX + i * 84, y: y + 196, w: 76, h: 22 }, { tf: hue.text, stroke: hue.stroke, weight: 600, mono: true }));
    const cx = IX + s.core.outcomes.length * 84 + 8;
    c.text(s.core.outcomesClaim, { x: cx, y: y + 212, max: IX + LEFT_W - cx }, { size: 15, weight: 700, fill: p.ink });
    c.lines(s.core.outcomesDetail, { x: IX, y: y + 230, max: LEFT_W, lh: 14 }, { size: 12, fill: p['ink-2'] });
  });
}

function renderEngine(ctx, y, hue) {
  const { c, p, s } = ctx;
  c.region('region-engine', { x: IX, y: y + 36, w: LEFT_W, h: 250 }, () => {
    c.text(s.core.engineSubtitle, { x: IX, y: y + 48, max: LEFT_W }, { size: 13, weight: 800, fill: hue.text });
    renderFormula(ctx, y, hue);
    renderEngines(ctx, y, hue);
    renderOutcomes(ctx, y, hue);
    c.text(s.core.kinds, { x: IX, y: y + 262, max: LEFT_W }, { size: 12, fill: p['ink-2'] });
    c.text(s.core.ladder, { x: IX, y: y + 278, max: LEFT_W }, { size: 12, weight: 600, fill: hue.text });
  });
}

function renderTile(ctx, tile, at) {
  const { c, p } = ctx;
  const hue = p.lane('constitution');
  c.rect({ x: at.x, y: at.y, w: TILE_W, h: TILE_H }, { rx: 10, fill: p.surface, stroke: hue.stroke, sw: 1.1 });
  const heroW = textWidth(tile.hero, 28, { mono: true });
  c.text(tile.hero, { x: at.x + 10, y: at.y + 30, max: 100 }, { size: 28, weight: 800, mono: true, fill: hue.text });
  c.text(tile.label, { x: at.x + 18 + heroW, y: at.y + 30, max: TILE_W - 28 - heroW }, { size: 13, weight: 600, fill: p.ink });
  c.text(tile.sub, { x: at.x + 10, y: at.y + 44, max: TILE_W - 20 }, { size: 12, fill: p['ink-2'] });
}

function renderConstitution(ctx, y, hue) {
  const { c, p, s } = ctx;
  c.region('region-constitution', { x: RAIL_X, y: y + 36, w: RAIL_W, h: 270 }, () => {
    c.text(s.core.constitutionSubtitle, { x: RAIL_X, y: y + 48, max: RAIL_W }, { size: 13, weight: 800, fill: hue.text });
    s.core.tiles.forEach((tile, i) => {
      renderTile(ctx, tile, { x: RAIL_X + (i % 2) * (TILE_W + 8), y: y + 56 + Math.floor(i / 2) * (TILE_H + 8) });
    });
    c.lines(s.core.constitutionLines, { x: RAIL_X, y: y + 232, max: RAIL_W, lh: 14 }, { size: 12, fill: p['ink-2'] });
  });
}

function renderAuthority(ctx, y, hue) {
  const { c, p, s } = ctx;
  c.region('region-authority-strip', { x: IX, y: y + STRIP_Y, w: IW, h: 34 }, () => {
    c.rect({ x: IX, y: y + STRIP_Y, w: IW, h: 34 }, { rx: 8, fill: p.surface, stroke: hue.stroke, sw: 1.2 });
    const labelW = textWidth(s.core.authorityLabel, 13);
    c.text(s.core.authorityLabel, { x: IX + 12, y: y + STRIP_Y + 14, max: 300 }, { size: 13, weight: 700, fill: hue.text });
    c.text(s.core.authorityHumans, { x: IX + 20 + labelW, y: y + STRIP_Y + 14, max: IW - 32 - labelW }, { size: 13, weight: 600, fill: p.ink });
    c.text(s.core.authorityAgents, { x: IX + 12, y: y + STRIP_Y + 28, max: IW - 24 }, { size: 12, fill: p['ink-2'] });
  });
}

function render(ctx, y) {
  const { c, p, s } = ctx;
  const hue = p.lane('constitution');
  c.rect({ x: BAND_X, y, w: BAND_W, h: H }, { rx: 14, fill: hue.fill, stroke: hue.stroke, sw: 1.2 });
  c.bandTitle({ x: IX, y: y + 26, max: IW }, { num: 2, text: s.core.title, fill: hue.text });
  renderEngine(ctx, y, hue);
  renderConstitution(ctx, y, hue);
  renderAuthority(ctx, y, hue);
  return H;
}

export const band = { n: 2, key: 'core', height: H, render };
