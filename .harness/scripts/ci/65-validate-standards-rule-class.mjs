#!/usr/bin/env node

/**
 * GT-666 — a standards pack is never published as an Evolith governance invariant.
 *
 * ## The defect this closes
 *
 * `build-iso-5055-mapping.mjs` classified every corpus rule by PATH PREFIX
 * through a `CLASS_BY_FILE` table, and fell back to `governance` when no prefix
 * matched. The table had no `standards/` entry, so the 16 rules of the three
 * international-standard packs — NIST SP 800-218 (8), ISO/IEC 5055:2021 (4) and
 * SLSA v1.0 Build track (4) — matched nothing, were published as `governance`,
 * and carried the governance reason verbatim:
 *
 *     «A governance invariant over Evolith artifacts (inheritance, open-core
 *      boundary, satellites, evidence). No international structural equivalent.»
 *
 * Every clause of that sentence is false of an SSDF practice. And it was in
 * `iso-5055-mapping.json` — the table an auditor reads, the one document in this
 * repository whose entire purpose is to be checkable by somebody who does not
 * trust us. It was not a stale number; it was the artifact stating the opposite
 * of the truth about its own corpus, in the register of a considered reason.
 *
 * ## What this checks, and in both directions
 *
 * The classification is DERIVED from the pack's own top-level `standard` block
 * (GT-666), not from a list of file names. That closes the defect for a pack
 * that declares itself. It leaves one way to reintroduce it: a fourth pack
 * dropped into `src/rulesets/standards/` WITHOUT the declaration, which would
 * fall through to `governance` exactly as the first three did. So both
 * directions are held here:
 *
 *   1. every `*.rules.json` under `src/rulesets/standards/` that carries rules
 *      DECLARES a `standard` block — the directory cannot grow a silent pack;
 *   2. every rule of a declaring pack, wherever it lives, has a mapping row;
 *   3. that row's `ruleClass` is `international-standard` — never `governance`,
 *      and never a neighbouring class borrowed to make the symptom go away;
 *   4. that row's note NAMES the pack's own standard, so the note is true of
 *      the rule it is attached to rather than merely no longer false;
 *   5. no such note asserts the rule has no international equivalent, or that it
 *      is an Evolith governance invariant — the two sentences the defect
 *      published;
 *   6. the mapping's own `summary.byClass` agrees with the rows, so a summary
 *      edited by hand cannot report a corpus the rows do not contain.
 *
 * The generator ALSO refuses to build on (1). Both exist on purpose: the
 * generator's refusal protects whoever runs it, and this guard protects a tree
 * where the mapping was committed without being regenerated.
 *
 * ## What it does NOT check
 *
 * Whether the pack's rules are correct conformance controls of the standard they
 * name — that is the pack's own handler tests and its `notEvaluableHere` block.
 * This guard asserts one thing: the corpus mapping does not misdescribe what
 * kind of rule these are.
 *
 * ## Anti-vacuous pass
 *
 * The denominator is the set of declaring packs. A tree with none is a hard
 * failure through `assertScanned`, which is also what turns this guard red
 * inside `43-validate-guard-negative-fixtures`' empty sandbox. "There are no
 * standards packs" must never read as "the standards packs are classified".
 *
 * USAGE
 *   node .harness/scripts/ci/65-validate-standards-rule-class.mjs
 *   node .harness/scripts/ci/65-validate-standards-rule-class.mjs --verbose
 *   node .harness/scripts/ci/65-validate-standards-rule-class.mjs --root <dir>
 *
 * EXIT CODES
 *   0  every standards pack is declared and classified as an international standard
 *   1  a pack is undeclared, misclassified, or carries a note that is not true of it
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = '65-validate-standards-rule-class';

// --- CLI ---------------------------------------------------------------------

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const rootIdx = argv.indexOf('--root');
export const ROOT = rootIdx !== -1 ? resolve(process.cwd(), argv[rootIdx + 1]) : resolve(__dirname, '../../..');

// --- The corpus locations ----------------------------------------------------

export const CORPUS_DIR = 'src/rulesets';
export const STANDARDS_DIR = 'src/rulesets/standards';
export const MAPPING_FILE = 'src/rulesets/standards/iso-5055-mapping.json';

/** The class a pack's rules must carry. */
export const STANDARD_CLASS = 'international-standard';

/**
 * The two sentences the defect published, as patterns. A note matching either is
 * asserting something false about a conformance control of a published standard,
 * regardless of what class the row claims.
 */
export const FALSE_CLAIMS = [
  { pattern: /no international (?:structural )?equivalent/i, quote: 'no international structural equivalent' },
  { pattern: /governance invariant over Evolith artifacts/i, quote: 'a governance invariant over Evolith artifacts' },
];

// --- Discovery ---------------------------------------------------------------

/**
 * Every `*.rules.json` in the corpus, repo-relative and POSIX-separated.
 *
 * A missing corpus directory yields `[]` rather than throwing: the empty result
 * is the honest answer, and `assertScanned` is what turns it into a failure with
 * a message that names where it looked.
 *
 * @param {string} root repository root
 * @returns {string[]}
 */
export function collectRulesetFiles(root) {
  const base = join(root, CORPUS_DIR);
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.rules.json')) out.push(relative(root, full).split(sep).join('/'));
    }
  };
  walk(base);
  return out;
}

/**
 * How many conformance rules a parsed ruleset carries, across the shapes this
 * corpus uses. Mirrors `build-iso-5055-mapping.mjs`'s extractor, which is the
 * thing being checked — a guard that counted rules differently from the
 * generator would report disagreement that is its own.
 *
 * @param {any} parsed
 * @returns {string[]} rule ids
 */
export function ruleIdsOf(parsed) {
  const list = parsed?.rules ?? parsed?.principles;
  if (Array.isArray(list)) return list.filter((r) => r && r.id).map((r) => String(r.id));
  if (parsed?.id && (parsed.name || parsed.title)) return [String(parsed.id)];
  return [];
}

/**
 * @typedef {{ file: string, standard: any|null, ruleIds: string[], inStandardsDir: boolean }} Pack
 */

/**
 * Read every ruleset that carries rules, keeping its `standard` declaration.
 *
 * @param {string} root
 * @returns {{ packs: Pack[], unreadable: string[] }} `packs` are the DECLARING ones
 */
export function findPacks(root) {
  const packs = [];
  const undeclaredInDir = [];
  const unreadable = [];

  for (const rel of collectRulesetFiles(root)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(root, rel), 'utf8'));
    } catch (error) {
      unreadable.push(`${rel}: ${error.message}`);
      continue;
    }
    const ruleIds = ruleIdsOf(parsed);
    if (ruleIds.length === 0) continue;

    const inStandardsDir = rel.startsWith(`${STANDARDS_DIR}/`);
    const standard = parsed.standard ?? null;
    if (standard) packs.push({ file: rel, standard, ruleIds, inStandardsDir });
    else if (inStandardsDir) undeclaredInDir.push({ file: rel, standard: null, ruleIds, inStandardsDir });
  }

  return { packs, undeclaredInDir, unreadable };
}

// --- Rules -------------------------------------------------------------------

/**
 * @typedef {{ level: 'error', message: string }} Finding
 */

/**
 * Apply every rule to a pack set and a mapping document.
 *
 * Pure, so the self-test can drive the failure states with hand-built objects
 * instead of scaffolding a corpus per case.
 *
 * @param {{ packs: Pack[], undeclaredInDir: Pack[], mapping: any }} input
 * @returns {Finding[]}
 */
export function checkClassification({ packs, undeclaredInDir = [], mapping }) {
  const findings = [];
  const err = (message) => findings.push({ level: 'error', message });

  // 1. The directory cannot grow a silent pack.
  for (const pack of undeclaredInDir) {
    err(
      `${pack.file} carries ${pack.ruleIds.length} rule(s) in ${STANDARDS_DIR}/ but declares no top-level ` +
        '`standard` block.\n' +
        '      Classification is derived from that declaration, so without it every rule in this pack\n' +
        '      falls through to the `governance` default and is published as an Evolith invariant —\n' +
        '      which is the exact state GT-666 closed for the first three packs.',
    );
  }

  const rows = Array.isArray(mapping?.rules) ? mapping.rules : null;
  if (!rows) {
    err(
      `${MAPPING_FILE} has no \`rules\` array. The mapping is the artifact this guard reads; an\n` +
        '      unreadable one cannot be reported as a classified corpus.',
    );
    return findings;
  }

  const byId = new Map();
  for (const row of rows) byId.set(`${row.ruleId}@${row.sourceFile}`, row);

  for (const pack of packs) {
    // The label a reader would recognise. Read from whichever field the pack
    // uses — `{ id }` and `{ name, edition }` are both in the corpus today.
    const named = [pack.standard?.id, pack.standard?.name].filter((v) => typeof v === 'string' && v.trim());
    if (named.length === 0) {
      err(
        `${pack.file} declares a \`standard\` block that names no standard (neither \`id\` nor \`name\`).\n` +
          '      The mapping states which standard each rule belongs to, and it cannot state one that\n' +
          '      is not named.',
      );
      continue;
    }

    for (const ruleId of pack.ruleIds) {
      const row = byId.get(`${ruleId}@${relative(CORPUS_DIR, pack.file).split(sep).join('/')}`);

      // 2. Every rule of a declaring pack has a row.
      if (!row) {
        err(
          `${ruleId} (${pack.file}) has NO row in ${MAPPING_FILE}.\n` +
            '      Regenerate: node src/rulesets/standards/build-iso-5055-mapping.mjs\n' +
            '      A standards rule absent from the mapping is not classified at all, which reads from\n' +
            '      outside exactly like a corpus that does not contain it.',
        );
        continue;
      }

      // 3. The class.
      if (row.ruleClass !== STANDARD_CLASS) {
        err(
          `${ruleId} (${pack.file}) is classified \`${row.ruleClass}\`, not \`${STANDARD_CLASS}\`.\n` +
            `      The pack declares itself a conformance ruleset for ${named[0]}. Classifying its rules as\n` +
            '      anything else makes the mapping describe the corpus wrongly in the one document written\n' +
            '      to be checked by a reader who does not trust us.' +
            (row.ruleClass === 'governance'
              ? '\n      `governance` is the CLASS_BY_FILE fallback: this row matched no prefix, which means the\n' +
                '      classification is not deriving from the pack\'s `standard` declaration at all.'
              : ''),
        );
      }

      const note = typeof row.note === 'string' ? row.note : '';

      // 4. The note names this pack's own standard.
      if (!named.some((label) => note.includes(label))) {
        err(
          `${ruleId} (${pack.file}) carries a note that never names ${named[0]}.\n` +
            `      note: ${note || '(none)'}\n` +
            '      A note that does not name the standard the rule belongs to cannot be true OF that rule;\n' +
            '      it is at best a sentence that is no longer false.',
        );
      }

      // 5. The note does not reassert what the defect published.
      for (const { pattern, quote } of FALSE_CLAIMS) {
        if (pattern.test(note)) {
          err(
            `${ruleId} (${pack.file}) carries a note claiming «${quote}».\n` +
              `      note: ${note}\n` +
              `      ${ruleId} IS a conformance control of ${named[0]}. This is the sentence GT-666 removed.`,
          );
        }
      }
    }
  }

  // 6. The summary describes the rows it is a summary of.
  const claimed = mapping?.summary?.byClass?.[STANDARD_CLASS]?.rules;
  const actual = rows.filter((r) => r.ruleClass === STANDARD_CLASS).length;
  if (actual > 0 && claimed !== actual) {
    err(
      `summary.byClass.${STANDARD_CLASS}.rules says ${claimed ?? '(absent)'} but ${actual} row(s) carry that class.\n` +
        '      The summary is what a reader reads first. One that disagrees with its own rows is a\n' +
        '      hand-edited artifact; regenerate rather than reconciling it by hand.',
    );
  }

  return findings;
}

// --- Main --------------------------------------------------------------------

function main() {
  const corpusDir = join(ROOT, CORPUS_DIR);
  const { packs, undeclaredInDir, unreadable } = existsSync(corpusDir) && statSync(corpusDir).isDirectory()
    ? findPacks(ROOT)
    : { packs: [], undeclaredInDir: [], unreadable: [] };

  // The denominator, asserted BEFORE anything else is read. A tree with no
  // standards pack has nothing to classify, and reporting "every standards pack
  // is classified" over it would be the vacuous pass this repository keeps
  // finding.
  //
  // It counts the UNDECLARED packs too, and that is not generosity — it was
  // found by this guard's own self-test. Counting only the declaring ones meant
  // that a tree whose every pack had lost its `standard` block scanned zero and
  // died with "the corpus moved", which is the one diagnosis that is certainly
  // wrong: the corpus is right there, and the declarations are what went. The
  // guard was red either way; it named the wrong cause, which is how a red guard
  // costs an hour instead of saving one.
  assertScanned(packs.length + undeclaredInDir.length, {
    what: 'standards ruleset packs',
    where: [`${CORPUS_DIR}/**/*.rules.json with a top-level \`standard\` block`, STANDARDS_DIR],
  });

  const mappingPath = join(ROOT, MAPPING_FILE);
  let mapping = null;
  let mappingError = null;
  try {
    mapping = JSON.parse(readFileSync(mappingPath, 'utf8'));
  } catch (error) {
    mappingError = error.message;
  }

  const totalRules = packs.reduce((n, p) => n + p.ruleIds.length, 0);
  console.log(`${GUARD} — standards packs are classified as the standards they are`);
  console.log(`  declaring packs .... ${packs.length}`);
  console.log(`  their rules ........ ${totalRules}`);
  console.log(`  mapping ............ ${mappingError ? `UNREADABLE (${mappingError})` : MAPPING_FILE}`);

  if (VERBOSE) {
    for (const pack of packs) {
      const label = pack.standard?.id ?? pack.standard?.name ?? '(unnamed)';
      console.log(`    • ${pack.file} — ${label} (${pack.ruleIds.length} rule(s))`);
    }
  }

  if (unreadable.length > 0) {
    console.error('');
    console.error(`✗ ${GUARD}: ${unreadable.length} ruleset file(s) did not parse:`);
    for (const u of unreadable) console.error(`  • ${u}`);
    process.exit(1);
  }

  if (mappingError) {
    console.error('');
    console.error(`✗ ${GUARD}: ${MAPPING_FILE} could not be read: ${mappingError}`);
    console.error('  Regenerate it: node src/rulesets/standards/build-iso-5055-mapping.mjs');
    console.error('  A mapping that cannot be read is not a mapping that agrees with the corpus.');
    process.exit(1);
  }

  const findings = checkClassification({ packs, undeclaredInDir, mapping });

  if (findings.length > 0) {
    console.error('');
    console.error(`✗ ${GUARD}: ${findings.length} finding(s) — the mapping misdescribes the standards corpus.`);
    console.error('');
    for (const f of findings) console.error(`  • ${f.message}\n`);
    process.exit(1);
  }

  console.log('');
  console.log(
    `✓ ${GUARD}: all ${totalRules} rule(s) across ${packs.length} declaring pack(s) are classified ` +
      `\`${STANDARD_CLASS}\`, each with a note naming its own standard.`,
  );
  process.exit(0);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    if (error instanceof ZeroCoverageError) {
      console.error(`\n✗ ${GUARD}: ${error.message}`);
      process.exit(1);
    }
    console.error(`\n✗ ${GUARD} crashed: ${error?.stack || error}`);
    process.exit(1);
  }
}
