#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  partitionByExclusions,
  formatExclusionReport
} from "../../lib/generated-doc-exclusions.mjs";
import { assertScanned } from "../../lib/coverage.mjs";
import { languageOf } from "../../lib/language-heuristic.mjs";

const root = process.cwd();
const failures = [];
const orphans = [];
/** Every English .md under reference/ (repo-relative, POSIX) — input to the exclusion partition. */
const referenceEnglishDocs = [];
/** English docs under reference/ with no .es.md sibling, before exclusions are applied. */
const orphanCandidates = [];

const PARITY_EXEMPT_BASENAMES = new Set([
  "CHANGELOG.md",
  "CHANGELOG.es.md",
  "tracker-core-evaluation-compat-audit.md",
  "tracker-core-evaluation-compat-audit.es.md",
  "RELOCATED.md",
  "EVOLITH-ARCHITECTURE-DESIGN.md"
]);

// GT-563 follow-on: this counter used to run over the RAW file, so a `## ...` line
// inside a fenced code block counted as a real header. That is not a header, and it let
// structural mismatches pass here while 01-validate-docs.mjs (which does strip fences)
// failed on the same files -- parity is meant to be the authority, so it has to see the
// same headers. Fence stripping is kept byte-for-byte in sync with the matcher in
// .harness/scripts/ci/01-validate-docs.mjs.
function stripCodeBlocks(content) {
  return content
    .replace(/^ {0,3}```[^\n]*\n[\s\S]*?^ {0,3}```[^\n]*$/gm, (match) => match.replace(/[^\r\n]/g, " "))
    .replace(/`[^`\r\n]+`/g, (match) => match.replace(/[^\r\n]/g, " "));
}

/**
 * GT-620 — the debt this heuristic found on the day it was switched on.
 *
 * Nine documents sit in the wrong language slot. It was nineteen when the
 * heuristic was switched on: six documents have been translated, and FOUR
 * were the heuristic's own fault — `ADR_COVERAGE.es.md` and friends are Spanish
 * documents whose bodies are tables of English ADR titles, and counting a row of
 * proper nouns as prose made correct files look mislabelled. They are BASELINED,
 * not forgiven — the gate fails for any file outside this list, so the class cannot
 * grow while the backlog is worked off, and every removal from this list is a
 * translation that actually happened.
 *
 * A named list rather than a count, deliberately: a numeric ratchet lets one
 * mislabelled file be swapped for another without the number moving, which is
 * the failure mode this board keeps finding in its own guards. Tracked as
 * GT-628. Delete an entry when its file is translated; when the list is empty,
 * delete the list.
 *
 * `reference/core/interfaces/using-the-cli.md` is deliberately ABSENT: it is the
 * file GT-620 was registered for, it has been rewritten in English, and it must
 * fail this gate if it ever regresses.
 */
const LANGUAGE_BASELINE = new Set([
  'product/research/research/minimal-apis-vs-controllers-analysis.es.md',
  'reference/core/architecture/adrs/core/0054-database-design-normalization-standards.es.md',
  'reference/core/architecture/adrs/core/0056-enterprise-naming-design-conventions.es.md',
  'reference/core/interfaces/using-the-mcp.md',
  'reference/core/interfaces/using-the-rest-api.md',
  'reference/core/sdlc/04-artifact-templates/ballpark-estimation-template.md',
  'reference/core/sdlc/04-artifact-templates/discovery-canvas-template.md',
  'reference/harness/scripts-taxonomy.es.md',
  'src/packages/mcp-server/README.md',
]);


function countHeaders(content) {
  const headingPattern = /^#{2,3}\s+.+$/gm;
  const matches = [...stripCodeBlocks(content).matchAll(headingPattern)];
  return matches.length;
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (
        entry.name === ".git" ||
        entry.name === "node_modules" ||
        entry.name === ".husky" ||
        entry.name === ".claude" ||
        entry.name === "dist"
      ) {
        continue;
      }
      walk(path.join(directory, entry.name), files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

const markdownFiles = walk(root);

// GT-578: `walk` starts at `process.cwd()`. Run this from anywhere but the repo
// root and it returns few or no .md files, both loops below iterate nothing, and
// the suite prints "✓ Bilingual Suite (Parity & Orphans) passed" — a green tick
// for a corpus it never opened. Two denominators, because a live parity scan
// used to mask a dead orphan scan: `referenceEnglishDocs` is asserted after the
// loop for exactly that reason.
assertScanned(markdownFiles.length, { what: "markdown files", where: root });

for (const file of markdownFiles) {
  const relative = path.relative(root, file);
  const content = fs.readFileSync(file, "utf8");
  
  // 1. Structural Parity Check
  if (!PARITY_EXEMPT_BASENAMES.has(path.basename(file))) {
    if (relative.endsWith(".es.md")) {
      const englishFile = file.replace(/\.es\.md$/, ".md");
      if (!fs.existsSync(englishFile)) {
        failures.push(`${relative}: missing English counterpart`);
      } else {
        const englishContent = fs.readFileSync(englishFile, "utf8");
        const esHeaders = countHeaders(content);
        const enHeaders = countHeaders(englishContent);
        if (esHeaders !== enHeaders) {
          failures.push(`${relative}: structural mismatch (EN: ${enHeaders} headers, ES: ${esHeaders} headers)`);
        }
      }
    } else if (relative.endsWith(".md") && !relative.endsWith(".es.md")) {
      const spanishFile = file.replace(/\.md$/, ".es.md");
      if (fs.existsSync(spanishFile)) {
        const spanishContent = fs.readFileSync(spanishFile, "utf8");
        const enHeaders = countHeaders(content);
        const esHeaders = countHeaders(spanishContent);
        if (enHeaders !== esHeaders) {
          failures.push(`${relative}: structural mismatch (EN: ${enHeaders} headers, ES: ${esHeaders} headers)`);
        }

        // GT-620: structural parity is necessary and not sufficient. Two files
        // can carry identical headings and be the same language.
        // `content` IS the English file in this branch — the walker is on the
        // `.md` and read its Spanish counterpart above.
        const relativePosix = relative.split(path.sep).join('/');
        const enLang = languageOf(content);
        if (enLang.verdict === 'es' && !LANGUAGE_BASELINE.has(relativePosix)) {
          failures.push(
            `${relative}: the ENGLISH slot reads as Spanish ` +
            `(${enLang.es} Spanish function words vs ${enLang.en} English). ` +
            `Heading counts match, which is why this passed before GT-620.`,
          );
        }
        const esLang = languageOf(spanishContent);
        if (esLang.verdict === 'en' && !LANGUAGE_BASELINE.has(relativePosix.replace(/\.md$/, '.es.md'))) {
          failures.push(
            `${relative.replace(/\.md$/, '.es.md')}: the SPANISH slot reads as English ` +
            `(${esLang.en} English function words vs ${esLang.es} Spanish).`,
          );
        }
      }
    }
  }

  // 2. Orphan Check (Only for files under 'reference/')
  if (relative.startsWith("reference") && relative.endsWith(".md") && !relative.endsWith(".es.md")) {
    referenceEnglishDocs.push(relative.split(path.sep).join("/"));
    const spanishFile = file.replace(/\.md$/, ".es.md");
    if (!fs.existsSync(spanishFile)) {
      orphanCandidates.push(relative.split(path.sep).join("/"));
    }
  }
}

// Declared exclusions: generator-written English-only output. The exclusion table lives in
// .harness/scripts/lib/generated-doc-exclusions.mjs — each entry names its generator and its
// reason, and membership is proven by a content marker or a pinned inventory. Partition over
// EVERY English doc under reference/ (not just the orphans) so a count-pinned tree is measured
// against its real shape rather than against whichever subset happens to be untranslated.
assertScanned(referenceEnglishDocs.length, {
  what: "English docs under reference/ (the orphan-check corpus)",
  where: path.join(root, "reference"),
});

const partition = partitionByExclusions(
  referenceEnglishDocs,
  (rel) => fs.readFileSync(path.join(root, rel), "utf8")
);
const excludedPaths = new Set(partition.excluded.flatMap((x) => x.files));

for (const relative of orphanCandidates) {
  if (excludedPaths.has(relative)) continue;
  orphans.push(`${relative} → missing ${relative.replace(/\.md$/, ".es.md")}`);
}

// Always printed, pass or fail. An exclusion the operator cannot see is a false green.
console.log(formatExclusionReport(partition));

let hasError = false;

if (failures.length > 0) {
  hasError = true;
  console.error("\n\x1b[31mBilingual Parity Validation Failed\x1b[0m\n");
  for (const failure of failures) {
    console.error(`  \x1b[31m✗\x1b[0m ${failure}`);
  }
}

if (orphans.length > 0) {
  hasError = true;
  console.error("\n\x1b[31mOrphan Bilingual Files Detected (EN without ES)\x1b[0m\n");
  for (const orphan of orphans) {
    console.error(`  \x1b[31m✗\x1b[0m ${orphan}`);
  }
  console.error("\nEvery English document under reference/ must have a Spanish counterpart (.es.md).");
}

if (hasError) {
  process.exit(1);
}

console.log(
  `\x1b[32m✓\x1b[0m Bilingual Suite (Parity & Orphans) passed ` +
  `(${markdownFiles.length} markdown file(s) scanned; ` +
  `${referenceEnglishDocs.length} English doc(s) under reference/ checked for an ES counterpart)`,
);
process.exit(0);
