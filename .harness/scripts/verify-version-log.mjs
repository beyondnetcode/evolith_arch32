#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const versionLogPath = path.join(root, "DOCUMENTATION_VERSIONS.md");

const branch = process.env.GITHUB_REF_NAME || "";
const sha = process.env.GITHUB_SHA || "";
const event = process.env.GITHUB_EVENT_NAME || "";

if (!branch) {
  console.error("Error: GITHUB_REF_NAME not set");
  process.exit(1);
}

const releaseMatch = branch.match(/^release\/docs-(v\d+\.\d+\.\d+)$/);
const hotfixMatch = branch.match(/^hotfix\/docs-(v\d+\.\d+\.\d+)$/);

const version = releaseMatch?.[1] || hotfixMatch?.[1];

if (!version && branch !== "main") {
  console.log(`Not a release or hotfix branch (${branch}), skipping version log check`);
  process.exit(0);
}

// Event-correctness (GT-44): the version-log requirement is release-only.
// An ordinary merge to main must not be forced to carry a docs-v* log entry.
// Only enforce when HEAD actually is a docs release, detected by the merge-commit
// message or an existing docs-v* tag at HEAD.
function isDocsReleaseHead() {
  try {
    const message = execSync("git log -1 --format=%B HEAD", {
      encoding: "utf8",
      cwd: root
    });
    if (/release\/docs-v\d+\.\d+\.\d+/.test(message)) return true;
  } catch {
    // Fall through to the tag probe below.
  }
  try {
    const tags = execSync("git tag --points-at HEAD --format '%(refname:short)'", {
      encoding: "utf8",
      cwd: root
    }).trim().split("\n");
    return tags.some(tag => tag.startsWith("docs-v"));
  } catch {
    return false;
  }
}

if (branch === "main" && event === "push") {
  if (!isDocsReleaseHead()) {
    console.log("Ordinary merge to main (no docs release detected), skipping version log check");
    process.exit(0);
  }

  console.log("Docs release detected on main, verifying version log...");

  const versionLogContent = fs.readFileSync(versionLogPath, "utf8");

  const now = new Date().toISOString().split("T")[0];

  const hasVersion = versionLogContent.includes(`docs-v`) && versionLogContent.includes(now);

  if (hasVersion) {
    console.log("✓ Version log updated for this release");
    process.exit(0);
  } else {
    console.error("Error: Version log not updated for this release to main");
    console.error("Expected entry with today's date and version tag");
    console.error("Run: node .harness/scripts/update-version-log.mjs <version>");
    process.exit(1);
  }
}

if (!version) {
  console.log("No version detected, skipping");
  process.exit(0);
}

console.log(`\n=== Version Log Verification ===\n`);
console.log(`Branch: ${branch}`);
console.log(`Version: ${version}`);
console.log(`Commit: ${sha.slice(0, 8)}`);

const versionLogContent = fs.readFileSync(versionLogPath, "utf8");

const versionExists = versionLogContent.includes(version);

if (versionExists) {
  console.log(`\n✓ Version ${version} found in DOCUMENTATION_VERSIONS.md`);
  console.log("Version log verification passed");
  process.exit(0);
} else {
  console.error(`\n✗ Version ${version} NOT found in DOCUMENTATION_VERSIONS.md`);
  console.error("\nPlease update DOCUMENTATION_VERSIONS.md with:");
  console.error(`  | ${version} | ${new Date().toISOString().split("T")[0]} | ${branch} | <describe changes> | 0 |`);
  console.error("\nOr run: node .harness/scripts/update-version-log.mjs " + version);
  process.exit(1);
}