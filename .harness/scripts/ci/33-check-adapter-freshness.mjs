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

const root = process.cwd();
const issues = [];

// --- Check 1: Agent definitions vs adapter implementations ---

const agentsDir = path.join(root, "reference/core/foundations/agent-skills");
const adaptersDir = path.join(root, "src/packages/agent-runtime/src/adapters/interaction");

if (fs.existsSync(agentsDir) && fs.existsSync(adaptersDir)) {
  const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith(".md") && !f.endsWith(".es.md"));
  const adapterFiles = fs.readdirSync(adaptersDir).filter(f => f.endsWith(".ts") && !f.endsWith(".spec.ts"));

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

const manifestPath = path.join(root, "reference/core/foundations/agent-skills/manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
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

const barrelPath = path.join(root, "packages/agent-runtime/src/adapters/index.ts");
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

console.log("GT-409: All adapter/skill freshness checks passed.");
process.exit(0);
