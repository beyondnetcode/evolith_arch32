#!/usr/bin/env node

/**
 * The E2E scenario board — DERIVED, never hand-written.
 *
 * ## What it is for
 *
 * One page answering "what do the end-to-end suites actually exercise, and what
 * did they observe" — across the Core's three surfaces and the Tracker's robots,
 * which today report into two places and are never read together.
 *
 * ## What it is NOT
 *
 * It is not a second backlog, and the distinction is load-bearing. This
 * repository has ONE tracking surface — `gap-tracking.md` — and a defect's
 * status lives there and nowhere else. This board owns:
 *
 *     which scenarios exist · which were exercised · what was observed
 *
 * and the board owns:
 *
 *     what is broken · who fixes it · is it done
 *
 * The link is one-way: this page CITES `GT-NNN`; it never becomes the place a
 * defect's status is read from. Two pages claiming truth about one defect drift,
 * and the drift is always discovered late — which is the failure `gap-tracking`
 * spends its time catching.
 *
 * ## Why derived rather than written
 *
 * A hand-maintained matrix is stale the first time a suite changes and nobody
 * remembers this file. Both inputs already emit machine-readable evidence, so
 * the page is a rendering of a measurement rather than a claim about one. Same
 * reasoning as the interface how-to, which is generated from live capture.
 *
 * ## Its inputs are EPHEMERAL, and the page says so
 *
 * Both evidence files are gitignored and exist only after a local run. This
 * generator therefore is NOT wired into the derived-artifact chain (guard 46):
 * a fresh CI checkout has no inputs, and a chain link that cannot be satisfied
 * is a gate nobody can pass. Instead every section states WHEN it was measured
 * and from which run, and a missing input renders as "not run" — never as an
 * empty table that reads like a clean result.
 *
 * USAGE
 *   node .harness/scripts/generate-e2e-scenario-board.mjs
 *   node .harness/scripts/generate-e2e-scenario-board.mjs --check
 *
 * EXIT CODES
 *   0  the board was written (or, with --check, is current)
 *   1  --check and the board is stale
 */

import fs from 'node:fs';
import path from 'node:path';

import { findRepoRoot } from './lib/paths.mjs';

const ROOT = findRepoRoot();
const OUT_EN = 'reference/core/control-center/testing/e2e-scenario-board.md';
const OUT_ES = 'reference/core/control-center/testing/e2e-scenario-board.es.md';

/** The Core's cross-surface exploratory tester (CLI/MCP/REST). */
const CORE_OUT = path.join(ROOT, 'src/tests/exploration/.out');

/**
 * The Tracker's RoboSoft evidence. Cross-repo and therefore OPTIONAL by
 * construction: this repository must generate its own page without a sibling
 * checkout present. Absence renders as "not run", which is a different statement
 * from "nothing failed" and must never be confused with it.
 */
const TRACKER_EVIDENCE = process.env.EVOLITH_TRACKER_ROOT
  ? path.join(process.env.EVOLITH_TRACKER_ROOT, 'robosoft/.evidence')
  : path.resolve(ROOT, '../evolith_tracker/robosoft/.evidence');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * When the file was written, ISO, or null.
 *
 * The Core's `coverage.json` carries no timestamp of its own, and the first
 * version of this page therefore rendered it with no indication of age. That is
 * not cosmetic: on 2026-08-03 it published 12 "cross-surface divergences" from a
 * capture made hours earlier by a run whose MCP OPA engine had crashed for want
 * of `--experimental-vm-modules`, so every `tools/call` fail-closed with
 * FORBIDDEN. Re-run correctly, the same suite reports ZERO. The page was
 * faithful to its input and the input was junk, which is exactly the failure a
 * derived artifact is supposed to make impossible.
 *
 * Age is now stated. A reader can see at a glance that the measurement predates
 * the tree it claims to describe.
 */
function mtimeIso(p) {
  try {
    return fs.statSync(p).mtime.toISOString();
  } catch {
    return null;
  }
}

function readJsonl(p) {
  try {
    return fs
      .readFileSync(p, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch {
    return null;
  }
}

/** The newest RoboSoft run, or null. Newest by FILENAME: the runner stamps an
 *  ISO timestamp into it, so lexicographic order is chronological order. */
function latestRoboSoftRun() {
  try {
    const files = fs
      .readdirSync(TRACKER_EVIDENCE)
      .filter((f) => f.endsWith('.json'))
      .sort();
    if (files.length === 0) return null;
    const file = files[files.length - 1];
    const data = readJson(path.join(TRACKER_EVIDENCE, file));
    return data ? { file, data } : null;
  } catch {
    return null;
  }
}

const T = {
  en: {
    title: 'E2E Scenario Board',
    lead:
      'What the end-to-end suites exercise, and what they observed. **Generated — do not edit by hand.**',
    notBoard:
      'This page is NOT a backlog. A defect\'s status lives in [`gap-tracking.md`](../gaps/gap-tracking.md) and nowhere else; this page cites `GT-NNN` and never owns one. It answers *which scenarios exist, which ran, what was seen*.',
    regen: 'Regenerate with',
    coreH: 'Core — cross-surface exploration (CLI · MCP · REST)',
    trackerH: 'Tracker — RoboSoft robots against a live cluster',
    notRun: 'NOT RUN in this working tree.',
    notRunWhy:
      'The evidence file is gitignored and exists only after a local run. This is **not** a statement that nothing failed — it is the absence of a measurement.',
    howTo: 'Produce it with',
    scen: 'Scenario',
    verdict: 'Verdict',
    checks: 'Checks',
    metric: 'Measure',
    value: 'Value',
    findingsH: 'Observations',
    none: 'No observations in the recorded run.',
    sev: 'Severity',
    type: 'Type',
    op: 'Operation',
    surfaces: 'Surfaces',
    obs: 'Observation',
    uncovered: 'Declared on all three surfaces but NOT exercised',
    uncoveredWhy:
      'These carry a binding on every surface and no invocation reached them. They are the honest edge of this run, listed rather than rounded away.',
    measuredAt: 'Measured',
    fromRun: 'from run',
    howGen: 'Produced by',
  },
  es: {
    title: 'Cuadro de escenarios E2E',
    lead:
      'Qué ejercitan las suites de extremo a extremo, y qué observaron. **Generado — no editar a mano.**',
    notBoard:
      'Esta página NO es un backlog. El estado de un defecto vive en [`gap-tracking.es.md`](../gaps/gap-tracking.es.md) y en ningún otro sitio; esta página cita `GT-NNN` y nunca es dueña de uno. Responde a *qué escenarios existen, cuáles corrieron y qué se vio*.',
    regen: 'Regenerar con',
    coreH: 'Core — exploración cross-superficie (CLI · MCP · REST)',
    trackerH: 'Tracker — robots RoboSoft contra un clúster vivo',
    notRun: 'NO EJECUTADO en este árbol de trabajo.',
    notRunWhy:
      'El fichero de evidencia está en gitignore y solo existe tras una corrida local. Esto **no** afirma que nada falló: es la ausencia de una medición.',
    howTo: 'Se produce con',
    scen: 'Escenario',
    verdict: 'Veredicto',
    checks: 'Comprobaciones',
    metric: 'Medida',
    value: 'Valor',
    findingsH: 'Observaciones',
    none: 'Sin observaciones en la corrida registrada.',
    sev: 'Severidad',
    type: 'Tipo',
    op: 'Operación',
    surfaces: 'Superficies',
    obs: 'Observación',
    uncovered: 'Declaradas en las tres superficies pero NO ejercitadas',
    uncoveredWhy:
      'Tienen binding en cada superficie y ninguna invocación llegó a ellas. Son el borde honesto de esta corrida: se listan en vez de redondearse.',
    measuredAt: 'Medido',
    fromRun: 'de la corrida',
    howGen: 'Producido por',
  },
};

function render(lang, { coverage, findings, coverageAt, robo }) {
  const t = T[lang];
  const L = [];
  const other = lang === 'en' ? './e2e-scenario-board.es.md' : './e2e-scenario-board.md';
  const otherLabel = lang === 'en' ? 'Versión en Español' : 'English version';

  L.push(`# ${t.title}`);
  L.push('');
  L.push(`> **Bilingual Navigation:** [${otherLabel}](${other})`);
  L.push('');
  L.push(t.lead);
  L.push('');
  L.push(`> ${t.notBoard}`);
  L.push('');
  L.push(`${t.regen}: \`node .harness/scripts/generate-e2e-scenario-board.mjs\``);
  L.push('');

  // ── Core ────────────────────────────────────────────────────────────────
  L.push(`## ${t.coreH}`);
  L.push('');
  if (!coverage) {
    L.push(`**${t.notRun}** ${t.notRunWhy}`);
    L.push('');
    L.push(`${t.howTo}: \`npm run test:exploration\``);
  } else {
    L.push(`${t.measuredAt} \`${coverageAt ?? '?'}\`. ${t.howGen}: \`npm run test:exploration\`.`);
    L.push('');
    L.push(`| ${t.metric} | ${t.value} |`);
    L.push('|---|---|');
    L.push(`| Operations declared | ${coverage.totalOperations} |`);
    L.push(
      `| Exposed per surface | CLI ${coverage.exposed.cli} · MCP ${coverage.exposed.mcp} · REST ${coverage.exposed.rest} |`,
    );
    L.push(`| Declared on all three | ${coverage.fullTriangle} |`);
    L.push(`| With a binding | ${coverage.boundOperations} |`);
    L.push(`| Actually executed | ${coverage.executedOperations} |`);
    L.push(`| Surface invocations | ${coverage.executedSurfaceInvocations} |`);
    if (coverage.noEffect) {
      L.push(
        `| No-effect contracts | ${coverage.noEffect.checked}/${coverage.noEffect.contracts} checked · ${coverage.noEffect.contrastVerified} contrast-verified |`,
      );
    }
    L.push('');

    const uncovered = coverage.uncoveredTriangleOps || [];
    if (uncovered.length) {
      L.push(`### ${t.uncovered}`);
      L.push('');
      L.push(t.uncoveredWhy);
      L.push('');
      for (const op of uncovered) L.push(`- \`${op}\``);
      L.push('');
    }

    L.push(`### ${t.findingsH}`);
    L.push('');
    if (!findings || findings.length === 0) {
      L.push(t.none);
    } else {
      L.push(`| ${t.sev} | ${t.type} | ${t.op} | ${t.surfaces} | ${t.obs} |`);
      L.push('|---|---|---|---|---|');
      const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
      for (const f of [...findings].sort(
        (a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9),
      )) {
        const surfaces = (f.surfaces || []).join(' · ');
        const title = String(f.title || '').replace(/\|/g, '\\|');
        L.push(`| ${f.severity} | ${f.type} | \`${f.operationId}\` | ${surfaces} | ${title} |`);
      }
    }
    L.push('');
  }

  // ── Tracker ─────────────────────────────────────────────────────────────
  L.push(`## ${t.trackerH}`);
  L.push('');
  if (!robo) {
    L.push(`**${t.notRun}** ${t.notRunWhy}`);
    L.push('');
    L.push(
      `${t.howTo}: \`bash product/infra/helm/local-test.sh robosoft\` (in \`evolith_tracker\`)`,
    );
  } else {
    const d = robo.data;
    const totals = d.totals || {};
    L.push(
      `**${t.verdict}: \`${d.verdict ?? '?'}\`** — ${t.measuredAt} \`${d.startedAt ?? '?'}\`, ${t.fromRun} \`${robo.file}\`.`,
    );
    L.push('');
    L.push(
      `${totals.passed ?? '?'} passed · ${totals.failed ?? '?'} failed · ${totals.soft ?? 0} soft · ${totals.crashed ?? 0} crashed`,
    );
    L.push('');
    L.push(`| ${t.scen} | ${t.verdict} | ${t.checks} |`);
    L.push('|---|---|---|');
    // Two readings of this file were wrong before this one, which is why the
    // reconciliation below exists rather than trust:
    //
    //   1. `c.ok` — a field RoboSoft does not emit. `undefined !== false` is
    //      true, so every check counted as a pass.
    //   2. treating every `soft` check as its own bucket — but the runner counts
    //      a soft check that PASSED under `passed`, and reserves `soft` for one
    //      that FAILED and was downgraded to non-blocking.
    //
    // Measured: 226 pass+hard, 3 pass+soft, 1 fail+soft, 0 fail+hard → the
    // runner's 229 passed / 0 failed / 1 soft. So: passed = `pass === true`;
    // soft = failed-but-non-blocking; failed = blocking.
    for (const r of d.robots || []) {
      const checks = r.checks || [];
      const ok = checks.filter((c) => c.pass === true).length;
      const soft = checks.filter((c) => c.pass === false && c.soft).length;
      const bad = checks.filter((c) => c.pass === false && !c.soft).length;
      const softCol = soft ? ` · ${soft} soft` : '';
      L.push(`| \`${r.name}\` | ${r.verdict} | ${ok} ok · ${bad} failed${softCol} |`);
    }
    // Reconciliation, printed rather than trusted: if the per-robot sums do not
    // add up to what the runner recorded, say so on the page instead of letting
    // a quietly wrong table look authoritative.
    const sum = (d.robots || []).reduce(
      (a, r) => {
        const c = r.checks || [];
        a.ok += c.filter((x) => x.pass === true).length;
        a.bad += c.filter((x) => x.pass === false && !x.soft).length;
        a.soft += c.filter((x) => x.pass === false && x.soft).length;
        return a;
      },
      { ok: 0, bad: 0, soft: 0 },
    );
    if (
      sum.ok !== (totals.passed ?? sum.ok) ||
      sum.bad !== (totals.failed ?? sum.bad) ||
      sum.soft !== (totals.soft ?? sum.soft)
    ) {
      L.push('');
      L.push(
        `> **Reconciliation mismatch** — per-robot sums (${sum.ok}/${sum.bad}/${sum.soft}) do not match the run's recorded totals (${totals.passed}/${totals.failed}/${totals.soft}). Trust the run, not this table, and fix the generator.`,
      );
    }
    L.push('');
  }

  return L.join('\n') + '\n';
}

function main(argv = process.argv.slice(2)) {
  const check = argv.includes('--check');

  const coverage = readJson(path.join(CORE_OUT, 'coverage.json'));
  const findings = readJsonl(path.join(CORE_OUT, 'findings.jsonl'));
  const coverageAt = mtimeIso(path.join(CORE_OUT, 'coverage.json'));
  const robo = latestRoboSoftRun();

  const outputs = [
    [OUT_EN, render('en', { coverage, findings, coverageAt, robo })],
    [OUT_ES, render('es', { coverage, findings, coverageAt, robo })],
  ];

  let stale = false;
  for (const [rel, body] of outputs) {
    const abs = path.join(ROOT, rel);
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    if (current === body) continue;
    stale = true;
    if (!check) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, body);
    }
  }

  const sources = [
    coverage ? 'core exploration' : 'core exploration (NOT RUN)',
    robo ? `robosoft ${robo.file}` : 'robosoft (NOT RUN)',
  ];
  console.log(`E2E scenario board — sources: ${sources.join(', ')}`);

  if (check && stale) {
    console.error('✗ e2e scenario board is stale. Run: node .harness/scripts/generate-e2e-scenario-board.mjs');
    process.exit(1);
  }
  console.log(check ? '✓ current' : `✓ written: ${OUT_EN} + ${OUT_ES}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
