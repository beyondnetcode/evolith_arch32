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
  "SECURITY.md",
  "LICENSE",
  "CHANGELOG.md",
  ".editorconfig",
  ".gitignore",
  ".markdownlint.json",
  "COVERAGE_REPORT.md",
  "package.json",
  "package-lock.json",
  ".env",
  "tsconfig.json",
  "tsconfig.base.json"
]);

const allowedDirectories = new Set([
  ".bmad-core",
  ".claude",
  ".git",
  ".github",
  ".harness",
  ".husky",
  ".mimocode",
  ".obsidian",
  ".vscode",
  "node_modules",
  "product",
  "reference",
  "src"
]);

console.log("🧹 Running repository optimization...");

/**
 * Everything git knows about. A tracked path is part of the repository by
 * definition — if it is not on the allowlist, the allowlist is what is wrong,
 * not the file. Deleting it here would destroy committed work and would be
 * invisible until someone noticed the missing file.
 */
function trackedPaths() {
  try {
    const out = execSync("git ls-files -z", { encoding: "buffer", cwd: root });
    return new Set(
      out
        .toString("utf8")
        .split("\0")
        .filter(Boolean)
        .map((p) => p.split("/")[0])
    );
  } catch (error) {
    // No git, no reliable way to tell committed work from junk -> delete nothing.
    console.error(`⚠️ Could not read the git index (${error.message}).`);
    console.error("   Skipping root cleanup: refusing to delete without knowing what is tracked.");
    return null;
  }
}

const tracked = trackedPaths();

let quarantinedCount = 0;
const protectedEntries = [];

if (tracked !== null) {
  // Quarantine instead of unlink: untracked files are unrecoverable once
  // removed, and this script runs unattended from the pre-push hook.
  const quarantineRoot = path.join(root, ".git", "evolith-quarantine");

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const name = entry.name;
    const allowed = entry.isDirectory() ? allowedDirectories.has(name) : allowedFiles.has(name);
    if (allowed) continue;
    if (!entry.isDirectory() && !entry.isFile()) continue;

    if (tracked.has(name)) {
      protectedEntries.push(name);
      continue;
    }

    const stamp = execSync("git rev-parse --short HEAD", { encoding: "utf8", cwd: root }).trim();
    const destDir = path.join(quarantineRoot, stamp);
    fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(path.join(root, name), path.join(destDir, name));
    console.log(`📦 Quarantined untracked root ${entry.isDirectory() ? "directory" : "file"}: ${name}`);
    quarantinedCount++;
  }

  if (quarantinedCount > 0) {
    console.log(`   Recover with: mv .git/evolith-quarantine/<ref>/<name> .`);
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

if (protectedEntries.length > 0) {
  console.log("");
  console.log("⚠️ Tracked root entries are missing from this script's allowlist:");
  for (const name of protectedEntries) console.log(`     ${name}`);
  console.log("   They were NOT touched — they are committed content.");
  console.log("   Either add them to the allowlist here, or relocate them deliberately.");
}

console.log(`✅ Repository optimized. Quarantined ${quarantinedCount} untracked root items.`);
