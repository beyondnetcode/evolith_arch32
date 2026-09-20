/**
 * @file band-agents.mjs
 * @description Band 4 · GOVERNED AGENTS · AI ON THE TENANT'S TERMS (left column) and the
 * GOVERNED COMPOSITION rail on the right, which runs down beside band 5 as well. The
 * port sentence prints the same hot/declared split as the guard-45 annotation, and the
 * port chips are the `*.port.ts` basenames read from the tree.
 */

import { textWidth } from './canvas.mjs';
import { BAND_X, IX, IR } from './frame.mjs';
import { LEFT_W, RAIL_EXTRA } from './band-federation.mjs';

const H = 352;
const INNER_R = BAND_X + LEFT_W - (IX - BAND_X);
const INNER_W = INNER_R - IX;
const RAIL_X = 1200;
const RAIL_W = IR + (IX - BAND_X) - RAIL_X;
const RAIL_IX = RAIL_X + 12;
const RAIL_IW = RAIL_W - 24;
const LLM_Y = 286;

const shortAdapter = (name) => name.replace(/InteractionAdapter$/, '');

function renderInteraction(ctx, y, hue) {
  const { c, p, s, m } = ctx;
  const label = s.agents.interactionLabel;
  c.text(label, { x: IX, y: y + 113, max: 200 }, { size: 12, weight: 700, fill: p.ink });
  let x = IX + textWidth(label, 12) + 12;
  for (const name of m.runtime.interactionAdapterNames || []) {
    const short = shortAdapter(name);
    const text = s.agents.notConstructed.some((n) => short.startsWith(n)) ? `${short} *` : short;
    const w = textWidth(text, 12) + 20;
    c.chip(text, { x, y: y + 98, w, h: 22 }, { tf: hue.text, stroke: hue.stroke, weight: 600 });
    x += w + 8;
  }
  c.text(s.agents.interactionFoot, { x: IX, y: y + 130, max: INNER_W }, { size: 12, italic: true, fill: p['ink-3'] });
}

/** Mono chips flowing left to right; returns the y below the last row. Throws past three rows. */
function renderPortChips(ctx, y, hue) {
  const { c, p, ports } = ctx;
  let x = IX; let row = 0;
  for (const name of ports) {
    const w = textWidth(name, 12, { mono: true }) + 14;
    if (x + w > INNER_R) { x = IX; row += 1; }
    c.chip(name, { x, y: y + row * 26, w, h: 20 }, { tf: hue.text, stroke: hue.stroke, fill: p.surface, mono: true });
    x += w + 6;
  }
  if (row > 2) throw new Error(`poster: ${ports.length} port chips need ${row + 1} rows; band 4 holds three`);
  return y + (row + 1) * 26;
}

function renderLlm(ctx, y, hue) {
  const { c, p, s } = ctx;
  c.region('region-llm', { x: IX, y: y + LLM_Y, w: INNER_W, h: 56 }, () => {
    c.rect({ x: IX, y: y + LLM_Y, w: INNER_W, h: 56 }, { rx: 10, fill: p.surface, stroke: hue.stroke, sw: 1.2 });
    c.text(s.agents.llmTitle, { x: IX + 12, y: y + LLM_Y + 18, max: INNER_W - 24 }, { size: 13, weight: 700, fill: hue.text });
    c.text(s.agents.llmDetail, { x: IX + 12, y: y + LLM_Y + 34, max: INNER_W - 24 }, { size: 12, fill: p['ink-2'] });
    c.text(s.agents.llmClaim, { x: IX + 12, y: y + LLM_Y + 50, max: 400 }, { size: 13, weight: 800, fill: p.accent });
    c.text(s.agents.llmTenant, { x: IX + 24 + textWidth(s.agents.llmClaim, 13), y: y + LLM_Y + 50, max: 400 }, { size: 12, fill: p['ink-2'] });
  });
}

function renderRuntime(ctx, y, hue) {
  const { c, p, s } = ctx;
  c.region('region-runtime', { x: IX, y: y + 36, w: INNER_W, h: LLM_Y - 44 }, () => {
    c.text(s.agents.runtime, { x: IX, y: y + 48, max: INNER_W }, { size: 13, weight: 800, fill: hue.text });
    c.lines(s.agents.ports, { x: IX, y: y + 70, max: INNER_W, lh: 20 }, { size: 15, weight: 700, fill: p.ink });
    renderInteraction(ctx, y, hue);
    c.text(s.agents.engines, { x: IX, y: y + 148, max: INNER_W }, { size: 12, fill: p['ink-2'] });
    const pillW = textWidth(s.agents.orchestration, 12) + 24;
    c.chip(s.agents.orchestration, { x: IX, y: y + 156, w: pillW, h: 22 }, { tf: hue.text, stroke: hue.stroke, weight: 600 });
    c.text(s.agents.portFilesHead, { x: IX, y: y + 196, max: INNER_W }, { size: 12, weight: 700, fill: p.ink });
    renderPortChips(ctx, y + 204, hue);
  });
}

function renderRailChips(ctx, items, grid) {
  const { c, p } = ctx;
  const { x, y, cols, w, gap } = grid;
  items.forEach((item, i) => {
    c.chip(item, { x: x + (i % cols) * (w + gap), y: y + Math.floor(i / cols) * 26, w, h: 20 }, { tf: p.rail.text, stroke: p.rail.stroke, fill: p.surface, weight: 600 });
  });
}

function renderRail(ctx, y) {
  const { c, p, s } = ctx;
  const railH = H + RAIL_EXTRA;
  c.region('region-composition', { x: RAIL_X, y, w: RAIL_W, h: railH }, () => {
    c.rect({ x: RAIL_X, y, w: RAIL_W, h: railH }, { rx: 14, fill: p.rail.fill, stroke: p.rail.stroke, sw: 1.4 });
    c.text(s.composition.title, { x: RAIL_IX + 4, y: y + 26, max: RAIL_IW }, { size: 14.5, weight: 700, ls: 0.6, fill: p.rail.title, role: 'title' });
    c.lines(s.composition.lead, { x: RAIL_IX + 4, y: y + 44, max: RAIL_IW, lh: 14 }, { size: 12, italic: true, fill: p['ink-2'] });
    c.rect({ x: RAIL_IX, y: y + 84, w: RAIL_IW, h: 50 }, { rx: 9, fill: p.rail.stroke });
    const cx = RAIL_X + RAIL_W / 2;
    const [aclTitle, ...aclLines] = s.composition.acl;
    c.text(aclTitle, { x: cx, y: y + 102, max: RAIL_IW - 16, anchor: 'middle' }, { size: 12, weight: 800, fill: p.rail.text });
    c.lines(aclLines, { x: cx, y: y + 116, max: RAIL_IW - 16, lh: 14, anchor: 'middle' }, { size: 12, fill: p.rail.text });
    c.rect({ x: RAIL_IX, y: y + 144, w: RAIL_IW, h: 130 }, { rx: 10, fill: p['surface-2'], stroke: p.line, sw: 1 });
    c.text(s.composition.toolsTitle, { x: RAIL_IX + 8, y: y + 160, max: RAIL_IW - 16 }, { size: 12, weight: 800, fill: p['ink-2'] });
    renderRailChips(ctx, s.composition.tools, { x: RAIL_IX + 8, y: y + 168, cols: 2, w: (RAIL_IW - 24) / 2, gap: 8 });
    c.text(s.composition.dispositionTitle, { x: RAIL_IX + 4, y: y + 292, max: RAIL_IW }, { size: 12, weight: 700, fill: p.rail.title });
    renderRailChips(ctx, s.composition.dispositions, { x: RAIL_IX, y: y + 300, cols: 3, w: (RAIL_IW - 16) / 3, gap: 8 });
    c.lines(s.composition.quality, { x: RAIL_IX + 4, y: y + 364, max: RAIL_IW, lh: 14 }, { size: 12, fill: p['ink-2'] });
    c.lines(s.composition.note, { x: cx, y: y + railH - 26, max: RAIL_IW, lh: 14, anchor: 'middle' }, { size: 12, italic: true, fill: p['ink-3'] });
  });
  c.arrow({ x: RAIL_X, y: y + 109 }, { x: INNER_R - 12, y: y + 109 }, { color: p.rail.title, sw: 2, bi: true });
  c.text(s.composition.arrow, { x: INNER_R - 4, y: y + 101, max: 240, anchor: 'end' }, { size: 12, weight: 600, fill: p.rail.title });
}

function render(ctx, y) {
  const { c, p, s } = ctx;
  const hue = p.lane('execution');
  c.rect({ x: BAND_X, y, w: LEFT_W, h: H }, { rx: 14, fill: hue.fill, stroke: hue.stroke, sw: 1.2 });
  c.bandTitle({ x: IX, y: y + 26, max: INNER_W }, { num: 4, text: s.agents.title, fill: hue.text });
  renderRuntime(ctx, y, hue);
  renderLlm(ctx, y, hue);
  renderRail(ctx, y);
  return H;
}

export const band = { n: 4, key: 'agents', height: H, render };
