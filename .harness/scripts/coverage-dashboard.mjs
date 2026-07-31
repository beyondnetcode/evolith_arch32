#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { partitionByExclusions } from "./lib/generated-doc-exclusions.mjs";

const root = process.cwd();
const referenceDir = path.join(root, "reference");
const reportPath = path.join(root, "reference", "core", "control-center", "audits", "COVERAGE_REPORT.md");
const checkMode = process.argv.includes("--check");

const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", ".nx"]);

const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
}

walk(referenceDir);

function isEsFile(file) {
  if (file.endsWith(".es.md")) return true;
  const rel = path.relative(referenceDir, file);
  return rel.split(path.sep).some(p => p.endsWith("-es"));
}

// Declared exclusions: generator-written English-only output (the projected OKF
// bundle, the wiki mirror, the captured interface how-tos, and this dashboard's
// own report). The table is the SAME one `ci/suites/bilingual-suite.mjs` enforces
// — importing it rather than restating it is the point.
//
// Without this, the dashboard counted 26 deliberately-exempt files as missing
// translations and reported 95.2% coverage while `04-check-bilingual-parity`
// passed clean. Two tools contradicting each other, and the wrong number was the
// one written into a committed audit artefact.
// Feed BOTH EN and ES files through the shared exclusion table: bilingual-suite
// exempts some docs on both sides (e.g. an ES-only historical audit whose EN
// counterpart was removed in the apps/->src/ cutover). Partitioning only EN files
// left those ES exemptions unapplied, so the dashboard flagged a deliberately
// allowlisted ES orphan that `04-check-bilingual-parity` passes clean — the exact
// two-tools-disagree failure this exclusion table exists to prevent.
const allRelative = files.map((f) => path.relative(root, f));
const exclusionPartition = partitionByExclusions(allRelative, (rel) =>
  fs.readFileSync(path.join(root, rel), "utf8")
);
const excludedRelative = new Set(exclusionPartition.excluded.flatMap((x) => x.files));
const isExcluded = (f) => excludedRelative.has(path.relative(root, f));

const enFiles = files.filter(f => !isEsFile(f) && !isExcluded(f));
const esFiles = files.filter(f => isEsFile(f) && !isExcluded(f));

function normalizeKey(file) {
  const rel = path.relative(referenceDir, file);
  return rel
    .replace(/\.es\.md$/, ".md")
    .split(path.sep)
    .map(p => p.replace(/-es$/, ""))
    .join("/");
}

function getArea(file) {
  const rel = normalizeKey(file);
  const parts = rel.split("/");
  return parts[0] || "root";
}

function getSubArea(file) {
  const rel = normalizeKey(file);
  const parts = rel.split("/");
  return parts.slice(0, 2).join("/");
}

const areas = {};

for (const f of enFiles) {
  const area = getArea(f);
  const sub = getSubArea(f);
  if (!areas[area]) areas[area] = { en: 0, es: 0, subareas: {} };
  areas[area].en++;
  if (!areas[area].subareas[sub]) areas[area].subareas[sub] = { en: 0, es: 0 };
  areas[area].subareas[sub].en++;
}

for (const f of esFiles) {
  const area = getArea(f);
  const sub = getSubArea(f);
  if (!areas[area]) areas[area] = { en: 0, es: 0, subareas: {} };
  areas[area].es++;
  if (!areas[area].subareas[sub]) areas[area].subareas[sub] = { en: 0, es: 0 };
  areas[area].subareas[sub].es++;
}

function coverageColor(pct) {
  if (pct >= 80) return "[OK]";
  if (pct >= 50) return "[WARN]";
  if (pct >= 25) return "[LOW]";
  return "[CRIT]";
}

function bar(pct, width = 20) {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function esToEnPath(file) {
  const rel = path.relative(referenceDir, file);
  const normalized = rel
    .replace(/\.es\.md$/, ".md")
    .split(path.sep)
    .map(p => p.replace(/-es$/, ""))
    .join("/");
  return path.join(referenceDir, normalized);
}

const totalEn = enFiles.length;
const totalEs = esFiles.length;
let totalPaired = 0;
for (const f of esFiles) {
  const enFile = esToEnPath(f);
  if (fs.existsSync(enFile)) totalPaired++;
}

const totalPct = totalEn > 0 ? ((totalPaired / totalEn) * 100).toFixed(1) : "0.0";
const areaKeys = Object.keys(areas).sort();

// Build the full report deterministically. The only non-deterministic part is
// the "Generated" timestamp, which is injected so --check can ignore it.
function buildReport(generatedAt) {
  return `
# [OK] Bilingual Coverage Dashboard

**Generated:** ${generatedAt}
**Repository:** evolith_arch32
**Total EN files:** ${totalEn} | **ES files:** ${totalEs} | **Paired:** ${totalPaired} | **Coverage:** ${totalPct}%

---

## Overall Status

| Metric | Value |
|--------|-------|
| Total EN files | ${totalEn} |
| Total ES files | ${totalEs} |
| Paired files | ${totalPaired} |
| **Coverage** | **${totalPct}%** |

### Coverage Bar

\`\`\`
${bar(parseFloat(totalPct))} ${totalPct}%
\`\`\`

---

## Coverage by Area

| Area | EN | ES | Paired | Coverage | Status |
|------|----|----|--------|----------|--------|
${areaKeys.map(area => {
  const data = areas[area];
  let pairedInArea = 0;
  for (const sub in data.subareas) {
    const min = Math.min(data.subareas[sub].en, data.subareas[sub].es);
    pairedInArea += min;
  }
  const pct = data.en > 0 ? ((pairedInArea / data.en) * 100).toFixed(0) : 0;
  return `| ${area} | ${data.en} | ${data.es} | ${pairedInArea} | ${pct}% | ${coverageColor(parseFloat(pct))} |`;
}).join("\n")}

---

## Detailed Breakdown by Sub-Area

${areaKeys.map(area => {
  const data = areas[area];
  const subs = Object.keys(data.subareas).sort();
  return `### ${area}

| Sub-Area | EN | ES | Paired | Coverage | Status |
|----------|----|----|--------|----------|--------|
${subs.map(sub => {
  const subData = data.subareas[sub];
  const paired = Math.min(subData.en, subData.es);
  const pct = subData.en > 0 ? ((paired / subData.en) * 100).toFixed(0) : 0;
  const subDisplay = sub.replace(`${area}/`, "");
  return `| ${subDisplay} | ${subData.en} | ${subData.es} | ${paired} | ${pct}% | ${coverageColor(parseFloat(pct))} |`;
}).join("\n")}`;
}).join("\n\n")}

---

## Legend

| Symbol | Coverage Range |
|--------|----------------|
| [OK] | 80-100% |
| [WARN] | 50-79% |
| [LOW] | 25-49% |
| [CRIT] | 0-24% |

## How to Improve Coverage

1. Run the skeleton generator for pending files:
   \`\`\`bash
   node .harness/scripts/generate-es-skeleton.mjs <file.md>
   \`\`\`

2. Check the bilingual coverage report:
   \`\`\`bash
   node .harness/scripts/bilingual-coverage.mjs
   \`\`\`

3. Prioritize critical areas: architecture/adrs, governance/standards

---

*Report generated by .harness/scripts/coverage-dashboard.mjs*
`;
}

// Strip the volatile timestamp line so drift comparison is content-only.
function stripTimestamp(text) {
  return text.replace(/\*\*Generated:\*\* .*\n/, "**Generated:** <ts>\n");
}

// Basename-level parity exemptions — MUST mirror `PARITY_EXEMPT_BASENAMES` in
// ci/suites/bilingual-suite.mjs (the authoritative gate). These are docs whose
// counterpart was deliberately removed (e.g. an ES-only historical audit orphaned
// by the apps/->src/ cutover) or that are single-language by policy. Without this,
// the dashboard flags an orphan that `04-check-bilingual-parity` passes clean —
// the two-tools-disagree failure mode this file already guards against elsewhere.
const PARITY_EXEMPT_BASENAMES = new Set([
  "CHANGELOG.md",
  "CHANGELOG.es.md",
  "tracker-core-evaluation-compat-audit.md",
  "tracker-core-evaluation-compat-audit.es.md",
  "RELOCATED.md",
  "EVOLITH-ARCHITECTURE-DESIGN.md",
]);
const isParityExempt = (f) => PARITY_EXEMPT_BASENAMES.has(path.basename(f));

// Determine unpaired sets (used for the hard parity gate / exit code).
const unpairedEn = enFiles.filter(f => {
  if (isParityExempt(f)) return false;
  const rel = path.relative(referenceDir, f);
  if (fs.existsSync(path.join(referenceDir, rel.replace(/\.md$/, ".es.md")))) return false;
  const parts = rel.split(path.sep);
  for (let i = 0; i < parts.length - 1; i++) {
    const esParts = [...parts];
    esParts[i] += "-es";
    if (fs.existsSync(path.join(referenceDir, ...esParts))) return false;
  }
  return true;
});
const unpairedEs = esFiles.filter(f => {
  if (isParityExempt(f)) return false;
  const enFile = esToEnPath(f);
  return !fs.existsSync(enFile);
});
const hasUnpaired = unpairedEn.length > 0 || unpairedEs.length > 0;


// A non-zero exit that says nothing is the failure mode this repo has spent the
// week removing. Name the unpaired files before leaving.
function reportUnpaired() {
  if (unpairedEn.length) {
    console.error(`\n\u274c ${unpairedEn.length} English doc(s) with no Spanish counterpart:`);
    for (const f of unpairedEn) console.error(`   ${path.relative(root, f)}`);
  }
  if (unpairedEs.length) {
    console.error(`\n\u274c ${unpairedEs.length} Spanish doc(s) with no English counterpart:`);
    for (const f of unpairedEs) console.error(`   ${path.relative(root, f)}`);
  }
}

if (checkMode) {
  // CI drift gate: verify the committed COVERAGE_REPORT.md matches what the
  // current corpus would generate (ignoring the timestamp). No file is written.
  if (!fs.existsSync(reportPath)) {
    console.error("❌ COVERAGE_REPORT.md is missing. Run: node .harness/scripts/coverage-dashboard.mjs");
    process.exit(1);
  }
  const committed = fs.readFileSync(reportPath, "utf8");
  const expected = buildReport("<ts>");
  if (stripTimestamp(committed) !== stripTimestamp(expected)) {
    console.error("❌ COVERAGE_REPORT.md is stale (drift detected).");
    console.error("   Regenerate and commit: node .harness/scripts/coverage-dashboard.mjs");
    process.exit(1);
  }
  console.log("✅ COVERAGE_REPORT.md is up to date.");
  if (hasUnpaired) { reportUnpaired(); process.exit(1); }
  process.exit(0);
}

const report = buildReport(new Date().toISOString());
console.log(report);
// The audits directory is committed, so this only ever mattered off the real tree —
// which is exactly where the self-test runs. Without it the script printed a correct
// 100% report and then died on an unhandled ENOENT, so every positive case in
// coverage-dashboard.test.mjs failed on the exit code while the negative cases, which
// exit before this line, passed.
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report, "utf8");

if (hasUnpaired) {
  reportUnpaired();
  process.exit(1);
}

console.log("\n✅ Report saved to COVERAGE_REPORT.md");
