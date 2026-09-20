/**
 * @file render-tokens.mjs
 * @description `tokens.json` → `tokens.css`. The CSS is tracked next to the JSON so the
 * pages work from a plain static server without a build step; `build-pages.mjs --check`
 * fails when the two drift, so the JSON stays the single source of truth for both the
 * pages and the poster generator.
 */

/** `{ "surface-2": "#…" }` → `  --surface-2: #…;` lines. */
const declarations = (obj, prefix = '') => Object.entries(obj).map(([k, v]) => `  --${prefix}${k}: ${v};`).join('\n');

function laneBlock(lanes, theme) {
  return Object.entries(lanes).map(([id, t]) => {
    const [fill, stroke, text] = t[theme];
    return `  --lane-${id}-fill: ${fill};\n  --lane-${id}-stroke: ${stroke};\n  --lane-${id}-text: ${text};`;
  }).join('\n');
}

function maturityBlock(maturity, theme) {
  return Object.entries(maturity).map(([id, t]) => `  --m-${id}-fill: ${t[theme][0]};\n  --m-${id}-text: ${t[theme][1]};`).join('\n');
}

function themeBlock(tokens, theme) {
  return [
    declarations(tokens.color[theme]),
    laneBlock(tokens.lane, theme),
    tokens.phase[theme].map((c, i) => `  --phase-${i + 1}: ${c};`).join('\n'),
    maturityBlock(tokens.maturity, theme),
    `  --shadow-1: ${tokens.shadow[theme]['1']};\n  --shadow-2: ${tokens.shadow[theme]['2']};`,
  ].join('\n');
}

export function renderTokensCss(tokens) {
  const light = themeBlock(tokens, 'light');
  const dark = themeBlock(tokens, 'dark');
  const statics = [
    `  --font-sans: ${tokens.fonts.sans};`,
    `  --font-mono: ${tokens.fonts.mono};`,
    ...Object.entries(tokens.radius).map(([k, v]) => `  --r-${k}: ${v}px;`),
    ...Object.entries(tokens.motion).filter(([, v]) => typeof v === 'number').map(([k, v]) => `  --dur-${k}: ${v}ms;`),
    `  --ease-out: ${tokens.motion.easeOut};`,
    `  --ease-inout: ${tokens.motion.easeInOut};`,
  ].join('\n');
  return `/* GENERATED from shared/tokens.json by .harness/scripts/pages/render-tokens.mjs — do not edit by hand. */
:root {
  color-scheme: light dark;
${statics}
${light}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${dark}
  }
}
:root[data-theme="dark"] {
${dark}
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-motion="on"]) {
    --dur-hover: 0ms; --dur-state: 0ms; --dur-panel: 120ms; --dur-sheet: 120ms; --dur-camera: 0ms; --dur-dash: 0ms;
  }
}
:root[data-motion="off"] {
  --dur-hover: 0ms; --dur-state: 0ms; --dur-panel: 120ms; --dur-sheet: 120ms; --dur-camera: 0ms; --dur-dash: 0ms;
}
`;
}
