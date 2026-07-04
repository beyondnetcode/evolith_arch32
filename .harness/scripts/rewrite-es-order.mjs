#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const EN = path.join(ROOT, 'reference/core/control-center/gap-tracking.md');
const ES = path.join(ROOT, 'reference/core/control-center/gap-tracking.es.md');

function extractDataRows(content) {
  const lines = content.split('\n');
  let inTable = false;
  const rows = [];
  for (const line of lines) {
    if (line.startsWith('| ID |')) { inTable = true; continue; }
    if (!inTable) continue;
    if (line.startsWith('|---|')) continue;
    if (!line.trim().startsWith('|')) { inTable = false; continue; }
    const m = line.match(/`(GT-\d+|MT-A\d+)`/);
    if (m) rows.push({ id: m[1], line });
  }
  return rows;
}

function extractTableBounds(content) {
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

// Read files
const enContent = fs.readFileSync(EN, 'utf8');
const esContent = fs.readFileSync(ES, 'utf8');

// Extract rows
const enRows = extractDataRows(enContent);
const esRows = extractDataRows(esContent);

// Build ES map: id -> full line
const esMap = new Map();
for (const r of esRows) esMap.set(r.id, r.line);

// Build new ES rows in EN's order
const newEsLines = [];
for (const r of enRows) {
  const esLine = esMap.get(r.id);
  if (esLine) {
    newEsLines.push(esLine);
  } else {
    console.error(`Missing ES row: ${r.id}`);
  }
}

// Find table bounds in ES
const bounds = extractTableBounds(esContent);
const esLines = esContent.split('\n');

// Rebuild ES file: everything before table + header + new rows + everything after
const before = esLines.slice(0, bounds.start);
const header = esLines.slice(bounds.start, bounds.start + 2); // "| ID |..." and "|---|..."
const after = esLines.slice(bounds.end);

const newEs = [...before, ...header, ...newEsLines, '', ...after].join('\n');
fs.writeFileSync(ES, newEs, 'utf8');

// Verify
const verifyRows = extractDataRows(newEs);
const enIds = enRows.map(r => r.id);
const esIds = verifyRows.map(r => r.id);
const match = enIds.length === esIds.length && enIds.every((id, i) => id === esIds[i]);
console.log(`EN: ${enIds.length} rows, ES: ${esIds.length} rows, order match: ${match}`);
