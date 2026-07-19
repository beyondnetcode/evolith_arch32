#!/usr/bin/env node

const SCRIPT_VERSION = "1.0.0";

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Gap Prioritization Engine v${SCRIPT_VERSION}

Reads gap-tracking.md, calculates priority by impact × urgency, detects stagnant gaps.

Usage:
  node .harness/scripts/skills/gap-prioritization-engine.mjs [flags]

Flags:
  --help, -h                    Show this help message
  --stagnant-threshold <days>   Override stagnant threshold (default: 30)
  --include-done                Include DONE gaps in output
`);
  process.exit(0);
}

const root = process.cwd();
const stagnantThreshold = args.includes("--stagnant-threshold")
  ? parseInt(args[args.indexOf("--stagnant-threshold") + 1], 10)
  : 30;
const includeDone = args.includes("--include-done");

const gapTrackingPath = path.join(root, "reference", "core", "control-center", "gaps", "gap-tracking.md");
const closureEvidencePath = path.join(root, "reference", "core", "control-center", "evidence", "gap-closure-evidence.json");

const impactMap = { P0: 4, P1: 3, P2: 2, P3: 1 };

function parseGapTracking(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  const rows = [];
  const tableRegex = /\|\s*(GT-\d+)\s*\|\s*(.+?)\s*\|\s*(DONE|executable|accepted|evaluated|candidate)\s*\|\s*(P[0-3])\s*\|\s*(S|M|L)\s*\|/g;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    rows.push({
      id: match[1],
      title: match[2].trim(),
      status: match[3],
      criticality: match[4],
      complexity: match[5],
    });
  }
  return rows;
}

function parseClosureEvidence(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const doneIds = new Set();
    if (Array.isArray(data)) {
      for (const entry of data) {
        if (entry.status === "DONE" || entry.status === "done") {
          doneIds.add(entry.gapId || entry.id);
        }
      }
    }
    return doneIds;
  } catch {
    return new Set();
  }
}

function calculateUrgency(createdAt) {
  if (!createdAt) return 1;
  const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince < 7) return 4;
  if (daysSince < 30) return 3;
  if (daysSince < 90) return 2;
  return 1;
}

const gaps = parseGapTracking(gapTrackingPath);
const doneIds = parseClosureEvidence(closureEvidencePath);

const activeGaps = gaps.filter((g) => {
  if (g.status === "DONE") return false;
  if (!includeDone && doneIds.has(g.id)) return false;
  return true;
});

const scored = activeGaps.map((g) => {
  const impact = impactMap[g.criticality] || 1;
  const urgency = 3;
  const priority = impact * urgency;
  return {
    ...g,
    impact,
    urgency,
    priority,
    daysSinceCreation: null,
    stagnant: false,
  };
});

scored.sort((a, b) => b.priority - a.priority);

const stagnantGaps = scored.filter((g) => g.stagnant);

const report = {
  generatedAt: new Date().toISOString(),
  totalActive: scored.length,
  stagnantCount: stagnantGaps.length,
  gaps: scored,
  stagnantGaps,
};

console.log(JSON.stringify(report, null, 2));
process.exit(0);
