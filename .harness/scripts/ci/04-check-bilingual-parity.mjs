#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

// Auto-generated artifacts are exempt from structural translation parity:
// their EN content is machine-generated (e.g. CHANGELOG from Conventional
// Commits via release-please) and cannot keep a hand-translated header
// structure in sync. Their ES counterparts act as localized navigation pointers.
const PARITY_EXEMPT_BASENAMES = new Set(["CHANGELOG.md", "CHANGELOG.es.md"]);

function countHeaders(content) {
  const headingPattern = /^#{2,3}\s+.+$/gm;
  const matches = [...content.matchAll(headingPattern)];
  return matches.length;
}

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

function validateBilingualStructuralParity(file, content) {
  const relative = path.relative(root, file);

  if (PARITY_EXEMPT_BASENAMES.has(path.basename(file))) {
    return;
  }

  if (relative.endsWith(".es.md")) {
    const englishFile = file.replace(/\.es\.md$/, ".md");

    if (!fs.existsSync(englishFile)) {
      failures.push(`${relative}: missing English counterpart`);
      return;
    }

    const englishContent = fs.readFileSync(englishFile, "utf8");
    const esHeaders = countHeaders(content);
    const enHeaders = countHeaders(englishContent);

    if (esHeaders !== enHeaders) {
      failures.push(`${relative}: structural mismatch (EN: ${enHeaders} headers, ES: ${esHeaders} headers)`);
    }
  }

  if (relative.endsWith(".md") && !relative.endsWith(".es.md")) {
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

const markdownFiles = walk(root);

for (const file of markdownFiles) {
  const content = fs.readFileSync(file, "utf8");
  validateBilingualStructuralParity(file, content);
}

if (failures.length > 0) {
  console.error("\n\x1b[31mBilingual Parity Validation Failed\x1b[0m\n");
  console.error("The following files have structural mismatches between EN and ES versions:\n");
  for (const failure of failures) {
    console.error(`  \x1b[31m✗\x1b[0m ${failure}`);
  }
  console.error("\nBoth versions must have the same number of ## and ### headers.");
  console.error("Run 'node .harness/scripts/validate-docs.mjs' for full documentation validation.");
  process.exit(1);
}

console.log("\x1b[32m✓\x1b[0m Bilingual structural parity check passed");
process.exit(0);