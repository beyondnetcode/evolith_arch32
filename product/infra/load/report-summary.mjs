#!/usr/bin/env node
/**
 * Render a k6 `--summary-export` JSON as a Markdown report (GT-443, criterion 2:
 * "publishes throughput, p95 latency and error rate against declared
 * thresholds"). Written for the GitHub step summary, but it is plain stdout, so
 * it works locally too.
 *
 * The thresholds in the report are READ BACK OUT OF THE RUN, not re-declared
 * here, so the table cannot disagree with what the run actually enforced. It
 * used to re-derive them from the same env vars k6/lib/config.js reads, which
 * held only while every profile enforced the same statistic. They do not:
 * smoke.js asserts `med` (n=10 — see the rationale there) while average-load.js
 * asserts `p(95)`/`p(99)`. A hard-coded "health p95 < 150" row would report FAIL
 * on a smoke run that passed.
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

// A profile that never ran has no summary to render, and that is a NORMAL
// outcome: this job gates on the smoke profile before the average-load profile
// runs, so a smoke failure legitimately leaves k6-average.json absent. Crashing
// on it turned one threshold miss into two red steps, and the ENOENT displaced
// the smoke result that actually explained the failure. Say what happened and
// exit 0 — a run's verdict is carried by the dedicated "Fail if ... crossed a
// threshold" steps, never by this reporter.
let summary;
try {
  summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
} catch (err) {
  const why =
    err.code === 'ENOENT'
      ? 'the profile did not run (an earlier gate in this job failed), or k6 exited before writing a summary'
      : `the summary could not be read: ${err.message}`;
  console.log(`### k6 — ${label}`);
  console.log('');
  console.log(`Run verdict: **did not run** — no summary at \`${summaryPath}\`, because ${why}.`);
  process.exit(0);
}

const m = summary.metrics ?? {};

const n = (v, digits = 2) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : 'n/a');
const pct = (v) => (typeof v === 'number' && Number.isFinite(v) ? `${(v * 100).toFixed(2)}%` : 'n/a');

// ─── Thresholds, exactly as the run enforced them ────────────────────────────
// k6 records each threshold under the metric it guards, keyed by the threshold
// EXPRESSION: metrics.health_latency.thresholds["med<150"]. The boolean is
// `lastFailed`, so it is INVERTED relative to the obvious reading — true means
// the threshold was CROSSED. Verified against k6 v2.0.0 on a run carrying one
// of each: console `✗ 'p(95)<150'` serialised to true, `✓ 'med<150'` to false.
const THRESHOLD_EXPR = /^\s*([a-z0-9_]+(?:\([\d.]+\))?)\s*(?:<=|<|>=|>)\s*[\d.]+\s*$/i;

const thresholdRows = [];
for (const [metric, data] of Object.entries(m)) {
  for (const [expr, crossed] of Object.entries(data.thresholds ?? {})) {
    // `rate` lives on the metric's `value`; trend statistics are keyed by name.
    const stat = THRESHOLD_EXPR.exec(expr)?.[1];
    const isRate = stat === 'rate';
    const measured = isRate ? data.value : stat != null ? data[stat] : undefined;
    thresholdRows.push([
      `\`${metric}\``,
      `\`${expr}\``,
      measured === undefined ? 'n/a' : isRate ? pct(measured) : `${n(measured)} ms`,
      crossed ? 'FAIL' : 'PASS',
    ]);
  }
}
thresholdRows.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

// ─── Observations — published whether or not they gate anything ──────────────
// GT-443 criterion 2 asks for throughput, p95 latency and error rate. The tail
// percentiles stay in this table even for a profile that does not gate on them
// (smoke asserts the median), because the point of publishing a tail is to watch
// it move — a 10-sample tail is worth reading even when it is not worth failing
// on.
let checkPasses = 0;
let checkFails = 0;
for (const c of Object.values(summary.root_group?.checks ?? {})) {
  checkPasses += c.passes ?? 0;
  checkFails += c.fails ?? 0;
}
const checkTotal = checkPasses + checkFails;

const trendRow = (metric) =>
  [metric?.med, metric?.['p(95)'], metric?.['p(99)'], metric?.max].map((v) => n(v)).join(' / ');

const observed = [
  ['Throughput (HTTP requests/s)', n(m.http_reqs?.rate)],
  ['Throughput (iterations/s)', n(m.iterations?.rate)],
  ['Requests (total)', String(m.http_reqs?.count ?? 'n/a')],
  ['evaluate latency med / p95 / p99 / max (ms)', trendRow(m.evaluate_latency)],
  ['health latency med / p95 / p99 / max (ms)', trendRow(m.health_latency)],
  ['evaluate error rate', pct(m.evaluate_errors?.value)],
  ['HTTP failure rate', pct(m.http_req_failed?.value)],
  ['throttled (429) rate', pct(m.throttled_429?.value)],
  [
    'checks passed',
    checkTotal ? `${checkPasses}/${checkTotal} (${((checkPasses / checkTotal) * 100).toFixed(2)}%)` : 'n/a',
  ],
];

const out = [];
out.push(`### k6 — ${label}`);
out.push('');
out.push(`Run verdict (k6 exit code ${exitCode}): **${exitCode === 0 ? 'thresholds held' : 'THRESHOLD CROSSED'}**`);
out.push('');
out.push('**Thresholds — as enforced by this run** (read back from the k6 summary, not re-declared here)');
out.push('');
if (thresholdRows.length === 0) {
  out.push('_This run declared no thresholds._');
} else {
  out.push('| Metric | Threshold | Measured | Verdict |');
  out.push('| --- | --- | ---: | :---: |');
  for (const row of thresholdRows) out.push(`| ${row.join(' | ')} |`);
}
out.push('');
out.push('**Observed**');
out.push('');
out.push('| Metric | Value |');
out.push('| --- | ---: |');
for (const [metric, value] of observed) out.push(`| ${metric} | ${value} |`);
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
