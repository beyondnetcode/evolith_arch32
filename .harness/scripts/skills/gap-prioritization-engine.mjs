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

/**
 * Split a Markdown table row into its cells, mirroring
 * `.harness/scripts/ci/08-validate-tracking.mjs`.
 *
 * Only the empties produced by the leading and trailing pipes are dropped;
 * interior blanks keep their position. Dropping them (e.g. via `.filter(Boolean)`)
 * shifts every column after an unfilled cell, and the board has many of those.
 */
function splitRow(line) {
  const cells = line.split(/(?<!\\)\|/).map((cell) => cell.trim());
  if (cells.length && cells[0] === "") cells.shift();
  if (cells.length && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

function cellText(cell) {
  return (cell || "").replaceAll("`", "").trim();
}

/**
 * Read the board positionally off its header row (UP-001 Amendment 1 schema:
 * ID | Gap | What it means | Example | Component | Phase | Criticality | Complexity | Status),
 * rather than by a fixed-shape regex. Column order changes with the schema, so the
 * indices are resolved from the header each run.
 */
function parseGapTracking(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  const rows = [];
  let cols = null;
  let inTable = false;

  for (const line of content.split("\n")) {
    if (line.startsWith("| ID |")) {
      inTable = true;
      const headers = splitRow(line).map((header) => header.toLowerCase());
      const indexOf = (name) => headers.findIndex((header) => header.includes(name));
      const status = indexOf("status");
      cols = {
        title: indexOf("gap"),
        status: status === -1 ? headers.length - 1 : status,
        criticality: indexOf("criticality"),
        complexity: indexOf("complexity"),
      };
      continue;
    }
    if (!inTable) continue;
    if (line.startsWith("|---|")) continue;
    // The board may span several tables (e.g. an active table plus a <details>
    // archive). A non-table line closes the current one; a later header re-opens.
    if (!line.trim().startsWith("|")) { inTable = false; continue; }

    const cells = splitRow(line);
    const idMatch = cells[0]?.match(/`(GT-\d+|MT-A\d+)`/);
    if (!idMatch || cells.length <= cols.status) continue;

    rows.push({
      id: idMatch[1],
      title: cellText(cells[cols.title]).slice(0, 200),
      status: cellText(cells[cols.status]).toUpperCase(),
      criticality: cellText(cells[cols.criticality]) || null,
      complexity: cellText(cells[cols.complexity]) || null,
    });
  }

  return rows;
}

function parseClosureEvidence(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    // The registry is `{ closures: [...] }`; the presence of a record IS the
    // closure claim — the records carry no `status` field.
    const entries = Array.isArray(data) ? data : (data?.closures ?? []);
    const doneIds = new Set();
    for (const entry of entries) {
      const id = entry?.id || entry?.gapId;
      if (id) doneIds.add(id);
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
