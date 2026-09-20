/**
 * @file band-suite.mjs
 * @description Band 3 · EVOLITH TRACKER — the three Tracker boxes, the five SDLC phase
 * chevrons read from metrics.sdlc (gate names from the gate JSON, never prose), the
 * topology axis beside them, the footers and the bus to the REST door of band 1.
 */

import { textWidth } from './canvas.mjs';
import { BAND_X, BAND_W, IX, IR, IW, W } from './frame.mjs';

const H = 358;
const BOX_Y = 36;
const BOX_H = 56;
const CHEV_W = 260;
const CHEV_STEP = 256;
const CHEV_Y = 148;
const CHEV_H = 118;
const NOTCH = 20;
const AXIS_X = 1352;
const WEDGE_INDEX = 2;

function renderBoxes(ctx, y, hue) {
  const { c, p, s } = ctx;
  c.region('region-tracker-boxes', { x: IX, y: y + BOX_Y, w: IW, h: BOX_H }, () => {
    let x = IX;
    for (const box of s.suite.boxes) {
      c.rect({ x, y: y + BOX_Y, w: box.w, h: BOX_H }, { rx: 9, fill: p.surface, stroke: hue.stroke, sw: 1.2 });
      c.text(box.name, { x: x + 12, y: y + BOX_Y + 18, max: box.w - 24 }, { size: 13, weight: 700, fill: hue.text });
      c.lines(box.lines, { x: x + 12, y: y + BOX_Y + 34, max: box.w - 24, lh: 16 }, { size: 12, fill: p['ink-2'] });
      x += box.w + 10;
    }
  });
  let cx = IX;
  for (const chip of s.suite.chips) {
    const w = textWidth(chip, 12) + 24;
    c.chip(chip, { x: cx, y: y + 100, w, h: 22 }, { tf: hue.text, stroke: hue.stroke, weight: 600 });
    cx += w + 12;
  }
}

function chevronPoints(x0, y0) {
  const mid = y0 + CHEV_H / 2;
  return `${x0},${y0} ${x0 + CHEV_W - NOTCH},${y0} ${x0 + CHEV_W},${mid} ${x0 + CHEV_W - NOTCH},${y0 + CHEV_H} ${x0},${y0 + CHEV_H} ${x0 + NOTCH},${mid}`;
}

function renderChevron(ctx, ph, at) {
  const { c, p } = ctx;
  const { x0, y0, i } = at;
  const fill = p.phase[i];
  const wedge = i === WEDGE_INDEX;
  c.raw(`<polygon points="${chevronPoints(x0, y0)}" fill="${fill}"${wedge ? ` stroke="${p.accent}" stroke-width="2"` : ''}/>`);
  const cx = x0 + (NOTCH + CHEV_W) / 2;
  c.text(ph.phase, { x: x0 + NOTCH + 8, y: y0 + 16, max: 110 }, { size: 12, weight: 700, ls: 1, fill: p.surface });
  c.text(ph.key, { x: x0 + CHEV_W - NOTCH - 4, y: y0 + 16, max: 120, anchor: 'end' }, { size: 12, mono: true, fill: p.surface });
  c.text(ph.name.toUpperCase(), { x: cx, y: y0 + 36, max: CHEV_W - NOTCH - 16, anchor: 'middle' }, { size: 14, weight: 800, ls: 0.5, fill: p.surface });
  c.rect({ x: x0 + NOTCH + 4, y: y0 + 46, w: CHEV_W - NOTCH - 8, h: 20 }, { rx: 10, fill: p.surface });
  c.text(ph.gate, { x: cx, y: y0 + 60, max: CHEV_W - NOTCH - 20, anchor: 'middle' }, { size: 12, weight: 700, fill });
  c.lines(ph.artifacts, { x: cx, y: y0 + 84, max: CHEV_W - NOTCH - 20, lh: 16, anchor: 'middle' }, { size: 12, fill: p.surface });
}

function renderPhases(ctx, y, hue) {
  const { c, p, s, phases } = ctx;
  const rowW = CHEV_W + (phases.length - 1) * CHEV_STEP;
  c.text(s.suite.strip, { x: IX + rowW / 2, y: y + 140, max: rowW, anchor: 'middle' }, { size: 12.5, weight: 700, ls: 3, fill: hue.text });
  c.region('region-phases', { x: IX, y: y + CHEV_Y, w: rowW, h: CHEV_H }, () => {
    phases.forEach((ph, i) => renderChevron(ctx, ph, { x0: IX + i * CHEV_STEP, y0: y + CHEV_Y, i }));
  });
  const wx = IX + WEDGE_INDEX * CHEV_STEP + (NOTCH + CHEV_W) / 2;
  c.rect({ x: wx - 230, y: y + 272, w: 460, h: 20 }, { rx: 10, fill: p['accent-soft'], stroke: p.accent, sw: 1 });
  c.text(s.suite.wedge, { x: wx, y: y + 286, max: 440, anchor: 'middle' }, { size: 12, weight: 700, fill: p['accent-ink'] });
}

function renderAxis(ctx, y, hue) {
  const { c, p, s } = ctx;
  const w = IR - AXIS_X;
  c.region('region-topology-axis', { x: AXIS_X, y: y + CHEV_Y, w, h: CHEV_H }, () => {
    c.rect({ x: AXIS_X, y: y + CHEV_Y, w, h: CHEV_H }, { rx: 10, fill: p.surface, stroke: hue.stroke, sw: 1.2 });
    const lx = AXIS_X + 16; const top = y + CHEV_Y + 12; const bottom = y + CHEV_Y + CHEV_H - 12;
    c.raw(`<line x1="${lx}" y1="${top}" x2="${lx}" y2="${bottom}" stroke="${p['ink-2']}" stroke-width="2"/>`);
    [0.2, 0.5, 0.8].forEach((f) => { const ry = top + (bottom - top) * f; c.raw(`<line x1="${lx - 6}" y1="${ry}" x2="${lx + 6}" y2="${ry}" stroke="${p['ink-2']}" stroke-width="2"/>`); });
    const [head, ...rest] = s.suite.axis;
    c.text(head, { x: AXIS_X + 32, y: y + CHEV_Y + 16, max: w - 40 }, { size: 12, weight: 700, fill: hue.text });
    c.lines(rest, { x: AXIS_X + 32, y: y + CHEV_Y + 30, max: w - 40, lh: 14 }, { size: 12, fill: p['ink-2'] });
  });
}

/** Two-way bus in the right margin between the Tracker row and the REST door of band 1. */
function renderBus(ctx, y, hue) {
  const { c, p, s, marks } = ctx;
  const door = marks.restDoor;
  if (!door) throw new Error('poster: band 1 must render before band 3 (the bus needs the REST door)');
  const cm = door.y + door.h / 2; const ra = y + BOX_Y + BOX_H / 2;
  const doorX = door.x + door.w;
  c.region('region-bus', { x: IR, y: cm - 12, w: W - IR, h: ra - cm + 24 }, () => {
    c.path(`M ${doorX} ${cm + 8} H 1556 V ${ra - 8} H ${IR + 3}`, { color: hue.text, sw: 2 });
    c.path(`M ${IR} ${ra + 8} H 1576 V ${cm - 8} H ${doorX + 3}`, { color: hue.text, sw: 2 });
    const max = ra - cm - 40; const my = (cm + ra) / 2;
    c.text(s.suite.busDown, { x: 1567, y: my, max, anchor: 'middle' }, { size: 12, weight: 600, fill: hue.text, rotate: -90 });
    c.text(s.suite.busUp, { x: 1590, y: my, max, anchor: 'middle' }, { size: 12, weight: 600, fill: p['ink-2'], rotate: -90 });
  });
}

function render(ctx, y) {
  const { c, p, s } = ctx;
  const hue = p.lane('authority');
  c.rect({ x: BAND_X, y, w: BAND_W, h: H }, { rx: 14, fill: hue.fill, stroke: hue.stroke, sw: 1.2 });
  c.bandTitle({ x: IX, y: y + 26, max: IW }, { num: 3, text: s.suite.title, fill: hue.text });
  renderBoxes(ctx, y, hue);
  renderPhases(ctx, y, hue);
  renderAxis(ctx, y, hue);
  c.region('region-tracker-footers', { x: IX, y: y + 292, w: IW, h: 60 }, () => {
    c.lines(s.suite.footers, { x: IX, y: y + 304, max: IW, lh: 14 }, { size: 12, fill: p['ink-2'] });
  });
  renderBus(ctx, y, hue);
  return H;
}

export const band = { n: 3, key: 'suite', height: H, render };
