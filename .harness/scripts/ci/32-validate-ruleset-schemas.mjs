#!/usr/bin/env node

/**
 * GT-391: CI schema validation — run `ajv` over every `*.rules.json`
 * against its declared `$schema`.
 *
 * Exit 0 if all schemas validate, 1 if any fail, 2 if ajv not installed.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rulesetsDir = path.join(root, "rulesets");

// Try to load ajv
let Ajv;
try {
  ({ default: Ajv } = await import("ajv"));
} catch {
  console.error("GT-391: ajv not installed. Run `npm install ajv` first.");
  process.exit(2);
}

const ajv = new Ajv({ allErrors: true, strict: false });

/** Recursively find all *.rules.json files */
function findRulesets(dir, baseDir = "") {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findRulesets(fullPath, relPath));
    } else if (entry.isFile() && entry.name.endsWith(".rules.json")) {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    return null;
  }
}

function loadSchema(schemaRef, rulesetDir) {
  // Resolve relative $schema paths against the ruleset directory
  if (schemaRef.startsWith("http://") || schemaRef.startsWith("https://")) {
    return null; // Skip remote schemas
  }
  const schemaPath = path.resolve(rulesetDir, schemaRef);
  if (!fs.existsSync(schemaPath)) return null;
  return loadJson(schemaPath);
}

const rulesets = findRulesets(rulesetsDir);
let failed = 0;
let passed = 0;
let skipped = 0;

for (const { fullPath, relPath } of rulesets) {
  const ruleset = loadJson(fullPath);
  if (!ruleset) {
    console.error(`GT-391 FAIL: Could not parse ${relPath}`);
    failed++;
    continue;
  }

  const schemaRef = ruleset.$schema;
  if (!schemaRef) {
    console.warn(`GT-391 WARN: No $schema in ${relPath}`);
    skipped++;
    continue;
  }

  const schema = loadSchema(schemaRef, path.dirname(fullPath));
  if (!schema) {
    console.warn(`GT-391 WARN: Could not load schema ${schemaRef} for ${relPath}`);
    skipped++;
    continue;
  }

  // Remove $id/$schema to avoid Ajv duplicate-id errors when the same
  // schema is loaded for multiple rulesets.
  const cleanSchema = { ...schema };
  delete cleanSchema.$id;
  delete cleanSchema.$schema;

  const validate = ajv.compile(cleanSchema);
  const valid = validate(ruleset);

  if (valid) {
    passed++;
  } else {
    console.error(`GT-391 FAIL: ${relPath} does not validate against ${schemaRef}`);
    for (const err of validate.errors) {
      console.error(`  ${err.instancePath || "/"}: ${err.message}`);
    }
    failed++;
  }
}

console.log(`\nGT-391: ${passed} passed, ${failed} failed, ${skipped} skipped (of ${rulesets.length} total)`);

if (failed > 0) {
  console.error("GT-391: Schema validation FAILED.");
  process.exit(1);
}

console.log("GT-391: All schemas validated successfully.");
process.exit(0);
