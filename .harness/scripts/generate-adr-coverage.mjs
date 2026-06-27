#!/usr/bin/env node
/** Generate bilingual ADR coverage index (ADR_COVERAGE.md / ADR_COVERAGE.es.md). Idempotent. */
import { writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { generate, buildRuleset, REPO_ROOT } from './generate-adr-rulesets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HANDCRAFTED_DIR = join(REPO_ROOT, 'rulesets', 'adr');

// Map handcrafted track-id key -> relative ruleset path.
function handcraftedPaths() {
  const map = new Map();
  for (const name of readdirSync(HANDCRAFTED_DIR)) {
    if (!name.endsWith('.rules.json')) continue;
    const json = JSON.parse(readFileSync(join(HANDCRAFTED_DIR, name), 'utf8'));
    const primary = (json.references || [])[0] || '';
    const m = primary.match(/adrs\/([^/]+)\/(\d{4})-/);
    if (m) map.set(`${m[1]}-${m[2]}`, `rulesets/adr/${name}`);
  }
  return map;
}

const { adrs, covered, totals } = generate();
const hcPaths = handcraftedPaths();

const rows = adrs.map((adr) => {
  const isHc = covered.has(adr.key) || covered.has(`*-${adr.id}`);
  if (isHc) {
    return {
      adrId: adr.adrId, track: adr.track, title: adr.title, status: adr.status,
      enforcement: 'handcrafted',
      path: hcPaths.get(adr.key) || 'rulesets/adr/ (handcrafted)',
    };
  }
  const built = buildRuleset(adr);
  return {
    adrId: adr.adrId, track: adr.track, title: adr.title, status: adr.status,
    enforcement: built.enforcement,
    path: `rulesets/adr/generated/${built.fileName}`,
  };
});

rows.sort((a, b) => (a.track + a.adrId).localeCompare(b.track + b.adrId));

const total = totals.total;
const handcrafted = totals.handcrafted;
const executable = totals.executable;
const advisory = totals.advisory;
const coveragePct = ((handcrafted + executable + advisory) / total * 100).toFixed(1);

// Flatten embedded Markdown links ([text](url)) to plain text so relative
// links from ADR source bodies (e.g. Status referencing another ADR) do not
// leak into this index as broken links, then escape table pipes.
function stripLinks(s) { return String(s).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); }
function esc(s) { return stripLinks(String(s)).replace(/\|/g, '\\|'); }

function buildDoc(lang) {
  const t = lang === 'es'
    ? {
        title: '# Cobertura ADR → Ruleset',
        intro: 'Índice generado automáticamente que mapea cada ADR a su ruleset ejecutable o advisory. **No editar a mano** — regenerar con `node .harness/scripts/generate-adr-coverage.mjs`.',
        totalsHdr: '## Totales',
        total: 'ADRs totales', hc: 'Artesanales (handcrafted)', ex: 'Generados ejecutables (executable)',
        ad: 'Generados advisory', cov: 'Cobertura',
        legend: '**Enforcement**: `handcrafted` = ruleset artesanal; `executable` = reglas verificables por máquina (lint/CI/análisis estático); `advisory` = decisión de diseño, requiere atestación manual.',
        cols: ['ADR ID', 'Track', 'Título', 'Status', 'Enforcement', 'Ruleset'],
      }
    : {
        title: '# ADR → Ruleset Coverage',
        intro: 'Auto-generated index mapping every ADR to its executable or advisory ruleset. **Do not edit by hand** — regenerate with `node .harness/scripts/generate-adr-coverage.mjs`.',
        totalsHdr: '## Totals',
        total: 'Total ADRs', hc: 'Handcrafted', ex: 'Generated executable',
        ad: 'Generated advisory', cov: 'Coverage',
        legend: '**Enforcement**: `handcrafted` = artisanal ruleset; `executable` = machine-verifiable rules (lint/CI/static analysis); `advisory` = design decision, manual attestation required.',
        cols: ['ADR ID', 'Track', 'Title', 'Status', 'Enforcement', 'Ruleset'],
      };

  const lines = [];
  lines.push(t.title, '', t.intro, '', t.totalsHdr, '');
  lines.push(`| | |`, `|---|---|`);
  lines.push(`| ${t.total} | ${total} |`);
  lines.push(`| ${t.hc} | ${handcrafted} |`);
  lines.push(`| ${t.ex} | ${executable} |`);
  lines.push(`| ${t.ad} | ${advisory} |`);
  lines.push(`| ${t.cov} | **${coveragePct}%** |`);
  lines.push('', t.legend, '');
  lines.push(`| ${t.cols.join(' | ')} |`);
  lines.push(`|${t.cols.map(() => '---').join('|')}|`);
  for (const r of rows) {
    lines.push(`| ${esc(r.adrId)} | ${esc(r.track)} | ${esc(r.title)} | ${esc(r.status)} | ${esc(r.enforcement)} | \`${esc(r.path)}\` |`);
  }
  lines.push('');
  return lines.join('\n');
}

const check = process.argv.includes('--check');
let drift = 0;
for (const [lang, fname] of [['en', 'ADR_COVERAGE.md'], ['es', 'ADR_COVERAGE.es.md']]) {
  const out = join(HANDCRAFTED_DIR, fname);
  const content = buildDoc(lang);
  if (check) {
    if (!existsSync(out) || readFileSync(out, 'utf8') !== content) {
      console.error(`[drift] ${fname}`); drift++;
    }
  } else {
    writeFileSync(out, content);
    console.log(`wrote rulesets/adr/${fname}`);
  }
}
if (check && drift) process.exit(1);
if (check) console.log('[OK] coverage docs up to date');
