#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

const memoryPath = path.join(root, ".harness/translation-memory.json");
const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", ".nx"]);

let memory = {
  phrases: {},
  patterns: {},
  lastUpdated: null
};

if (fs.existsSync(memoryPath)) {
  memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
}

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function learnPhrase(en, es) {
  const key = tokenize(en).slice(0, 5).join(" ");

  if (!memory.phrases[key]) {
    memory.phrases[key] = { en, es, count: 0, lastUsed: null };
  }

  memory.phrases[key].count++;
  memory.phrases[key].lastUsed = new Date().toISOString();
  memory.phrases[key].es = es;
}

function learnPattern(pattern, translation) {
  if (!memory.patterns[pattern]) {
    memory.patterns[pattern] = { count: 0, translations: [] };
  }

  const existing = memory.patterns[pattern].translations.find(t => t.text === translation);
  if (existing) {
    existing.count++;
  } else {
    memory.patterns[pattern].translations.push({ text: translation, count: 1 });
  }

  memory.patterns[pattern].count++;
}

function extractPhrases(enContent, esContent) {
  const enLines = enContent.split("\n");
  const esLines = esContent.split("\n");

  for (let i = 0; i < Math.min(enLines.length, esLines.length); i++) {
    const enLine = enLines[i].trim();
    const esLine = esLines[i].trim();

    if (enLine.length > 20 && esLine.length > 20 &&
        !enLine.startsWith("#") && !enLine.startsWith("```") &&
        !esLine.startsWith("#") && !esLine.startsWith("```")) {

      const enTokens = tokenize(enLine);
      const esTokens = tokenize(esLine);

      if (enTokens.length > 3 && enTokens.length < 50) {
        const common = enTokens.filter(t => esTokens.includes(t)).length;
        if (common < enTokens.length / 3) {
          learnPhrase(enLine, esLine);
        }
      }
    }
  }

  const headerPattern = /^#{1,3}\s+(.+)$/gm;
  let enMatch, esMatch;

  while ((enMatch = headerPattern.exec(enContent)) !== null) {
    const esPattern = new RegExp(`^#{1,3}\\s+${enMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "m");
    esMatch = esPattern.exec(esContent);
    if (esMatch) {
      learnPattern(enMatch[1], esMatch[1]);
    }
  }
}

function findMatches(text) {
  const suggestions = [];
  const tokens = tokenize(text);

  const key = tokens.slice(0, 5).join(" ");
  if (memory.phrases[key]) {
    suggestions.push({
      type: "phrase",
      original: memory.phrases[key].en,
      suggestion: memory.phrases[key].es,
      confidence: Math.min(memory.phrases[key].count / 10, 1)
    });
  }

  for (const [pattern, data] of Object.entries(memory.patterns)) {
    if (text.toLowerCase().includes(pattern.toLowerCase())) {
      const topTrans = data.translations.sort((a, b) => b.count - a.count)[0];
      if (topTrans) {
        suggestions.push({
          type: "pattern",
          original: pattern,
          suggestion: topTrans.text,
          confidence: Math.min(data.count / 5, 1)
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function buildMemory() {
  console.log("\n=== Building Translation Memory ===\n");

  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md") && entry.name.endsWith(".es.md")) {
        files.push(full);
      }
    }
  }

  walk(path.join(root, "reference"));

  let processed = 0;

  for (const esFile of files) {
    const enFile = esFile.replace(/\.es\.md$/, ".md");
    if (!fs.existsSync(enFile)) continue;

    const enContent = fs.readFileSync(enFile, "utf8");
    const esContent = fs.readFileSync(esFile, "utf8");

    extractPhrases(enContent, esContent);
    processed++;
  }

  memory.lastUpdated = new Date().toISOString();
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), "utf8");

  const phraseCount = Object.keys(memory.phrases).length;
  const patternCount = Object.keys(memory.patterns).length;

  console.log(`✓ Processed ${processed} paired files`);
  console.log(`✓ Learned ${phraseCount} phrase mappings`);
  console.log(`✓ Learned ${patternCount} pattern mappings`);
  console.log(`\nMemory saved to: ${memoryPath}`);
}

if (args.includes("--build")) {
  buildMemory();
  process.exit(0);
}

if (args.includes("--suggest") || args.includes("-s")) {
  const text = args.slice(args.indexOf("--suggest") + 1).join(" ") ||
               args.slice(args.indexOf("-s") + 1).join(" ");

  if (!text) {
    console.error("Error: Please provide text to get suggestions for");
    process.exit(1);
  }

  const suggestions = findMatches(text);

  console.log("\n=== Translation Suggestions ===\n");
  console.log(`Input: ${text}\n`);

  if (suggestions.length === 0) {
    console.log("No suggestions found. Try building the memory first:");
    console.log("  node .harness/scripts/translation-memory.mjs --build");
  } else {
    for (const s of suggestions) {
      console.log(`[${(s.confidence * 100).toFixed(0)}%] ${s.type.toUpperCase()}`);
      console.log(`  Original: ${s.original}`);
      console.log(`  Suggest:  ${s.suggestion}\n`);
    }
  }

  process.exit(0);
}

if (args.includes("--stats")) {
  console.log("\n=== Translation Memory Stats ===\n");
  console.log(`Phrases: ${Object.keys(memory.phrases).length}`);
  console.log(`Patterns: ${Object.keys(memory.patterns).length}`);
  console.log(`Last updated: ${memory.lastUpdated || "Never"}`);

  const topPhrases = Object.entries(memory.phrases)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  if (topPhrases.length > 0) {
    console.log("\nTop phrases by usage:");
    for (const [key, data] of topPhrases) {
      console.log(`  [${data.count}x] ${data.en.slice(0, 50)}...`);
    }
  }

  process.exit(0);
}

console.log(`
Usage: node .harness/scripts/translation-memory.mjs [command]

Commands:
  --build           Build memory from existing EN/ES pairs
  --suggest <text>  Get translation suggestions for text
  -s <text>         Short form of --suggest
  --stats           Show memory statistics

Examples:
  node .harness/scripts/translation-memory.mjs --build
  node .harness/scripts/translation-memory.mjs --suggest "Clean Architecture with NestJS"
`);