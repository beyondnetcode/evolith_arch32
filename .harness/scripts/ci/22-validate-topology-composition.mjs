#!/usr/bin/env node

/**
 * GT-168 native rule: validate every cross-topology composition example.
 *
 * Each example is a directory containing topology.composition.json plus one
 * per-topology fixture per declared profile. The validator:
 *   1. Parses the composition against topology-composition.schema.json
 *   2. Resolves each profile to its accepted manifest under reference/
 *   3. Asserts pairwise composability via spec.compatibility.composableWith
 *   4. Validates each per-topology fixture against its manifest's
 *      corpus.configurationContract
 */

import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const draft7MetaSchema = require('ajv/dist/refs/json-schema-draft-07.json');

// GT-556/557: paths came from process.cwd(), and `reference/knowledge/demo/examples`
// had moved to `product/research/demo/examples`. From the repo root the walker found
// zero compositions; the resulting "no compositions found" message was the check
// reporting its own blindness. Both are now fail-closed.
import { REPO_ROOT, collectFiles, resolve as resolveKey, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const root = REPO_ROOT;
const compositionSchemaPath = resolveKey("topologyCompositionSchema");
// GT-329: canonical topology roots — progressive-axis stays in reference/; advanced topologies in rulesets/
const TOPOLOGY_ROOT_KEYS = ["topologiesReference", "topologiesRulesets"];
const EXAMPLES_KEY = "demoExamples";

const failures = [];

function relative(file) {
  return relativeToRoot(file);
}


function loadManifestIndex() {
  const index = new Map();
  const manifestPaths = collectFiles(TOPOLOGY_ROOT_KEYS, "topology.manifest.json");
  assertScanned(manifestPaths.length, { what: "topology manifests", where: TOPOLOGY_ROOT_KEYS });
  for (const manifestPath of manifestPaths) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const profile = manifest.spec?.topologyType;
      if (profile && manifest.metadata?.status === "accepted") {
        index.set(profile, { manifest, manifestPath });
      }
    } catch {
      // ignore: validate-topology-manifests.mjs already covers JSON validity
    }
  }
  return index;
}

const compositionSchema = JSON.parse(fs.readFileSync(compositionSchemaPath, "utf8"));
const ajv = new Ajv({ strict: false, allErrors: true });
ajv.addMetaSchema(draft7MetaSchema);
addFormats(ajv);
const validateComposition = ajv.compile(compositionSchema);

const manifestIndex = loadManifestIndex();
const compositions = collectFiles([EXAMPLES_KEY], "topology.composition.json");
// GT-168 requires at least one reference composition; zero here means the examples
// root moved, not that the requirement was met.
assertScanned(compositions.length, { what: "topology compositions", where: EXAMPLES_KEY });

for (const compositionPath of compositions) {
  let composition;
  try {
    composition = JSON.parse(fs.readFileSync(compositionPath, "utf8"));
  } catch (error) {
    failures.push(`${relative(compositionPath)} is not valid JSON: ${error.message}`);
    continue;
  }

  if (!validateComposition(composition)) {
    failures.push(`${relative(compositionPath)} violates composition schema: ${ajv.errorsText(validateComposition.errors, { separator: "; " })}`);
    continue;
  }

  const profiles = composition.topologies.map(t => t.profile);
  const resolved = composition.topologies.map(t => ({
    ...t,
    indexEntry: manifestIndex.get(t.profile),
  }));

  for (const entry of resolved) {
    if (!entry.indexEntry) {
      failures.push(`${relative(compositionPath)}: profile ${entry.profile} has no accepted manifest`);
    }
  }

  // Pairwise composability check.
  for (let i = 0; i < resolved.length; i++) {
    const subject = resolved[i];
    if (!subject.indexEntry) continue;
    const composableWith = subject.indexEntry.manifest.spec?.compatibility?.composableWith ?? [];
    for (let j = 0; j < resolved.length; j++) {
      if (i === j) continue;
      const peer = resolved[j];
      if (!peer.indexEntry) continue;
      if (!composableWith.includes(peer.profile)) {
        failures.push(`${relative(compositionPath)}: ${subject.profile} does not declare ${peer.profile} in composableWith`);
      }
    }
  }

  // Fixture validation against each topology's configuration contract.
  const compositionDir = path.dirname(compositionPath);
  for (const entry of resolved) {
    if (!entry.indexEntry) continue;
    const configurationContract = entry.indexEntry.manifest.spec?.corpus?.configurationContract;
    if (!configurationContract) continue;
    const contractPath = path.join(root, configurationContract);
    if (!fs.existsSync(contractPath)) {
      failures.push(`${relative(compositionPath)}: configurationContract missing for ${entry.profile} (${configurationContract})`);
      continue;
    }
    const fixturePath = path.resolve(compositionDir, entry.config);
    if (!fs.existsSync(fixturePath)) {
      failures.push(`${relative(compositionPath)}: fixture missing for ${entry.profile} (${entry.config})`);
      continue;
    }
    try {
      const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
      const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
      const validateFixtureAjv = new Ajv({ strict: false, allErrors: true });
      validateFixtureAjv.addMetaSchema(draft7MetaSchema);
      const validateFixture = validateFixtureAjv.compile(contract);
      if (!validateFixture(fixture)) {
        failures.push(`${relative(compositionPath)}: ${entry.profile} fixture violates configurationContract: ${ajv.errorsText(validateFixture.errors, { separator: "; " })}`);
      }
    } catch (error) {
      failures.push(`${relative(compositionPath)}: failed to validate ${entry.profile} fixture against contract: ${error.message}`);
    }
  }

  console.log(`  ✓ ${relative(compositionPath)} composes [${profiles.join(", ")}]`);
}

if (failures.length > 0) {
  console.error("❌ Cross-topology composition validation failed:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(`✓ Cross-topology composition validation passed for ${compositions.length} composition(s).`);
