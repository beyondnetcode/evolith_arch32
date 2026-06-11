#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoot = path.join(root, "reference");

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".husky") {
        continue;
      }
      walk(path.join(directory, entry.name), files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

const markdownFiles = walk(scanRoot);
const orphans = [];

for (const file of markdownFiles) {
  if (file.endsWith(".es.md")) {
    continue;
  }

  const spanishFile = file.replace(/\.md$/, ".es.md");
  if (!fs.existsSync(spanishFile)) {
    const relative = path.relative(root, file);
    orphans.push(`${relative} → missing ${path.relative(root, spanishFile)}`);
  }
}

if (orphans.length > 0) {
  console.error("\n\x1b[31mOrphan Bilingual Files Detected (EN without ES)\x1b[0m\n");
  for (const orphan of orphans) {
    console.error(`  \x1b[31m✗\x1b[0m ${orphan}`);
  }
  console.error("\nEvery English document under reference/ must have a Spanish counterpart (.es.md).");
  process.exit(1);
}

console.log("\x1b[32m✓\x1b[0m No orphan bilingual files");
process.exit(0);
