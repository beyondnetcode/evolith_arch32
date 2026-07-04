#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: node .harness/scripts/adr-promotion-push.mjs <adr-file.md> [options]

Promotes an ADR from a product repository to the Evolith corporate repository.

Options:
  --source <path>    Source directory of the ADR (default: current repo)
  --dry-run          Show what would be done without executing
  --commit           Create commit in Evolith after copy

Workflow:
1. Validates the ADR has proper structure
2. Copies to appropriate location in evolith_arch32
3. Creates a promotion record
4. Commits with proper message format

Examples:
  node .harness/scripts/adr-promotion-push.mjs docs/adr-0001-my-decision.md
  node .harness/scripts/adr-promotion-push.mjs ../../product-x/docs/adr-0042.md --dry-run
`);
  process.exit(0);
}

const dryRun = args.includes("--dry-run");
const doCommit = args.includes("--commit");

const sourceIdx = args.indexOf("--source");
const sourceDir = sourceIdx >= 0 ? args[sourceIdx + 1] : root;

const adrFile = args.find(a => !a.startsWith("--") && a.endsWith(".md"));

if (!adrFile) {
  console.error("Error: Please specify an ADR file (.md)");
  process.exit(1);
}

const sourcePath = path.resolve(sourceDir, adrFile);

if (!fs.existsSync(sourcePath)) {
  console.error(`Error: File not found: ${sourcePath}`);
  process.exit(1);
}

console.log("\n=== ADR Promotion Push ===\n");
console.log(`Source: ${sourcePath}`);

const content = fs.readFileSync(sourcePath, "utf8");

const titleMatch = content.match(/^#\s+\[?ADR-(\d+)\]?[^\n]+/i);
const statusMatch = content.match(/\*\*Status\*\*:\s*(\w+)/i);
const dateMatch = content.match(/\*\*Date\*\*:\s*([\d-]+)/i);
const scopeMatch = content.match(/\*\*Scope\*\*:\s*([^\n]+)/i);

if (!titleMatch) {
  console.error("Error: File does not appear to be an ADR (missing title format)");
  process.exit(1);
}

const adrNumber = titleMatch[1].padStart(4, "0");
const status = statusMatch ? statusMatch[1] : "Unknown";
const date = dateMatch ? dateMatch[1] : "Unknown";
const scope = scopeMatch ? scopeMatch[1].trim() : "Unknown";

console.log(`\nADR-${adrNumber} | Status: ${status} | Date: ${date} | Scope: ${scope}`);

const runtimeMatch = scope.match(/(Node\.js|TypeScript|\.NET|Android|Core|Agnostic)/i);
const runtime = runtimeMatch ? runtimeMatch[1] : "Agnostic";

let targetDir;
if (runtime.includes("Node") || runtime.includes("TypeScript")) {
  targetDir = path.join(root, "reference/core/architecture/adrs/nodejs");
} else if (runtime.includes(".NET")) {
  targetDir = path.join(root, "reference/core/architecture/adrs/dotnet");
} else if (runtime.includes("Android")) {
  targetDir = path.join(root, "reference/core/architecture/adrs/android");
} else if (runtime.includes("Agnostic") || runtime.includes("Core")) {
  targetDir = path.join(root, "reference/core/architecture/adrs/core");
} else {
  targetDir = path.join(root, "reference/core/architecture/adrs/core");
}

const targetPath = path.join(targetDir, `ADR-${adrNumber}-${path.basename(adrFile)}`);

console.log(`\nTarget: ${targetPath}`);

const exists = fs.existsSync(targetPath);
if (exists && !dryRun) {
  console.error(`\nError: Target file already exists. Use --force to overwrite.`);
  console.error(`  ${targetPath}`);
  process.exit(1);
}

console.log(`\n${exists ? "⚠️  Will overwrite existing file" : "✓ New file will be created"}`);

if (dryRun) {
  console.log("\n[DRY RUN] Would execute:");
  console.log(`  1. Copy ${sourcePath} → ${targetPath}`);
  console.log(`  2. Create promotion record in ADR registry`);
  console.log(`  3. ${doCommit ? "Commit with promotion message" : "Skip commit (no --commit)"}`);
  console.log("\nNo changes made.");
  process.exit(0);
}

fs.copyFileSync(sourcePath, targetPath);
console.log(`\n✓ Copied to ${targetPath}`);

const readmePath = path.join(targetDir, "README.md");
const readmeContent = fs.readFileSync(readmePath, "utf8");

const promotionEntry = `
- [ADR-${adrNumber}](./ADR-${adrNumber}-${path.basename(adrFile)}) - ${date} - ${status} - *Promoted from product repository*`;

if (!readmeContent.includes(`ADR-${adrNumber}`)) {
  const updatedReadme = readmeContent.replace(
    /(## ADR Index\n)/,
    `$1${promotionEntry}`
  );
  fs.writeFileSync(readmePath, updatedReadme, "utf8");
  console.log(`✓ Updated ADR index in ${readmePath}`);
}

if (doCommit) {
  try {
    execSync(`git add ${targetPath}`, { cwd: root, stdio: "pipe" });
    execSync(`git add ${readmePath}`, { cwd: root, stdio: "pipe" });

    const commitMsg = `feat(adr): promote ADR-${adrNumber} from product repository

Source: ${adrFile}
Status: ${status}
Date: ${date}
Scope: ${scope}

Promotion reason: [Describe why this ADR should be corporate standard]
Reviewed by: [Reviewer name]
Approved by: [Architecture Board approval reference]`;

    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
      cwd: root,
      stdio: "pipe"
    });
    console.log(`\n✓ Committed with promotion message`);
  } catch (err) {
    console.error(`\n✗ Git commit failed: ${err.message}`);
    console.error("Files were copied but not committed.");
  }
}

console.log("\n✅ ADR promotion complete!");
console.log("\nNext steps:");
console.log("1. Review the copied ADR in the target location");
console.log("2. Update ADR index if needed");
console.log("3. Run validation: node .harness/scripts/validate-docs.mjs");
console.log("4. Push to corporate repository");