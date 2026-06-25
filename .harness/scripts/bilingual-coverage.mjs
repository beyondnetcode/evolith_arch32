#!/usr/bin/env node

import fs from "node:fs";
import path from "path";

const root = process.cwd();
const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", ".nx"]);

const markdownFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".md")) markdownFiles.push(full);
  }
}

walk(path.join(root, "reference"));

const enFiles = markdownFiles.filter(f => !f.endsWith(".es.md"));
const esFiles = markdownFiles.filter(f => f.endsWith(".es.md"));

const enWithoutEs = [];
const esWithoutEn = [];

for (const f of enFiles) {
  const esFile = f.replace(/\.md$/, ".es.md");
  if (!fs.existsSync(esFile)) {
    enWithoutEs.push(path.relative(path.join(root, "reference"), f));
  }
}

for (const f of esFiles) {
  const enFile = f.replace(/\.es\.md$/, ".md");
  if (!fs.existsSync(enFile)) {
    esWithoutEn.push(path.relative(path.join(root, "reference"), f));
  }
}

console.log("\n=== Bilingual Coverage Report ===");
console.log(`Total EN files: ${enFiles.length}`);
console.log(`Total ES files: ${esFiles.length}`);
console.log(`Paired files: ${Math.min(enFiles.length - enWithoutEs.length, esFiles.length - esWithoutEn.length)}`);
console.log(`Coverage: ${((Math.min(enFiles.length - enWithoutEs.length, esFiles.length - esWithoutEn.length) / enFiles.length) * 100).toFixed(1)}%`);

console.log(`\nEN files without ES counterpart (${enWithoutEs.length}):`);
if (enWithoutEs.length === 0) {
  console.log("  (none)");
} else {
  enWithoutEs.sort().forEach(f => console.log(`  - ${f}`));
}

console.log(`\nES files without EN counterpart (${esWithoutEn.length}):`);
if (esWithoutEn.length === 0) {
  console.log("  (none)");
} else {
  esWithoutEn.sort().forEach(f => console.log(`  - ${f}`));
}