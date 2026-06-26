#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const ciDir = path.join(root, ".harness/scripts/ci");

if (!fs.existsSync(ciDir)) {
  console.error(`CI directory not found: ${ciDir}`);
  process.exit(1);
}

const mode = process.argv[2] || "fast";

const allScripts = fs.readdirSync(ciDir)
  .filter(file => file.endsWith(".mjs") && /^\d{2}-/.test(file))
  .sort();

const MODES = {
  fast: {
    label: "RAPIDO (docs + tracking)",
    scripts: ["01-validate-docs.mjs", "03-validate-root-cleanliness.mjs", "04-check-bilingual-parity.mjs", "05-validate-executive-summary.mjs", "08-validate-tracking.mjs"],
  },
  governance: {
    label: "GOBERNANZA (docs + tracking + maturity + contracts)",
    scripts: ["01-validate-docs.mjs", "03-validate-root-cleanliness.mjs", "04-check-bilingual-parity.mjs", "05-validate-executive-summary.mjs", "08-validate-tracking.mjs", "09-reconcile-maturity.mjs", "10-validate-contract-conformance.mjs", "22-validate-topology-composition.mjs", "23-check-orphan-bilingual.mjs", "29-validate-opa-sidecar-bundles.mjs"],
  },
  full: {
    label: "COMPLETO (todos los scripts)",
    scripts: allScripts,
  },
  auto: {
    label: "AUTOMATICO (detecta archivos cambiados)",
    scripts: null,
  },
};

function getAutoScripts() {
  const result = spawnSync("git", ["diff", "--cached", "--name-only"], { cwd: root, encoding: "utf8" });
  const changed = (result.stdout || "").split("\n").filter(Boolean);

  const docsChanged = changed.some(f => f.endsWith(".md"));
  const trackingChanged = changed.some(f => f.includes("gap-tracking") || f.includes("gap-reference") || f.includes("gap-closure"));
  const topologyChanged = changed.some(f => f.includes("topologies/"));
  const governanceChanged = changed.some(f => f.includes("rulesets/") || f.includes("reference/governance/"));
  const codeChanged = changed.some(f => f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".mjs"));
  const infraChanged = changed.some(f => f.includes("docker-compose") || f.includes("helm/") || f.includes(".github/workflows"));

  const scripts = ["01-validate-docs.mjs", "03-validate-root-cleanliness.mjs"];

  if (docsChanged) {
    scripts.push("04-check-bilingual-parity.mjs");
    scripts.push("23-check-orphan-bilingual.mjs");
  }
  if (trackingChanged || governanceChanged) {
    scripts.push("08-validate-tracking.mjs");
    scripts.push("09-reconcile-maturity.mjs");
  }
  if (docsChanged || governanceChanged) {
    scripts.push("05-validate-executive-summary.mjs");
  }
  if (topologyChanged) {
    scripts.push("22-validate-topology-composition.mjs");
    scripts.push("26-validate-topology-rule-coverage.mjs");
  }
  if (codeChanged) {
    scripts.push("10-validate-contract-conformance.mjs");
    scripts.push("11-validate-product-docs.mjs");
    scripts.push("19-validate-rest-versioning.mjs");
    scripts.push("20-validate-surface-compatibility.mjs");
  }
  if (infraChanged) {
    scripts.push("07-generate-inventories.mjs");
    scripts.push("29-validate-opa-sidecar-bundles.mjs");
  }

  return [...new Set(scripts)];
}

let scriptsToRun;
if (mode === "auto") {
  scriptsToRun = getAutoScripts();
} else if (MODES[mode]) {
  scriptsToRun = MODES[mode].scripts;
} else if (mode === "--help" || mode === "-h") {
  console.log("Usage: ci-runner.mjs [mode]");
  console.log("");
  console.log("Modes:");
  console.log("  fast        Docs + tracking validation (~2s)");
  console.log("  governance  Docs + tracking + maturity + contracts (~3s)");
  console.log("  full        All 30 CI scripts (~6-8s)");
  console.log("  auto        Detect changed files, run relevant scripts (~1-3s)");
  console.log("  --help      Show this help");
  process.exit(0);
} else {
  console.error(`Unknown mode: ${mode}. Use --help for available modes.`);
  process.exit(1);
}

if (scriptsToRun.length === 0) {
  console.log("No relevant scripts to run for the changed files.");
  process.exit(0);
}

const modeLabel = mode === "auto" ? `AUTOMATICO (${scriptsToRun.length} scripts)` : MODES[mode].label;
console.log(`🚀 Evolith CI — ${modeLabel}`);
console.log(`══════════════════════════════════════════════════════════════════════`);

let failures = 0;

for (const script of scriptsToRun) {
  const scriptPath = path.join(ciDir, script);
  if (!fs.existsSync(scriptPath)) continue;

  console.log(`\n▶️ Running: ${script}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    console.error(`\n❌ Step failed: ${script} (Exit Code: ${result.status})`);
    failures++;
    break;
  }
  console.log(`✅ Step completed: ${script}`);
}

console.log(`\n══════════════════════════════════════════════════════════════════════`);
if (failures > 0) {
  console.error("❌ CI Pipeline Failed.");
  process.exit(1);
} else {
  console.log(`✅ CI Pipeline Passed! (${scriptsToRun.length} scripts executed)`);
  process.exit(0);
}
