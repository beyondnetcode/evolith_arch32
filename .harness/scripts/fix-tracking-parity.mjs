#!/usr/bin/env node
/**
 * Atomic fix for tracking parity: removes GT-260, GT-228, GT-261, GT-263 from PENDING,
 * adds GT-229, GT-261, GT-263, GT-266 to DONE, updates counters.
 * Applied identically to EN and ES files.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const EN = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.md');
const ES = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.es.md');

const REMOVE_FROM_PENDING = ['GT-260', 'GT-228', 'GT-261', 'GT-263'];

// EN entries to add to DONE section
const EN_DONE_ENTRIES = {
  'GT-229': '| [`GT-229`](./gap-reference-catalog.md#gt-229) | Complete Dual-Engine TypeScript evaluator (R-25 compliance) | `Core Domain` | Cross | P1 | XL | `DONE` |',
  'GT-261': '| [`GT-261`](./gap-reference-catalog.md#gt-261) | Add resource limits to all Docker containers | `Infrastructure` | Cross | P2 | S | `DONE` |',
  'GT-263': '| [`GT-263`](./gap-reference-catalog.md#gt-263) | Add infrastructure-level Prometheus alerts | `Observability` | Cross | P2 | S | `DONE` |',
  'GT-266': '| [`GT-266`](./gap-reference-catalog.md#gt-266) | Create API key provisioning service for MCP HTTP transport | `Security` | Cross | P2 | M | `DONE` |',
};

const ES_DONE_ENTRIES = {
  'GT-229': '| [`GT-229`](./gap-reference-catalog.es.md#gt-229) | Completar evaluador TypeScript Dual-Engine (cumplimiento R-25) | `Core Domain` | Cross | P1 | XL | `COMPLETADO` |',
  'GT-261': '| [`GT-261`](./gap-reference-catalog.es.md#gt-261) | Añadir límites de recursos a todos los contenedores Docker | `Infrastructure` | Cross | P2 | S | `COMPLETADO` |',
  'GT-263': '| [`GT-263`](./gap-reference-catalog.es.md#gt-263) | Añadir alertas Prometheus a nivel de infraestructura | `Observability` | Cross | P2 | S | `COMPLETADO` |',
  'GT-266': '| [`GT-266`](./gap-reference-catalog.es.md#gt-266) | Crear servicio de provisioning de API keys para MCP HTTP | `Security` | Cross | P2 | M | `COMPLETADO` |',
};

function extractId(line) {
  const m = line.match(/`(GT-\d+|MT-A\d+)`/);
  return m ? m[1] : null;
}

function processFile(filePath, doneEntries, isEs) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find table boundaries
  let tableStart = -1;
  let tableEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('| ID |')) tableStart = i;
    if (tableStart >= 0 && !lines[i].trim().startsWith('|') && lines[i].trim() !== '') {
      tableEnd = i;
      break;
    }
  }
  if (tableEnd === -1) tableEnd = lines.length;

  // Separate header, separator, data rows
  const header = lines.slice(tableStart, tableStart + 2); // "| ID |..." and "|---|..."
  const dataLines = lines.slice(tableStart + 2, tableEnd);
  
  // Parse rows into pending and done
  const pendingRows = [];
  const doneRows = [];
  
  for (const line of dataLines) {
    const id = extractId(line);
    if (!id) continue;
    
    const isPending = line.includes('PENDING') || line.includes('PENDIENTE');
    const isDone = line.includes('DONE') || line.includes('COMPLETADO');
    
    if (isPending) {
      if (!REMOVE_FROM_PENDING.includes(id)) {
        pendingRows.push(line);
      }
    } else if (isDone) {
      doneRows.push(line);
    }
  }
  
  // Insert new done entries in correct position
  // GT-229 (P1/XL) goes after P1/L entries and before P2/S
  // GT-261, GT-263 (P2/S) go after existing P2/S entries
  // GT-266 (P2/M) goes after existing P2/M entries
  
  // Find insertion points
  let insert229 = -1;
  let insert261_263 = -1;
  let insert266 = -1;
  
  for (let i = 0; i < doneRows.length; i++) {
    const id = extractId(doneRows[i]);
    const isP1L = doneRows[i].includes('P1') && doneRows[i].includes('L');
    const isP2S = doneRows[i].includes('P2') && doneRows[i].includes('S');
    const isP2M = doneRows[i].includes('P2') && doneRows[i].includes('M');
    
    if (isP1L) insert229 = i + 1;
    if (isP2S) insert261_263 = i + 1;
    if (isP2M) insert266 = i + 1;
  }
  
  // Insert in reverse order to preserve indices
  if (insert266 >= 0) doneRows.splice(insert266, 0, doneEntries['GT-266']);
  if (insert261_263 >= 0) {
    doneRows.splice(insert261_263, 0, doneEntries['GT-263']);
    doneRows.splice(insert261_263, 0, doneEntries['GT-261']);
  }
  if (insert229 >= 0) doneRows.splice(insert229, 0, doneEntries['GT-229']);
  
  // Rebuild table
  const newTable = [...header, ...pendingRows, ...doneRows];
  
  // Replace table in content
  const before = lines.slice(0, tableStart).join('\n');
  const after = lines.slice(tableEnd).join('\n');
  const newContent = before + newTable.join('\n') + '\n' + after;
  
  // Update progress counter
  const doneCount = doneRows.length;
  const pendingCount = pendingRows.length;
  const updated = newContent
    .replace(
      /\*\*(Progress|Progreso):\*\* \d+ \/ \d+ (done|completados) · \d+ (in progress|en progreso) · \d+ (pending|pendientes) · \d+ (deferred|diferidos?)/,
      `**${isEs ? 'Progreso' : 'Progress'}:** ${doneCount} / 265 ${isEs ? 'completados' : 'done'} · 0 ${isEs ? 'en progreso' : 'in progress'} · ${pendingCount} ${isEs ? 'pendientes' : 'pending'} · 0 ${isEs ? 'diferidos' : 'deferred'}`
    )
    .replace(
      /\*\*(Last Updated|Última Actualización):\*\* [^\n]*/,
      `**${isEs ? 'Última Actualización' : 'Last Updated'}:** 2026-06-24 (GT-229, GT-266 closure + tracking reconciliation)`
    );
  
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`${path.basename(filePath)}: ${doneCount} done, ${pendingCount} pending`);
}

processFile(EN, EN_DONE_ENTRIES, false);
processFile(ES, ES_DONE_ENTRIES, true);
console.log('Tracking parity fix applied.');
