#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

const verbose = args.includes("--verbose");
const fix = args.includes("--fix");

const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", ".nx"]);

const files = [];
const linkGraph = new Map();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
}

walk(path.join(root, "reference"));

for (const file of files) {
  const rel = path.relative(root, file);
  const content = fs.readFileSync(file, "utf8");

  const linkPattern = /!?\[[^\]]*\]\(((?:\.\.?\/)?[^)\s#]+)(?:#([^)\s]+))?\)/g;

  const links = [];
  for (const match of content.matchAll(linkPattern)) {
    if (match[1].startsWith("http") || match[1].startsWith("//")) continue;

    let targetPath;
    try {
      const base = path.dirname(file);
      targetPath = path.resolve(base, decodeURI(match[1]));
      targetPath = path.relative(root, targetPath);
    } catch {
      continue;
    }

    links.push({
      path: targetPath,
      anchor: match[2] || null,
      fullMatch: match[0]
    });
  }

  linkGraph.set(rel, links);
}

const issues = [];

for (const [file, links] of linkGraph) {
  if (!file.endsWith(".es.md")) continue;

  const enFile = file.replace(/\.es\.md$/, ".md");
  const enExists = fs.existsSync(path.join(root, enFile));

  if (!enExists) continue;

  const enLinks = linkGraph.get(enFile) || [];

  const pairedLinks = new Set();
  for (const link of enLinks) {
    if (link.path.endsWith(".md") && !link.path.endsWith(".es.md")) {
      pairedLinks.add(link.path);
      pairedLinks.add(link.path.replace(/\.md$/, ".es.md"));
    }
  }

  for (const link of links) {
    if (!link.path.endsWith(".md")) continue;

    const enCounterpart = link.path.replace(/\.es\.md$/, ".md");

    if (pairedLinks.has(link.path)) {
      const esHasPair = link.path.endsWith(".es.md") ?
        fs.existsSync(path.join(root, link.path)) :
        fs.existsSync(path.join(root, link.path.replace(/\.md$/, ".es.md")));

      if (!esHasPair && !link.path.endsWith(".es.md")) {
        const esPath = link.path.replace(/\.md$/, ".es.md");
        if (fs.existsSync(path.join(root, esPath))) {
          issues.push({
            type: "reciprocity_missing",
            file,
            link: link.fullMatch,
            target: link.path,
            suggestion: link.path.replace(/\.md$/, ".es.md"),
            message: `EN links to ${link.path}, but ES links to counterpart ${esPath} is missing in reciprocal`
          });
        }
      }
    }
  }

  for (const link of enLinks) {
    if (!link.path.endsWith(".md")) continue;
    if (link.path.endsWith(".es.md")) continue;

    const esPath = link.path.replace(/\.md$/, ".es.md");
    const esContent = linkGraph.get(esPath);

    if (!esContent) {
      const esFileExists = fs.existsSync(path.join(root, esPath));
      if (esFileExists) {
        issues.push({
          type: "reciprocity_broken",
          file: enFile,
          target: esPath,
          message: `EN links to ${link.path} but ES file has no links back`
        });
      }
    }
  }
}

console.log("\n=== Link Reciprocity Check ===\n");

if (issues.length === 0) {
  console.log("✓ All bilingual pairs link reciprocally");
  process.exit(0);
}

console.log(`Found ${issues.length} reciprocity issues:\n`);

for (const issue of issues) {
  const relFile = issue.file.replace(root + "/", "");
  console.log(`  \x1b[33m!\x1b[0m ${relFile}`);

  if (verbose || issue.type === "reciprocity_missing") {
    console.log(`    ${issue.message}`);
    if (issue.suggestion) {
      console.log(`    Suggestion: Update link to ${issue.suggestion}`);
    }
  }
  console.log();
}

if (fix) {
  console.log("\n[Auto-fix not implemented yet]");
  console.log("Consider updating links manually to ensure EN/ES pairs reference each other.");
}

process.exit(issues.length > 0 ? 1 : 0);