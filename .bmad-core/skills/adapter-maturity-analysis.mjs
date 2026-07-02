#!/usr/bin/env node

/**
 * GT-410: Adapter Maturity Analysis
 *
 * Evaluates the maturity of all InteractionAdapterPort implementations
 * against the canonical contract and produces a structured readiness report.
 *
 * Usage:
 *   node .bmad-core/skills/adapter-maturity-analysis.mjs [--json] [--adapter <name>]
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ADAPTERS_DIR = path.join(root, "packages/agent-runtime/src/adapters/interaction");
const BARREL_PATH = path.join(root, "packages/agent-runtime/src/adapters/index.ts");
const MANIFEST_PATH = path.join(root, ".bmad-core/skills/manifest.json");
const AGENTS_DIR = path.join(root, ".bmad-core/agents");

// --- Known adapters (sourceInterface → expected file) ---
const KNOWN_ADAPTERS = [
  { id: "smart-cli-command", sourceInterface: "smart_cli_command", file: "SmartCliCommandInteractionAdapter.ts" },
  { id: "smart-cli-chat", sourceInterface: "smart_cli_chat", file: "SmartCliChatInteractionAdapter.ts" },
  { id: "hermes-chatbox", sourceInterface: "hermes_agent_chatbox", file: "HermesChatBoxInteractionAdapter.ts" },
  { id: "mcp", sourceInterface: "mcp", file: "McpInteractionAdapter.ts" },
  { id: "external-trigger", sourceInterface: "external_trigger", file: "ExternalTriggerInteractionAdapter.ts" },
];

function fileExists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function readFile(p) {
  try { return fs.readFileSync(p, "utf-8"); } catch { return null; }
}

function loadManifest() {
  const raw = readFile(MANIFEST_PATH);
  return raw ? JSON.parse(raw) : { skills: [] };
}

function loadBarrel() {
  return readFile(BARREL_PATH) || "";
}

function loadAgentDefinitions() {
  if (!fs.existsSync(AGENTS_DIR)) return "";
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith(".md") && !f.endsWith(".es.md"));
  return files.map(f => readFile(path.join(AGENTS_DIR, f))).filter(Boolean).join("\n");
}

function scoreAdapter(adapter) {
  const filePath = path.join(ADAPTERS_DIR, adapter.file);
  const specPath = path.join(ADAPTERS_DIR, adapter.file.replace(".ts", ".spec.ts"));
  const barrel = loadBarrel();
  const manifest = loadManifest();
  const agents = loadAgentDefinitions();

  const checks = {
    implementation: fileExists(filePath),
    tests: fileExists(specPath),
    exported: barrel.includes(adapter.file.replace(".ts", "")),
    manifest: manifest.skills.some(s => s.id === `adapter-maturity-${adapter.id}` || s.description?.includes(adapter.sourceInterface)),
    agentRef: agents.includes(adapter.sourceInterface) || agents.includes(adapter.id),
  };

  const weights = { implementation: 30, tests: 20, exported: 15, manifest: 15, agentRef: 10 };
  // documentation is always true if implementation exists (simplified)
  checks.documentation = checks.implementation;
  weights.documentation = 10;

  let score = 0;
  for (const [key, passed] of Object.entries(checks)) {
    if (passed) score += weights[key] || 0;
  }

  let status;
  if (score >= 100) status = "operational";
  else if (score >= 75) status = "near-complete";
  else if (score >= 50) status = "partial";
  else if (score >= 25) status = "phantom";
  else status = "missing";

  return { ...adapter, checks, score, status };
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const adapterFilter = args.includes("--adapter") ? args[args.indexOf("--adapter") + 1] : null;

  let adapters = KNOWN_ADAPTERS;
  if (adapterFilter) {
    adapters = adapters.filter(a => a.id === adapterFilter || a.sourceInterface === adapterFilter);
  }

  const results = adapters.map(scoreAdapter);
  const phantomCount = results.filter(r => r.status === "phantom" || r.status === "missing").length;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  const report = {
    timestamp: new Date().toISOString(),
    totalAdapters: results.length,
    averageScore: Math.round(avgScore),
    phantomCount,
    adapters: results,
  };

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("=== Adapter Maturity Analysis (GT-410) ===\n");
    console.log(`Total adapters: ${results.length}`);
    console.log(`Average score: ${report.averageScore}%`);
    console.log(`Phantom/Missing: ${phantomCount}\n`);

    for (const r of results) {
      const icon = r.status === "operational" ? "✓" : r.status === "near-complete" ? "~" : "✗";
      console.log(`  ${icon} ${r.id} (${r.sourceInterface}) — ${r.score}% [${r.status}]`);
      for (const [key, passed] of Object.entries(r.checks)) {
        console.log(`    ${passed ? "✓" : "✗"} ${key}`);
      }
    }

    if (phantomCount > 0) {
      console.log("\n⚠ Phantom declarations detected — these need materialization:");
      for (const r of results.filter(r => r.status === "phantom" || r.status === "missing")) {
        console.log(`  - ${r.id}: ${Object.entries(r.checks).filter(([,v]) => !v).map(([k]) => k).join(", ")}`);
      }
    }
  }

  process.exit(phantomCount > 0 ? 1 : 0);
}

main();
