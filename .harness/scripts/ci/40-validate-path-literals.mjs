#!/usr/bin/env node

/**
 * GT-578 — Path-literal guard for COMMAND and CONFIG positions.
 *
 * WHY THIS EXISTS
 * The move to `src/` migrated modules and imports but not path *strings*. The
 * compiler catches a moved module; nothing catches a moved file named by a
 * string, and a path that does not resolve produces silence rather than an
 * error. Live shape this guard was written against:
 *
 *   .github/workflows/sdk-cli-ci.yml
 *     run: node .harness/scripts/ci/13-agentic-code-review.mjs
 *          ^ the real file is under ci/agentic/ — node exits non-zero but the
 *            step is wrapped so "Winston Agentic Review" reported success.
 *   .harness/scripts/ci/agentic/13-agentic-code-review.mjs
 *     args: ["packages/mcp-server/dist/main.js"]
 *          ^ pre-refactor path: `packages/` has not existed since the move.
 *
 * RELATION TO 39-validate-harness-paths.mjs
 * 39 tracks literals that flow into *fs* calls inside .mjs/.ts sources, and
 * classifies anything it cannot prove is an input as "undetermined" — a
 * warning. Both live instances above land in that undetermined bucket, because
 * neither is an fs call: one is a shell token in YAML, the other a child
 * process argv element. This guard owns exactly that complement: paths in
 * **command position** (an interpreter/tool is about to open them) and in
 * **infrastructure config position** (docker/compose resolves them at build
 * time). In those positions "input" is not a heuristic — it is the semantics of
 * the position — so a dead literal is a hard failure, not a warning.
 *
 * SCOPE (three sources, each with its own extractor)
 *   harness-scripts  .harness/scripts/**\/*.{mjs,js,sh}
 *                    - argv arrays: spawn, spawnSync, execFile, execFileSync,
 *                      and `args:` / `args =` properties
 *                    - shell command strings: exec/execSync/spawnSync("sh -c")
 *                    - every line of a .sh file
 *   workflow-run     .github/workflows/**\/*.{yml,yaml} — `run:` step bodies
 *   infra-config     product/infra/**\/*.{yml,yaml} — compose `build.context`,
 *                    `dockerfile`, bind-mount sources, `env_file`
 *
 * FALSE-POSITIVE CONTROL (a guard that cries wolf gets deleted)
 *   - Only tokens that are unambiguously repo-relative are considered: the
 *     first segment must be a real top-level directory of the repo, a child of
 *     `src/`, or an explicit `./`. The `src/` children matter: `packages/`,
 *     `apps/`, `sdk/`, `rulesets/` moved *under* src, so a literal still
 *     starting with one of them is precisely the stale shape we hunt.
 *   - Anything with `$`, a backtick, a glob/redirect metacharacter, whitespace,
 *     a scheme (`https://`), or a leading `/` is skipped: not statically
 *     resolvable, or not ours.
 *   - Write/create/destroy positions are skipped (mkdir, touch, cp/mv target,
 *     rm, tee, `>` redirects, echo). Those paths are allowed to be absent.
 *   - Conditional probes (`[ -f x ]`, `test -f x`) are skipped: absence there is
 *     handled by the script itself.
 *   - Build outputs (dist/, coverage/, node_modules/, ...) legitimately do not
 *     exist on a clean checkout, so the literal is not required to resolve —
 *     but its nearest NON-generated ancestor is. `packages/mcp-server/dist/
 *     main.js` is checked as `packages/mcp-server`, which is how the live
 *     defect is caught without demanding a build.
 *   - Paths resolving outside the repo root (cross-repo compose contexts) are
 *     reported as external, never as violations.
 *   - Anything left that must still be tolerated goes in ALLOWLIST with a
 *     written reason. Silence is not an option.
 *
 * ANTI-VACUOUS PASS (the second root cause GT-578 attacks)
 * Following 34-boundary-guard-repository.mjs:57-73, this guard refuses to
 * report a verdict it did not earn. It exits 1 when a scan root is missing,
 * when a source matched zero files, or when a source extracted zero literals,
 * and it always publishes its denominator.
 *
 * Usage:
 *   node .harness/scripts/ci/40-validate-path-literals.mjs
 *   node .harness/scripts/ci/40-validate-path-literals.mjs --verbose
 *   node .harness/scripts/ci/40-validate-path-literals.mjs --root <dir>
 *   node .harness/scripts/ci/40-validate-path-literals.mjs --report
 *
 * Exit codes:
 *   0 - every checked literal resolves (or is allow-listed with a reason)
 *   1 - a dead literal, a missing scan root, or a zero-element scan
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
/**
 * `--report` prints the same findings and exits 0. It exists for the honest
 * middle state: a repository that still carries dead literals can wire the
 * guard in reporting mode and see them every run, instead of wiring a strict
 * guard that someone deletes on the first red build. It NEVER prints "passed".
 */
const REPORT_ONLY = argv.includes('--report') || process.env.EVOLITH_PATH_LITERALS_MODE === 'report';
const rootIdx = argv.indexOf('--root');
const ROOT = rootIdx !== -1 ? resolve(process.cwd(), argv[rootIdx + 1]) : resolve(__dirname, '../../..');

// --- Scan sources ----------------------------------------------------------

const SOURCES = [
  { id: 'harness-scripts', dir: '.harness/scripts', exts: ['.mjs', '.js', '.sh'] },
  { id: 'workflow-run', dir: '.github/workflows', exts: ['.yml', '.yaml'] },
  { id: 'infra-config', dir: 'product/infra', exts: ['.yml', '.yaml'] },
];

/**
 * Every entry needs a reason. A bare list of paths is how a guard rots into a
 * no-op: nobody can tell later which entries were justified.
 */
const ALLOWLIST = [
  {
    match: /^\.harness\/scripts\/ci\/40-validate-path-literals\.test\.mjs$/,
    reason: "this guard's own test fixtures are deliberately dead paths",
  },
];

// --- Repo vocabulary -------------------------------------------------------

function dirNames(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'node_modules' && d.name !== '.git')
    .map(d => d.name);
}

/** Real first-level directories, plus the children of `src/` (pre-refactor shapes). */
const TOP_LEVEL_DIRS = new Set(dirNames(ROOT));
const SRC_CHILD_DIRS = new Set(dirNames(join(ROOT, 'src')));

/** Segments whose contents are produced by a build and may be absent. */
const GENERATED_SEGMENTS = new Set([
  'dist', 'build', 'out', 'coverage', 'node_modules', '.next', '.turbo',
  '.cache', 'tmp', '.tmp', 'artifacts', '.artifacts', 'target', '__generated__',
]);

/** Shell commands whose operands are created/destroyed, not read. */
const WRITE_COMMANDS = new Set([
  'mkdir', 'touch', 'rm', 'rmdir', 'cp', 'mv', 'ln', 'tee', 'echo', 'printf',
  'mktemp', 'chmod', 'chown', 'truncate', 'install', 'unzip', 'tar', 'zip',
]);

/** Commands that probe for existence; absence is the script's own business. */
const PROBE_COMMANDS = new Set(['test', '[', '[[', 'if', 'elif', 'while', 'until']);

// --- Token classification --------------------------------------------------

function stripQuotes(tok) {
  const m = /^(['"])(.*)\1$/.exec(tok);
  return m ? m[2] : tok;
}

/**
 * Is this token a statically-resolvable, repo-relative path literal?
 * Deliberately conservative: everything uncertain answers `false`.
 */
function isRepoPathLiteral(value) {
  if (!value || value.length > 200) return false;
  if (!value.includes('/')) return false;
  if (value.endsWith('/')) return false;
  if (/\s/.test(value)) return false;
  if (/[$`*?{}<>|;&()\[\]!]/.test(value)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return false; // URL
  if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)) return false; // absolute
  if (value.startsWith('@') || value.startsWith('#')) return false; // npm scope / anchor
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) return false;
  const normalized = value.startsWith('./') ? value.slice(2) : value;
  if (!normalized.includes('/')) return false;
  const first = normalized.split('/')[0];
  if (first === '..' || first === '.') return false; // relative escapes: base unknown here
  return TOP_LEVEL_DIRS.has(first) || SRC_CHILD_DIRS.has(first);
}

/**
 * What has to exist on disk for this literal to be live?
 * Under a generated segment the artifact itself may be absent on a clean
 * checkout, but the source directory that produces it may not.
 */
function requiredPath(rel) {
  const parts = rel.split('/');
  const genIdx = parts.findIndex(p => GENERATED_SEGMENTS.has(p));
  if (genIdx <= 0) return { path: rel, viaGenerated: false };
  return { path: parts.slice(0, genIdx).join('/'), viaGenerated: true };
}

function deepestExistingAncestor(rel) {
  const parts = rel.split('/');
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('/');
    if (existsSync(join(ROOT, candidate))) return candidate;
  }
  return '';
}

/**
 * A literal that escapes the repo root is normally a legitimate cross-repo
 * reference (the Tracker checkout next door). It stops being innocent when what
 * it points at also exists *inside* this repo under its post-refactor name:
 * that is a `../` count left over from the move, and a bind mount then silently
 * resolves to an empty directory instead of failing.
 */
function escapedTwins(resolvedRel) {
  const tail = resolvedRel.replace(/^(?:\.\.\/)+/, '');
  if (!tail || tail.startsWith('..')) return [];
  return [tail, `src/${tail}`].filter(t => existsSync(join(ROOT, t)));
}

/** Post-refactor twins: code moved under src/, docs under reference/core/. */
function refactorTwins(rel) {
  const twins = [`src/${rel}`];
  if (rel.startsWith('reference/') && !rel.startsWith('reference/core/')) {
    twins.push(`reference/core/${rel.slice('reference/'.length)}`);
  }
  return twins.filter(t => t !== rel && existsSync(join(ROOT, t)));
}

// --- Shell line tokenizer --------------------------------------------------

function shellTokens(line) {
  const tokens = [];
  let cur = '';
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) { quote = ''; continue; }
      cur += c;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (/\s/.test(c)) { if (cur) tokens.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

/**
 * Extract candidate path literals out of one shell command line.
 * Skips write/probe commands and redirect targets entirely.
 */
function literalsInShellLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return [];

  const out = [];
  // A line can chain several commands; treat each segment independently so a
  // read command after `&&` is not silenced by a write command before it.
  for (const segment of trimmed.split(/&&|\|\||;|\|/)) {
    const tokens = shellTokens(segment.trim());
    if (tokens.length === 0) continue;

    let cmdIdx = 0;
    // Skip leading VAR=value assignments and `sudo`/`env` wrappers.
    while (cmdIdx < tokens.length && /^[A-Za-z_][\w]*=/.test(tokens[cmdIdx])) cmdIdx++;
    if (tokens[cmdIdx] === 'sudo' || tokens[cmdIdx] === 'env') cmdIdx++;
    const cmd = (tokens[cmdIdx] || '').split('/').pop();
    if (WRITE_COMMANDS.has(cmd) || PROBE_COMMANDS.has(cmd)) continue;
    if (cmd === 'set' || cmd === 'export' || cmd === 'return' || cmd === 'exit') continue;

    for (let i = cmdIdx; i < tokens.length; i++) {
      const raw = tokens[i];
      // Redirect target: `> file`, `>> file`, `2> file`
      if (/^\d?>>?$/.test(raw)) { i++; continue; }
      if (/^\d?>>?/.test(raw)) continue;
      if (raw.startsWith('<')) continue;

      // `--flag=value` -> value
      let tok = raw;
      const eq = /^--?[A-Za-z0-9][\w-]*=(.+)$/.exec(tok);
      if (eq) tok = eq[1];
      else if (tok.startsWith('-')) continue; // a flag, not a path

      tok = stripQuotes(tok).replace(/[,;:]+$/, '');
      if (isRepoPathLiteral(tok)) out.push(tok);
    }
  }
  return out;
}

// --- Source scanning helpers ----------------------------------------------

function collectFiles(dirAbs, exts) {
  const out = [];
  if (!existsSync(dirAbs)) return out;
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
        walk(p);
      } else if (exts.some(x => e.name.endsWith(x))) {
        out.push(p);
      }
    }
  };
  if (statSync(dirAbs).isFile()) return [dirAbs];
  walk(dirAbs);
  return out;
}

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) if (content[i] === '\n') line++;
  return line;
}

// --- Extractor: harness scripts -------------------------------------------

const SELF_BASENAME = '40-validate-path-literals.mjs';

/** Identifiers that stand for THIS repo's root as the base of join/resolve. */
const ROOT_IDENT = /^(?:_{0,2}(?:repo|project)?_?root(?:_?dir)?|cwd|__dirname|process\.cwd\(\))$/i;

/**
 * Map `const NAME = <path expr>` to its literal value, for the very common
 * `const SCRIPT = join(ROOT, 'a/b.mjs'); spawnSync('node', [SCRIPT])` idiom.
 * Only two expression shapes are accepted, and a name declared more than once
 * is dropped entirely — an ambiguous binding is not evidence of anything.
 */
function constantPathBindings(content) {
  const map = new Map();
  const dup = new Set();
  const declRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g;
  let m;
  while ((m = declRe.exec(content)) !== null) {
    const name = m[1];
    const expr = m[2].trim();
    let value = null;

    const asStr = /^(['"])([^'"\n]*)\1\s*[;,]?$/.exec(expr);
    if (asStr) {
      value = asStr[2];
    } else {
      const call = /^(?:path\s*\.\s*)?(?:join|resolve)\s*\(([^()]*(?:\(\s*\)[^()]*)?)\)/.exec(expr);
      if (call) {
        const args = call[1].split(',').map(a => a.trim()).filter(Boolean);
        if (args.length >= 2 && ROOT_IDENT.test(args[0].replace(/\s+/g, ''))) {
          const parts = [];
          for (const a of args.slice(1)) {
            const s = /^(['"])([^'"\n]*)\1$/.exec(a);
            if (!s) { parts.length = 0; break; }
            parts.push(s[2]);
          }
          if (parts.length) value = parts.join('/').replace(/\/+/g, '/');
        }
      }
    }

    if (value === null) { dup.add(name); continue; }
    if (map.has(name)) dup.add(name);
    map.set(name, { value, index: m.index });
  }
  for (const name of dup) map.delete(name);
  return map;
}

function extractHarnessScript(relFile, content) {
  const found = [];
  const push = (literal, index) => found.push({ literal, line: lineOf(content, index), base: '' });

  if (relFile.endsWith('.sh')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const lit of literalsInShellLine(lines[i])) {
        found.push({ literal: lit, line: i + 1, base: '' });
      }
    }
    return found;
  }

  // 1) argv arrays handed to a child process: spawn/spawnSync/execFile*/`args:`
  const bindings = constantPathBindings(content);
  const argvRe =
    /(?:\bargs\s*[:=]\s*|\b(?:spawn|spawnSync|execFile|execFileSync)\s*\([^,()]*,\s*)\[([^\]]*)\]/g;
  let m;
  while ((m = argvRe.exec(content)) !== null) {
    const inner = m[1];
    const strRe = /(['"])([^'"\n]*)\1/g;
    let s;
    while ((s = strRe.exec(inner)) !== null) {
      const value = s[2];
      if (isRepoPathLiteral(value)) push(value, m.index + m[1].indexOf(value));
    }
    // Bare identifiers in argv position: `spawnSync('node', [SCRIPT])`.
    const identRe = /(?:^|,)\s*([A-Za-z_$][\w$]*)\s*(?=,|$)/g;
    let id;
    while ((id = identRe.exec(inner)) !== null) {
      const bound = bindings.get(id[1]);
      if (bound && isRepoPathLiteral(bound.value)) push(bound.value, bound.index);
    }
  }

  // 2) shell command strings: exec/execSync take one command line
  const execRe = /\b(?:exec|execSync)\s*\(\s*(['"`])([^'"`\n]*)\1/g;
  while ((m = execRe.exec(content)) !== null) {
    for (const lit of literalsInShellLine(m[2])) push(lit, m.index);
  }

  // 3) template-literal command strings (multi-line `execSync(`...`)`) — only
  //    the segments free of ${} interpolation are statically resolvable.
  const tmplRe = /\b(?:exec|execSync)\s*\(\s*`([^`]*)`/g;
  while ((m = tmplRe.exec(content)) !== null) {
    for (const line of m[1].split('\n')) {
      if (line.includes('${')) continue;
      for (const lit of literalsInShellLine(line)) push(lit, m.index);
    }
  }

  return found;
}

// --- Extractor: workflow `run:` steps --------------------------------------

function extractWorkflowRun(_relFile, content) {
  const found = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)(?:-\s+)?run:\s*(\|[-+]?|>[-+]?)?\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length + (/^\s*-\s+run:/.test(lines[i]) ? 2 : 0);

    if (!m[2]) {
      // Inline scalar: `run: node foo.mjs`
      for (const lit of literalsInShellLine(m[3])) found.push({ literal: lit, line: i + 1, base: '' });
      continue;
    }

    // Block scalar: consume the more-indented lines that follow.
    for (let j = i + 1; j < lines.length; j++) {
      const body = lines[j];
      if (body.trim() === '') continue;
      const bodyIndent = body.length - body.trimStart().length;
      if (bodyIndent <= indent) { i = j - 1; break; }
      for (const lit of literalsInShellLine(body)) found.push({ literal: lit, line: j + 1, base: '' });
      if (j === lines.length - 1) i = j;
    }
  }
  return found;
}

// --- Extractor: infra config (compose / helm) ------------------------------

/**
 * Compose paths are relative to the compose file's own directory, not the repo
 * root, so each literal carries its own `base`.
 */
function extractInfraConfig(relFile, content) {
  const found = [];
  const base = posix.dirname(relFile.split(sep).join('/'));
  const lines = content.split('\n');
  /** Innermost `context:` seen, so a sibling `dockerfile:` resolves against it. */
  let lastContext = null;

  const record = (value, line, ctxBase) => {
    if (/[$*?{}]/.test(value)) return; // templated / glob
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return;
    if (value.startsWith('/')) return; // container path, not repo path
    found.push({ literal: value, line, base: ctxBase });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*#/.test(line)) continue;
    const indent = line.length - line.trimStart().length;

    let m;
    if ((m = /^\s*context:\s*(.+?)\s*(?:#.*)?$/.exec(line))) {
      const value = stripQuotes(m[1]);
      lastContext = { indent, value };
      record(value, i + 1, base);
      continue;
    }
    if ((m = /^\s*dockerfile:\s*(.+?)\s*(?:#.*)?$/.exec(line))) {
      const value = stripQuotes(m[1]);
      const ctx = lastContext && lastContext.indent === indent ? lastContext.value : '.';
      record(value, i + 1, posix.normalize(posix.join(base, ctx)));
      continue;
    }
    if ((m = /^\s*-\s*(\.\.?\/[^:\s]+):[^\s]*$/.exec(line))) {
      // bind mount: `- ./observability/prometheus.yml:/etc/...:ro`
      record(stripQuotes(m[1]), i + 1, base);
      continue;
    }
    if ((m = /^\s*-\s*(\.\.?\/[^\s:]+)\s*$/.exec(line))) {
      // env_file / list entry
      record(stripQuotes(m[1]), i + 1, base);
    }
  }
  return found;
}

const EXTRACTORS = {
  'harness-scripts': extractHarnessScript,
  'workflow-run': extractWorkflowRun,
  'infra-config': extractInfraConfig,
};

// --- Run -------------------------------------------------------------------

const violations = [];
const externals = [];
const staleExternal = [];
const allowlisted = [];
const stats = [];
const fatal = [];

for (const source of SOURCES) {
  const dirAbs = join(ROOT, source.dir);

  // Anti-vacuous #1: the scan root itself must exist.
  if (!existsSync(dirAbs)) {
    fatal.push(
      `scan root "${source.dir}" (source ${source.id}) does not exist.\n` +
      `    Refusing to report a verdict over a tree that is not there — a dead\n` +
      `    scan root must never be reported as "no dead path literals".`,
    );
    stats.push({ id: source.id, files: 0, literals: 0 });
    continue;
  }

  const files = collectFiles(dirAbs, source.exts).filter(f => !f.endsWith(SELF_BASENAME));
  let literalCount = 0;

  for (const file of files) {
    const relFile = relative(ROOT, file).split(sep).join('/');
    const content = readFileSync(file, 'utf-8');
    const seen = new Set();

    for (const cand of EXTRACTORS[source.id](relFile, content)) {
      const key = `${cand.literal}@${cand.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      literalCount++;

      const allow = ALLOWLIST.find(a => a.match.test(relFile) || a.match.test(cand.literal));
      if (allow) { allowlisted.push({ file: relFile, line: cand.line, literal: cand.literal, reason: allow.reason }); continue; }

      // Resolve. `base` is repo-relative ('' means the repo root).
      const abs = resolve(ROOT, cand.base || '.', cand.literal);
      const relFromRoot = relative(ROOT, abs).split(sep).join('/');
      if (relFromRoot.startsWith('..')) {
        const twins = escapedTwins(relFromRoot);
        const target = resolve(ROOT, cand.base || '.', cand.literal);
        if (twins.length > 0 && !existsSync(target)) {
          staleExternal.push({
            file: relFile, line: cand.line, literal: cand.literal, resolved: relFromRoot, twins,
          });
        } else {
          externals.push({ file: relFile, line: cand.line, literal: cand.literal, resolved: relFromRoot });
        }
        continue;
      }

      const required = requiredPath(relFromRoot);
      if (existsSync(join(ROOT, required.path))) continue;

      violations.push({
        source: source.id,
        file: relFile,
        line: cand.line,
        literal: cand.literal,
        checked: required.path,
        viaGenerated: required.viaGenerated,
        ancestor: deepestExistingAncestor(required.path),
        twins: refactorTwins(required.path),
      });
    }
  }

  stats.push({ id: source.id, files: files.length, literals: literalCount });

  // Anti-vacuous #2 and #3: a source that matched no file, or matched files but
  // extracted nothing, has proved nothing. That is how a regex silently rots.
  if (files.length === 0) {
    fatal.push(
      `source ${source.id} scanned "${source.dir}" and found zero ${source.exts.join('/')} file(s).\n` +
      `    A zero-file scan must never be reported as "path literals valid".`,
    );
  } else if (literalCount === 0) {
    fatal.push(
      `source ${source.id} scanned ${files.length} file(s) under "${source.dir}" and extracted\n` +
      `    zero path literals. Either the extractor stopped matching or the source no longer\n` +
      `    carries paths; either way the denominator is zero and the pass would be vacuous.`,
    );
  }
}

// --- Report ----------------------------------------------------------------

const totalFiles = stats.reduce((a, s) => a + s.files, 0);
const totalLiterals = stats.reduce((a, s) => a + s.literals, 0);
const denominator =
  `${totalLiterals} path literal(s) checked across ${totalFiles} file(s) — ` +
  stats.map(s => `${s.id}: ${s.literals}/${s.files}f`).join(', ');

if (VERBOSE && externals.length > 0) {
  console.log(`ℹ ${externals.length} literal(s) resolve outside the repo root (cross-repo, not checked):`);
  for (const e of externals) console.log(`  • ${e.file}:${e.line} "${e.literal}" -> ${e.resolved}`);
  console.log('');
}

if (staleExternal.length > 0) {
  console.warn(
    `⚠ ${staleExternal.length} literal(s) escape the repo root but their in-repo twin exists —\n` +
    `  almost certainly a leftover \`../\` count from the src/ move (warning, not a failure:\n` +
    `  a sibling checkout is a legal, if unlikely, explanation):\n`,
  );
  for (const s of staleExternal) {
    console.warn(`  • ${s.file}:${s.line} "${s.literal}" -> ${s.resolved} (does not exist)`);
    console.warn(`      in-repo twin: ${s.twins.join(' | ')}`);
  }
  console.warn('');
}

if (VERBOSE && allowlisted.length > 0) {
  console.log(`ℹ ${allowlisted.length} allow-listed literal(s):`);
  for (const a of allowlisted) console.log(`  • ${a.file}:${a.line} "${a.literal}" — ${a.reason}`);
  console.log('');
}

if (violations.length > 0) {
  const stream = REPORT_ONLY ? console.warn : console.error;
  stream(
    `${REPORT_ONLY ? '⚠' : '✗'} ${violations.length} dead path literal(s) in command/config position:\n`,
  );
  for (const v of violations) {
    stream(`  • [${v.source}] ${v.file}:${v.line}`);
    stream(`      literal:  ${v.literal}`);
    stream(`      missing:  ${v.checked}${v.viaGenerated ? '  (build output tolerated; its source dir is not)' : ''}`);
    if (v.ancestor) {
      stream(`      note:     ancestor "${v.ancestor}/" DOES exist, so a parent-level check passes`);
      stream(`                and the failure stays silent`);
    } else {
      stream(`      note:     no ancestor of this path exists either`);
    }
    if (v.twins.length) stream(`      did you mean: ${v.twins.join(' | ')}`);
    stream('');
  }
}

if (fatal.length > 0) {
  console.error('✗ Path-literal guard cannot report a verdict:\n');
  for (const f of fatal) console.error(`  • ${f}\n`);
  console.error(`(${denominator})`);
  process.exit(1);
}

if (violations.length === 0) {
  console.log(`✓ Path literals valid: ${denominator}`);
  if (externals.length || allowlisted.length || staleExternal.length) {
    console.log(
      `  ${externals.length} external, ${staleExternal.length} stale-external warning(s), ` +
      `${allowlisted.length} allow-listed (run with --verbose to list)`,
    );
  }
  process.exit(0);
}

if (REPORT_ONLY) {
  console.warn(
    `⚠ REPORT MODE — ${violations.length} dead path literal(s) across ` +
    `${new Set(violations.map(v => v.file)).size} file(s). (${denominator})`,
  );
  console.warn('  Exiting 0 because this guard runs in reporting mode. This is NOT a pass.');
  process.exit(0);
}

console.error(
  `${violations.length} dead path literal(s) across ` +
  `${new Set(violations.map(v => v.file)).size} file(s). (${denominator})`,
);
console.error('Each names a file that is never opened, and the failure is silent.');
process.exit(1);
