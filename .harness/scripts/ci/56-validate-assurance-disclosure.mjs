#!/usr/bin/env node
/**
 * GT-683 AC5 — the buyer-facing README must agree with the shipped ruleset about
 * which rules INSPECT the repository and which merely read its self-declaration.
 *
 * Why a guard and not a test: this is the claim a buyer reads before paying, and it
 * lives in a document nobody compiles. Nine blocking `AAI-*` rules were decided
 * entirely by reading one JSON file and the README said only that the evaluator
 * "enforces the same controls" — true, and useless for telling "we inspected the
 * sandbox" apart from "the repository told us it has one".
 *
 * The ruleset is the source of truth; the README is the projection. Disagreement in
 * either direction is a failure: a README claiming `observed` for a rule the corpus
 * marks `declared` oversells, and the reverse hides work and makes the corpus look
 * weaker than it is.
 *
 * Bilingual on purpose. The Spanish twin is the document a Spanish-speaking buyer
 * reads, and a table that drifts in one language only is exactly how a claim ends up
 * true in one market and false in the other.
 *
 * Exits 1 on any disagreement, 0 when every rule matches in both languages.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { assertScanned } from '../lib/coverage.mjs';

const ROOT = 'src/rulesets/topologies';

/**
 * GT-696 — every topology whose rules carry an assurance must publish it. The list
 * is DERIVED from disk, not enumerated here: a topology that starts labelling its
 * rules is covered the moment it does, and one that never does is reported by name
 * rather than silently skipped.
 */
const TOPOLOGIES = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((name) => existsSync(join(ROOT, name, `${name}.rules.json`)))
  .sort();

/**
 * `unevaluated` is the state GT-683's binary could not express and GT-696 measured:
 * ten rules across four topologies are decided by NOTHING — no handler branch claims
 * them. Calling that `declared` would be a third falsehood on top of the two this
 * family already fixed. A rule that is shipped and not enforced says so.
 */
const VALID = new Set(['observed', 'declared', 'unevaluated']);

function fail(lines) {
  console.error('✗ 56-validate-assurance-disclosure: the README and the ruleset disagree.\n');
  for (const line of lines) console.error(`    ${line}`);
  console.error(
    '\n  The ruleset is the source of truth and the README is what a buyer reads before\n' +
      '  paying. `observed` claims the evaluation opened the repository; `declared` claims\n' +
      '  only that a field in a declaration file was compared; `unevaluated` says no check\n' +
      '  decides the rule at all. Publishing one and shipping another is a claim nobody\n' +
      '  can check.\n',
  );
  process.exit(1);
}

let scannedRules = 0;
let scannedReadmes = 0;
const problems = [];
const unlabelled = [];

for (const topology of TOPOLOGIES) {
  const ruleset = join(ROOT, topology, `${topology}.rules.json`);
  const rules = JSON.parse(readFileSync(ruleset, 'utf8')).rules ?? [];
  if (rules.length === 0) continue;

  // A topology that has NOT STARTED labelling is reported once, by name, instead of
  // quietly contributing zero comparisons to a green run.
  //
  // But "not started" and "labels were deleted" are different, and only one of them
  // is acceptable. If the README already publishes assurances, the labels existed:
  // their absence from the ruleset is a REGRESSION and fails. Demonstrated while
  // writing this guard — stripping data-mesh's labels left it silent, which is the
  // failure mode it is supposed to catch.
  if (!rules.some((r) => VALID.has(r.assurance))) {
    const publishes = [join(ROOT, topology, 'README.md'), join(ROOT, topology, 'README.es.md')]
      .filter((f) => existsSync(f))
      .some((f) => /`(observed|declared|unevaluated)`/.test(readFileSync(f, 'utf8')));
    if (publishes) {
      problems.push(
        `${ruleset}: the README publishes assurances and the ruleset labels none — ` +
          'labels were removed, which is a regression, not a topology that has yet to start',
      );
    } else {
      unlabelled.push(`${topology} (${rules.length} rule(s), none labelled)`);
    }
    continue;
  }
  scannedRules += rules.length;

  for (const r of rules) {
    if (!VALID.has(r.assurance)) {
      problems.push(`${ruleset}: ${r.id} has assurance "${r.assurance ?? '<absent>'}" — expected ${[...VALID].join('|')}`);
    }
  }

  for (const readme of [join(ROOT, topology, 'README.md'), join(ROOT, topology, 'README.es.md')]) {
    if (!existsSync(readme)) {
      problems.push(`${readme}: missing — a labelled topology must publish its assurance table in both languages`);
      continue;
    }
    scannedReadmes += 1;
    const lines = readFileSync(readme, 'utf8').split('\n');
    for (const rule of rules) {
      const row = lines.find((l) => l.startsWith(`| ${rule.id} |`));
      if (!row) {
        problems.push(`${readme}: ${rule.id} is shipped in the ruleset and absent from the table`);
        continue;
      }
      const published = (row.match(/`(observed|declared|unevaluated)`\s*\|\s*$/) ?? [])[1];
      if (!published) {
        problems.push(`${readme}: ${rule.id} publishes no assurance — the column is what this guard exists for`);
      } else if (published !== rule.assurance) {
        problems.push(`${readme}: ${rule.id} publishes \`${published}\`, the ruleset ships \`${rule.assurance}\``);
      }
    }
    const shipped = new Set(rules.map((r) => r.id));
    for (const row of lines.filter((l) => /^\| [A-Z]+[A-Z-]*-[A-Z]*\d+ \|/.test(l))) {
      const id = row.slice(2, row.indexOf(' |', 2));
      if (!shipped.has(id) && /`(observed|declared|unevaluated)`/.test(row)) {
        problems.push(`${readme}: ${id} is published with an assurance and is not in the ruleset`);
      }
    }
  }
}

// GT-578 — a guard that scanned nothing did not run.
assertScanned(scannedRules, { what: 'labelled topology rules', where: ROOT });
assertScanned(scannedReadmes, { what: 'buyer-facing READMEs', where: ROOT });

if (unlabelled.length > 0) {
  console.log(`  ${unlabelled.length} topology/topologies publish no assurance yet: ${unlabelled.join(', ')}`);
}

if (problems.length > 0) fail(problems);

console.log(
  `✓ 56-validate-assurance-disclosure: ${scannedRules} rule(s) across ` +
    `${TOPOLOGIES.length - unlabelled.length} topology/topologies publish the same assurance in ` +
    `${scannedReadmes} README(s) as the shipped rulesets.`,
);
