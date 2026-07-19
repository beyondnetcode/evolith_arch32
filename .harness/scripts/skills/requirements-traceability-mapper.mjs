#!/usr/bin/env node

const SCRIPT_VERSION = "1.0.0";

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Requirements Traceability Mapper v${SCRIPT_VERSION}

Maps epics/stories to ADRs, rulesets, and tests. Detects orphan requirements.

Usage:
  node .harness/scripts/skills/requirements-traceability-maps.mjs [flags]

Flags:
  --help, -h              Show this help message
  --format json|md        Output format (default: json)
  --story-dir <path>      Override story directory (default: docs/planning-artifacts/)
`);
  process.exit(0);
}

const root = process.cwd();
const format = args.includes("--format") ? args[args.indexOf("--format") + 1] : "json";
const storyDirIdx = args.indexOf("--story-dir");
const storyDir = storyDirIdx !== -1 ? args[storyDirIdx + 1] : path.join(root, "docs", "planning-artifacts");
const adrsDir = path.join(root, "reference", "core", "architecture", "adrs", "core");
// `reference/governance/standards/` was dissolved by the taxonomy refactor
// (e16120e9): the engineering/communication/ai-augmented standards corpus
// landed under `reference/core/foundations/common-rules/`. Note this is NOT
// `reference/core/sdlc/standards` -- that path does not exist.
const rulesDir = path.join(root, "reference", "core", "foundations", "common-rules");

function collectMarkdownFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.name.endsWith(".md") && !entry.name.endsWith(".es.md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractAdrLinks(content) {
  const matches = content.match(/ADR-\d{4}/g) || [];
  return [...new Set(matches)];
}

function extractRuleLinks(content) {
  const matches = content.match(/R-\d{1,3}/g) || [];
  return [...new Set(matches)];
}

function extractStoryId(filename) {
  const match = filename.match(/^(\d{3,})/);
  return match ? `STORY-${match[1]}` : path.basename(filename, ".md");
}

const storyFiles = collectMarkdownFiles(storyDir);
const adrFiles = collectMarkdownFiles(adrsDir);
const ruleFiles = collectMarkdownFiles(rulesDir);

const adrIds = new Set();
for (const f of adrFiles) {
  const match = path.basename(f).match(/^(\d{4})/);
  if (match) adrIds.add(`ADR-${match[1]}`);
}

const ruleIds = new Set();
for (const f of ruleFiles) {
  const content = fs.readFileSync(f, "utf8");
  const matches = content.match(/R-\d{1,3}/g) || [];
  matches.forEach((m) => ruleIds.add(m));
}

const matrix = [];
const orphans = [];

for (const storyFile of storyFiles) {
  const content = fs.readFileSync(storyFile, "utf8");
  const storyId = extractStoryId(storyFile);
  const title = content.match(/^#\s+(.+)$/m)?.[1] || path.basename(storyFile);
  const linkedAdrs = extractAdrLinks(content).filter((a) => adrIds.has(a));
  const linkedRules = extractRuleLinks(content).filter((r) => ruleIds.has(r));
  const hasTestRef = /test|spec|assert/i.test(content);

  const missingLinks = [];
  if (linkedAdrs.length === 0) missingLinks.push("adr");
  if (linkedRules.length === 0) missingLinks.push("rule");

  const status = missingLinks.length === 0 && hasTestRef ? "complete" : "incomplete";

  const entry = {
    storyId,
    title: title.trim(),
    linkedAdrs,
    linkedRules,
    hasTestRef,
    status,
  };

  matrix.push(entry);

  if (missingLinks.length > 0) {
    orphans.push({
      storyId,
      title: title.trim(),
      missingLinks,
      severity: missingLinks.length >= 2 ? "error" : "warning",
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totalStories: storyFiles.length,
  linked: matrix.filter((m) => m.status === "complete").length,
  orphans: orphans.length,
  matrix,
  orphanReport: orphans,
};

if (format === "md") {
  console.log("# Requirements Traceability Report\n");
  console.log(`| Story | ADRs | Rules | Test | Status |`);
  console.log(`|-------|------|-------|------|--------|`);
  for (const m of matrix) {
    const testIcon = m.hasTestRef ? "yes" : "no";
    console.log(`| ${m.storyId} | ${m.linkedAdrs.join(", ") || "-"} | ${m.linkedRules.join(", ") || "-"} | ${testIcon} | ${m.status} |`);
  }
  if (orphans.length > 0) {
    console.log(`\n## Orphan Report (${orphans.length})\n`);
    for (const o of orphans) {
      console.log(`- **${o.storyId}**: ${o.title} — missing: ${o.missingLinks.join(", ")}`);
    }
  }
} else {
  console.log(JSON.stringify(report, null, 2));
}

process.exit(0);
