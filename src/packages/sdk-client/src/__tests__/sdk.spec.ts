/**
 * @beyondnet/evolith-sdk — unit tests
 *
 * Covers (mock transport / mock fetch only — never hits the network):
 *  - EvolithRestClient: per-method URL/verb/body, apiPrefix handling,
 *    Authorization header, timeout/abort, and EvolithApiError on non-2xx
 *  - EvolithMcpClient: typed call dispatch for every public tool method,
 *    JSON-parse fallback, and error detection
 *  - createJsonRpcTransport factory
 *  - EvolithApiError shape
 *  - barrel re-exports (index.ts)
 */

import { EvolithRestClient, EvolithApiError } from '../rest/evolith-rest-client';
import { EvolithMcpClient, createJsonRpcTransport } from '../mcp/evolith-mcp-client';
import type { GateEvaluateOutput, PhaseAdvanceOutput, ValidateJsonOutput } from '../mcp/types';
import type { EvaluateGateRequest } from '../rest/types';

/** Build a mock fetch that resolves an ok JSON response with `data`. */
function okFetch(data: unknown = {}): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data, meta: {} }),
  });
}

/** Last call args ([url, init]) of a jest mock fetch. */
function lastCall(mock: jest.Mock): [string, RequestInit] {
  return mock.mock.calls[mock.mock.calls.length - 1] as [string, RequestInit];
}

// ─── EvolithRestClient ────────────────────────────────────────────────────────

describe('EvolithRestClient', () => {
  it('instantiates without throwing', () => {
    const client = new EvolithRestClient({ baseUrl: 'http://localhost:3000' });
    expect(client).toBeInstanceOf(EvolithRestClient);
  });

  it('strips a trailing slash from baseUrl and sets default /api prefix', async () => {
    const mockFetch = okFetch([]);
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000/',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.listTopologies();
    expect(lastCall(mockFetch)[0]).toBe('http://localhost:3000/api/v1/architecture/topologies');
  });

  it('honours a custom apiPrefix', async () => {
    const mockFetch = okFetch([]);
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      apiPrefix: 'gateway',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.listTopologies();
    expect(lastCall(mockFetch)[0]).toBe('http://localhost:3000/gateway/v1/architecture/topologies');
  });

  it('supports an empty apiPrefix (no prefix segment)', async () => {
    const mockFetch = okFetch([]);
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      apiPrefix: '',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.listTopologies();
    expect(lastCall(mockFetch)[0]).toBe('http://localhost:3000/v1/architecture/topologies');
  });

  it('adds an Authorization header when apiKey is provided', async () => {
    const mockFetch = okFetch([]);
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      apiKey: 'test-token',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.listTopologies();
    const headers = lastCall(mockFetch)[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('omits the Authorization header when no apiKey is provided', async () => {
    const mockFetch = okFetch([]);
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.listTopologies();
    const headers = lastCall(mockFetch)[1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('evaluateGate POSTs to the encoded gate route with a JSON body', async () => {
    const mockFetch = okFetch({ phase: 'discovery', passed: true, violations: [] });
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const body: EvaluateGateRequest = { workspaceRef: 'op_abc123' };
    const result = await client.evaluateGate('PG1-01', body);

    const [url, init] = lastCall(mockFetch);
    expect(url).toBe('http://localhost:3000/api/v1/gates/PG1-01/evaluate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(body);
    expect(result.data.phase).toBe('discovery');
    expect(result.data.passed).toBe(true);
  });

  it('evaluatePhaseGate maps each phase name to its gate id', async () => {
    const cases: Array<['discovery' | 'design' | 'construction' | 'qa' | 'release', string]> = [
      ['discovery', 'PG1-01'],
      ['design', 'PG2-01'],
      ['construction', 'PG3-01'],
      ['qa', 'PG4-01'],
      ['release', 'PG5-01'],
    ];
    for (const [phase, gateId] of cases) {
      const mockFetch = okFetch({ phase, passed: true, violations: [] });
      const client = new EvolithRestClient({
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch as unknown as typeof fetch,
      });
      await client.evaluatePhaseGate(phase, { workspaceRef: 'op_x' });
      expect(lastCall(mockFetch)[0]).toBe(`http://localhost:3000/api/v1/gates/${gateId}/evaluate`);
    }
  });

  it('transitionPhase POSTs to /v1/phases/transition', async () => {
    const mockFetch = okFetch({ from: 'discovery', to: 'design', success: true });
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.transitionPhase({ from: 'discovery', to: 'design', tools: ['t1'], workspaceRef: 'op_x' });
    const [url, init] = lastCall(mockFetch);
    expect(url).toBe('http://localhost:3000/api/v1/phases/transition');
    expect(init.method).toBe('POST');
  });

  it('listTopologies issues a GET with no body', async () => {
    const mockFetch = okFetch([]);
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.listTopologies();
    const [url, init] = lastCall(mockFetch);
    expect(url).toBe('http://localhost:3000/api/v1/architecture/topologies');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });

  it('getTopology GETs the encoded topology route', async () => {
    const mockFetch = okFetch({ id: 'micro services', name: 'Microservices' });
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.getTopology('micro services');
    const [url, init] = lastCall(mockFetch);
    expect(url).toBe('http://localhost:3000/api/v1/architecture/topologies/micro%20services');
    expect(init.method).toBe('GET');
  });

  it('validateSatellite POSTs to /v1/architecture/validate-satellite', async () => {
    const mockFetch = okFetch({ passed: true, issues: [] });
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.validateSatellite({ workspaceRef: 'op_x' });
    const [url, init] = lastCall(mockFetch);
    expect(url).toBe('http://localhost:3000/api/v1/architecture/validate-satellite');
    expect(init.method).toBe('POST');
  });

  it('detectDrift POSTs to /v1/architecture/detect-drift', async () => {
    const mockFetch = okFetch({});
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.detectDrift({ workspaceRef: 'op_x', declaredLevel: 'distributed-modules' });
    const [url, init] = lastCall(mockFetch);
    expect(url).toBe('http://localhost:3000/api/v1/architecture/detect-drift');
    expect(init.method).toBe('POST');
  });

  it('invalidateTopologyCache POSTs an empty body', async () => {
    const mockFetch = okFetch({ invalidated: true, keys: ['k1'] });
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.invalidateTopologyCache();
    const [url, init] = lastCall(mockFetch);
    expect(url).toBe('http://localhost:3000/api/v1/architecture/cache/invalidate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  it('initProject POSTs to /v1/projects/initialize', async () => {
    const mockFetch = okFetch({});
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.initProject({ workspaceRef: 'op_x', name: 'svc', type: 'service' });
    expect(lastCall(mockFetch)[0]).toBe('http://localhost:3000/api/v1/projects/initialize');
    expect(lastCall(mockFetch)[1].method).toBe('POST');
  });

  it('proposeAdvance POSTs to /v1/projects/propose-advance', async () => {
    const mockFetch = okFetch({});
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.proposeAdvance({ workspaceRef: 'op_x', currentPhase: 'discovery', targetPhase: 'design' });
    expect(lastCall(mockFetch)[0]).toBe('http://localhost:3000/api/v1/projects/propose-advance');
    expect(lastCall(mockFetch)[1].method).toBe('POST');
  });

  it('passes an AbortSignal on every request', async () => {
    const mockFetch = okFetch([]);
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await client.listTopologies();
    expect((lastCall(mockFetch)[1].signal as AbortSignal)).toBeInstanceOf(AbortSignal);
  });

  it('aborts the request when the timeout elapses', async () => {
    jest.useFakeTimers();
    const mockFetch = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        (init.signal as AbortSignal).addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    });
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
      timeoutMs: 100,
    });
    const promise = client.listTopologies();
    const assertion = expect(promise).rejects.toThrow('aborted');
    jest.advanceTimersByTime(101);
    await assertion;
    jest.useRealTimers();
  });

  it('throws EvolithApiError on a non-ok response and surfaces the body', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Gate not found',
    });
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await expect(client.evaluateGate('PG9-99', { workspaceRef: 'op_x' })).rejects.toMatchObject({
      status: 404,
      statusText: 'Not Found',
      body: 'Gate not found',
    });
  });

  it('tolerates a failing response.text() when building the error', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => {
        throw new Error('stream closed');
      },
    });
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });
    await expect(client.listTopologies()).rejects.toMatchObject({ status: 500, body: '' });
  });

  it('falls back to global fetch when none is supplied', async () => {
    const globalMock = okFetch([]);
    const original = globalThis.fetch;
    (globalThis as { fetch: typeof fetch }).fetch = globalMock as unknown as typeof fetch;
    try {
      const client = new EvolithRestClient({ baseUrl: 'http://localhost:3000' });
      await client.listTopologies();
      expect(globalMock).toHaveBeenCalled();
    } finally {
      (globalThis as { fetch: typeof fetch }).fetch = original;
    }
  });
});

// ─── EvolithApiError ─────────────────────────────────────────────────────────

describe('EvolithApiError', () => {
  it('has correct shape', () => {
    const err = new EvolithApiError(500, 'Internal Server Error', 'oops', 'http://localhost/v1/gates/X/evaluate');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('EvolithApiError');
    expect(err.status).toBe(500);
    expect(err.statusText).toBe('Internal Server Error');
    expect(err.body).toBe('oops');
    expect(err.url).toBe('http://localhost/v1/gates/X/evaluate');
    expect(err.message).toContain('500');
    expect(err.message).toContain('oops');
  });
});

// ─── EvolithMcpClient ─────────────────────────────────────────────────────────

describe('EvolithMcpClient', () => {
  it('instantiates without throwing', () => {
    const transport = jest.fn();
    const client = new EvolithMcpClient({ transport });
    expect(client).toBeInstanceOf(EvolithMcpClient);
  });

  it('dispatches evaluateGate with the correct tool name and parses output', async () => {
    const gateOutput: GateEvaluateOutput = {
      phase: 'discovery',
      passed: false,
      violations: [{ ruleId: 'R-01', severity: 'error', message: 'Missing README' }],
    };
    const transport = jest.fn().mockResolvedValue([{ type: 'text', text: JSON.stringify(gateOutput) }]);
    const client = new EvolithMcpClient({ transport });
    const result = await client.evaluateGate({ phase: 'discovery', projectPath: '/repos/my-svc' });

    expect(transport).toHaveBeenCalledWith('evolith-gate-evaluate', {
      phase: 'discovery',
      projectPath: '/repos/my-svc',
    });
    expect(result.parsed.passed).toBe(false);
    expect(result.parsed.violations).toHaveLength(1);
    expect(result.isError).toBe(false);
  });

  it('dispatches validate with the correct tool name', async () => {
    const out: ValidateJsonOutput = { status: 'passed', rulesChecked: 12, issues: [] };
    const transport = jest.fn().mockResolvedValue([{ type: 'text', text: JSON.stringify(out) }]);
    const client = new EvolithMcpClient({ transport });
    const result = await client.validate({ path: '/repos/my-svc', format: 'json' });

    expect(transport).toHaveBeenCalledWith('evolith-validate', { path: '/repos/my-svc', format: 'json' });
    expect((result.parsed as ValidateJsonOutput).status).toBe('passed');
  });

  it('dispatches advancePhase with the correct tool name', async () => {
    const phaseOutput: PhaseAdvanceOutput = { fromPhase: 'discovery', toPhase: 'design', allowed: true };
    const transport = jest.fn().mockResolvedValue([{ type: 'text', text: JSON.stringify(phaseOutput) }]);
    const client = new EvolithMcpClient({ transport });
    const result = await client.advancePhase({
      fromPhase: 'discovery',
      toPhase: 'design',
      projectPath: '/repos/my-svc',
    });

    expect(transport).toHaveBeenCalledWith(
      'evolith-phase-advance',
      expect.objectContaining({ fromPhase: 'discovery', toPhase: 'design' }),
    );
    expect(result.parsed.allowed).toBe(true);
  });

  it('dispatches listTopologies and defaults the input to {}', async () => {
    const transport = jest.fn().mockResolvedValue([
      { type: 'text', text: JSON.stringify({ tool: 'evolith-topology-list', count: 0, topologies: [], timestamp: 'now' }) },
    ]);
    const client = new EvolithMcpClient({ transport });
    const result = await client.listTopologies();
    expect(transport).toHaveBeenCalledWith('evolith-topology-list', {});
    expect(result.parsed.count).toBe(0);
  });

  it('dispatches listTopologies forwarding an explicit input', async () => {
    const transport = jest.fn().mockResolvedValue([
      { type: 'text', text: JSON.stringify({ tool: 'evolith-topology-list', count: 0, topologies: [], timestamp: 'now' }) },
    ]);
    const client = new EvolithMcpClient({ transport });
    await client.listTopologies({ corePath: '/core' });
    expect(transport).toHaveBeenCalledWith('evolith-topology-list', { corePath: '/core' });
  });

  it('dispatches getTopology with the correct tool name', async () => {
    const transport = jest.fn().mockResolvedValue([
      {
        type: 'text',
        text: JSON.stringify({
          tool: 'evolith-topology-get',
          id: 'monolith',
          topology: { id: 'monolith', name: 'Monolith' },
          timestamp: 'now',
        }),
      },
    ]);
    const client = new EvolithMcpClient({ transport });
    const result = await client.getTopology({ id: 'monolith' });
    expect(transport).toHaveBeenCalledWith('evolith-topology-get', { id: 'monolith' });
    expect(result.parsed.id).toBe('monolith');
  });

  it('keeps the raw text as parsed output when content is not valid JSON', async () => {
    const transport = jest.fn().mockResolvedValue([{ type: 'text', text: 'plain summary' }]);
    const client = new EvolithMcpClient({ transport });
    const result = await client.validate({ path: '/repos/my-svc', format: 'summary' });
    expect(result.parsed).toBe('plain summary');
    expect(result.isError).toBe(false);
  });

  it('marks result as error when content contains an error type', async () => {
    const transport = jest.fn().mockResolvedValue([{ type: 'error', text: 'Tool not found' }]);
    const client = new EvolithMcpClient({ transport });
    const result = await client.listTopologies();
    expect(result.isError).toBe(true);
  });

  it('marks result as error when content carries an isError flag', async () => {
    const transport = jest.fn().mockResolvedValue([{ type: 'text', text: '{}', isError: true }]);
    const client = new EvolithMcpClient({ transport });
    const result = await client.getTopology({ id: 'x' });
    expect(result.isError).toBe(true);
  });

  it('returns empty parsed text when no text content is present', async () => {
    const transport = jest.fn().mockResolvedValue([{ type: 'image' }]);
    const client = new EvolithMcpClient({ transport });
    const result = await client.call('evolith-validate', { path: '/x' });
    expect(result.parsed).toBe('');
  });
});

// ─── createJsonRpcTransport ────────────────────────────────────────────────────

describe('createJsonRpcTransport', () => {
  it('wraps a sendRequest into a tools/call transport and returns the content array', async () => {
    const sendRequest = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"ok":true}' }],
    });
    const transport = createJsonRpcTransport(sendRequest);
    const content = await transport('evolith-validate', { path: '/repos/x' });

    expect(sendRequest).toHaveBeenCalledWith('tools/call', {
      name: 'evolith-validate',
      arguments: { path: '/repos/x' },
    });
    expect(content).toEqual([{ type: 'text', text: '{"ok":true}' }]);
  });

  it('defaults to an empty content array when the response omits content', async () => {
    const sendRequest = jest.fn().mockResolvedValue({});
    const transport = createJsonRpcTransport(sendRequest);
    const content = await transport('evolith-topology-list', {});
    expect(content).toEqual([]);
  });

  it('integrates end-to-end with EvolithMcpClient', async () => {
    const sendRequest = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ status: 'failed', rulesChecked: 3, issues: [] }) }],
    });
    const client = new EvolithMcpClient({ transport: createJsonRpcTransport(sendRequest) });
    const result = await client.validate({ path: '/repos/x' });
    expect((result.parsed as ValidateJsonOutput).status).toBe('failed');
  });
});

// ─── Compile-time type checks (no runtime assertions needed) ──────────────────

type AssertGatePhase = 'discovery' | 'design' | 'construction' | 'qa' | 'release';
const _gatePhase: AssertGatePhase = 'discovery';
void _gatePhase;

type AssertEvaluatorKind = 'human' | 'agent' | 'ci';
const _kind: AssertEvaluatorKind = 'agent';
void _kind;
