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
  "tsconfig.base.json",
  // The Core is a satellite of itself (see evolith.yaml's own metadata.name
  // comment) and GIT-08's commitlint config — both tracked, both legitimate
  // at root, missing here only because this allowlist predates them.
  "evolith.yaml",
  "commitlint.config.mjs"
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
  //
  // In a `git worktree`, `.git` at the worktree root is a plain text file
  // (`gitdir: <path>/.git/worktrees/<name>`) redirecting to the real one, not
  // a directory. Two things here assumed otherwise, and broke in different ways:
  //
  //  1. `path.join(root, ".git", "evolith-quarantine")` assumed `.git` was
  //     always a writable directory, so `fs.mkdirSync` failed with ENOTDIR
  //     the moment there was anything to quarantine — silently crashing the
  //     pre-push hook for every worktree checkout in the repo. Fixed below by
  //     resolving the real, writable git-dir with `git rev-parse --git-dir`
  //     (it IS `.git` in a normal checkout, and the per-worktree directory
  //     under `.git/worktrees/<name>` here) via `path.resolve`, not
  //     `path.join` — `--git-dir` prints a RELATIVE path in a normal checkout
  //     but an ABSOLUTE one in a worktree, and `path.join` would have
  //     mangled the absolute case by concatenating it onto `root` instead of
  //     using it as-is. This also keeps quarantine local to whichever
  //     checkout produced the untracked file, instead of colliding across
  //     worktrees that shared one.
  //  2. `.git` is only in `allowedDirectories`, not `allowedFiles` — so once
  //     (1) stopped crashing, the loop below saw `.git` itself as an
  //     unrecognised untracked FILE in a worktree and quarantined it,
  //     severing the worktree from git entirely (recoverably, since
  //     quarantine moves rather than deletes, but still not something a
  //     cleanup script should ever do). `.git` is excluded unconditionally
  //     below, by name, before the directory/file allowlist check — it must
  //     never be touched regardless of which shape it takes here.
  const gitDir = execSync("git rev-parse --git-dir", { encoding: "utf8", cwd: root }).trim();
  const quarantineRoot = path.resolve(root, gitDir, "evolith-quarantine");

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const name = entry.name;
    if (name === ".git") continue;
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
    // Absolute and worktree-correct — `.git/evolith-quarantine/...` reads fine
    // in a normal checkout but names nothing in a worktree, where `.git` is a
    // redirect file rather than the directory that actually holds this.
    console.log(`   Recover with: mv ${path.join(quarantineRoot, "<ref>", "<name>")} .`);
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
