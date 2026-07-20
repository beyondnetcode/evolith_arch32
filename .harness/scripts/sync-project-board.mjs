import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// GT-313: source the GitHub token securely — never from a plaintext .env.
// Priority: explicit env (a CI secret / shell export) → the `gh` CLI's stored
// credential (OS keychain) → fail closed with guidance. The `gh project …`
// subcommands below inherit GH_TOKEN; the Projects API needs the `project` scope.
function resolveGitHubToken() {
  const fromEnv = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '').trim();
  if (fromEnv) return fromEnv;
  try {
    const ghToken = execSync('gh auth token', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (ghToken) return ghToken;
  } catch {
    /* gh CLI absent or not logged in */
  }
  return null;
}

const RESOLVED_GH_TOKEN = resolveGitHubToken();
if (!RESOLVED_GH_TOKEN) {
  console.error(
    'No GitHub token available. Set GH_TOKEN/GITHUB_TOKEN (a CI secret) or run ' +
    '`gh auth login` (add the project scope with `gh auth refresh -s project`). ' +
    'GT-313: this script no longer reads a plaintext .env.',
  );
  process.exit(1);
}
process.env.GH_TOKEN = RESOLVED_GH_TOKEN;

const TRACKING_FILE_ES = './reference/core/control-center/gaps/gap-tracking.es.md';
const TRACKING_FILE_EN = './reference/core/control-center/gaps/gap-tracking.md';
const PROJECT_NUMBER = '1';
const OWNER = 'beyondnetcode';
const PROJECT_NODE_ID = 'PVT_kwDOD5Ic284BaueG';
const STATUS_FIELD_ID = 'PVTSSF_lADOD5Ic284BaueGzhVj8qs';
const OPTION_DONE = '98236657';
const OPTION_BACKLOG = 'f75ad846';
const OPTION_REVISION = 'df73e18b'; // "In review"

const SIZE_FIELD_ID = 'PVTSSF_lADOD5Ic284BaueGzhVj82U';
const SIZE_OPTIONS = {
  'S': 'f784b110',
  'M': '7515a9f1',
  'L': '817d0097'
};

console.log('--- Evolith Bidirectional Gap Sync ---');

// 1. Determine priority (Local vs GitHub)
// Local wins if: (a) file has uncommitted changes, OR (b) file was touched in the last commit.
// This prevents GitHub Project (which may lag behind) from overwriting a just-committed local state.
let isLocalModified = false;
try {
  const gitStatus = execSync(`git status --porcelain ${TRACKING_FILE_ES}`, { encoding: 'utf-8' }).trim();
  if (gitStatus.length > 0) {
    isLocalModified = true;
    console.log('📌 Local Markdown file has uncommitted changes. Local takes priority.');
  }
} catch (e) {
  console.log('⚠️ Failed to check git status.');
}

if (!isLocalModified) {
  try {
    const lastCommitFiles = execSync('git diff-tree --no-commit-id -r --name-only HEAD', { encoding: 'utf-8' });
    const trackingRelPath = TRACKING_FILE_ES.replace(/^\.\//, '');
    if (lastCommitFiles.includes(trackingRelPath)) {
      isLocalModified = true;
      console.log('📌 Tracking file was modified in the last commit. Local takes priority.');
    }
  } catch (e) {
    console.log('⚠️ Failed to inspect last commit.');
  }
}

if (!isLocalModified) {
  console.log('☁️ Local Markdown file is clean and not in last commit. GitHub Project takes priority.');
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
  const idMatch = item.title.match(/\[(GT-\d+|MT-A\d+)\]/);
  if (idMatch) {
    ghMap.set(idMatch[1], {
      id: item.id,
      status: item.status, // e.g. "Done", "Backlog", "In progress"
    });
  }
}

// 3. Process Markdown

/**
 * Map a Status cell to a progress bucket.
 *
 * The two boards do not spell status the same way (`DONE`/`COMPLETADO`,
 * `IN-PROGRESS`/`EN-PROGRESO`), so the comparison must normalise case and
 * separators before matching. Comparing raw literals made the EN and ES
 * totals disagree about the same board: the ES spelling fell through the
 * `else` into "pending", reporting `0 en progreso · 44 pendientes` against
 * the EN `5 in progress · 37 pending`.
 */
const unknownStatuses = new Map();
function classifyStatus(raw, filePath) {
  const s = raw.toUpperCase().replace(/[\s_-]+/g, ' ').trim();
  if (s === 'DONE' || s === 'COMPLETADO') return 'completados';
  if (s === 'DEFERRED' || s === 'DIFERIDO') return 'diferidos';
  if (s === 'IN PROGRESS' || s === 'EN PROGRESO') return 'enProgreso';
  if (s === 'PENDING' || s === 'PENDIENTE') return 'pendientes';
  // REVISION/REVISIÓN has no column in the progress line and has always been
  // counted as pending. Kept as-is deliberately: changing it would move numbers
  // on the board, which is a governance call, not a bug fix.
  if (s === 'REVISION') return 'pendientes';
  // Anything else is drift between the board schema and this script. Counting
  // it silently as "pending" is what hid the bug above, so make it audible.
  const key = `${path.basename(filePath)}: ${raw}`;
  unknownStatuses.set(key, (unknownStatuses.get(key) || 0) + 1);
  return 'pendientes';
}

/**
 * Split a markdown table row into cells.
 *
 * `\|` is an escaped pipe *inside* a cell, not a separator — the GT board uses
 * it constantly in prose (`config\|configRef`, `warn\|block`). A naive
 * `split('|')` breaks those rows into one extra field, shifting every cell
 * right, so a Status read by header index landed on Complexity instead
 * (returning `L`, `S`, `XS`, `P1`...). 31 EN and 33 ES rows are affected, and
 * because this script also WRITES the status back by that index, it would have
 * overwritten the Complexity cell and mangled the escaping on re-join.
 */
function splitRow(line) {
  return line.split(/(?<!\\)\|/).map((s) => s.trim());
}

const seenGaps = new Set();
function processTrackingFile(filePath, isSpanish) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');
  let fileModified = false;
  
  let stats = { completados: 0, pendientes: 0, enProgreso: 0, diferidos: 0, total: 0 };
  
  // GT board schema (UP-001 Amendment 1) added two columns BEFORE Status, so the
  // status index is no longer 7. It is resolved from the header row -- and this
  // script WRITES status back by index, so a stale constant here would silently
  // overwrite the wrong cell (complexity) instead of the status.
  let statusIdx = -1;
  let complexityIdx = -1;
  for (const l of lines) {
    if (!l.startsWith('| ID |')) continue;
    const h = splitRow(l);
    statusIdx = h.findIndex((x) => /^(Status|Estado)$/i.test(x));
    complexityIdx = h.findIndex((x) => /^(Complexity|Complejidad)$/i.test(x));
    break;
  }
  if (statusIdx === -1) {
    throw new Error(`[sync-project-board] no Status/Estado column found in the header of ${filePath}. Refusing to rewrite status by guessed position.`);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('|') && (line.includes('`GT-') || line.includes('`MT-A'))) {
      const parts = splitRow(line);
      if (parts.length > statusIdx) {
        const idMatch = parts[1].match(/\[\`(GT-\d+|MT-A\d+)\`\]/);
        if (idMatch) {
          const gapId = idMatch[1];
          seenGaps.add(gapId);
          let localStatus = parts[statusIdx].replace(/`/g, '');
          const ghItem = ghMap.get(gapId);
          
          if (ghItem) {
            const statusNorm = localStatus.toUpperCase();
            const isLocalDone = statusNorm === 'DONE' || statusNorm === 'COMPLETADO';
            const isLocalRevision = statusNorm === 'REVISION' || statusNorm === 'REVISIÓN';
            const isGhDone = ghItem.status === 'Done';
            const isGhRevision = ghItem.status === 'In review';
            
            if (isLocalModified) {
              // Local wins. Update GH if necessary
              if (isLocalDone && !isGhDone) {
                console.log(`📤 Pushing ${gapId} to Done on GitHub...`);
                execSync(`gh project item-edit --id ${ghItem.id} --project-id ${PROJECT_NODE_ID} --field-id ${STATUS_FIELD_ID} --single-select-option-id ${OPTION_DONE}`);
              } else if (isLocalRevision && !isGhRevision) {
                console.log(`📤 Pushing ${gapId} to In review on GitHub...`);
                execSync(`gh project item-edit --id ${ghItem.id} --project-id ${PROJECT_NODE_ID} --field-id ${STATUS_FIELD_ID} --single-select-option-id ${OPTION_REVISION}`);
              } else if (!isLocalDone && !isLocalRevision && isGhDone) {
                console.log(`📤 Pushing ${gapId} to Backlog on GitHub...`);
                execSync(`gh project item-edit --id ${ghItem.id} --project-id ${PROJECT_NODE_ID} --field-id ${STATUS_FIELD_ID} --single-select-option-id ${OPTION_BACKLOG}`);
              }
              
              // Sync Size
              const complexity = complexityIdx === -1 ? '' : parts[complexityIdx].trim();
              if (SIZE_OPTIONS[complexity]) {
                console.log(`📤 Pushing ${gapId} Size (${complexity}) to GitHub...`);
                execSync(`gh project item-edit --id ${ghItem.id} --project-id ${PROJECT_NODE_ID} --field-id ${SIZE_FIELD_ID} --single-select-option-id ${SIZE_OPTIONS[complexity]}`);
              }
            } else {
              // GH wins. Update Local if necessary
              if (isGhDone && !isLocalDone) {
                console.log(`📥 Pulling ${gapId} state from GitHub (Marking as Done/COMPLETADO)`);
                parts[statusIdx] = isSpanish ? '`COMPLETADO`' : '`DONE`';
                lines[i] = parts.join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |');
                fileModified = true;
                localStatus = isSpanish ? 'COMPLETADO' : 'DONE';
              } else if (isGhRevision && !isLocalRevision) {
                console.log(`📥 Pulling ${gapId} state from GitHub (Marking as REVISIÓN/REVISION)`);
                parts[statusIdx] = isSpanish ? '`REVISIÓN`' : '`REVISION`';
                lines[i] = parts.join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |');
                fileModified = true;
                localStatus = isSpanish ? 'REVISIÓN' : 'REVISION';
              } else if (!isGhDone && !isGhRevision && isLocalDone) {
                console.log(`📥 Pulling ${gapId} state from GitHub (Marking as PENDIENTE/PENDING)`);
                parts[statusIdx] = isSpanish ? '`PENDIENTE`' : '`PENDING`';
                lines[i] = parts.join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |');
                fileModified = true;
                localStatus = isSpanish ? 'PENDIENTE' : 'PENDING';
              }
            }
          }
          
          // Tally stats
          const bucket = classifyStatus(localStatus, filePath);
          stats[bucket]++;
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

if (isLocalModified) {
  for (const [gapId, ghItem] of ghMap.entries()) {
    if (!seenGaps.has(gapId)) {
      console.log(`🗑️ Deleting ${gapId} from GitHub Project...`);
      try {
        execSync(`gh project item-delete ${PROJECT_NUMBER} --owner ${OWNER} --id ${ghItem.id}`);
      } catch (e) {
        console.error(`⚠️ Failed to delete ${gapId}:`, e.message);
      }
    }
  }
}

if (unknownStatuses.size > 0) {
  console.log('\n⚠️ Estados no reconocidos (contados como pendientes):');
  for (const [key, count] of unknownStatuses) console.log(`     ${key}  ×${count}`);
  console.log('   Añádelos a classifyStatus() o corrige el tablero: mientras tanto los totales mienten.');
}

if (modEs || modEn) {
  console.log('\n❌ Sincronización realizada: Los archivos markdown locales fueron actualizados con el estado de GitHub.');
  console.log('   Por favor revisa los cambios (git diff), haz stage (git add) y reintenta tu commit/push.');
  process.exit(1); // Fail the hook so the user can commit the synced changes!
} else {
  console.log('\n✅ Todo está sincronizado.');
  process.exit(0);
}
