#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: node .harness/scripts/adr-lifecycle.mjs <command> [adr-number] [options]

Commands:
  status [adr-number]     Show lifecycle status of ADR(s)
  propose <adr-number>    Mark ADR as Proposed
  accept <adr-number>     Mark ADR as Accepted (requires reason)
  deprecate <adr-number>  Mark ADR as Deprecated (requires reason)
  supersede <adr-number] <replacement-number> Mark as Superseded
  retire <adr-number]     Mark ADR as Retired
  --check-only            Validate ADR structure without modifying (CI gate)

Options:
  --reason <text>    Reason for state change
  --dry-run          Show what would be changed
  --file <path>      Specify ADR file directly

Examples:
  node .harness/scripts/adr-lifecycle.mjs status
  node .harness/scripts/adr-lifecycle.mjs accept 0049 --reason "Proven in production"
  node .harness/scripts/adr-lifecycle.mjs supersede 0030 0040 --reason "Consolidated into ADR-0040"
  node .harness/scripts/adr-lifecycle.mjs --check-only
`);
  process.exit(0);
}

const STATES = {
  PROPOSED: { value: "Proposed", next: ["Accepted", "Deprecated", "Retired"] },
  ACCEPTED: { value: "Accepted", next: ["Deprecated", "Retired", "Superseded"] },
  DEPRECATED: { value: "Deprecated", next: ["Retired"] },
  SUPERSEDED: { value: "Superseded", next: ["Retired"] },
  RETIRED: { value: "Retired", next: [] }
};

function parseAdrFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  const statusMatch = content.match(/\*\*Status\*\*:\s*(\w+)/i);
  const dateMatch = content.match(/\*\*Date\*\*:\s*([\d-]+)/i);
  const supersededMatch = content.match(/\*\*Supersedes\*\*:\s*ADR-(\d+)/i);
  const supercededByMatch = content.match(/\*\*Superseded By\*\*:\s*ADR-(\d+)/i);
  const titleMatch = content.match(/^#\s+\[?ADR-(\d+)\]?\s+(.+)$/mi);

  return {
    number: titleMatch?.[1] || "0000",
    title: titleMatch?.[2]?.trim() || "Unknown",
    status: statusMatch?.[1] || "Unknown",
    date: dateMatch?.[1] || "Unknown",
    supersedes: supersededMatch?.[1] || null,
    supersededBy: supercededByMatch?.[1] || null,
    filePath,
    content
  };
}

function updateAdrStatus(adr, newStatus, reason) {
  let content = adr.content;

  const statusReplacement = `**Status**: ${newStatus}`;
  content = content.replace(/\*\*Status\*\*:\s*\w+/i, statusReplacement);

  const now = new Date().toISOString().split("T")[0];
  const dateUpdate = `\n**Updated**: ${now}`;
  if (content.includes("**Updated**")) {
    content = content.replace(/\*\*Updated\*\*:\s*[\d-]+/i, dateUpdate.trim());
  } else {
    content = content.replace(/(Date\*\*:[\s\S]*?)(\n)/, `$1${dateUpdate}$2`);
  }

  const historyEntry = `\n- **${now}**: Status changed to ${newStatus}${reason ? ` — ${reason}` : ""}`;
  const historyMatch = content.match(/(## History\n)/);
  if (historyMatch) {
    content = content.replace(historyMatch[1], `${historyMatch[1]}${historyEntry}`);
  } else {
    const lastSection = content.lastIndexOf("\n## ");
    if (lastSection > 0) {
      content = content.slice(0, lastSection) + "\n## History" + historyEntry + content.slice(lastSection);
    }
  }

  if (newStatus === "Superseded" && adr.number) {
    if (!content.includes("**Supersedes**")) {
      content = content.replace(/(Date\*\*:[\s\S]*?)(\n)/, `$1\n**Supersedes**: ADR-${adr.number}$2`);
    }
  }

  return content;
}

function findAdr(number) {
  const num = number.padStart(4, "0");

  const searchDirs = [
    path.join(root, "reference/architecture/adrs")
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    for (const runtime of fs.readdirSync(dir)) {
      const runtimePath = path.join(dir, runtime);
      if (!fs.statSync(runtimePath).isDirectory()) continue;

      const filePath = path.join(runtimePath, `${num}-${Array.from({length: 20}, () => "[^/]").join("")}.md`);
      const files = fs.readdirSync(runtimePath).filter(f => f.startsWith(`${num}-`) && f.endsWith(".md"));

      for (const file of files) {
        const fullPath = path.join(runtimePath, file);
        const adr = parseAdrFile(fullPath);
        if (adr.number === num) {
          return adr;
        }
      }
    }
  }

  return null;
}

const command = args[0];

if (command === "status") {
  const adrNumber = args[1];

  if (adrNumber) {
    const adr = findAdr(adrNumber);
    if (!adr) {
      console.error(`ADR-${adrNumber} not found`);
      process.exit(1);
    }

    console.log(`\n=== ADR-${adr.number}: ${adr.title} ===\n`);
    console.log(`Status: ${adr.status}`);
    console.log(`Date: ${adr.date}`);
    if (adr.supersedes) console.log(`Supersedes: ADR-${adr.supersedes}`);
    if (adr.supersededBy) console.log(`Superseded By: ADR-${adr.supersededBy}`);

    const state = Object.values(STATES).find(s => s.value === adr.status);
    if (state) {
      console.log(`\nValid transitions: ${state.next.join(", ") || "None (final state)"}`);
    }
  } else {
    console.log("\n=== ADR Lifecycle Status Report ===\n");

    const allAdrs = [];
    const adrsDir = path.join(root, "reference/architecture/adrs");

    for (const runtime of fs.readdirSync(adrsDir)) {
      const runtimePath = path.join(adrsDir, runtime);
      if (!fs.statSync(runtimePath).isDirectory()) continue;

      for (const file of fs.readdirSync(runtimePath)) {
        if (file.endsWith(".md") && !file.endsWith(".es.md")) {
          const adr = parseAdrFile(path.join(runtimePath, file));
          allAdrs.push(adr);
        }
      }
    }

    const byStatus = {};
    for (const adr of allAdrs.sort((a, b) => a.number - b.number)) {
      if (!byStatus[adr.status]) byStatus[adr.status] = [];
      byStatus[adr.status].push(adr);
    }

    for (const [status, adrs] of Object.entries(byStatus)) {
      console.log(`## ${status} (${adrs.length})\n`);
      for (const adr of adrs) {
        console.log(`  ADR-${adr.number}: ${adr.title.slice(0, 50)}${adr.title.length > 50 ? "..." : ""}`);
      }
      console.log();
    }

    console.log(`Total ADRs: ${allAdrs.length}`);
  }

  process.exit(0);
}

if (command === "--check-only") {
  console.log("\n=== ADR Structure Validation (--check-only) ===\n");
  const adrsDir = path.join(root, "reference/architecture/adrs");
  let errors = 0;
  let checked = 0;

  for (const runtime of fs.existsSync(adrsDir) ? fs.readdirSync(adrsDir) : []) {
    const runtimePath = path.join(adrsDir, runtime);
    if (!fs.statSync(runtimePath).isDirectory()) continue;

    for (const file of fs.readdirSync(runtimePath)) {
      if (!file.endsWith(".md")) continue;
      // README/index files (e.g. android/README.es.md) are navigation indexes,
      // not ADRs, so they carry no Status/Date header — skip them.
      if (/^README(\.[a-z]{2})?\.md$/i.test(file)) continue;
      checked++;
      const filePath = path.join(runtimePath, file);
      const content = fs.readFileSync(filePath, "utf8");

      // ADRs declare Status/Date in several valid shapes across the bilingual
      // corpus: as a heading (`## Status` / `## Estado` / `## Estatus`), as a
      // bold field (`**Status:**`, `* **Date:**`, `**Fecha:**`), or inside a
      // `## Metadata` / `## Metadatos` section. Accept all of them (EN + ES) so
      // legitimately-formatted ADRs are not flagged.
      // Match the field as: a heading (`## Status`, `## 1. Status`), a bold field
      // including inside a table or list (`**Status:**`, `| **Status** |`,
      // `* **Date:**`), or inside a `## Metadata` / `## Metadatos` section.
      const hasMetadataSection = /^#{1,4}\s+(\d+\.\s+)?.*\b(Metadata|Metadatos)\b/im.test(content);
      const hasStatus = hasMetadataSection
        || /^[ \t>*|-]*\*\*\s*(Status|Estado|Estatus)\b/im.test(content)
        || /^#{1,4}\s+(\d+\.\s+)?(Status|Estado|Estatus)\b/im.test(content);
      const hasDate = hasMetadataSection
        || /^[ \t>*|-]*\*\*\s*(Date|Fecha)\b/im.test(content)
        || /^#{1,4}\s+(\d+\.\s+)?(Date|Fecha)\b/im.test(content);
      if (!hasStatus) {
        console.error(`  ✗ ${runtime}/${file}: missing Status header`);
        errors++;
      }
      if (!hasDate) {
        console.error(`  ✗ ${runtime}/${file}: missing Date header`);
        errors++;
      }
    }
  }

  console.log(`\nChecked ${checked} ADR file(s) across ${fs.existsSync(adrsDir) ? fs.readdirSync(adrsDir).filter(d => fs.statSync(path.join(adrsDir, d)).isDirectory()).length : 0} runtime area(s).`);
  if (errors === 0) {
    console.log("✓ All ADRs have valid structure.");
    process.exit(0);
  } else {
    console.error(`\n✗ ${errors} structural issue(s) found.`);
    process.exit(1);
  }
}

const validCommands = ["propose", "accept", "deprecate", "supersede", "retire"];
if (!validCommands.includes(command)) {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

const adrNumber = args[1];
if (!adrNumber) {
  console.error("Error: Please specify ADR number");
  process.exit(1);
}

const adr = findAdr(adrNumber);
if (!adr) {
  console.error(`ADR-${adrNumber} not found`);
  process.exit(1);
}

let reason = null;
if (args.includes("--reason")) {
  reason = args.slice(args.indexOf("--reason") + 1).join(" ");
}

const dryRun = args.includes("--dry-run");

const currentState = Object.values(STATES).find(s => s.value === adr.status);
let newState;

switch (command) {
  case "propose": newState = "Proposed"; break;
  case "accept": newState = "Accepted"; break;
  case "deprecate": newState = "Deprecated"; break;
  case "supersede": newState = "Superseded"; break;
  case "retire": newState = "Retired"; break;
}

if (!currentState) {
  console.error(`Unknown current status: ${adr.status}`);
  process.exit(1);
}

if (!currentState.next.includes(newState)) {
  console.error(`\nError: Cannot transition from ${adr.status} to ${newState}`);
  console.error(`Valid transitions: ${currentState.next.join(", ")}`);
  process.exit(1);
}

console.log(`\n=== ADR-${adr.number} Lifecycle Update ===\n`);
console.log(`Current: ${adr.status}`);
console.log(`New: ${newState}`);
if (reason) console.log(`Reason: ${reason}`);
console.log(`File: ${adr.filePath}`);

if (dryRun) {
  console.log("\n[DRY RUN] No changes made.");
  process.exit(0);
}

const newContent = updateAdrStatus(adr, newState, reason);
fs.writeFileSync(adr.filePath, newContent, "utf8");

console.log("\n✓ Status updated");

if (adr.filePath.endsWith(".es.md")) {
  console.log("Note: Only EN file was updated. ES counterpart may need manual update.");
}