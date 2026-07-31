// ─────────────────────────────────────────────────────────────────────────────
// SMOKE — minimal load, correctness-first (GT-443).
//
// Purpose: prove the target is up and the governed evaluation path works BEFORE
// spending time on load/stress. Tiny VU count, short duration. If smoke fails,
// nothing else is worth running.
//
// Run:  k6 run -e EVOLITH_API_KEY=local-dev-key product/infra/load/k6/smoke.js
// ─────────────────────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  EVALUATE_URL,
  HEALTH_URL,
  EVAL_HEADERS,
  evaluationPayload,
  isSuccessEnvelope,
  isThrottled,
  SLO,
} from './lib/config.js';

const evalErrors = new Rate('evaluate_errors');
// A throttled run is not a slow run — it is an invalid one (see lib/config.js).
const throttled = new Rate('throttled_429');
const evalLatency = new Trend('evaluate_latency', true);
const healthLatency = new Trend('health_latency', true);

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  vus: 1,
  iterations: 10, // deterministic, fixed number of governed evaluations
  thresholds: {
    // Smoke must be essentially perfect — it is a correctness gate, not a load test.
    checks: ['rate>0.99'],
    evaluate_errors: ['rate<0.01'],
    'evaluate_latency': [`p(95)<${SLO.evaluate_p95}`],
    'health_latency': [`p(95)<${SLO.health_p95}`],
    // A 429 means the TARGET is rate-limited, not that the engine is failing.
    // Named separately so a misconfigured target is unmistakable in the summary.
    throttled_429: ['rate<0.01'],
  },
};

export default function () {
  // 1) Liveness/readiness — public, no key.
  const h = http.get(HEALTH_URL, { tags: { endpoint: 'health' } });
  healthLatency.add(h.timings.duration);
  check(h, { 'health 200': (r) => r.status === 200 });

  // 2) The governed evaluation — the thing GT-443 says was never measured.
  const res = http.post(EVALUATE_URL, evaluationPayload(), {
    headers: EVAL_HEADERS,
    tags: { endpoint: 'evaluate' },
  });
  evalLatency.add(res.timings.duration);
  throttled.add(isThrottled(res));
  const ok = isSuccessEnvelope(res);
  evalErrors.add(!ok);
  check(res, {
    'evaluate 200': (r) => r.status === 200,
    'evaluate returns success envelope': () => ok,
    // The correctness assertion of record: the engine ran RULES, not just HTTP.
    // (Was `data.gates` — a shape the API has never returned. The harness was
    // written but never executed, so the wrong field went unnoticed; measured
    // against a live core-api on 2026-07-30, the response carries
    // `rulesExecuted` / `policiesApplied`, never `gates`.)
    'evaluate executed rules': (r) => {
      try {
        const rules = r.json('data.rulesExecuted');
        return Array.isArray(rules) && rules.length > 0;
      } catch (_e) {
        return false;
      }
    },
    'evaluate returned a verdict': (r) => {
      try {
        return ['PASS', 'FAIL', 'WARN'].indexOf(r.json('data.overallVerdict')) !== -1;
      } catch (_e) {
        return false;
      }
    },
  });

  sleep(1);
}
