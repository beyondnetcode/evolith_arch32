#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { assertScanned } from '../lib/coverage.mjs';

const root = process.cwd();
const shouldRenderMermaid = process.argv.includes("--render-mermaid");
const ignoredDirectories = new Set([
  ".git",
  ".claude", // tool-internal worktree copies (.claude/worktrees/*) are not project docs
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".nx",
]);

// Paths (relative to root) whose markdown files are excluded from link validation.
//
// GT-563: this used to be a hand-maintained list naming `packages/core-domain/rulesets`
// -- a bundled copy of rulesets/ for npm packaging, whose READMEs carry monorepo-relative
// links that are intentionally broken once copied to a deeper directory. That path has
// not existed since the `src/` refactor (the bundling moved to src/sdk/cli/rulesets via
// copy-rulesets.js), so the exemption silently stopped applying and the validator began
// reporting ~97 "broken links" against generated build output.
//
// The exemption is now derived from git rather than hardcoded, so it tracks build output
// by construction and cannot go stale on the next move. This narrows the validator to
// AUTHORED sources -- the same source-not-projection principle as ADR-0117. It cannot mask
// a real defect: anything git tracks is still validated.
function listGitIgnoredFiles() {
  const result = spawnSync(
    "git",
    ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"],
    { cwd: root, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0 || !result.stdout) return new Set();
  return new Set(
    result.stdout
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((relative) => path.join(root, relative)),
  );
}

const gitIgnoredFiles = listGitIgnoredFiles();
const ignoredPaths = new Set();

const markdownFiles = [];
const mermaidBlocks = [];
const failures = [];
const fileCache = new Map();

function walk(directory) {
  if (ignoredPaths.has(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(directory, entry.name));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      const filePath = path.join(directory, entry.name);
      // Generated/bundled output is not an authored source (see note above).
      if (gitIgnoredFiles.has(filePath)) continue;
      markdownFiles.push(filePath);
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
  // Blank out fenced code blocks AND inline code spans (preserving line/column
  // positions) so prose-corruption checks (??, mojibake, emoji) do not flag
  // legitimate code — e.g. JS nullish-coalescing `a ?? b` inside backticks.
  // GT-563: the fence pattern used to be /```[\s\S]*?```/g, unanchored, so a triple
  // backtick written INLINE as prose (e.g. the cell "el bloque ` ```mermaid ` con la
  // directiva classDiagram" in reference/core/interfaces/using-the-cli.md:457) counted
  // as a real delimiter. That shifts fence pairing by one for the rest of the file, and
  // from there the matcher blanks the PROSE BETWEEN blocks instead of the blocks --
  // silently exempting it from the emoji/mojibake/?? checks. Real emoji violations were
  // hidden this way (that same file carries coloured severity circles at line 764).
  //
  // Fences are now anchored to line starts (with the m flag), which is where Markdown
  // requires them, so inline backticks can no longer desynchronize the pairing.
  return content
    .replace(/^ {0,3}```[^\n]*\n[\s\S]*?^ {0,3}```[^\n]*$/gm, (match) => match.replace(/[^\r\n]/g, " "))
    .replace(/`[^`\r\n]+`/g, (match) => match.replace(/[^\r\n]/g, " "));
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

  // Curated status/typography glyphs accepted as house style across the
  // governance + ADR corpus (status markers in tables and wave notes):
  // \u2705 \u2713 \u2714 \u274C \u2717 \u2718 \u26A0. They are stripped before the emoji checks so they are not
  // flagged as corruption; genuine pictographic emoji (\uD83E\uDD16, \uD83D\uDE80, \u2026) still are.
  const ALLOWED_STATUS_GLYPHS = /[\u2705\u2713\u2714\u274C\u2717\u2718\u26A0]/gu;
  const emojiScan = cleanContent.replace(ALLOWED_STATUS_GLYPHS, " ");

  const disallowedPatterns = [
    { pattern: /\uFEFF/g, message: "contains UTF-8 BOM marker" },
    { pattern: /\uFFFD/g, message: "contains replacement character U+FFFD" },
    { pattern: /\?\?/g, message: "contains corrupted or placeholder marker ??" },
    { pattern: /[\u{1F000}-\u{1FAFF}]/gu, message: "contains emoji or pictographic symbol", source: emojiScan },
    { pattern: /[\u2600-\u27BF]/gu, message: "contains emoji-like symbol", source: emojiScan },
    { pattern: /¡/g, message: "contains inverted exclamation marker; avoid decorative punctuation in standard Markdown" },
    // GT-563: this family detects a word-INITIAL accented vowel corrupted into "í"
    // (única -> ínica, época -> ípoca, épica -> ípica, útil -> ítil, árbol -> írbol).
    // Without a boundary it also matches these fragments INSIDE correctly-spelled words:
    // "típicas"/"típicamente" contain "ípica(s)", and "clínica"/"clínico" contain "ínica"/"ínico".
    // The lookbehind requires the "í" to start the word, so correct Spanish is no longer flagged.
    { pattern: /(?<![A-Za-zÀ-ÖØ-öø-ÿ])(?:ínico|ínica|íNICAMENTE|NINGíN|ípica|ípicas|íltima|íltimo|ípoca|írbol|ínfasis|ítil)/g, message: "contains corrupted Spanish mojibake word" },
    { pattern: /TíCNICA/g, message: "contains corrupted uppercase accented text" },
    { pattern: /¡\s*(Proposed|Propuesto)/g, message: "contains corrupted status marker" },
    { pattern: /(?:â|ð|Ã|Â)/g, message: "contains likely mojibake character" },
  ];

  for (const rule of disallowedPatterns) {
    for (const match of (rule.source ?? cleanContent).matchAll(rule.pattern)) {
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

  // Strip fenced/inline code first (positions preserved) so links that appear
  // inside code examples — e.g. a `## Registration` snippet showing a row to add
  // — are not validated as real links. Mirrors the anchor/character checks.
  const scannable = stripCodeBlocks(content);
  for (const match of scannable.matchAll(linkPattern)) {
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

// Auto-generated artifacts (e.g. CHANGELOG from Conventional Commits via
// release-please) are exempt from structural translation parity: their EN
// content is machine-generated and cannot keep a hand-translated header
// structure in sync. The ES counterpart is a localized navigation pointer.
const BILINGUAL_PARITY_EXEMPT = new Set([
  "CHANGELOG.md",
  "CHANGELOG.es.md",
  // Point-in-time, Spanish-only audit working document (not standing bilingual docs).
  "tracker-core-evaluation-compat-audit.es.md",
]);

function validateBilingualPair(file, content) {
  const relative = path.relative(root, file);

  if (BILINGUAL_PARITY_EXEMPT.has(path.basename(file))) {
    return;
  }

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
  const validStarts = /^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram|stateDiagram-v2|journey|gantt|pie|mindmap|timeline|quadrantChart|C4Context|C4Container|C4Component|C4Dynamic)\b/;
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

function validateTopologyManifests() {
  const result = spawnSync(
    process.execPath,
    [path.join(root, ".harness/scripts/validate-topology-manifests.mjs")],
    { cwd: root, encoding: "utf8" },
  );

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    failures.push(`topology-manifest validation failed: ${detail}`);
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

    const child = spawn(
      "npx",
      ["-y", "@mermaid-js/mermaid-cli", "-i", input, "-o", output, "-b", "transparent", "-p", path.join(root, ".harness/scripts/puppeteer-config.json")],
      { encoding: "utf8" },
    );

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let resolved = false;

    const finish = (status, detail = "") => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);

      if (timedOut || status !== 0) {
        const output = detail || stderr || stdout || `process exited with status ${status}`;
        addFailure(
          block.file,
          block.index,
          readUtf8(block.file),
          `mermaid render failed: ${output.trim()}`,
        );
      }

      resolve();
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!resolved) child.kill("SIGKILL");
      }, 5000).unref();
    }, 120000);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish(1, error.message);
    });
    child.on("close", (status, signal) => {
      const timeoutMessage = `render timed out after 120000 ms${signal ? ` (${signal})` : ""}`;
      finish(status ?? 1, timedOut ? timeoutMessage : "");
    });
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

// GT-578: `walk(root)` starts at `process.cwd()`. From the wrong directory it
// collects nothing, the loop below never runs, and the script prints
// "Documentation validation passed for 0 Markdown files." — the sentence reads
// like a pass and is a report that nothing was inspected.
assertScanned(markdownFiles.length, { what: 'Markdown files', where: root });

for (const file of markdownFiles) {
  const content = readUtf8(file);
  validateCharacters(file, content);
  validateLineEndings(file, content);
  validateRelativeLinks(file, content);
  validateBilingualPair(file, content);
  validateMermaid(file, content);
}

validateTopologyManifests();

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
