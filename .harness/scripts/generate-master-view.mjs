#!/usr/bin/env node
// Generates reference/core/sdlc/assets/master-view.svg — the E2E Product Vision
// diagram, faithful to product/suite/vision/evolith-product-vision-master.md.
import fs from 'fs';

const W = 1600, H = 1240;
const P = []; // svg fragments

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const push = (s) => P.push(s);

function rect(x, y, w, h, { rx = 12, fill = '#fff', stroke = 'none', sw = 1, cls = '', op = 1, dash = '' } = {}) {
  push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${op !== 1 ? ` opacity="${op}"` : ''}${cls ? ` class="${cls}"` : ''}/>`);
}
function text(x, y, s, { size = 13, fill = '#14212e', weight = 400, anchor = 'start', ls = 0, style = '', italic = false } = {}) {
  push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${ls ? ` letter-spacing="${ls}"` : ''}${italic ? ' font-style="italic"' : ''}${style ? ` style="${style}"` : ''}>${esc(s)}</text>`);
}
// multi-line centered text
function lines(cx, y, arr, { size = 13, fill = '#14212e', weight = 400, lh = 16, anchor = 'middle' } = {}) {
  arr.forEach((ln, i) => text(cx, y + i * lh, ln, { size, fill, weight, anchor }));
}
function chip(x, y, w, s, { h = 22, fill = '#ffffff', stroke = '#cbd5e1', tf = '#334155', size = 11.5, weight = 500 } = {}) {
  rect(x, y, w, h, { rx: 6, fill, stroke, sw: 1 });
  text(x + w / 2, y + h / 2 + 4, s, { size, fill: tf, weight, anchor: 'middle' });
}
function bandTitle(x, y, num, s, color) {
  push(`<circle cx="${x + 10}" cy="${y - 5}" r="10" fill="${color}"/>`);
  text(x + 10, y - 1, num, { size: 12.5, fill: '#fff', weight: 700, anchor: 'middle' });
  text(x + 28, y, s, { size: 14.5, fill: color, weight: 700, ls: 0.6 });
}
function arrow(x1, y1, x2, y2, { color = '#5b6b7b', sw = 2.4, dash = '', bi = false } = {}) {
  push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''} marker-end="url(#arr)"${bi ? ' marker-start="url(#arr)"' : ''}/>`);
}

// ---- palette
const C = {
  ink: '#14212e', muted: '#55677a', line: '#9fb0c0',
  fed: '#3a46a0', con: '#5a6b7f', trk: '#0e7d72', exp: '#2b6cb0',
  coreB: '#16334f', rt: '#6a4c93', dom: '#123a5c', corp: '#217a5f', rail: '#b5670f',
};

// ===== defs / background =====
push(`<defs>
<marker id="arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#5b6b7b"/></marker>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfcfe"/><stop offset="1" stop-color="#eef2f7"/></linearGradient>
<linearGradient id="domg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a4570"/><stop offset="1" stop-color="#102c47"/></linearGradient>
<filter id="sh" x="-4%" y="-4%" width="108%" height="112%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1c2b3a" flood-opacity="0.14"/></filter>
</defs>`);
rect(0, 0, W, H, { rx: 0, fill: 'url(#bg)' });

// ===== HEADER =====
// logo: 3 stacked isometric bars (teal)
const lx = 40, ly = 30;
const bar = (dy, col) => push(`<path d="M${lx},${ly + dy + 12} L${lx + 26},${ly + dy} L${lx + 52},${ly + dy + 12} L${lx + 26},${ly + dy + 24} Z" fill="${col}"/>`);
bar(0, '#2a9d8f'); bar(14, '#1f7a6b'); bar(28, '#155e53');
text(108, 52, 'EVOLITH', { size: 34, fill: C.ink, weight: 800, ls: 1 });
text(300, 52, '·  E2E PRODUCT VISION', { size: 30, fill: C.muted, weight: 300, ls: 0.5 });
text(110, 80, 'Governed Composition  ·  Stateless Evaluation Core  ·  Federated Five-Phase SDLC', { size: 13.5, fill: C.trk, weight: 600 });
text(W - 40, 52, 'repo · evolith_arch32', { size: 13, fill: C.muted, weight: 600, anchor: 'end' });
text(W - 40, 72, 'ADR-0101 · 0074 · 0075 · 0102', { size: 11.5, fill: C.line, weight: 600, anchor: 'end' });

// ===== BAND A — FEDERATED GOVERNANCE =====
rect(36, 106, 1528, 106, { rx: 14, fill: '#eaecf8', stroke: '#c3c8ec', sw: 1.2 });
bandTitle(56, 132, '1', 'FEDERATED GOVERNANCE · HUB-AND-SPOKE (INH-04)', C.fed);
const fp = (x, w, t1, t2) => { rect(x, 148, w, 44, { rx: 10, fill: '#fff', stroke: '#b9c0e6', sw: 1.3, cls: '' }); text(x + w / 2, 166, t1, { size: 13, fill: '#2c3690', weight: 700, anchor: 'middle' }); text(x + w / 2, 183, t2, { size: 11.5, fill: C.muted, anchor: 'middle' }); };
fp(72, 300, 'Evolith Core — Level 0', 'the Constitution');
fp(614, 320, 'Satellite Products — Level 1', 'e.g., UMS · other trackers');
fp(1176, 316, 'Architecture Board', 'approves upstream promotion');
arrow(372, 170, 614, 170, { color: C.fed });
text(493, 162, 'Rule Heritage (inherit)', { size: 11, fill: C.fed, weight: 600, anchor: 'middle' });
arrow(934, 170, 1176, 170, { color: C.fed });
text(1055, 162, 'Upstream Proposal', { size: 11, fill: C.fed, weight: 600, anchor: 'middle' });
text(810, 205, 'Approved promotions flow upstream through evidence-backed review; every satellite re-inherits the evolved Constitution.', { size: 11.5, fill: C.muted, anchor: 'middle', italic: true });

// ===== BAND B — CONSUMPTION =====
rect(36, 224, 1528, 116, { rx: 14, fill: '#eef1f5', stroke: '#c8d2dd', sw: 1.2 });
bandTitle(56, 250, '2', 'CONSUMPTION · AI-NATIVE  (Convention over Configuration)', C.con);
// human group
rect(72, 264, 720, 62, { rx: 10, fill: '#e9f2fb', stroke: '#9cc2e6', sw: 1.2 });
text(88, 283, 'HUMAN-DRIVEN', { size: 12, fill: '#1f5c96', weight: 700 });
['Tracker PWA (Web · Mobile)', 'VS Code / IDEs', 'CI / CD', 'Enterprise integrations'].forEach((s, i) => chip(88 + i * 176, 294, 166, s, { fill: '#fff', stroke: '#bcd7ef', tf: '#1f5c96' }));
// agent group
rect(808, 264, 736, 62, { rx: 10, fill: '#efe9f6', stroke: '#c3b0dd', sw: 1.2 });
text(824, 283, 'AGENT-DRIVEN', { size: 12, fill: '#5a3d86', weight: 700 });
['Claude Desktop', 'Open-Source LLMs (free & paid)', 'Autonomous Agents / MCP clients'].forEach((s, i) => chip(824 + i * 238, 294, 228, s, { fill: '#fff', stroke: '#d3c4e6', tf: '#5a3d86' }));
text(800, 335, 'The chatbox is an intermediary, not the source of authority — LLMs and agents consume approved context, rulesets, skills and permissions through Evolith contracts.', { size: 11, fill: C.muted, anchor: 'middle', italic: true });

// consumers -> tracker (humans use the PWA) and note agents reach the exposure layer
arrow(320, 340, 320, 352, { color: C.con });
text(360, 348, 'humans → Tracker PWA', { size: 10, fill: C.con, weight: 600 });

// ===== BAND C — EVOLITH TRACKER + 5-PHASE SDLC =====
rect(36, 352, 1528, 300, { rx: 14, fill: '#e3f1ef', stroke: '#a6d5cf', sw: 1.3 });
bandTitle(56, 378, '3', 'EVOLITH TRACKER · repo evolith_tracker — SaaS SDLC ORCHESTRATOR & AUDITOR  (external client)', C.trk);
rect(72, 392, 300, 40, { rx: 9, fill: '#fff', stroke: '#a6d5cf', sw: 1.2 }); text(222, 416, 'PWA · Web · Mobile', { size: 12.5, fill: C.trk, weight: 700, anchor: 'middle' });
rect(388, 392, 520, 40, { rx: 9, fill: '#fff', stroke: '#a6d5cf', sw: 1.2 }); text(648, 410, 'BFF · Application Gateway (NestJS · ADR-0075)', { size: 12.5, fill: C.trk, weight: 700, anchor: 'middle' }); text(648, 425, 'device payloads · PII stripping · session / cookies', { size: 10.5, fill: C.muted, anchor: 'middle' });
rect(924, 392, 620, 40, { rx: 9, fill: '#d6ede9', stroke: '#a6d5cf', sw: 1.2 }); text(1234, 410, 'Owns runtime governance state', { size: 12, fill: '#0d6b62', weight: 700, anchor: 'middle' }); text(1234, 425, 'phases · gates · evidence · exceptions · agent runs · immutable audit', { size: 10.3, fill: C.muted, anchor: 'middle' });

// 5-phase chevrons
const phases = [
  { c: '#4a90c2', t: ['DISCOVERY', '& IDEATION'], g: 'Business Sign-Off', b: ['Discovery Canvas', 'Build-vs-Compose'] },
  { c: '#2f9e8f', t: ['ARCHITECTURE', 'SPEC-DRIVEN'], g: 'Design Baseline', b: ['Contracts · ADRs', 'Threat & risk'] },
  { c: '#7fae3f', t: ['CONSTRUCTION', 'TRACKING'], g: 'Successful Build', b: ['CI · DoD', 'Architecture drift'] },
  { c: '#46a06e', t: ['AUTOMATED QA', '& INTEGRATION'], g: 'RC Stamped', b: ['Tests · Coverage', 'Security · Contracts'] },
  { c: '#e0863a', t: ['DYNAMIC', 'RELEASE PLANNER'], g: 'Production Live', b: ['Rollout · Rollback', 'Observability'] },
];
const chY = 450, chH = 132, chW = 300, notch = 24, step = 298;
push(`<text x="810" y="447" font-size="12.5" fill="${C.trk}" font-weight="700" text-anchor="middle" letter-spacing="3">SDLC EXECUTION ENGINE  ·  orchestrated by Tracker  ·  evaluated by Core</text>`);
phases.forEach((ph, i) => {
  const x0 = 56 + i * step;
  const pts = `${x0},${chY} ${x0 + chW - notch},${chY} ${x0 + chW},${chY + chH / 2} ${x0 + chW - notch},${chY + chH} ${x0},${chY + chH} ${x0 + notch},${chY + chH / 2}`;
  push(`<polygon points="${pts}" fill="${ph.c}" filter="url(#sh)"/>`);
  const cx = x0 + notch + (chW - notch) / 2 + 4;
  text(x0 + notch + 8, chY + 20, `PHASE ${i + 1}`, { size: 10, fill: '#ffffff', weight: 700, ls: 1 });
  lines(cx, chY + 42, ph.t, { size: 14.5, fill: '#fff', weight: 800, lh: 17 });
  // gate pill
  rect(cx - 92, chY + 70, 184, 20, { rx: 10, fill: '#ffffff', stroke: 'none' });
  push(`<circle cx="${cx - 78}" cy="${chY + 80}" r="6" fill="${ph.c}"/><path d="M${cx - 81},${chY + 80} l2,2 l4,-4" stroke="#fff" stroke-width="1.5" fill="none"/>`);
  text(cx + 8, chY + 84, `Gate: ${ph.g}`, { size: 11, fill: ph.c, weight: 700, anchor: 'middle' });
  lines(cx, chY + 108, ph.b, { size: 11, fill: '#f2f8ff', weight: 500, lh: 14 });
});
text(810, 612, 'Granularity = Initiatives — no tasks / backlog / epics / user-stories.  Agile work items are ExternalReferenceContext ingested via ACL.', { size: 11.5, fill: '#0d6b62', weight: 600, anchor: 'middle' });
text(810, 632, 'Tracker decides every phase transition · Core recommendations are non-binding.', { size: 11.5, fill: C.muted, anchor: 'middle', italic: true });

// ===== BAND D — CORE API EXPOSURE LAYER =====
rect(36, 660, 1144, 100, { rx: 14, fill: '#e7f0fb', stroke: '#a9caea', sw: 1.3 });
bandTitle(56, 686, '4', 'CORE API EXPOSURE LAYER · product-neutral (ADR-0074)', C.exp);
const expo = [
  ['apps/core-api', 'REST · 8 controllers'],
  ['mcp-server', 'MCP · 26 tools · 9 resources'],
  ['smart-cli', 'CLI · 20 commands'],
];
expo.forEach((e, i) => { const x = 72 + i * 372, w = 356; rect(x, 698, w, 40, { rx: 9, fill: '#fff', stroke: '#a9caea', sw: 1.2 }); text(x + w / 2, 715, e[0], { size: 13, fill: C.exp, weight: 800, anchor: 'middle' }); text(x + w / 2, 730, e[1], { size: 11, fill: C.muted, anchor: 'middle' }); });
text(56, 752, 'Tracker BFF consumes this surface as an external client — ADR-0074 explicitly rejected placing the BFF inside Core.', { size: 11, fill: C.muted, italic: true });

// C -> D and D <-> E arrows
arrow(608, 652, 608, 660, { color: C.trk });
text(620, 648, 'REST · MCP · CLI', { size: 10, fill: C.trk, weight: 600 });
arrow(500, 760, 500, 806, { color: C.exp }); text(512, 786, 'delegate evaluation', { size: 10, fill: C.exp, weight: 600 });
arrow(720, 806, 720, 760, { color: C.dom }); text(732, 786, 'EvaluationResult', { size: 10, fill: C.dom, weight: 600 });

// ===== BAND E — EVOLITH CORE ENGINE =====
rect(36, 772, 1144, 442, { rx: 14, fill: '#eef2f7', stroke: C.coreB, sw: 1.6 });
bandTitle(56, 798, '5', 'EVOLITH CORE · repo evolith_arch32 — the Constitution & stateless engine', C.coreB);

// E1 Agent Runtime
rect(56, 808, 1104, 92, { rx: 11, fill: '#efe9f6', stroke: '#c3b0dd', sw: 1.3 });
text(72, 830, 'AGENT RUNTIME · @evolith/agent-runtime (ADR-0102)', { size: 13.5, fill: '#5a3d86', weight: 800 });
text(72, 852, 'AgentRuntimeService — 12 hexagonal ports · 30 adapters', { size: 12, fill: C.ink });
text(72, 872, 'InteractionAdapters:', { size: 12, fill: C.ink, weight: 700 });
['CLI', 'Chat', 'Hermes', 'MCP', 'External'].forEach((s, i) => chip(196 + i * 92, 861, 84, s, { fill: '#fff', stroke: '#d3c4e6', tf: '#5a3d86' }));
rect(700, 858, 250, 26, { rx: 8, fill: '#fff', stroke: '#c3b0dd' }); text(825, 875, 'Governed orchestration: OPA + HITL', { size: 11.5, fill: '#5a3d86', weight: 700, anchor: 'middle' });
text(972, 852, 'Agents are replaceable', { size: 10.5, fill: C.muted, italic: true, anchor: 'start' });
text(972, 866, 'executors, not authorities.', { size: 10.5, fill: C.muted, italic: true, anchor: 'start' });

// E2 Domain — stateless evaluation engine
rect(56, 910, 1104, 134, { rx: 11, fill: 'url(#domg)', stroke: '#0e2a44', sw: 1.3 });
text(72, 934, 'DOMAIN · @evolith/core-domain — STATELESS EVALUATION ENGINE (ADR-0101)', { size: 13.5, fill: '#eaf3ff', weight: 800 });
text(72, 956, 'EvaluationOrchestrator · 5 KindEvaluators · OPA dual-engine parity (Native TS + OPA/WASM)', { size: 12, fill: '#c7dcf2' });
text(72, 980, 'Kinds', { size: 11, fill: '#9fc2e6', weight: 700 });
const kinds1 = ['gate', 'artifact', 'evidence', 'architecture', 'blueprint'];
const kinds2 = ['topology', 'checkpoint', 'deployment', 'rule', 'compliance'];
kinds1.forEach((s, i) => chip(120 + i * 128, 970, 118, s, { fill: '#1e4a73', stroke: '#3a6a97', tf: '#eaf3ff', weight: 700 }));
kinds2.forEach((s, i) => chip(120 + i * 128, 998, 118, s, { fill: '#1e4a73', stroke: '#3a6a97', tf: '#eaf3ff', weight: 700 }));
// formula pill
rect(786, 966, 358, 62, { rx: 10, fill: '#0c2338', stroke: '#3a6a97', sw: 1.2 });
text(965, 990, 'EvaluationContext  →  EvaluationResult', { size: 13, fill: '#8fe3c9', weight: 800, anchor: 'middle' });
text(965, 1010, 'non-binding verdicts + recommendations', { size: 10.5, fill: '#c7dcf2', anchor: 'middle' });
text(72, 1032, 'Does not persist — Tracker owns governance state at runtime.', { size: 11, fill: '#9fc2e6', italic: true });

// E3 Reference Corpus
rect(56, 1054, 1104, 150, { rx: 11, fill: '#e6f4ee', stroke: '#8fcbb5', sw: 1.3 });
text(72, 1077, 'REFERENCE CORPUS · Constitution', { size: 13.5, fill: '#1f6e57', weight: 800 });
text(320, 1077, 'human-readable · machine-consumable', { size: 11, fill: C.muted, italic: true });
const corp = [
  'ADRs · core · platform · ai-augmented',
  'Rulesets · 26 categories',
  'Standards & Taxonomies',
  'Artifact & Evidence Schemas',
  'Phase Gate Definitions',
  'Adapter & Integration Contracts',
];
corp.forEach((s, i) => { const col = i % 3, row = Math.floor(i / 3); chip(72 + col * 362, 1092 + row * 34, 348, s, { h: 26, fill: '#fff', stroke: '#a9dcc8', tf: '#1f6e57', size: 12 }); });
// Knowledge OS highlighted (new)
rect(72, 1162, 1072, 32, { rx: 8, fill: '#d6f0e4', stroke: '#3fa07f', sw: 1.4 });
text(88, 1182, 'Knowledge OS', { size: 12.5, fill: '#176b50', weight: 800 });
text(210, 1182, '— canonical glossary · executable-test oracle · CI freshness gate  ·  "memory for the product, not the AI"', { size: 11.5, fill: '#1f6e57' });
push(`<rect x="1052" y="1167" width="82" height="22" rx="11" fill="#2e9d5b"/><text x="1093" y="1182" font-size="11" fill="#fff" font-weight="800" text-anchor="middle">NEW · M0+M1</text>`);

// ===== RIGHT RAIL — GOVERNED COMPOSITION =====
rect(1200, 660, 364, 554, { rx: 14, fill: '#fbf1e3', stroke: '#e5b878', sw: 1.4 });
bandTitle(1216, 686, '6', 'GOVERNED COMPOSITION', C.rail);
text(1216, 706, 'Build the kernel · compose commodities', { size: 11, fill: C.muted, italic: true });
text(1216, 720, 'behind replaceable Ports & ACLs.', { size: 11, fill: C.muted, italic: true });
// ports
rect(1216, 732, 332, 150, { rx: 10, fill: '#fff', stroke: '#e5b878', sw: 1.1 });
text(1232, 752, 'Provider Ports (Adapter Taxonomy)', { size: 12, fill: C.rail, weight: 800 });
const ports = ['Work', 'Repository', 'CI/CD', 'Testing', 'Security', 'Deployment', 'Analytics', 'LLM Obs.', 'Agent Exec', 'Collab', 'Memory', 'Approval', 'Scheduler', 'Harness', 'Core Eval', 'Policy Val'];
ports.forEach((s, i) => { const col = i % 4, row = Math.floor(i / 4); chip(1232 + col * 80, 760 + row * 28, 74, s, { h: 22, fill: '#fdf6ea', stroke: '#ecd3aa', tf: '#8a5210', size: 10 }); });
// ACL bar
rect(1216, 892, 332, 42, { rx: 9, fill: '#f6e2c4', stroke: '#e5b878', sw: 1.3 });
text(1382, 910, 'Anti-Corruption Layers (ACLs)', { size: 12, fill: '#8a5210', weight: 800, anchor: 'middle' });
text(1382, 926, 'preserve lineage · map to canonical · reject non-compliant', { size: 9.8, fill: C.muted, anchor: 'middle' });
// external tools
rect(1216, 944, 332, 132, { rx: 10, fill: '#eef1f5', stroke: '#c3cdd8', sw: 1.1 });
text(1232, 964, 'External Tools Cluster', { size: 12, fill: '#475569', weight: 800 });
const ext = ['Jira', 'GitHub / GitLab', 'CI/CD runners', 'Test runners', 'Security scanners', 'Observability', 'Deployment', 'Doc engines'];
ext.forEach((s, i) => { const col = i % 2, row = Math.floor(i / 2); chip(1232 + col * 160, 972 + row * 25, 152, s, { h: 21, fill: '#fff', stroke: '#cbd5e1', tf: '#475569', size: 10.5 }); });
// dispositions
text(1216, 1096, 'Disposition per capability', { size: 11, fill: C.rail, weight: 700 });
['Adopt', 'Embed', 'Integrate', 'Extend', 'Build', 'Reject'].forEach((s, i) => { const col = i % 3, row = Math.floor(i / 3); chip(1216 + col * 112, 1104 + row * 26, 106, s, { h: 22, fill: '#fff', stroke: '#e5b878', tf: '#8a5210', size: 10.5, weight: 700 }); });
text(1382, 1188, 'Data ownership stays with the source of record; Tracker judges evidence.', { size: 9.5, fill: C.muted, anchor: 'middle', italic: true });

// rail <-> core arrow
arrow(1200, 954, 1160, 954, { color: C.rail, bi: true });
text(1180, 946, 'commands · events · evidence', { size: 10, fill: C.rail, weight: 600, anchor: 'end' });

// footer
text(W - 40, H - 16, 'Source of truth: product/suite/vision/evolith-product-vision-master.md', { size: 10.5, fill: C.line, anchor: 'end', italic: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">\n${P.join('\n')}\n</svg>\n`;
const out = process.argv[2] || 'reference/core/sdlc/assets/master-view.svg';
fs.writeFileSync(out, svg);
console.log('wrote', out, svg.length, 'bytes');
