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
const fileCache = new Map();

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

function readUtf8(file) {
  if (!fileCache.has(file)) {
    fileCache.set(file, fs.readFileSync(file, "utf8"));
  }
  return fileCache.get(file);
}

function location(file, index, content) {
  const line = content.slice(0, index).split("\n").length;
  return `${path.relative(root, file)}:${line}`;
}

function addFailure(file, index, content, message) {
  failures.push(`${location(file, index, content)} ${message}`);
}

function stripCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, (match) => match.replace(/[^\r\n]/g, " "));
}

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
  const cleanContent = stripCodeBlocks(content);
  const headingPattern = /^(#{1,6})\s+(.+)$/gm;

  for (const match of cleanContent.matchAll(headingPattern)) {
    const base = githubSlug(match[2]);
    if (!base) {
      continue;
    }

    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  const htmlAnchorPattern = /<a\s+name=["']([^"']+)["']\s*>/gi;
  for (const match of cleanContent.matchAll(htmlAnchorPattern)) {
    anchors.add(match[1].toLowerCase());
  }

  return anchors;
}

function validateCharacters(file, content) {
  const cleanContent = stripCodeBlocks(content);

  const disallowedPatterns = [
    { pattern: /\uFEFF/g, message: "contains UTF-8 BOM marker" },
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
    for (const match of cleanContent.matchAll(rule.pattern)) {
      addFailure(file, match.index ?? 0, content, rule.message);
    }
  }
}

function validateLineEndings(file, content) {
  const crlfIndex = content.indexOf("\r\n");
  if (crlfIndex >= 0) {
    addFailure(file, crlfIndex, content, "contains CRLF line endings; use LF for cross-platform documentation stability");
  }
}

function validateRelativeLinks(file, content) {
  const linkPattern = /!?\[[^\]]*\]\(((?:\.\/?|\.\.\/)[^)\s]+)\)/g;
  const base = path.dirname(file);

  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1];
    const [targetPath, rawAnchor] = rawTarget.split("#");
    const resolved = path.resolve(base, decodeURI(targetPath));

    if (!fs.existsSync(resolved)) {
      addFailure(file, match.index ?? 0, content, `broken relative link: ${rawTarget}`);
      continue;
    }

    if (rawAnchor && resolved.endsWith(".md")) {
      const anchors = collectAnchors(readUtf8(resolved));
      const normalizedAnchor = decodeURIComponent(rawAnchor).toLowerCase();
      if (!anchors.has(normalizedAnchor)) {
        addFailure(file, match.index ?? 0, content, `broken markdown anchor: ${rawTarget}`);
      }
    }
  }
}

function countHeaders(content) {
  const cleanContent = stripCodeBlocks(content);
  const headingPattern = /^#{2,3}\s+.+$/gm;
  const matches = [...cleanContent.matchAll(headingPattern)];
  return matches.length;
}

function validateBilingualPair(file, content) {
  const relative = path.relative(root, file);

  if (relative.endsWith(".es.md")) {
    const fileDir = path.dirname(file);
    const fileName = path.basename(file, ".es.md");
    const relativeDir = path.relative(root, fileDir);

    let englishFile = file.replace(/\.es\.md$/, ".md");

    if (!fs.existsSync(englishFile)) {
      const siblingDir = fileDir.replace(/-es\/$/, "/").replace(/\/es\/$/, "/");
      if (siblingDir !== fileDir) {
        const altEnglishFile = path.join(siblingDir, fileName + ".md");
        if (fs.existsSync(altEnglishFile)) {
          englishFile = altEnglishFile;
        }
      }
    }

    if (!fs.existsSync(englishFile)) {
      addFailure(file, 0, content, `missing English counterpart: ${path.relative(root, englishFile)}`);
    } else {
      const englishContent = readUtf8(englishFile);
      const esHeaders = countHeaders(content);
      const enHeaders = countHeaders(englishContent);

      if (esHeaders !== enHeaders) {
        addFailure(file, 0, content, `bilingual structural mismatch: ${enHeaders} headers in EN vs ${esHeaders} in ES`);
      }
    }
  }

  const navigationLine = content.match(/^> \*\*Bilingual Navigation:\*\* (.+)$/m);
  if (!navigationLine) {
    return;
  }

  const navText = navigationLine[1];
  const navIndex = navigationLine.index ?? 0;

  if (/pendiente|pending/i.test(navText)) {
    addFailure(file, navIndex, content, "bilingual navigation is marked as pending");
    return;
  }

  const navLink = navText.match(/\[[^\]]+\]\((\.\.?\/[^)]+)\)/);
  if (!navLink) {
    addFailure(file, navIndex, content, "bilingual navigation must use a relative Markdown link");
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

    if (/\]\s*--?>\s*\[/.test(body)) {
      addFailure(file, block.index ?? 0, content, "mermaid edge appears to connect anonymous labels; assign stable node IDs before linking");
    }

    mermaidBlocks.push({
      file,
      index: block.index ?? 0,
      body,
    });
  }
}

function renderMermaidBlock(block, outputDirectory, index) {
  return new Promise((resolve) => {
    const basename = `${String(index + 1).padStart(3, "0")}-${path
      .relative(root, block.file)
      .replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
    const input = path.join(outputDirectory, `${basename}.mmd`);
    const output = path.join(outputDirectory, `${basename}.svg`);

    fs.writeFileSync(input, `${block.body}\n`, "utf8");

    const result = spawnSync(
      "npx",
      ["-y", "@mermaid-js/mermaid-cli", "-i", input, "-o", output, "-b", "transparent", "-p", path.join(root, ".harness/scripts/puppeteer-config.json")],
      { encoding: "utf8" },
    );

    if (result.status !== 0) {
      addFailure(
        block.file,
        block.index,
        readUtf8(block.file),
        `mermaid render failed: ${(result.stderr || result.stdout).trim()}`,
      );
    }

    resolve();
  });
}

async function renderMermaidBlocks() {
  if (!shouldRenderMermaid || failures.length > 0) {
    return;
  }

  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "arc32-mermaid-"));
  const concurrency = Math.max(4, Math.min(os.cpus().length, 16));
  const workers = [];

  for (let index = 0; index < mermaidBlocks.length; index += 1) {
    const block = mermaidBlocks[index];
    workers.push(renderMermaidBlock(block, outputDirectory, index));

    if (workers.length >= concurrency || index === mermaidBlocks.length - 1) {
      await Promise.all(workers);
      workers.length = 0;
    }
  }
}

walk(root);

for (const file of markdownFiles) {
  const content = readUtf8(file);
  validateCharacters(file, content);
  validateLineEndings(file, content);
  validateRelativeLinks(file, content);
  validateBilingualPair(file, content);
  validateMermaid(file, content);
}

await renderMermaidBlocks();

if (failures.length > 0) {
  console.error("Documentation validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const mermaidMessage = shouldRenderMermaid ? ` and rendered ${mermaidBlocks.length} Mermaid diagrams` : "";
console.log(`Documentation validation passed for ${markdownFiles.length} Markdown files${mermaidMessage}.`);
