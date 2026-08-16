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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TOPOLOGY = 'src/rulesets/topologies/agentic-ai';
const RULESET = join(TOPOLOGY, 'agentic-ai.rules.json');
const READMES = [join(TOPOLOGY, 'README.md'), join(TOPOLOGY, 'README.es.md')];

const VALID = new Set(['observed', 'declared']);

function fail(lines) {
  console.error('✗ 56-validate-assurance-disclosure: the README and the ruleset disagree.\n');
  for (const line of lines) console.error(`    ${line}`);
  console.error(
    '\n  The ruleset is the source of truth and the README is what a buyer reads before\n' +
      '  paying. A rule labelled `observed` claims the evaluation opened the repository;\n' +
      '  `declared` claims only that a field in agent.config.json was compared. Publishing\n' +
      '  one and shipping the other is a claim nobody can check.\n',
  );
  process.exit(1);
}

const rules = JSON.parse(readFileSync(RULESET, 'utf8')).rules;
const problems = [];

const untyped = rules.filter((r) => !VALID.has(r.assurance));
for (const r of untyped) {
  problems.push(`${RULESET}: ${r.id} has assurance "${r.assurance ?? '<absent>'}" — expected observed|declared`);
}

for (const readme of READMES) {
  const text = readFileSync(readme, 'utf8');
  for (const rule of rules) {
    const row = text.split('\n').find((l) => l.startsWith(`| ${rule.id} |`));
    if (!row) {
      problems.push(`${readme}: ${rule.id} is shipped in the ruleset and absent from the table`);
      continue;
    }
    const published = (row.match(/`(observed|declared)`\s*\|\s*$/) ?? [])[1];
    if (!published) {
      problems.push(`${readme}: ${rule.id} publishes no assurance — the column is what this guard exists for`);
    } else if (published !== rule.assurance) {
      problems.push(`${readme}: ${rule.id} publishes \`${published}\`, the ruleset ships \`${rule.assurance}\``);
    }
  }
  // The reverse direction: a table row for a rule that no longer ships.
  for (const row of text.split('\n').filter((l) => /^\| AAI-R\d+ \|/.test(l))) {
    const id = row.slice(2, row.indexOf(' |', 2));
    if (!rules.some((r) => r.id === id)) {
      problems.push(`${readme}: ${id} is published and is not in the ruleset`);
    }
  }
}

if (problems.length > 0) fail(problems);

const observed = rules.filter((r) => r.assurance === 'observed').length;
console.log(
  `✓ 56-validate-assurance-disclosure: ${rules.length} rule(s) publish the same assurance in ` +
    `${READMES.length} language(s) — ${observed} observed, ${rules.length - observed} declared.`,
);
