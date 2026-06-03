#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

// Explicit whitelist of allowed files in the root directory.
const allowedFiles = new Set([
  "README.md",
  "README.es.md",
  "MASTER_INDEX.md",
  "MASTER_INDEX.es.md",
  "DOCUMENTATION_VERSIONS.md",
  "DOCUMENTATION_VERSIONS.es.md",
  "AGENTS.md",
  "AGENTS.es.md",
  "LICENSE",
  ".editorconfig",
  ".gitignore",
  ".markdownlint.json",
  ".release-please-manifest.json",
  "release-please-config.json"
]);

// Explicit whitelist of allowed directories in the root directory.
const allowedDirectories = new Set([
  ".bmad-core",
  ".git",
  ".github",
  ".harness",
  ".husky",
  ".vscode",
  "reference",
  "sdk"
]);

const failures = [];

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    if (!allowedDirectories.has(entry.name)) {
      failures.push(`Unauthorized directory found in root: ${entry.name}/`);
    }
  } else if (entry.isFile()) {
    if (!allowedFiles.has(entry.name)) {
      failures.push(`Unauthorized file found in root: ${entry.name}`);
    }
  }
}

if (failures.length > 0) {
  console.error("❌ Root Cleanliness Validation Failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error("\nThe repository root is strictly governed. Only allowed files/folders are permitted.");
  console.error("If you need to add a new file/folder, please update the taxonomy and this validation script.");
  process.exit(1);
}

console.log("✓ Root Cleanliness Validation Passed");
