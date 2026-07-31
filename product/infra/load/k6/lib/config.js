// ─────────────────────────────────────────────────────────────────────────────
// Shared k6 configuration for the Evolith Core load harness (GT-443).
//
// Single source of truth for: target URLs, auth header, the real governed
// evaluation request body, and the SLO thresholds every scenario enforces.
//
// Ground truth (do not guess — verified against source):
//   • Health   : GET  {BASE_URL}/health              — @Public(), no API key.
//                (core-api HealthController, version-neutral, ApiKeyGuard bypass)
//   • Evaluate : POST {BASE_URL}/api/v1/evaluate      — requires x-api-key.
//                (core-api EvaluationController, ADR-0101 stateless engine)
//   • Auth     : header `x-api-key: <EVOLITH_API_KEY>` OR `Authorization: Bearer`.
//                (core-api ApiKeyGuard.extractKey)
//   • Host port: docker-compose.fullstack.yml maps core-api 3001->3000, so the
//                default BASE_URL targets http://localhost:3001.
// ─────────────────────────────────────────────────────────────────────────────

// __ENV is k6's environment accessor. Override any of these at invocation:
//   k6 run -e BASE_URL=https://core.example.com -e EVOLITH_API_KEY=... smoke.js
export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
export const API_KEY = __ENV.EVOLITH_API_KEY || 'local-dev-key';

export const EVALUATE_URL = `${BASE_URL}/api/v1/evaluate`;
export const HEALTH_URL = `${BASE_URL}/health`;

export const EVAL_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

// ─── The real governed-evaluation body ───────────────────────────────────────
// Inline path (EvaluationController.evaluateInline): the Core evaluates this
// in-memory satellite content directly — no disk read/write of the satellite,
// no network for the content — while reading its OWN rulesets from disk. This
// keeps the load test hermetic (no workspaceRef resolution, no sibling repo)
// while exercising the full RulesetValidatorService pipeline and returning a
// verdict with provenance:core.
//
// The evolith.yaml shape mirrors the controller's own inline spec fixture
// (VALID_EVOLITH_YAML) so GOV-000 (manifest-presence) does NOT fire — i.e. this
// is a genuine passing governed evaluation, not an error path.
const VALID_EVOLITH_YAML = JSON.stringify({
  coreRef: { version: '1.0.0', path: '../evolith' },
  governance: { version: '1.0.0' },
  product: { name: 'load-harness-project', type: 'enterprise-application' },
});

export function evaluationPayload() {
  return JSON.stringify({
    // Inline, stateless content — highest-priority branch of the controller.
    evaluationInput: {
      files: {
        'evolith.yaml': VALID_EVOLITH_YAML,
        'docs/prd.md': '# PRD\n\nLoad-harness synthetic product requirements.',
      },
    },
    // Legacy hints the inline branch forwards into the manifest (phase/topology).
    phase: 'f1',
    topology: 'modular-monolith',
  });
}

// ─── SLOs — these thresholds ARE the pass/fail contract ───────────────────────
// A k6 run exits non-zero when any threshold is crossed, so CI can gate on it.
// Rationale for the numbers is documented in ../README.md ("SLOs" section).
// They are intentionally conservative for the in-memory inline path (CPU-bound,
// no external I/O in the hot path); tighten/loosen once real baselines exist on
// the deployment under test (blocked on GT-448).

// Latency ceilings (ms), per endpoint, at p95 and p99.
export const SLO = {
  health_p95: Number(__ENV.SLO_HEALTH_P95 || 150),
  health_p99: Number(__ENV.SLO_HEALTH_P99 || 300),
  evaluate_p95: Number(__ENV.SLO_EVALUATE_P95 || 800),
  evaluate_p99: Number(__ENV.SLO_EVALUATE_P99 || 1500),
  // Fraction of failed requests tolerated (0.01 = 1%).
  error_rate: Number(__ENV.SLO_ERROR_RATE || 0.01),
};

// ─── Rate limiting — the thing that silently invalidates a load run ──────────
// core-api throttles every route (`ThrottlerModule`, default 100 requests per
// 60 s, tunable with THROTTLE_MAX_REQUESTS / THROTTLE_TTL_MS). Any load worth
// running exceeds that instantly: measured 2026-07-30, a 10-VU average-load run
// against a default-configured target returned 429 for 81% of evaluations, and
// the summary reported it as an "error rate" — which reads like an engine
// failure and is nothing of the sort.
//
// So every scenario tracks 429s as their OWN metric with its own threshold: a
// throttled run must fail loudly and by name, never be mistaken for a capacity
// measurement. Configure the TARGET for load (e.g. THROTTLE_MAX_REQUESTS=100000)
// before reading any number from this harness.
export function isThrottled(res) {
  return res.status === 429;
}

// Validates a core-api response is a real success envelope (ADR-0073), not just
// a 200 with a body. Used by every scenario's `check()`.
export function isSuccessEnvelope(res) {
  if (res.status !== 200) return false;
  try {
    const body = res.json();
    return body && body.success === true && body.data != null;
  } catch (_e) {
    return false;
  }
}
