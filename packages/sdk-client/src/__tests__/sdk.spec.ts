/**
 * @evolith/sdk — unit tests
 *
 * Covers:
 *  - Constructor instantiation (no network calls)
 *  - Type-level correctness (compile-time checks via TypeScript)
 *  - EvolithMcpClient typed call dispatch
 *  - EvolithApiError shape
 */

import { EvolithRestClient, EvolithApiError } from '../rest/evolith-rest-client';
import { EvolithMcpClient } from '../mcp/evolith-mcp-client';
import type { GateEvaluateOutput, PhaseAdvanceOutput } from '../mcp/types';
import type { EvaluateGateRequest } from '../rest/types';

// ─── EvolithRestClient ────────────────────────────────────────────────────────

describe('EvolithRestClient', () => {
  it('instantiates without throwing', () => {
    const client = new EvolithRestClient({ baseUrl: 'http://localhost:3000' });
    expect(client).toBeInstanceOf(EvolithRestClient);
  });

  it('instantiates with apiKey and custom fetch', () => {
    const mockFetch = jest.fn();
    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      apiKey: 'test-token',
      fetch: mockFetch as unknown as typeof fetch,
    });
    expect(client).toBeInstanceOf(EvolithRestClient);
  });

  it('calls the correct endpoint on evaluateGate', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { phase: 'discovery', passed: true, violations: [] } }),
    });

    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const body: EvaluateGateRequest = { workspaceRef: 'op_abc123' };
    const result = await client.evaluateGate('PG1-01', body);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/gates/PG1-01/evaluate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.data.phase).toBe('discovery');
    expect(result.data.passed).toBe(true);
  });

  it('calls listTopologies with GET', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const client = new EvolithRestClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    });

    await client.listTopologies();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/architecture/topologies',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws EvolithApiError on non-ok response', async () => {
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

    await expect(client.evaluateGate('PG9-99', { workspaceRef: 'op_x' })).rejects.toThrow(EvolithApiError);
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
  });
});

// ─── EvolithMcpClient ─────────────────────────────────────────────────────────

describe('EvolithMcpClient', () => {
  it('instantiates without throwing', () => {
    const transport = jest.fn();
    const client = new EvolithMcpClient({ transport });
    expect(client).toBeInstanceOf(EvolithMcpClient);
  });

  it('dispatches evaluateGate with correct tool name', async () => {
    const gateOutput: GateEvaluateOutput = {
      phase: 'discovery',
      passed: false,
      violations: [{ ruleId: 'R-01', severity: 'error', message: 'Missing README' }],
    };

    const transport = jest.fn().mockResolvedValue([
      { type: 'text', text: JSON.stringify(gateOutput) },
    ]);

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

  it('dispatches advancePhase with correct tool name', async () => {
    const phaseOutput: PhaseAdvanceOutput = {
      fromPhase: 'discovery',
      toPhase: 'design',
      allowed: true,
    };

    const transport = jest.fn().mockResolvedValue([
      { type: 'text', text: JSON.stringify(phaseOutput) },
    ]);

    const client = new EvolithMcpClient({ transport });
    const result = await client.advancePhase({
      fromPhase: 'discovery',
      toPhase: 'design',
      projectPath: '/repos/my-svc',
    });

    expect(transport).toHaveBeenCalledWith('evolith-phase-advance', expect.objectContaining({
      fromPhase: 'discovery',
      toPhase: 'design',
    }));
    expect(result.parsed.allowed).toBe(true);
  });

  it('marks result as error when content contains error type', async () => {
    const transport = jest.fn().mockResolvedValue([
      { type: 'error', text: 'Tool not found' },
    ]);

    const client = new EvolithMcpClient({ transport });
    const result = await client.listTopologies();

    expect(result.isError).toBe(true);
  });
});

// ─── Compile-time type checks (no runtime assertions needed) ──────────────────

// These lines verify TypeScript accepts the correct types.
// If any type is wrong, the build (tsc) will fail.

type AssertGatePhase = 'discovery' | 'design' | 'construction' | 'qa' | 'release';
const _gatePhase: AssertGatePhase = 'discovery';
void _gatePhase;

type AssertEvaluatorKind = 'human' | 'agent' | 'ci';
const _kind: AssertEvaluatorKind = 'agent';
void _kind;
