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
  SLO,
} from './lib/config.js';

const evalErrors = new Rate('evaluate_errors');
const evalLatency = new Trend('evaluate_latency', true);
const healthLatency = new Trend('health_latency', true);

const PLATEAU_VUS = Number(__ENV.PLATEAU_VUS || 30);
const PLATEAU_DURATION = __ENV.PLATEAU_DURATION || '3m';

export const options = {
  scenarios: {
    // The governed evaluation is the load of record.
    governed_evaluation: {
      executor: 'ramping-vus',
      exec: 'evaluate',
      startVUs: 0,
      stages: [
        { duration: '30s', target: PLATEAU_VUS }, // ramp
        { duration: PLATEAU_DURATION, target: PLATEAU_VUS }, // plateau (steady state)
        { duration: '30s', target: 0 }, // ramp down
      ],
      gracefulRampDown: '10s',
    },
    // Continuous, low-rate health probing in parallel (orchestrator behaviour).
    health_probes: {
      executor: 'constant-arrival-rate',
      exec: 'health',
      rate: 5, // 5 probes/sec
      timeUnit: '1s',
      duration: '4m',
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
  },
};

export function evaluate() {
  const res = http.post(EVALUATE_URL, evaluationPayload(), {
    headers: EVAL_HEADERS,
    tags: { endpoint: 'evaluate' },
  });
  evalLatency.add(res.timings.duration);
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
