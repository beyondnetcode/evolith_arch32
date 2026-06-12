import fs from 'fs';
import path from 'path';

const EN_FILE = path.resolve('reference/governance/standards/vision/gap-tracking.md');
const ES_FILE = path.resolve('reference/governance/standards/vision/gap-tracking.es.md');
const EN_CATALOG = path.resolve('reference/governance/standards/vision/gap-reference-catalog.md');
const ES_CATALOG = path.resolve('reference/governance/standards/vision/gap-reference-catalog.es.md');

let hasErrors = false;

function reportError(msg) {
  console.error(`❌ [ERROR] ${msg}`);
  hasErrors = true;
}

function parseTableRows(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const rows = [];
  let inTable = false;
  
  for (const line of lines) {
    if (line.startsWith('| ID |') || line.startsWith('|---|') || line.startsWith('| ID | Gap | Fase |')) {
      inTable = true;
      continue;
    }
    if (inTable) {
      if (!line.trim().startsWith('|')) {
        inTable = false;
        continue;
      }
      const cols = line.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 6) {
        // ID format: [`GT-35`](./gap-reference-catalog.md#gt-35)
        const idMatch = cols[0].match(/`GT-(\d+)`/);
        if (idMatch) {
          rows.push({
            id: `GT-${idMatch[1]}`,
            status: cols[5].replace(/`/g, '')
          });
        }
      }
    }
  }
  return { rows, content };
}

function parseCatalogIds(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const ids = new Set();
  
  for (const line of lines) {
    const match = line.match(/^#### (GT-\d+)/);
    if (match) {
      ids.add(match[1]);
    }
  }
  return ids;
}

function validateFile(trackingFile, catalogFile, isEs) {
  console.log(`\nValidating ${path.basename(trackingFile)}...`);
  const { rows, content } = parseTableRows(trackingFile);
  const catalogIds = parseCatalogIds(catalogFile);
  
  const idCounts = {};
  let pendingCount = 0;
  let deferredCount = 0;
  let doneCount = 0;

  for (const row of rows) {
    idCounts[row.id] = (idCounts[row.id] || 0) + 1;
    
    // Check duplicates
    if (idCounts[row.id] > 1) {
      reportError(`Duplicate ID found: ${row.id}`);
    }
    
    // Check catalog reference
    if (!catalogIds.has(row.id)) {
      reportError(`ID ${row.id} exists in tracking board but is missing a '#### ${row.id}' section in ${path.basename(catalogFile)}`);
    }

    // Count statuses
    const status = row.status.toUpperCase();
    if (status === 'PENDING' || status === 'PENDIENTE') pendingCount++;
    else if (status === 'DEFERRED' || status === 'DIFERIDO') deferredCount++;
    else if (status === 'DONE' || status === 'COMPLETADO') doneCount++;
    else if (status === 'IN-PROGRESS' || status === 'EN-PROGRESO') pendingCount++; // Treating in-progress separately below or merging. 
    // Wait, the text says "Progress: 16 / 33 done · 3 in progress · 13 pending · 1 deferred"
  }
  
  // Recount properly for in-progress
  let inProgressCount = 0;
  pendingCount = 0;
  for (const row of rows) {
    const status = row.status.toUpperCase();
    if (status === 'IN-PROGRESS' || status === 'EN-PROGRESO' || status === 'EN PROGRESO') inProgressCount++;
    else if (status === 'PENDING' || status === 'PENDIENTE') pendingCount++;
  }

  const total = doneCount + pendingCount + deferredCount + inProgressCount;
  
  // Find the progress line
  const progressMatchEn = content.match(/\*\*Progress:\*\* (\d+) \/ \d+ done · (\d+) in progress · (\d+) pending · (\d+) deferred/);
  const progressMatchEs = content.match(/\*\*Progreso:\*\* (\d+) \/ \d+ completados · (\d+) en progreso · (\d+) pendientes · (\d+) diferido/);
  
  const progressMatch = isEs ? progressMatchEs : progressMatchEn;
  
  if (progressMatch) {
    const pDone = parseInt(progressMatch[1], 10);
    const pInProg = parseInt(progressMatch[2], 10);
    const pPend = parseInt(progressMatch[3], 10);
    const pDef = parseInt(progressMatch[4], 10);
    
    if (pDone !== doneCount) reportError(`DONE count mismatch. Text says ${pDone}, table has ${doneCount}`);
    if (pInProg !== inProgressCount) reportError(`IN-PROGRESS count mismatch. Text says ${pInProg}, table has ${inProgressCount}`);
    if (pPend !== pendingCount) reportError(`PENDING count mismatch. Text says ${pPend}, table has ${pendingCount}`);
    if (pDef !== deferredCount) reportError(`DEFERRED count mismatch. Text says ${pDef}, table has ${deferredCount}`);
  } else {
    reportError(`Could not find the Progress text line or it does not match the expected format.`);
  }

  return { rows, total };
}

function run() {
  if (!fs.existsSync(EN_FILE) || !fs.existsSync(ES_FILE)) {
    reportError("Gap tracking files not found.");
    process.exit(1);
  }

  const enResult = validateFile(EN_FILE, EN_CATALOG, false);
  const esResult = validateFile(ES_FILE, ES_CATALOG, true);

  if (enResult.total !== esResult.total) {
    reportError(`Mismatched row counts between EN (${enResult.total}) and ES (${esResult.total})`);
  } else {
    // Check bilingual parity
    for (let i = 0; i < enResult.rows.length; i++) {
      if (enResult.rows[i].id !== esResult.rows[i].id) {
        reportError(`Row ${i+1} ID mismatch: EN has ${enResult.rows[i].id}, ES has ${esResult.rows[i].id}`);
      }
    }
  }

  if (hasErrors) {
    console.error(`\n❌ Tracking validation failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Tracking validation passed.`);
  }
}

run();
