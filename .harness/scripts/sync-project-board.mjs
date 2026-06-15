import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Intentar cargar GH_TOKEN desde un archivo oculto .env
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^GH_TOKEN=(.*)/);
    if (match && match[1]) {
      process.env.GH_TOKEN = match[1].trim();
    }
  });
}

const TRACKING_FILE_ES = './reference/governance/standards/vision/gap-tracking.es.md';
const TRACKING_FILE_EN = './reference/governance/standards/vision/gap-tracking.md';
const PROJECT_NUMBER = '1';
const OWNER = 'beyondnetcode';
const PROJECT_NODE_ID = 'PVT_kwDOD5Ic284BaueG';
const STATUS_FIELD_ID = 'PVTSSF_lADOD5Ic284BaueGzhVj8qs';
const OPTION_DONE = '98236657';
const OPTION_BACKLOG = 'f75ad846';

const SIZE_FIELD_ID = 'PVTSSF_lADOD5Ic284BaueGzhVj82U';
const SIZE_OPTIONS = {
  'S': 'f784b110',
  'M': '7515a9f1',
  'L': '817d0097'
};

console.log('--- Evolith Bidirectional Gap Sync ---');

// 1. Determine priority (Local vs GitHub)
let isLocalModified = false;
try {
  const gitStatus = execSync(`git status --porcelain ${TRACKING_FILE_ES}`, { encoding: 'utf-8' }).trim();
  if (gitStatus.length > 0) {
    isLocalModified = true;
    console.log('📌 Local Markdown file has unstaged/staged changes. Local takes priority.');
  } else {
    console.log('☁️ Local Markdown file is clean. GitHub Project takes priority.');
  }
} catch (e) {
  console.log('⚠️ Failed to check git status. Defaulting to GitHub priority.');
}

// 2. Fetch GitHub items
console.log('📡 Fetching GitHub Project Items...');
let ghItems = [];
try {
  const out = execSync(`gh project item-list ${PROJECT_NUMBER} --owner ${OWNER} --format json`, { encoding: 'utf-8' });
  const parsed = JSON.parse(out);
  ghItems = parsed.items;
} catch (e) {
  console.error('❌ Failed to fetch project items. Sync aborted.', e.message);
  process.exit(1);
}

// Map GT-ID to GH Item
const ghMap = new Map();
for (const item of ghItems) {
  const idMatch = item.title.match(/\[(GT-\d+)\]/);
  if (idMatch) {
    ghMap.set(idMatch[1], {
      id: item.id,
      status: item.status, // e.g. "Done", "Backlog", "In progress"
    });
  }
}

// 3. Process Markdown
function processTrackingFile(filePath, isSpanish) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');
  let fileModified = false;
  
  let stats = { completados: 0, pendientes: 0, enProgreso: 0, diferidos: 0, total: 0 };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('|') && line.includes('`GT-')) {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length >= 8) {
        const idMatch = parts[1].match(/\[\`(GT-\d+)\`\]/);
        if (idMatch) {
          const gapId = idMatch[1];
          let localStatus = parts[7].replace(/`/g, '');
          const ghItem = ghMap.get(gapId);
          
          if (ghItem) {
            const isLocalDone = localStatus === (isSpanish ? 'COMPLETADO' : 'DONE');
            const isGhDone = ghItem.status === 'Done';
            
            if (isLocalModified) {
              // Local wins. Update GH if necessary
              if (isLocalDone && !isGhDone) {
                console.log(`📤 Pushing ${gapId} to Done on GitHub...`);
                execSync(`gh project item-edit --id ${ghItem.id} --project-id ${PROJECT_NODE_ID} --field-id ${STATUS_FIELD_ID} --single-select-option-id ${OPTION_DONE}`);
              } else if (!isLocalDone && isGhDone) {
                console.log(`📤 Pushing ${gapId} to Backlog on GitHub...`);
                execSync(`gh project item-edit --id ${ghItem.id} --project-id ${PROJECT_NODE_ID} --field-id ${STATUS_FIELD_ID} --single-select-option-id ${OPTION_BACKLOG}`);
              }
              
              // Sync Size
              const complexity = parts[5].trim();
              if (SIZE_OPTIONS[complexity]) {
                console.log(`📤 Pushing ${gapId} Size (${complexity}) to GitHub...`);
                execSync(`gh project item-edit --id ${ghItem.id} --project-id ${PROJECT_NODE_ID} --field-id ${SIZE_FIELD_ID} --single-select-option-id ${SIZE_OPTIONS[complexity]}`);
              }
            } else {
              // GH wins. Update Local if necessary
              if (isGhDone && !isLocalDone) {
                console.log(`📥 Pulling ${gapId} state from GitHub (Marking as Done/COMPLETADO)`);
                parts[7] = isSpanish ? '`COMPLETADO`' : '`DONE`';
                lines[i] = parts.join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |');
                fileModified = true;
                localStatus = isSpanish ? 'COMPLETADO' : 'DONE';
              } else if (!isGhDone && isLocalDone) {
                console.log(`📥 Pulling ${gapId} state from GitHub (Marking as PENDIENTE/PENDING)`);
                parts[7] = isSpanish ? '`PENDIENTE`' : '`PENDING`';
                lines[i] = parts.join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |');
                fileModified = true;
                localStatus = isSpanish ? 'PENDIENTE' : 'PENDING';
              }
            }
          }
          
          // Tally stats
          if (localStatus === 'COMPLETADO' || localStatus === 'DONE') stats.completados++;
          else if (localStatus === 'DIFERIDO' || localStatus === 'DEFERRED') stats.diferidos++;
          else if (localStatus === 'EN PROGRESO' || localStatus === 'IN-PROGRESS') stats.enProgreso++;
          else stats.pendientes++;
          stats.total++;
        }
      }
    }
  }

  // Update Totals if needed
  const totalsLineIndex = lines.findIndex(l => l.startsWith('**Progreso:') || l.startsWith('**Progress:'));
  if (totalsLineIndex !== -1) {
    const oldTotals = lines[totalsLineIndex];
    let newTotals = '';
    if (isSpanish) {
      newTotals = `**Progreso:** ${stats.completados} / ${stats.total} completados · ${stats.enProgreso} en progreso · ${stats.pendientes} pendientes · ${stats.diferidos} diferidos`;
    } else {
      newTotals = `**Progress:** ${stats.completados} / ${stats.total} done · ${stats.enProgreso} in progress · ${stats.pendientes} pending · ${stats.diferidos} deferred`;
    }
    if (oldTotals !== newTotals) {
      lines[totalsLineIndex] = newTotals;
      fileModified = true;
      console.log(`📊 Updated totals in ${isSpanish ? 'ES' : 'EN'} to: ${newTotals}`);
    }
  }

  if (fileModified) {
    fs.writeFileSync(filePath, lines.join('\n'));
    return true;
  }
  return false;
}

const modEs = processTrackingFile(TRACKING_FILE_ES, true);
const modEn = processTrackingFile(TRACKING_FILE_EN, false);

if (modEs || modEn) {
  console.log('\n❌ Sincronización realizada: Los archivos markdown locales fueron actualizados con el estado de GitHub.');
  console.log('   Por favor revisa los cambios (git diff), haz stage (git add) y reintenta tu commit/push.');
  process.exit(1); // Fail the hook so the user can commit the synced changes!
} else {
  console.log('\n✅ Todo está sincronizado.');
  process.exit(0);
}
