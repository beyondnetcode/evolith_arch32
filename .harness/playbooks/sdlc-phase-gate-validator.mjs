#!/usr/bin/env node

/**
 * SDLC Phase/Gate Validator
 *
 * Checks that every phase file, gate file, and Rego reference exists
 * and that every required artifact has at least one rule associated.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const phasesDir = "reference/governance/sdlc/phases";
const gatesDir = "reference/governance/sdlc/gates";

let exitCode = 0;
const errors = [];
const ok = [];

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

// ── 1. Validate phase files ──────────────────────────────────────────

const phaseFiles = fs.readdirSync(path.join(root, phasesDir))
  .filter(f => f.endsWith(".json"))
  .sort();

if (phaseFiles.length === 0) {
  errors.push("No phase JSON files found");
}

for (const f of phaseFiles) {
  const raw = fs.readFileSync(path.join(root, phasesDir, f), "utf8");
  try {
    const phase = JSON.parse(raw);
    const expected = ["id", "name", "shortName", "order", "description", "gates"];
    for (const key of expected) {
      if (!(key in phase)) errors.push(`${f}: missing required field "${key}"`);
    }
    if (phase.gates) {
      for (const g of phase.gates) {
        const gf = `${g}.json`;
        if (!exists(`${gatesDir}/${gf}`)) {
          errors.push(`${f}: references gate "${gf}" but file not found in ${gatesDir}/`);
        }
      }
    }
    ok.push(`phase: ${f} ✓`);
  } catch (e) {
    errors.push(`${f}: invalid JSON — ${e.message}`);
  }
}

// ── 2. Validate gate files ───────────────────────────────────────────

const gateFiles = fs.readdirSync(path.join(root, gatesDir))
  .filter(f => f.endsWith(".json"))
  .sort();

if (gateFiles.length === 0) {
  errors.push("No gate JSON files found");
}

const allRuleRefs = new Set();
const pathRuleRefs = new Set();

function looksLikePathReference(ref) {
  return ref.includes("/") || ref.endsWith(".rego") || ref.endsWith(".json");
}

for (const f of gateFiles) {
  const raw = fs.readFileSync(path.join(root, gatesDir, f), "utf8");
  try {
    const gate = JSON.parse(raw);
    const expected = ["id", "name", "phase", "description", "requiredArtifacts", "blockingCriteria"];
    for (const key of expected) {
      if (!(key in gate)) errors.push(`${f}: missing required field "${key}"`);
    }
    if (gate.requiredArtifacts) {
      for (const art of gate.requiredArtifacts) {
        if (!art.rules || art.rules.length === 0) {
          errors.push(`${f}: artifact "${art.artifact}" has no Rego rules`);
        }
        for (const rule of (art.rules || [])) {
          if (typeof rule !== "string" || !rule.trim()) {
            errors.push(`${f}: artifact "${art.artifact}" has an empty rule reference`);
          } else if (looksLikePathReference(rule) && !exists(rule)) {
            errors.push(`${f}: artifact "${art.artifact}" references rego "${rule}" but file not found`);
          } else {
            allRuleRefs.add(rule);
            if (looksLikePathReference(rule)) pathRuleRefs.add(rule);
          }
        }
      }
    }
    ok.push(`gate: ${f} ✓`);
  } catch (e) {
    errors.push(`${f}: invalid JSON — ${e.message}`);
  }
}

// ── 3. Summary ──────────────────────────────────────────────────────

console.log("\n========================================");
console.log("SDLC Phase/Gate Cross-Reference Validator");
console.log("========================================\n");

for (const m of ok) console.log(`  ${m}`);
console.log();

if (errors.length > 0) {
  console.error(`  ❌ ${errors.length} error(s):\n`);
  for (const e of errors) console.error(`    - ${e}`);
  exitCode = 1;
} else {
  console.log(`  ✅ All ${phaseFiles.length} phases and ${gateFiles.length} gates valid.`);
  console.log(`     ${allRuleRefs.size} unique rule reference(s) declared.`);
  console.log(`     ${pathRuleRefs.size} path-like rule reference(s) checked on disk.`);
}

console.log();
process.exit(exitCode);
