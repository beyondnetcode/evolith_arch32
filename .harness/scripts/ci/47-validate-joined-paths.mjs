#!/usr/bin/env node

/**
 * GT-632 criterion 3 — a path that is BUILT, not written, must still exist.
 *
 * ## The blind spot this closes
 *
 * `40-validate-path-literals` scans string LITERALS. Twelve paths survived the
 * `src/` refactor as `path.join(ctx.corePath, 'sdk', 'cli', …)` constructions,
 * and it could not see one of them. The cost was not theoretical:
 *
 *   - the compiled ABAC policy was resolved at the pre-refactor path, and since
 *     the evaluator denies fail-closed when it cannot load, EVERY MCP tool was
 *     refused in production on a clean checkout;
 *   - three evaluator rules probed files that had moved, reporting false
 *     NEGATIVES — which nothing notices, because a false negative looks exactly
 *     like a clean run.
 *
 * Both survived because the specs and fixtures encoded the same wrong layout:
 * the code and its tests agreed with each other, and neither agreed with the
 * repository.
 *
 * ## What this checks
 *
 * Every `path.join(<base>, 'a', 'b', …)` whose segments after the base are ALL
 * string literals, where the base names the repository root. The reconstructed
 * path must exist. A join with a variable segment is not resolvable and is
 * counted, not guessed at — reporting a path this guard cannot compute would
 * teach people to ignore it.
 *
 * `satellitePath` and its kin are deliberately OUT of scope: they address another
 * repository, so a file being absent here says nothing.
 *
 * ## Anti-vacuous pass
 *
 * Zero files scanned, or zero joins found across them, is a hard failure. Both
 * denominators are printed on the passing run too.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GUARD = '47-validate-joined-paths';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const argv = process.argv.slice(2);
const rootIdx = argv.indexOf('--root');
const root = rootIdx !== -1 ? path.resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;
const VERBOSE = argv.includes('--verbose');

/**
 * Bases that mean "this repository's root" — and ONLY those.
 *
 * `corePath` is the Core checkout: when the engine evaluates itself, it is this
 * repository, so a path built on it must resolve here.
 *
 * A bare `root` was in this list on the first draft and had to come out. In the
 * evaluators it is a PARAMETER naming the workspace under evaluation — a
 * customer's repository — so `path.join(root, 'agent.config.json')` is asking
 * whether THEIR repo has that file. Six of those were reported as breakage on the
 * first run. "Fixing" them would have broken working features to satisfy a guard,
 * which is a worse outcome than the blind spot this guard was written to close.
 *
 * The rule for adding a name here: it must denote THIS repository at every call
 * site, not merely be spelled like a root.
 */
const ROOT_BASES = new Set(['corePath', 'ctx.corePath', 'repoRoot', 'REPO_ROOT']);

const SCAN_DIRS = ['src/packages', 'src/apps', 'src/sdk'];

/**
 * Paths whose ABSENCE is the point — the existence check is a prohibition, so a
 * missing target is the passing state and "fixing" it would invert the rule.
 *
 * No syntax reveals this: `fs.exists(p)` looks identical whether the author meant
 * "it must be there" or "it must not". The first draft of this guard reported
 * `evalNoRootTopologies` as breakage, and correcting that path would have made the
 * engine assert the opposite of the rule it enforces. That is why this list is
 * semantic and hand-written, while candidate lists below are detected
 * structurally: a mechanical pattern deserves a mechanical rule, and an intent
 * that only a human can read deserves a written reason.
 */
const PROHIBITIONS = [
  {
    file: 'src/packages/core-domain/src/application/validators/evaluators/handlers/cross-cutting-rule.handler.ts',
    segments: 'topologies',
    reason:
      'evalNoRootTopologies FAILS when this directory exists — a root-level /topologies/ ' +
      'is prohibited by the layout rules. Its absence here is the rule being satisfied.',
  },
];

/**
 * Segments that name something BUILT rather than committed.
 *
 * Caught on the runner, not locally, and the distinction matters: these exist on
 * a developer machine and in no fresh checkout. Requiring them would have made
 * this guard demand that build output and gitignored artifacts be committed —
 * turning a correctness check into pressure to do the wrong thing. `policy.wasm`
 * is the sharpest case: it is gitignored, and a stale copy of it at the OLD path
 * is what made the original P0 look green locally.
 *
 * A path ending in one of these still has to be ANCHORED: the parent of the first
 * missing segment must exist. That keeps every real defect red — `sdk/cli/…` and
 * `rulesets/opa/policy.wasm` fail on `sdk` and `rulesets`, which are not generated
 * and do not exist — while letting `src/sdk/cli/dist/main.js` pass on a clean
 * checkout, where `src/sdk/cli` is present and `dist` has simply not been built.
 */
const GENERATED = new Set(['dist', 'evidence', 'coverage', 'node_modules', 'policy.wasm']);

/**
 * Whole subtrees that are produced, not authored — declared with the producer, so
 * the claim can be checked instead of taken on faith.
 *
 * A bare segment is not enough here: `opa` names a real, tracked directory under
 * `src/rulesets`, so admitting the segment globally would blind the guard to a
 * genuine `rulesets/opa` typo — the exact defect corrected in this same change.
 */
const GENERATED_PREFIXES = [
  {
    prefix: 'src/sdk/cli/rulesets',
    producedBy: '.harness/scripts/compile-opa-wasm.mjs + src/sdk/cli/scripts/copy-assets.js',
    reason:
      'The compile step mkdirSyncs `rulesets/opa` and copies policy.wasm into it. The WHOLE ' +
      'subtree is produced, not just that leaf: `src/sdk/cli/.gitignore` ignores `rulesets/*`, ' +
      'so on a clean checkout the directory itself does not exist — which is why this only ' +
      'ever failed on the runner. GT-643 — the prefix used to be `src/sdk/cli/rulesets/opa`, ' +
      'anchored on `src/sdk/cli/rulesets`, and that anchor held ONLY because three files a ' +
      'test had written were committed under `rulesets/agents/`. Deleting that residue removed ' +
      'the directory from the checkout and this guard went red, naming policy.wasm for a cause ' +
      'that was somewhere else entirely. An anchor that depends on committed test output is ' +
      'not an anchor; it now rests on `src/sdk/cli`, which is authored.',
  },
];

/**
 * Does this joined path resolve, allowing for artifacts that are built?
 *
 * Returns `true` when the path exists outright, or when the ONLY thing missing is
 * generated output hanging off a directory that really is there.
 */
export function resolvesOrIsUnbuilt(rootDir, joined) {
  const full = path.join(rootDir, joined);
  if (fs.existsSync(full)) return true;

  // A declared generated subtree still has to be ANCHORED: its own parent must be
  // a directory that really is committed, so a typo inside the prefix stays red.
  for (const g of GENERATED_PREFIXES) {
    if (joined === g.prefix || joined.startsWith(`${g.prefix}/`)) {
      return fs.existsSync(path.join(rootDir, path.dirname(g.prefix)));
    }
  }

  const parts = joined.split('/');
  let cursor = rootDir;
  for (let i = 0; i < parts.length; i += 1) {
    const next = path.join(cursor, parts[i]);
    if (fs.existsSync(next)) { cursor = next; continue; }
    // First missing segment. It is acceptable only if it names generated output
    // AND everything above it exists — which `cursor` already proves.
    return GENERATED.has(parts[i]);
  }
  return false;
}

function fail(lines) {
  console.error(`\n✗ ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const q = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'coverage', '.git'].includes(e.name)) continue;
      walk(q, out);
    } else if (e.name.endsWith('.ts') && !e.name.includes('.spec.')) {
      out.push(q);
    }
  }
  return out;
}

/**
 * `path.join(base, 'a', 'b')` → { base, segments } when every segment is a literal.
 *
 * Joins are also assigned a GROUP. Two joins belong to the same group when only
 * commas and whitespace separate them in the source — i.e. they are elements of
 * one array literal:
 *
 *     const candidates = [
 *       path.join(corePath, 'src', 'rulesets', 'topologies'),
 *       path.join(corePath, 'rulesets', 'topologies'),      // legacy layout
 *     ];
 *
 * That is a FALLBACK CHAIN, and the code is correct as long as ONE member
 * resolves. Requiring all of them would demand that every historical layout be
 * present simultaneously, which is impossible — and the natural way to silence
 * that is to delete the fallbacks, breaking already-deployed images. Detecting the
 * shape is what keeps this guard from arguing for a worse codebase.
 */
export function extractJoins(source) {
  const found = [];
  const re = /path\.join\(\s*([A-Za-z_$][\w.$]*)\s*,\s*([^)]*)\)/g;
  let group = 0;
  let prevEnd = -1;
  for (const m of source.matchAll(re)) {
    const [, base, rest] = m;
    // Only separators between two joins ⇒ one array literal or one ternary.
    // `a ? join(x) : join(y)` is a fallback chain written as an expression, and
    // treating it as two independent assertions would demand both layouts exist.
    //
    // Known weakness, stated rather than hidden: `f(path.join(a), path.join(b))`
    // — two joins as sibling ARGUMENTS — is indistinguishable from a chain by this
    // rule, and would be scored leniently (one resolving is enough). That is the
    // conservative direction for a guard whose false positives push people to
    // "fix" working code, and no such call site exists in this repository today.
    const between = prevEnd >= 0 ? source.slice(prevEnd, m.index) : null;
    if (between === null || !/^[\s,?:]*$/.test(between)) group += 1;
    prevEnd = m.index + m[0].length;

    const literals = [...rest.matchAll(/'([^']*)'/g)].map((x) => x[1]);
    // Every argument must be a literal: a variable segment makes the path
    // unresolvable, and a guess would be worse than an abstention.
    const args = rest.split(',').map((a) => a.trim()).filter(Boolean);
    const resolvable = args.length === literals.length && literals.length > 0;
    found.push({ base, segments: literals, resolvable, group, text: m[0] });
  }
  return found;
}

function main() {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)));
  if (files.length === 0) {
    fail([`scanned ${SCAN_DIRS.join(', ')} under ${root} and found ZERO TypeScript files.`]);
  }

  let joins = 0;
  let rootJoins = 0;
  let unresolvable = 0;
  let prohibitions = 0;
  let fallbackGroups = 0;
  const missing = [];

  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const source = fs.readFileSync(file, 'utf8');

    // Collect the resolvable, repo-rooted joins, keeping their group.
    const groups = new Map();
    for (const j of extractJoins(source)) {
      joins += 1;
      if (!ROOT_BASES.has(j.base)) continue;
      rootJoins += 1;
      if (!j.resolvable) { unresolvable += 1; continue; }
      const joined = j.segments.join('/');
      if (PROHIBITIONS.some((p) => p.file === rel && p.segments === joined)) {
        prohibitions += 1;
        continue;
      }
      if (!groups.has(j.group)) groups.set(j.group, []);
      groups.get(j.group).push({ joined, base: j.base });
    }

    // A group of two or more is a fallback chain: ONE member resolving is the
    // contract. A group of one is a bare assertion and must resolve outright.
    for (const members of groups.values()) {
      const satisfied = members.filter((m) => resolvesOrIsUnbuilt(root, m.joined));
      if (members.length > 1) fallbackGroups += 1;
      if (satisfied.length > 0) continue;
      missing.push({
        rel,
        base: members[0].base,
        candidates: members.map((m) => m.joined),
        isChain: members.length > 1,
      });
    }
  }

  if (joins === 0) {
    fail([`scanned ${files.length} file(s) and found ZERO path.join calls — the shape moved and nothing was checked.`]);
  }

  console.log(`${GUARD} — paths that are built, not written`);
  console.log(`  files scanned .......... ${files.length}`);
  console.log(`  path.join calls ........ ${joins}`);
  console.log(`  rooted at the repo ..... ${rootJoins}`);
  console.log(`  of those, resolvable ... ${rootJoins - unresolvable} (${unresolvable} carry a variable segment)`);
  console.log(`  fallback chains ........ ${fallbackGroups} (one member resolving is the contract)`);
  console.log(`  prohibitions ........... ${prohibitions} (absence IS the passing state)`);
  if (VERBOSE) for (const p of PROHIBITIONS) console.log(`    · ${p.file} → ${p.segments}: ${p.reason}`);

  if (missing.length > 0) {
    fail([
      `${missing.length} built path(s) resolve to nothing that exists:`,
      ...missing.flatMap((m) =>
        m.isChain
          ? [`  • ${m.rel}\n      NO member of this fallback chain exists:\n${m.candidates.map((c) => `        - ${c}`).join('\n')}`]
          : [`  • ${m.rel}\n      path.join(${m.base}, …) → ${m.candidates[0]}`],
      ),
      '',
      '  A built path is invisible to 40-validate-path-literals, which scans literals.',
      '  That is how twelve of these survived the src/ move — one denying every MCP',
      '  tool in production, three reporting false negatives nobody could see.',
      '',
      '  Before "correcting" one: check whether the absence is the POINT (a prohibition)',
      '  or whether a sibling candidate already covers it. Both belong in this file as a',
      '  declared reason, not as a silently edited path.',
    ]);
  }

  console.log(`\n✓ ${GUARD}: every repo-rooted joined path resolves to something that exists.`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
