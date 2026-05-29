#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: node .harness/scripts/generate-es-skeleton.mjs <file.md> [file2.md ...]

Creates a Spanish skeleton (.es.md) from an English markdown file.

Options:
  --force   Overwrite existing ES file
  --dry-run Show what would be created without writing files

Examples:
  node .harness/scripts/generate-es-skeleton.mjs reference/architecture/README.md
  node .harness/scripts/generate-es-skeleton.mjs reference/governance/*.md
  node .harness/scripts/generate-es-skeleton.mjs --dry-run reference/architecture/
`);
  process.exit(0);
}

const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const files = args.filter(f => !f.startsWith("--"));

function githubSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1]. : null;
}

function extractHeaders(content) {
  const headers = [];
  const pattern = /^(#{2,3})\s+(.+)$/gm;
  for (const match of content.matchAll(pattern)) {
    headers.push({ level: match[1].length, text: match[2].trim() });
  }
  return headers;
}

function generateSkeleton(content) {
  const title = extractTitle(content);
  const headers = extractHeaders(content);

  let skeleton = "";

  if (title) {
    skeleton += `# ${title}\n\n`;
  }

  skeleton += "> **Nota:** Este archivo es un esqueleto inicial. Por favor, complete la traducción.\n\n";

  if (headers.length > 0) {
    skeleton += "---\n\n";
    for (const h of headers) {
      skeleton += `${"#".repeat(h.level)} ${h.text}\n\n`;
      skeleton += `*Contenido pendiente de traducción.*\n\n`;
    }
  }

  return skeleton;
}

function processFile(enFile) {
  if (!fs.existsSync(enFile)) {
    console.error(`  ✗ File not found: ${enFile}`);
    return { file: enFile, status: "error", reason: "not found" };
  }

  if (enFile.endsWith(".es.md")) {
    return { file: enFile, status: "skip", reason: "already Spanish" };
  }

  const esFile = enFile.replace(/\.md$/, ".es.md");

  if (fs.existsSync(esFile) && !force) {
    return { file: esFile, status: "skip", reason: "already exists" };
  }

  const content = fs.readFileSync(enFile, "utf8");
  const skeleton = generateSkeleton(content);

  if (dryRun) {
    return { file: esFile, status: "dry-run", skeleton };
  }

  fs.writeFileSync(esFile, skeleton, "utf8");
  return { file: esFile, status: "created" };
}

function walkDir(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.name.endsWith(".md") && !entry.name.endsWith(".es.md")) {
      results.push(full);
    }
  }
  return results;
}

console.log("\n=== EN → ES Skeleton Generator ===\n");

const filesToProcess = [];

for (const arg of files) {
  if (arg.includes("*")) {
    const dir = path.dirname(arg);
    const pattern = path.basename(arg);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const found = walkDir(dir).filter(f => {
        if (pattern === "*.md") return true;
        return f.includes(pattern.replace("*", ""));
      });
      filesToProcess.push(...found);
    }
  } else if (fs.existsSync(arg)) {
    if (fs.statSync(arg).isDirectory()) {
      filesToProcess.push(...walkDir(arg));
    } else if (arg.endsWith(".md")) {
      filesToProcess.push(arg);
    }
  }
}

const results = [];
for (const file of filesToProcess) {
  results.push(processFile(file));
}

console.log(`Processing ${filesToProcess.length} file(s)...\n`);

let created = 0, skipped = 0, errors = 0, dryRuns = 0;

for (const r of results) {
  switch (r.status) {
    case "created":
      console.log(`  ✓ Created: ${r.file}`);
      created++;
      break;
    case "dry-run":
      console.log(`  → Would create: ${r.file}`);
      console.log(`    Preview: ${r.skeleton.slice(0, 80).replace(/\n/g, " ")}...`);
      dryRuns++;
      break;
    case "skip":
      console.log(`  ○ Skipped: ${r.file} (${r.reason})`);
      skipped++;
      break;
    case "error":
      console.log(`  ✗ Error: ${r.file} (${r.reason})`);
      errors++;
      break;
  }
}

console.log(`\nSummary: ${created} created, ${skipped} skipped, ${errors} errors${dryRuns > 0 ? `, ${dryRuns} would create` : ""}`);
console.log("\nNote: Review and complete translations before committing.");