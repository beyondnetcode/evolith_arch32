#!/usr/bin/env node

/**
 * Validate Repo Path Literals (meta-guard)
 *
 * A refactor moved code under `src/` and documentation under `reference/core/`.
 * Scripts and modules that kept their old literal paths failed *invisibly*:
 * they scanned a directory that no longer existed, got an empty list, and
 * reported success. This guard makes that failure mode loud.
 *
 * SCOPE
 *   - `.harness/scripts/**\/*.mjs`      (excluding *.test.mjs)
 *   - `src/packages/*\/src/**\/*.ts`     (excluding *.spec.ts / *.test.ts / *.d.ts)
 *   - `src/sdk/*\/src/**\/*.ts`
 *   - `src/apps/*\/src/**\/*.ts`
 *
 * WHAT IT EXTRACTS
 *   - `path.join(...)` / `join(...)` / `resolve(...)` calls with string components.
 *   - Bare string constants that look like repo paths: they contain `/` and start
 *     with a real first-level directory of this repo.
 *
 * THE BASE MATTERS -- this is what keeps the guard quiet enough to survive.
 * A literal is only held to "must exist in THIS repo" when it is resolved
 * against the repo root. Concretely:
 *   - `join(ROOT, 'reference/core/x')`  -> repo-relative. Checked.
 *   - `join(repoPath, 'reference/x')`   -> resolved against the *satellite* repo
 *                                          being evaluated. Not our file.
 *   - a bare literal in a harness script -> repo-relative (harness scripts run
 *                                          from the repo root).
 *   - a bare literal in product code     -> external by default. Product code
 *                                          ships to users; its paths usually
 *                                          describe the user's project, scaffold
 *                                          output, or ruleset identifiers.
 * External literals are never violations. When an external literal is missing
 * here *and* its post-refactor twin exists here, it is reported as a staleness
 * warning -- strong evidence the constant was left behind by the refactor,
 * without pretending we can prove it.
 *
 * CLASSIFICATION (repo-relative literals only)
 *   input   -> reaches readFileSync/readdirSync/existsSync/glob/walk
 *   output  -> reaches writeFileSync/mkdirSync/cpSync/...
 *   unknown -> undecidable; reported in its own bucket, never a violation.
 *              A guard with false positives gets disabled, and then we are back
 *              where we started.
 *
 * TWO FAILURE SHAPES IT IS BUILT TO CATCH
 *   1. MISSING-WITH-LIVE-ANCESTOR: the path does not exist but a parent does, so
 *      a naive `existsSync(parent)` passes and the script walks an empty list.
 *      This is the exact shape of the historical bugs.
 *   2. PHANTOM/AMBIGUOUS: the literal resolves at the repo root, but the
 *      post-refactor twin (`src/<p>` or `reference/core/<rest>`) also exists.
 *      Reported as an ambiguity so a phantom directory cannot masquerade as the
 *      real one.
 *
 * IGNORED: URLs, node_modules, glob patterns, absolute and /tmp paths, template
 * interpolation, directory prefixes ending in `/`, and anything assembled
 * dynamically. We do not guess.
 *
 * Usage:
 *   node .harness/scripts/ci/39-validate-harness-paths.mjs
 *   node .harness/scripts/ci/39-validate-harness-paths.mjs --scan <dir-or-file>
 *   node .harness/scripts/ci/39-validate-harness-paths.mjs --verbose
 *
 * Exit codes:
 *   0 - every repo-relative input path literal resolves
 *   1 - one or more do not
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const scanIdx = argv.indexOf('--scan');
const SCAN_OVERRIDE = scanIdx !== -1 ? resolve(process.cwd(), argv[scanIdx + 1]) : null;

/** Scan roots. `product` code defaults its literals to external; `harness` does not. */
const SCAN_ROOTS = [
  { path: join(ROOT, '.harness', 'scripts'), mode: 'harness', ext: '.mjs' },
  { path: join(ROOT, 'src', 'packages'), mode: 'product', ext: '.ts' },
  { path: join(ROOT, 'src', 'sdk'), mode: 'product', ext: '.ts' },
  { path: join(ROOT, 'src', 'apps'), mode: 'product', ext: '.ts' },
];

// --- Repo vocabulary -------------------------------------------------------

/** Real first-level directories of the repo. A path literal must start with one. */
const TOP_LEVEL_DIRS = new Set(
  readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'node_modules' && d.name !== '.git')
    .map(d => d.name),
);

/**
 * Children of `src/` are also accepted as leading segments. The refactor moved
 * `packages/`, `apps/`, `sdk/` and `rulesets/` *under* `src/`, so a literal
 * still starting with one of them is precisely the stale shape we hunt -- and it
 * no longer resolves at the root, which is what makes it detectable.
 */
const SRC_CHILD_DIRS = new Set(
  existsSync(join(ROOT, 'src'))
    ? readdirSync(join(ROOT, 'src'), { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
    : [],
);

/** Identifiers that stand for THIS repo's root as the base of join/resolve. */
const ROOT_IDENT = /^(?:_{0,2}(?:repo|project)?_?root(?:_?dir)?|cwd|__dirname|process\.cwd\(\))$/i;

const READ_CALLS = [
  'readFileSync', 'readdirSync', 'existsSync', 'statSync', 'lstatSync', 'opendirSync',
  'readFile', 'readdir', 'createReadStream', 'globSync', 'glob', 'walk', 'walkDir',
  'loadJson', 'readJson', 'readJsonSync', 'accessSync',
];
/** Strong reads prove the path must pre-exist; `existsSync` alone is weaker. */
const STRONG_READ_CALLS = READ_CALLS.filter(c => c !== 'existsSync');
const WRITE_CALLS = [
  'writeFileSync', 'mkdirSync', 'writeFile', 'mkdir', 'cpSync', 'copyFileSync',
  'rmSync', 'unlinkSync', 'createWriteStream', 'writeJson', 'writeJsonSync', 'outputFileSync',
];

// --- Source scanning -------------------------------------------------------

/** Blank out comments while preserving offsets and line numbers. */
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

function buildLineIndex(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1);
  return starts;
}

function lineAt(lineStarts, index) {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= index) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

/** Reject anything we cannot statically and unambiguously resolve. */
function isPathLike(value) {
  if (!value || value.length > 200) return false;
  if (!value.includes('/')) return false;          // single bare words are too weak
  if (value.endsWith('/')) return false;           // a prefix for startsWith(), not a path
  if (/\s/.test(value)) return false;              // prose, markdown
  if (/[*?{}<>|]/.test(value)) return false;       // globs / template placeholders
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return false; // URLs
  if (value.includes('node_modules')) return false;
  if (value.startsWith('/') || /^[A-Za-z]:\\/.test(value)) return false; // absolute
  if (value.startsWith('.') || value.startsWith('#') || value.startsWith('@')) return false;
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) return false;
  const first = value.split('/')[0];
  return TOP_LEVEL_DIRS.has(first) || SRC_CHILD_DIRS.has(first);
}

/** Split a call argument list on top-level commas. */
function splitArgs(raw) {
  const args = [];
  let depth = 0, cur = '', quote = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote) {
      cur += c;
      if (c === '\\') { cur += raw[++i] ?? ''; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

function asStringLiteral(arg) {
  const m = /^(['"])(.*)\1$/.exec(arg);
  return m ? m[2] : null;
}

/**
 * Extract candidate path literals.
 * `rootRelative` records whether the literal is anchored to THIS repo's root.
 */
function extractCandidates(stripped, mode) {
  const found = [];
  const consumed = [];

  // 1) join(...) / resolve(...) with string components
  const callRe = /(?:\b(?:path|nodePath|nodePath)\s*\.\s*)?\b(?:join|resolve)\s*\(([^()]*(?:\(\s*\)[^()]*)?)\)/g;
  let m;
  while ((m = callRe.exec(stripped)) !== null) {
    const args = splitArgs(m[1]);
    if (args.length === 0) continue;
    // Claim the span either way, so the bare-literal pass below does not
    // re-report a component whose base we already inspected.
    consumed.push([m.index, m.index + m[0].length]);

    const first = args[0];
    const firstStr = asStringLiteral(first);
    // Only harness scripts can anchor to THIS repo. In product code a `root` /
    // `repoPath` binding is the *user's* project being evaluated, never ours.
    const baseIsRoot =
      mode === 'harness' && (firstStr !== null || ROOT_IDENT.test(first.replace(/\s+/g, '')));

    const parts = [];
    for (const a of args.slice(firstStr === null ? 1 : 0)) {
      const s = asStringLiteral(a);
      if (s === null) { parts.length = 0; break; } // dynamic component -> give up
      parts.push(s);
    }
    if (parts.length === 0) continue;
    const value = parts.join('/').replace(/\/+/g, '/');
    if (!isPathLike(value)) continue;
    found.push({ value, index: m.index, rootRelative: baseIsRoot });
  }

  // 2) Bare string literals that look like repo paths
  const strRe = /(['"])([^'"\n]+)\1/g;
  while ((m = strRe.exec(stripped)) !== null) {
    if (consumed.some(([a, b]) => m.index >= a && m.index < b)) continue;
    if (!isPathLike(m[2])) continue;
    // Harness scripts execute from the repo root, so their bare literals are
    // repo-relative. Product code's are not -- they describe the user's project.
    found.push({ value: m[2], index: m.index, rootRelative: mode === 'harness' });
  }

  return found;
}

/** Name of the const/let/var the literal is assigned to, if any. */
function assignedName(stripped, index) {
  const lineStart = stripped.lastIndexOf('\n', index) + 1;
  const head = stripped.slice(lineStart, index);
  const m = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*[^=]*$/.exec(head);
  return m ? m[1] : null;
}

/** Which of READ/WRITE calls does this identifier flow into? */
function roleOfIdentifier(stripped, name, seen = new Set()) {
  if (seen.has(name) || seen.size > 6) return 'unknown';
  seen.add(name);

  const usage = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*\\(([^()]*)\\)`, 'g');
  let hit, strongRead = false, write = false, weakRead = false;
  const forwarded = [];
  const aliases = [];
  while ((hit = usage.exec(stripped)) !== null) {
    const fn = hit[1];
    if (!new RegExp(`\\b${name}\\b`).test(hit[2])) continue;
    if (STRONG_READ_CALLS.includes(fn)) strongRead = true;
    else if (WRITE_CALLS.includes(fn)) write = true;
    else if (fn === 'existsSync') weakRead = true;
    else if (fn === 'join' || fn === 'resolve') {
      // `const dir = resolve(ROOT, FIXTURES_DIR)` -- the role of the constant is
      // whatever happens to the path built from it.
      const alias = assignedName(stripped, hit.index);
      if (alias) aliases.push(alias);
    } else forwarded.push(fn);
  }
  // A strong read proves the path must pre-exist. `existsSync` paired with a
  // write is the create-if-missing idiom -- an output, not a violation.
  if (strongRead) return 'input';
  if (write) return 'output';
  if (weakRead) return 'input';

  // Follow path-building aliases before giving up.
  for (const alias of aliases) {
    const inner = roleOfIdentifier(stripped, alias, seen);
    if (inner !== 'unknown') return inner;
  }

  // One level of indirection: the value is handed to a local function; look at
  // what that function's corresponding parameter is used for. This is the
  // `const dir = join(root, ...); collectFiles(dir)` idiom, which is exactly how
  // the historical silent scanners were written.
  for (const fn of forwarded) {
    const declRe = new RegExp(`function\\s+${fn}\\s*\\(([^)]*)\\)`);
    const decl = declRe.exec(stripped);
    if (!decl) continue;
    const param = splitArgs(decl[1])[0];
    if (!param || !/^[A-Za-z_$][\w$]*$/.test(param)) continue;
    const inner = roleOfIdentifier(stripped, param, seen);
    if (inner !== 'unknown') return inner;
  }
  return 'unknown';
}

/** input | output | unknown */
function classify(stripped, lines, cand, line) {
  // (a) The literal sits directly inside a read/write call.
  const before = stripped.slice(Math.max(0, cand.index - 120), cand.index);
  const enclosing = /\b([A-Za-z_$][\w$]*)\s*\([^()]*$/.exec(before);
  if (enclosing) {
    const fn = enclosing[1];
    if (STRONG_READ_CALLS.includes(fn)) return 'input';
    if (WRITE_CALLS.includes(fn)) return 'output';
    if (fn === 'existsSync') return 'input';
  }

  // (b) Follow the variable it is bound to.
  const name = assignedName(stripped, cand.index);
  if (name) {
    const role = roleOfIdentifier(stripped, name);
    if (role !== 'unknown') return role;
  }

  // (c) Fall back to the immediate neighbourhood.
  const lo = Math.max(0, line - 4), hi = Math.min(lines.length, line + 3);
  const near = lines.slice(lo, hi).join('\n');
  const has = names => names.some(n => new RegExp(`\\b${n}\\s*\\(`).test(near));
  const nearWrite = has(WRITE_CALLS);
  const nearRead = has(STRONG_READ_CALLS);
  if (nearRead && !nearWrite) return 'input';
  if (nearWrite && !nearRead) return 'output';

  return 'unknown';
}

/** Deepest ancestor of `rel` that exists on disk. This is the trap: it is true. */
function deepestExistingAncestor(rel) {
  const parts = rel.split('/');
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('/');
    if (existsSync(join(ROOT, candidate))) return candidate;
  }
  return '';
}

/** Post-refactor twins: code moved to src/, docs moved to reference/core/. */
function refactorTwins(rel) {
  const twins = [`src/${rel}`];
  if (rel.startsWith('reference/') && !rel.startsWith('reference/core/')) {
    twins.push(`reference/core/${rel.slice('reference/'.length)}`);
  }
  return twins.filter(t => t !== rel && existsSync(join(ROOT, t)));
}

// --- Collect files ---------------------------------------------------------

const EXCLUDED = /[.-](test|spec|e2e|e2e-spec)\.(mjs|ts)$|\.d\.ts$/;

function collectFiles(target, ext) {
  if (!existsSync(target)) return [];
  if (statSync(target).isFile()) return EXCLUDED.test(target) ? [] : [target];
  const out = [];
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
        walk(p);
      } else if (e.name.endsWith(ext) && !EXCLUDED.test(e.name)) {
        out.push(p);
      }
    }
  };
  walk(target);
  return out;
}

const SELF = resolve(__dirname, '39-validate-harness-paths.mjs');
const targets = SCAN_OVERRIDE
  ? [{ path: SCAN_OVERRIDE, mode: 'harness', ext: '.mjs' }]
  : SCAN_ROOTS;

// --- Analyse ---------------------------------------------------------------

const violations = [];
const ambiguities = [];
const unknowns = [];
const staleExternal = [];
let checked = 0;
let fileCount = 0;

for (const target of targets) {
  for (const file of collectFiles(target.path, target.ext).sort()) {
    if (resolve(file) === SELF) continue;
    // Product roots only cover each package's own `src/` tree -- not its
    // `test/` or `fixtures/` siblings, whose paths are deliberately synthetic.
    if (target.mode === 'product' && !file.split(sep).join('/').includes('/src/')) continue;
    fileCount++;
    const rel = relative(ROOT, file).split(sep).join('/');
    const stripped = stripComments(readFileSync(file, 'utf-8'));
    const lineStarts = buildLineIndex(stripped);
    const lines = stripped.split('\n');
    const seen = new Set();

    for (const cand of extractCandidates(stripped, target.mode)) {
      const line = lineAt(lineStarts, cand.index);
      const key = `${cand.value}@${line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      checked++;

      const exists = existsSync(join(ROOT, cand.value));
      const twins = refactorTwins(cand.value);

      // Not anchored to this repo -> describes the satellite / user project.
      // Never a violation. Only interesting when the refactor twin exists here,
      // which means the constant was very likely left behind.
      if (!cand.rootRelative) {
        if (!exists && twins.length > 0) {
          staleExternal.push({ file: rel, line, literal: cand.value, twins });
        }
        continue;
      }

      const kind = classify(stripped, lines, cand, line);

      if (!exists) {
        const record = {
          file: rel, line, literal: cand.value, kind,
          ancestor: deepestExistingAncestor(cand.value), twins,
        };
        if (kind === 'input') violations.push(record);
        else if (kind === 'unknown') unknowns.push(record);
        // Missing output paths are fine -- they are about to be created.
        continue;
      }

      // Exists, but a post-refactor twin also exists: which one is real?
      if (twins.length > 0) {
        ambiguities.push({ file: rel, line, literal: cand.value, kind, twins });
      }
    }
  }
}

// --- Report ----------------------------------------------------------------

const label = { input: 'input', output: 'output', unknown: 'undetermined' };

if (violations.length > 0) {
  console.error('✗ Path validation failed: repo-relative input literals that do not resolve\n');
  for (const v of violations) {
    console.error(`  • ${v.file}:${v.line}`);
    console.error(`      literal:  ${v.literal}`);
    console.error(`      expected: an existing path under the repo root (${label[v.kind]})`);
    if (v.ancestor) {
      console.error(`      note:     ancestor "${v.ancestor}/" DOES exist -- a parent-level`);
      console.error(`                existsSync() check passes and the scan silently returns`);
      console.error(`                an empty list instead of failing`);
    } else {
      console.error(`      note:     no ancestor of this path exists either`);
    }
    if (v.twins.length) console.error(`      did you mean: ${v.twins.join(' | ')}`);
    console.error('');
  }
}

if (staleExternal.length > 0) {
  console.warn(
    `⚠ ${staleExternal.length} literal(s) resolved against an external repo look stale --\n` +
    `  they do not exist here, but their post-refactor twin does:\n`,
  );
  for (const s of staleExternal) {
    console.warn(`  • ${s.file}:${s.line} "${s.literal}" -> ${s.twins.join(' | ')}`);
  }
  console.warn('');
}

if (ambiguities.length > 0) {
  console.warn(`⚠ ${ambiguities.length} ambiguous literal(s) -- resolves, but a post-refactor twin also exists:\n`);
  for (const a of ambiguities) {
    console.warn(`  • ${a.file}:${a.line} "${a.literal}" (${label[a.kind]}) also exists as: ${a.twins.join(' | ')}`);
  }
  console.warn('');
}

if (unknowns.length > 0) {
  const show = VERBOSE ? unknowns : unknowns.slice(0, 10);
  console.warn(`⚠ ${unknowns.length} unresolved literal(s) whose input/output role is undetermined (not violations):\n`);
  for (const u of show) {
    console.warn(`  • ${u.file}:${u.line} "${u.literal}"${u.ancestor ? ` (ancestor "${u.ancestor}/" exists)` : ''}`);
  }
  if (!VERBOSE && unknowns.length > show.length) {
    console.warn(`  ... ${unknowns.length - show.length} more (run with --verbose)`);
  }
  console.warn('');
}

const summary = `${checked} literal(s) checked across ${fileCount} file(s)`;

if (violations.length === 0) {
  console.log(`✓ Repo path literals valid: ${summary}`);
  if (staleExternal.length || ambiguities.length || unknowns.length) {
    console.log(
      `  ${staleExternal.length} stale-external, ${ambiguities.length} ambiguity, ` +
      `${unknowns.length} undetermined warning(s)`,
    );
  }
  process.exit(0);
}

console.error(
  `${violations.length} broken input path literal(s) in ` +
  `${new Set(violations.map(v => v.file)).size} file(s). (${summary})`,
);
console.error('These scan paths that no longer exist and fail silently.');
process.exit(1);
