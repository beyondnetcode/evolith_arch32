#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const shouldRenderMermaid = process.argv.includes("--render-mermaid");
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".nx",
]);

const markdownFiles = [];
const mermaidBlocks = [];
const failures = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(directory, entry.name));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      markdownFiles.push(path.join(directory, entry.name));
    }
  }
}

function location(file, index, content) {
  const line = content.slice(0, index).split("\n").length;
  return `${path.relative(root, file)}:${line}`;
}

function addFailure(file, index, content, message) {
  failures.push(`${location(file, index, content)} ${message}`);
}

function validateCharacters(file, content) {
  const disallowedPatterns = [
    { pattern: /\uFFFD/g, message: "contains replacement character U+FFFD" },
    { pattern: /\?\?/g, message: "contains corrupted or placeholder marker ??" },
    { pattern: /[\u{1F000}-\u{1FAFF}]/gu, message: "contains emoji or pictographic symbol" },
    { pattern: /[\u2600-\u27BF]/gu, message: "contains emoji-like symbol" },
    { pattern: /¡/g, message: "contains inverted exclamation marker; avoid decorative punctuation in standard Markdown" },
    { pattern: /(?:ínico|ínica|íNICAMENTE|NINGíN|ípica|ípicas|íltima|íltimo|ípoca|írbol|ínfasis|ítil)/g, message: "contains corrupted Spanish mojibake word" },
    { pattern: /TíCNICA/g, message: "contains corrupted uppercase accented text" },
    { pattern: /¡\s*(Proposed|Propuesto)/g, message: "contains corrupted status marker" },
    { pattern: /(?:â|ð|Ã|Â)/g, message: "contains likely mojibake character" },
  ];

  for (const rule of disallowedPatterns) {
    for (const match of content.matchAll(rule.pattern)) {
      addFailure(file, match.index ?? 0, content, rule.message);
    }
  }
}

function validateRelativeLinks(file, content) {
  const linkPattern = /\]\(((?:\.\/|\.\.\/)[^)#]+)(?:#[^)]+)?\)/g;
  const base = path.dirname(file);

  for (const match of content.matchAll(linkPattern)) {
    const target = match[1];
    if (!fs.existsSync(path.resolve(base, target))) {
      addFailure(file, match.index ?? 0, content, `broken relative link: ${target}`);
    }
  }
}

function validateMermaid(file, content) {
  const fencePattern = /^```mermaid\s*$([\s\S]*?)^```\s*$/gm;
  const openingFencePattern = /^```mermaid\s*$/gm;
  const validStarts = /^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram|stateDiagram-v2|journey|gantt|pie|mindmap|timeline|quadrantChart|C4Context|C4Container)\b/;
  const openings = [...content.matchAll(openingFencePattern)];
  const blocks = [...content.matchAll(fencePattern)];

  if (openings.length !== blocks.length) {
    for (const match of openings) {
      addFailure(file, match.index ?? 0, content, "contains an unclosed or malformed mermaid fence");
    }
    return;
  }

  for (const block of blocks) {
    const body = block[1].trim();
    const firstLine = body.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "";

    if (!body) {
      addFailure(file, block.index ?? 0, content, "contains an empty mermaid diagram");
      continue;
    }

    if (!validStarts.test(firstLine)) {
      addFailure(file, block.index ?? 0, content, `mermaid diagram starts with unsupported declaration: ${firstLine}`);
    }

    if (/\t/.test(body)) {
      addFailure(file, block.index ?? 0, content, "mermaid diagram contains tabs; use spaces for stable rendering");
    }

    if (/^\s*participant\s+\S+\s+as\s+[^"\n]*[()]/m.test(body)) {
      addFailure(file, block.index ?? 0, content, "sequenceDiagram participant label with punctuation must be quoted");
    }

    mermaidBlocks.push({
      file,
      index: block.index ?? 0,
      body,
    });
  }
}

function renderMermaidBlocks() {
  if (!shouldRenderMermaid || failures.length > 0) {
    return;
  }

  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "arc32-mermaid-"));

  for (let index = 0; index < mermaidBlocks.length; index += 1) {
    const block = mermaidBlocks[index];
    const basename = `${String(index + 1).padStart(3, "0")}-${path
      .relative(root, block.file)
      .replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
    const input = path.join(outputDirectory, `${basename}.mmd`);
    const output = path.join(outputDirectory, `${basename}.svg`);

    fs.writeFileSync(input, `${block.body}\n`, "utf8");

    const result = spawnSync(
      "npx",
      ["-y", "@mermaid-js/mermaid-cli", "-i", input, "-o", output, "-b", "transparent"],
      { encoding: "utf8" },
    );

    if (result.status !== 0) {
      addFailure(
        block.file,
        block.index,
        fs.readFileSync(block.file, "utf8"),
        `mermaid render failed: ${(result.stderr || result.stdout).trim()}`,
      );
    }
  }
}

walk(root);

for (const file of markdownFiles) {
  const content = fs.readFileSync(file, "utf8");
  validateCharacters(file, content);
  validateRelativeLinks(file, content);
  validateMermaid(file, content);
}

renderMermaidBlocks();

if (failures.length > 0) {
  console.error("Documentation validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const mermaidMessage = shouldRenderMermaid ? ` and rendered ${mermaidBlocks.length} Mermaid diagrams` : "";
console.log(`Documentation validation passed for ${markdownFiles.length} Markdown files${mermaidMessage}.`);
