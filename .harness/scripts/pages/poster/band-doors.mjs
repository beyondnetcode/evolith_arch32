/**
 * @file band-doors.mjs
 * @description Band 1 · FOUR DOORS — who arrives, the four door cards, the channels and
 * the parity row — plus the connector strip that carries the four arrows into band 2.
 */

import { BAND_X, BAND_W, IX, IR, IW, W } from './frame.mjs';

const H = 296;
export const LINK_H = 44;
const CARD_W = 356;
const CARD_H = 134;
const CARD_STEP = (IW - CARD_W) / 3;
const CARDS_Y = 84;
const cardX = (i) => IX + i * CARD_STEP;

function renderCard(ctx, card, at) {
  const { c, p } = ctx;
  const hue = p.lane('interfaces');
  const { x, y } = at;
  c.rect({ x, y, w: CARD_W, h: CARD_H }, { rx: 12, fill: p.surface, stroke: hue.stroke, sw: 1.2 });
  c.rect({ x: x + 6, y: y + 12, w: 4, h: CARD_H - 24 }, { rx: 2, fill: hue.text });
  const tx = x + 18; const max = CARD_W - 30;
  c.text(card.name, { x: tx, y: y + 22, max }, { size: 17, weight: 700, fill: hue.text });
  c.lines(card.mono, { x: tx, y: y + 44, max, lh: 18 }, { size: 15, weight: 600, mono: true, fill: p.ink });
  c.lines(card.detail, { x: tx, y: y + 80, max, lh: 14 }, { size: 12, fill: p['ink-2'] });
  c.lines(card.foot, { x: tx, y: y + 110, max, lh: 14 }, { size: 12, fill: p['ink-3'] });
}

function renderArrivals(ctx, y) {
  const { c, p, s } = ctx;
  const hue = p.lane('interfaces');
  c.region('region-who-arrives', { x: IX, y: y + 38, w: IW, h: 24 }, () => {
    s.doors.arrivals.forEach((label, i) => {
      c.chip(label, { x: cardX(i) + 10, y: y + 38, w: CARD_W - 20, h: 24 }, { tf: hue.text, stroke: hue.stroke, weight: 600 });
      const cx = cardX(i) + CARD_W / 2;
      c.arrow({ x: cx, y: y + 62 }, { x: cx, y: y + CARDS_Y - 1 }, { color: hue.text, sw: 1.6 });
    });
  });
}

function render(ctx, y) {
  const { c, p, s } = ctx;
  const hue = p.lane('interfaces');
  c.rect({ x: BAND_X, y, w: BAND_W, h: H }, { rx: 14, fill: hue.fill, stroke: hue.stroke, sw: 1.2 });
  c.bandTitle({ x: IX, y: y + 26, max: IW - 200 }, { num: 1, text: s.doors.title, fill: hue.text });
  c.text(s.doors.whoArrives, { x: IR, y: y + 26, max: 180, anchor: 'end' }, { size: 12, weight: 700, ls: 1, fill: hue.text });
  renderArrivals(ctx, y);
  c.region('region-doors', { x: IX, y: y + CARDS_Y, w: IW, h: CARD_H }, () => {
    s.doors.cards.forEach((card, i) => renderCard(ctx, card, { x: cardX(i), y: y + CARDS_Y }));
  });
  // The REST door is where the Tracker bus of band 3 lands.
  ctx.marks.restDoor = { x: cardX(3), y: y + CARDS_Y, w: CARD_W, h: CARD_H };
  c.region('region-channels', { x: IX, y: y + 224, w: IW, h: 32 }, () => {
    c.lines(s.doors.channels, { x: IX, y: y + 236, max: IW, lh: 14 }, { size: 12, weight: 500, fill: p['ink-2'] });
  });
  c.region('region-parity', { x: IX, y: y + 256, w: IW, h: 16 }, () => {
    c.text(s.doors.parity, { x: IX, y: y + 268, max: IW }, { size: 12, italic: true, fill: p['ink-2'] });
  });
  c.text(s.doors.chatbox, { x: IX, y: y + 286, max: IW }, { size: 12, italic: true, fill: p['ink-3'] });
  return H;
}

/** The strip between band 1 and band 2: four arrows from the cards and one centred label. */
export function renderLink(ctx, y) {
  const { c, p, s } = ctx;
  const xs = [cardX(0) + 40, cardX(1) + 40, cardX(2) + CARD_W - 40, cardX(3) + CARD_W - 40];
  c.open({ id: 'link-doors-core' });
  for (const x of xs) c.arrow({ x, y: y + 2 }, { x, y: y + LINK_H - 2 }, { color: p['ink-3'], sw: 2 });
  c.text(s.doors.link, { x: W / 2, y: y + LINK_H / 2 + 4, max: xs[2] - xs[1] - 24, anchor: 'middle' }, { size: 12, weight: 600, fill: p['ink-2'] });
  c.close();
  return LINK_H;
}

export const band = { n: 1, key: 'doors', height: H, render };
