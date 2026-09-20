/**
 * layout.js — the Atlas layout, computed (design-spec §3.3).
 *
 * A pure function of the map: no DOM, no `getBBox`, no font metrics beyond a fixed
 * 8.4 px/char at 15 px (Inter 600 average advance), so the picture is identical before
 * and after the web font arrives and the build can run the same function in Node to
 * fail on a title that would need a third line.
 *
 * Coordinates are viewBox units. 12 columns → 1600 wide (desktop); 6 columns → 784
 * (phones, the same data reflowed). Lane heights follow their rows; the viewBox height
 * is whatever the lanes add up to.
 */

export const GRID = Object.freeze({
  colW: 112, gutter: 16, laneGap: 16, laneHeader: 40, lanePad: 12,
  nodeH: 84, nodeHCompact: 56, phaseH: 118, phaseHCompact: 80, rowGap: 16,
  charW: 8.4, cornerR: 12, busInset: 34, hiddenLaneH: 32, topPad: 24, bottomPad: 24,
  tracks: [4, 10, 16], pairOffset: 6, chevronNotch: 14,
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pick = (field, lang) => (field == null ? '' : typeof field === 'string' ? field : field[lang] || field.en || '');

/** Greedy word wrap at `maxChars`; words longer than the line are hard-broken. */
export function wrapTitle(text, maxChars) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const raw of words) {
    let word = raw;
    while (word.length > maxChars) {
      if (line) { lines.push(line); line = ''; }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= maxChars) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

/** One line, ellipsised at `maxChars` (compact mode). */
export function truncate(text, maxChars) {
  const s = String(text || '').trim();
  return s.length <= maxChars ? s : `${s.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

const isTall = (node) => node.kind === 'phase' || node.kind === 'axis';
function nodeHeight(node, compact) {
  if (isTall(node)) return compact ? GRID.phaseHCompact : GRID.phaseH;
  return compact ? GRID.nodeHCompact : GRID.nodeH;
}

/** Place one lane's nodes on the grid; returns { placed, rowHeights }. */
function placeLane(nodes, { columns, compact }) {
  // Row hint first (else rows interleave), then column hint, then authored order.
  const sorted = [...nodes].sort((a, b) => ((a.row ?? 0) - (b.row ?? 0)) || ((a.col ?? Infinity) - (b.col ?? Infinity)) || ((a.order ?? 0) - (b.order ?? 0)));
  const placed = [];
  const rowHeights = [];
  let cursorCol = 0;
  let row = 0;
  for (const node of sorted) {
    const span = clamp(node.span ?? 2, 2, 4);
    if (columns === 12 && Number.isInteger(node.row) && node.row > row) { row = node.row; cursorCol = 0; }
    if (columns === 12 && Number.isInteger(node.col) && node.col >= cursorCol && node.col + span <= columns) cursorCol = node.col;
    if (cursorCol + span > columns) { row += 1; cursorCol = 0; }
    const h = nodeHeight(node, compact);
    while (rowHeights.length <= row) rowHeights.push(0);
    rowHeights[row] = Math.max(rowHeights[row], h);
    placed.push({ node, row, col: cursorCol, span, h });
    cursorCol += span;
  }
  return { placed, rowHeights };
}

function titleLines(node, w, compact) {
  const maxChars = Math.max(4, Math.floor((w - 28) / GRID.charW));
  const out = {};
  for (const lang of ['en', 'es']) {
    const text = compact ? pick(node.shortLabel || node.label, lang) : pick(node.label, lang);
    out[lang] = compact ? [truncate(text, maxChars)] : wrapTitle(text, maxChars);
  }
  return { lines: out, maxChars, overflow: Math.max(out.en.length, out.es.length) > 2 };
}

/** Chevron outline for a phase node (points right; notch on both sides). */
export function chevronPath(x, y, w, h, notch = GRID.chevronNotch) {
  const my = y + h / 2;
  return `M${x} ${y} H${x + w - notch} L${x + w} ${my} L${x + w - notch} ${y + h} H${x} L${x + notch} ${my} Z`;
}

/** Polyline → SVG path with rounded corners of radius r (quadratic joins). */
export function roundedPath(points, r = GRID.cornerR) {
  if (points.length < 2) return '';
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i - 1]; const c = points[i]; const n = points[i + 1];
    const inLen = Math.hypot(c.x - p.x, c.y - p.y); const outLen = Math.hypot(n.x - c.x, n.y - c.y);
    const rr = Math.min(r, inLen / 2, outLen / 2);
    if (rr < 0.5) { d += ` L${c.x} ${c.y}`; continue; }
    const a = { x: c.x - ((c.x - p.x) / inLen) * rr, y: c.y - ((c.y - p.y) / inLen) * rr };
    const b = { x: c.x + ((n.x - c.x) / outLen) * rr, y: c.y + ((n.y - c.y) / outLen) * rr };
    d += ` L${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last.x} ${last.y}`;
}

const segLen = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
export function polylineLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i += 1) len += segLen(points[i - 1], points[i]);
  return len;
}

/** Point at fraction t ∈ [0,1] of a polyline (used for static packets and glyphs). */
export function pointAt(points, t) {
  const total = polylineLength(points);
  let target = clamp(t, 0, 1) * total;
  for (let i = 1; i < points.length; i += 1) {
    const l = segLen(points[i - 1], points[i]);
    if (target <= l || i === points.length - 1) {
      const f = l === 0 ? 0 : target / l;
      return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * f, y: points[i - 1].y + (points[i].y - points[i - 1].y) * f };
    }
    target -= l;
  }
  return { ...points[0] };
}

/** Midpoint of the longest segment (where an edge label sits). */
export function longestSegmentMid(points) {
  let best = { len: -1, mid: points[0] };
  for (let i = 1; i < points.length; i += 1) {
    const len = segLen(points[i - 1], points[i]);
    if (len > best.len) best = { len, mid: { x: (points[i - 1].x + points[i].x) / 2, y: (points[i - 1].y + points[i].y) / 2 } };
  }
  return best.mid;
}

const rectOf = (n) => ({ left: n.x, right: n.x + n.w, top: n.y, bottom: n.y + n.h, cx: n.x + n.w / 2, cy: n.y + n.h / 2 });

function routeAdjacent(s, t, lanes, laneIdx, index, off) {
  const down = laneIdx.get(t.layer) > laneIdx.get(s.layer);
  const upper = down ? lanes[laneIdx.get(s.layer)] : lanes[laneIdx.get(t.layer)];
  const gapTop = upper.y + upper.h;
  const midY = gapTop + GRID.tracks[index % GRID.tracks.length];
  const S = rectOf(s); const T = rectOf(t);
  return [
    { x: S.cx + off, y: down ? S.bottom : S.top },
    { x: S.cx + off, y: midY },
    { x: T.cx + off, y: midY },
    { x: T.cx + off, y: down ? T.top : T.bottom },
  ];
}

function routeBus(s, t, ctx, off) {
  const S = rectOf(s); const T = rectOf(t);
  const side = ctx.edge.bus || ((S.cx + T.cx) / 2 < ctx.canvasWidth / 2 ? 'left' : 'right');
  const k = ctx.busCount[side] % 3;
  ctx.busCount[side] += 1;
  // Three tracks (34 · 36 · 38) inside the gutter gap: clear of the bracket (x 8–30) and of column 0 (x 40).
  const busX = side === 'left' ? GRID.busInset + k * 2 + off : ctx.canvasWidth - GRID.busInset - k * 2 + off;
  const sx = side === 'left' ? S.left : S.right;
  const tx = side === 'left' ? T.left : T.right;
  return [
    { x: sx, y: S.cy + off },
    { x: busX, y: S.cy + off },
    { x: busX, y: T.cy + off },
    { x: tx, y: T.cy + off },
  ];
}

function routeSameLane(s, t, off) {
  const S = rectOf(s); const T = rectOf(t);
  if (s.row === t.row) {
    const leftToRight = S.cx <= T.cx;
    return [{ x: leftToRight ? S.right : S.left, y: S.cy + off }, { x: leftToRight ? T.left : T.right, y: T.cy + off }];
  }
  const down = t.row > s.row;
  const gapY = down ? (S.bottom + T.top) / 2 : (T.bottom + S.top) / 2;
  return [
    { x: S.cx + off, y: down ? S.bottom : S.top },
    { x: S.cx + off, y: gapY },
    { x: T.cx + off, y: gapY },
    { x: T.cx + off, y: down ? T.top : T.bottom },
  ];
}

function pairOffsets(edges) {
  const out = new Map();
  for (const e of edges) {
    if (!e.pair) continue;
    const [a, b] = [e.id, e.pair].sort();
    out.set(a, -GRID.pairOffset); out.set(b, GRID.pairOffset);
  }
  return out;
}

function routeEdges(map, nodes, lanes, laneIdx, canvasWidth) {
  const offsets = pairOffsets(map.edges || []);
  const ctx = { canvasWidth, busCount: { left: 0, right: 0 } };
  const phases = (map.nodes || []).filter((n) => n.kind === 'phase').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((n) => n.id);
  return (map.edges || []).map((edge, index) => {
    const s = nodes.get(edge.source); const t = nodes.get(edge.target);
    const base = { id: edge.id, kind: edge.kind, source: edge.source, target: edge.target, hidden: !s || !t || s.hidden || t.hidden };
    if (!s || !t) return { ...base, points: [], d: '', length: 0, label: { x: 0, y: 0 }, mid: { x: 0, y: 0 }, hidden: true };
    const off = offsets.get(edge.id) || 0;
    const ls = laneIdx.get(s.layer); const lt = laneIdx.get(t.layer);
    let points;
    if (ls === lt) points = routeSameLane(s, t, off);
    else if (Math.abs(ls - lt) === 1 && !edge.bus) points = routeAdjacent(s, t, lanes, laneIdx, index, off);
    else points = routeBus(s, t, { ...ctx, edge }, off);
    const phaseIndex = edge.kind === 'gate' ? phases.indexOf(edge.source) + 1 : 0;
    return { ...base, points, d: roundedPath(points), length: polylineLength(points), label: longestSegmentMid(points), mid: pointAt(points, 0.5), phaseIndex };
  });
}

/**
 * computeLayout(map, options) → { viewBox, width, height, columns, lanes[], nodes: Map, edges[], overflow[] }
 * options: { columns: 12 | 6, canvasWidth: 1600 | 784, compact: false, hiddenLayers: Set }
 */
export function computeLayout(map, options = {}) {
  const columns = options.columns === 6 ? 6 : 12;
  const canvasWidth = options.canvasWidth ?? (columns === 12 ? 1600 : 784);
  const compact = Boolean(options.compact);
  const hiddenLayers = options.hiddenLayers || new Set();
  const padX = columns === 12 ? 40 : 16;
  const layers = [...(map.layers || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const laneIdx = new Map(layers.map((l, i) => [l.id, i]));
  const nodes = new Map();
  const lanes = [];
  const overflow = [];
  let laneY = GRID.topPad;
  for (const layer of layers) {
    const members = (map.nodes || []).filter((n) => n.layer === layer.id);
    const hidden = hiddenLayers.has(layer.id);
    const { placed, rowHeights } = hidden ? { placed: [], rowHeights: [] } : placeLane(members, { columns, compact });
    const rowsH = rowHeights.reduce((a, b) => a + b, 0) + GRID.rowGap * Math.max(0, rowHeights.length - 1);
    const laneH = hidden ? GRID.hiddenLaneH : GRID.laneHeader + GRID.lanePad * 2 + rowsH;
    lanes.push({ id: layer.id, order: layer.order, bracket: layer.bracket, x: 0, y: laneY, w: canvasWidth, h: laneH, hidden, rows: rowHeights.length });
    const rowTop = [];
    let acc = laneY + GRID.laneHeader + GRID.lanePad;
    for (const h of rowHeights) { rowTop.push(acc); acc += h + GRID.rowGap; }
    for (const { node, row, col, span, h } of placed) {
      const w = span * GRID.colW + (span - 1) * GRID.gutter;
      const x = padX + col * (GRID.colW + GRID.gutter);
      const title = titleLines(node, w, compact);
      if (title.overflow) overflow.push(node.id);
      nodes.set(node.id, { id: node.id, layer: layer.id, kind: node.kind, x, y: rowTop[row], w, h, row, col, span, hidden: false, title: title.lines, maxChars: title.maxChars, tall: isTall(node) });
    }
    if (hidden) for (const n of members) nodes.set(n.id, { id: n.id, layer: layer.id, kind: n.kind, x: padX, y: laneY, w: 0, h: 0, row: 0, col: 0, span: 0, hidden: true, title: { en: [], es: [] }, maxChars: 0, tall: false });
    laneY += laneH + GRID.laneGap;
  }
  const height = laneY - GRID.laneGap + GRID.bottomPad;
  const edges = routeEdges(map, nodes, lanes, laneIdx, canvasWidth);
  return { viewBox: [0, 0, canvasWidth, height], width: canvasWidth, height, columns, compact, lanes, nodes, edges, overflow };
}

/** Bounding box of a set of node ids (skips unknown/hidden), padded. Null when empty. */
export function nodesBounds(layout, ids, pad = 0) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const id of ids || []) {
    const n = layout.nodes.get(id);
    if (!n || n.hidden) continue;
    x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + n.h);
  }
  if (!Number.isFinite(x0)) return null;
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

/** Bounding box of one lane (full width), padded vertically only. */
export function laneBounds(layout, laneId, pad = 0) {
  const lane = layout.lanes.find((l) => l.id === laneId);
  if (!lane) return null;
  return { x: lane.x, y: lane.y - pad, w: lane.w, h: lane.h + pad * 2 };
}

/** Union of two boxes. */
export function unionBounds(a, b) {
  if (!a) return b; if (!b) return a;
  const x = Math.min(a.x, b.x); const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** The whole map as a box. */
export const mapBounds = (layout) => ({ x: 0, y: 0, w: layout.width, h: layout.height });

/**
 * Nearest node in a direction (roving focus, §2.7): same lane first, then the adjacent lane.
 * `dir` ∈ left | right | up | down. Returns an id or null.
 */
export function nearestNode(layout, fromId, dir) {
  const from = layout.nodes.get(fromId);
  if (!from) return null;
  const laneOrder = layout.lanes.map((l) => l.id);
  const li = laneOrder.indexOf(from.layer);
  const fc = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const candidates = [...layout.nodes.values()].filter((n) => n.id !== fromId && !n.hidden);
  const ahead = (n) => {
    const c = { x: n.x + n.w / 2, y: n.y + n.h / 2 };
    if (dir === 'left') return c.x < fc.x - 1;
    if (dir === 'right') return c.x > fc.x + 1;
    if (dir === 'up') return c.y < fc.y - 1;
    return c.y > fc.y + 1;
  };
  const dist = (n) => {
    const c = { x: n.x + n.w / 2, y: n.y + n.h / 2 };
    const horizontal = dir === 'left' || dir === 'right';
    return horizontal ? Math.abs(c.x - fc.x) + Math.abs(c.y - fc.y) * 3 : Math.abs(c.y - fc.y) + Math.abs(c.x - fc.x) * 3;
  };
  const rank = (n) => {
    const d = Math.abs(laneOrder.indexOf(n.layer) - li);
    return dir === 'left' || dir === 'right' ? d * 10000 : d;
  };
  const pool = candidates.filter(ahead).sort((a, b) => (rank(a) - rank(b)) || (dist(a) - dist(b)));
  return pool.length ? pool[0].id : null;
}
