#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const branch = process.env.GITHUB_REF_NAME || "";
const sha = process.env.GITHUB_SHA || "";
const event = process.env.GITHUB_EVENT_NAME || "";

const releaseMatch = branch.match(/^release\/docs-(v\d+\.\d+\.\d+)$/);
const hotfixMatch = branch.match(/^hotfix\/docs-(v\d+\.\d+\.\d+)$/);

const version = releaseMatch?.[1] || hotfixMatch?.[1];

if (!version) {
  if (branch === "main" && event === "push") {
    console.log("Checking git tag exists for main merge...");
    try {
      const tags = execSync("git tag --points-at HEAD --format '%(refname:short)'", {
        encoding: "utf8",
        cwd: root
      }).trim().split("\n");

      const docsTag = tags.find(t => t.startsWith("docs-v"));

      if (docsTag) {
        console.log(`✓ Git tag ${docsTag} found at HEAD`);
        console.log("Git tag verification passed");
        process.exit(0);
      } else {
        console.error("Error: No docs-v* tag found at HEAD");
        console.error("Tags at HEAD:", tags.join(", ") || "none");
        process.exit(1);
      }
    } catch (e) {
      console.error("Error checking tags:", e.message);
      process.exit(1);
    }
  }

  console.log("Not a release or hotfix branch, skipping git tag check");
  process.exit(0);
}

console.log(`\n=== Git Tag Verification ===\n`);
console.log(`Branch: ${branch}`);
console.log(`Version: ${version}`);

const expectedTag = version;

try {
  const tags = execSync("git tag -l 'docs-v*' --format '%(refname:short)'", {
    encoding: "utf8",
    cwd: root
  }).trim().split("\n").filter(Boolean);

  const tagExists = tags.includes(expectedTag);

  if (tagExists) {
    console.log(`\n✓ Tag ${expectedTag} exists`);
    console.log("Git tag verification passed");
    process.exit(0);
  } else {
    console.error(`\n✗ Tag ${expectedTag} does not exist`);
    console.error(`\nCreate the tag with:`);
    console.error(`  git tag ${expectedTag} ${sha.slice(0, 8)}`);
    console.error(`  git push origin ${expectedTag}`);
    process.exit(1);
  }
} catch (e) {
  console.error("Error checking tags:", e.message);
  process.exit(1);
}