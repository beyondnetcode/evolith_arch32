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

// ---------------------------------------------------------------------------
// I/O edges
// ---------------------------------------------------------------------------

function fail(lines) {
  console.error(`\n✗ ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
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

  console.log(`${GUARD} — one gap id, one gap`);
  console.log(`  base ................ ${base}`);
  console.log(`  ids on base ......... ${baseTitles.size}`);
  console.log(`  ids on HEAD ......... ${headTitles.size}`);
  console.log(`  newly allocated ..... ${fresh.length}${fresh.length ? ` (${fresh.join(', ')})` : ''}`);
  console.log(`  collisions .......... ${collisions.length}`);

  if (verbose && fresh.length) {
    for (const id of fresh) console.log(`  · ${id} is new here — check it against every OTHER open branch, not just this base`);
  }

  if (collisions.length > 0) {
    fail([
      `${collisions.length} gap id(s) name a DIFFERENT gap on each side:`,
      ...collisions.flatMap((c) => [
        `  • ${c.id}`,
        `      on ${base}: ${c.baseTitle}`,
        `      on HEAD:    ${c.headTitle}`,
      ]),
      '',
      '  Two sessions allocated the same number, or a row was retitled. If it is a',
      '  collision, renumber the NEWER row and update every place the id appears:',
      '  the board row, the catalog anchor, the closure-evidence record and the',
      '  cross-references in BOTH languages. If it is a deliberate retitle, say so',
      '  in the commit — this guard cannot tell the two apart, and should not guess.',
      '',
      '  Allocate a new id from the UNION of ids across branches, never the maximum',
      '  on one:',
      '    { git show origin/main:<board>; git show origin/develop:<board>; } \\',
      '      | grep -oE "GT-[0-9]{3}" | sort -u | tail -1',
    ]);
  }

  console.log(`\n✓ ${GUARD}: every one of ${headTitles.size} id(s) names the same gap it names on ${base}.`);
  return 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
