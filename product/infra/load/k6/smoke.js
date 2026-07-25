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
  SLO,
} from './lib/config.js';

const evalErrors = new Rate('evaluate_errors');
const evalLatency = new Trend('evaluate_latency', true);
const healthLatency = new Trend('health_latency', true);

export const options = {
  vus: 1,
  iterations: 10, // deterministic, fixed number of governed evaluations
  thresholds: {
    // Smoke must be essentially perfect — it is a correctness gate, not a load test.
    checks: ['rate>0.99'],
    evaluate_errors: ['rate<0.01'],
    'evaluate_latency': [`p(95)<${SLO.evaluate_p95}`],
    'health_latency': [`p(95)<${SLO.health_p95}`],
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
  const ok = isSuccessEnvelope(res);
  evalErrors.add(!ok);
  check(res, {
    'evaluate 200': (r) => r.status === 200,
    'evaluate returns success envelope': () => ok,
    'evaluate has gates in data': (r) => {
      try {
        return Array.isArray(r.json('data.gates'));
      } catch (_e) {
        return false;
      }
    },
  });

  sleep(1);
}
