#!/usr/bin/env node
/**
 * The Core keeps the SAME 24 required artifacts in TWO hand-maintained files, and each has a
 * different consumer. This guard fails when they stop agreeing.
 *
 *   reference/governance/sdlc/gates/gate-f*.json   `requiredArtifacts`   → the EVALUATOR
 *       (`phase-gate-validator.service.ts`, `gate-registry.service.ts`)
 *   src/rulesets/sdlc/phase-gates.rules.json       `mandatoryEvidence`   → the HTTP SURFACE
 *       (`GET /api/v1/gates/:gateId`, `GET /api/v1/phases/:phase/requirements`)
 *
 * WHY IT EXISTS, and it is not hypothetical. `#378` enriched the artifact catalog: it wired four
 * schemas that had none and declared three artifacts as tool output. Every one of those seven
 * edits landed in the evaluator's copy and in NEITHER case reached the copy served over HTTP. So
 * for as long as that went unnoticed, a satellite asking the Core what a phase requires got an
 * answer seven artifacts poorer than the one the Core evaluated against — and nothing anywhere
 * went red. Registered as `GT-650`.
 *
 * WHAT IT DOES NOT DO. It does not force the two files to be byte-identical, and in particular it
 * does NOT compare `schemaRef` verbatim. The two live at different depths and each spells the
 * reference relative to itself — `../schema/prd.schema.json` from `src/rulesets/sdlc/`, and a
 * repo-relative path from `reference/governance/sdlc/gates/`. Both resolve to the same file.
 * Comparing the strings would report a difference that is not one, and a guard that cries wolf
 * gets silenced. It compares the resolved BASENAME, which is the identity of the schema.
 *
 * The real fix is one corpus, or one generated from the other; that is `GT-650`'s remaining
 * scope and needs an ADR. Until then this keeps the copies honest, which is the cheap half.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import process from 'node:process';
import { assertScanned } from '../lib/coverage.mjs';

const ROOT = process.cwd();
const GATES_DIR = 'reference/governance/sdlc/gates';
const SERVED = 'src/rulesets/sdlc/phase-gates.rules.json';

/** Phase number → artifact name → { schema, toolOutput }. */
function readEvaluatorCorpus() {
  const byPhase = new Map();
  for (const file of readdirSync(join(ROOT, GATES_DIR)).filter((f) => /^gate-f\d+\.json$/.test(f))) {
    const gate = JSON.parse(readFileSync(join(ROOT, GATES_DIR, file), 'utf8'));
    const phase = Number(String(gate.phase).replace(/^f/, ''));
    byPhase.set(phase, new Map((gate.requiredArtifacts ?? []).map((a) => [
      a.artifact,
      { schema: a.schemaRef ? basename(a.schemaRef) : null, toolOutput: a.producedBy != null },
    ])));
  }
  return byPhase;
}

function readServedCorpus() {
  const doc = JSON.parse(readFileSync(join(ROOT, SERVED), 'utf8'));
  return new Map((doc.gates ?? []).map((g) => [
    Number(g.phase),
    new Map((g.mandatoryEvidence ?? []).map((a) => [
      a.artifact,
      { schema: a.schemaRef ? basename(a.schemaRef) : null, toolOutput: a.producedBy != null },
    ])),
  ]));
}

function main() {
  const evaluator = readEvaluatorCorpus();
  const served = readServedCorpus();
  const problems = [];

  // A guard that walks zero artifacts passes forever. Say the denominator out loud.
  let compared = 0;

  for (const phase of new Set([...evaluator.keys(), ...served.keys()].sort((a, b) => a - b))) {
    const ev = evaluator.get(phase);
    const sv = served.get(phase);
    if (!ev) { problems.push(`phase ${phase}: served by the API, absent from the evaluator corpus`); continue; }
    if (!sv) { problems.push(`phase ${phase}: in the evaluator corpus, absent from the served one`); continue; }

    for (const name of new Set([...ev.keys(), ...sv.keys()])) {
      const a = ev.get(name);
      const b = sv.get(name);
      if (!a) { problems.push(`phase ${phase} · "${name}": served over HTTP, never evaluated`); continue; }
      if (!b) { problems.push(`phase ${phase} · "${name}": evaluated, never served over HTTP`); continue; }
      compared += 1;
      if (a.schema !== b.schema) {
        problems.push(
          `phase ${phase} · "${name}": schema differs — evaluator has ${a.schema ?? 'none'}, ` +
          `the served copy has ${b.schema ?? 'none'}`,
        );
      }
      if (a.toolOutput !== b.toolOutput) {
        problems.push(
          `phase ${phase} · "${name}": one copy declares it tool output and the other does not ` +
          `(evaluator ${a.toolOutput}, served ${b.toolOutput})`,
        );
      }
    }
  }

  console.log(
    `57-validate-gate-corpora-parity: ${compared} artifact(s) compared across ` +
    `${evaluator.size} phase(s), by resolved schema basename and tool-output flag.`,
  );

  // Zero compared is the shape every vacuous guard takes: both files read, nothing contrasted,
  // green tick. It is a failure here (GT-557).
  assertScanned(compared, {
    what: 'required artifacts present in BOTH gate corpora',
    where: [`${GATES_DIR}/gate-f*.json (requiredArtifacts)`, `${SERVED} (mandatoryEvidence)`],
  });

  if (problems.length > 0) {
    console.error('\n❌ The two gate corpora disagree:\n');
    for (const p of problems) console.error(`  ✖ ${p}`);
    console.error(
      '\nThe same 24 artifacts are maintained in two hand-edited files with different consumers:\n' +
      `  ${GATES_DIR}/gate-f*.json  → the evaluator\n` +
      `  ${SERVED}                  → the HTTP surface satellites query\n` +
      'When they drift, the Core evaluates against one answer and publishes another. Fix both,\n' +
      'or close GT-650 by deriving one from the other.\n',
    );
    process.exit(1);
  }

  console.log('✅ Both gate corpora describe the same required artifacts.');
}

main();
