/**
 * @file canvas.mjs
 * @description SVG primitives for the E2E poster. Every string is measured against the
 * box it is drawn in — 0.56 em per character (0.6 for monospace) with 8 % slack for the
 * system-font fallback. A string that does not fit shrinks to MIN_SIZE and, below that,
 * THROWS: the build fails instead of the README clipping a number. A call without a
 * `max` throws too, so nothing is drawn unmeasured.
 */

export const MIN_SIZE = 12;
const EM_SANS = 0.56;
const EM_MONO = 0.6;
const SLACK = 1.08;
/** System monospace stack — the README <img> cannot load web fonts. */
export const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

/** Estimated advance width of `str` at `size` units. */
export function textWidth(str, size, { mono = false, ls = 0 } = {}) {
  const chars = [...String(str)].length;
  return chars * size * (mono ? EM_MONO : EM_SANS) * SLACK + Math.max(0, chars - 1) * ls;
}

/** The largest size ≤ `size` at which `str` fits `max`; throws below MIN_SIZE. */
export function fitSize(str, size, opts) {
  const { max } = opts;
  if (!(max > 0)) throw new Error(`poster: unmeasured string "${str}" (no max width)`);
  if (size < MIN_SIZE) throw new Error(`poster: "${str}" asks for ${size} units; nothing under ${MIN_SIZE}`);
  let s = size;
  while (textWidth(str, s, opts) > max) {
    if (s <= MIN_SIZE) {
      throw new Error(`poster: "${str}" needs ${Math.ceil(textWidth(str, MIN_SIZE, opts))} units at ${MIN_SIZE}, box is ${max}`);
    }
    s = Math.max(MIN_SIZE, s - 0.5);
  }
  return s;
}

/** Light palette + lane hues read from tokens.json; the poster stays light in every theme. */
export function palette(tokens) {
  const L = tokens.color.light;
  const lane = (id) => { const [fill, stroke, text] = tokens.lane[id].light; return { fill, stroke, text }; };
  return {
    ...L,
    font: tokens.fonts.poster,
    lane,
    phase: tokens.phase.light,
    mint: tokens.lane.execution.light[1],
    rail: { fill: L['accent-soft'], stroke: tokens.lane.interfaces.light[1], text: L['accent-ink'], title: L.accent },
    radius: tokens.radius,
  };
}

const attr = (name, value) => (value === undefined || value === null || value === '' ? '' : ` ${name}="${esc(value)}"`);

/** Collects SVG fragments; `open`/`close` keep <g> nesting explicit. */
export class Canvas {
  constructor(pal) { this.parts = []; this.p = pal; this.depth = 0; }

  raw(s) { this.parts.push(s); }

  open(attrs) {
    this.depth += 1;
    const a = Object.entries(attrs).map(([k, v]) => attr(k, v)).join('');
    this.parts.push(`<g${a}>`);
  }

  close() { this.depth -= 1; this.parts.push('</g>'); }

  /** A region the tour can target: `<g id data-bbox="x y w h">`. */
  region(id, box, fn) {
    this.open({ id, 'data-bbox': `${num(box.x)} ${num(box.y)} ${num(box.w)} ${num(box.h)}` });
    fn();
    this.close();
  }

  rect(box, o = {}) {
    const { x, y, w, h } = box;
    const rx = o.rx ?? this.p.radius.node;
    this.parts.push(`<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="${rx}" fill="${o.fill ?? this.p.surface}"`
      + `${attr('stroke', o.stroke ?? 'none')}${attr('stroke-width', o.sw)}${attr('stroke-dasharray', o.dash)}${attr('opacity', o.op)}${attr('class', o.cls)}/>`);
  }

  /**
   * One line of text. `at` = { x, y, max, anchor? }; `max` is the width of the box the
   * string must fit, measured from `x` in the anchor's direction.
   */
  text(str, at, o = {}) {
    const mono = o.mono === true;
    const size = fitSize(str, o.size ?? 13, { max: at.max, mono, ls: o.ls ?? 0 });
    const transform = o.rotate ? ` transform="rotate(${o.rotate} ${num(at.x)} ${num(at.y)})"` : '';
    const family = mono ? ` font-family="${esc(FONT_MONO)}"` : '';
    this.parts.push(`<text x="${num(at.x)}" y="${num(at.y)}" font-size="${num(size)}" fill="${o.fill ?? this.p.ink}"`
      + `${attr('font-weight', o.weight)}${attr('text-anchor', at.anchor ?? o.anchor)}${attr('letter-spacing', o.ls)}`
      + `${o.italic ? ' font-style="italic"' : ''}${family}${attr('data-role', o.role)}${transform}>${esc(str)}</text>`);
    return size;
  }

  /** Stacked lines; `at.lh` is the line height (default 14). Returns the y after the last line. */
  lines(strs, at, o = {}) {
    const lh = at.lh ?? 14;
    strs.forEach((s, i) => this.text(s, { ...at, y: at.y + i * lh }, o));
    return at.y + strs.length * lh;
  }

  /** A rounded chip with centred text. */
  chip(str, box, o = {}) {
    const h = box.h ?? 22;
    this.rect({ ...box, h }, { rx: this.p.radius.chip, fill: o.fill ?? this.p.surface, stroke: o.stroke ?? this.p.line, sw: 1 });
    this.text(str, { x: box.x + box.w / 2, y: box.y + h / 2 + 4, max: box.w - 10, anchor: 'middle' },
      { size: o.size ?? MIN_SIZE, fill: o.tf ?? this.p['ink-2'], weight: o.weight ?? 500, mono: o.mono });
  }

  /** Numbered disc + band title (14.5/700, tracking .6) in the band's text colour. */
  bandTitle(at, o) {
    this.parts.push(`<circle cx="${num(at.x + 10)}" cy="${num(at.y - 5)}" r="10" fill="${o.fill}"/>`);
    this.text(String(o.num), { x: at.x + 10, y: at.y - 1, max: 20, anchor: 'middle' }, { size: 12.5, fill: this.p.surface, weight: 700 });
    this.text(o.text, { x: at.x + 28, y: at.y, max: at.max - 28 }, { size: 14.5, fill: o.fill, weight: 700, ls: 0.6, role: 'title' });
  }

  /** A straight arrow with the shared marker. */
  arrow(from, to, o = {}) {
    this.parts.push(`<line x1="${num(from.x)}" y1="${num(from.y)}" x2="${num(to.x)}" y2="${num(to.y)}" stroke="${o.color ?? this.p['ink-3']}"`
      + ` stroke-width="${o.sw ?? 2}"${attr('stroke-dasharray', o.dash)} marker-end="url(#arr)"${o.bi ? ' marker-start="url(#arr)"' : ''}/>`);
  }

  /** An orthogonal path (`d`) with an arrowhead at its end. */
  path(d, o = {}) {
    this.parts.push(`<path d="${d}" fill="none" stroke="${o.color ?? this.p['ink-3']}" stroke-width="${o.sw ?? 2}"${attr('stroke-dasharray', o.dash)} marker-end="url(#arr)"/>`);
  }

  toString() {
    if (this.depth !== 0) throw new Error(`poster: ${this.depth} <g> left open`);
    return this.parts.join('\n');
  }
}
