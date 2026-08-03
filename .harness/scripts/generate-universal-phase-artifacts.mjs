#!/usr/bin/env node
/**
 * GT-650 / ADR-0125 — generate `UNIVERSAL_PHASE_ARTIFACTS` from the artifact registry.
 *
 * WHY GENERATED AND NOT READ AT RUNTIME. The constant is imported by `PhaseArtifactProfileService`,
 * which is pure and does no I/O; making it read a file at module load would put a filesystem
 * dependency into the evaluation path for no benefit. Generating keeps the constant a constant and
 * moves the truth into the registry, verified at a fixed point by the derived-artifact chain.
 *
 * WHAT CHANGES WHEN THIS FIRST RUNS, and it is not cosmetic. The hand-written constant was one of
 * the two half-truths ADR-0125 removes, and it was under-reporting by SIX artifacts that gates
 * actually require:
 *
 *   construction  + coverage-report, documentation-delta
 *   quality       + acceptance-validation, integration-evidence, pyramid-distribution
 *   deployment    + on-call-handoff
 *
 * Nothing is removed. Every addition is an artifact a gate requires and the constant omitted, so
 * the advisory completeness figure has been FLATTERING: a phase reported as complete could be
 * missing something its own gate demands. Lowering it is the correction, not a regression.
 *
 * `coverage-report` is the case the ADR was written around: required at construction by `gate-f3`
 * and expected at quality by this constant. Both were true; the registry says so with a list, and
 * it now appears in both.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const REGISTRY = 'src/rulesets/sdlc/artifact-registry.json';
const TARGET = 'src/packages/core-domain/src/application/services/universal-phase-artifacts.generated.ts';

/** The three phases `DownstreamPhase` names. The registry knows six; this constant covers these. */
const DOWNSTREAM = ['construction', 'quality', 'deployment'];

const BEGIN = '// <generated>';
const END = '// </generated>';

function render(registry) {
  const lines = [];
  for (const phase of DOWNSTREAM) {
    const ids = registry.artifacts
      .filter((a) => a.phases.includes(phase))
      .map((a) => a.id)
      .sort((a, b) => a.localeCompare(b, 'en'));
    lines.push(`  ${phase}: [${ids.map((i) => `'${i}'`).join(', ')}],`);
  }

  return `/**
 * GENERATED — do not edit by hand.
 *
 * Source: \`${REGISTRY}\` (GT-650 / ADR-0125). Regenerate with:
 *   node .harness/scripts/generate-universal-phase-artifacts.mjs
 *
 * The registry is the single declaration of every artifact the Core knows about. This projection
 * is the subset each downstream phase expects, \`binding\` and \`advisory\` alike, because
 * completeness counts everything a phase should contain — the classification decides what BLOCKS,
 * which is a different question and belongs to the gate evaluator.
 */

import type { DownstreamPhase } from './phase-artifact-profile.service';

${BEGIN}
export const UNIVERSAL_PHASE_ARTIFACTS: Readonly<Record<DownstreamPhase, readonly string[]>> = {
${lines.join('\n')}
};
${END}
`;
}

function main() {
  const check = process.argv.includes('--check');
  const registry = JSON.parse(readFileSync(join(ROOT, REGISTRY), 'utf8'));

  if (!Array.isArray(registry.artifacts) || registry.artifacts.length === 0) {
    console.error(`\n❌ ${REGISTRY} declares no artifacts. Generating an empty constant would make every phase look complete.\n`);
    process.exit(1);
  }

  const rendered = render(registry);
  const target = join(ROOT, TARGET);

  let current = '';
  try {
    current = readFileSync(target, 'utf8');
  } catch {
    current = '';
  }

  const total = DOWNSTREAM.reduce(
    (n, p) => n + registry.artifacts.filter((a) => a.phases.includes(p)).length,
    0,
  );
  console.log(
    `generate-universal-phase-artifacts: ${registry.artifacts.length} artifact(s) in the registry, ` +
    `${total} phase membership(s) across ${DOWNSTREAM.length} downstream phase(s).`,
  );

  if (check) {
    if (current !== rendered) {
      console.error(
        `\n❌ ${TARGET} is stale. Run the generator and commit the result.\n` +
        '   The registry is the source; a hand-edited projection is the second copy ADR-0125 removes.\n',
      );
      process.exit(1);
    }
    console.log('✅ The generated constant matches the registry.');
    return;
  }

  writeFileSync(target, rendered);
  console.log(`✅ Wrote ${TARGET}`);
}

main();
