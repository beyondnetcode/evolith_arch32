#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  partitionByExclusions,
  formatExclusionReport
} from "../../lib/generated-doc-exclusions.mjs";
import { assertScanned } from "../../lib/coverage.mjs";
import { languageOf } from "../../lib/language-heuristic.mjs";
import {
  ENTRY_SURFACE,
  isEntrySurface,
  spanishHalfOf,
  summarizeCoverage,
  formatCoverageReport
} from "../../lib/bilingual-scope.mjs";

const root = process.cwd();
const failures = [];
const orphans = [];
/** Every English .md under reference/ (repo-relative, POSIX) — input to the exclusion partition. */
const referenceEnglishDocs = [];
/**
 * ADR-0126: entry-surface English docs actually found on disk. Its own denominator,
 * because the parity loop below can be alive while this list is empty — a walk rooted
 * in the wrong directory finds markdown and finds none of THESE, and the orphan check
 * would then iterate a list of sixteen paths that exist nowhere and report a clean pass.
 */
const entrySurfaceFound = [];
/** ADR-0126: EN/ES pairs that exist and are no longer enforced. The released denominator. */
const releasedPairs = [];

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
 * GT-620 / GT-628 — the debt this heuristic found on the day it was switched on,
 * and the day it was paid off.
 *
 * Nineteen documents sat in the wrong language slot when the heuristic was first
 * run. FOUR of those were the heuristic's own fault — `ADR_COVERAGE.es.md` and
 * friends are Spanish documents whose bodies are tables of English ADR titles,
 * and counting a row of proper nouns as prose made correct files look
 * mislabelled; that was fixed in the heuristic itself, not excused here. The
 * remaining fifteen were real, and they were carried in a BASELINE SET named
 * file by file — deliberately a named list rather than a count, because a
 * numeric ratchet lets one mislabelled file be swapped for another without the
 * number moving, which is the failure mode this board keeps finding in its own
 * guards.
 *
 * That set is now EMPTY and therefore deleted (GT-628): every entry was removed
 * by an actual translation, the last eight being `using-the-mcp.md`,
 * `src/packages/mcp-server/README.md`, the `.es.md` of ADR-0054 and ADR-0056,
 * `scripts-taxonomy.es.md`, `minimal-apis-vs-controllers-analysis.es.md` and the
 * two SDLC artifact templates. With no baseline left, EVERY EN/ES pair in the
 * repository must now read in its own slot's language — including
 * `reference/core/interfaces/using-the-cli.md`, the file GT-620 was registered
 * for, which was already outside the baseline for exactly this reason. Do not
 * reintroduce a baseline to make a red gate green: translate the file.
 */

function countHeaders(content) {
  const headingPattern = /^#{2,3}\s+.+$/gm;
  const matches = [...stripCodeBlocks(content).matchAll(headingPattern)];
  return matches.length;
}

/**
 * ADR-0126 — block-level HTML tags that open and never close, or close having never
 * opened.
 *
 * ## Why this is here and not in a markdown linter
 *
 * The defect it was written for: `README.es.md` lost the `<div align="center">` on its
 * first line and kept the `</div>` on line 24. GitHub renders the Spanish landing page
 * left-aligned while the English one is centred — the first thing a Spanish-speaking
 * visitor sees, wrong, for as long as it took to notice.
 *
 * Two guards purpose-built for EN/ES parity were green throughout, and CORRECTLY so:
 * the file existed, its heading count matched, and it read as Spanish. Every question
 * they ask is about the document's TEXT. Nothing asked whether the markup still
 * bracketed. That is the hole, and it is narrow enough to close exactly:
 *
 *   - Only the entry surface is checked. A malformed `<div>` matters where it is
 *     rendered to a stranger; in a deep reference document nobody has opened, it is
 *     noise, and a noisy guard is a guard that gets switched off.
 *   - Only block tags that must nest. Void elements (`<br/>`, `<img>`) and inline
 *     `<kbd>`/`<sub>`/`<b>` are excluded — `README.md` uses them unclosed and legally.
 *   - Fenced code is stripped first, or every shell heredoc becomes a finding.
 */
const BALANCED_TAGS = ["div", "details", "table", "picture", "figure"];

function unbalancedTags(content) {
  const stripped = stripCodeBlocks(content);
  const findings = [];
  for (const tag of BALANCED_TAGS) {
    const opens = (stripped.match(new RegExp(`<${tag}(?=[\\s>])[^>]*?(?<!/)>`, "gi")) ?? []).length;
    const closes = (stripped.match(new RegExp(`</${tag}\\s*>`, "gi")) ?? []).length;
    if (opens !== closes) {
      findings.push(
        `<${tag}> opened ${opens} time(s) and closed ${closes} time(s)` +
        (opens < closes ? " — a closing tag with nothing to close" : " — a block left open")
      );
    }
  }
  return findings;
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
  
  // 1. Structural Parity Check — ADR-0126: entry surface only. A pair outside it keeps
  //    its .es.md untouched and simply stops being judged; the count of what that drops
  //    is printed below rather than left to be inferred from a green tick.
  if (isEntrySurface(relative) && !PARITY_EXEMPT_BASENAMES.has(path.basename(file))) {
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
        // GT-628: no baseline any more — every pair is judged.
        const enLang = languageOf(content);
        if (enLang.verdict === 'es') {
          failures.push(
            `${relative}: the ENGLISH slot reads as Spanish ` +
            `(${enLang.es} Spanish function words vs ${enLang.en} English). ` +
            `Heading counts match, which is why this passed before GT-620.`,
          );
        }
        const esLang = languageOf(spanishContent);
        if (esLang.verdict === 'en') {
          failures.push(
            `${relative.replace(/\.md$/, '.es.md')}: the SPANISH slot reads as English ` +
            `(${esLang.en} English function words vs ${esLang.es} Spanish).`,
          );
        }
      }
    }
  }

  // 2. Markup balance — entry surface only, both halves. See unbalancedTags above.
  if (isEntrySurface(relative)) {
    for (const finding of unbalancedTags(content)) {
      failures.push(`${relative}: ${finding}`);
    }
  }

  // 3. Coverage denominators. Neither is a check. `referenceEnglishDocs` is the corpus the
  //    pre-ADR-0126 prefix rule would have judged, kept so the exclusion table below is still
  //    partitioned over its real shape. `releasedPairs` is what the narrowing actually drops:
  //    every EN/ES pair that EXISTS and is no longer looked at — repo-wide, not reference/-only,
  //    because the pairs under src/ and product/ were being enforced by the parity branch too.
  if (relative.startsWith("reference") && relative.endsWith(".md") && !relative.endsWith(".es.md")) {
    referenceEnglishDocs.push(relative.split(path.sep).join("/"));
  }

  if (relative.endsWith(".md") && !relative.endsWith(".es.md")) {
    const posix = relative.split(path.sep).join("/");
    if (isEntrySurface(posix)) {
      entrySurfaceFound.push(posix);
    } else if (fs.existsSync(file.replace(/\.md$/, ".es.md"))) {
      releasedPairs.push(posix);
    }
  }
}

// Two denominators, both asserted. `referenceEnglishDocs` no longer gates anything — it is
// the size of the corpus ADR-0126 stopped enforcing, and it is asserted anyway because a
// coverage line reporting "0 pairs outside the surface" would understate the waiver rather
// than overstate the check, which is the quieter half of the same dishonesty.
assertScanned(referenceEnglishDocs.length, {
  what: "English docs under reference/ (the corpus ADR-0126 released from enforcement)",
  where: path.join(root, "reference"),
});

// The orphan check is now a list, not a walk: every entry-surface document must carry its
// .es.md. Generated-doc exclusions do not apply — no entry-surface file is generator output,
// which is a property of the list and is why it is a list. `partitionByExclusions` still runs
// over the released corpus so the operator can see the exclusion table has not silently
// become the thing doing the work.
assertScanned(entrySurfaceFound.length, {
  what: `entry-surface English documents (ADR-0126; ${ENTRY_SURFACE.length} declared)`,
  where: [root, `declared in .harness/scripts/lib/bilingual-scope.mjs`],
});

for (const relative of ENTRY_SURFACE) {
  if (!fs.existsSync(path.join(root, relative))) {
    failures.push(
      `${relative}: declared in the ADR-0126 entry surface and does not exist. ` +
      `Either the document moved and the list was not updated, or the list is aspirational — ` +
      `both are defects in the list, not in the tree.`
    );
    continue;
  }
  if (!fs.existsSync(path.join(root, spanishHalfOf(relative)))) {
    orphans.push(`${relative} → missing ${spanishHalfOf(relative)}`);
  }
}

const partition = partitionByExclusions(
  referenceEnglishDocs,
  (rel) => fs.readFileSync(path.join(root, rel), "utf8")
);

// Always printed, pass or fail. An exclusion the operator cannot see is a false green — and
// so is a narrowed scope the operator cannot see. The coverage line is the second half of
// that rule and was added with the narrowing, not after it.
console.log(formatExclusionReport(partition));
console.log(formatCoverageReport(summarizeCoverage({ enforcedFound: entrySurfaceFound.length, releasedPairs: releasedPairs.length })));

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
  console.error(
    "\nEvery document in the ADR-0126 entry surface must have a Spanish counterpart (.es.md)." +
    "\nThe surface is declared in .harness/scripts/lib/bilingual-scope.mjs — sixteen files a" +
    "\nstranger reaches within two clicks. If the document does not belong there, remove it" +
    "\nfrom the list and say why in the ADR; do not add a translation to silence this."
  );
}

if (hasError) {
  process.exit(1);
}

console.log(
  `\x1b[32m✓\x1b[0m Bilingual Suite (Parity, Orphans & Markup) passed ` +
  `(${markdownFiles.length} markdown file(s) scanned; ` +
  `${entrySurfaceFound.length}/${ENTRY_SURFACE.length} entry-surface document(s) enforced). ` +
  `This tick covers the entry surface ONLY — it makes no claim about the ` +
  `${releasedPairs.length} pair(s) ADR-0126 released.`,
);
process.exit(0);
