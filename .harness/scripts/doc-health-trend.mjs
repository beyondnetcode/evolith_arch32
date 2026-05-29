#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const historyPath = path.join(root, ".harness/doc-health-history.json");

const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", ".nx"]);

let history = [];

if (fs.existsSync(historyPath)) {
  history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
}

function analyzeDocs() {
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) files.push(full);
    }
  }

  walk(path.join(root, "reference"));

  const metrics = {
    timestamp: new Date().toISOString(),
    totalDocs: files.length,
    enDocs: files.filter(f => !f.endsWith(".es.md")).length,
    esDocs: files.filter(f => f.endsWith(".es.md")).length,
    paired: 0,
    coverage: 0,
    avgComplexity: 0,
    avgCompleteness: 0,
    byArea: {}
  };

  const enFiles = files.filter(f => !f.endsWith(".es.md"));
  const esFiles = files.filter(f => f.endsWith(".es.md"));

  for (const f of esFiles) {
    const enFile = f.replace(/\.es\.md$/, ".md");
    if (fs.existsSync(enFile)) metrics.paired++;
  }

  metrics.coverage = ((metrics.paired / metrics.enDocs) * 100).toFixed(1);

  const areaMetrics = {};

  for (const file of files) {
    const rel = path.relative(path.join(root, "reference"), file);
    const area = rel.split(path.sep)[0] || "root";

    if (!areaMetrics[area]) {
      areaMetrics[area] = { en: 0, es: 0, paired: 0, complexity: 0, completeness: 0 };
    }

    areaMetrics[area].en += file.endsWith(".es.md") ? 0 : 1;
    areaMetrics[area].es += file.endsWith(".es.md") ? 1 : 0;

    if (file.endsWith(".es.md") && fs.existsSync(file.replace(/\.es\.md$/, ".md"))) {
      areaMetrics[area].paired++;
    }

    const content = fs.readFileSync(file, "utf8");
    const headerCount = (content.match(/^#+\s/gm) || []).length;
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    const mermaidBlocks = (content.match(/```mermaid[\s\S]*?```/g) || []).length;
    const links = (content.match(/\[.+\]\(.+\)/g) || []).length;
    const words = content.split(/\s+/).filter(w => w.length > 0).length;

    const complexity =
      (headerCount * 2) +
      (codeBlocks * 3) +
      (mermaidBlocks * 4) +
      Math.min(words / 100, 20);

    const completeness =
      (headerCount >= 3 ? 25 : headerCount * 5) +
      (codeBlocks > 0 ? 20 : 0) +
      (mermaidBlocks > 0 ? 15 : 0) +
      (links > 2 ? 15 : links * 3) +
      (file.endsWith(".es.md") ? 10 : 0) +
      (content.match(/^#\s+.+$/m) ? 15 : 0);

    areaMetrics[area].complexity += complexity;
    areaMetrics[area].completeness += completeness;
  }

  let totalComplexity = 0;
  let totalCompleteness = 0;

  for (const [area, data] of Object.entries(areaMetrics)) {
    const count = data.en + data.es;
    data.avgComplexity = count > 0 ? (data.complexity / count).toFixed(1) : 0;
    data.avgCompleteness = count > 0 ? (data.completeness / count).toFixed(1) : 0;
    data.coverage = data.en > 0 ? ((data.paired / data.en) * 100).toFixed(1) : 0;

    totalComplexity += data.complexity;
    totalCompleteness += data.completeness;

    delete data.complexity;
    delete data.completeness;
  }

  metrics.avgComplexity = (totalComplexity / files.length).toFixed(1);
  metrics.avgCompleteness = (totalCompleteness / files.length).toFixed(1);
  metrics.byArea = areaMetrics;

  return metrics;
}

function saveSnapshot(metrics) {
  history.push(metrics);

  if (history.length > 52) {
    history = history.slice(-52);
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), "utf8");
}

function generateDashboard() {
  if (history.length < 2) {
    console.log("\n=== Doc Health Trend Dashboard ===\n");
    console.log("Not enough history yet. Run --snapshot to collect first data point.\n");
    return;
  }

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const oldest = history[0];

  const coverageTrend = (latest.coverage - oldest.coverage).toFixed(1);
  const completenessTrend = (latest.avgCompleteness - oldest.avgCompleteness).toFixed(1);
  const complexityTrend = (latest.avgComplexity - oldest.avgComplexity).toFixed(1);

  console.log(`
# 📊 Documentation Health Trend Dashboard

**Last updated:** ${latest.timestamp.split("T")[0]}
**History:** ${history.length} snapshots

---

## Trend Summary (since first snapshot)

| Metric | Start | Current | Change |
|--------|-------|---------|--------|
| Coverage | ${oldest.coverage}% | ${latest.coverage}% | ${coverageTrend > 0 ? "+" : ""}${coverageTrend}% |
| Avg Completeness | ${oldest.avgCompleteness}% | ${latest.avgCompleteness}% | ${completenessTrend > 0 ? "+" : ""}${completenessTrend}% |
| Avg Complexity | ${oldest.avgComplexity} | ${latest.avgComplexity} | ${complexityTrend > 0 ? "+" : ""}${complexityTrend} |

---

## Current State

| Metric | Value |
|--------|-------|
| Total Documents | ${latest.totalDocs} |
| EN Documents | ${latest.enDocs} |
| ES Documents | ${latest.esDocs} |
| Paired Files | ${latest.paired} |
| **Coverage** | **${latest.coverage}%** |
| Avg Complexity Score | ${latest.avgComplexity} |
| Avg Completeness Score | ${latest.avgCompleteness}% |

---

## Coverage by Area

| Area | Coverage | EN | ES | Paired |
|------|----------|----|----|--------|
`);

  for (const [area, data] of Object.entries(latest.byArea).sort()) {
    const coverageColor = data.coverage >= 80 ? "🟢" : data.coverage >= 50 ? "🟡" : data.coverage >= 25 ? "🟠" : "🔴";
    console.log(`| ${area} | ${coverageColor} ${data.coverage}% | ${data.en} | ${data.es} | ${data.paired} |`);
  }

  console.log(`

---

## Completeness by Area

| Area | Completeness | Trend |
|------|--------------|-------|
`);

  for (const [area, data] of Object.entries(latest.byArea).sort((a, b) => b[1].avgCompleteness - a[1].avgCompleteness)) {
    const trend = latest.byArea[area].avgCompleteness - (previous.byArea[area]?.avgCompleteness || 0);
    const trendIcon = trend > 0 ? "📈" : trend < 0 ? "📉" : "➡️";
    console.log(`| ${area} | ${data.avgCompleteness}% | ${trendIcon} ${trend > 0 ? "+" : ""}${trend.toFixed(1)}% |`);
  }

  console.log(`

---

## Recent Snapshots

| Date | Coverage | Completeness | Complexity |
|------|----------|--------------|------------|
`);

  const recent = history.slice(-8);
  for (const snap of recent.reverse()) {
    const date = snap.timestamp.split("T")[0];
    console.log(`| ${date} | ${snap.coverage}% | ${snap.avgCompleteness}% | ${snap.avgComplexity} |`);
  }

  console.log(`

---

## How to Improve

1. Run \`node .harness/scripts/generate-es-skeleton.mjs <file.md>\` for untranslated files
2. Use \`node .harness/scripts/bilingual-diff.mjs --report\` to find structural gaps
3. Add diagrams (Mermaid) to increase complexity score meaningfully
4. Add code examples to increase completeness score

---
*Dashboard generated by .harness/scripts/doc-health-trend.mjs*
`);
}

if (args.includes("--snapshot")) {
  const metrics = analyzeDocs();
  saveSnapshot(metrics);
  console.log(`\n✓ Snapshot saved (${history.length} total)`);
  console.log(`  Coverage: ${metrics.coverage}%`);
  console.log(`  Completeness: ${metrics.avgCompleteness}%`);
  console.log(`  Complexity: ${metrics.avgComplexity}`);
  process.exit(0);
}

if (args.includes("--dashboard") || args.length === 0) {
  generateDashboard();
  process.exit(0);
}

console.log(`
Usage: node .harness/scripts/doc-health-trend.mjs [command]

Commands:
  --snapshot    Collect current snapshot and save to history
  --dashboard   Generate trend dashboard (shows history)

Examples:
  node .harness/scripts/doc-health-trend.mjs --snapshot   # Add current state to history
  node .harness/scripts/doc-health-trend.mjs --dashboard  # Show trends

Schedule --snapshot to run daily or weekly to build trend history.
`);