#!/usr/bin/env node

/**
 * GT-621 — a port inventory must not read as a capability claim.
 *
 * ## The defect
 *
 * `reference/core/sdlc/assets/master-view.svg` published
 * "AgentRuntimeService — 12 hexagonal ports · 30 adapters". Two things were
 * wrong with that sentence, and the second is the one this guard exists for.
 *
 * 1. The numbers were stale. Measured 2026-07-28: 21 port interfaces and 53
 *    adapter files. A hand-typed count in a diagram rots the moment somebody
 *    adds a file, and nothing was comparing it to the tree.
 *
 * 2. A raw count says "capability delivered" when it means "surface declared".
 *    Of those ports, ELEVEN are reachable from `AgentRuntimeService` — seven
 *    required, four optional — and the rest are seams with adapters and no
 *    consumer in the execution pass. `InteractionAdapterPort` alone has six
 *    implementations and the runtime calls none of them. Building them is not
 *    the error; counting them as delivered capability is.
 *
 * ## What this checks
 *
 * The classification is DERIVED from the code — the declared dependencies of
 * `AgentRuntimeDeps` are the hot path, by construction — so it cannot drift from
 * the tree the way the diagram did. Every document that publishes a port or
 * adapter count must then either state that split or carry an explicit
 * `<!-- port-inventory: <n> hot / <n> declared -->` annotation agreeing with it.
 *
 * ## Anti-vacuous pass
 *
 * Zero ports parsed, zero adapters found or zero documents scanned is a hard
 * failure. A guard that verified nothing must never report a pass.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GUARD = '45-validate-port-inventory-honesty';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const argv = process.argv.slice(2);
const rootIdx = argv.indexOf('--root');
const root = rootIdx !== -1 ? path.resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;
const VERBOSE = argv.includes('--verbose');

const PORTS_DIR = path.join(root, 'src/packages/agent-runtime/src/domain/ports');
const ADAPTERS_DIR = path.join(root, 'src/packages/agent-runtime/src/adapters');
const DEPS_FILE = path.join(root, 'src/packages/agent-runtime/src/application/agent-runtime-deps.ts');

/** Documents that publish a count and must therefore publish the split. */
const SCANNED_DOCS = [
  'reference/core/sdlc/assets/master-view.svg',
];

/** A count of ports or adapters, in either language. */
const COUNT_RE = /(\d+)\s+(?:hexagonal\s+)?(?:ports?|puertos?|adapters?|adaptadores?)/gi;

function fail(lines) {
  console.error(`\n✗ ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

/** Every `I*Port`-shaped interface the domain declares. */
export function declaredPorts(dir) {
  if (!fs.existsSync(dir)) return [];
  const names = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts') && !x.includes('.spec.'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/export interface (I[A-Z][A-Za-z]*)/g)) names.add(m[1]);
  }
  return [...names].sort();
}

/**
 * The hot path, derived rather than listed: a port is on it exactly when
 * `AgentRuntimeDeps` declares it, because that interface IS what the execution
 * pass can reach. Optional members are hot-but-conditional, not speculative —
 * the runtime calls them when they are wired.
 */
export function hotPathPorts(depsFile) {
  if (!fs.existsSync(depsFile)) return { required: [], optional: [] };
  const src = fs.readFileSync(depsFile, 'utf8');
  const required = [];
  const optional = [];
  for (const m of src.matchAll(/readonly\s+[a-zA-Z]+(\??):\s*(I[A-Z][A-Za-z]*)\s*;/g)) {
    (m[1] === '?' ? optional : required).push(m[2]);
  }
  return { required: [...new Set(required)].sort(), optional: [...new Set(optional)].sort() };
}

function countAdapters(dir) {
  if (!fs.existsSync(dir)) return 0;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => {
    const q = path.join(d, e.name);
    if (e.isDirectory()) return n + walk(q);
    return n + (e.name.endsWith('.ts') && !e.name.includes('.spec.') ? 1 : 0);
  }, 0);
  return walk(dir);
}

function main() {
  const ports = declaredPorts(PORTS_DIR);
  const { required, optional } = hotPathPorts(DEPS_FILE);
  const adapters = countAdapters(ADAPTERS_DIR);

  // Anti-vacuous: nothing parsed means nothing verified.
  if (ports.length === 0) fail([`scanned ${PORTS_DIR} and found ZERO port interfaces — the tree moved and this guard verified nothing.`]);
  if (required.length === 0) fail([`parsed ${DEPS_FILE} and found ZERO required dependencies — the shape changed and the hot path cannot be derived.`]);
  if (adapters === 0) fail([`scanned ${ADAPTERS_DIR} and found ZERO adapters.`]);

  const hot = new Set([...required, ...optional]);
  const speculative = ports.filter((p) => !hot.has(p));

  console.log(`${GUARD} — what the runtime reaches, and what it only declares`);
  console.log(`  port interfaces declared ... ${ports.length}`);
  console.log(`  on the hot path ............ ${hot.size} (${required.length} required, ${optional.length} optional)`);
  console.log(`  declared, not reached ...... ${speculative.length}`);
  console.log(`  adapter files .............. ${adapters}`);
  if (VERBOSE) {
    console.log(`\n  required: ${required.join(', ')}`);
    console.log(`  optional: ${optional.join(', ')}`);
    console.log(`  not reached by the runtime: ${speculative.join(', ')}`);
  }

  const issues = [];
  let scanned = 0;
  for (const rel of SCANNED_DOCS) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    scanned += 1;
    const text = fs.readFileSync(file, 'utf8');
    const counts = [...text.matchAll(COUNT_RE)];
    if (counts.length === 0) continue;

    const annotation = text.match(/port-inventory:\s*(\d+)\s*hot\s*\/\s*(\d+)\s*declared/);
    if (!annotation) {
      issues.push(
        `${rel} publishes a port/adapter count (${counts.map((c) => c[0]).join('; ')}) ` +
        `without saying how many are actually reached.\n` +
        `      A bare count reads as delivered capability. Add the split — ` +
        `${hot.size} of ${ports.length} ports are on the hot path — and annotate it:\n` +
        `      <!-- port-inventory: ${hot.size} hot / ${ports.length} declared -->`,
      );
      continue;
    }
    if (Number(annotation[1]) !== hot.size || Number(annotation[2]) !== ports.length) {
      issues.push(
        `${rel} declares "port-inventory: ${annotation[1]} hot / ${annotation[2]} declared" ` +
        `but the code says ${hot.size} hot / ${ports.length} declared. ` +
        `The diagram already rotted once this way.`,
      );
    }
  }

  if (scanned === 0) {
    fail([`none of the ${SCANNED_DOCS.length} tracked document(s) exist — the scan corpus moved and nothing was checked.`]);
  }

  if (issues.length > 0) {
    fail([`${issues.length} document(s) publish an inventory that reads as a capability claim:`, ...issues.map((i) => `  • ${i}`)]);
  }

  console.log(`\n✓ ${GUARD}: ${scanned} document(s) publishing an inventory state what the runtime actually reaches.`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
