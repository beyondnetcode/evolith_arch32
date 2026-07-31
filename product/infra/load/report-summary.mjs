#!/usr/bin/env node
/**
 * Render a k6 `--summary-export` JSON as a Markdown report (GT-443, criterion 2:
 * "publishes throughput, p95 latency and error rate against declared
 * thresholds"). Written for the GitHub step summary, but it is plain stdout, so
 * it works locally too.
 *
 * The declared thresholds come from the SAME env vars k6/lib/config.js reads, so
 * the table can never disagree with what the run actually enforced.
 *
 * Usage:
 *   node report-summary.mjs --summary out.json --label "average load" --exit-code 0
 */

import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const summaryPath = arg('summary');
const label = arg('label', 'k6 run');
const exitCode = Number(arg('exit-code', '0'));

if (!summaryPath) {
  console.error('usage: report-summary.mjs --summary <k6-summary.json> [--label <name>] [--exit-code <n>]');
  process.exit(2);
}

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const m = summary.metrics ?? {};

// Declared thresholds — identical defaults to k6/lib/config.js `SLO`.
const slo = {
  evaluate_p95: Number(process.env.SLO_EVALUATE_P95 || 800),
  evaluate_p99: Number(process.env.SLO_EVALUATE_P99 || 1500),
  health_p95: Number(process.env.SLO_HEALTH_P95 || 150),
  health_p99: Number(process.env.SLO_HEALTH_P99 || 300),
  error_rate: Number(process.env.SLO_ERROR_RATE || 0.01),
};

const n = (v, digits = 2) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : 'n/a');
const pct = (v) => (typeof v === 'number' && Number.isFinite(v) ? `${(v * 100).toFixed(2)}%` : 'n/a');
const verdict = (value, ceiling) =>
  typeof value !== 'number' || !Number.isFinite(value) ? '—' : value <= ceiling ? 'PASS' : 'FAIL';

// Aggregate check pass-rate across every check in the run.
let checkPasses = 0;
let checkFails = 0;
for (const c of Object.values(summary.root_group?.checks ?? {})) {
  checkPasses += c.passes ?? 0;
  checkFails += c.fails ?? 0;
}
const checkTotal = checkPasses + checkFails;

const rows = [
  ['Throughput (HTTP requests/s)', n(m.http_reqs?.rate), '—', '—'],
  ['Throughput (iterations/s)', n(m.iterations?.rate), '—', '—'],
  ['Requests (total)', String(m.http_reqs?.count ?? 'n/a'), '—', '—'],
  [
    'evaluate p95 (ms)',
    n(m.evaluate_latency?.['p(95)']),
    `< ${slo.evaluate_p95}`,
    verdict(m.evaluate_latency?.['p(95)'], slo.evaluate_p95),
  ],
  [
    'evaluate p99 (ms)',
    n(m.evaluate_latency?.['p(99)']),
    `< ${slo.evaluate_p99}`,
    verdict(m.evaluate_latency?.['p(99)'], slo.evaluate_p99),
  ],
  [
    'health p95 (ms)',
    n(m.health_latency?.['p(95)']),
    `< ${slo.health_p95}`,
    verdict(m.health_latency?.['p(95)'], slo.health_p95),
  ],
  [
    'evaluate error rate',
    pct(m.evaluate_errors?.value),
    `< ${pct(slo.error_rate)}`,
    verdict(m.evaluate_errors?.value, slo.error_rate),
  ],
  [
    'HTTP failure rate',
    pct(m.http_req_failed?.value),
    `< ${pct(slo.error_rate)}`,
    verdict(m.http_req_failed?.value, slo.error_rate),
  ],
  [
    'checks passed',
    checkTotal ? `${checkPasses}/${checkTotal} (${((checkPasses / checkTotal) * 100).toFixed(2)}%)` : 'n/a',
    '> 99%',
    checkTotal ? (checkPasses / checkTotal > 0.99 ? 'PASS' : 'FAIL') : '—',
  ],
];

const out = [];
out.push(`### k6 — ${label}`);
out.push('');
out.push(`Run verdict (k6 exit code ${exitCode}): **${exitCode === 0 ? 'thresholds held' : 'THRESHOLD CROSSED'}**`);
out.push('');
out.push('| Metric | Measured | Declared threshold | Verdict |');
out.push('| --- | ---: | ---: | :---: |');
for (const [metric, measured, threshold, v] of rows) {
  out.push(`| ${metric} | ${measured} | ${threshold} | ${v} |`);
}
out.push('');
const where = process.env.GITHUB_ACTIONS
  ? `a GitHub-hosted runner (${process.env.RUNNER_OS ?? 'unknown OS'}, shared vCPU)`
  : 'the machine that ran it (not a runner)';
out.push(
  `> Measured on ${where} — not on the deployed target. Treat these as a regression signal ` +
    'for this workload; the production baseline is still open (see GT-448), so the same run ' +
    'elsewhere will produce different absolute numbers.',
);

console.log(out.join('\n'));
