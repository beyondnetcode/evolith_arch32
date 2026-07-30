#!/usr/bin/env node

/**
 * GT-578 — execute (and resolve) the board's `validationCommands`.
 *
 * WHY THIS EXISTS
 * `gap-closure-evidence.json` records, for every closed gap, the commands that
 * are supposed to reproduce its closure. Nothing ever ran them.
 * `08-validate-tracking.mjs:231-235` asserts only that the array is non-empty
 * and that each element is a non-blank string:
 *
 *     if (!Array.isArray(record.validationCommands)
 *         || record.validationCommands.length === 0
 *         || record.validationCommands.some(c => typeof c !== 'string' || !c.trim()))
 *
 * A gap can therefore be closed against a command that has never existed, and
 * the 2026-07-26 audit found three in exactly that state (GT-146, GT-147,
 * GT-142). The evidence field was type-checked, not evidence-checked.
 *
 * WHAT THIS DOES — AND WHAT IT HONESTLY CANNOT
 * The corpus is not a list of shell lines. It is 900+ human-written strings of
 * three different kinds, and pretending otherwise would produce either a guard
 * that is permanently red or one that quietly stops looking:
 *
 *   1. a bare command                 `node .harness/scripts/ci/08-validate-tracking.mjs`
 *   2. a command plus recorded output `node ... 09-reconcile-maturity.mjs --check
 *                                      -> 'Maturity reconciliation matches'`
 *   3. genuine prose                  `Criterion 2: the release-please job was
 *                                      replaced by a release-gate job...`
 *
 * and, among the real commands, a further split between what a CI runner may
 * execute (a read-only harness script) and what it may not (anything needing
 * `gh` credentials, a Docker daemon, a cluster, or a ten-minute jest suite).
 *
 * So the runner works in two independent layers, and reports both denominators:
 *
 *   RESOLUTION (always, cheap, deterministic)
 *     Every extracted command has its *referent* resolved against disk:
 *     `node <path>` -> the script exists; `npm ... --workspace <w>` -> the
 *     workspace exists and, for `npm run <s>`, declares that script;
 *     `grep <pat> <file>` / `ls <path>` -> the target exists; a relative binary
 *     like `.harness/bin/opa` -> it is there. A command whose referent is gone
 *     is a DEAD REFERENCE: it cannot ever have reproduced anything, and it is
 *     reported whether or not the command is executable here.
 *
 *   EXECUTION (`--execute`)
 *     The subset that is read-only, resolvable, non-recursive and fast is
 *     actually spawned, deduplicated, with a timeout. Exit code is the verdict.
 *     Everything excluded is counted and labelled with the reason it was
 *     excluded — never silently dropped.
 *
 * MODE, AND WHAT WOULD FLIP IT STRICT
 * Default is `--report`: it prints every finding and exits 0, saying in words
 * that this is NOT a pass. That is the same staging the path-literal guard
 * used: `40-validate-path-literals.mjs` shipped in `--report` while the two
 * dead literals it found still existed, and was flipped to strict in
 * `ci-runner.mjs` in the same change that repaired them.
 *
 * This guard flips to strict (its `--strict` flag becomes the wired default)
 * when BOTH hold:
 *   (a) dead references == 0. Today they are not: 21 recorded commands name a
 *       retired artifact with no successor (a consolidated `.bmad-core/AGENTS.md`,
 *       the retired `evolith-bff` gateway, the retired `packages/mcp-tools`, two
 *       retired k8s manifests, a retired sandbox app, three root-level scripts no
 *       longer declared) or embed `vision/` / `tools/list` as prose rather than a
 *       path (GT-637). These are historical records of commands that were correct
 *       when they ran, or narrative that only looks path-shaped; repairing them
 *       is a data migration of the evidence file
 *       (`reference/core/control-center/evidence/**`, owned by the board), not
 *       a code change, and it is deliberately out of scope here. (GT-637 already
 *       closed the ~290 that were pre-`src/`/`product/`-move paths with real
 *       successors, plus two defects in THIS guard that inflated the count on
 *       top of them — see the ratchet step in `ci-cd.yml` for the detail.)
 *   (b) executed failures == 0 on a clean checkout.
 * Until (a) is done, wiring `--strict` would make the governance run red for a
 * reason no code change can fix, and the guard would be deleted within a week.
 * `--max-dead <n>` exists so the count can be ratcheted down instead of being
 * flipped in one jump.
 *
 * ANTI-VACUOUS PASS
 * Through the repository's own `lib/coverage.mjs` primitive (GT-557): zero
 * closures, zero recorded commands, zero extracted commands, or (under
 * `--execute`) zero executions is a hard exit 1 in EVERY mode, including
 * `--report`. A census that counted nothing is not a report, it is a broken
 * parser, and `--report` must not be a way to launder that into an exit 0.
 *
 * Usage:
 *   node .harness/scripts/ci/41-validate-evidence-commands.mjs
 *   node .harness/scripts/ci/41-validate-evidence-commands.mjs --execute
 *   node .harness/scripts/ci/41-validate-evidence-commands.mjs --strict
 *   node .harness/scripts/ci/41-validate-evidence-commands.mjs --max-dead 520
 *   node .harness/scripts/ci/41-validate-evidence-commands.mjs --list-dead
 *   node .harness/scripts/ci/41-validate-evidence-commands.mjs --json
 *   ... --root <dir> --evidence <path> --timeout <ms>
 *
 * Exit codes:
 *   0 - report mode, or strict mode with no dead reference and no failed run
 *   1 - a vacuous scan (always), or strict-mode findings
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = '41-validate-evidence-commands';

// --- CLI -------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = name => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};

const ROOT = resolve(process.cwd(), opt('--root', resolve(__dirname, '../../..')));
const EVIDENCE_REL = opt(
  '--evidence',
  'reference/core/control-center/evidence/gap-closure-evidence.json',
);
const EXECUTE = flag('--execute');
const STRICT = flag('--strict');
const LIST_DEAD = flag('--list-dead');
const AS_JSON = flag('--json');
const VERBOSE = flag('--verbose');
const TIMEOUT_MS = Number(opt('--timeout', '60000'));
const MAX_DEAD = Number(opt('--max-dead', '0'));

// --- Narrative stripping ---------------------------------------------------

/**
 * Recorded output is appended after an arrow or a dash. `--` is deliberately
 * NOT a separator: `npm test --workspace w -- --testPathPatterns=x` is one
 * command, and splitting there would truncate it into a false dead reference.
 */
const NARRATIVE_SPLIT = /\s(?:->|=>|⇒|→|—|–)\s/;

/** Leading `FOO=bar` assignments and wrappers that precede the real binary. */
const ENV_ASSIGN = /^[A-Za-z_][A-Za-z0-9_]*=[^\s]*$/;

// --- Classification vocabulary ---------------------------------------------

/** Read-only binaries this runner is willing to spawn. */
const SAFE_BINARIES = new Set([
  'node', 'ls', 'cat', 'grep', 'rg', 'find', 'head', 'tail', 'wc', 'sort',
  'uniq', 'jq', 'diff', 'basename', 'dirname', 'realpath', 'stat', 'file',
]);

/** Needs a network, a daemon, a cluster or a credential. Never spawned here. */
const EXTERNAL_BINARIES = new Set([
  'gh', 'curl', 'wget', 'docker', 'docker-compose', 'kubectl', 'helm', 'kind',
  'aws', 'az', 'gcloud', 'psql', 'mysql', 'redis-cli', 'ssh', 'scp', 'terraform',
  'ansible', 'act', 'gitleaks', 'trivy', 'snyk', 'zap-cli',
]);

/**
 * Repo-relative path PREFIXES this checkout's own `.gitignore` disclaims —
 * `.harness/bin/` (downloaded by a separate CI step, e.g. `.harness/bin/opa`)
 * and build output (`dist/`, at any depth). A referent under one of these is
 * not a wrong path: this guard runs `npm ci` and nothing else, so neither has
 * been materialized here regardless of whether the referent is correct. Same
 * finding as `GT-632` on guard 47 — a gitignored artifact absent on a clean
 * checkout is not evidence the record is dead — but the fix here is narrower:
 * that guard checks a path's ANCESTOR is real; this one still can't confirm
 * the leaf exists, so the honest verdict is `unchecked`, not `resolved`.
 */
const GITIGNORED_PREFIXES = [/^\.harness\/bin\//, /(^|\/)dist\//];

function isGitignoredArtifact(relPath) {
  return GITIGNORED_PREFIXES.some(re => re.test(relPath));
}

/** Real toolchains, but minutes each and needing a built workspace. */
const HEAVY_BINARIES = new Set([
  'npx', 'jest', 'tsc', 'vitest', 'playwright', 'cypress', 'dotnet', 'mvn',
  'gradle', 'pnpm', 'yarn', 'make', 'ruby', 'python', 'python3',
]);

/** Writes, publishes, installs or deletes. Never spawned, ever. */
const MUTATING_BINARIES = new Set([
  'rm', 'mv', 'cp', 'mkdir', 'touch', 'chmod', 'chown', 'tee', 'sed', 'awk',
  'install', 'ln', 'truncate',
]);

/** `git <sub>` that only reads. Anything else is mutating. */
const SAFE_GIT_SUBS = new Set([
  'log', 'diff', 'status', 'show', 'ls-files', 'rev-parse', 'describe',
  'cat-file', 'grep', 'blame', 'branch', 'tag', 'remote', 'config',
]);

/** `npm <sub>` classification. */
const NPM_MUTATING = new Set(['publish', 'ci', 'install', 'i', 'link', 'version', 'pack', 'audit']);

/**
 * Scripts this runner refuses to spawn even though they are `node` and
 * resolvable. Each entry needs a reason: a bare denylist rots into a no-op.
 */
const EXEC_DENYLIST = [
  { match: /ci-runner\.mjs/, reason: 'recursion — ci-runner spawns this guard' },
  { match: /41-validate-evidence-commands\.mjs/, reason: 'recursion — this guard' },
  { match: /\/agentic\//, reason: 'calls out to an LLM provider (network + credentials)' },
  { match: /rag-(embed|pgvector|index|sync)/, reason: 'needs pgvector / an embedding endpoint' },
  { match: /sync-(project-board|wiki)\.mjs/, reason: 'writes to GitHub (credentials + mutation)' },
  { match: /satellite-sync\.mjs/, reason: 'clones and writes a sibling repository' },
  { match: /adr-promotion-push\.mjs/, reason: 'pushes to a remote' },
  { match: /(^|\/)(fix|apply|generate|sync|update|rewrite|close|cleanup|promote|optimize)-/, reason: 'mutates repository files' },
  { match: /02-optimize-repo\.mjs/, reason: 'mutates repository files' },
  { match: /06-impact-analysis-synchronizer\.mjs/, reason: 'mutates repository files' },
  { match: /07-generate-inventories\.mjs/, reason: 'mutates repository files' },
  { match: /15-rag-index-backfill\.mjs/, reason: 'needs pgvector' },
  { match: /run-evolith-/, reason: 'long-running audit driver' },
];

/**
 * Filesystem-write APIs. A recorded command is only safe to execute if the
 * script it names never calls one of these.
 *
 * A hand-written denylist of "scripts that write" is exactly the artifact this
 * gap is about: it is correct on the day it is written and wrong a month later.
 * This gate is derived from the source instead. It was added after the runner's
 * first real run executed `node .harness/scripts/coverage-dashboard.mjs`, which
 * is named like a read-only report and regenerates
 * `reference/core/control-center/audits/COVERAGE_REPORT.md` in place.
 *
 * Deliberately blunt: a script that writes only into `os.tmpdir()` is excluded
 * too. Distinguishing them requires proving where a path variable points, and a
 * false negative here means a CI job silently editing the working tree.
 */
const WRITE_APIS = [
  /\bwriteFileSync\b/, /\bappendFileSync\b/, /\bmkdirSync\b/, /\brmSync\b/,
  /\bunlinkSync\b/, /\brenameSync\b/, /\bcopyFileSync\b/, /\bcreateWriteStream\b/,
  /\bfs\.promises\.(?:writeFile|appendFile|mkdir|rm|unlink|rename|copyFile)\b/,
  /\bwriteFile\s*\(/, /\boutputFileSync\b/, /\bwriteJsonSync\b/, /\bensureDirSync\b/,
];

/** Argument shapes that turn a read-only guard into a writer. */
const MUTATING_ARGS = new Set(['--fix', '--write', '--apply', '--update', '--sync', '--backfill', '--force']);

/** Flags that make an otherwise fast guard pull in a browser or a model. */
const HEAVY_ARGS = new Map([
  ['--render-mermaid', 'launches a headless browser to rasterise diagrams'],
  ['--full', 'opt-in exhaustive mode'],
  ['--deep', 'opt-in exhaustive mode'],
]);

/**
 * Filters that are safe on the right-hand side of a pipe. They read stdin and
 * write stdout; none of them touches the working tree.
 */
const PIPE_SAFE = new Set([
  'sort', 'uniq', 'wc', 'head', 'tail', 'grep', 'rg', 'cut', 'tr', 'sed', 'awk',
  'jq', 'cat', 'rev', 'tee-not-allowed',
]);

/**
 * Shell constructs this runner will not evaluate. `|` is deliberately absent:
 * a pipeline of allow-listed filters is exactly how half the recorded `grep`
 * and `find` commands count things, and refusing them would drop the most
 * checkable part of the corpus.
 */
const SHELL_COMPOSITION = /(?:[;><`]|\|\||&&|\$\()/;


// --- Workspace resolution --------------------------------------------------

function readJson(abs) {
  try { return JSON.parse(readFileSync(abs, 'utf8')); } catch { return null; }
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

/**
 * Map every npm workspace to its directory, by name AND by path, so both
 * `--workspace @beyondnet/evolith-core-domain` and `--workspace src/sdk/cli`
 * resolve. The `workspaces` field carries globs, so they are expanded.
 */
function buildWorkspaceIndex(root) {
  const byName = new Map();
  const byPath = new Map();
  const pkg = readJson(join(root, 'package.json'));
  const patterns = Array.isArray(pkg?.workspaces) ? pkg.workspaces : (pkg?.workspaces?.packages ?? []);
  if (patterns.length === 0) return { byName, byPath };

  const walk = (dir, depth) => {
    if (depth > 5) return [];
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
    const out = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      const abs = join(dir, e.name);
      if (existsSync(join(abs, 'package.json'))) out.push(abs);
      out.push(...walk(abs, depth + 1));
    }
    return out;
  };

  const matchers = patterns.map(globToRegExp);
  for (const abs of walk(root, 0)) {
    const rel = abs.slice(root.length + 1).split('\\').join('/');
    if (!matchers.some(m => m.test(rel))) continue;
    const wpkg = readJson(join(abs, 'package.json'));
    byPath.set(rel, { dir: rel, pkg: wpkg });
    if (wpkg?.name) byName.set(wpkg.name, { dir: rel, pkg: wpkg });
  }
  return { byName, byPath };
}

// --- Tokenizer -------------------------------------------------------------

function tokenize(line) {
  const tokens = [];
  let cur = '';
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) { quote = ''; tokens.push({ raw: cur, quoted: true }); cur = ''; continue; }
      cur += c;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (/\s/.test(c)) { if (cur) { tokens.push({ raw: cur, quoted: false }); cur = ''; } continue; }
    cur += c;
  }
  if (cur) tokens.push({ raw: cur, quoted: quote !== '' });
  return tokens;
}

// --- Extraction ------------------------------------------------------------

/**
 * Turn one recorded string into a candidate command line, or null if it is
 * prose. Handles the `cd <dir> && <cmd>` prefix (48 occurrences) by returning
 * the working directory alongside the command.
 */
export function extractCommand(raw) {
  if (typeof raw !== 'string') return null;
  let head = raw.split(NARRATIVE_SPLIT)[0].trim();
  if (!head) return null;

  // A command quoted inside a sentence: `Verified with \`node x.mjs\``.
  if (!/^[.a-z_/]/.test(head)) {
    const bt = /`([^`]+)`/.exec(raw);
    if (!bt) return null;
    head = bt[1].trim();
  }

  // Drop a trailing sentence period, but not `./x` or `...`.
  head = head.replace(/(?<=[A-Za-z0-9)\]"'])\.$/, '');

  /**
   * Strip a trailing parenthetical annotation.
   *
   * 48 records have the shape `grep -c 'kind: Permission' path/to/f.yaml (== 3
   * per-product permissions)`. The parenthesis is the author's note about the
   * expected RESULT, not an argument — but the tokenizer turns `Exchange/Queue/
   * Binding` inside it into a path-shaped operand, the operand does not exist,
   * and the whole record is reported as a DEAD REFERENCE. That is the guard
   * inventing a defect, which in a report whose entire output is a count of
   * defects is the worst thing it can do.
   *
   * Only a parenthetical at the very end is stripped, and only when the command
   * has content before it: `(cd x && y)` stays whole.
   */
  const trailingNote = /\s\([^()]*\)$/;
  while (trailingNote.test(head) && head.replace(trailingNote, '').trim()) {
    head = head.replace(trailingNote, '').trim();
  }

  let cwd = '';
  const cdMatch = /^cd\s+([^\s&;|]+)\s*&&\s*(.+)$/.exec(head);
  if (cdMatch) {
    cwd = cdMatch[1].replace(/^\.\//, '');
    head = cdMatch[2].trim();
  }

  const allTokens = tokenize(head);
  // Split on an UNQUOTED `|`. Quote-awareness matters: half the recorded greps
  // carry an alternation pattern (`grep -rn 'A|B|C' src/...`), and a naive
  // split would shred it into bogus pipeline stages.
  const segments = [[]];
  for (const tok of allTokens) {
    if (!tok.quoted && tok.raw === '|') { segments.push([]); continue; }
    segments[segments.length - 1].push(tok);
  }
  /** Shell constructs appearing OUTSIDE quotes; inside a pattern they are data. */
  const shellMeta = allTokens.some(t => !t.quoted && SHELL_COMPOSITION.test(t.raw));

  let tokens = segments[0];
  const env = [];
  while (tokens.length && !tokens[0].quoted && ENV_ASSIGN.test(tokens[0].raw)) {
    env.push(tokens.shift().raw);
  }
  if (tokens.length === 0) return null;

  const bin = tokens[0].raw;
  // A first token that is not a plausible binary means the string is prose.
  if (tokens[0].quoted) return null;
  if (!/^[.A-Za-z_][A-Za-z0-9._/-]*$/.test(bin)) return null;
  if (/^[A-Z]/.test(bin)) return null; // "The", "Criterion", "Recorded", ...
  if (bin.endsWith(':')) return null;

  const known =
    SAFE_BINARIES.has(bin) || EXTERNAL_BINARIES.has(bin) || HEAVY_BINARIES.has(bin) ||
    MUTATING_BINARIES.has(bin) || bin === 'npm' || bin === 'git' || bin === 'test' ||
    bin === 'echo' || bin.includes('/');
  if (!known) return null;

  return {
    line: head,
    cwd,
    env,
    bin: bin.split('/').pop(),
    binRaw: bin,
    tokens: tokens.map(t => t.raw),
    // Quoting is load-bearing for resolution, not just for pipeline splitting:
    // a QUOTED operand of grep/rg is a search pattern, and a pattern with a `/`
    // in it (`grep -L 'control-center/gap-tracking' …`) is otherwise
    // indistinguishable from a path and reported dead.
    quoted: tokens.map(t => t.quoted),
    stages: segments.slice(1).map(seg => seg[0]?.raw?.split('/').pop() ?? ''),
    shellMeta,
    needsShell: segments.length > 1 || allTokens.some(t => !t.quoted && /[*?\[\]{}]/.test(t.raw)),
  };
}

// --- Resolution ------------------------------------------------------------

/** Does a literal look like a repo path we can check? */
function looksLikePath(tok) {
  if (!tok || tok.startsWith('-')) return false;
  if (/[$`|;><]/.test(tok)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(tok)) return false;
  if (tok.startsWith('/')) return false;
  return tok.includes('/') || /\.(mjs|js|cjs|ts|json|md|ya?ml|sh|rego|wasm)$/.test(tok);
}

/** Existence check that tolerates a `{a,b}` brace list or a `*` glob. */
function pathResolves(root, cwd, tok) {
  const base = join(root, cwd || '.');
  if (/[*{}?]/.test(tok)) {
    // Reduce a glob to its deepest literal ancestor directory.
    const parts = tok.split('/');
    const idx = parts.findIndex(p => /[*{}?]/.test(p));
    const anc = parts.slice(0, idx).join('/');
    return anc === '' ? true : existsSync(join(base, anc));
  }
  return existsSync(join(base, tok));
}

/**
 * Flags of grep/rg/find that consume the NEXT token as a value. Without this,
 * `grep -e control-center/gap-tracking .harness/...` treats the pattern as a
 * path, and `find src -name '*.json'` treats the glob as one.
 */
const PATTERN_FLAGS = new Set(['-e', '--regexp', '-f', '--file']);
const VALUE_FLAGS = new Set([
  '-e', '--regexp', '-f', '--file', '--include', '--exclude', '--exclude-dir',
  '-m', '--max-count', '-A', '-B', '-C', '--context', '-g', '--glob', '-t',
  '--type', '-name', '-iname', '-path', '-type', '-maxdepth', '-mindepth',
]);

/**
 * The tokens of a search/list command that are genuinely PATHS.
 *
 * Two token classes were being resolved as paths and reported dead when they
 * are nothing of the sort:
 *
 *   1. the search PATTERN. For grep/rg the first non-flag operand is the
 *      pattern, and a quoted pattern that contains a `/` — very common in this
 *      corpus, which greps for repo paths inside files — looked exactly like a
 *      target that had moved.
 *   2. the value of a flag like `-e` / `--include` / `-name`.
 *
 * A quoted token is never treated as a path here. That is slightly stricter
 * than a shell (a quoted path is legal) but it is the right trade: in this
 * corpus quoting marks a pattern, and a false DEAD is a fabricated finding
 * while a false `unchecked` is only an unverified one.
 */
function pathOperands(cmd) {
  const isPatternCmd = cmd.bin === 'grep' || cmd.bin === 'rg';
  const out = [];
  let patternSeen = false;
  for (let i = 1; i < cmd.tokens.length; i++) {
    const tok = cmd.tokens[i];
    const wasQuoted = cmd.quoted?.[i] === true;
    // `-e PATTERN` / `-f FILE` supply the pattern explicitly, so the next bare
    // operand is already a path, not the pattern.
    if (!wasQuoted && PATTERN_FLAGS.has(tok)) { patternSeen = true; i += 1; continue; }
    if (!wasQuoted && VALUE_FLAGS.has(tok)) { i += 1; continue; }
    if (!wasQuoted && tok.startsWith('-')) continue;
    if (wasQuoted) { patternSeen = true; continue; }
    if (isPatternCmd && !patternSeen) { patternSeen = true; continue; }
    if (looksLikePath(tok)) out.push(tok);
  }
  return out;
}

/**
 * The `<script>` operand of `npm run <script>` / `run-script <script>` — the
 * first non-flag token, correctly skipping `--workspace <path>` / `-w <path>`
 * when it appears BEFORE the script name. `npm run --workspace <path> <script>`
 * is a valid invocation and the corpus uses it throughout; without this, the
 * workspace's own VALUE token (which does not start with `-`) is mistaken for
 * the script name.
 */
function npmScriptOperand(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === '--workspace' || tok === '-w') { i += 1; continue; }
    if (tok.startsWith('--workspace=')) continue;
    if (tok.startsWith('-')) continue;
    return tok;
  }
  return undefined;
}

/**
 * Resolve a command's referent.
 * @returns {{ status: 'resolved'|'dead'|'unchecked', detail: string }}
 */
export function resolveCommand(cmd, ctx) {
  const { root, workspaces } = ctx;
  const t = cmd.tokens;

  // node <script>
  if (cmd.bin === 'node') {
    const rest = t.slice(1);
    if (rest.some(x => x === '-e' || x === '--eval' || x === '-p' || x === '--print')) {
      return { status: 'unchecked', detail: 'inline `node -e` program, nothing to resolve' };
    }
    const script = rest.find(x => !x.startsWith('-'));
    if (!script) return { status: 'unchecked', detail: 'no script operand' };
    if (!looksLikePath(script)) return { status: 'unchecked', detail: `operand is not a path: ${script}` };
    if (pathResolves(root, cmd.cwd, script)) return { status: 'resolved', detail: script };
    const rel = join(cmd.cwd || '.', script);
    if (isGitignoredArtifact(rel)) return { status: 'unchecked', detail: `gitignored artifact, not built here: ${rel}` };
    return { status: 'dead', detail: `script not found: ${rel}` };
  }

  // npm ... --workspace <w>  /  npm run <script>
  if (cmd.bin === 'npm' || cmd.bin === 'pnpm' || cmd.bin === 'yarn') {
    const wi = t.findIndex(x => x === '--workspace' || x === '-w' || x.startsWith('--workspace='));
    let ws = null;
    let wsRef = null;
    if (wi !== -1) {
      wsRef = t[wi].includes('=') ? t[wi].split('=')[1] : t[wi + 1];
      if (wsRef) {
        ws = workspaces.byName.get(wsRef) ?? workspaces.byPath.get(wsRef.replace(/^\.\//, ''));
        if (!ws) return { status: 'dead', detail: `npm workspace does not exist: ${wsRef}` };
      }
    }
    const sub = t[1];
    let scriptName = null;
    if (sub === 'run' || sub === 'run-script') scriptName = npmScriptOperand(t.slice(2));
    else if (sub === 'test') scriptName = 'test';
    else if (sub && !sub.startsWith('-') && !NPM_MUTATING.has(sub) && sub !== 'exec' && sub !== 'ls' && sub !== 'view') scriptName = sub;

    const pkg = ws ? ws.pkg : readJson(join(root, cmd.cwd || '.', 'package.json'));
    if (scriptName && pkg?.scripts && !Object.prototype.hasOwnProperty.call(pkg.scripts, scriptName)) {
      const where = ws ? ws.dir : (cmd.cwd || '<root>');
      return { status: 'dead', detail: `npm script "${scriptName}" is not declared in ${where}/package.json` };
    }
    return {
      status: scriptName || ws ? 'resolved' : 'unchecked',
      detail: ws ? `workspace ${ws.dir}${scriptName ? ` script ${scriptName}` : ''}` : `script ${scriptName ?? '?'}`,
    };
  }

  // A relative binary: `.harness/bin/opa test rulesets/opa/`
  if (cmd.binRaw.includes('/')) {
    const b = cmd.binRaw.replace(/^\.\//, '');
    if (pathResolves(root, cmd.cwd, b)) return { status: 'resolved', detail: b };
    if (isGitignoredArtifact(b)) return { status: 'unchecked', detail: `gitignored artifact, not built here: ${b}` };
    return { status: 'dead', detail: `binary not found: ${b}` };
  }

  // grep / rg / ls / cat / find / wc — the last path-shaped operand is the target.
  if (['grep', 'rg', 'ls', 'cat', 'find', 'wc', 'head', 'tail', 'jq'].includes(cmd.bin)) {
    const operands = pathOperands(cmd);
    if (operands.length === 0) return { status: 'unchecked', detail: 'no path operand' };
    const missing = operands.filter(o => !pathResolves(root, cmd.cwd, o));
    if (missing.length > 0) return { status: 'dead', detail: `target not found: ${missing.join(', ')}` };
    return { status: 'resolved', detail: operands.join(', ') };
  }

  return { status: 'unchecked', detail: `no resolver for \`${cmd.bin}\`` };
}

// --- Executability ---------------------------------------------------------

/**
 * @returns {{ executable: true } | { executable: false, reason: string, bucket: string }}
 */
export function classifyExecutability(cmd, root = ROOT) {
  if (cmd.shellMeta) {
    return { executable: false, bucket: 'shell-composition', reason: 'redirection, subshell or `&&`/`;` chain — not evaluated' };
  }
  for (const filter of cmd.stages) {
    if (!PIPE_SAFE.has(filter)) {
      return { executable: false, bucket: 'shell-composition', reason: `pipeline stage \`${filter || '?'}\` is not an allow-listed read-only filter` };
    }
  }
  const heavyArg = cmd.tokens.find(x => HEAVY_ARGS.has(x));
  if (heavyArg) {
    return { executable: false, bucket: 'heavy-toolchain', reason: `\`${heavyArg}\` ${HEAVY_ARGS.get(heavyArg)}` };
  }
  if (cmd.cwd && !SAFE_BINARIES.has(cmd.bin)) {
    return { executable: false, bucket: 'needs-subdirectory', reason: `runs inside ${cmd.cwd}` };
  }
  if (EXTERNAL_BINARIES.has(cmd.bin)) {
    return { executable: false, bucket: 'network-or-credentials', reason: `\`${cmd.bin}\` needs a network, a daemon, a cluster or a credential` };
  }
  if (MUTATING_BINARIES.has(cmd.bin)) {
    return { executable: false, bucket: 'mutating', reason: `\`${cmd.bin}\` writes or deletes` };
  }
  if (HEAVY_BINARIES.has(cmd.bin)) {
    return { executable: false, bucket: 'heavy-toolchain', reason: `\`${cmd.bin}\` is a build/test toolchain (minutes, needs a built workspace)` };
  }
  if (cmd.bin === 'npm') {
    const sub = cmd.tokens[1];
    if (NPM_MUTATING.has(sub)) return { executable: false, bucket: 'mutating', reason: `\`npm ${sub}\` mutates or publishes` };
    return { executable: false, bucket: 'heavy-toolchain', reason: 'an npm script is a build/test suite, not a guard invocation' };
  }
  if (cmd.bin === 'git') {
    const sub = cmd.tokens[1];
    if (!SAFE_GIT_SUBS.has(sub)) return { executable: false, bucket: 'mutating', reason: `\`git ${sub}\` is not a read-only subcommand` };
    return { executable: false, bucket: 'history-dependent', reason: 'depends on the checkout depth and the branch under test' };
  }
  if (cmd.binRaw.includes('/') && !SAFE_BINARIES.has(cmd.bin)) {
    return { executable: false, bucket: 'external-binary', reason: `\`${cmd.binRaw}\` is a vendored binary, not a harness script` };
  }
  if (!SAFE_BINARIES.has(cmd.bin)) {
    return { executable: false, bucket: 'unknown-binary', reason: `\`${cmd.bin}\` is not on the read-only allowlist` };
  }
  if (cmd.tokens.some(x => MUTATING_ARGS.has(x))) {
    return { executable: false, bucket: 'mutating', reason: 'carries a write flag (--fix/--write/--apply/...)' };
  }
  if (cmd.bin === 'node') {
    const script = cmd.tokens.slice(1).find(x => !x.startsWith('-'));
    if (!script) return { executable: false, bucket: 'unknown-binary', reason: 'no script operand' };
    const deny = EXEC_DENYLIST.find(d => d.match.test(script));
    if (deny) return { executable: false, bucket: 'denylisted', reason: deny.reason };
    const writer = writeApiUsed(join(root, cmd.cwd || '.', script));
    if (writer) {
      return { executable: false, bucket: 'writes-to-tree', reason: `source calls ${writer} — executing it would edit the working tree` };
    }
  }
  return { executable: true };
}

/** First filesystem-write API found in a script's source, or null. */
function writeApiUsed(abs) {
  let src;
  try { src = readFileSync(abs, 'utf8'); } catch { return null; }
  for (const re of WRITE_APIS) {
    const m = re.exec(src);
    if (m) return `\`${m[0]}\``;
  }
  return null;
}

// --- Working-tree tripwire -------------------------------------------------

/**
 * `git status --porcelain` as a comparable string, or null outside a git
 * checkout. ~50ms, so it is affordable once per executed command.
 */
function worktreeFingerprint() {
  const res = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  if (res.error || res.status !== 0) return null;
  return res.stdout;
}

/**
 * Lines present in `after` but not in `before`, narrowed to files whose mtime
 * falls inside the command's execution window.
 *
 * The mtime filter is not decoration. On a developer machine — and in this
 * repository, where several agents edit one checkout at a time — `git status`
 * moves for reasons that have nothing to do with the command just spawned, and
 * an unfiltered diff attributes someone else's edit to it. It costs one stat
 * per changed path and removes the entire class of false accusation.
 */
function diffFingerprints(before, after, windowStart, windowEnd) {
  const b = new Set(before.split('\n'));
  const out = [];
  for (const line of after.split('\n')) {
    if (!line.trim() || b.has(line)) continue;
    const rel = line.slice(3).split(' -> ').pop().replace(/^"|"$/g, '');
    try {
      const mtime = statSync(join(ROOT, rel)).mtimeMs;
      if (mtime < windowStart - 200 || mtime > windowEnd + 200) continue;
    } catch {
      // Deleted, or unreadable: keep it — a disappearing file is a mutation.
    }
    out.push(line);
    if (out.length >= 10) break;
  }
  return out;
}

// --- Main ------------------------------------------------------------------

function main() {
  const evidenceAbs = join(ROOT, EVIDENCE_REL);
  if (!existsSync(evidenceAbs) || !statSync(evidenceAbs).isFile()) {
    console.error(
      `✗ ${GUARD}: evidence file not found: ${EVIDENCE_REL}\n` +
      `  Refusing to report "validation commands checked" over a file that is not there.`,
    );
    process.exit(1);
  }

  let doc;
  try {
    doc = JSON.parse(readFileSync(evidenceAbs, 'utf8'));
  } catch (error) {
    console.error(`✗ ${GUARD}: ${EVIDENCE_REL} is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  const closures = Array.isArray(doc?.closures) ? doc.closures : [];
  assertScanned(closures.length, { what: 'closure records', where: EVIDENCE_REL });

  const records = [];
  for (const c of closures) {
    for (const raw of (Array.isArray(c.validationCommands) ? c.validationCommands : [])) {
      records.push({ id: c.id, raw });
    }
  }
  assertScanned(records.length, {
    what: 'recorded command strings',
    where: `${EVIDENCE_REL}#closures[].validationCommands`,
  });

  const workspaces = buildWorkspaceIndex(ROOT);
  const ctx = { root: ROOT, workspaces };

  const narrative = [];
  const parsed = [];
  for (const rec of records) {
    const cmd = extractCommand(rec.raw);
    if (!cmd) { narrative.push(rec); continue; }
    parsed.push({ ...rec, cmd });
  }
  // Every recorded string classified as prose means the extractor has stopped
  // matching, not that the board stopped recording commands.
  assertScanned(parsed.length, {
    what: 'commands extracted from the recorded strings',
    where: [`${EVIDENCE_REL}#closures[].validationCommands`, 'extractCommand() in this file'],
  });

  const dead = [];
  const resolved = [];
  const unchecked = [];
  for (const p of parsed) {
    const r = resolveCommand(p.cmd, ctx);
    p.resolution = r;
    if (r.status === 'dead') dead.push(p);
    else if (r.status === 'resolved') resolved.push(p);
    else unchecked.push(p);
  }

  // Executability census over everything that at least resolves.
  const buckets = new Map();
  const runnable = [];
  for (const p of parsed) {
    if (p.resolution.status === 'dead') continue;
    const cls = classifyExecutability(p.cmd, ROOT);
    p.executability = cls;
    if (cls.executable && p.resolution.status === 'resolved') runnable.push(p);
    else if (cls.executable) {
      const key = 'unresolvable-referent';
      if (!buckets.has(key)) buckets.set(key, { count: 0, reasons: new Map() });
      const b = buckets.get(key);
      b.count++;
      b.reasons.set(p.resolution.detail, (b.reasons.get(p.resolution.detail) ?? 0) + 1);
    } else {
      if (!buckets.has(cls.bucket)) buckets.set(cls.bucket, { count: 0, reasons: new Map() });
      const b = buckets.get(cls.bucket);
      b.count++;
      b.reasons.set(cls.reason, (b.reasons.get(cls.reason) ?? 0) + 1);
    }
  }

  // Deduplicate: the same guard invocation is recorded by dozens of closures.
  const uniqueRunnable = new Map();
  for (const p of runnable) {
    const key = `${p.cmd.cwd}|${p.cmd.line}`;
    if (!uniqueRunnable.has(key)) uniqueRunnable.set(key, { cmd: p.cmd, ids: [] });
    uniqueRunnable.get(key).ids.push(p.id);
  }

  const executions = [];
  const mutators = [];
  let tripwireIsAuthoritative = false;
  if (EXECUTE) {
    let treeBefore = worktreeFingerprint();
    // Attribution is only trustworthy on a clean checkout. CI always is; a
    // developer machine — or this repository, where several agents edit one
    // working tree at once — is not, and an unrelated concurrent edit lands in
    // the same `git status` delta. Rather than pretend, the tripwire downgrades
    // itself to a warning when it starts dirty, and says so.
    tripwireIsAuthoritative = treeBefore !== null && treeBefore.trim() === '';
    for (const [, entry] of uniqueRunnable) {
      const { cmd } = entry;
      const started = Date.now();
      // A pipeline or a glob is only meaningful under a shell, and every stage
      // has already been checked against the read-only allowlist. Everything
      // else is spawned directly, so no shell can reinterpret it.
      const [file, args] = cmd.needsShell
        ? ['/bin/sh', ['-c', [...cmd.env, cmd.line].join(' ')]]
        : [cmd.binRaw, cmd.tokens.slice(1)];
      const res = spawnSync(file, args, {
        cwd: join(ROOT, cmd.cwd || '.'),
        encoding: 'utf8',
        timeout: TIMEOUT_MS,
        env: {
          ...process.env,
          ...Object.fromEntries(cmd.env.map(a => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)])),
          EVOLITH_EVIDENCE_RUNNER: '1',
          CI: '1',
          FORCE_COLOR: '0',
        },
        maxBuffer: 16 * 1024 * 1024,
      });
      // `grep`/`rg` exit 1 for "no match", which is frequently the recorded
      // EXPECTED outcome ("no CircuitBreakerService left in core-api"). Exit
      // code alone cannot distinguish a passing negative assertion from a
      // failing positive one, and the expectation lives in prose we do not
      // parse. Counting those as failures would manufacture red; counting them
      // as green would manufacture a pass. They get their own bucket.
      const searchNoMatch =
        (cmd.bin === 'grep' || cmd.bin === 'rg') && !cmd.needsShell && res.status === 1;

      executions.push({
        line: cmd.line,
        cwd: cmd.cwd,
        ids: entry.ids,
        inconclusive: searchNoMatch,
        status: res.error ? null : res.status,
        signal: res.signal ?? null,
        error: res.error ? String(res.error.message) : null,
        ms: Date.now() - started,
        tail: ((res.stderr || res.stdout || '').trim().split('\n').slice(-3).join(' | ')).slice(0, 400),
      });

      // Runtime tripwire. The static WRITE_APIS gate is a heuristic over source
      // text; this is the ground truth. A command that dirties the working tree
      // is a defect in THIS runner's safety classification, not a finding about
      // the evidence, so it fails the run in every mode — including --report.
      const treeAfter = worktreeFingerprint();
      if (treeAfter !== null && treeBefore !== null && treeAfter !== treeBefore) {
        const delta = diffFingerprints(treeBefore, treeAfter, started, Date.now());
        if (delta.length > 0) mutators.push({ line: cmd.line, delta });
        treeBefore = treeAfter;
      }
    }
    // --execute was requested and nothing ran: not a pass, a broken filter.
    assertScanned(executions.length, {
      what: 'unique commands executed',
      where: ['--execute execution set', 'classifyExecutability() in this file'],
    });
  }

  const passedRuns = executions.filter(e => e.status === 0);
  const inconclusiveRuns = executions.filter(e => e.status !== 0 && e.inconclusive);
  const failedRuns = executions.filter(e => e.status !== 0 && !e.inconclusive);

  // --- Environment sensitivity of the dead count ---------------------------
  //
  // The ratchet wired in CI is `--max-dead 305`, and this machine reports ~288.
  // That 17-reference gap is not drift: it is the number of recorded commands
  // that resolve HERE only because of state a clean checkout does not have —
  // build outputs, a vendored OPA binary, installed dependencies. The comment
  // in ci-cd.yml says so in prose, which means the only way to know the runner's
  // number has been to push and read the log, and a threshold measured somewhere
  // other than where it is enforced is how a gate becomes unsatisfiable.
  //
  // So the guard computes the gap itself. `deadOnCleanCheckout` is dead plus the
  // references that resolve only through generated/gitignored state: an upper
  // bound reproducible from any machine, and the number a ratchet should be set
  // from.
  const GENERATED_PREFIXES = [
    'dist/', 'build/', 'out/', 'coverage/', 'node_modules/', '.harness/bin/',
    '.harness/evidence/', 'tsconfig.tsbuildinfo',
  ];
  const isGenerated = (p) =>
    GENERATED_PREFIXES.some(pre => p === pre || p.startsWith(pre) || p.includes(`/${pre}`));
  const environmentSensitive = resolved.filter(p =>
    String(p.resolution.detail).split(', ').some(isGenerated),
  );
  const deadOnCleanCheckout = dead.length + environmentSensitive.length;

  // --- Report --------------------------------------------------------------

  const summary = {
    guard: GUARD,
    evidence: EVIDENCE_REL,
    closures: closures.length,
    recordedCommands: records.length,
    extracted: parsed.length,
    narrative: narrative.length,
    resolution: { resolved: resolved.length, dead: dead.length, unchecked: unchecked.length },
    ratchet: {
      dead: dead.length,
      environmentSensitive: environmentSensitive.length,
      deadOnCleanCheckout,
      note: 'deadOnCleanCheckout is the machine-independent upper bound: set --max-dead from it, not from `dead`, which counts build outputs this machine happens to have.',
    },
    executable: { candidates: runnable.length, unique: uniqueRunnable.size, executed: executions.length, passed: passedRuns.length, failed: failedRuns.length, inconclusive: inconclusiveRuns.length },
    nonExecutable: Object.fromEntries([...buckets].map(([k, v]) => [k, v.count])),
    mode: STRICT ? 'strict' : 'report',
  };

  if (AS_JSON) {
    console.log(JSON.stringify({ summary, dead: dead.map(d => ({ id: d.id, line: d.cmd.line, why: d.resolution.detail })), executions }, null, 2));
  } else {
    console.log(`${GUARD} — census of the board's validationCommands`);
    console.log(`  records ............ ${closures.length} closure(s), ${records.length} recorded command string(s)`);
    console.log(`  extracted .......... ${parsed.length} command(s); ${narrative.length} classified as prose (no command present)`);
    console.log(`  resolution ......... ${resolved.length} resolve, ${dead.length} DEAD (referent does not exist), ${unchecked.length} not statically checkable`);
    console.log(
      `  ratchet basis ...... ${dead.length} dead here + ${environmentSensitive.length} that resolve only via generated state ` +
      `(dist/, node_modules/, .harness/bin/) = ${deadOnCleanCheckout} on a clean checkout`,
    );
    console.log(`                       ^ set --max-dead from THIS number: it does not depend on what this machine happens to have built.`);
    console.log(`  executable ......... ${runnable.length} candidate(s) -> ${uniqueRunnable.size} unique after dedup`);
    if (EXECUTE) {
      console.log(`  executed ........... ${executions.length}: ${passedRuns.length} exit 0, ${failedRuns.length} non-zero, ${inconclusiveRuns.length} search-with-no-match (outcome not assertable from an exit code)`);
    } else {
      console.log(`  executed ........... 0 (pass --execute to run them)`);
    }
    console.log('  not executable here:');
    for (const [bucket, v] of [...buckets].sort((a, b) => b[1].count - a[1].count)) {
      console.log(`    ${String(v.count).padStart(4)}  ${bucket}`);
      if (VERBOSE) {
        for (const [reason, n] of [...v.reasons].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
          console.log(`            ${String(n).padStart(4)}  ${reason}`);
        }
      }
    }

    if (dead.length > 0) {
      const byReason = new Map();
      for (const d of dead) byReason.set(d.resolution.detail, (byReason.get(d.resolution.detail) ?? 0) + 1);
      console.log('');
      console.log(`  ${dead.length} DEAD reference(s) — a closure recorded against a command whose target does not exist:`);
      const top = [...byReason].sort((a, b) => b[1] - a[1]);
      for (const [reason, n] of (LIST_DEAD || VERBOSE ? top : top.slice(0, 12))) {
        console.log(`    ${String(n).padStart(4)}  ${reason}`);
      }
      if (!LIST_DEAD && !VERBOSE && top.length > 12) {
        console.log(`    ...  ${top.length - 12} more distinct reason(s) — run with --list-dead`);
      }
      if (LIST_DEAD) {
        console.log('');
        for (const d of dead) console.log(`    • ${d.id}: ${d.cmd.line}`);
      }
    }

    if (failedRuns.length > 0) {
      console.log('');
      console.log(`  ${failedRuns.length} executed command(s) exited non-zero:`);
      for (const f of failedRuns) {
        console.log(`    • [${f.ids.slice(0, 3).join(', ')}${f.ids.length > 3 ? ', …' : ''}] ${f.line}`);
        console.log(`        exit ${f.status ?? 'n/a'}${f.signal ? ` (signal ${f.signal})` : ''}${f.error ? ` — ${f.error}` : ''} in ${f.ms}ms`);
        if (f.tail) console.log(`        ${f.tail}`);
      }
    }
  }

  // --- Verdict -------------------------------------------------------------

  if (mutators.length > 0) {
    const out = tripwireIsAuthoritative ? console.error : console.warn;
    out('');
    out(
      `${tripwireIsAuthoritative ? '✗' : '⚠'} ${GUARD}: ${mutators.length} executed command(s) ` +
      `changed the working tree during their run.\n` +
      `  This runner must be read-only. Add the offender to EXEC_DENYLIST or extend\n` +
      `  WRITE_APIS, then \`git checkout --\` the files below.`,
    );
    for (const m of mutators) {
      out(`    • ${m.line}`);
      for (const d of m.delta) out(`        ${d}`);
    }
    if (tripwireIsAuthoritative) {
      console.error(
        '  Failing in every mode, including --report: a CI job that silently edits the\n' +
        '  repository is worse than a missing check.',
      );
      process.exit(1);
    }
    console.warn(
      '  NOT failing: the checkout was already dirty when the run started, so this\n' +
      '  delta cannot be attributed to the command with confidence. On a clean\n' +
      '  checkout (i.e. in CI) the same finding is fatal.',
    );
  }

  if (!STRICT) {
    if (!AS_JSON) {
      console.log('');
      console.log(
        `⚠ REPORT MODE — ${dead.length} dead reference(s), ${failedRuns.length} failed run(s). ` +
        `Exiting 0 because this guard is wired in reporting mode. THIS IS NOT A PASS.`,
      );
      console.log(
        '  Flip to --strict when dead == 0 (a data migration of the evidence file, which is\n' +
        '  board-owned) and failed == 0 on a clean checkout. Use --max-dead <n> to ratchet.',
      );
    }
    process.exit(0);
  }

  if (dead.length > MAX_DEAD) {
    console.error('');
    console.error(`✗ ${GUARD}: ${dead.length} dead reference(s) exceed the budget of ${MAX_DEAD}.`);
    process.exit(1);
  }
  if (failedRuns.length > 0) {
    console.error('');
    console.error(`✗ ${GUARD}: ${failedRuns.length} recorded validation command(s) exited non-zero.`);
    process.exit(1);
  }

  console.log('');
  console.log(
    `✓ ${GUARD}: ${executions.length} executed / ${passedRuns.length} green, ` +
    `${dead.length} dead (budget ${MAX_DEAD}), over ${records.length} recorded command(s) in ${closures.length} closure(s).`,
  );
  process.exit(0);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    if (error instanceof ZeroCoverageError) {
      // Deliberately not routed through the --report exit-0 path: a scan that
      // covered nothing is a defect in this guard, not a finding about the board.
      console.error(`\n✗ ${GUARD}: ${error.message}`);
      process.exit(1);
    }
    console.error(`\n✗ ${GUARD} crashed: ${error?.stack || error}`);
    process.exit(1);
  }
}
