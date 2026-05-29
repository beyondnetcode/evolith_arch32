#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", ".nx"]);

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

function analyzeFile(file) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  const metrics = {
    file: path.relative(root, file),
    totalLines: lines.length,
    totalChars: content.length,
    headerCount: 0,
    codeBlocks: 0,
    mermaidBlocks: 0,
    links: 0,
    images: 0,
    tables: 0,
    words: 0,
    avgLineLength: 0,
  };

  const linkPattern = /!?\[[^\]]*\]\([^)]+\)/g;
  const imgPattern = /!\[([^\]]*)\]\([^)]+\)/g;
  const tablePattern = /\|.+\|/g;
  const codeBlockPattern = /```[\s\S]*?```/g;
  const mermaidPattern = /```mermaid[\s\S]*?```/g;
  const headingPattern = /^#+\s+.+$/gm;

  metrics.headerCount = (content.match(headingPattern) || []).length;
  metrics.codeBlocks = (content.match(codeBlockPattern) || []).length;
  metrics.mermaidBlocks = (content.match(mermaidPattern) || []).length;
  metrics.links = (content.match(linkPattern) || []).length - (content.match(imgPattern) || []).length;
  metrics.images = (content.match(imgPattern) || []).length;
  metrics.tables = (content.match(tablePattern) || []).length;

  const cleanContent = content.replace(/```[\s\S]*?```/g, "").replace(/#+\s+/g, "");
  metrics.words = cleanContent.split(/\s+/).filter(w => w.length > 0).length;

  let totalLineLength = 0;
  let nonEmptyLines = 0;
  for (const line of lines) {
    if (line.trim().length > 0) {
      totalLineLength += line.length;
      nonEmptyLines++;
    }
  }
  metrics.avgLineLength = nonEmptyLines > 0 ? (totalLineLength / nonEmptyLines).toFixed(1) : 0;

  const complexityScore =
    (metrics.headerCount * 2) +
    (metrics.codeBlocks * 3) +
    (metrics.mermaidBlocks * 4) +
    (metrics.tables * 2) +
    Math.min(metrics.words / 100, 20) +
    (metrics.links * 0.5) +
    (metrics.images * 0.5);

  metrics.complexityScore = Math.round(complexityScore);

  let completenessScore = 0;
  const hasTitle = content.match(/^#\s+.+$/m);
  const hasMultipleSections = metrics.headerCount >= 3;
  const hasCode = metrics.codeBlocks > 0;
  const hasDiagrams = metrics.mermaidBlocks > 0;
  const hasLinks = metrics.links > 2;
  const isBilingual = file.endsWith(".es.md") || fs.existsSync(file.replace(/\.md$/, ".es.md"));

  if (hasTitle) completenessScore += 15;
  if (hasMultipleSections) completenessScore += 25;
  if (hasCode) completenessScore += 20;
  if (hasDiagrams) completenessScore += 15;
  if (hasLinks) completenessScore += 15;
  if (isBilingual) completenessScore += 10;

  metrics.completenessScore = completenessScore;

  return metrics;
}

console.log("\n=== Documentation Complexity & Completeness Score ===\n");

const results = files.map(analyzeFile).sort((a, b) => b.complexityScore - a.complexityScore);

const totalDocs = results.length;
const avgComplexity = (results.reduce((sum, r) => sum + r.complexityScore, 0) / totalDocs).toFixed(1);
const avgCompleteness = (results.reduce((sum, r) => sum + r.completenessScore, 0) / totalDocs).toFixed(1);

const highComplexity = results.filter(r => r.complexityScore > 50).length;
const highCompleteness = results.filter(r => r.completenessScore >= 80).length;
const bilingualCount = results.filter(r => r.file.endsWith(".es.md")).length;

console.log(`### Overall Metrics\n`);
console.log(`| Metric | Value |`);
console.log(`|--------|-------|`);
console.log(`| Total documents | ${totalDocs} |`);
console.log(`| Avg complexity score | ${avgComplexity} |`);
console.log(`| Avg completeness score | ${avgCompleteness}% |`);
console.log(`| High complexity (>50) | ${highComplexity} |`);
console.log(`| High completeness (≥80%) | ${highCompleteness} |`);
console.log(`| Bilingual docs | ${bilingualCount} |`);
console.log();

console.log(`### Top 10 Most Complex Documents\n`);
console.log(`| Rank | File | Complexity | Headers | Code | Mermaid |`);
console.log(`|------|------|------------|---------|------|---------|`);
for (let i = 0; i < Math.min(10, results.length); i++) {
  const r = results[i];
  const shortFile = r.file.length > 50 ? r.file.slice(-47) : r.file;
  console.log(`| ${i + 1} | \`${shortFile}\` | ${r.complexityScore} | ${r.headerCount} | ${r.codeBlocks} | ${r.mermaidBlocks} |`);
}

console.log();

console.log(`### Documents Needing Attention\n`);
const needsWork = results.filter(r => r.completenessScore < 50).sort((a, b) => a.completenessScore - b.completenessScore);
console.log(`| File | Completeness | Issues |`);
console.log(`|------|--------------|--------|`);
for (const r of needsWork.slice(0, 10)) {
  const issues = [];
  if (r.headerCount < 3) issues.push("few headers");
  if (r.codeBlocks === 0) issues.push("no code");
  if (r.mermaidBlocks === 0) issues.push("no diagrams");
  if (r.links < 2) issues.push("few links");
  const shortFile = r.file.length > 40 ? "..." + r.file.slice(-37) : r.file;
  console.log(`| \`${shortFile}\` | ${r.completenessScore}% | ${issues.join(", ") || "unknown"} |`);
}
console.log();

console.log(`### Completeness Distribution\n`);
const distribution = { "90-100%": 0, "80-89%": 0, "60-79%": 0, "40-59%": 0, "<40%": 0 };
for (const r of results) {
  if (r.completenessScore >= 90) distribution["90-100%"]++;
  else if (r.completenessScore >= 80) distribution["80-89%"]++;
  else if (r.completenessScore >= 60) distribution["60-79%"]++;
  else if (r.completenessScore >= 40) distribution["40-59%"]++;
  else distribution["<40%"]++;
}
for (const [range, count] of Object.entries(distribution)) {
  const bar = "█".repeat(Math.round(count / totalDocs * 30)) + "░".repeat(30 - Math.round(count / totalDocs * 30));
  console.log(`| ${range} | ${bar} ${count} |`);
}
console.log();

console.log(`---\n*Complexity score: headers×2 + code×3 + mermaid×4 + tables×2 + words/100 + links×0.5*\n*Completeness score: title(15) + sections(25) + code(20) + diagrams(15) + links(15) + bilingual(10)*`);