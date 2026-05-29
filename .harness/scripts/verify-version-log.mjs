#!/usr/bin/env node

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

if (branch === "main" && event === "push") {
  console.log("Checking if main merge was from a release/hotfix branch...");

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