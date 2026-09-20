#!/usr/bin/env node
/**
 * generate-readme-demo.mjs — the animated terminal on the front page.
 *
 * Emits two animated terminals, each with an EN and an ES caption:
 *
 *   docs/assets/evolith-demo{,.es}.svg        the two-command first run (`init`, `validate`)
 *   docs/assets/evolith-gates-demo{,.es}.svg  the phase gate (`gate evaluate`, `phase advance`)
 *
 * A self-contained SVG that replays the commands and what they print. No GIF, no
 * recorder, no binary in git — CSS keyframes inside the SVG, which GitHub renders
 * animated inside an `<img>`.
 *
 * Every line of terminal output below is a verbatim row of a real run of the
 * published CLI (`npx -y @beyondnet/evolith-cli@1.3.2`) on a freshly `git init`-ed
 * directory. The first scene is the 2026-09-14 run whose full 71-row table is in
 * `docs/evidence/first-run-capture.md`; the second is the 2026-09-20 run in
 * `docs/evidence/phase-gate-capture.md`, made in a clean `node:20` container with
 * a checkout of this repository mounted at `../evolith` — the published tarball
 * does not carry the gate definitions, so `--core` is not optional yet (GT-714).
 * The only lines that are NOT output are the `⋯` elision rows and the caption
 * under the terminal, and both are styled so a reader cannot mistake them for
 * something the tool printed.
 *
 * Regenerate after changing a scene or a capture:
 *   node .harness/scripts/generate-readme-demo.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = join(ROOT, 'docs', 'assets');

// --- Palette (GitHub dark, so the frame reads as one piece with the README) ----
const C = {
  bg: '#0d1117',
  chrome: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  dim: '#8b949e',
  green: '#3fb950',
  red: '#f85149',
  yellow: '#d29922',
  blue: '#58a6ff',
  purple: '#bc8cff',
};

const W = 1000;
const FONT = 12;
const LH = 21; // line height
const PAD_X = 24;
const TOP = 56; // below the title bar
const LOOP = 24; // seconds per cycle, including the hold at the end (first-run scene)

// --- Scene ------------------------------------------------------------------
// Each entry: { at: seconds, kind, ... }. `type` entries reveal word by word.
const scene = (caption) => [
  { at: 0.4, kind: 'type', prompt: true, text: 'npx -y @beyondnet/evolith-cli init --name my-project --yes' },
  { at: 2.4, kind: 'line', spans: [[C.purple, '◆  '], [C.green, '✓ '], [C.text, 'Satellite my-project initialised']] },
  { at: 2.7, kind: 'line', spans: [[C.dim, '●      - '], [C.text, 'evolith.yaml']] },
  { at: 3.3, kind: 'blank' },
  { at: 3.5, kind: 'type', prompt: true, text: 'npx -y @beyondnet/evolith-cli validate --engine opa' },
  { at: 5.4, kind: 'line', spans: [[C.dim, '┌  '], [C.text, 'Evolith SDK — Standards Validation']] },
  { at: 6.4, kind: 'line', spans: [[C.text, '**Status:** '], [C.red, 'failed']] },
  { at: 6.6, kind: 'line', spans: [[C.text, '**Rules Checked:** 133']] },
  { at: 6.8, kind: 'line', spans: [[C.text, '**Rules Skipped:** '], [C.yellow, '26']] },
  { at: 7.0, kind: 'line', spans: [[C.text, '**Rules Errored:** 0']] },
  { at: 7.2, kind: 'line', spans: [[C.text, '**Rules Total:** 159']] },
  { at: 7.6, kind: 'line', spans: [[C.dim, '| Rule Id | Severity | Category | Title | Blocking |']] },
  { at: 7.8, kind: 'line', spans: [[C.dim, '| --- | --- | --- | --- | --- |']] },
  { at: 8.0, kind: 'line', spans: [[C.text, '| ACL-01 | MUST | anti-corruption | Schema Validation Before Ingestion | '], [C.red, 'YES'], [C.text, ' |']] },
  { at: 8.2, kind: 'line', spans: [[C.text, '| CICD-01 | MUST | security-scan | CodeQL Static Analysis runs on every PR | '], [C.red, 'YES'], [C.text, ' |']] },
  { at: 8.4, kind: 'line', spans: [[C.text, '| MTN-01 | MUST | filtering-layer | Application-layer tenant filtering is primary | '], [C.red, 'YES'], [C.text, ' |']] },
  { at: 8.7, kind: 'line', spans: [[C.dim, '  ⋯  64 more rows — 71 in total, full capture in docs/evidence/first-run-capture.md']], italic: true },
  { at: 9.2, kind: 'line', spans: [[C.text, '| QT-05 | MUST | testing | '], [C.yellow, 'Blocking rule did not run: Testing Pyramid Distribution'], [C.text, ' | '], [C.red, 'YES'], [C.text, ' |']] },
  { at: 9.5, kind: 'line', spans: [[C.text, '| SEC-INJ-01 | MUST | security | '], [C.yellow, 'Blocking rule did not run: No shell exec with user input'], [C.text, ' | '], [C.red, 'YES'], [C.text, ' |']] },
  { at: 9.8, kind: 'line', spans: [[C.text, '| SEC-PATH-01 | MUST | security | '], [C.yellow, 'Blocking rule did not run: Path input sanitization'], [C.text, ' | '], [C.red, 'YES'], [C.text, ' |']] },
  { at: 10.1, kind: 'line', spans: [[C.text, '| SEC-RL-01 | MUST | security | '], [C.yellow, 'Blocking rule did not run: Rate limiting on HTTP endpoints'], [C.text, ' | '], [C.red, 'YES'], [C.text, ' |']] },
  { at: 10.6, kind: 'line', spans: [[C.text, '**Selection:** '], [C.dim, '{"source":"core-default","rulesSelected":412,"corpusTotal":412}']] },
  { at: 11.0, kind: 'line', spans: [[C.dim, '└  '], [C.red, '❌ Validation failed. See the errors above.']] },
  { at: 11.8, kind: 'blank' },
  { at: 12.0, kind: 'type', prompt: true, text: 'echo $?' },
  { at: 12.8, kind: 'line', spans: [[C.red, '2']], bold: true },
  { at: 13.6, kind: 'blank' },
  { at: 14.0, kind: 'caption', spans: caption[0] },
  { at: 14.6, kind: 'caption', spans: caption[1] },
  { at: 15.2, kind: 'caption', spans: caption[2] },
  { at: 16.0, kind: 'cursor' },
];

const CAPTIONS = {
  en: [
    [[C.dim, '# '], [C.text, '133 evaluated · 26 skipped — '], [C.yellow, '9 of the skipped were blocking'], [C.text, ':']],
    [[C.dim, '# '], [C.text, 'reported as failures, not painted green.']],
    [[C.dim, '# '], [C.green, 'exit 2'], [C.text, ' = the gate blocked · '], [C.green, 'exit 1'], [C.text, ' or '], [C.green, '3'], [C.text, ' = it never ran.']],
  ],
  es: [
    [[C.dim, '# '], [C.text, '133 evaluadas · 26 omitidas — '], [C.yellow, '9 de las omitidas eran bloqueantes'], [C.text, ':']],
    [[C.dim, '# '], [C.text, 'se reportan como fallo, no se pintan de verde.']],
    [[C.dim, '# '], [C.green, 'exit 2'], [C.text, ' = el gate bloqueó · '], [C.green, 'exit 1'], [C.text, ' o '], [C.green, '3'], [C.text, ' = nunca corrió.']],
  ],
};

// --- Scene 2: the phase gate ---------------------------------------------------
// Verbatim rows of `docs/evidence/phase-gate-capture.md` (2026-09-20, 1.3.2, in a
// clean container: `/work/my-project` next to `/work/evolith`). The gate names six
// missing Discovery artifacts; two are shown and four elided, the second command
// repeats the same six and is elided down to its verdict.
const GATES_LOOP = 22;
const ART = 'Artifact not found: /work/my-project/docs/';
const gatesScene = (caption) => [
  { at: 0.4, kind: 'type', prompt: true, text: 'npx -y @beyondnet/evolith-cli gate evaluate --phase discovery --core ../evolith' },
  { at: 2.6, kind: 'line', spans: [[C.dim, '┌  '], [C.text, 'Gate business-sign-off — phase discovery']] },
  { at: 3.4, kind: 'line', spans: [[C.dim, '●  '], [C.text, 'Verdict: '], [C.red, 'FAILED'], [C.text, ' (ruleset rulesets/sdlc/phase-gates.rules.json@2.0.0)']] },
  { at: 3.9, kind: 'line', spans: [[C.yellow, '▲  '], [C.red, '[error]'], [C.text, ' PG-1-EVIDENCE-prd @ PRD: '], [C.dim, `${ART}prd.md`]] },
  { at: 4.2, kind: 'line', spans: [[C.yellow, '▲  '], [C.red, '[error]'], [C.text, ' PG-1-EVIDENCE-discovery-canvas @ Discovery Canvas: '], [C.dim, `${ART}discovery-canvas.md`]] },
  { at: 4.5, kind: 'line', spans: [[C.dim, '  ⋯  4 more — technical-feasibility-canvas, ballpark-estimation, moscow-prioritization-matrix, build-versus-compose-analysis']], italic: true },
  { at: 4.9, kind: 'line', spans: [[C.dim, '└  '], [C.text, 'Evaluated by human at 2026-09-20T03:45:10.277Z']] },
  { at: 5.5, kind: 'blank' },
  { at: 5.7, kind: 'type', prompt: true, text: 'echo $?' },
  { at: 6.3, kind: 'line', spans: [[C.red, '2']], bold: true },
  { at: 6.9, kind: 'blank' },
  { at: 7.1, kind: 'type', prompt: true, text: 'npx -y @beyondnet/evolith-cli phase advance --from discovery --to design --core ../evolith' },
  { at: 9.3, kind: 'line', spans: [[C.dim, '┌  '], [C.text, 'Phase Transition Proposal: discovery -> design']] },
  { at: 10.0, kind: 'line', spans: [[C.dim, '●  '], [C.text, 'Transition is '], [C.red, 'NOT RECOMMENDED']] },
  { at: 10.4, kind: 'line', spans: [[C.dim, '●  '], [C.text, 'Evidence Verdict: '], [C.red, 'FAILED'], [C.text, ' (ruleset rulesets/sdlc/phase-gates.rules.json@2.0.0)']] },
  { at: 10.7, kind: 'line', spans: [[C.dim, '  ⋯  the same six [error] rows']], italic: true },
  { at: 11.0, kind: 'line', spans: [[C.dim, '└  '], [C.text, 'Proposed at 2026-09-20T03:45:12.501Z']] },
  { at: 11.6, kind: 'blank' },
  { at: 11.8, kind: 'type', prompt: true, text: 'echo $?' },
  { at: 12.4, kind: 'line', spans: [[C.red, '2']], bold: true },
  { at: 13.2, kind: 'blank' },
  { at: 13.6, kind: 'caption', spans: caption[0] },
  { at: 14.2, kind: 'caption', spans: caption[1] },
  { at: 14.8, kind: 'caption', spans: caption[2] },
  { at: 15.6, kind: 'cursor' },
];

const GATES_CAPTIONS = {
  en: [
    [[C.dim, '# '], [C.text, 'six Discovery artifacts missing → the gate '], [C.red, 'FAILED'], [C.text, ' and discovery → design is '], [C.red, 'NOT RECOMMENDED'], [C.text, '.']],
    [[C.dim, '# '], [C.text, 'nothing moved: '], [C.green, 'phase advance'], [C.text, ' proposes and leaves the evidence; a human — or the Tracker — decides.']],
    [[C.dim, '# '], [C.green, '--core ../evolith'], [C.text, ' = a checkout of this repository. The tarball does not carry the gate definitions yet (GT-714).']],
  ],
  es: [
    [[C.dim, '# '], [C.text, 'faltan seis artefactos de Discovery → el gate '], [C.red, 'FAILED'], [C.text, ' y discovery → design '], [C.red, 'NOT RECOMMENDED'], [C.text, '.']],
    [[C.dim, '# '], [C.text, 'nada avanzó: '], [C.green, 'phase advance'], [C.text, ' propone y deja la evidencia; decide un humano — o el Tracker.']],
    [[C.dim, '# '], [C.green, '--core ../evolith'], [C.text, ' = un checkout de este repositorio. El tarball aún no trae las definiciones de gate (GT-714).']],
  ],
};

const SCENES = {
  'evolith-demo': {
    build: scene,
    captions: CAPTIONS,
    loop: LOOP,
    title: { en: 'my-project — evolith (first run)', es: 'my-project — evolith (primera ejecución)' },
    label: {
      en: 'Terminal: evolith init, evolith validate; 133 rules evaluated, 26 skipped, 9 blocking rules not evaluated reported as failures; exit 2',
      es: 'Terminal: evolith init, evolith validate; 133 reglas evaluadas, 26 omitidas, 9 bloqueantes no evaluadas reportadas como fallo; exit 2',
    },
  },
  'evolith-gates-demo': {
    build: gatesScene,
    captions: GATES_CAPTIONS,
    loop: GATES_LOOP,
    title: { en: 'my-project — evolith (phase gate)', es: 'my-project — evolith (compuerta de fase)' },
    label: {
      en: 'Terminal: evolith gate evaluate --phase discovery reports the gate FAILED with six missing artifacts, exit 2; evolith phase advance --from discovery --to design answers NOT RECOMMENDED, exit 2',
      es: 'Terminal: evolith gate evaluate --phase discovery reporta el gate FAILED con seis artefactos ausentes, exit 2; evolith phase advance --from discovery --to design responde NOT RECOMMENDED, exit 2',
    },
  },
};

// --- Rendering ---------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render(lang, sceneDef) {
  const LOOP = sceneDef.loop;
  const pct = (s) => ((s / LOOP) * 100).toFixed(2);
  const items = sceneDef.build(sceneDef.captions[lang]);
  const styles = [];
  const body = [];
  let row = 0;
  let id = 0;

  // A line that appears at `at` seconds and stays until the loop restarts.
  const appear = (at) => {
    const k = `a${id++}`;
    const p = pct(at);
    styles.push(`@keyframes ${k}{0%,${p}%{opacity:0}${(Number(p) + 0.01).toFixed(2)}%,100%{opacity:1}}`);
    return `.${k}{opacity:0;animation:${k} ${LOOP}s steps(1,end) infinite}`;
  };
  const cls = (at) => {
    const s = appear(at);
    styles.push(s);
    return s.slice(1, s.indexOf('{'));
  };

  for (const it of items) {
    const y = TOP + row * LH;
    if (it.kind === 'blank') {
      row++;
      continue;
    }
    if (it.kind === 'cursor') {
      body.push(
        `<text class="cur ${cls(it.at)}" x="${PAD_X}" y="${y}" fill="${C.green}">$ <tspan class="blink" fill="${C.text}">▍</tspan></text>`,
      );
      row++;
      continue;
    }
    if (it.kind === 'type') {
      // Word-by-word reveal: each word gets its own keyframe, ~0.16 s apart.
      const words = it.text.split(' ');
      const step = 1.6 / words.length;
      const spans = words
        .map((w, i) => `<tspan class="${cls(it.at + i * step)}">${esc(w)}${i < words.length - 1 ? ' ' : ''}</tspan>`)
        .join('');
      body.push(`<text x="${PAD_X}" y="${y}" fill="${C.text}"><tspan class="${cls(it.at)}" fill="${C.green}">$ </tspan>${spans}</text>`);
      row++;
      continue;
    }
    // 'line' and 'caption'
    const font = it.kind === 'caption' ? ` font-style="italic"` : it.italic ? ` font-style="italic"` : '';
    const weight = it.bold ? ` font-weight="700"` : '';
    const spans = it.spans.map(([color, text]) => `<tspan fill="${color}">${esc(text)}</tspan>`).join('');
    body.push(`<text class="${cls(it.at)}" x="${PAD_X}" y="${y}"${font}${weight}>${spans}</text>`);
    row++;
  }

  const H = TOP + row * LH + 8;
  const title = sceneDef.title[lang];

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by .harness/scripts/generate-readme-demo.mjs — do not edit by hand. -->
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(sceneDef.label[lang])}">
  <style>
    text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:${FONT}px;white-space:pre}
    .blink{animation:blink 1s steps(1,end) infinite}
    @keyframes blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
    ${[...new Set(styles)].join('\n    ')}
  </style>
  <rect width="${W}" height="${H}" rx="10" fill="${C.bg}" stroke="${C.border}"/>
  <rect width="${W}" height="36" rx="10" fill="${C.chrome}"/>
  <rect y="26" width="${W}" height="10" fill="${C.chrome}"/>
  <circle cx="20" cy="18" r="6" fill="#ff5f56"/><circle cx="40" cy="18" r="6" fill="#ffbd2e"/><circle cx="60" cy="18" r="6" fill="#27c93f"/>
  <text x="${W / 2}" y="22" text-anchor="middle" fill="${C.dim}">${esc(title)}</text>
  ${body.join('\n  ')}
</svg>
`;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, sceneDef] of Object.entries(SCENES)) {
  for (const [lang, file] of [
    ['en', `${name}.svg`],
    ['es', `${name}.es.svg`],
  ]) {
    const svg = render(lang, sceneDef);
    writeFileSync(join(OUT_DIR, file), svg);
    console.log(`wrote docs/assets/${file} (${(svg.length / 1024).toFixed(1)} kB, ${sceneDef.loop}s loop)`);
  }
}
