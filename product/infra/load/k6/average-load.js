// ─────────────────────────────────────────────────────────────────────────────
// AVERAGE LOAD — expected steady-state traffic (GT-443).
//
// Purpose: measure behaviour and confirm SLOs hold under a representative,
// sustained request rate — the "normal business day" the system must serve
// comfortably. This is the run whose p95/error-rate you record as the baseline.
//
// Shape: ramp up, hold a plateau, ramp down. Two weighted request mixes model
// a realistic blend: mostly governed evaluations, plus cheap health probes
// (orchestrator/scrapers hitting /health continuously).
//
// Run:  k6 run -e EVOLITH_API_KEY=local-dev-key product/infra/load/k6/average-load.js
// Tune: -e PLATEAU_VUS=50 -e PLATEAU_DURATION=5m
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

const PLATEAU_VUS = Number(__ENV.PLATEAU_VUS || 30);
const PLATEAU_DURATION = __ENV.PLATEAU_DURATION || '3m';
const RAMP_DURATION = __ENV.RAMP_DURATION || '30s';
// The health probes must cover ramp-up + plateau + ramp-down, or a shortened
// run (CI) leaves them probing an idle server for minutes after the load ends —
// which quietly flatters the health p95. Derived, not hard-coded.
const toSeconds = (d) => {
  const m = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/.exec(String(d).trim());
  if (!m) return 0;
  const n = Number(m[1]);
  return { ms: n / 1000, s: n, m: n * 60, h: n * 3600 }[m[2] || 's'];
};
const PROBE_DURATION = `${Math.ceil(2 * toSeconds(RAMP_DURATION) + toSeconds(PLATEAU_DURATION))}s`;

export const options = {
  // p99 is an SLO here, so it must survive into the exported summary — the
  // default trend stats stop at p95 and the CI report showed "n/a" for a
  // threshold it was actively enforcing.
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    // The governed evaluation is the load of record.
    governed_evaluation: {
      executor: 'ramping-vus',
      exec: 'evaluate',
      startVUs: 0,
      stages: [
        { duration: RAMP_DURATION, target: PLATEAU_VUS }, // ramp
        { duration: PLATEAU_DURATION, target: PLATEAU_VUS }, // plateau (steady state)
        { duration: RAMP_DURATION, target: 0 }, // ramp down
      ],
      gracefulRampDown: '10s',
    },
    // Continuous, low-rate health probing in parallel (orchestrator behaviour).
    health_probes: {
      executor: 'constant-arrival-rate',
      exec: 'health',
      rate: 5, // 5 probes/sec
      timeUnit: '1s',
      duration: PROBE_DURATION,
      preAllocatedVUs: 5,
      maxVUs: 10,
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    evaluate_errors: [`rate<${SLO.error_rate}`],
    evaluate_latency: [
      `p(95)<${SLO.evaluate_p95}`,
      `p(99)<${SLO.evaluate_p99}`,
    ],
    health_latency: [
      `p(95)<${SLO.health_p95}`,
      `p(99)<${SLO.health_p99}`,
    ],
    // Per-endpoint HTTP failure ceilings (belt-and-suspenders alongside the Rates).
    'http_req_failed{endpoint:evaluate}': [`rate<${SLO.error_rate}`],
    // A 429 means the TARGET is rate-limited, not that the engine is failing.
    // Named separately so a misconfigured target is unmistakable in the summary.
    throttled_429: ['rate<0.01'],
  },
};

export function evaluate() {
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
    'evaluate success envelope': () => ok,
  });
  sleep(Math.random() * 1 + 0.5); // 0.5–1.5s think time
}

export function health() {
  const h = http.get(HEALTH_URL, { tags: { endpoint: 'health' } });
  healthLatency.add(h.timings.duration);
  check(h, { 'health 200': (r) => r.status === 200 });
}
