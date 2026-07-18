#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  partitionByExclusions,
  formatExclusionReport
} from "../../lib/generated-doc-exclusions.mjs";

const root = process.cwd();
const failures = [];
const orphans = [];
/** Every English .md under reference/ (repo-relative, POSIX) — input to the exclusion partition. */
const referenceEnglishDocs = [];
/** English docs under reference/ with no .es.md sibling, before exclusions are applied. */
const orphanCandidates = [];

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
    referenceEnglishDocs.push(relative.split(path.sep).join("/"));
    const spanishFile = file.replace(/\.md$/, ".es.md");
    if (!fs.existsSync(spanishFile)) {
      orphanCandidates.push(relative.split(path.sep).join("/"));
    }
  }
}

// Declared exclusions: generator-written English-only output. The exclusion table lives in
// .harness/scripts/lib/generated-doc-exclusions.mjs — each entry names its generator and its
// reason, and membership is proven by a content marker or a pinned inventory. Partition over
// EVERY English doc under reference/ (not just the orphans) so a count-pinned tree is measured
// against its real shape rather than against whichever subset happens to be untranslated.
const partition = partitionByExclusions(
  referenceEnglishDocs,
  (rel) => fs.readFileSync(path.join(root, rel), "utf8")
);
const excludedPaths = new Set(partition.excluded.flatMap((x) => x.files));

for (const relative of orphanCandidates) {
  if (excludedPaths.has(relative)) continue;
  orphans.push(`${relative} → missing ${relative.replace(/\.md$/, ".es.md")}`);
}

// Always printed, pass or fail. An exclusion the operator cannot see is a false green.
console.log(formatExclusionReport(partition));

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
