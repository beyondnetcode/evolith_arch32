#!/usr/bin/env node

/**
 * GT-390 CI Guard: Detect duplicate *.rules.json files with the same basename
 * but different $id values. Two files with the same name can silently diverge
 * and consumers may load the wrong one.
 *
 * Exit 1 if duplicates found, 0 otherwise.
 */

import fs from "node:fs";
import path from "node:path";

// GT-556/557: this scanned `rulesets/` (no `src/` prefix). That directory EXISTS but
// contains only `agents/` — zero `.rules.json`. So the duplicate detector has been
// reporting "no duplicates found" while inspecting an empty corpus, and the existsSync
// guard above passed happily because the wrong directory was a real directory.
// The real corpus is `src/rulesets` (145 rulesets).
import { resolve as resolveKey, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const rulesetsDir = resolveKey("rulesets");

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

const rulesets = findRulesets(rulesetsDir);
assertScanned(rulesets.length, { what: "rulesets (*.rules.json)", where: relativeToRoot(rulesetsDir) });

// Group by basename
const byBasename = new Map();
for (const r of rulesets) {
  const basename = path.basename(r.relPath);
  if (!byBasename.has(basename)) byBasename.set(basename, []);
  byBasename.get(basename).push(r);
}

let failed = false;

for (const [basename, files] of byBasename) {
  if (files.length <= 1) continue;

  // Read $id from each file
  const entries = files.map((f) => {
    try {
      const content = JSON.parse(fs.readFileSync(f.fullPath, "utf-8"));
      return { relPath: f.relPath, id: content.$id || null };
    } catch {
      return { relPath: f.relPath, id: null };
    }
  });

  // Check if $id values differ
  const ids = entries.map((e) => e.id).filter(Boolean);
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length > 1) {
    console.error(`GT-390 FAIL: Duplicate ruleset "${basename}" with different $id values:`);
    for (const e of entries) {
      console.error(`  ${e.relPath}  ($id: ${e.id || "missing"})`);
    }
    failed = true;
  } else if (entries.length > 1) {
    console.warn(`GT-390 WARN: Duplicate ruleset "${basename}" (${entries.length} copies, same $id):`);
    for (const e of entries) {
      console.warn(`  ${e.relPath}`);
    }
  }
}

if (failed) {
  console.error("\nGT-390: Duplicate rulesets with divergent $id detected. Consolidate to one canonical location.");
  process.exit(1);
}

console.log("GT-390: No duplicate rulesets with divergent $id found.");
process.exit(0);
