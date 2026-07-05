#!/usr/bin/env node

/**
 * GT-424: Skill registry parity guard.
 *
 * Enforces the single source of truth across the three skill surfaces so they
 * cannot silently diverge again:
 *
 *   1. `.harness/manifest.yaml`  — CANONICAL registry of executable harness
 *      capabilities (validators/audits/skills/playbooks). The runtime discovers
 *      and runs only what is declared here.
 *   2. `reference/core/foundations/agent-skills/manifest.json` — agent-facing
 *      metadata VIEW. Every skill whose implementation lives under
 *      `.harness/scripts/skills/` MUST map to a capability `entry` in (1).
 *   3. `DEFAULT_SKILLS` (agent-runtime `default-skills.ts`) — INTENT→capability
 *      routing layer. Every `harnessCapability` MUST resolve to a capability
 *      `name` in (1).
 *
 * Exit 0 if all registries are in parity, 1 otherwise.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const issues = [];

const manifestYamlPath = path.join(root, ".harness/manifest.yaml");
const manifestJsonPath = path.join(
  root,
  "reference/core/foundations/agent-skills/manifest.json",
);
const defaultSkillsPath = path.join(
  root,
  "src/packages/agent-runtime/src/adapters/skills/default-skills.ts",
);

/**
 * Minimal parser for the `.harness/manifest.yaml` capability list. The file is
 * flat, machine-generated-shaped YAML: each capability is a `  - name:` block at
 * 2-space indent with sibling keys at 4-space indent. We only need `name` and
 * `entry`, so a dependency-free line scan is sufficient (matches 33-check style).
 */
function parseHarnessManifest(text) {
  const caps = [];
  let current = null;
  let inCapabilities = false;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (/^capabilities:\s*$/.test(line)) {
      inCapabilities = true;
      continue;
    }
    if (!inCapabilities) continue;
    // A new top-level key at column 0 ends the capabilities block.
    if (/^\S/.test(line)) {
      inCapabilities = false;
      continue;
    }

    const nameStart = line.match(/^\s*-\s+name:\s*(.+?)\s*$/);
    if (nameStart) {
      if (current) caps.push(current);
      current = { name: unquote(nameStart[1]), entry: null };
      continue;
    }
    if (!current) continue;
    const entryMatch = line.match(/^\s+entry:\s*(.+?)\s*$/);
    if (entryMatch) current.entry = unquote(entryMatch[1]);
  }
  if (current) caps.push(current);
  return caps;
}

function unquote(v) {
  return v.replace(/^['"]|['"]$/g, "").trim();
}

// --- Load registries ---

if (!fs.existsSync(manifestYamlPath)) {
  console.error(`GT-424: canonical registry missing: ${manifestYamlPath}`);
  process.exit(1);
}

const caps = parseHarnessManifest(fs.readFileSync(manifestYamlPath, "utf-8"));
const capNames = new Set(caps.map((c) => c.name).filter(Boolean));
const capEntries = new Set(caps.map((c) => c.entry).filter(Boolean));

// --- Check 1: manifest.json harness-backed skills ⊆ manifest.yaml entries ---

if (fs.existsSync(manifestJsonPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, "utf-8"));
  for (const skill of manifest.skills || []) {
    if (!skill.file) continue;
    const normalized = skill.file.replace(/^\.\//, "");
    if (!normalized.startsWith(".harness/scripts/skills/")) continue; // agent-local skill, not a harness capability
    if (!capEntries.has(normalized) && !capEntries.has(`./${normalized}`)) {
      issues.push(
        `Skill '${skill.id}' runs harness script '${skill.file}' but no .harness/manifest.yaml capability declares it as an 'entry'.`,
      );
    }
  }
} else {
  issues.push(`agent-skills manifest missing: ${manifestJsonPath}`);
}

// --- Check 2: DEFAULT_SKILLS harnessCapability ⊆ manifest.yaml names ---

if (fs.existsSync(defaultSkillsPath)) {
  const src = fs.readFileSync(defaultSkillsPath, "utf-8");
  const refs = [...src.matchAll(/harnessCapability:\s*['"]([^'"]+)['"]/g)].map(
    (m) => m[1],
  );
  for (const ref of refs) {
    if (!capNames.has(ref)) {
      issues.push(
        `DEFAULT_SKILLS references harnessCapability '${ref}' which is not declared as a capability 'name' in .harness/manifest.yaml.`,
      );
    }
  }
} else {
  issues.push(`default-skills.ts missing: ${defaultSkillsPath}`);
}

// --- Report ---

if (issues.length > 0) {
  console.error("GT-424: Skill registry parity FAILED — divergence detected:");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log(
  `GT-424: Skill registry parity OK — ${capNames.size} capabilities declared; manifest.json and DEFAULT_SKILLS resolve cleanly.`,
);
process.exit(0);
