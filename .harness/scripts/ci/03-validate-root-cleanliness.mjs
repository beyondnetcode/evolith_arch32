#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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
  "evolith.yaml",
  // GT-651: GitHub Marketplace resolves an action's metadata file from the
  // repository root and nowhere else — «Each repository must contain a single
  // action metadata file (action.yml or action.yaml) at the root», with
  // subfolder metadata explicitly «not automatically listed». The file lived
  // under `.github/actions/evolith-validate/` and was therefore permanently
  // unlistable. Only the manifest moved: its README, hermetic test and
  // fixtures stay in that directory, so this admits exactly one file and not a
  // second home for action code. `64-validate-marketplace-action.mjs` fails if
  // it ever leaves the root again.
  "action.yml",
  // GT-664: ESLint resolves a flat config by walking UP from the working
  // directory, so the analyser the ISO/IEC 5055 pack runs — `eslint .` at the
  // repository root — finds a config here and nowhere else. Without it the run
  // exits 2 with an empty report, the adapter throws, and all four ISO/IEC 5055
  // rules SKIP: fail-closed and correct, and also no measurement at all. Each
  // package keeps its own `eslint.config.mjs` for its architecture lint and
  // still wins, because those run from the package directory.
  "eslint.config.mjs"
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

/**
 * The subset of `names` that git ignores, as a Set.
 *
 * `git check-ignore --stdin` exits 0 when it ignored something, 1 when it
 * ignored nothing, and 128 when it could not answer at all — a missing git, a
 * directory that is not a work tree. Only the first two are answers. Anything
 * else falls back to the EMPTY set, which is the strict reading: every entry
 * stays under the taxonomy. The failure of an optional query must never widen
 * what a guard forgives, and it says so out loud rather than degrading quietly.
 */
function gitIgnoredRootEntries(cwd, names) {
  if (names.length === 0) return new Set();
  try {
    const out = execFileSync("git", ["check-ignore", "--stdin"], {
      cwd, input: `${names.join("\n")}\n`, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"],
    });
    return new Set(out.split("\n").map((l) => l.trim()).filter(Boolean));
  } catch (error) {
    // Exit 1 is the real answer "none of these are ignored", not a failure.
    if (error.status === 1) return new Set();
    console.warn(
      `⚠️  Root Cleanliness: could not ask git which entries are ignored (${error.status ?? error.code}).\n` +
      `   Continuing with NOTHING treated as ignored, so every root entry is checked.`,
    );
    return new Set();
  }
}

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

// What git ignores is, by definition, not in the repository — and this guard
// governs what the repository root HOLDS, not what an operating system leaves
// lying in the directory. Before this, a single `.DS_Store` — written by Finder
// merely for opening the folder, tracked by nothing, recreated the moment it is
// deleted — failed the guard on a developer's machine while CI, which always
// checks out fresh, never saw it. A guard that is red for a reason no commit can
// fix is the failure mode GT-622 was opened to remove.
//
// This does NOT weaken the taxonomy: an unauthorized file that git does not
// ignore still fails, which is every file a commit could actually introduce.
const ignoredNames = gitIgnoredRootEntries(root, rootEntries.map((e) => e.name));

// Paranoia in the direction that matters. This set SUBTRACTS from what is
// checked, so a bogus answer from git would hollow the guard out silently. The
// anchors are tracked by construction, so an answer claiming they are ignored is
// not an unusual repository — it is a broken query, and must stop the run.
const ignoredAnchors = ANCHORS.filter((a) => ignoredNames.has(a));
if (ignoredAnchors.length > 0) {
  console.error(
    `❌ Root Cleanliness Validation cannot run: git reports ${ignoredAnchors.join(", ")} as ignored.\n` +
    `These are tracked by construction, so the ignore query is wrong, and trusting it would\n` +
    `subtract real entries from the check and report a pass over them.`,
  );
  process.exit(1);
}

for (const entry of rootEntries) {
  // Ignored by git: not in the repository, so not this guard's business.
  if (ignoredNames.has(entry.name)) continue;
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

console.log(
  `✓ Root Cleanliness Validation Passed (${rootEntries.length} root entr(ies) read, ` +
  `${ignoredNames.size} ignored by git, ${rootEntries.length - ignoredNames.size} checked against the taxonomy)`,
);
