#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", ".nx"]);

const files = [];
const linkMap = new Map();

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

function collectAnchors(content) {
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

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
}

walk(path.join(root, "reference"));

console.log("\n=== Bilingual Cross-Reference Validator ===\n");

console.log(`Indexing ${files.length} files...`);

for (const file of files) {
  const rel = path.relative(root, file);
  const anchors = collectAnchors(fs.readFileSync(file, "utf8"));
  linkMap.set(rel, { anchors, links: [] });
}

const linkPattern = /!?\[[^\]]*\]\(((?:\.\/?|\.\.\/)[^)\s#]+)(?:#([^)\s]+))?\)/g;

for (const [file, data] of linkMap) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  for (const match of content.matchAll(linkPattern)) {
    const targetPath = match[1];
    const anchor = match[2];
    data.links.push({ path: targetPath, anchor: anchor || null });
  }
}

const issues = [];

for (const [file, data] of linkMap) {
  for (const link of data.links) {
    if (link.path.startsWith("http") || link.path.startsWith("//")) continue;

    const base = path.dirname(file);
    const resolved = path.resolve(base, decodeURI(link.path));
    const relResolved = path.relative(root, resolved);

    if (!fs.existsSync(resolved)) {
      issues.push({
        type: "broken_link",
        file,
        link: link.path,
        target: relResolved || link.path,
        message: `broken link to ${link.path}`
      });
      continue;
    }

    if (link.anchor && relResolved.endsWith(".md")) {
      const targetAnchors = linkMap.get(relResolved)?.anchors || new Set();
      if (!targetAnchors.has(link.anchor.toLowerCase())) {
        issues.push({
          type: "broken_anchor",
          file,
          link: link.path,
          anchor: link.anchor,
          target: relResolved,
          message: `broken anchor #${link.anchor} in ${link.path}`
        });
      }
    }
  }
}

const bilingualIssues = [];

for (const [file, data] of linkMap) {
  if (!file.endsWith(".es.md")) continue;

  const enFile = file.replace(/\.es\.md$/, ".md");
  const enExists = fs.existsSync(path.join(root, enFile));

  if (!enExists) continue;

  const enContent = fs.readFileSync(path.join(root, enFile), "utf8");

  const enLinkPattern = /!?\[[^\]]*\]\(((?:\.\/?|\.\.\/)[^)\s#]+)(?:#([^)\s]+))?\)/g;
  const esLinkPattern = /!?\[[^\]]*\]\(((?:\.\/?|\.\.\/)[^)\s#]+)(?:#([^)\s]+))?\)/g;

  const enLinks = [...enContent.matchAll(enLinkPattern)].map(m => ({
    path: m[1],
    anchor: m[2] || null
  }));

  const esLinks = [...data.links];

  const enLinkedFiles = new Set(enLinks.map(l => {
    if (l.path.startsWith("http")) return null;
    const base = path.dirname(enFile);
    const resolved = path.resolve(base, decodeURI(l.path));
    return path.relative(root, resolved);
  }).filter(Boolean));

  const esLinkedFiles = new Set(esLinks.map(l => {
    if (l.path.startsWith("http")) return null;
    const base = path.dirname(file);
    const resolved = path.resolve(base, decodeURI(l.path));
    return path.relative(root, resolved);
  }).filter(Boolean));

  for (const enL of enLinks) {
    if (enL.path.startsWith("http")) continue;

    const base = path.dirname(enFile);
    const resolved = path.resolve(base, decodeURI(enL.path));
    const enTarget = path.relative(root, resolved);

    const esCounterpart = enTarget.endsWith(".md") && !enTarget.endsWith(".es.md")
      ? enTarget.replace(/\.md$/, ".es.md")
      : enTarget + ".es.md";

    if (fs.existsSync(path.join(root, esCounterpart)) && !esLinkedFiles.has(esCounterpart)) {
      bilingualIssues.push({
        type: "missing_es_link",
        file,
        link: enL.path,
        suggestion: enL.path.replace(/\.md$/, ".es.md"),
        message: `EN links to ${enL.path}, but ES counterpart ${esCounterpart} not linked`
      });
    }
  }
}

const allIssues = [...issues, ...bilingualIssues];

if (allIssues.length > 0) {
  console.error(`\n\x1b[31mFound ${allIssues.length} cross-reference issues:\x1b[0m\n`);

  const brokenLinks = allIssues.filter(i => i.type === "broken_link" || i.type === "broken_anchor");
  if (brokenLinks.length > 0) {
    console.error("### Broken Links / Anchors\n");
    for (const issue of brokenLinks.slice(0, 20)) {
      console.error(`  \x1b[31m✗\x1b[0m ${issue.file}`);
      console.error(`    ${issue.message}`);
    }
    if (brokenLinks.length > 20) {
      console.error(`    ... and ${brokenLinks.length - 20} more\n`);
    }
    console.error();
  }

  const missingLinks = allIssues.filter(i => i.type === "missing_es_link");
  if (missingLinks.length > 0) {
    console.error("### Bilingual Link Gaps\n");
    for (const issue of missingLinks.slice(0, 20)) {
      console.error(`  \x1b[33m!\x1b[0m ${issue.file}`);
      console.error(`    ${issue.message}`);
      console.error(`    Suggestion: Add [link](${issue.suggestion})`);
    }
    if (missingLinks.length > 20) {
      console.error(`    ... and ${missingLinks.length - 20} more\n`);
    }
    console.error();
  }

  console.error("Run 'node .harness/scripts/validate-docs.mjs' for full validation.");
  process.exit(1);
}

console.log("\x1b[32m✓\x1b[0m Cross-reference validation passed");
console.log(`  Indexed ${files.length} files`);
console.log(`  Checked ${linkMap.size} documents`);
process.exit(0);