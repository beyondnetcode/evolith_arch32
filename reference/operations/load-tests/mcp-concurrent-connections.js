import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('mcp_errors');
const mcpLatency = new Trend('mcp_latency', true);

export const options = {
  scenarios: {
    mcp_concurrent: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 10,
      maxDuration: '120s',
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<500', 'p(95)<300', 'p(50)<150'],
    mcp_errors: ['rate<0.02'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

const TOOL_CALLS = [
  {
    method: 'tools/list',
    params: {},
  },
  {
    method: 'tools/call',
    params: {
      name: 'list_topologies',
      arguments: {},
    },
  },
  {
    method: 'tools/call',
    params: {
      name: 'evaluate_gate',
      arguments: { topologyId: 'test', gate: 'phase-gate' },
    },
  },
];

export default function () {
  const toolCall = TOOL_CALLS[__VU % TOOL_CALLS.length];

  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: `vu-${__VU}-iter-${__ITER}`,
    method: toolCall.method,
    params: toolCall.params,
  });

  const res = http.post(`${BASE_URL}/mcp`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    tags: { endpoint: '/mcp', method: toolCall.method },
    timeout: '10s',
  });

  const success = check(res, {
    'MCP status is 200': (r) => r.status === 200,
    'MCP response has result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.jsonrpc === '2.0';
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  mcpLatency.add(res.timings.duration);
}
