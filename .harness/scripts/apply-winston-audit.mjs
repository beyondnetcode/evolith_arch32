#!/usr/bin/env node

/**
 * apply-winston-audit — Injects Winston JSON reports into the Tracking boards.
 *
 * Reads a JSON file strictly conforming to winston-audit-output.schema.json,
 * filters for findings with `gap_candidate: true`, and safely appends them
 * to the markdown tracking boards (EN and ES).
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const TRACKING_EN = path.join(rootDir, 'reference/governance/standards/vision/gap-tracking.md');
const TRACKING_ES = path.join(rootDir, 'reference/governance/standards/vision/gap-tracking.es.md');
const CATALOG_EN = path.join(rootDir, 'reference/governance/standards/vision/gap-reference-catalog.md');
const CATALOG_ES = path.join(rootDir, 'reference/governance/standards/vision/gap-reference-catalog.es.md');

async function main() {
  const args = process.argv.slice(2);
  const reportPath = args[0];

  if (!reportPath) {
    console.error('Usage: node .harness/scripts/apply-winston-audit.mjs <path-to-report.json>');
    process.exit(1);
  }

  let report;
  try {
    const content = await fs.readFile(path.resolve(process.cwd(), reportPath), 'utf8');
    report = JSON.parse(content);
  } catch (error) {
    console.error(`Error reading or parsing JSON at ${reportPath}:`, error.message);
    process.exit(1);
  }

  if (!report.findings || !Array.isArray(report.findings)) {
    console.error('Error: Invalid report format. Expected "findings" array.');
    process.exit(1);
  }

  const gapCandidates = report.findings.filter(f => f.gap_candidate === true);

  if (gapCandidates.length === 0) {
    console.log('No findings marked as gap_candidate: true. Nothing to inject.');
    process.exit(0);
  }

  console.log(`Found ${gapCandidates.length} gap candidates to inject.`);

  // Find current highest GT ID
  const trackingEnContent = await fs.readFile(TRACKING_EN, 'utf8');
  const gtMatches = trackingEnContent.match(/GT-(\d+)/g) || [];
  const maxGtId = gtMatches.reduce((max, current) => {
    const num = parseInt(current.replace('GT-', ''), 10);
    return num > max ? num : max;
  }, 0);

  let nextGtId = maxGtId + 1;
  const newGaps = [];

  for (const finding of gapCandidates) {
    const id = `GT-${nextGtId}`;
    const priority = finding.severity === 'CRITICAL' ? 'P0' : finding.severity === 'HIGH' ? 'P1' : finding.severity === 'MEDIUM' ? 'P2' : 'P3';
    const row = `| [\`${id}\`](./gap-reference-catalog.md#${id.toLowerCase()}) | ${finding.description.replace(/\n/g, ' ')} | \`${finding.category}\` | Cross | ${priority} | M | \`PENDING\` |`;
    const rowEs = `| [\`${id}\`](./gap-reference-catalog.es.md#${id.toLowerCase()}) | ${finding.description.replace(/\n/g, ' ')} | \`${finding.category}\` | Cross | ${priority} | M | \`PENDING\` |`;
    
    let catalogEntry = `\n#### ${id}\n\n**Title:** ${finding.description}\n- **Component:** \`${finding.category}\` · **Priority:** ${priority} · **Risk:** ${finding.severity.toLowerCase()}\n- **Purpose:** ${finding.recommendation}\n- **Acceptance criteria:**\n  - [ ] Addressed based on architectural review.\n- **Dependencies:** None.\n`;

    newGaps.push({ id, row, rowEs, catalogEntry });
    nextGtId++;
  }

  // Inject rows into tables
  const injectRowIntoTable = async (filePath, isEs) => {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      const tableHeaderIndex = content.indexOf('|---|---|:---:|:---:|:---:|:---:|:---:|');
      
      if (tableHeaderIndex === -1) {
         console.warn(`Could not find table header in ${filePath}`);
         return;
      }
      
      const insertPosition = tableHeaderIndex + '|---|---|:---:|:---:|:---:|:---:|:---:|'.length;
      
      const rowsToInsert = newGaps.map(g => isEs ? g.rowEs : g.row).join('\n');
      
      content = content.slice(0, insertPosition) + '\n' + rowsToInsert + content.slice(insertPosition);
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`Updated tracking board: ${path.basename(filePath)}`);
    } catch (e) {
      console.warn(`Error updating ${filePath}:`, e.message);
    }
  };

  await injectRowIntoTable(TRACKING_EN, false);
  await injectRowIntoTable(TRACKING_ES, true);

  // Inject catalog entries
  const injectCatalogEntry = async (filePath) => {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      const entriesToInsert = newGaps.map(g => g.catalogEntry).join('\n');
      content += `\n${entriesToInsert}`;
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`Updated catalog: ${path.basename(filePath)}`);
    } catch (e) {
      console.warn(`Error updating ${filePath}:`, e.message);
    }
  };

  await injectCatalogEntry(CATALOG_EN);
  await injectCatalogEntry(CATALOG_ES);

  console.log(`Successfully injected ${newGaps.length} gaps.`);
}

main().catch(console.error);
