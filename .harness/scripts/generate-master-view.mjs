#!/usr/bin/env node
/**
 * @file generate-master-view.mjs
 * @description The E2E Product Vision poster (`reference/core/sdlc/assets/master-view.svg`,
 * embedded by README.md and served by GitHub Pages), rendered from the PUBLISHED map.
 *
 * This file is a thin facade over `.harness/scripts/pages/poster/*`:
 *
 *   renderMasterView(map)  → the SVG string (1600 wide, height accumulated per band,
 *                             EN only, system font stack, light palette from tokens.json,
 *                             no <filter>, every string measured against its box)
 *   posterRegions(svg)     → the `band-N` / `region-…` ids the tour can target
 *   posterTranscript(svg)  → the poster as text, band by band (viewer transcript)
 *
 * Every number comes from `map.meta.metrics` (derive-page-metrics.mjs) through the
 * placeholders of `pages/poster-strings.en.json`; the port chips and the gate artifacts
 * are read from the tree at render time. The `<!-- port-inventory: N hot / M declared -->`
 * annotation (guard 45, GT-621) is emitted twice — before the root, where the guard reads
 * it, and as the first child of <svg>, so exported clones carry it.
 *
 * There is no standalone CLI: the numbers only exist through the build.
 *   node .harness/scripts/pages/build-pages.mjs --write-svg
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { posterContext } from './pages/poster/context.mjs';
import { renderSvg, posterRegions, posterTranscript } from './pages/poster/render.mjs';

export { posterRegions, posterTranscript };

/**
 * @param {object} map the published map: meta.metrics, meta.asOf, meta.commit (chapters,
 *   bands and i18n are the viewer's business, not the poster's)
 * @returns {string} the SVG document
 */
export function renderMasterView(map) {
  return renderSvg(posterContext(map));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  process.stderr.write('use: node .harness/scripts/pages/build-pages.mjs --write-svg\n');
  process.exit(2);
}
