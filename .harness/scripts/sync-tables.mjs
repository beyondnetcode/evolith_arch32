#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const EN = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.md');
const ES = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.es.md');

function extractTableRows(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let tableStart = -1;
  let tableEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('| ID |')) tableStart = i;
    if (tableStart >= 0 && tableEnd === -1 && i > tableStart + 1 && !lines[i].trim().startsWith('|')) {
      tableEnd = i;
    }
  }
  if (tableEnd === -1) tableEnd = lines.length;
  
  const header = lines.slice(tableStart, tableStart + 2);
  const dataLines = lines.slice(tableStart + 2, tableEnd);
  
  const rows = [];
  for (const line of dataLines) {
    const m = line.match(/`(GT-\d+|MT-A\d+)`/);
    if (m) rows.push({ id: m[1], line });
  }
  
  return { before: lines.slice(0, tableStart), header, rows, after: lines.slice(tableEnd) };
}

// Parse both files
const en = extractTableRows(EN);
const es = extractTableRows(ES);

console.log(`EN: ${en.rows.length} data rows`);
console.log(`ES: ${es.rows.length} data rows`);

// Build ID->line maps
const enMap = new Map(en.rows.map(r => [r.id, r.line]));
const esMap = new Map(es.rows.map(r => [r.id, r.line]));

// Union of all IDs
const allIds = [...new Set([...enMap.keys(), ...esMap.keys()])];
console.log(`Unique IDs: ${allIds.length}`);

// Build new EN rows: use EN line if exists, otherwise create from ES
const newEnRows = [];
for (const id of enMap.keys()) {
  newEnRows.push(enMap.get(id));
}

// Build new ES rows: same order as EN, using ES lines where available
const newEsRows = [];
for (const id of enMap.keys()) {
  const esLine = esMap.get(id);
  if (esLine) {
    newEsRows.push(esLine);
  } else {
    console.warn(`ES missing ${id}`);
  }
}

// Check for ES-only IDs
for (const id of esMap.keys()) {
  if (!enMap.has(id)) {
    console.warn(`ES has ${id} not in EN`);
  }
}

// Write EN file (just update table rows, keep everything else)
function writeFile(filePath, structure, newRows) {
  const content = fs.readFileSync(filePath, 'utf8');
  const allLines = content.split('\n');
  
  // Find table boundaries
  let tableStart = -1;
  let tableEnd = -1;
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].startsWith('| ID |')) tableStart = i;
    if (tableStart >= 0 && tableEnd === -1 && i > tableStart + 1 && !allLines[i].trim().startsWith('|')) {
      tableEnd = i;
    }
  }
  if (tableEnd === -1) tableEnd = allLines.length;
  
  const newContent = [
    ...allLines.slice(0, tableStart),
    ...structure.header,
    ...newRows,
    '',
    ...allLines.slice(tableEnd),
  ].join('\n');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
}

writeFile(EN, en, newEnRows);
writeFile(ES, es, newEsRows);

// Verify
const verifyEn = extractTableRows(EN);
const verifyEs = extractTableRows(ES);
const verifyEnIds = verifyEn.rows.map(r => r.id);
const verifyEsIds = verifyEs.rows.map(r => r.id);

let match = true;
for (let i = 0; i < Math.max(verifyEnIds.length, verifyEsIds.length); i++) {
  if (verifyEnIds[i] !== verifyEsIds[i]) {
    console.log(`Mismatch at ${i}: EN=${verifyEnIds[i]} ES=${verifyEsIds[i]}`);
    match = false;
    break;
  }
}
console.log(`EN: ${verifyEnIds.length} rows, ES: ${verifyEsIds.length} rows, match: ${match}`);
