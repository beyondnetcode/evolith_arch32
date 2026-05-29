#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: node .harness/scripts/satellite-sync.mjs <command> [options]

Commands:
  pull <satellite-repo>    Pull latest corporate standards into satellite
  push <satellite-repo>    Push local ADRs to corporate repository
  status                  Show sync status of all configured satellites
  list                    List available corporate artifacts to sync

Options:
  --artifacts <type>   Filter by artifact type (adr, standard, pattern, all)
  --dry-run            Show what would be synced without executing

Examples:
  node .harness/scripts/satellite-sync.mjs pull ../ums-product
  node .harness/scripts/satellite-sync.mjs push ../ums-product --dry-run
  node .harness/scripts/satellite-sync.mjs status
`);
  process.exit(0);
}

const command = args[0];
const repoPath = args[1] ? path.resolve(args[1]) : null;
const dryRun = args.includes("--dry-run");
const artifactFilter = args.includes("--artifacts")
  ? args[args.indexOf("--artifacts") + 1] || "all"
  : "all";

const configPath = path.join(root, ".harness/satellite-sync-config.json");

let config = {
  satellites: [],
  syncHistory: []
};

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function getCorporateArtifacts() {
  const artifacts = [];

  const adrsDir = path.join(root, "reference/architecture/adrs");
  for (const runtime of fs.readdirSync(adrsDir)) {
    const runtimePath = path.join(adrsDir, runtime);
    if (!fs.statSync(runtimePath).isDirectory()) continue;

    for (const file of fs.readdirSync(runtimePath)) {
      if (!file.endsWith(".md") || file.endsWith(".es.md")) continue;
      artifacts.push({
        type: "adr",
        runtime,
        file: `reference/architecture/adrs/${runtime}/${file}`,
        number: file.match(/^(\d+)-/)?.[1] || "0000"
      });
    }
  }

  const standardsDir = path.join(root, "reference/governance/standards");
  if (fs.existsSync(standardsDir)) {
    function walkStandards(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkStandards(full);
        } else if (entry.name.endsWith(".md") && !entry.name.endsWith(".es.md")) {
          const rel = path.relative(root, full);
          artifacts.push({
            type: "standard",
            file: rel,
            category: path.basename(path.dirname(rel))
          });
        }
      }
    }
    walkStandards(standardsDir);
  }

  const patternsDir = path.join(root, "reference/architecture/canonical-patterns");
  if (fs.existsSync(patternsDir)) {
    for (const runtime of fs.readdirSync(patternsDir)) {
      const runtimePath = path.join(patternsDir, runtime);
      if (!fs.statSync(runtimePath).isDirectory()) continue;
      for (const file of fs.readdirSync(runtimePath)) {
        if (!file.endsWith(".md") || file.endsWith(".es.md")) continue;
        artifacts.push({
          type: "pattern",
          runtime,
          file: `reference/architecture/canonical-patterns/${runtime}/${file}`
        });
      }
    }
  }

  return artifacts.filter(a => artifactFilter === "all" || a.type === artifactFilter);
}

function getLocalArtifacts(repoPath) {
  const artifacts = [];

  if (!fs.existsSync(repoPath)) {
    console.error(`Error: Satellite repository not found: ${repoPath}`);
    return artifacts;
  }

  const adrsPath = path.join(repoPath, "docs/adrs");
  if (fs.existsSync(adrsPath)) {
    for (const file of fs.readdirSync(adrsPath)) {
      if (file.endsWith(".md") && !file.endsWith(".es.md")) {
        artifacts.push({ type: "adr", file: `docs/adrs/${file}` });
      }
    }
  }

  return artifacts;
}

if (command === "list") {
  const artifacts = getCorporateArtifacts();
  console.log("\n=== Corporate Artifacts Available ===\n");

  const grouped = { adr: [], standard: [], pattern: [] };
  for (const a of artifacts) {
    grouped[a.type].push(a);
  }

  for (const [type, items] of Object.entries(grouped)) {
    console.log(`### ${type.toUpperCase()}s (${items.length})\n`);
    for (const item of items.slice(0, 10)) {
      console.log(`  - ${item.file}`);
    }
    if (items.length > 10) {
      console.log(`  ... and ${items.length - 10} more`);
    }
    console.log();
  }

  console.log(`Total: ${artifacts.length} artifacts`);
  process.exit(0);
}

if (command === "status") {
  console.log("\n=== Satellite Sync Status ===\n");
  console.log(`Configured satellites: ${config.satellites.length}\n`);

  for (const sat of config.satellites) {
    const lastSync = sat.lastSync ? new Date(sat.lastSync).toLocaleDateString() : "Never";
    console.log(`📁 ${sat.path}`);
    console.log(`   Last synced: ${lastSync}`);
    console.log(`   Sync direction: ${sat.direction || "both"}`);

    if (sat.lastSyncHash) {
      const currentHash = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
      const synced = sat.lastSyncHash === currentHash;
      console.log(`   Up to date: ${synced ? "✅" : "⚠️  Behind corporate"}`);
    }
    console.log();
  }

  process.exit(0);
}

if (command === "pull") {
  if (!repoPath) {
    console.error("Error: Please specify satellite repository path");
    process.exit(1);
  }

  if (!fs.existsSync(repoPath)) {
    console.error(`Error: Satellite repository not found: ${repoPath}`);
    process.exit(1);
  }

  console.log(`\n=== Pull Corporate Standards to Satellite ===\n`);
  console.log(`Satellite: ${repoPath}\n`);

  const corporateArtifacts = getCorporateArtifacts();
  let pulled = 0;
  let skipped = 0;

  for (const artifact of corporateArtifacts) {
    const sourcePath = path.join(root, artifact.file);
    let targetPath;

    if (artifact.type === "adr") {
      targetPath = path.join(repoPath, "docs/adrs", path.basename(artifact.file));
    } else if (artifact.type === "standard") {
      targetPath = path.join(repoPath, "docs/standards", path.basename(artifact.file));
    } else if (artifact.type === "pattern") {
      targetPath = path.join(repoPath, "docs/patterns", path.basename(artifact.file));
    } else {
      continue;
    }

    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      if (!dryRun) fs.mkdirSync(targetDir, { recursive: true });
    }

    if (fs.existsSync(targetPath)) {
      const sourceContent = fs.readFileSync(sourcePath, "utf8");
      const targetContent = fs.readFileSync(targetPath, "utf8");

      if (sourceContent === targetContent) {
        skipped++;
        continue;
      }

      console.log(`  ${dryRun ? "[DRY RUN] " : ""}Update: ${artifact.file}`);
      if (!dryRun) fs.copyFileSync(sourcePath, targetPath);
      pulled++;
    } else {
      console.log(`  ${dryRun ? "[DRY RUN] " : ""}New: ${artifact.file}`);
      if (!dryRun) fs.copyFileSync(sourcePath, targetPath);
      pulled++;
    }
  }

  console.log(`\n${dryRun ? "[DRY RUN] " : ""}Summary: ${pulled} pulled, ${skipped} skipped`);

  if (!dryRun) {
    const sat = config.satellites.find(s => s.path === repoPath);
    if (sat) {
      sat.lastSync = new Date().toISOString();
      sat.lastSyncHash = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
    } else {
      config.satellites.push({
        path: repoPath,
        direction: "pull",
        lastSync: new Date().toISOString(),
        lastSyncHash: execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim()
      });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  }

  process.exit(0);
}

if (command === "push") {
  if (!repoPath) {
    console.error("Error: Please specify satellite repository path");
    process.exit(1);
  }

  console.log(`\n=== Push Local ADRs to Corporate ===\n`);
  console.log(`Note: This operation is typically done via PR to the corporate repository.`);
  console.log(`\nLocal artifacts that could be promoted:\n`);

  const localArtifacts = getLocalArtifacts(repoPath);
  for (const a of localArtifacts.slice(0, 10)) {
    console.log(`  - ${a.file}`);
  }
  if (localArtifacts.length > 10) {
    console.log(`  ... and ${localArtifacts.length - 10} more`);
  }

  console.log("\nTo promote an ADR to corporate, use:");
  console.log("  node .harness/scripts/adr-promotion-push.mjs <adr-file.md> --commit");

  process.exit(0);
}

console.error("Unknown command. Use --help for usage.");
process.exit(1);