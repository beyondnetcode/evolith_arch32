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
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = process.cwd();
const compositionSchemaPath = path.join(root, "rulesets/schema/topology-composition.schema.json");
const topologyManifestRoot = path.join(root, "reference/architecture/topologies");
const examplesRoot = path.join(root, "examples");

const failures = [];

function relative(file) {
  return path.relative(root, file);
}

function walkForCompositions(directory) {
  const out = [];
  if (!fs.existsSync(directory)) return out;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkForCompositions(full));
    } else if (entry.isFile() && entry.name === "topology.composition.json") {
      out.push(full);
    }
  }
  return out;
}

function walkForManifests(directory) {
  const out = [];
  if (!fs.existsSync(directory)) return out;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkForManifests(full));
    } else if (entry.isFile() && entry.name === "topology.manifest.json") {
      out.push(full);
    }
  }
  return out;
}

function loadManifestIndex() {
  const index = new Map();
  for (const manifestPath of walkForManifests(topologyManifestRoot)) {
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

if (!fs.existsSync(compositionSchemaPath)) {
  console.error("❌ rulesets/schema/topology-composition.schema.json is missing");
  process.exit(1);
}

const compositionSchema = JSON.parse(fs.readFileSync(compositionSchemaPath, "utf8"));
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validateComposition = ajv.compile(compositionSchema);

const manifestIndex = loadManifestIndex();
const compositions = walkForCompositions(examplesRoot);

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
      const validateFixture = new Ajv({ strict: false, allErrors: true }).compile(contract);
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

if (compositions.length === 0) {
  console.error("❌ No topology.composition.json files found under examples/. GT-168 requires at least one reference composition.");
  process.exit(1);
}

console.log(`✓ Cross-topology composition validation passed for ${compositions.length} composition(s).`);
