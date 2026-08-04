#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

// GT-578: this guard reads exactly one directory. If `process.cwd()` is not the
// repository root — the shape that broke 12/21/31/33/34 in GT-556 — readdirSync
// returns whatever that other directory holds, or nothing, and the script still
// prints "✓ Root Cleanliness Validation Passed".
import { assertScanned } from '../lib/coverage.mjs';

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
  ".gitleaks.toml",
  // GT-653: gitleaks reads its ignore file from the scan root and takes no flag
  // to relocate it, so this one cannot live under `.harness/` with the guards.
  ".gitleaksignore",
  // GT-623: commitlint's config must sit at the root — it is resolved from the
  // repository root by the `commit-msg` hook and by `npx commitlint`, and moving
  // it elsewhere would need a `--config` flag on every invocation.
  "commitlint.config.mjs",
  "docker-compose.yml",
  ".markdownlint.json",
  "COVERAGE_REPORT.md",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.base.json",
  ".env",
  // Root satellite contract manifest (evolith.dev/v1) — the repo's own governance manifest.
  "evolith.yaml"
]);

// Explicit whitelist of allowed directories in the root directory.
const allowedDirectories = new Set([
  ".bmad-core",
  ".claude",
  ".git",
  ".github",
  ".harness",
  ".husky",
  ".obsidian",
  ".mimocode",
  ".vscode",
  "node_modules",
  "reference",
  // Source workspaces live under src/ (npm workspaces: src/sdk/*, src/apps/*,
  // src/packages/*, src/tests). The old flat root layout (apps/, packages/,
  // sdk/, tests/) was relocated here, so those are no longer permitted at root.
  "src",
  // Product documentation corpus.
  "product",
  "examples",
  "wiki"
]);

const explicitlyDeniedDirectories = new Map([
  [
    "topologies",
    "Root-level topologies/ is prohibited by ADR-0079. Use taxonomy-approved topology corpus and ruleset locations unless a superseding ADR changes root policy."
  ]
]);

const failures = [];

const rootEntries = fs.readdirSync(root, { withFileTypes: true });
assertScanned(rootEntries.length, { what: "root entries", where: root });

// A root that holds none of the mandatory anchors is not "clean"; it is the
// wrong directory. Checking for the anchors is stronger than counting: a
// non-empty but unrelated directory would satisfy a count and nothing else.
const ANCHORS = ["package.json", ".github", ".harness"];
const missingAnchors = ANCHORS.filter((a) => !rootEntries.some((e) => e.name === a));
if (missingAnchors.length > 0) {
  console.error(
    `❌ Root Cleanliness Validation cannot run: ${root} is missing ${missingAnchors.join(", ")}.\n` +
    `Scanned ${rootEntries.length} entr(ies) but this is not the repository root, so a "passed"\n` +
    `verdict here would certify a directory nobody asked about.`,
  );
  process.exit(1);
}

for (const entry of rootEntries) {
  // `.git` is only in `allowedDirectories`, which is correct in a normal
  // checkout but not in a `git worktree`: there, `.git` at the root is a
  // plain text file (`gitdir: <path>`) redirecting to the real one, so it
  // fell into the `isFile()` branch below and read as an unauthorized file —
  // a false failure specific to local worktree development, since CI always
  // checks out fresh (never a worktree) and never hits this. Same root cause
  // as the quarantine bug 02-optimize-repo.mjs fixed; excluded unconditionally
  // here too, before the directory/file split, regardless of which shape it
  // takes in a given checkout.
  if (entry.name === ".git") continue;
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

console.log(`✓ Root Cleanliness Validation Passed (${rootEntries.length} root entr(ies) inspected)`);
