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
  "CONTRIBUTING.md",
  "CONTRIBUTING.es.md",
  "SECURITY.md",
  "SECURITY.es.md",
  "CODE_OF_CONDUCT.md",
  "CODE_OF_CONDUCT.es.md",
  "LICENSE",
  "CHANGELOG.md",
  ".editorconfig",
  ".gitignore",
  ".dockerignore",
  "docker-compose.yml",
  ".markdownlint.json",
  "COVERAGE_REPORT.md",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.base.json",
  ".env"
]);

// Explicit whitelist of allowed directories in the root directory.
const allowedDirectories = new Set([
  ".bmad-core",
  ".claude",
  ".git",
  ".github",
  ".harness",
  ".husky",
  ".mimocode",
  ".vscode",
  "node_modules",
  "reference",
  "rulesets",
  "sdk",
  "apps",
  "examples",
  "packages",
  "tests",
  "wiki"
]);

const explicitlyDeniedDirectories = new Map([
  [
    "topologies",
    "Root-level topologies/ is prohibited by ADR-0079. Use taxonomy-approved topology corpus and ruleset locations unless a superseding ADR changes root policy."
  ]
]);

const failures = [];

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    if (explicitlyDeniedDirectories.has(entry.name)) {
      failures.push(explicitlyDeniedDirectories.get(entry.name));
    } else if (!allowedDirectories.has(entry.name)) {
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
