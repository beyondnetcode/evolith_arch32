#!/usr/bin/env node
/**
 * GT-650 / ADR-0125 — generate `src/rulesets/sdlc/phase-gates.rules.json` instead of maintaining it.
 *
 * WHAT IT REPLACES. That file was a SECOND hand-maintained copy of the gate corpus, carrying the
 * same 24 artifacts under a different key, and it had already drifted: `#378` enriched the
 * evaluator's copy with four schemas and three tool-output declarations and none of the seven
 * reached the copy that is actually served over HTTP. So the Core evaluated against one answer and
 * published another, with nothing red anywhere. `57-validate-gate-corpora-parity` made that state
 * detectable; generating makes it unrepresentable, which is what ADR-0125 asked for.
 *
 * WHERE EACH FIELD COMES FROM, and the split is the decision:
 *
 *   the GATE   (`reference/governance/sdlc/gates/gate-f*.json`)
 *     name, description, playbookRef, accountableRole, waiverAuthority, waiverRequiredFields,
 *     blockingCriteria, which artifacts it requires, each one's `validation` prose and `status`.
 *     All of it is about THIS gate.
 *
 *   the REGISTRY (`src/rulesets/sdlc/artifact-registry.json`)
 *     `schemaRef` and `templateRef` and the tool-output declaration. All of it is about the
 *     ARTIFACT, and it stopped being copied into each gate that happens to require it — which is
 *     precisely how the seven-field drift became possible.
 *
 * THE CONFLICT WAS DECIDED, 2026-08-03: the evaluator's copy always rules. The two copies carried
 * six different governance facts, and generating from either would have published one as though it
 * had been chosen. It has now been chosen, so this runs. What the served copy said, and what the
 * evaluator's copy — now the only answer — says:
 *
 *   gate  field              evaluator's copy      the copy served over HTTP
 *   f2    accountableRole    Architect             Software Architect
 *   f3    accountableRole    Engineering Lead      Tech Lead
 *   f3    waiverAuthority    Architecture Board    Architecture Board (+ Executive Risk Acceptance for CVEs)
 *   f4    waiverAuthority    Release Manager       Architecture Board
 *   f5    accountableRole    Release Manager       DevOps Lead
 *   f5    waiverAuthority    Executive Sponsor     Technology Director
 *
 * Six answers changed on the published surface as a direct result, and that is the point rather
 * than a side effect: the surface now says what the engine enforces. `f4`'s waiver authority moves
 * from the Architecture Board to the Release Manager, and `f5`'s from the Technology Director to
 * the Executive Sponsor, because those are what the evaluator has been using all along.
 *
 * PATHS ARE REWRITTEN, NOT COPIED. The registry holds a schema's published `$id` and a
 * repository-relative template path; the generated file expresses both relative to its own
 * location, because that is the convention its consumers already read and rewriting them to
 * something else would be a change with no cause.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const REGISTRY = 'src/rulesets/sdlc/artifact-registry.json';
const GATES_DIR = 'reference/governance/sdlc/gates';
const TARGET = 'src/rulesets/sdlc/phase-gates.rules.json';

/** Preserved from the file this replaces: its consumers read these verbatim. */
const HEADER = {
  $schema: '../schema/ruleset-sdlc.schema.json',
  $id: 'https://evolith.dev/rulesets/sdlc/phase-gates.rules.json',
  title: 'SDLC Phase Gate Rules',
  description:
    'Canonical phase exit gate criteria for the Evolith 5-phase SDLC. Each gate requires objective '
    + 'evidence; manual attestation alone is not evidence. GENERATED from the artifact registry and '
    + 'the gate corpus (GT-650 / ADR-0125) — do not edit by hand.',
  version: '1.0.0',
  effectiveDate: '2026-01-01',
};

function main() {
  const check = process.argv.includes('--check');
  const registry = JSON.parse(readFileSync(join(ROOT, REGISTRY), 'utf8'));
  const byLabel = new Map(registry.artifacts.map((a) => [a.label, a]));

  const gateFiles = readdirSync(join(ROOT, GATES_DIR))
    .filter((f) => /^gate-f\d+\.json$/.test(f))
    .sort();

  const gates = [];
  let artifacts = 0;
  const missing = [];

  for (const file of gateFiles) {
    const gate = JSON.parse(readFileSync(join(ROOT, GATES_DIR, file), 'utf8'));
    const evidence = [];

    for (const required of gate.requiredArtifacts ?? []) {
      artifacts += 1;
      const entry = byLabel.get(required.artifact);
      if (!entry) {
        // Fail loudly. Emitting the artifact without its schema would publish a gate that
        // silently demands less than the evaluator does — the exact drift this replaces.
        missing.push(`${file}: "${required.artifact}" is required by a gate and absent from the registry`);
        continue;
      }

      const item = { artifact: required.artifact };
      if (entry.schemaId) item.schemaRef = `../schema/${basename(new URL(entry.schemaId).pathname)}`;
      if (required.status) item.status = required.status;
      if (entry.templateRef) item.templateRef = `../../../${entry.templateRef}`;
      if (required.validation) item.validation = required.validation;
      if (entry.producedBy) item.producedBy = entry.producedBy;
      evidence.push(item);
    }

    // CONFLICT RESOLUTION, decided by product direction on 2026-08-03: the evaluator's copy
    // always rules. Every field below therefore comes from the gate corpus, including the six
    // governance facts the two copies disagreed about — accountable roles and waiver authorities.
    //
    // `exitCriteria` is the one thing the served copy carried that the corpus did not, and it was
    // NOT a conflicting value: `description` describes the phase, the served text described what
    // the gate demands to pass. It answers a different question, so it was moved INTO the gate
    // corpus rather than dropped — which puts it under the same authority the rule names instead
    // of making it an exception to it.
    const out = {
      phase: Number(String(gate.phase).replace(/^f/, '')),
      name: gate.name,
      description: gate.description,
    };
    if (gate.exitCriteria) out.exitCriteria = gate.exitCriteria;
    // The corpus stores this repository-relative; the served file has always expressed it relative
    // to its own location, and its consumers read it that way.
    if (gate.playbookRef) out.playbookRef = `../../../${gate.playbookRef}`;
    out.mandatoryEvidence = evidence;
    if (gate.blockingCriteria) out.blockingCriteria = gate.blockingCriteria;
    if (gate.accountableRole) out.accountableRole = gate.accountableRole;
    if (gate.waiverAuthority) out.waiverAuthority = gate.waiverAuthority;
    if (gate.waiverRequiredFields) out.waiverRequiredFields = gate.waiverRequiredFields;
    gates.push(out);
  }

  console.log(
    `generate-phase-gates-rules: ${gates.length} gate(s), ${artifacts} required artifact(s) ` +
    `composed from ${registry.artifacts.length} registry entries.`,
  );

  if (missing.length > 0) {
    console.error('\n❌ Gate artifacts absent from the registry:\n');
    for (const m of missing) console.error(`  ✖ ${m}`);
    console.error('\nThe registry is the single declaration; a gate cannot require what it does not declare.\n');
    process.exit(1);
  }

  if (gates.length === 0 || artifacts === 0) {
    console.error('\n❌ Generated zero gates or zero artifacts. An empty gate corpus would publish a Core that demands nothing.\n');
    process.exit(1);
  }

  const rendered = `${JSON.stringify({ ...HEADER, gates }, null, 2)}\n`;
  const target = join(ROOT, TARGET);
  const current = (() => {
    try { return readFileSync(target, 'utf8'); } catch { return ''; }
  })();

  if (check) {
    if (current !== rendered) {
      console.error(
        `\n❌ ${TARGET} is stale. Run the generator and commit the result.\n` +
        '   It is derived from the registry and the gate corpus; a hand edit is the second copy\n' +
        '   ADR-0125 removes, and it is how seven fields went missing from the served answer.\n',
      );
      process.exit(1);
    }
    console.log('✅ The served gate corpus matches the registry and the gates.');
    return;
  }

  writeFileSync(target, rendered);
  console.log(`✅ Wrote ${TARGET}`);
}

main();
