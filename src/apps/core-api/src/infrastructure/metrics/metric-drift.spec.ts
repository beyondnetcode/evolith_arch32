import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * GT-550 — anti-drift guard: every metric an alert/SLO references must actually be
 * emitted by Core code.
 *
 * This is the CI check whose absence let GT-543/GT-545 happen: the alerts queried
 * `http_requests_total` / `http_request_duration_seconds_bucket` while the code emitted
 * `evolith_`-prefixed names, so HighErrorRate/HighLatency/error-budget alerts were inert.
 * Reddens the PR when an alert or SLO cites an Evolith metric no service emits.
 */

function repoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, 'product/operations/alerts/prometheus-alerts.yml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('repo root (with product/operations/alerts/prometheus-alerts.yml) not found');
}

function walkTs(root: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) walkTs(full, acc);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.spec.ts')) acc.push(full);
  }
  return acc;
}

const ROOT = repoRoot();

const OPS_FILES = [
  'product/operations/alerts/prometheus-alerts.yml',
  'product/operations/slo/core-api-slo.md',
  'product/operations/slo/core-api-slo.es.md',
]
  .map((p) => join(ROOT, p))
  .filter(existsSync);

// Metrics produced OUTSIDE Evolith code — node-exporter, kube-state-metrics, the
// broker, the OPA sidecar, prom-client defaults. The guard does not require Core code
// to emit these; it only holds every Core-owned metric referenced in an alert/SLO to
// actually existing in the source.
const EXTERNAL = [/^up$/, /^node_/, /^nodejs_/, /^process_/, /^rabbitmq_/, /^kube_/, /^opa_/];

/**
 * Extract PromQL metric names — a name sits IMMEDIATELY before a `{` selector or `[`
 * range (no space, unlike markdown prose such as "see [link]"). Snake_case only, so a
 * stray prose word never registers as a metric.
 */
function candidateMetrics(text: string): string[] {
  const out = new Set<string>();
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)[{[]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1].includes('_')) out.add(m[1]);
  }
  return [...out];
}

describe('metrics drift guard (GT-550 — alerts/SLO ⇄ emitted metrics)', () => {
  const emitted = new Set<string>();

  beforeAll(() => {
    for (const dir of ['src/apps', 'src/packages'].map((p) => join(ROOT, p))) {
      if (!existsSync(dir)) continue;
      for (const file of walkTs(dir)) {
        for (const tok of readFileSync(file, 'utf8').match(/evolith_[a-z0-9_]+/g) ?? []) emitted.add(tok);
      }
    }
  });

  it('finds the ops files and can extract Evolith metric references (extractor sanity)', () => {
    expect(OPS_FILES.length).toBeGreaterThan(0);
    const referenced = OPS_FILES.flatMap((f) => candidateMetrics(readFileSync(f, 'utf8')));
    expect(referenced.some((m) => m.startsWith('evolith_'))).toBe(true);
  });

  it('every non-external metric referenced in alerts/SLO is emitted by a Core service', () => {
    const problems: string[] = [];
    for (const file of OPS_FILES) {
      for (const metric of candidateMetrics(readFileSync(file, 'utf8'))) {
        if (EXTERNAL.some((re) => re.test(metric))) continue;
        // prom-client auto-suffixes histograms (_bucket/_count/_sum); code declares the base.
        const base = metric.replace(/_(bucket|count|sum)$/, '');
        if (!emitted.has(metric) && !emitted.has(base)) {
          problems.push(`${metric} (in ${file.replace(`${ROOT}/`, '')}) is emitted by no Core service`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
