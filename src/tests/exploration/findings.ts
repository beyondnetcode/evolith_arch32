import * as fs from 'node:fs';
import * as path from 'node:path';
import { Finding, CoverageReport } from './types';
import { REPO_ROOT } from './catalog';

// -------------------------------------------------------------------------
// Reporter — persists findings + a coverage summary to an output directory.
// -------------------------------------------------------------------------

export function writeReport(
  outDir: string,
  findings: Finding[],
  coverage: CoverageReport,
): void {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'findings.jsonl'),
    findings.map((f) => JSON.stringify(f)).join('\n') + (findings.length ? '\n' : ''),
  );
  fs.writeFileSync(path.join(outDir, 'coverage.json'), JSON.stringify(coverage, null, 2));
}

// -------------------------------------------------------------------------
// Gap emitter — turns a Finding into a board-conformant GT-NNN entry.
//
// SAFETY: by default this is DRY-RUN — it computes the next GT id and renders
// the exact EN/ES table rows + catalog sections into `proposed-gaps.md`, but does
// NOT touch the single-source-of-truth board. Writing to the board is a
// human-reviewed step (and, per the "single gap driver" rule, must not run
// concurrently with another gap orchestrator). Only CONFIRMED findings are
// eligible; hypotheses are excluded.
// -------------------------------------------------------------------------

const BOARD_EN = path.join(REPO_ROOT, 'reference/core/control-center/gaps/gap-tracking.md');

export function nextGtId(): string {
  const text = fs.readFileSync(BOARD_EN, 'utf8');
  const ids = [...text.matchAll(/GT-(\d+)/g)].map((m) => Number(m[1]));
  const max = ids.length ? Math.max(...ids) : 0;
  return `GT-${max + 1}`;
}

const SEVERITY_TO_CRITICALITY: Record<string, string> = {
  P0: 'P0', P1: 'P1', P2: 'P2', P3: 'P3', P4: 'P3',
};

function componentFor(f: Finding): string {
  if (f.surfaces.includes('cli') && f.surfaces.length === 1) return 'Smart CLI';
  if (f.surfaces.includes('mcp') && f.surfaces.length === 1) return 'MCP Server';
  if (f.surfaces.includes('rest') && f.surfaces.length === 1) return 'Core API';
  return 'Cross';
}

export interface ProposedGap {
  gtId: string;
  enRow: string;
  esRow: string;
  enSection: string;
  esSection: string;
}

/** Render a confirmed finding as a board-conformant proposed GT entry. */
export function proposeGap(f: Finding, gtId: string): ProposedGap {
  const component = componentFor(f);
  const crit = SEVERITY_TO_CRITICALITY[f.severity] ?? 'P3';
  const idLc = gtId.toLowerCase();
  const desc = `**${f.title}.** ${f.detail} (Auto-detected by the exploratory test agent on operation \`${f.operationId}\`.)`;

  const enRow = `| [\`${gtId}\`](./gap-reference-catalog.md#${idLc}) | ${desc} | \`${component}\` | Cross | ${crit} | S | \`PENDING\` |`;
  const esRow = `| [\`${gtId}\`](./gap-reference-catalog.es.md#${idLc}) | ${desc} | \`${component}\` | Cross | ${crit} | S | \`PENDIENTE\` |`;

  const enSection = [
    `#### ${gtId}`,
    ``,
    `**Title:** ${f.title}`,
    ``,
    `**Problem:** ${f.detail}`,
    ``,
    `**Evidence:** Operation \`${f.operationId}\`, surfaces [${f.surfaces.join(', ')}]. ${JSON.stringify(f.evidence)}`,
    ``,
    `**Proposed fix:** Reconcile the divergent surface(s) so the operation behaves identically across CLI/MCP/REST (or record an explicit \`exempt\` in surface-parity-matrix.json).`,
    ``,
    `**Closure:**`,
    `- [ ] surfaces agree for \`${f.operationId}\` (or exemption justified)`,
    `- [ ] regression covered by the exploration suite`,
    ``,
    `**References:** src/tests/exploration; reference/core/control-center/audits/surface-parity-matrix.json`,
    ``,
  ].join('\n');

  const esSection = enSection
    .replace('**Title:**', '**Título:**')
    .replace('**Problem:**', '**Problema:**')
    .replace('**Evidence:**', '**Evidencia:**')
    .replace('**Proposed fix:**', '**Fix propuesto:**')
    .replace('**Closure:**', '**Cierre:**')
    .replace('**References:**', '**Referencias:**');

  return { gtId, enRow, esRow, enSection, esSection };
}

/** DRY-RUN: render all confirmed findings as proposed GT entries into a file. */
export function writeProposedGaps(outDir: string, findings: Finding[]): ProposedGap[] {
  const confirmed = findings.filter((f) => f.confidence === 'confirmed');
  const proposals: ProposedGap[] = [];
  let base = Number(nextGtId().slice(3));
  for (const f of confirmed) {
    proposals.push(proposeGap(f, `GT-${base}`));
    base += 1;
  }
  fs.mkdirSync(outDir, { recursive: true });
  const md = [
    `# Proposed gaps (DRY-RUN) — exploratory test agent`,
    ``,
    `> ${proposals.length} confirmed finding(s) rendered as board-conformant GT entries.`,
    `> Review, then register into gap-tracking.md/.es.md + gap-reference-catalog.md/.es.md.`,
    `> This file does NOT modify the board.`,
    ``,
    ...proposals.flatMap((p) => [
      `## ${p.gtId}`,
      ``,
      '```text',
      `EN row: ${p.enRow}`,
      `ES row: ${p.esRow}`,
      '```',
      ``,
      p.enSection,
      `---`,
      ``,
    ]),
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'proposed-gaps.md'), md);
  return proposals;
}
