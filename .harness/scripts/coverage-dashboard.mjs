#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const referenceDir = path.join(root, "reference");

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

const enFiles = files.filter(f => !isEsFile(f));
const esFiles = files.filter(f => isEsFile(f));

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

const totalPct = ((totalPaired / totalEn) * 100).toFixed(1);

console.log(`
# [OK] Bilingual Coverage Dashboard

**Generated:** ${new Date().toISOString()}  
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
`);

const areaKeys = Object.keys(areas).sort();
for (const area of areaKeys) {
  const data = areas[area];
  let pairedInArea = 0;
  for (const sub in data.subareas) {
    const min = Math.min(data.subareas[sub].en, data.subareas[sub].es);
    pairedInArea += min;
  }
  const pct = data.en > 0 ? ((pairedInArea / data.en) * 100).toFixed(0) : 0;
  console.log(`| ${area} | ${data.en} | ${data.es} | ${pairedInArea} | ${pct}% | ${coverageColor(parseFloat(pct))} |`);
}

console.log(`

---

## Detailed Breakdown by Sub-Area

`);

for (const area of areaKeys) {
  const data = areas[area];
  const subs = Object.keys(data.subareas).sort();

  console.log(`### ${area}\n`);
  console.log(`| Sub-Area | EN | ES | Paired | Coverage | Status |`);
  console.log(`|----------|----|----|--------|----------|--------|`);

  for (const sub of subs) {
    const subData = data.subareas[sub];
    const paired = Math.min(subData.en, subData.es);
    const pct = subData.en > 0 ? ((paired / subData.en) * 100).toFixed(0) : 0;
    const subDisplay = sub.replace(`${area}/`, "");
    console.log(`| ${subDisplay} | ${subData.en} | ${subData.es} | ${paired} | ${pct}% | ${coverageColor(parseFloat(pct))} |`);
  }
  console.log();
}

console.log(`---

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
`);

fs.writeFileSync(path.join(root, "COVERAGE_REPORT.md"), `
# [OK] Bilingual Coverage Dashboard

**Generated:** ${new Date().toISOString()}  
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
`, "utf8");

const unpairedEn = enFiles.filter(f => {
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
  const enFile = esToEnPath(f);
  return !fs.existsSync(enFile);
});
const hasUnpaired = unpairedEn.length > 0 || unpairedEs.length > 0;

if (hasUnpaired) {
  process.exit(1);
}

console.log("\n✅ Report saved to COVERAGE_REPORT.md");