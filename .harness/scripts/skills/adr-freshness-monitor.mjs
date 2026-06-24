#!/usr/bin/env node

const SCRIPT_VERSION = "1.0.0";

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
ADR Freshness Monitor v${SCRIPT_VERSION}

Scans all ADRs and reports staleness based on last git modification date.
This skill wraps the existing adr-freshness-monitor.mjs with a skill contract layer.

Usage:
  node .harness/scripts/skills/adr-freshness-monitor.mjs [flags]

Flags:
  --help, -h                      Show this help message
  --stale-threshold <days>        Override stale threshold (default: 180)
  --critical-threshold <days>     Override critical threshold (default: 365)
`);
  process.exit(0);
}

const root = process.cwd();
const staleThreshold = args.includes("--stale-threshold")
  ? parseInt(args[args.indexOf("--stale-threshold") + 1], 10)
  : 180;
const criticalThreshold = args.includes("--critical-threshold")
  ? parseInt(args[args.indexOf("--critical-threshold") + 1], 10)
  : 365;

const adrsDir = path.join(root, "reference", "architecture", "adrs");

function collectAdrFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.name.endsWith(".md") &&
        !entry.name.endsWith(".es.md") &&
        entry.name !== "README.md" &&
        entry.name !== "adr-matrix.md" &&
        entry.name !== "adr-authoring-standard.md" &&
        /^\d{4}-/.test(entry.name)
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function getLastModifiedDate(filePath) {
  try {
    const output = execSync(
      `git log -1 --format=%ad --date=iso -- "${filePath}"`,
      { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (!output) return null;
    return new Date(output);
  } catch {
    return null;
  }
}

function classifyStatus(daysSince) {
  if (daysSince > criticalThreshold) return "critical";
  if (daysSince > staleThreshold) return "stale";
  return "healthy";
}

const adrFiles = collectAdrFiles(adrsDir);
const now = new Date();

const entries = adrFiles
  .map((file) => {
    const relPath = path.relative(root, file);
    const lastModified = getLastModifiedDate(file);
    if (!lastModified) {
      return { file: relPath, lastModified: null, daysSinceModification: null, status: "unknown" };
    }
    const daysSince = Math.floor((now - lastModified) / (1000 * 60 * 60 * 24));
    return {
      file: relPath,
      lastModified: lastModified.toISOString(),
      daysSinceModification: daysSince,
      status: classifyStatus(daysSince),
    };
  })
  .sort((a, b) => {
    const numA = parseInt(path.basename(a.file).match(/^(\d+)/)?.[1] || "0", 10);
    const numB = parseInt(path.basename(b.file).match(/^(\d+)/)?.[1] || "0", 10);
    return numA - numB;
  });

const critical = entries.filter((e) => e.status === "critical");
const stale = entries.filter((e) => e.status === "stale");
const healthy = entries.filter((e) => e.status === "healthy");

const report = {
  generatedAt: now.toISOString(),
  totalAdrs: entries.length,
  stale,
  critical,
  healthy,
  summary: {
    total: entries.length,
    staleCount: stale.length,
    criticalCount: critical.length,
    healthyCount: healthy.length,
  },
};

console.log(JSON.stringify(report, null, 2));
process.exit(0);
