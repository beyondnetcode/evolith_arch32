#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = process.cwd();
const schemaPath = path.join(root, "rulesets", "schema", "topology-manifest.schema.json");
const manifestRoots = [
  path.join(root, "reference", "architecture", "topologies"),
  path.join(root, "rulesets", "topologies"),
];
const failures = [];
const manifests = [];

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name === "topology.manifest.json") {
      manifests.push(fullPath);
    }
  }
}

function relative(file) {
  return path.relative(root, file);
}

if (!fs.existsSync(schemaPath)) {
  failures.push("rulesets/schema/topology-manifest.schema.json is missing");
} else {
  for (const manifestRoot of manifestRoots) {
    walk(manifestRoot);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  for (const manifestPath of manifests) {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (error) {
      failures.push(`${relative(manifestPath)} is not valid JSON: ${error.message}`);
      continue;
    }

    if (!validate(manifest)) {
      failures.push(`${relative(manifestPath)} violates topology manifest schema: ${ajv.errorsText(validate.errors, { separator: "; " })}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Topology manifest validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Topology manifest validation passed for ${manifests.length} manifest files.`);
