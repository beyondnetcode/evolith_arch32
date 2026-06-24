import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latencyP99 = new Trend('latency_p99', true);

export const options = {
  scenarios: {
    health_check: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 10,
      tags: { endpoint: '/health' },
    },
    list_topologies: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 20,
      tags: { endpoint: '/topologies' },
    },
    evaluate_gate: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 10,
      tags: { endpoint: '/gates/evaluate' },
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<200', 'p(95)<100', 'p(50)<50'],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  const scenario = __SCENARIO;

  let res;
  if (scenario === 'health_check') {
    res = http.get(`${BASE_URL}/health`, { tags: { endpoint: '/health' } });
  } else if (scenario === 'list_topologies') {
    res = http.get(`${BASE_URL}/topologies`, { tags: { endpoint: '/topologies' } });
  } else if (scenario === 'evaluate_gate') {
    const payload = JSON.stringify({
      topologyId: 'test-topology',
      gate: 'phase-gate',
    });
    res = http.post(`${BASE_URL}/gates/evaluate`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: '/gates/evaluate' },
    });
  }

  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  latencyP99.add(res.timings.duration);
}
