/**
 * @file context.mjs
 * @description Builds the render context of the poster from the PUBLISHED map: the
 * strings (poster-strings.en.json with every `{{placeholder}}` resolved against
 * meta.metrics), the light palette from tokens.json, the SDLC phases with their gate
 * artifacts, and the port-file basenames read from the tree at render time. Anything
 * missing throws — the numbers only exist through the build.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from '../../lib/paths.mjs';
import { interpolate } from '../interpolate.mjs';
import { Canvas, palette } from './canvas.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const STRINGS_FILE = path.join(here, '..', 'poster-strings.en.json');
const TOKENS_FILE = 'reference/core/architecture/demos/shared/tokens.json';
const PORTS_DIR = 'src/packages/agent-runtime/src/domain/ports';
const GATES_DIR = 'reference/governance/sdlc/gates';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** `*.port.ts` basenames, sorted — the 20 chips of band 4 come from the tree, never from prose. */
export function portBasenames(root) {
  const dir = path.join(root, PORTS_DIR);
  const names = fs.readdirSync(dir).filter((f) => f.endsWith('.port.ts')).map((f) => f.slice(0, -'.port.ts'.length)).sort();
  if (names.length === 0) throw new Error(`poster: no *.port.ts under ${PORTS_DIR}`);
  return names;
}

/** The first two required artifacts of a gate, from its canonical JSON. */
function gateArtifacts(root, gateId) {
  const file = path.join(root, GATES_DIR, `${gateId}.json`);
  if (!fs.existsSync(file)) throw new Error(`poster: gate definition ${gateId}.json not found under ${GATES_DIR}`);
  const gate = readJson(file);
  return (gate.requiredArtifacts || []).slice(0, 2).map((a) => a.artifact);
}

/** The strings with every placeholder resolved, or a thrown list of the unknown ones. */
export function resolveStrings(values, raw = readJson(STRINGS_FILE)) {
  const { perPhase, $comment: _comment, ...rest } = raw;
  const unknown = new Set();
  const strings = interpolate(rest, values, { unknown });
  if (unknown.size) throw new Error(`poster-strings.en.json names ${unknown.size} unknown placeholder(s): ${[...unknown].join(', ')}`);
  return { strings, perPhase };
}

function phaseRows(sdlc, perPhase, root) {
  return sdlc.map((ph) => {
    const unknown = new Set();
    const labels = interpolate(perPhase, ph, { unknown });
    if (unknown.size) throw new Error(`poster: phase ${ph.id} lacks ${[...unknown].join(', ')}`);
    return { ...ph, ...labels, artifacts: gateArtifacts(root, ph.gateId) };
  });
}

/**
 * @param {object} map the published map (meta.metrics, meta.asOf, meta.commit)
 * @param {string} [root] repository root (defaults to the checkout this file lives in)
 */
export function posterContext(map, root = REPO_ROOT) {
  const meta = map?.meta || {};
  const m = meta.metrics;
  if (!m || !meta.asOf) throw new Error('poster: map.meta.{metrics,asOf} are required — render through build-pages.mjs');
  // The commit hash is deliberately NOT a poster value: the SVG is tracked, and a hash inside it would go stale on the very commit that adds it.
  const values = { ...m, asOf: meta.asOf, llmProviders: (m.runtime?.llmProviders || []).join(' · ') };
  const { strings, perPhase } = resolveStrings(values);
  if (!Array.isArray(m.sdlc) || m.sdlc.length === 0) throw new Error('poster: metrics.sdlc is empty');
  const pal = palette(readJson(path.join(root, TOKENS_FILE)));
  return {
    c: new Canvas(pal),
    p: pal,
    s: strings,
    m,
    phases: phaseRows(m.sdlc, perPhase, root),
    ports: portBasenames(root),
    marks: {},
  };
}
