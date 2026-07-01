#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const orphans = [];

const PARITY_EXEMPT_BASENAMES = new Set([
  "CHANGELOG.md",
  "CHANGELOG.es.md",
  "tracker-core-evaluation-compat-audit.md",
  "tracker-core-evaluation-compat-audit.es.md",
  "RELOCATED.md",
  "EVOLITH-ARCHITECTURE-DESIGN.md"
]);

function countHeaders(content) {
  const headingPattern = /^#{2,3}\s+.+$/gm;
  const matches = [...content.matchAll(headingPattern)];
  return matches.length;
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (
        entry.name === ".git" ||
        entry.name === "node_modules" ||
        entry.name === ".husky" ||
        entry.name === ".claude" ||
        entry.name === "dist"
      ) {
        continue;
      }
      walk(path.join(directory, entry.name), files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

const markdownFiles = walk(root);

for (const file of markdownFiles) {
  const relative = path.relative(root, file);
  const content = fs.readFileSync(file, "utf8");
  
  // 1. Structural Parity Check
  if (!PARITY_EXEMPT_BASENAMES.has(path.basename(file))) {
    if (relative.endsWith(".es.md")) {
      const englishFile = file.replace(/\.es\.md$/, ".md");
      if (!fs.existsSync(englishFile)) {
        failures.push(`${relative}: missing English counterpart`);
      } else {
        const englishContent = fs.readFileSync(englishFile, "utf8");
        const esHeaders = countHeaders(content);
        const enHeaders = countHeaders(englishContent);
        if (esHeaders !== enHeaders) {
          failures.push(`${relative}: structural mismatch (EN: ${enHeaders} headers, ES: ${esHeaders} headers)`);
        }
      }
    } else if (relative.endsWith(".md") && !relative.endsWith(".es.md")) {
      const spanishFile = file.replace(/\.md$/, ".es.md");
      if (fs.existsSync(spanishFile)) {
        const spanishContent = fs.readFileSync(spanishFile, "utf8");
        const enHeaders = countHeaders(content);
        const esHeaders = countHeaders(spanishContent);
        if (enHeaders !== esHeaders) {
          failures.push(`${relative}: structural mismatch (EN: ${enHeaders} headers, ES: ${esHeaders} headers)`);
        }
      }
    }
  }

  // 2. Orphan Check (Only for files under 'reference/')
  if (relative.startsWith("reference") && relative.endsWith(".md") && !relative.endsWith(".es.md")) {
    const spanishFile = file.replace(/\.md$/, ".es.md");
    if (!fs.existsSync(spanishFile)) {
      orphans.push(`${relative} → missing ${path.relative(root, spanishFile)}`);
    }
  }
}

let hasError = false;

if (failures.length > 0) {
  hasError = true;
  console.error("\n\x1b[31mBilingual Parity Validation Failed\x1b[0m\n");
  for (const failure of failures) {
    console.error(`  \x1b[31m✗\x1b[0m ${failure}`);
  }
}

if (orphans.length > 0) {
  hasError = true;
  console.error("\n\x1b[31mOrphan Bilingual Files Detected (EN without ES)\x1b[0m\n");
  for (const orphan of orphans) {
    console.error(`  \x1b[31m✗\x1b[0m ${orphan}`);
  }
  console.error("\nEvery English document under reference/ must have a Spanish counterpart (.es.md).");
}

if (hasError) {
  process.exit(1);
}

console.log("\x1b[32m✓\x1b[0m Bilingual Suite (Parity & Orphans) passed");
process.exit(0);
