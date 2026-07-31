import { APPROVAL_INPUT_KEY, handleStatelessRpc, type StatelessRpcOps } from './stateless-rpc';
import {
  MCP_ERROR_MISSING_CLIENT_CAPABILITY,
  MCP_ERROR_UNSUPPORTED_PROTOCOL_VERSION,
  META_CLIENT_CAPABILITIES,
  META_PROTOCOL_VERSION,
  META_SERVER_INFO,
  PROTOCOL_REVISION_STATELESS,
  isStatelessRevisionRequest,
} from './protocol-revisions';
import { __resetEphemeralStateSecret } from './mrtr-request-state';
import type { McpUserContext } from './mcp-user-context';

/**
 * GT-582 — the 2026-07-28 request path. Every assertion here is a line from the
 * revision: a mandatory `server/discover`, a mandatory `resultType`, per-request
 * `_meta` in place of the handshake, and MRTR in place of server-initiated
 * requests. Nothing in this suite touches a session, which is the point.
 */
describe('stateless (2026-07-28) JSON-RPC path (GT-582)', () => {
  const env = { EVOLITH_MCP_REQUEST_STATE_SECRET: 'spec-secret' } as unknown as NodeJS.ProcessEnv;

  const principal: McpUserContext = {
    id: 'user-1',
    role: 'operator',
    roles: ['operator'],
    tenant: 'acme',
    environment: 'test',
    scopes: ['read', 'write'],
  };

  let calls: Array<{ name: string; args: Record<string, unknown> }>;

  function ops(overrides: Partial<StatelessRpcOps> = {}): StatelessRpcOps {
    return {
      serverInfo: { name: 'evolith-mcp', version: '1.0.0' },
      capabilities: () => ({ tools: {}, resources: {} }),
      instructions: 'test instructions',
      listTools: async () => ({ tools: [{ name: 'evolith-ping' }, { name: 'evolith-scaffold' }] }),
      callTool: async (name, args) => {
        calls.push({ name, args });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { ran: name } }) }] };
      },
      isMutative: (name) => name === 'evolith-scaffold',
      ...overrides,
    };
  }

  /** A well-formed 2026-07-28 request envelope. */
  const rpc = (
    id: number,
    method: string,
    params: Record<string, unknown> = {},
    capabilities: Record<string, unknown> = { elicitation: {} },
  ) => ({
    jsonrpc: '2.0',
    id,
    method,
    params: {
      ...params,
      _meta: {
        [META_PROTOCOL_VERSION]: PROTOCOL_REVISION_STATELESS,
        [META_CLIENT_CAPABILITIES]: capabilities,
      },
    },
  });

  beforeEach(() => {
    calls = [];
    __resetEphemeralStateSecret();
  });

  describe('routing', () => {
    it('claims server/discover even without _meta — it is the negotiation entry point', () => {
      expect(isStatelessRevisionRequest({ jsonrpc: '2.0', id: 1, method: 'server/discover' })).toBe(true);
    });

    it('claims any request that declares the 2026-07-28 revision', () => {
      expect(isStatelessRevisionRequest(rpc(1, 'tools/list'))).toBe(true);
    });

    it('leaves a 2025-11-25 initialize alone (the SDK transport still serves it)', () => {
      const legacy = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'c', version: '1' } },
      };
      expect(isStatelessRevisionRequest(legacy)).toBe(false);
    });

    it.each([null, undefined, 'string', 42, []])('leaves non-object body %p alone', (body) => {
      expect(isStatelessRevisionRequest(body)).toBe(false);
    });
  });

  describe('server/discover', () => {
    it('is answered, and reports supported versions, capabilities and identity', async () => {
      const res = await handleStatelessRpc({ jsonrpc: '2.0', id: 'd1', method: 'server/discover' }, principal, ops(), { env });
      expect(res.status).toBe(200);
      const result = (res.body as any).result;
      expect(result.resultType).toBe('complete');
      expect(result.supportedVersions).toContain(PROTOCOL_REVISION_STATELESS);
      expect(result.supportedVersions[0]).toBe(PROTOCOL_REVISION_STATELESS);
      expect(result.capabilities).toEqual({ tools: {}, resources: {} });
      expect(result.instructions).toBe('test instructions');
      expect(result._meta[META_SERVER_INFO]).toEqual({ name: 'evolith-mcp', version: '1.0.0' });
    });

    it('carries no session identifier of any kind in the response', async () => {
      const res = await handleStatelessRpc({ jsonrpc: '2.0', id: 1, method: 'server/discover' }, principal, ops(), { env });
      expect(JSON.stringify(res.body).toLowerCase()).not.toContain('sessionid');
    });
  });

  describe('per-request _meta replaces the handshake', () => {
    it('rejects a request with no protocolVersion (-32602 / 400)', async () => {
      const res = await handleStatelessRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }, principal, ops(), { env });
      expect(res.status).toBe(400);
      expect((res.body as any).error.code).toBe(-32602);
    });

    it('rejects a request with no clientCapabilities (-32602 / 400)', async () => {
      const body = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { [META_PROTOCOL_VERSION]: PROTOCOL_REVISION_STATELESS } } };
      const res = await handleStatelessRpc(body, principal, ops(), { env });
      expect(res.status).toBe(400);
      expect((res.body as any).error.code).toBe(-32602);
    });

    it('answers an unknown version with UnsupportedProtocolVersion and the list it does speak', async () => {
      const body = rpc(1, 'tools/list');
      (body.params._meta as any)[META_PROTOCOL_VERSION] = '2099-01-01';
      const res = await handleStatelessRpc(body, principal, ops(), { env });
      expect(res.status).toBe(400);
      expect((res.body as any).error.code).toBe(MCP_ERROR_UNSUPPORTED_PROTOCOL_VERSION);
      expect((res.body as any).error.data.supportedVersions).toContain(PROTOCOL_REVISION_STATELESS);
    });

    it('never establishes state between two requests', async () => {
      // Two independent calls, no handshake before either of them.
      const a = await handleStatelessRpc(rpc(1, 'tools/list'), principal, ops(), { env });
      const b = await handleStatelessRpc(rpc(2, 'tools/list'), principal, ops(), { env });
      expect((a.body as any).result.tools).toEqual((b.body as any).result.tools);
    });
  });

  describe('resultType', () => {
    it('is present on every successful result', async () => {
      for (const method of ['server/discover', 'ping', 'tools/list']) {
        const res = await handleStatelessRpc(rpc(1, method), principal, ops(), { env });
        expect((res.body as any).result.resultType).toBe('complete');
      }
    });

    it('is `complete` on a non-mutative tools/call', async () => {
      const res = await handleStatelessRpc(rpc(1, 'tools/call', { name: 'evolith-ping', arguments: {} }), principal, ops(), { env });
      expect((res.body as any).result.resultType).toBe('complete');
      expect(calls).toEqual([{ name: 'evolith-ping', args: {} }]);
    });

    it('answers an unknown method with -32601', async () => {
      const res = await handleStatelessRpc(rpc(1, 'nope/nope'), principal, ops(), { env });
      expect((res.body as any).error.code).toBe(-32601);
    });
  });

  describe('HITL as MRTR — the approval gate with no session', () => {
    const scaffold = { name: 'evolith-scaffold', arguments: { repo: 'alpha' } };

    it('answers a mutative call with input_required, an elicitation and a sealed requestState', async () => {
      const res = await handleStatelessRpc(rpc(1, 'tools/call', scaffold), principal, ops(), { env });
      const result = (res.body as any).result;

      expect(res.status).toBe(200);
      expect(result.resultType).toBe('input_required');
      expect(result.inputRequests[APPROVAL_INPUT_KEY].method).toBe('elicitation/create');
      expect(result.inputRequests[APPROVAL_INPUT_KEY].params.requestedSchema.required).toEqual(['approve', 'approvalToken']);
      expect(typeof result.requestState).toBe('string');
      expect(result.requestState).toMatch(/^evmrtr1\./);
      // The tool did NOT run.
      expect(calls).toEqual([]);
    });

    it('completes the operation on a retry that echoes the state and the approval', async () => {
      const first = await handleStatelessRpc(rpc(1, 'tools/call', scaffold), principal, ops(), { env });
      const requestState = (first.body as any).result.requestState;

      // A DIFFERENT JSON-RPC id, as the specification requires: the retry is an
      // independent request, not a continuation of the first.
      const retry = rpc(2, 'tools/call', {
        ...scaffold,
        requestState,
        inputResponses: { [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: true, approvalToken: 'tok-123' } } },
      });
      const second = await handleStatelessRpc(retry, principal, ops(), { env });

      expect((second.body as any).result.resultType).toBe('complete');
      expect(calls).toEqual([
        { name: 'evolith-scaffold', args: expect.objectContaining({ repo: 'alpha', apply: true, approvalToken: 'tok-123' }) },
      ]);
    });

    it('carries the correlation id from the sealed state onto the retry', async () => {
      const first = await handleStatelessRpc(rpc(1, 'tools/call', scaffold), principal, ops(), { env });
      const requestState = (first.body as any).result.requestState;
      const retry = rpc(2, 'tools/call', {
        ...scaffold,
        requestState,
        inputResponses: { [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: true, approvalToken: 'tok' } } },
      });
      await handleStatelessRpc(retry, principal, ops(), { env });
      expect(calls[0].args.correlationId).toMatch(/^evl-/);
    });

    it('refuses a retry whose state was issued to a different principal', async () => {
      const first = await handleStatelessRpc(rpc(1, 'tools/call', scaffold), principal, ops(), { env });
      const requestState = (first.body as any).result.requestState;
      const attacker = { ...principal, id: 'user-2' };
      const retry = rpc(2, 'tools/call', {
        ...scaffold,
        requestState,
        inputResponses: { [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: true, approvalToken: 'tok' } } },
      });
      const res = await handleStatelessRpc(retry, attacker, ops(), { env });
      expect(res.status).toBe(400);
      expect((res.body as any).error.message).toContain('principal-mismatch');
      expect(calls).toEqual([]);
    });

    it('refuses a retry whose state was issued for a different call', async () => {
      const first = await handleStatelessRpc(rpc(1, 'tools/call', scaffold), principal, ops(), { env });
      const requestState = (first.body as any).result.requestState;
      const retry = rpc(2, 'tools/call', {
        name: 'evolith-scaffold',
        arguments: { repo: 'SOMEWHERE-ELSE' },
        requestState,
        inputResponses: { [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: true, approvalToken: 'tok' } } },
      });
      const res = await handleStatelessRpc(retry, principal, ops(), { env });
      expect(res.status).toBe(400);
      expect((res.body as any).error.message).toContain('request-mismatch');
      expect(calls).toEqual([]);
    });

    it('refuses a fabricated requestState', async () => {
      const retry = rpc(2, 'tools/call', {
        ...scaffold,
        requestState: 'evmrtr1.AAAAAAAAAAAAAAAA.AAAA.AAAAAAAAAAAAAAAAAAAAAA',
        inputResponses: { [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: true, approvalToken: 'tok' } } },
      });
      const res = await handleStatelessRpc(retry, principal, ops(), { env });
      expect(res.status).toBe(400);
      expect(calls).toEqual([]);
    });

    it('does not run the tool when the human declines', async () => {
      const first = await handleStatelessRpc(rpc(1, 'tools/call', scaffold), principal, ops(), { env });
      const requestState = (first.body as any).result.requestState;
      const retry = rpc(2, 'tools/call', {
        ...scaffold,
        requestState,
        inputResponses: { [APPROVAL_INPUT_KEY]: { action: 'decline' } },
      });
      const res = await handleStatelessRpc(retry, principal, ops(), { env });
      expect((res.body as any).result.resultType).toBe('complete');
      expect((res.body as any).result.isError).toBe(true);
      expect(calls).toEqual([]);
    });

    it('does not run the tool when the approval says approve:false', async () => {
      const first = await handleStatelessRpc(rpc(1, 'tools/call', scaffold), principal, ops(), { env });
      const requestState = (first.body as any).result.requestState;
      const retry = rpc(2, 'tools/call', {
        ...scaffold,
        requestState,
        inputResponses: { [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: false, approvalToken: 'tok' } } },
      });
      const res = await handleStatelessRpc(retry, principal, ops(), { env });
      expect((res.body as any).result.isError).toBe(true);
      expect(calls).toEqual([]);
    });

    it('refuses to bypass the gate when the client cannot elicit', async () => {
      // No `elicitation` capability declared: the specification forbids sending
      // an inputRequest the client did not declare, and answering with a bare
      // requestState would let the client retry straight through the gate.
      const res = await handleStatelessRpc(rpc(1, 'tools/call', scaffold, {}), principal, ops(), { env });
      expect(res.status).toBe(400);
      expect((res.body as any).error.code).toBe(MCP_ERROR_MISSING_CLIENT_CAPABILITY);
      expect((res.body as any).error.data.requiredCapabilities).toEqual(['elicitation']);
      expect(calls).toEqual([]);
    });

    it('refuses a state presented after its TTL lapses', async () => {
      const first = await handleStatelessRpc(rpc(1, 'tools/call', scaffold), principal, ops(), { env, ttlMs: 1_000, now: 1_000 });
      const requestState = (first.body as any).result.requestState;
      const retry = rpc(2, 'tools/call', {
        ...scaffold,
        requestState,
        inputResponses: { [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: true, approvalToken: 'tok' } } },
      });
      const res = await handleStatelessRpc(retry, principal, ops(), { env, now: 10_000 });
      expect((res.body as any).error.message).toContain('expired');
      expect(calls).toEqual([]);
    });
  });
});
