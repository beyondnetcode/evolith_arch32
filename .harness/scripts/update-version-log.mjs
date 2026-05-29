#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const versionLogPath = path.join(root, "DOCUMENTATION_VERSIONS.md");
const versionLogEsPath = path.join(root, "DOCUMENTATION_VERSIONS.es.md");

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(`
Usage: node .harness/scripts/update-version-log.mjs <version> [options]

Updates DOCUMENTATION_VERSIONS.md and DOCUMENTATION_VERSIONS.es.md
with a new release entry.

Options:
  --branch <name>    Source branch (release/docs-vX.Y.Z or hotfix/docs-vX.Y.Z)
  --changes <text>   Key changes description
  --hotfixes <n>     Number of hotfixes in this release (default: 0)

Examples:
  node .harness/scripts/update-version-log.mjs docs-v1.2.0 --branch release/docs-v1.2.0 --changes "Added security playbook"
  node .harness/scripts/update-version-log.mjs docs-v1.1.1 --branch hotfix/docs-v1.1.1 --changes "Fixed broken links" --hotfixes 3
`);
  process.exit(0);
}

const version = args[0];
if (!version.match(/^docs-v\d+\.\d+\.\d+$/)) {
  console.error(`Error: Invalid version format: ${version}`);
  console.error("Expected format: docs-vX.Y.Z (e.g., docs-v1.2.0)");
  process.exit(1);
}

const branchArg = args.includes("--branch") ? args[args.indexOf("--branch") + 1] : null;
const changesArg = args.includes("--changes") ? args[args.indexOf("--changes") + 1] : "<describe changes>";
const hotfixesArg = args.includes("--hotfixes") ? parseInt(args[args.indexOf("--hotfixes") + 1], 10) : 0;

const branch = branchArg || "release/" + version;
const now = new Date().toISOString().split("T")[0];

console.log(`\n=== Updating Documentation Version Log ===\n`);
console.log(`Version: ${version}`);
console.log(`Branch: ${branch}`);
console.log(`Date: ${now}`);
console.log(`Changes: ${changesArg}`);
console.log(`Hotfixes: ${hotfixesArg}`);

function updateVersionLog(filePath, isSpanish = false) {
  let content = fs.readFileSync(filePath, "utf8");

  const newEntry = isSpanish
    ? `| ${version} | ${now} | ${branch} | ${changesArg} | ${hotfixesArg} |\n`
    : `| ${version} | ${now} | ${branch} | ${changesArg} | ${hotfixesArg} |\n`;

  const productionTableMatch = content.match(/(\| Version \| Date \| Branch \| Key Changes \| Hotfixes \|\n\|[^\n]+\|\n)(?=\| docs-v)/);
  const tableInsertPoint = productionTableMatch
    ? productionTableMatch[0].length
    : content.indexOf("| docs-v");

  if (tableInsertPoint === -1) {
    console.error(`Error: Could not find insertion point in ${filePath}`);
    return false;
  }

  const beforeTable = content.slice(0, tableInsertPoint);
  const afterTable = content.slice(tableInsertPoint);

  content = beforeTable + newEntry + afterTable;

  content = content.replace(/Last update: \d{4}-\d{2}-\d{2}/, `Last update: ${now}`);

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✓ Updated ${path.basename(filePath)}`);
  return true;
}

const enSuccess = updateVersionLog(versionLogPath, false);
const esSuccess = updateVersionLog(versionLogEsPath, true);

if (enSuccess && esSuccess) {
  console.log("\n✓ Version log update complete");
  process.exit(0);
} else {
  console.error("\n✗ Version log update failed");
  process.exit(1);
}