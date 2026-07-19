#!/usr/bin/env node

/**
 * Check Surface Parity Matrix (GT-171)
 *
 * WHAT THIS GUARD DOES
 *
 * A. Matrix self-consistency (the original five checks)
 *    1. The matrix file exists, parses, and carries a `version` + `operations[]`
 *    2. Operation ids are present, unique and kebab-case; name/description present
 *    3. Every exposed surface has a command/tool/endpoint reference
 *    4. Every non-exposed surface has an `exempt` reason
 *    5. At least one operation is tracked per surface
 *
 * B. Code <-> matrix cross-check, in BOTH directions
 *    Direction A (code -> matrix): every operation that exists in the source tree
 *      must be registered in the matrix. Otherwise the matrix under-reports and
 *      new surface area ships ungoverned.
 *    Direction B (matrix -> code): every reference the matrix declares must
 *      resolve to something that actually exists. A matrix naming a tool that was
 *      renamed or deleted lies just as loudly as one that omits a real tool.
 *
 * HISTORY -- why B exists. Until now the header claimed "every operation on CLI,
 * MCP or REST is tracked", but the script only validated the JSON against itself:
 * three REST endpoints were added and the guard kept reporting "61 operations"
 * in green. A guard whose documentation over-promises is its own false green.
 *
 * EXTRACTION PER SURFACE
 *   CLI  `src/sdk/cli/src/commands/**\/*.ts` (no *.spec.ts)
 *        `@Command({ name })` = root command. `@SubCommand({ name })` is only
 *        given a path once it is reachable from a parent's `subCommands: [...]`
 *        array (resolved by class name, recursively). The comparison unit is the
 *        full invocation path -- "topology recommend" -- because that is the
 *        granularity the matrix already uses in `cli.command`.
 *   MCP  `src/packages/mcp-server/src/tools/**\/*.ts` (no *.spec.ts -- the spec
 *        files quote OBSOLETE names and must never be counted) via
 *        `name: 'evolith-*'`. Resources (`uri: 'evolith://*'` in
 *        `mcp/resources.service.ts`) are collected and reported separately: the
 *        matrix models tools, not resources, so they are informational only.
 *   REST `src/apps/core-api/src/presentation/controllers/**\/*.ts` (no *.spec.ts)
 *        `@Get/@Post/@Put/@Patch/@Delete` combined with the class `@Controller`
 *        path + version and the global `enableVersioning({ prefix: 'api/v' })`
 *        from main.ts, so `@Get('topologies')` under
 *        `@Controller({ path: 'architecture', version: '1' })` reconstructs to
 *        `GET /api/v1/architecture/topologies`. `VERSION_NEUTRAL` controllers get
 *        no prefix (`GET /health`). Both sides are normalised before comparison:
 *        method upper-cased, `:param` / `{param}` collapsed to a placeholder,
 *        duplicate and trailing slashes removed.
 *
 * MATRIX REFERENCE NORMALISATION
 *   - CLI  flag suffixes are dropped: `validate --arch` -> `validate`.
 *   - MCP  compound refs expand: `evolith-adr-list/get/create` ->
 *          evolith-adr-list, evolith-adr-get, evolith-adr-create.
 *   - REST comma lists expand and inherit the leading method:
 *          `GET /health, /health/live` -> GET /health + GET /health/live.
 *
 * PRECISION OVER EXHAUSTIVENESS
 * Anything that cannot be classified with confidence lands in an `undetermined`
 * bucket that WARNS and never fails -- same contract as
 * `39-validate-harness-paths.mjs`. A noisy guard gets disabled, and then we are
 * back where we started. Concretely undetermined, not violations:
 *   - a `@SubCommand` no parent references (dead or wired at runtime)
 *   - a matrix `cli.command` whose ROOT command exists but whose sub-token does
 *     not, e.g. `agents install` where `agents` dispatches internally on a
 *     positional argument rather than via a `@SubCommand` class
 *   - MCP resources, which the matrix has no field for
 *
 * ANTI-EMPTY GUARD
 * If the scan of ANY surface yields zero operations, this fails loudly instead of
 * passing. An empty scan is indistinguishable from a clean scan in the output,
 * and that exact confusion is what this repo has been paying for.
 *
 * OUT OF SCOPE (deliberately, and stated so the header stops over-promising)
 *   - JSON Schema validation against surface-parity-matrix.schema.json: the
 *     structural checks below are hand-rolled, no ajv is invoked.
 *   - CLI flags/options as operations: only command paths are discovered, so a
 *     matrix ref distinguished purely by a flag (`validate --arch`) collapses
 *     onto its base command.
 *   - Surfaces outside the three source roots above (agent-runtime, harness
 *     scripts, Tracker BFF).
 *   - Whether an operation's semantics actually match across surfaces. This is
 *     an existence check, not a behavioural one.
 *
 * Usage:
 *   node .harness/scripts/ci/24-check-surface-parity.mjs
 *   node .harness/scripts/ci/24-check-surface-parity.mjs --matrix <path>
 *   node .harness/scripts/ci/24-check-surface-parity.mjs --verbose
 *
 * Exit codes:
 *   0 - all checks pass
 *   1 - one or more violations found
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const matrixIdx = argv.indexOf('--matrix');

const MATRIX_PATH =
  matrixIdx !== -1
    ? resolve(process.cwd(), argv[matrixIdx + 1])
    : resolve(ROOT, 'reference/core/control-center/audits/surface-parity-matrix.json');
const SCHEMA_PATH = resolve(
  ROOT,
  'reference/core/control-center/audits/surface-parity-matrix.schema.json',
);

const CLI_COMMANDS_DIR = resolve(ROOT, 'src/sdk/cli/src/commands');
const MCP_TOOLS_DIR = resolve(ROOT, 'src/packages/mcp-server/src/tools');
const MCP_RESOURCES_FILE = resolve(ROOT, 'src/packages/mcp-server/src/mcp/resources.service.ts');
const REST_CONTROLLERS_DIR = resolve(
  ROOT,
  'src/apps/core-api/src/presentation/controllers',
);

let exitCode = 0;
const errors = [];

function error(msg) {
  errors.push(msg);
  exitCode = 1;
}

/** Print the accumulated errors and abort. Never exit silently. */
function fatal(msg) {
  error(msg);
  console.error('\u2717 Surface parity check failed:\n');
  for (const err of errors) {
    console.error(`  \u2022 ${err}`);
  }
  process.exit(1);
}

// --- Step 1: Load and parse matrix ---
if (!existsSync(MATRIX_PATH)) {
  fatal(`Surface parity matrix not found at ${MATRIX_PATH}`);
}

if (!existsSync(SCHEMA_PATH)) {
  fatal(`Surface parity matrix schema not found at ${SCHEMA_PATH}`);
}

const matrixRaw = readFileSync(MATRIX_PATH, 'utf-8');
let matrix;
try {
  matrix = JSON.parse(matrixRaw);
} catch (e) {
  fatal(`Invalid JSON in ${MATRIX_PATH}: ${e.message}`);
}

// --- Step 2: Validate structure ---
if (!matrix.version) error('Matrix missing "version" field');
if (!Array.isArray(matrix.operations)) error('Matrix missing "operations" array');

const ids = new Set();
for (const [i, op] of (matrix.operations || []).entries()) {
  const prefix = `operations[${i}] (${op.id || 'unnamed'})`;

  if (!op.id) error(`${prefix}: missing "id"`);
  else if (!/^[a-z][a-z0-9-]+$/.test(op.id)) error(`${prefix}: id must be kebab-case`);
  else if (ids.has(op.id)) error(`${prefix}: duplicate id "${op.id}"`);
  else ids.add(op.id);

  if (!op.name) error(`${prefix}: missing "name"`);
  if (!op.description) error(`${prefix}: missing "description"`);

  for (const surface of ['cli', 'mcp', 'rest']) {
    const s = op[surface];
    if (!s || typeof s.exposed !== 'boolean') {
      error(`${prefix}: missing or invalid "${surface}.exposed"`);
      continue;
    }
    if (s.exposed) {
      const refKey = surface === 'cli' ? 'command' : surface === 'mcp' ? 'tool' : 'endpoint';
      if (!s[refKey]) error(`${prefix}: ${surface} exposed but missing "${refKey}"`);
    } else {
      if (!s.exempt) error(`${prefix}: ${surface} not exposed but missing "exempt" reason`);
    }
  }
}

const cliOps = matrix.operations.filter(o => o.cli?.exposed);
const mcpOps = matrix.operations.filter(o => o.mcp?.exposed);
const restOps = matrix.operations.filter(o => o.rest?.exposed);

if (cliOps.length === 0) error('No CLI operations tracked in matrix');
if (mcpOps.length === 0) error('No MCP operations tracked in matrix');
if (restOps.length === 0) error('No REST operations tracked in matrix');

// ===========================================================================
// Step 3: discover the REAL operations in the source tree
// ===========================================================================

const undetermined = [];

function note(surface, msg) {
  undetermined.push({ surface, msg });
}

/** Blank out comments while preserving offsets, so decorators inside a comment
 *  (and obsolete names parked in a `// TODO`) are never extracted. */
function stripComments(src) {
  const out = src.split('');
  let i = 0;
  const n = src.length;
  let state = 'code';
  let quote = '';
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === 'code') {
      if (c === '/' && c2 === '/') { state = 'line'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
      if (c === '/' && c2 === '*') { state = 'block'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') { state = 'str'; quote = c; i++; continue; }
      i++; continue;
    }
    if (state === 'str') {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) state = 'code';
      i++; continue;
    }
    if (state === 'line') {
      if (c === '\n') state = 'code'; else out[i] = ' ';
      i++; continue;
    }
    if (c === '*' && c2 === '/') { out[i] = ' '; out[i + 1] = ' '; state = 'code'; i += 2; continue; }
    if (c !== '\n') out[i] = ' ';
    i++;
  }
  return out.join('');
}

const SPEC_RE = /\.(spec|test|e2e-spec)\.ts$/;

function collectTsFiles(dir) {
  if (!existsSync(dir)) return [];
  if (statSync(dir).isFile()) return SPEC_RE.test(dir) ? [] : [dir];
  const out = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
        walk(p);
      } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts') && !SPEC_RE.test(e.name)) {
        out.push(p);
      }
    }
  };
  walk(dir);
  return out;
}

const rel = f => relative(ROOT, f).split(sep).join('/');

/** Balanced-brace slice starting at the `{` that follows `from`. */
function objectBodyAt(src, from) {
  const open = src.indexOf('{', from);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') {
      depth--;
      if (depth === 0) return { body: src.slice(open + 1, i), end: i };
    }
  }
  return null;
}

// --- CLI -------------------------------------------------------------------

/**
 * Root commands come from `@Command({ name })`. Subcommands are only assigned a
 * path once a parent declares them in `subCommands: [Class]`, resolved by class
 * name, so we never invent an invocation path the CLI does not actually route.
 */
function discoverCli() {
  const decls = new Map(); // className -> { name, kind, file }
  const children = new Map(); // className -> [childClassName]

  for (const file of collectTsFiles(CLI_COMMANDS_DIR).sort()) {
    const src = stripComments(readFileSync(file, 'utf-8'));
    const decoRe = /@(Command|SubCommand)\s*\(/g;
    let m;
    while ((m = decoRe.exec(src)) !== null) {
      const obj = objectBodyAt(src, m.index + m[0].length - 1);
      if (!obj) continue;
      const nameM = /(?:^|[,{\s])name\s*:\s*(['"])([^'"]+)\1/.exec(obj.body);
      const classM = /\bclass\s+([A-Za-z_$][\w$]*)/.exec(src.slice(obj.end, obj.end + 400));
      if (!nameM || !classM) {
        note('cli', `${rel(file)}: @${m[1]} whose name or class could not be read`);
        continue;
      }
      const cls = classM[1];
      decls.set(cls, { name: nameM[2], kind: m[1], file: rel(file) });

      const subM = /subCommands\s*:\s*\[([^\]]*)\]/.exec(obj.body);
      if (subM) {
        children.set(
          cls,
          subM[1].split(',').map(s => s.trim()).filter(s => /^[A-Za-z_$][\w$]*$/.test(s)),
        );
      }
    }
  }

  const ops = [];
  const claimed = new Set();
  const walk = (cls, prefix, depth) => {
    const d = decls.get(cls);
    if (!d || depth > 5) return;
    claimed.add(cls);
    const path = prefix ? `${prefix} ${d.name}` : d.name;
    const kids = children.get(cls) || [];
    ops.push({ path, file: d.file, isRouter: kids.length > 0 });
    for (const kid of kids) walk(kid, path, depth + 1);
  };
  for (const [cls, d] of decls) if (d.kind === 'Command') walk(cls, '', 0);

  for (const [cls, d] of decls) {
    if (!claimed.has(cls)) {
      note('cli', `${d.file}: @SubCommand '${d.name}' (${cls}) is not listed in any parent's subCommands -- no invocation path could be derived`);
    }
  }
  return ops;
}

// --- MCP -------------------------------------------------------------------

function discoverMcpTools() {
  const tools = new Map(); // name -> file
  for (const file of collectTsFiles(MCP_TOOLS_DIR).sort()) {
    const src = stripComments(readFileSync(file, 'utf-8'));
    const re = /(?:^|[,{\s])name\s*:\s*(['"])(evolith-[a-z0-9-]+)\1/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (!tools.has(m[2])) tools.set(m[2], rel(file));
    }
  }
  return tools;
}

function discoverMcpResources() {
  if (!existsSync(MCP_RESOURCES_FILE)) return [];
  const src = stripComments(readFileSync(MCP_RESOURCES_FILE, 'utf-8'));
  const re = /uri\s*:\s*(['"])(evolith:\/\/[^'"]+)\1/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[2]);
  return [...new Set(out)];
}

// --- REST ------------------------------------------------------------------

const HTTP_DECORATORS = ['Get', 'Post', 'Put', 'Patch', 'Delete'];

/** Global prefix + default version, read from main.ts rather than hard-coded. */
function readVersioning() {
  const mainFile = resolve(ROOT, 'src/apps/core-api/src/main.ts');
  let prefix = 'api/v';
  let defaultVersion = '1';
  if (existsSync(mainFile)) {
    const src = stripComments(readFileSync(mainFile, 'utf-8'));
    const p = /prefix\s*:\s*(['"])([^'"]*)\1/.exec(src);
    const d = /defaultVersion\s*:\s*(['"])([^'"]*)\1/.exec(src);
    if (p) prefix = p[2];
    if (d) defaultVersion = d[2];
  } else {
    note('rest', 'core-api main.ts not found -- fell back to the default prefix "api/v"');
  }
  return { prefix, defaultVersion };
}

function joinPath(...parts) {
  const p = parts.filter(Boolean).join('/').replace(/\/+/g, '/').replace(/\/$/, '');
  return p.startsWith('/') ? p : `/${p}`;
}

function discoverRest() {
  const { prefix, defaultVersion } = readVersioning();
  const ops = [];
  for (const file of collectTsFiles(REST_CONTROLLERS_DIR).sort()) {
    const src = stripComments(readFileSync(file, 'utf-8'));
    const ctrlRe = /@Controller\s*\(/g;
    let cm;
    const controllers = [];
    while ((cm = ctrlRe.exec(src)) !== null) {
      const after = src.slice(cm.index + cm[0].length);
      let path = '';
      let version = defaultVersion;
      let neutral = false;
      const objStart = /^\s*\{/.test(after);
      if (objStart) {
        const obj = objectBodyAt(src, cm.index + cm[0].length - 1);
        if (!obj) { note('rest', `${rel(file)}: unparsable @Controller options`); continue; }
        const pm = /(?:^|[,{\s])path\s*:\s*(['"])([^'"]*)\1/.exec(obj.body);
        const vm = /(?:^|[,{\s])version\s*:\s*(?:(['"])([^'"]*)\1|([A-Za-z_$][\w$.]*))/.exec(obj.body);
        path = pm ? pm[2] : '';
        if (vm) {
          if (vm[2] !== undefined) version = vm[2];
          else if (/VERSION_NEUTRAL/.test(vm[3])) neutral = true;
          else { note('rest', `${rel(file)}: @Controller version "${vm[3]}" is not a literal`); }
        }
        controllers.push({ path, version, neutral, start: obj.end });
      } else {
        const sm = /^\s*(['"])([^'"]*)\1\s*\)/.exec(after);
        if (!sm) { note('rest', `${rel(file)}: unparsable @Controller argument`); continue; }
        controllers.push({ path: sm[2], version: defaultVersion, neutral: false, start: cm.index });
      }
    }
    if (controllers.length === 0) continue;

    const methodRe = new RegExp(`@(${HTTP_DECORATORS.join('|')})\\s*\\(([^)]*)\\)`, 'g');
    let mm;
    while ((mm = methodRe.exec(src)) !== null) {
      // Attach to the nearest preceding @Controller in the same file.
      let ctrl = controllers[0];
      for (const c of controllers) if (c.start < mm.index) ctrl = c;
      const routeM = /^\s*(['"])([^'"]*)\1/.exec(mm[2]);
      if (mm[2].trim() !== '' && !routeM) {
        note('rest', `${rel(file)}: @${mm[1]}(${mm[2].trim()}) route is not a string literal`);
        continue;
      }
      const route = routeM ? routeM[2] : '';
      const base = ctrl.neutral ? '' : `${prefix}${ctrl.version}`;
      ops.push({
        endpoint: `${mm[1].toUpperCase()} ${joinPath(base, ctrl.path, route)}`,
        file: rel(file),
      });
    }
  }
  return ops;
}

// --- Normalisation ---------------------------------------------------------

const normCli = ref => String(ref).split(/\s+/).filter(t => t && !t.startsWith('-')).join(' ');

/** `evolith-adr-list/get/create` -> the three full tool names it stands for. */
function expandMcpRef(ref) {
  const parts = String(ref).split('/').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return [];
  const head = parts[0];
  const stem = head.slice(0, head.lastIndexOf('-') + 1);
  return [head, ...parts.slice(1).map(p => (p.startsWith('evolith-') ? p : stem + p))];
}

/** `GET /health, /health/live` -> ["GET /health", "GET /health/live"]. */
function expandRestRef(ref) {
  const out = [];
  let lastMethod = '';
  for (const piece of String(ref).split(',').map(s => s.trim()).filter(Boolean)) {
    const m = /^([A-Za-z]+)\s+(\/.*)$/.exec(piece);
    if (m) { lastMethod = m[1].toUpperCase(); out.push(`${lastMethod} ${m[2]}`); }
    else if (piece.startsWith('/') && lastMethod) out.push(`${lastMethod} ${piece}`);
    else out.push(piece);
  }
  return out;
}

/** Method + path with parameter names erased, so `:id` == `{id}` == `:gateId`. */
function normRest(ref) {
  const m = /^([A-Za-z]+)\s+(.*)$/.exec(String(ref).trim());
  if (!m) return String(ref).trim().toLowerCase();
  const path = m[2]
    .replace(/\{[^}]+\}/g, ':p')
    .replace(/:[A-Za-z_][\w]*/g, ':p')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
  return `${m[1].toUpperCase()} ${path.startsWith('/') ? path : `/${path}`}`;
}

// --- Step 4: cross-check ---------------------------------------------------

const discoveredCli = discoverCli();
const discoveredMcp = discoverMcpTools();
const discoveredResources = discoverMcpResources();
const discoveredRest = discoverRest();

// ANTI-EMPTY GUARD. An empty scan looks exactly like a clean scan in the output;
// that is the failure this whole guard exists to stop repeating.
const emptyScans = [];
if (discoveredCli.length === 0) emptyScans.push(`CLI (${rel(CLI_COMMANDS_DIR)})`);
if (discoveredMcp.size === 0) emptyScans.push(`MCP (${rel(MCP_TOOLS_DIR)})`);
if (discoveredRest.length === 0) emptyScans.push(`REST (${rel(REST_CONTROLLERS_DIR)})`);
if (emptyScans.length > 0) {
  console.error('\u2717 Surface parity check failed: found zero operations while scanning\n');
  for (const s of emptyScans) console.error(`  \u2022 ${s}`);
  console.error(
    '\nRefusing to report parity from an empty scan. Either the source root moved,\n' +
    'the extraction pattern no longer matches the code, or the surface really is\n' +
    'gone -- all three are defects, none of them is a pass.',
  );
  process.exit(1);
}

const unregistered = { cli: [], mcp: [], rest: [] };
const obsolete = { cli: [], mcp: [], rest: [] };

// -- CLI --
const cliRefs = cliOps.map(o => ({ id: o.id, raw: o.cli.command, norm: normCli(o.cli.command) }));
const cliRefSet = new Set(cliRefs.map(r => r.norm));
const cliPathSet = new Set(discoveredCli.map(o => o.path));
const cliRootSet = new Set(discoveredCli.map(o => o.path.split(' ')[0]));

// Direction A: a discovered path is covered when it equals, or is a prefix of,
// some matrix reference -- the matrix is allowed to be FINER-grained than the
// class tree (`agents install` covers the `agents` command).
for (const op of discoveredCli) {
  const covered = [...cliRefSet].some(r => r === op.path || r.startsWith(`${op.path} `));
  if (!covered) unregistered.cli.push({ what: op.path, where: op.file });
}
// Direction B
for (const r of cliRefs) {
  if (cliPathSet.has(r.norm)) continue;
  const root = r.norm.split(' ')[0];
  if (cliRootSet.has(root)) {
    note('cli', `matrix "${r.raw}" (op ${r.id}): root command '${root}' exists but '${r.norm}' is not a @SubCommand -- likely dispatched on a positional argument`);
  } else {
    obsolete.cli.push({ what: r.raw, where: `op ${r.id}` });
  }
}

// -- MCP --
const mcpRefs = [];
for (const o of mcpOps) {
  for (const t of expandMcpRef(o.mcp.tool)) mcpRefs.push({ id: o.id, raw: o.mcp.tool, tool: t });
}
const mcpRefSet = new Set(mcpRefs.map(r => r.tool));
for (const [tool, file] of discoveredMcp) {
  if (!mcpRefSet.has(tool)) unregistered.mcp.push({ what: tool, where: file });
}
for (const r of mcpRefs) {
  if (!discoveredMcp.has(r.tool)) {
    obsolete.mcp.push({
      what: r.tool + (r.tool === r.raw ? '' : `  (from "${r.raw}")`),
      where: `op ${r.id}`,
    });
  }
}
if (discoveredResources.length > 0) {
  note('mcp', `${discoveredResources.length} MCP resource(s) discovered; the matrix models tools only, so they are not cross-checked: ${discoveredResources.join(', ')}`);
}

// -- REST --
const restRefs = [];
for (const o of restOps) {
  for (const e of expandRestRef(o.rest.endpoint)) {
    restRefs.push({ id: o.id, raw: o.rest.endpoint, norm: normRest(e) });
  }
}
const restRefSet = new Set(restRefs.map(r => r.norm));
const restCodeSet = new Map(discoveredRest.map(o => [normRest(o.endpoint), o]));
for (const [norm, op] of restCodeSet) {
  if (!restRefSet.has(norm)) unregistered.rest.push({ what: op.endpoint, where: op.file });
}
for (const r of restRefs) {
  if (!restCodeSet.has(r.norm)) obsolete.rest.push({ what: r.norm, where: `op ${r.id}` });
}

const totalUnregistered = Object.values(unregistered).reduce((a, b) => a + b.length, 0);
const totalObsolete = Object.values(obsolete).reduce((a, b) => a + b.length, 0);
if (totalUnregistered + totalObsolete > 0) exitCode = 1;

// --- Results ---------------------------------------------------------------

const SURFACE_LABEL = { cli: 'CLI', mcp: 'MCP', rest: 'REST' };

function printGroup(title, why, group) {
  console.error(`${title}\n  ${why}\n`);
  for (const surface of ['cli', 'mcp', 'rest']) {
    if (group[surface].length === 0) continue;
    console.error(`  ${SURFACE_LABEL[surface]} (${group[surface].length}):`);
    for (const v of group[surface]) console.error(`    \u2022 ${v.what}\n        ${v.where}`);
    console.error('');
  }
}

if (errors.length > 0) {
  console.error(`\u2717 Surface parity matrix validation failed:\n`);
  for (const err of errors) console.error(`  \u2022 ${err}`);
  console.error('');
}

if (totalUnregistered > 0) {
  printGroup(
    `\u2717 Direction A -- ${totalUnregistered} operation(s) exist in code but are NOT registered in the matrix`,
    'New surface area shipped without a governance entry. Add an operation to the matrix.',
    unregistered,
  );
}

if (totalObsolete > 0) {
  printGroup(
    `\u2717 Direction B -- ${totalObsolete} matrix reference(s) point at something that does NOT exist`,
    'The matrix claims a command/tool/endpoint the code does not provide. Fix or remove the reference.',
    obsolete,
  );
}

if (undetermined.length > 0) {
  const show = VERBOSE ? undetermined : undetermined.slice(0, 12);
  console.warn(`\u26a0 ${undetermined.length} undetermined item(s) -- reported, never a violation:\n`);
  for (const u of show) console.warn(`  \u2022 [${SURFACE_LABEL[u.surface]}] ${u.msg}`);
  if (!VERBOSE && undetermined.length > show.length) {
    console.warn(`  ... ${undetermined.length - show.length} more (run with --verbose)`);
  }
  console.warn('');
}

const scanSummary =
  `scanned: CLI ${discoveredCli.length} command path(s), ` +
  `MCP ${discoveredMcp.size} tool(s) + ${discoveredResources.length} resource(s), ` +
  `REST ${discoveredRest.length} endpoint(s)`;

if (exitCode === 0) {
  console.log(`\u2713 Surface parity matrix valid: ${matrix.operations.length} operations tracked`);
  console.log(`  matrix:  CLI ${cliOps.length} exposed, MCP ${mcpOps.length} exposed, REST ${restOps.length} exposed`);
  console.log(`  code:    ${scanSummary}`);
  console.log(`  both directions cross-checked; 0 unregistered, 0 obsolete`);
} else {
  console.error(`  ${scanSummary}`);
  console.error(`\nFix the matrix at ${relative(ROOT, MATRIX_PATH)} (or the code it describes).`);
}

process.exit(exitCode);
