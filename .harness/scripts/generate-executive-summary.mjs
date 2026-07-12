#!/usr/bin/env node
// Generates a concise governance radar from the canonical gap board and maturity
// reconciliation, so strategic review starts from current evidence instead of dense reports.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GAPS_DIR = path.join(ROOT, 'reference/core/control-center/gaps');
const MATURITY_DIR = path.join(ROOT, 'reference/core/control-center/maturity-reports');
const BOARD = path.join(GAPS_DIR, 'gap-tracking.md');
const ES_BOARD = path.join(GAPS_DIR, 'gap-tracking.es.md');
const MATURITY = path.join(MATURITY_DIR, 'maturity-reconciliation.json');
const EN_OUT = path.join(MATURITY_DIR, 'executive-summary.md');
const ES_OUT = path.join(MATURITY_DIR, 'executive-summary.es.md');

const OPEN_STATUSES = new Set(['OPEN', 'PENDING', 'IN-PROGRESS', 'DEFERRED']);
const CRITICALITY_WEIGHT = { P0: 100, P1: 40, P2: 15, P3: 5 };
const COMPLEXITY_WEIGHT = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function stripCell(value) {
  return value.replace(/\\\|/g, '|').replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function parseBoard(content) {
  const lastUpdated = content.match(/\*\*(?:Last Updated|Última Actualización):\*\* (\d{4}-\d{2}-\d{2})/)?.[1];
  const rows = [];

  for (const line of content.split('\n')) {
    if (!line.startsWith('| [`')) continue;
    const cells = line.slice(1, -1).split(/(?<!\\)\|/).map((cell) => cell.trim());
    if (cells.length < 7) continue;

    const id = cells[0].match(/(GT-\d+|MT-A\d+)/)?.[1];
    const title = stripCell(cells[1]);
    const component = stripCell(cells[2]);
    const phase = stripCell(cells[3]);
    const criticality = stripCell(cells[4]);
    const complexity = stripCell(cells[5]);
    const status = stripCell(cells[6]);

    if (!id || !criticality.startsWith('P')) continue;
    rows.push({ id, title, component, phase, criticality, complexity, status });
  }

  if (!lastUpdated || rows.length === 0) {
    throw new Error('Could not parse the canonical gap board.');
  }

  return { lastUpdated, rows };
}

function countBy(items, key) {
  const counts = new Map();
  for (const item of items) counts.set(item[key], (counts.get(item[key]) || 0) + 1);
  return counts;
}

function sortByPriority(a, b) {
  const criticality = (CRITICALITY_WEIGHT[b.criticality] || 0) - (CRITICALITY_WEIGHT[a.criticality] || 0);
  if (criticality !== 0) return criticality;
  const complexity = (COMPLEXITY_WEIGHT[a.complexity] || 99) - (COMPLEXITY_WEIGHT[b.complexity] || 99);
  if (complexity !== 0) return complexity;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

function canonicalStatus(status) {
  if (status === 'OPEN') return 'PENDING';
  return status;
}

function summarizeComponents(openGaps) {
  const byComponent = new Map();
  for (const gap of openGaps) {
    const current = byComponent.get(gap.component) || {
      component: gap.component,
      open: 0,
      p0: 0,
      p1: 0,
      score: 0,
      ids: [],
    };
    current.open += 1;
    if (gap.criticality === 'P0') current.p0 += 1;
    if (gap.criticality === 'P1') current.p1 += 1;
    current.score += CRITICALITY_WEIGHT[gap.criticality] || 0;
    current.ids.push(gap);
    byComponent.set(gap.component, current);
  }

  return [...byComponent.values()]
    .sort((a, b) => b.score - a.score || b.p0 - a.p0 || b.open - a.open || a.component.localeCompare(b.component));
}

function buildSummary(root = ROOT) {
  const board = parseBoard(read(path.join(root, 'reference/core/control-center/gaps/gap-tracking.md')));
  const esBoard = parseBoard(read(path.join(root, 'reference/core/control-center/gaps/gap-tracking.es.md')));
  const maturity = JSON.parse(read(path.join(root, 'reference/core/control-center/maturity-reports/maturity-reconciliation.json')) || '{}');
  const rows = board.rows.map((gap) => ({ ...gap, status: canonicalStatus(gap.status) }));
  const open = rows.filter((gap) => OPEN_STATUSES.has(gap.status)).sort(sortByPriority);
  const done = rows.filter((gap) => gap.status === 'DONE');
  const byCriticality = countBy(open, 'criticality');
  const components = summarizeComponents(open);
  const p0 = open.filter((gap) => gap.criticality === 'P0');
  const p1 = open.filter((gap) => gap.criticality === 'P1');
  const quickWins = open
    .filter((gap) => ['P0', 'P1'].includes(gap.criticality) && ['XS', 'S'].includes(gap.complexity))
    .slice(0, 8);
  const completionRate = board.rows.length === 0 ? 0 : Math.round((done.length / board.rows.length) * 1000) / 10;

  if (maturity.gaps) {
    const expected = {
      total: rows.length,
      done: done.length,
      pending: open.filter((gap) => gap.status === 'PENDING').length,
      inProgress: open.filter((gap) => gap.status === 'IN-PROGRESS').length,
      deferred: open.filter((gap) => gap.status === 'DEFERRED').length,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (maturity.gaps[key] !== value) {
        throw new Error(`Maturity reconciliation drift: gaps.${key}=${maturity.gaps[key]} but board=${value}`);
      }
    }
  }

  return {
    asOf: board.lastUpdated,
    total: rows.length,
    done: done.length,
    open,
    p0,
    p1,
    p2: open.filter((gap) => gap.criticality === 'P2'),
    byCriticality,
    components,
    biggest: components[0],
    quickWins,
    completionRate,
    maturity,
    esRows: new Map(esBoard.rows.map((row) => [row.id, row])),
  };
}

function linkFor(id, es) {
  const suffix = es ? '.es' : '';
  if (id.startsWith('GT-')) return `../gaps/gap-reference-catalog${suffix}.md#${id.toLowerCase()}`;
  return es
    ? './multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking'
    : './multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority';
}

function linkedId(gap, es) {
  return `[${gap.id}](${linkFor(gap.id, es)})`;
}

function linkedIds(gaps, es, limit = 6) {
  const selected = gaps.slice(0, limit).map((gap) => linkedId(gap, es)).join(', ');
  if (gaps.length <= limit) return selected || '-';
  return `${selected}, +${gaps.length - limit}`;
}

function readinessStatus(summary, es) {
  const checks = Array.isArray(summary.maturity.readiness) ? summary.maturity.readiness : [];
  if (checks.length === 0) return es ? 'sin evidencia de readiness registrada' : 'no readiness evidence recorded';
  const counts = countBy(checks, 'status');
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `${count} ${status}`)
    .join(', ');
}

function decision(summary, es) {
  if (summary.open.length === 0) {
    return es
      ? `GO completo: ${summary.done}/${summary.total} gaps cerrados, mantener vigilancia.`
      : `Full GO: ${summary.done}/${summary.total} gaps closed, keep monitoring.`;
  }
  if (summary.p0.length > 0) {
    return es
      ? 'NO-GO para expansión productiva o release mayor: existen bloqueadores P0 activos.'
      : 'NO-GO for production expansion or a major release: active P0 blockers remain.';
  }
  if (summary.p1.length > 0) {
    return es
      ? 'GO condicionado: avanzar solo con hardening P1 y evidencia automatizada.'
      : 'Conditional GO: proceed only with P1 hardening and automated evidence.';
  }
  return es
    ? 'GO operativo: mantener vigilancia y atacar deuda P2/P3 por costo de cambio.'
    : 'Operational GO: keep monitoring and attack P2/P3 debt by cost of change.';
}

function titleFor(summary, gap, es) {
  if (!es) return gap.title;
  return summary.esRows.get(gap.id)?.title || gap.title;
}

function renderBlockerTable(summary, es) {
  const rows = summary.p0.length > 0 ? summary.p0 : summary.open.slice(0, 7);
  const header = es
    ? '| ID | Ataque | Componente | Esfuerzo |\n|---|---|---|---|'
    : '| ID | Attack | Component | Effort |\n|---|---|---|---|';
  const body = rows.map((gap) => `| ${linkedId(gap, es)} | ${titleFor(summary, gap, es)} | \`${gap.component}\` | ${gap.criticality}/${gap.complexity} |`);
  return [header, ...body].join('\n');
}

function renderComponentTable(summary, es) {
  const header = es
    ? '| Área | Pendientes | P0 | P1 | Primeros IDs |\n|---|---:|---:|---:|---|'
    : '| Area | Open | P0 | P1 | First IDs |\n|---|---:|---:|---:|---|';
  const body = summary.components.slice(0, 5).map((component) => {
    const ids = linkedIds(component.ids.sort(sortByPriority), es, 4);
    return `| \`${component.component}\` | ${component.open} | ${component.p0} | ${component.p1} | ${ids} |`;
  });
  return [header, ...body].join('\n');
}

function render(summary, es) {
  const biggest = summary.biggest || { component: '-', open: 0, p0: 0, ids: [] };
  const hasOpen = summary.open.length > 0;
  const p0Ids = linkedIds(summary.p0, es, 10);
  const quickWinIds = linkedIds(summary.quickWins, es, 8);
  const nextIds = linkedIds(summary.p1, es, 8);
  const closureRecords = summary.maturity.evidence?.closureRecords ?? '-';
  const readiness = readinessStatus(summary, es);

  if (es) {
    const diag = hasOpen
      ? 'El sistema está cerca de una base gobernada, pero todavía no debe tratarse como listo para expansión productiva mientras existan P0 activos. La prioridad no es leer más documentación; es cerrar los bloqueadores que comprometen seguridad, reproducibilidad de CI, paridad de reglas y contratos ejecutables.'
      : 'El sistema tiene todos los gaps cerrados. La prioridad es mantener vigilancia, monitorear regresiones, y evitar que el tablero de gaps acumule nueva deuda técnica.';
    const biggestRisk = hasOpen
      ? `\`${biggest.component}\` concentra el mayor riesgo abierto ponderado (${biggest.open} pendientes, ${biggest.p0} P0). Ataca esa concentración antes de ampliar alcance.`
      : 'No hay riesgo abierto ponderado — todos los gaps están cerrados.';
    const attackRows = hasOpen
      ? `| 1 | Bloqueadores P0 | Impiden afirmar readiness productivo o release mayor. | ${p0Ids} |
| 2 | Área de mayor riesgo | \`${biggest.component}\` tiene la mayor carga ponderada abierta. | ${linkedIds(biggest.ids.sort(sortByPriority), true, 6)} |
| 3 | Ganancias rápidas | Alta criticidad con complejidad XS/S. | ${quickWinIds} |
| 4 | Ola P1 | Endurecimiento siguiente después de limpiar P0. | ${nextIds} |
| 5 | P2/P3 | Solo después de estabilizar seguridad, CI, reglas y contratos. | ${linkedIds(summary.p2, true, 6)} |`
      : `| 1 | Sin gaps abiertos | Todos los ${summary.done} gaps están cerrados. | - |`;
    const blockerHeader = hasOpen
      ? '## Bloqueadores Actuales\n\n'
      : '## Bloqueadores Actuales\n\nSin bloqueadores activos — todos los gaps están cerrados.\n\n';
    return `<!-- GENERATED FILE - DO NOT EDIT MANUALLY -->
<!-- Regenerated by .harness/scripts/generate-executive-summary.mjs -->

# Resumen Ejecutivo de Gobernanza

> **Navegación Bilingüe:** [English Version](./executive-summary.md)

Instantánea estratégica generada desde el tablero canónico de gaps y la reconciliación de madurez. Léelo antes de abrir los reportes densos.

## Señal Ejecutiva

**Decisión actual:** ${decision(summary, true)}

**Mayor problema ahora:** ${biggestRisk}

**Dónde atacar primero:** ${p0Ids}.

## Diagnóstico Estratégico

${diag}

La forma correcta de usar este resumen es simple: si necesitas contexto, abre solo el ID enlazado; si necesitas decidir trabajo, sigue el orden de ataque de esta página.

## Orden de Ataque

| Orden | Foco | Motivo | IDs |
|---:|---|---|---|
${attackRows}

${blockerHeader}${renderBlockerTable(summary, true)}

## Métricas

| Indicador | Valor |
|---|---:|
| Fecha canónica del tablero | ${summary.asOf} |
| Gaps totales | ${summary.total} |
| Gaps cerrados | ${summary.done} |
| Gaps pendientes | ${summary.open.length} |
| P0 abiertos | ${summary.p0.length} |
| P1 abiertos | ${summary.p1.length} |
| P2 abiertos | ${summary.p2.length} |
| Cierre total | ${summary.completionRate}% |
| Registros de evidencia de cierre | ${closureRecords} |
| Readiness registrado | ${readiness} |

${renderComponentTable(summary, true)}

## Fuente y Regla de Actualización

Este resumen se genera desde [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) y [Reconciliación de Madurez](./maturity-reconciliation.json). No editar a mano.

El hook pre-commit regenera y agrega al commit \`executive-summary.md\` y \`executive-summary.es.md\`. El hook pre-push vuelve a generar y bloquea el push si el resumen cambia, para que la mejora estratégica viaje dentro del commit correcto.

---
[Volver al Hub de Visión](../README.md)
`;
  }

  return `<!-- GENERATED FILE - DO NOT EDIT MANUALLY -->
<!-- Regenerated by .harness/scripts/generate-executive-summary.mjs -->

# Executive Governance Summary

> **Bilingual Navigation:** [Versión en Español](./executive-summary.es.md)

Strategic snapshot generated from the canonical gap board and maturity reconciliation. Read this before opening the dense reports.

## Executive Signal

**Current decision:** ${decision(summary, false)}

**Biggest problem now:** ${hasOpen
  ? `\`${biggest.component}\` carries the highest weighted open risk (${biggest.open} open, ${biggest.p0} P0). Attack that concentration before expanding scope.`
  : 'No weighted open risk — all gaps are closed.'}

**Where to attack first:** ${p0Ids}.

## Strategic Diagnosis

${hasOpen
  ? 'The system is close to a governed baseline, but it should not be treated as ready for production expansion while active P0 items remain. The priority is not to read more documentation; it is to close the blockers that compromise security, CI reproducibility, rule parity, and executable contracts.'
  : 'The system has all gaps closed. The priority is to keep monitoring, watch for regressions, and prevent new technical debt from accumulating on the gap board.'}

Use this summary with a simple rule: if you need context, open only the linked ID; if you need to choose work, follow this page's attack order.

## Attack Order

| Order | Focus | Reason | IDs |
|---:|---|---|---|
${hasOpen
  ? `| 1 | P0 blockers | They prevent production-readiness or major-release confidence. | ${p0Ids} |
| 2 | Highest-risk area | \`${biggest.component}\` has the largest weighted open load. | ${linkedIds(biggest.ids.sort(sortByPriority), false, 6)} |
| 3 | Quick wins | High criticality with XS/S complexity. | ${quickWinIds} |
| 4 | P1 wave | Next hardening after P0 is cleared. | ${nextIds} |
| 5 | P2/P3 | Only after security, CI, rules, and contracts stabilize. | ${linkedIds(summary.p2, false, 6)} |`
  : `| 1 | No open gaps | All ${summary.done} gaps are closed. | - |`}

## Current Blockers

${hasOpen
  ? ''
  : 'No active blockers — all gaps are closed.\n\n'}${renderBlockerTable(summary, false)}

## Metrics

| Indicator | Value |
|---|---:|
| Canonical board date | ${summary.asOf} |
| Total gaps | ${summary.total} |
| Closed gaps | ${summary.done} |
| Open gaps | ${summary.open.length} |
| Open P0 | ${summary.p0.length} |
| Open P1 | ${summary.p1.length} |
| Open P2 | ${summary.p2.length} |
| Total closure | ${summary.completionRate}% |
| Closure evidence records | ${closureRecords} |
| Recorded readiness | ${readiness} |

${renderComponentTable(summary, false)}

## Source and Refresh Rule

This summary is generated from the [Gap Tracking Board](../gaps/gap-tracking.md) and [Maturity Reconciliation](./maturity-reconciliation.json). Do not edit it by hand.

The pre-commit hook regenerates and stages \`executive-summary.md\` and \`executive-summary.es.md\`. The pre-push hook regenerates the same files and blocks the push if they changed, so the strategic improvement travels in the correct commit.

---
[Back to Vision Hub](../README.md)
`;
}

function writeIfNeeded(file, content) {
  if (read(file) === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

function run() {
  const summary = buildSummary();
  const en = render(summary, false);
  const es = render(summary, true);
  const check = process.argv.includes('--check');

  if (check) {
    const stale = read(EN_OUT) !== en || read(ES_OUT) !== es;
    if (stale) {
      console.error('Executive governance summary is stale. Run: node .harness/scripts/generate-executive-summary.mjs');
      process.exit(1);
    }
    console.log('Executive governance summary matches the canonical gap and maturity evidence.');
    return;
  }

  const changed = [writeIfNeeded(EN_OUT, en), writeIfNeeded(ES_OUT, es)].some(Boolean);
  const top = summary.biggest?.component || 'none';
  const action = changed ? 'Generated' : 'Already current';
  console.log(`${action} executive governance summary: ${summary.p0.length} P0, ${summary.open.length} open, top risk ${top}.`);
}

run();
