#!/usr/bin/env node

/**
 * GT-638 — a gap id must not mean two different things on two branches.
 *
 * ## The defect
 *
 * A gap id is chosen by reading the highest `GT-*` on whichever branch you happen
 * to be on, and nothing contrasts that with any other branch. Two sessions working
 * in parallel therefore allocate the same number, and one of them finds out at
 * merge time. It happened on 2026-07-30: `8449af3d` carries the message
 * "renumber the ratchet fix GT-634 -> GT-637, ID collision with develop".
 *
 * The renumber is manual and LOSSY, which costs more than the clash: an id lives
 * in the board row, the catalog anchor, the closure-evidence record,
 * cross-references from other rows in both languages, commit messages and PR
 * bodies — and only the first three are mechanically checkable.
 *
 * `08-validate-tracking` cannot help, and not for want of trying: it validates
 * EN/ES parity, closure records and counters WITHIN ONE WORKING TREE, and branches
 * are outside its world by construction. This guard is the part that needs two.
 *
 * ## What it checks
 *
 * For every `GT-*` id declared in the catalog on HEAD, compare its **Title:**
 * against the title the same id carries on the BASE branch:
 *
 *   - id absent from base            -> newly allocated, fine
 *   - id present, same title         -> the same gap, edited; fine
 *   - id present, DIFFERENT title    -> COLLISION: one number, two gaps
 *
 * The title is the discriminator on purpose. "The id already exists on base" is
 * the normal case for 600-odd rows and says nothing; what makes it a defect is the
 * id naming a different gap on each side. Evidence, status and criteria are all
 * expected to change on a branch — a title change on an id that exists on both
 * sides is either a collision or a deliberate retitle, and both deserve a human
 * looking at them.
 *
 * ## GT-656 — declaring a retitle, because forbidding one was worse
 *
 * The first version had no way to say "this is a retitle, not a collision", so a
 * required check turned red on any title change and the practical effect was that
 * titles became IMMUTABLE. That is a real cost, not a theoretical one: `GT-622`
 * was re-measured twice (82 -> 201 -> 210 analyses, and the branch it affects
 * turned out to be `develop`, not `main`) while its headline went on saying
 * "Eighty-two ... every PR", because correcting it would have blocked the PR. A
 * board whose whole purpose is not lying accumulated rows whose first line lies.
 *
 * The fix is NOT to soften the check. It is to make the human judgement the guard
 * was deferring to into DATA, so the guard can read it:
 *
 *   reference/core/control-center/gaps/gap-retitles.json
 *   { "retitles": [ { id, from, to, declaredAt, reason } ] }
 *
 * A collision is exempt only if a declaration names the id and reproduces BOTH
 * titles exactly. That exactness is the whole design: it cannot be written as a
 * blanket "GT-622 may be retitled", so a genuine collision that later lands on the
 * same id still fails, because its titles are not the two that were declared.
 *
 * Declarations are themselves checked, because an exemption registry that rots
 * silently is a worse defect than the one it fixes:
 *
 *   - active — reproduces a live collision            -> exempts it
 *   - spent  — the retitle has reached the base branch -> reported, not fatal
 *   - rot    — describes NEITHER side                  -> FAILS
 *
 * and a registry that exists but cannot be parsed is a hard failure, never an
 * empty list. "Stopped seeing anything and started reporting a pass" is the
 * failure mode this corpus keeps finding; it must not be introduced here.
 *
 * ## Anti-vacuous pass
 *
 * Zero ids parsed on either side is a hard failure: a moved file or a reshaped
 * heading must not read as "no collisions". So is a base branch that cannot be
 * resolved — unable to answer is not the same as nothing to report, and a guard
 * that quietly skips is how the id collision reached `main` in the first place.
 *
 * USAGE
 *   node .harness/scripts/ci/49-validate-gap-id-allocation.mjs
 *   node .harness/scripts/ci/49-validate-gap-id-allocation.mjs --base origin/develop
 *   node .harness/scripts/ci/49-validate-gap-id-allocation.mjs --root <dir> --verbose
 *
 * EXIT CODES
 *   0  every id on HEAD names the same gap it names on the base branch
 *   1  a collision, an unresolvable base, or a vacuous scan
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GUARD = '49-validate-gap-id-allocation';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

/** The catalog is where a row's title lives; the board carries prose, not a title. */
export const CATALOG = 'reference/core/control-center/gaps/gap-reference-catalog.md';

/**
 * GT-656: where a deliberate retitle is declared, read from HEAD because the
 * declaration lands with the change it describes. Absent file = no exemptions,
 * which is the strict reading; an UNPARSEABLE file is a failure, not an empty one.
 */
export const RETITLES = 'reference/core/control-center/gaps/gap-retitles.json';

/**
 * The base to compare against, in the order CI and a laptop actually mean it.
 *
 * On a pull request the base is `GITHUB_BASE_REF`; locally the honest default is
 * the default branch. Both are resolved through the remote, because a local
 * `main` can be arbitrarily stale and comparing against a stale base is how a
 * collision passes.
 */
export function defaultBase(env = process.env) {
  if (env.GITHUB_BASE_REF) return `origin/${env.GITHUB_BASE_REF}`;
  return 'origin/main';
}

// ---------------------------------------------------------------------------
// Pure core
// ---------------------------------------------------------------------------

/**
 * `GT-NNN -> title`, from a catalog document.
 *
 * @param {string} markdown
 * @returns {Map<string, string>}
 */
export function parseCatalogTitles(markdown) {
  const titles = new Map();
  const sections = String(markdown).split(/^#### (GT-\d+)\s*$/m);
  // split yields [preamble, id, body, id, body, ...]
  for (let i = 1; i < sections.length; i += 2) {
    const id = sections[i];
    const body = sections[i + 1] ?? '';
    const m = /^\*\*Title:\*\*\s*(.+?)\s*$/m.exec(body);
    if (m) titles.set(id, m[1]);
  }
  return titles;
}

/**
 * Ids that name a DIFFERENT gap on each side.
 *
 * @param {Map<string,string>} base
 * @param {Map<string,string>} head
 * @returns {Array<{id: string, baseTitle: string, headTitle: string}>}
 */
export function findIdCollisions(base, head) {
  const collisions = [];
  for (const [id, headTitle] of head) {
    const baseTitle = base.get(id);
    if (baseTitle === undefined) continue; // newly allocated
    if (baseTitle !== headTitle) collisions.push({ id, baseTitle, headTitle });
  }
  return collisions.sort((a, b) => a.id.localeCompare(b.id));
}

/** Ids this branch allocates that the base has never seen. */
export function newlyAllocated(base, head) {
  return [...head.keys()].filter((id) => !base.has(id)).sort();
}

/**
 * GT-656: validate the shape of a retitle declaration.
 *
 * Every field is load-bearing. `from`/`to` are what make the exemption specific
 * to two exact titles rather than to an id; `reason` is the human judgement the
 * guard is deferring to, and a declaration without one is an unexplained
 * exemption, which is what this registry must never become.
 *
 * @param {unknown} entry
 * @param {number} index
 * @returns {string[]} problems, empty when the entry is well-formed
 */
export function validateRetitle(entry, index) {
  const at = `retitles[${index}]`;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [`${at} is not an object`];
  const problems = [];
  if (!/^GT-\d+$/.test(entry.id ?? '')) problems.push(`${at}.id is not a GT id: ${JSON.stringify(entry.id)}`);
  for (const field of ['from', 'to', 'reason']) {
    if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
      problems.push(`${at}.${field} must be a non-empty string`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.declaredAt ?? '')) {
    problems.push(`${at}.declaredAt must be YYYY-MM-DD`);
  }
  if (typeof entry.from === 'string' && entry.from === entry.to) {
    problems.push(`${at} declares a retitle from a title to itself, which exempts nothing`);
  }
  return problems;
}

/**
 * GT-656: classify declarations against what the two branches actually say, and
 * report which collisions they exempt.
 *
 * A declaration is `active` only when it reproduces BOTH sides of a live
 * collision exactly. `spent` means the retitle already reached the base branch,
 * so there is nothing left to exempt — reported so the pile is visible, but not
 * fatal, because failing there would block every unrelated pull request. `rot`
 * describes neither side and is fatal: an exemption that no longer matches
 * reality is how a registry starts laundering things it was never shown.
 *
 * @param {Array<{id:string,from:string,to:string}>} declarations
 * @param {Map<string,string>} baseTitles
 * @param {Map<string,string>} headTitles
 * @param {Array<{id:string,baseTitle:string,headTitle:string}>} collisions
 */
export function classifyRetitles(declarations, baseTitles, headTitles, collisions) {
  const byKey = new Map(collisions.map((c) => [`${c.id} ${c.baseTitle} ${c.headTitle}`, c]));
  const active = [];
  const spent = [];
  const rot = [];

  for (const d of declarations) {
    const collision = byKey.get(`${d.id} ${d.from} ${d.to}`);
    if (collision) {
      active.push(d);
      continue;
    }
    // Already merged into the base: both sides now carry the new title.
    if (baseTitles.get(d.id) === d.to && headTitles.get(d.id) === d.to) {
      spent.push(d);
      continue;
    }
    rot.push({
      ...d,
      baseTitle: baseTitles.get(d.id) ?? '(id absent from base)',
      headTitle: headTitles.get(d.id) ?? '(id absent from HEAD)',
    });
  }

  const exempted = new Set(active.map((d) => `${d.id} ${d.from} ${d.to}`));
  const unexplained = collisions.filter((c) => !exempted.has(`${c.id} ${c.baseTitle} ${c.headTitle}`));
  return { active, spent, rot, unexplained };
}

// ---------------------------------------------------------------------------
// I/O edges
// ---------------------------------------------------------------------------

function fail(lines) {
  console.error(`\n✗ ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

/**
 * GT-656: read the declared retitles from HEAD.
 *
 * Absent is legitimate and means "no exemptions". Present-but-unreadable is NOT:
 * a registry that fails to parse must stop the run, because the alternative is a
 * guard that silently starts exempting nothing while reporting a pass — or, once
 * someone corrects the parse error, silently exempting everything it names.
 */
function readRetitles(root) {
  const file = path.join(root, RETITLES);
  if (!fs.existsSync(file)) return [];

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail([
      `${RETITLES} exists but is not valid JSON: ${error.message}`,
      'An exemption registry that cannot be read must stop the run. Treating it as',
      'empty would report a pass over a file nobody could check.',
    ]);
  }

  if (!Array.isArray(parsed?.retitles)) {
    fail([
      `${RETITLES} has no \`retitles\` array.`,
      'Expected: { "retitles": [ { id, from, to, declaredAt, reason } ] }',
    ]);
  }

  const problems = parsed.retitles.flatMap((entry, i) => validateRetitle(entry, i));
  if (problems.length) {
    fail([
      `${problems.length} malformed retitle declaration(s) in ${RETITLES}:`,
      ...problems.map((p) => `  • ${p}`),
      '',
      '  Every field is load-bearing: `from`/`to` scope the exemption to two exact',
      '  titles instead of to an id, and `reason` is the judgement being deferred to.',
    ]);
  }
  return parsed.retitles;
}

function readAtRef(root, ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function main(argv) {
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx !== -1 ? path.resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;
  const baseIdx = argv.indexOf('--base');
  const base = baseIdx !== -1 ? argv[baseIdx + 1] : defaultBase();
  const verbose = argv.includes('--verbose');

  const headPath = path.join(root, CATALOG);
  if (!fs.existsSync(headPath)) {
    fail([
      `the catalog is not where this guard looks: ${CATALOG}`,
      'A moved file must not read as "no collisions".',
    ]);
  }
  const headDoc = fs.readFileSync(headPath, 'utf8');

  const baseDoc = readAtRef(root, base, CATALOG);
  if (baseDoc === null) {
    fail([
      `cannot read the catalog at the base ref \`${base}\`, so no comparison was made.`,
      '  In CI the base comes from GITHUB_BASE_REF; locally it defaults to origin/main.',
      '  Fetch it first: git fetch origin',
      '',
      '  Unable to answer is not the same as nothing to report. A guard that skipped',
      '  quietly here is how an id collision reached main in the first place.',
    ]);
  }

  const headTitles = parseCatalogTitles(headDoc);
  const baseTitles = parseCatalogTitles(baseDoc);

  if (headTitles.size === 0 || baseTitles.size === 0) {
    fail([
      `parsed ${headTitles.size} id(s) on HEAD and ${baseTitles.size} on ${base} — at least one side yielded NOTHING.`,
      'The `#### GT-NNN` / `**Title:**` shape moved. Fix this parser rather than deleting the check.',
    ]);
  }

  const collisions = findIdCollisions(baseTitles, headTitles);
  const fresh = newlyAllocated(baseTitles, headTitles);
  const declarations = readRetitles(root);
  const { active, spent, rot, unexplained } = classifyRetitles(
    declarations, baseTitles, headTitles, collisions,
  );

  console.log(`${GUARD} — one gap id, one gap`);
  console.log(`  base ................ ${base}`);
  console.log(`  ids on base ......... ${baseTitles.size}`);
  console.log(`  ids on HEAD ......... ${headTitles.size}`);
  console.log(`  newly allocated ..... ${fresh.length}${fresh.length ? ` (${fresh.join(', ')})` : ''}`);
  console.log(`  collisions .......... ${collisions.length}`);
  console.log(`  declared retitles ... ${active.length} active, ${spent.length} spent, ${rot.length} rot`);

  if (verbose && fresh.length) {
    for (const id of fresh) console.log(`  · ${id} is new here — check it against every OTHER open branch, not just this base`);
  }
  // Never silent: an exemption that nobody sees is indistinguishable from a hole.
  for (const d of active) console.log(`  · ${d.id} retitled by declaration (${d.declaredAt}): ${d.reason}`);
  if (verbose) {
    for (const d of spent) console.log(`  · ${d.id} declaration is SPENT — the retitle reached ${base}; drop it from ${RETITLES}`);
  }

  if (rot.length > 0) {
    fail([
      `${rot.length} retitle declaration(s) describe neither side of the catalog:`,
      ...rot.flatMap((d) => [
        `  • ${d.id} declared ${JSON.stringify(d.from)} -> ${JSON.stringify(d.to)}`,
        `      on ${base}: ${d.baseTitle}`,
        `      on HEAD:    ${d.headTitle}`,
      ]),
      '',
      '  A declaration must reproduce BOTH titles exactly, or it exempts something',
      '  nobody described. Fix the two strings, or delete the entry if the retitle',
      '  it covered is long merged.',
      '',
      `  Registry: ${RETITLES}`,
    ]);
  }

  if (unexplained.length > 0) {
    fail([
      `${unexplained.length} gap id(s) name a DIFFERENT gap on each side:`,
      ...unexplained.flatMap((c) => [
        `  • ${c.id}`,
        `      on ${base}: ${c.baseTitle}`,
        `      on HEAD:    ${c.headTitle}`,
      ]),
      '',
      '  Two sessions allocated the same number, or a row was retitled. If it is a',
      '  collision, renumber the NEWER row and update every place the id appears:',
      '  the board row, the catalog anchor, the closure-evidence record and the',
      '  cross-references in BOTH languages. If it is a deliberate retitle, declare',
      '  it — this guard cannot tell the two apart, and should not guess:',
      '',
      `    ${RETITLES}`,
      '    { "retitles": [ { "id": "GT-NNN", "from": "<exact title on base>",',
      '                      "to": "<exact title on HEAD>", "declaredAt": "YYYY-MM-DD",',
      '                      "reason": "why the old title was wrong" } ] }',
      '',
      '  Both titles must match exactly, so the exemption covers this retitle and',
      '  not the id — a real collision landing on the same number still fails.',
      '',
      '  Allocate a new id from the UNION of ids across branches, never the maximum',
      '  on one:',
      '    { git show origin/main:<board>; git show origin/develop:<board>; } \\',
      '      | grep -oE "GT-[0-9]{3}" | sort -u | tail -1',
    ]);
  }

  const exempted = active.length ? `, ${active.length} retitle(s) declared and matched exactly` : '';
  console.log(`\n✓ ${GUARD}: every one of ${headTitles.size} id(s) names the same gap it names on ${base}${exempted}.`);
  return 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
