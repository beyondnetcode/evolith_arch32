#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const EN = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.md');
const ES = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.es.md');

function parseTable(filePath) {
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
  const before = lines.slice(0, tableStart);
  const header = lines.slice(tableStart, tableStart + 2);
  const dataLines = lines.slice(tableStart + 2, tableEnd);
  const after = lines.slice(tableEnd);
  return { before, header, dataLines, after, fullContent: content };
}

function extractId(line) {
  const m = line.match(/`(GT-\d+|MT-A\d+)`/);
  return m ? m[1] : null;
}

const en = parseTable(EN);
const es = parseTable(ES);

// Build EN order (canonical)
const enOrder = en.dataLines.map(l => extractId(l)).filter(Boolean);

// Build ES row map: id -> full line
const esRowMap = new Map();
for (const line of es.dataLines) {
  const id = extractId(line);
  if (id) esRowMap.set(id, line);
}

// Rebuild ES data lines in EN order
const newEsDataLines = enOrder.map(id => esRowMap.get(id)).filter(Boolean);

// Check for any ES rows not in EN (shouldn't happen but safety)
const enIds = new Set(enOrder);
for (const [id] of esRowMap) {
  if (!enIds.has(id)) {
    console.warn(`Warning: ES has ${id} not in EN order, appending at end`);
    newEsDataLines.push(esRowMap.get(id));
  }
}

// Rebuild ES file
const newEsContent = [
  ...es.before,
  ...es.header,
  ...newEsDataLines,
  ...es.after,
].join('\n');

fs.writeFileSync(ES, newEsContent, 'utf8');

// Verify
const verify = parseTable(ES);
const verifyIds = verify.dataLines.map(l => extractId(l)).filter(Boolean);
const match = enOrder.length === verifyIds.length && enOrder.every((id, i) => id === verifyIds[i]);
console.log(`ES reordered: ${verifyIds.length} rows, matches EN order: ${match}`);

// Also run a quick status check
function getStatus(line) {
  if (line.includes('DONE') || line.includes('COMPLETADO')) return 'DONE';
  if (line.includes('PENDING') || line.includes('PENDIENTE')) return 'PENDING';
  return 'UNKNOWN';
}

let statusMismatches = 0;
for (let i = 0; i < enOrder.length; i++) {
  const enLine = en.dataLines.find(l => extractId(l) === enOrder[i]);
  const esLine = newEsDataLines[i];
  if (enLine && esLine) {
    const enStatus = getStatus(enLine);
    const esStatus = getStatus(esLine);
    if (enStatus !== esStatus) {
      console.log(`Status mismatch at ${enOrder[i]}: EN=${enStatus} ES=${esStatus}`);
      statusMismatches++;
    }
  }
}
console.log(`Status mismatches: ${statusMismatches}`);
