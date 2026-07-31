// ─────────────────────────────────────────────────────────────────────────────
// STRESS + SPIKE — beyond expected load, to find the knee and the breaking point
// (GT-443: "behaviour under heavy load has never been measured").
//
// Two things in one file, selectable with -e MODE:
//   MODE=stress (default) — a staged ramp that climbs WELL past average load in
//     steps, holding at each level, so you can watch where latency degrades
//     (the "knee") and where errors begin. This answers "how much can it take?".
//   MODE=spike            — a sudden, near-instant surge to a high VU count,
//     brief hold, then drop. This answers "does a traffic burst take it down,
//     and does it recover once the burst passes?".
//
// Thresholds here are DEGRADED-mode SLOs (looser than average-load): the point
// of a stress test is to keep running past the SLO to observe behaviour, not to
// pass. `abortOnFail` is deliberately OFF so the run completes and the summary
// shows the full degradation curve. Read the per-stage p95/error trend, not just
// pass/fail.
//
// Run:  k6 run -e EVOLITH_API_KEY=local-dev-key product/infra/load/k6/stress-spike.js
//       k6 run -e MODE=spike -e PEAK_VUS=300 product/infra/load/k6/stress-spike.js
// ─────────────────────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  EVALUATE_URL,
  EVAL_HEADERS,
  evaluationPayload,
  isSuccessEnvelope,
  isThrottled,
} from './lib/config.js';

const evalErrors = new Rate('evaluate_errors');
// A throttled run is not a slow run — it is an invalid one (see lib/config.js).
const throttled = new Rate('throttled_429');
const evalLatency = new Trend('evaluate_latency', true);

const MODE = (__ENV.MODE || 'stress').toLowerCase();
const PEAK_VUS = Number(__ENV.PEAK_VUS || 200);

// Staged climb well past average load: 50 → 100 → 150 → PEAK, holding each step.
const STRESS_STAGES = [
  { duration: '30s', target: 50 },
  { duration: '1m', target: 50 },
  { duration: '30s', target: 100 },
  { duration: '1m', target: 100 },
  { duration: '30s', target: 150 },
  { duration: '1m', target: 150 },
  { duration: '30s', target: PEAK_VUS },
  { duration: '1m', target: PEAK_VUS },
  { duration: '1m', target: 0 }, // recovery observation window
];

// Sudden burst: baseline → PEAK almost instantly → hold briefly → drop.
const SPIKE_STAGES = [
  { duration: '20s', target: 10 }, // warm baseline
  { duration: '10s', target: PEAK_VUS }, // near-instant surge
  { duration: '1m', target: PEAK_VUS }, // hold the peak
  { duration: '15s', target: 10 }, // drop
  { duration: '1m', target: 10 }, // observe post-spike recovery
  { duration: '10s', target: 0 },
];

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      exec: 'evaluate',
      startVUs: MODE === 'spike' ? 10 : 0,
      stages: MODE === 'spike' ? SPIKE_STAGES : STRESS_STAGES,
      gracefulRampDown: '15s',
    },
  },
  // Degraded-mode SLOs: generous, and NON-aborting, so we observe the full curve.
  thresholds: {
    // Under stress we still expect the majority of requests to succeed.
    evaluate_errors: [{ threshold: 'rate<0.05', abortOnFail: false }],
    // 429s mean the target's rate limiter is the bottleneck under test, not the
    // engine — a stress curve read off a throttled target is meaningless.
    throttled_429: [{ threshold: 'rate<0.01', abortOnFail: false }],
    // Latency ceiling is a red line, not a hard stop — crossing it is the finding.
    evaluate_latency: [{ threshold: 'p(95)<2000', abortOnFail: false }],
  },
};

export function evaluate() {
  const res = http.post(EVALUATE_URL, evaluationPayload(), {
    headers: EVAL_HEADERS,
    tags: { endpoint: 'evaluate', mode: MODE },
    // Cap socket wait so a saturated server surfaces as an error, not a hang.
    timeout: '10s',
  });
  evalLatency.add(res.timings.duration);
  throttled.add(isThrottled(res));
  const ok = isSuccessEnvelope(res);
  evalErrors.add(!ok);
  check(res, {
    'evaluate 200': (r) => r.status === 200,
    'evaluate success envelope': () => ok,
  });
}
