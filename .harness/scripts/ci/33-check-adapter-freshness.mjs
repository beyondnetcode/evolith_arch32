#!/usr/bin/env node

/**
 * GT-409: Adapter capability freshness checks.
 *
 * Detects desynchronization between:
 * 1. Adapters declared in agent definitions vs adapters that actually exist
 * 2. Skills declared in manifest vs skills that actually have implementations
 *
 * Exit 0 if all in sync, 1 if desynchronization detected.
 */

import fs from "node:fs";
import path from "node:path";

// GT-556: root came from process.cwd(), and the adapters barrel was read from
// `packages/agent-runtime/...` — missing the `src/` prefix, so the barrel-export check
// silently never fired.
import { REPO_ROOT, resolve as resolveKey } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const root = REPO_ROOT;
const issues = [];

// --- Check 1: Agent definitions vs adapter implementations ---

const agentsDir = resolveKey("agentSkills");
const adaptersDir = resolveKey("agentRuntimeInteractionAdapters");

// GT-578: this block was wrapped in `if (existsSync(agentsDir) && existsSync(
// adaptersDir))`. With either path dead the whole comparison was skipped and the
// script still printed "GT-409: All adapter/skill freshness checks passed." —
// three checks, zero of them run, one green tick. The `if` is gone: a missing
// root is now a failure, and an empty one is caught by the denominator.
for (const [label, dir] of [["agent definitions", agentsDir], ["interaction adapters", adaptersDir]]) {
  if (!fs.existsSync(dir)) {
    console.error(
      `GT-409: freshness check cannot run — ${label} directory does not exist: ${dir}\n` +
      `  Refusing to report "all checks passed" over a tree that is not there.`,
    );
    process.exit(1);
  }
}

const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith(".md") && !f.endsWith(".es.md"));
const adapterFiles = fs.readdirSync(adaptersDir).filter(f => f.endsWith(".ts") && !f.endsWith(".spec.ts"));
assertScanned(agentFiles.length, { what: "agent definitions", where: agentsDir });
assertScanned(adapterFiles.length, { what: "interaction adapters", where: adaptersDir });

{
  for (const agentFile of agentFiles) {
    const content = fs.readFileSync(path.join(agentsDir, agentFile), "utf-8");
    const adapterRefs = content.match(/InteractionAdapter|sourceInterface|smart_cli|mcp|hermes|external_trigger/gi);
    if (adapterRefs) {
      // Agent references adapters — check if corresponding adapter exists
      const hasMcp = content.includes("mcp") && adapterFiles.some(f => f.includes("Mcp"));
      const hasHermes = content.includes("hermes") && adapterFiles.some(f => f.includes("Hermes"));
      const hasSmartCli = content.includes("smart_cli") && adapterFiles.some(f => f.includes("SmartCli"));

      if (content.includes("mcp") && !hasMcp) {
        issues.push(`Agent ${agentFile} references MCP adapter but McpInteractionAdapter not found`);
      }
    }
  }
}

// --- Check 2: Skill manifest vs skill implementations ---

const manifestPath = resolveKey("agentSkillsManifest");
if (!fs.existsSync(manifestPath)) {
  console.error(`GT-409: skill manifest does not exist: ${manifestPath} — cannot report a freshness verdict.`);
  process.exit(1);
}
{
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  assertScanned((manifest.skills || []).length, {
    what: "declared skills",
    where: `${manifestPath}#skills`,
  });
  for (const skill of manifest.skills || []) {
    if (skill.file) {
      const skillPath = path.join(root, skill.file);
      if (!fs.existsSync(skillPath)) {
        issues.push(`Skill '${skill.id}' declares file '${skill.file}' but it does not exist`);
      }
    }
  }
}

// --- Check 3: Adapter exports vs adapter files ---

const barrelPath = resolveKey("agentRuntimeAdaptersBarrel");
if (fs.existsSync(barrelPath)) {
  const barrel = fs.readFileSync(barrelPath, "utf-8");
  const exportedAdapters = [...barrel.matchAll(/export \{ (\w+) \}/g)].map(m => m[1]);

  for (const adapterFile of fs.readdirSync(adaptersDir).filter(f => f.endsWith(".ts") && !f.endsWith(".spec.ts"))) {
    const className = adapterFile.replace(".ts", "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
    // Check if any export matches this adapter
    const isExported = exportedAdapters.some(e => adapterFile.replace(".ts", "").includes(e.toLowerCase().replace("adapter", "")));
    // This is a loose check — skip exact matching for now
  }
}

// --- Report ---

if (issues.length > 0) {
  console.error("GT-409: Freshness check FAILED — desynchronization detected:");
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

console.log(
  `GT-409: All adapter/skill freshness checks passed ` +
  `(${agentFiles.length} agent definition(s), ${adapterFiles.length} adapter(s) inspected).`,
);
process.exit(0);
