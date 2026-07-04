#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const EN = path.join(ROOT, 'reference/core/control-center/gap-tracking.md');
const ES = path.join(ROOT, 'reference/core/control-center/gap-tracking.es.md');

function extractAllRows(content) {
  const lines = content.split('\n');
  let inTable = false;
  const rows = [];
  for (const line of lines) {
    if (line.startsWith('| ID |')) { inTable = true; continue; }
    if (!inTable) continue;
    if (line.startsWith('|---|')) continue;
    if (!line.trim().startsWith('|') && line.trim() !== '') { inTable = false; continue; }
    const m = line.match(/`(GT-\d+|MT-A\d+)`/);
    if (m) {
      const status = (line.includes('DONE') || line.includes('COMPLETADO')) ? 'DONE' : 'PENDING';
      rows.push({ id: m[1], line, status });
    }
  }
  return rows;
}

function getTableBounds(content) {
  const lines = content.split('\n');
  let start = -1, end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('| ID |')) start = i;
    if (start >= 0 && end === -1 && i > start + 1 && !lines[i].trim().startsWith('|')) {
      end = i;
    }
  }
  return { start, end: end === -1 ? lines.length : end };
}

// Parse files
const enContent = fs.readFileSync(EN, 'utf8');
const esContent = fs.readFileSync(ES, 'utf8');
const enRows = extractAllRows(enContent);
const esRows = extractAllRows(esContent);

console.log(`EN: ${enRows.length} rows, ES: ${esRows.length} rows`);

// Step 1: Remove GT-260 and GT-228 PENDING duplicates from BOTH files
// Keep only the DONE version of each
const idsToDedup = new Set(['GT-260', 'GT-228']);
function dedup(rows) {
  const cleaned = [];
  const seen = new Set();
  for (const row of rows) {
    if (idsToDedup.has(row.id)) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      const other = rows.find(r => r.id === row.id && r !== row);
      if (other && other.status === 'DONE' && row.status === 'PENDING') {
        cleaned.push(other);
      } else {
        cleaned.push(row);
      }
    } else {
      cleaned.push(row);
    }
  }
  return cleaned;
}
const cleanedEnRows = dedup(enRows);
const cleanedEsRows = dedup(esRows);

console.log(`EN after dedup: ${cleanedEnRows.length} rows, ES after dedup: ${cleanedEsRows.length} rows`);

// Step 2: Reorder ES to match EN's ID order
const enIdOrder = cleanedEnRows.map(r => r.id);
const esRowMap = new Map(cleanedEsRows.map(r => [r.id, r.line]));
const reorderedEsRows = [];
for (const id of enIdOrder) {
  const line = esRowMap.get(id);
  if (line) {
    reorderedEsRows.push(line);
  } else {
    console.error(`Missing ES row for ${id}`);
  }
}

console.log(`ES after reorder: ${reorderedEsRows.length} rows`);

// Step 3: Write EN file with deduped rows
const enLines = enContent.split('\n');
const enBounds = getTableBounds(enContent);
const enHeader = enLines.slice(enBounds.start, enBounds.start + 2);
const newEnContent = [
  ...enLines.slice(0, enBounds.start),
  ...enHeader,
  ...cleanedEnRows.map(r => r.line),
  '',
  ...enLines.slice(enBounds.end),
].join('\n');
fs.writeFileSync(EN, newEnContent, 'utf8');

// Step 4: Write ES file
const esLines = esContent.split('\n');
const esBounds = getTableBounds(esContent);
const esHeader = esLines.slice(esBounds.start, esBounds.start + 2);
const newEsContent = [
  ...esLines.slice(0, esBounds.start),
  ...esHeader,
  ...reorderedEsRows,
  '',
  ...esLines.slice(esBounds.end),
].join('\n');
fs.writeFileSync(ES, newEsContent, 'utf8');

// Verify
const verifyEn = extractAllRows(newEnContent);
const verifyEs = extractAllRows(newEsContent);
const verifyEnIds = verifyEn.map(r => r.id);
const verifyEsIds = verifyEs.map(r => r.id);
const match = verifyEnIds.length === verifyEsIds.length && verifyEnIds.every((id, i) => id === verifyEsIds[i]);
console.log(`Verification: EN ${verifyEnIds.length} ids, ES ${verifyEsIds.length} ids, match: ${match}`);
