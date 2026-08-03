#!/usr/bin/env node
/**
 * GT-650 / ADR-0125 — the artifact registry is the single declaration, and it must not drift from
 * the corpora it is replacing while those still exist.
 *
 * WHY THIS GUARD EXISTS DURING THE MIGRATION, and why it is not the same as `57`. ADR-0125 warns
 * that a half-migration reintroduces the split it removes. The registry now exists and one consumer
 * derives from it, while `gate-f*.json` and `phase-gates.rules.json` are still hand-maintained. So
 * for as long as that is true there are three files, and the only thing making the intermediate
 * state safe is that they are checked to say the same thing.
 *
 * `57-validate-gate-corpora-parity` compares the two GATE copies to each other. This one compares
 * the REGISTRY to them: every binding artifact must appear in a gate, in the same phase, with the
 * same schema or the same tool-output declaration. Both guards die when `phase-gates.rules.json`
 * becomes generated and the gates reference the registry by id, and their deletion is part of the
 * definition of done — a guard kept past its cause becomes noise, and noise trains people to skip
 * red.
 *
 * WHAT IT ALSO CHECKS, and this is the half a parity check cannot see: that every phase named by an
 * artifact is in the declared vocabulary, that no `advisory` artifact is required by a gate (which
 * would mean it can block a release while the registry says it cannot), and that no `binding` one
 * is absent from every gate (which would mean the registry claims a gate requires something no gate
 * mentions).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import process from 'node:process';
import { assertScanned } from '../lib/coverage.mjs';

const ROOT = process.cwd();
const REGISTRY = 'src/rulesets/sdlc/artifact-registry.json';
const GATES_DIR = 'reference/governance/sdlc/gates';

/** gate-f<N> → the phase name the registry uses. */
const GATE_PHASE = { f1: 'discovery', f2: 'design', f3: 'construction', f4: 'quality', f5: 'deployment' };

function readGateCorpus() {
  const byArtifactLabel = new Map();
  for (const file of readdirSync(join(ROOT, GATES_DIR)).filter((f) => /^gate-f\d+\.json$/.test(f))) {
    const gate = JSON.parse(readFileSync(join(ROOT, GATES_DIR, file), 'utf8'));
    const phase = GATE_PHASE[String(gate.phase)];
    for (const a of gate.requiredArtifacts ?? []) {
      byArtifactLabel.set(a.artifact, {
        phase,
        schema: a.schemaRef ? basename(a.schemaRef) : null,
        toolOutput: a.producedBy != null,
      });
    }
  }
  return byArtifactLabel;
}

function main() {
  if (!existsSync(join(ROOT, REGISTRY))) {
    console.error(`\n❌ ${REGISTRY} is missing. The registry IS the source; without it nothing below means anything.\n`);
    process.exit(1);
  }

  const registry = JSON.parse(readFileSync(join(ROOT, REGISTRY), 'utf8'));
  const vocabulary = new Set(registry.phaseVocabulary ?? []);
  const gates = readGateCorpus();
  const problems = [];
  let checked = 0;

  const ids = new Set();
  for (const a of registry.artifacts ?? []) {
    checked += 1;

    if (ids.has(a.id)) problems.push(`${a.id}: declared twice — the slug is the identity, so a duplicate makes the registry ambiguous`);
    ids.add(a.id);

    for (const phase of a.phases ?? []) {
      if (!vocabulary.has(phase)) {
        problems.push(`${a.id}: phase "${phase}" is not in the declared vocabulary — an artifact in a phase nobody evaluates is invisible`);
      }
    }

    const gate = gates.get(a.label);

    if (a.classification === 'binding') {
      if (!gate) {
        problems.push(
          `${a.id}: classified binding, but no gate requires "${a.label}". Binding means a gate ` +
          `fails without it; if no gate mentions it, the registry is claiming a power nothing enforces.`,
        );
        continue;
      }
      if (!(a.phases ?? []).includes(gate.phase)) {
        problems.push(`${a.id}: the gate requires it at "${gate.phase}" and the registry does not list that phase`);
      }
      const registrySchema = a.schemaId ? basename(new URL(a.schemaId).pathname) : null;
      if (registrySchema !== gate.schema) {
        problems.push(
          `${a.id}: schema differs — registry has ${registrySchema ?? 'none'}, the gate has ${gate.schema ?? 'none'}`,
        );
      }
      if ((a.producedBy != null) !== gate.toolOutput) {
        problems.push(
          `${a.id}: one side declares it tool output and the other does not ` +
          `(registry ${a.producedBy != null}, gate ${gate.toolOutput})`,
        );
      }
    } else if (gate) {
      problems.push(
        `${a.id}: classified advisory, but gate "${gate.phase}" requires "${a.label}". Advisory means ` +
        `it cannot block a release, and this one can — promoting it is a decision, not a fix to make here.`,
      );
    }
  }

  for (const [label] of gates) {
    if (![...(registry.artifacts ?? [])].some((a) => a.label === label)) {
      problems.push(`gate artifact "${label}" is required by a gate and absent from the registry`);
    }
  }

  console.log(
    `59-validate-artifact-registry: ${checked} artifact(s) in the registry, ` +
    `${gates.size} required by gates, vocabulary of ${vocabulary.size} phase(s).`,
  );

  assertScanned(checked, { what: 'artifacts declared in the registry', where: [REGISTRY] });

  if (problems.length > 0) {
    console.error('\n❌ The registry and the gate corpus disagree:\n');
    for (const p of problems) console.error(`  ✖ ${p}`);
    console.error(
      '\nThe registry is the source ADR-0125 accepted, but the gate corpus is still\n' +
      'hand-maintained. Until it derives from the registry, the only thing making that\n' +
      'intermediate state safe is that the two are checked to say the same thing.\n',
    );
    process.exit(1);
  }

  console.log('✅ The registry agrees with every gate that requires an artifact.');
}

main();
