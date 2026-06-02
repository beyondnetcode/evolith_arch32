#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

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

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function generateIndex(dir, pairs, language) {
  const relDir = path.relative(path.join(root, "reference"), dir);

  let index = "";

  if (language === "en") {
    index = `# Bilingual Index: ${relDir || "reference"}\n\n`;
    index += "> Auto-generated index of EN/ES pairs. Do not edit manually.\n\n";
  } else {
    index = `# Índice Bilingüe: ${relDir || "reference"}\n\n`;
    index += "> Índice auto-generado de pares EN/ES. No editar manualmente.\n\n";
  }

  const grouped = {};

  for (const p of pairs) {
    const pDir = path.relative(dir, path.dirname(p.en));
    if (!grouped[pDir]) grouped[pDir] = [];
    grouped[pDir].push(p);
  }

  const sortedDirs = Object.keys(grouped).sort();

  for (const subDir of sortedDirs) {
    if (subDir === ".") {
      index += `## Files\n\n`;
    } else {
      const subDirDisplay = subDir.replace(/^\.\//, "");
      index += `## ${subDirDisplay}\n\n`;
    }

    index += `| EN | ES | Status |\n`;
    index += `|----|----|--------|\n`;

    for (const p of grouped[subDir].sort((a, b) => path.basename(a.en).localeCompare(path.basename(b.en)))) {
      const enName = path.basename(p.en);
      const esName = path.basename(p.es);
      const enTitle = extractTitle(fs.readFileSync(p.en, "utf8")) || enName;
      const esTitle = extractTitle(fs.readFileSync(p.es, "utf8")) || esName;

      const enRel = path.relative(dir, p.en);
      const esRel = path.relative(dir, p.es);

      index += `| [${enName}](${enRel}) | [${esName}](${esRel}) | OK |\n`;
    }

    index += "\n";
  }

  return index;
}

function findPairs(dir) {
  const pairs = [];

  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md") && !entry.name.endsWith(".es.md")) {
        const esFile = full.replace(/\.md$/, ".es.md");
        if (fs.existsSync(esFile)) {
          pairs.push({ en: full, es: esFile });
        }
      }
    }
  }

  walk(dir);
  return pairs;
}

const referenceDir = path.join(root, "reference");
const navigationDir = path.join(referenceDir, "navigation");

console.log("\n=== Bilingual Index Generator ===\n");

const allPairs = findPairs(referenceDir);
console.log(`Found ${allPairs.length} paired EN/ES files\n`);

const topLevelIndex = generateIndex(referenceDir, allPairs, "en");
fs.writeFileSync(path.join(navigationDir, "BILINGUAL_INDEX.md"), topLevelIndex, "utf8");
console.log("✓ Generated reference/navigation/BILINGUAL_INDEX.md");

const esTopLevelIndex = generateIndex(referenceDir, allPairs, "es");
fs.writeFileSync(path.join(navigationDir, "INDICE_BILINGUE.md"), esTopLevelIndex, "utf8");
console.log("✓ Generated reference/navigation/INDICE_BILINGUE.md");

const areas = {};
for (const p of allPairs) {
  const rel = path.relative(referenceDir, path.dirname(p.en));
  const area = rel.split(path.sep)[0] || "root";
  if (!areas[area]) areas[area] = [];
  areas[area].push(p);
}

for (const area of Object.keys(areas).sort()) {
  const areaDir = path.join(referenceDir, area);
  if (fs.existsSync(areaDir)) {
    const areaIndex = generateIndex(areaDir, areas[area], "en");
    fs.writeFileSync(path.join(areaDir, "README.md"), areaIndex, "utf8");
    console.log(`✓ Generated ${area}/README.md`);

    const esAreaIndex = generateIndex(areaDir, areas[area], "es");
    fs.writeFileSync(path.join(areaDir, "README.es.md"), esAreaIndex, "utf8");
    console.log(`✓ Generated ${area}/README.es.md`);
  }
}

console.log("\nOK All indexes generated!");
console.log("\nNote: Indexes are auto-generated. To update, run:");
console.log("  node .harness/scripts/generate-bilingual-index.mjs")