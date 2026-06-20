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

const scripts = fs.readdirSync(ciDir)
  .filter(file => file.endsWith(".mjs") && /^\d{2}-/.test(file))
  .sort();

console.log(`🚀 Starting Evolith CI Runner... Found ${scripts.length} validation scripts.`);
console.log("══════════════════════════════════════════════════════════════════════");

let failures = 0;

for (const script of scripts) {
  const scriptPath = path.join(ciDir, script);
  console.log(`\n▶️ Running: ${script}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    console.error(`\n❌ Step failed: ${script} (Exit Code: ${result.status})`);
    failures++;
    break; // Fail fast on CI
  }
  console.log(`✅ Step completed: ${script}`);
}

console.log("\n══════════════════════════════════════════════════════════════════════");
if (failures > 0) {
  console.error("❌ CI Pipeline Failed.");
  process.exit(1);
} else {
  console.log("✅ CI Pipeline Passed successfully!");
  process.exit(0);
}
