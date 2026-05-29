#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: node .harness/scripts/bilingual-diff.mjs <en-file.md> [options]

Shows what changes are needed in the ES counterpart when EN file changes.

Options:
  --diff <git-range>   Show files changed in git range
  --file <file>        Compare specific EN file with its ES counterpart
  --list               List all EN files that have ES counterparts
  --report             Generate full diff report for all paired files

Examples:
  node .harness/scripts/bilingual-diff.mjs --file reference/architecture/README.md
  node .harness/scripts/bilingual-diff.mjs --diff main..HEAD
  node .harness/scripts/bilingual-diff.mjs --report
`);
  process.exit(0);
}

const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", ".nx"]);

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

function extractAnchors(content) {
  const anchors = new Set();
  const seen = new Map();
  const headingPattern = /^#{1,6}\s+(.+)$/gm;
  for (const match of content.matchAll(headingPattern)) {
    const base = githubSlug(match[1]);
    if (!base) continue;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

function extractHeaders(content) {
  const headers = [];
  const pattern = /^#{1,6}\s+(.+)$/gm;
  for (const match of content.matchAll(pattern)) {
    headers.push({ level: match[1].length, text: match[1].trim() });
  }
  return headers;
}

function countHeaders(content) {
  const pattern = /^#{2,3}\s+.+$/gm;
  return (content.match(pattern) || []).length;
}

function compareFiles(enFile, esFile) {
  const enContent = fs.readFileSync(enFile, "utf8");
  const esExists = fs.existsSync(esFile);

  const enHeaders = countHeaders(enContent);
  const enAnchors = extractAnchors(enContent);
  const enHeadersList = extractHeaders(enContent);

  const report = {
    file: path.relative(root, enFile),
    esExists,
    headerDiff: 0,
    newAnchors: [],
    missingAnchors: [],
    headerStructureDiff: []
  };

  if (!esExists) {
    report.headerDiff = enHeaders;
    report.newAnchors = [...enAnchors];
    return report;
  }

  const esContent = fs.readFileSync(esFile, "utf8");
  const esHeaders = countHeaders(esContent);
  const esAnchors = extractAnchors(esContent);
  const esHeadersList = extractHeaders(esContent);

  report.headerDiff = enHeaders - esHeaders;

  report.newAnchors = [...enAnchors].filter(a => !esAnchors.has(a));
  report.missingAnchors = [...esAnchors].filter(a => !enAnchors.has(a));

  if (enHeadersList.length !== esHeadersList.length) {
    for (let i = 0; i < Math.max(enHeadersList.length, esHeadersList.length); i++) {
      const enH = enHeadersList[i];
      const esH = esHeadersList[i];
      if (enH && !esH) {
        report.headerStructureDiff.push({
          position: i + 1,
          type: "missing_in_es",
          level: enH.level,
          text: enH.text
        });
      } else if (!enH && esH) {
        report.headerStructureDiff.push({
          position: i + 1,
          type: "extra_in_es",
          level: esH.level,
          text: esH.text
        });
      } else if (enH.level !== esH.level) {
        report.headerStructureDiff.push({
          position: i + 1,
          type: "level_mismatch",
          enLevel: enH.level,
          esLevel: esH.level,
          text: enH.text
        });
      }
    }
  }

  return report;
}

function findPairs() {
  const pairs = [];
  const enFiles = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md") && !entry.name.endsWith(".es.md")) {
        enFiles.push(full);
      }
    }
  }

  walk(path.join(root, "reference"));

  for (const enFile of enFiles) {
    const esFile = enFile.replace(/\.md$/, ".es.md");
    if (fs.existsSync(esFile)) {
      pairs.push({ en: enFile, es: esFile });
    }
  }

  return pairs;
}

if (args.includes("--list")) {
  const pairs = findPairs();
  console.log(`\n=== ${pairs.length} Paired Files ===\n`);
  for (const p of pairs) {
    console.log(`  ${path.relative(root, p.en)}`);
  }
  console.log();
  process.exit(0);
}

if (args.includes("--report")) {
  const pairs = findPairs();
  console.log(`\n=== Bilingual Diff Report ===\n`);
  console.log(`Total paired files: ${pairs.length}\n`);

  let totalDiff = 0;
  const filesWithIssues = [];

  for (const p of pairs) {
    const report = compareFiles(p.en, p.es);
    if (report.headerDiff !== 0 || report.newAnchors.length > 0 || report.headerStructureDiff.length > 0) {
      filesWithIssues.push(report);
      totalDiff += Math.abs(report.headerDiff);
    }
  }

  if (filesWithIssues.length === 0) {
    console.log("\x1b[32m✓\x1b[0m All paired files are in sync!");
  } else {
    console.log(`Found ${filesWithIssues.length} files with differences:\n`);
    for (const r of filesWithIssues) {
      console.log(`  \x1b[33m!\x1b[0m ${r.file}`);
      if (r.headerDiff !== 0) {
        console.log(`    Headers: ${r.headerDiff > 0 ? "+" : ""}${r.headerDiff} (${Math.abs(r.headerDiff)} ${r.headerDiff > 0 ? "missing" : "extra"} in ES)`);
      }
      if (r.newAnchors.length > 0) {
        console.log(`    New anchors in EN: ${r.newAnchors.slice(0, 3).join(", ")}${r.newAnchors.length > 3 ? "..." : ""}`);
      }
      if (r.headerStructureDiff.length > 0) {
        console.log(`    Structure differences: ${r.headerStructureDiff.length}`);
      }
      console.log();
    }
    console.log(`Total header difference: ${totalDiff}`);
  }
  process.exit(0);
}

if (args.includes("--file")) {
  const fileIdx = args.indexOf("--file") + 1;
  if (fileIdx >= args.length) {
    console.error("Error: --file requires a path argument");
    process.exit(1);
  }

  const enFile = path.resolve(args[fileIdx]);
  const esFile = enFile.replace(/\.md$/, ".es.md");

  if (!enFile.endsWith(".md") || enFile.endsWith(".es.md")) {
    console.error("Error: Please specify an EN file (.md not .es.md)");
    process.exit(1);
  }

  const report = compareFiles(enFile, esFile);

  console.log(`\n=== Bilingual Diff: ${report.file} ===\n`);
  console.log(`ES counterpart: ${report.esExists ? "exists" : "MISSING"}`);
  console.log(`Header diff: ${report.headerDiff !== 0 ? (report.headerDiff > 0 ? "+" : "") + report.headerDiff + " (ES needs " + Math.abs(report.headerDiff) + " more)" : "in sync"}`);

  if (report.newAnchors.length > 0) {
    console.log(`\nNew anchors in EN (need translation in ES):`);
    for (const a of report.newAnchors) {
      console.log(`  - #${a}`);
    }
  }

  if (report.missingAnchors.length > 0) {
    console.log(`\nExtra anchors in ES (not in EN):`);
    for (const a of report.missingAnchors) {
      console.log(`  - #${a}`);
    }
  }

  if (report.headerStructureDiff.length > 0) {
    console.log(`\nHeader structure differences:`);
    for (const h of report.headerStructureDiff) {
      const prefix = "#".repeat(h.level);
      switch (h.type) {
        case "missing_in_es":
          console.log(`  \x1b[31m-\x1b[0m ${prefix} ${h.text} (missing in ES)`);
          break;
        case "extra_in_es":
          console.log(`  \x1b[32m+\x1b[0m ${prefix} ${h.text} (extra in ES)`);
          break;
        case "level_mismatch":
          console.log(`  \x1b[33m~\x1b[0m ${h.text} (EN: h${h.enLevel}, ES: h${h.esLevel})`);
          break;
      }
    }
  }

  console.log();
  process.exit(report.headerDiff !== 0 || report.newAnchors.length > 0 ? 1 : 0);
}

console.error("Error: Please specify an option. Use --help for usage.");
process.exit(1);