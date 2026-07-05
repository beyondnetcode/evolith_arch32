#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const EN = path.join(ROOT, 'reference/core/control-center/gap-tracking.md');
const ES = path.join(ROOT, 'reference/core/control-center/gap-tracking.es.md');

function parseRows(content) {
  const rows = [];
  let inTable = false;
  for (const line of content.split('\n')) {
    if (line.startsWith('| ID |')) { inTable = true; continue; }
    if (!inTable) continue;
    if (line.startsWith('|---|')) continue;
    if (!line.trim().startsWith('|')) { inTable = false; continue; }
    const m = line.match(/`(GT-\d+|MT-A\d+)`/);
    if (m) rows.push({ id: m[1], line });
  }
  return rows;
}

function getId(line) {
  const m = line.match(/`(GT-\d+|MT-A\d+)`/);
  return m ? m[1] : null;
}

// Step 1: Parse both files
const enContent = fs.readFileSync(EN, 'utf8');
const esContent = fs.readFileSync(ES, 'utf8');
const enRows = parseRows(enContent);
const esRows = parseRows(esContent);

console.log(`EN: ${enRows.length} rows, ES: ${esRows.length} rows`);

// Step 2: Build unified row set - use EN as canonical, add missing rows from ES
const enIds = new Set(enRows.map(r => r.id));
const esOnlyRows = esRows.filter(r => !enIds.has(r.id));
console.log(`Rows in ES but not EN: ${esOnlyRows.map(r => r.id).join(', ')}`);

// For each ES-only row, we need to add it to EN. But EN uses English descriptions.
// We'll add them as DONE since they have closure evidence or are already DONE in EN context.
// The EN descriptions need to be written manually.
const EN_DESCRIPTIONS = {
  'GT-261': '| [`GT-261`](./gap-reference-catalog.md#gt-261) | Add resource limits to all Docker containers | `Infrastructure` | Cross | P2 | S | `DONE` |',
  'GT-263': '| [`GT-263`](./gap-reference-catalog.md#gt-263) | Add infrastructure-level Prometheus alerts | `Observability` | Cross | P2 | S | `DONE` |',
};

// Insert missing EN rows in correct position (after GT-211 for P2/S entries)
const insertAfter = 'GT-211';
const EN_STATUS_FIXES = {
  'GT-229': { pending: '`PENDING`', done: '`DONE`' },
  'GT-266': { pending: '`PENDING`', done: '`DONE`' },
};
const newEnRows = [];
for (const row of enRows) {
  let line = row.line;
  if (EN_STATUS_FIXES[row.id]) {
    line = line.replace(EN_STATUS_FIXES[row.id].pending, EN_STATUS_FIXES[row.id].done);
  }
  newEnRows.push({ id: row.id, line });
  if (row.id === insertAfter && esOnlyRows.length > 0) {
    for (const esRow of esOnlyRows) {
      if (EN_DESCRIPTIONS[esRow.id]) {
        newEnRows.push({ id: esRow.id, line: EN_DESCRIPTIONS[esRow.id] });
      }
    }
  }
}

// Step 3: Make ES match EN's row order and statuses
const enIdOrder = newEnRows.map(r => r.id);
const esRowMap = new Map(esRows.map(r => [r.id, r.line]));

// Status mappings for gaps that EN has as DONE but ES has as PENDING
const STATUS_FIXES = {
  'GT-258': { pendiente: '`PENDIENTE`', done: '`DONE`' },
  'GT-262': { pendiente: '`PENDIENTE`', done: '`DONE`' },
  'GT-264': { pendiente: '`PENDIENTE`', done: '`DONE`' },
  'GT-265': { pendiente: '`PENDIENTE`', done: '`DONE`' },
  'GT-229': { pendiente: '`PENDIENTE`', done: '`DONE`' },
  'GT-266': { pendiente: '`PENDIENTE`', done: '`DONE`' },
};

const newEsRows = [];
for (const id of enIdOrder) {
  let esLine = esRowMap.get(id);
  if (!esLine) {
    // This ID doesn't exist in ES - shouldn't happen but safety
    console.warn(`Warning: ${id} not found in ES`);
    continue;
  }
  // Fix status for gaps we're closing
  if (STATUS_FIXES[id]) {
    esLine = esLine.replace(STATUS_FIXES[id].pendiente, STATUS_FIXES[id].done);
  }
  newEsRows.push({ id, line: esLine });
}

console.log(`EN after fix: ${newEnRows.length} rows, ES after fix: ${newEsRows.length} rows`);

// Step 4: Rewrite both files preserving everything outside the table
function rewriteFile(filePath, newRows, isEs) {
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
  const after = lines.slice(tableEnd);
  
  const newLines = [
    ...before,
    ...header,
    ...newRows.map(r => r.line),
    '',
    ...after,
  ];
  
  let result = newLines.join('\n');
  
  // Update progress counter
  const doneCount = newRows.filter(r => {
    const line = r.line;
    return line.includes('DONE') || line.includes('COMPLETADO');
  }).length;
  const pendingCount = newRows.length - doneCount;
  
  result = result.replace(
    /\*\*(Progress|Progreso):\*\* \d+ \/ \d+ (done|completados) · \d+ (in progress|en progreso) · \d+ (pending|pendientes) · \d+ (deferred|diferidos?)/,
    `**${isEs ? 'Progreso' : 'Progress'}:** ${doneCount} / ${newRows.length} ${isEs ? 'completados' : 'done'} · 0 ${isEs ? 'en progreso' : 'in progress'} · ${pendingCount} ${isEs ? 'pendientes' : 'pending'} · 0 ${isEs ? 'diferidos' : 'deferred'}`
  );
  
  // Update timestamp
  result = result.replace(
    /\*\*(Last Updated|Última Actualización):\*\* [^\n]*/,
    `**${isEs ? 'Última Actualización' : 'Last Updated'}:** 2026-06-24 (GT-229, GT-266 closure + tracking reconciliation)`
  );
  
  fs.writeFileSync(filePath, result, 'utf8');
  console.log(`${path.basename(filePath)}: ${doneCount} done, ${pendingCount} pending, ${newRows.length} total`);
}

rewriteFile(EN, newEnRows, false);
rewriteFile(ES, newEsRows, true);
console.log('Structural fix applied.');
