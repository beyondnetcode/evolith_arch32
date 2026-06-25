#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();

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
  "LICENSE",
  "CHANGELOG.md",
  ".editorconfig",
  ".gitignore",
  ".markdownlint.json",
  ".release-please-manifest.json",
  "release-please-config.json",
  "COVERAGE_REPORT.md",
  "package.json",
  "package-lock.json",
  ".env"
]);

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
  "packages",
  "tests"
]);

console.log("🧹 Running repository optimization...");

let deletedCount = 0;

// 1. Clean root directory from orphan/incoherent files
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    if (!allowedDirectories.has(entry.name)) {
      console.log(`🗑️ Deleting unauthorized directory in root: ${entry.name}/`);
      fs.rmSync(path.join(root, entry.name), { recursive: true, force: true });
      deletedCount++;
    }
  } else if (entry.isFile()) {
    if (!allowedFiles.has(entry.name)) {
      console.log(`🗑️ Deleting unauthorized file in root: ${entry.name}`);
      fs.rmSync(path.join(root, entry.name), { force: true });
      deletedCount++;
    }
  }
}

// 2. Clean temporary and duplicate files (.DS_Store, Thumbs.db, debug logs)
try {
  const commands = [
    "find . -name '.DS_Store' -type f -delete",
    "find . -name 'Thumbs.db' -type f -delete",
    "find . -name 'npm-debug.log*' -type f -delete",
    "find . -name 'yarn-error.log*' -type f -delete",
    "find . -name 'yarn-debug.log*' -type f -delete"
  ];
  
  for (const cmd of commands) {
    execSync(cmd, { stdio: 'ignore' });
  }
  console.log("✨ Temporary and incoherent files removed successfully.");
} catch (error) {
  console.error("⚠️ Error while removing temporary files:", error.message);
}

console.log(`✅ Repository optimized. Removed ${deletedCount} unauthorized root items.`);
