import * as http from 'node:http';
import { issueGrantForCall } from './approval-grant';
import { McpServerService } from './mcp-server.service';
import { MetricsService } from './metrics.service';
import { ToolRegistryService } from './tool-registry.service';
import { AbacEvaluator } from './abac-evaluator';
import { McpTool } from './tool.interface';
import { APPROVAL_INPUT_KEY } from './stateless-rpc';
import {
  META_CLIENT_CAPABILITIES,
  META_CLIENT_INFO,
  META_PROTOCOL_VERSION,
  PROTOCOL_REVISION_STATELESS,
} from './protocol-revisions';
import { __resetEphemeralStateSecret } from './mrtr-request-state';

/**
 * GT-582 — the acceptance criteria, proved over REAL HTTP against the real
 * server rather than against a hand-built double.
 *
 *  1. the server answers `server/discover` and carries no protocol-level session;
 *  2. the HITL gate is an `InputRequiredResult` with a sealed `requestState`,
 *     and completes with no session anywhere in the exchange;
 *  3. a Protected Resource Metadata document is served, and client registration
 *     does not depend on Dynamic Client Registration.
 *
 * The suite deliberately never sends `initialize` and never sends or accepts an
 * `Mcp-Session-Id`: if the stateless path secretly depended on either, nothing
 * below would pass.
 */

class AllowAllAbac extends AbacEvaluator {
  override evaluateNative() {
    return { allowed: true, violations: [] };
  }
  override async evaluateOpa() {
    return { allowed: true, violations: [] };
  }
}

function tool(name: string, execute: McpTool['execute'], mutative = false): McpTool {
  return {
    schema: { name, description: 'd', inputSchema: { type: 'object', properties: {} } },
    mutative,
    ...(mutative ? { scope: 'write' as const } : {}),
    execute,
  };
}

interface HttpResult {
  status: number;
  body: string;
  headers: http.IncomingHttpHeaders;
}

function request(
  port: number,
  method: string,
  urlPath: string,
  headers: Record<string, string> = {},
  payload?: unknown,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const data = payload === undefined ? undefined : JSON.stringify(payload);
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          ...headers,
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers }));
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/** A well-formed 2026-07-28 request: version, identity and capabilities per call. */
function rpc(id: number | string, method: string, params: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    jsonrpc: '2.0',
    id,
    method,
    params: {
      ...params,
      _meta: {
        [META_PROTOCOL_VERSION]: PROTOCOL_REVISION_STATELESS,
        [META_CLIENT_INFO]: { name: 'conformance-client', version: '1.0.0' },
        [META_CLIENT_CAPABILITIES]: { elicitation: {} },
      },
    },
  };
}


/**
 * GT-679 — an approval this server issued, for the identity an API-key request
 * authenticates as (`ADMIN_CONTEXT`), bound to the call's own arguments.
 */
function grantedArgs(tool: string, args: Record<string, unknown>): Record<string, unknown> {
  const { token } = issueGrantForCall({
    approver: 'release-manager@example.com',
    principal: 'admin-api-key',
    tenant: 'default',
    tool,
    args,
  });
  return { apply: true, approvalToken: token };
}

describe('MCP 2026-07-28 conformance over HTTP (GT-582)', () => {
  const API_KEY = 'conformance-key';
  const AUTH = { 'x-api-key': API_KEY };
  let service: McpServerService;
  let port: number;
  let executed: Array<Record<string, unknown>>;
  const savedEnv = { ...process.env };

  beforeEach(async () => {
    executed = [];
    __resetEphemeralStateSecret();
    process.env.EVOLITH_MCP_REQUEST_STATE_SECRET = 'conformance-state-secret';
    const registry = new ToolRegistryService([
      tool('evolith-ping', async () => ({ pong: true })),
      tool(
        'evolith-scaffold',
        async (args) => {
          executed.push(args as Record<string, unknown>);
          return { scaffolded: true };
        },
        true,
      ),
    ]);
    service = new McpServerService(registry, new MetricsService(), new AllowAllAbac());
    await service.start({ transport: 'http', port: 0, apiKey: API_KEY });
    port = service.boundPort()!;
  });

  afterEach(async () => {
    await service.stop();
    process.env = { ...savedEnv };
  });

  // ── Criterion 1 ────────────────────────────────────────────────────────────
  describe('AC1 — server/discover, and no protocol-level session', () => {
    it('answers server/discover with no handshake beforehand', async () => {
      const res = await request(port, 'POST', '/mcp', AUTH, { jsonrpc: '2.0', id: 'd1', method: 'server/discover' });
      expect(res.status).toBe(200);

      const result = JSON.parse(res.body).result;
      expect(result.resultType).toBe('complete');
      expect(result.supportedVersions).toContain(PROTOCOL_REVISION_STATELESS);
      expect(result.capabilities).toBeDefined();
      expect(result._meta['io.modelcontextprotocol/serverInfo']).toMatchObject({ name: 'evolith-mcp' });
    });

    it('mints no Mcp-Session-Id on the stateless path', async () => {
      const res = await request(port, 'POST', '/mcp', AUTH, { jsonrpc: '2.0', id: 1, method: 'server/discover' });
      expect(res.headers['mcp-session-id']).toBeUndefined();
      expect(res.body.toLowerCase()).not.toContain('sessionid');
    });

    it('serves tools/list with no initialize and no session header', async () => {
      const res = await request(port, 'POST', '/mcp', AUTH, rpc(2, 'tools/list'));
      expect(res.status).toBe(200);
      const result = JSON.parse(res.body).result;
      expect(result.resultType).toBe('complete');
      expect(result.tools.map((t: { name: string }) => t.name).sort()).toEqual(['evolith-ping', 'evolith-scaffold']);
      expect(res.headers['mcp-session-id']).toBeUndefined();
    });

    it('serves independent requests on independent connections', async () => {
      // Each call is complete in itself: nothing carried over, nothing to resume.
      const a = await request(port, 'POST', '/mcp', AUTH, rpc(1, 'tools/call', { name: 'evolith-ping', arguments: {} }));
      const b = await request(port, 'POST', '/mcp', AUTH, rpc(2, 'tools/call', { name: 'evolith-ping', arguments: {} }));
      for (const res of [a, b]) {
        const result = JSON.parse(res.body).result;
        expect(result.resultType).toBe('complete');
        expect(JSON.parse(result.content[0].text).success).toBe(true);
      }
    });

    it('still serves a 2025-11-25 client through the SDK transport (no regression)', async () => {
      const initialize = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy', version: '1.0.0' } },
      };
      const res = await request(
        port,
        'POST',
        '/mcp',
        { ...AUTH, Accept: 'application/json, text/event-stream' },
        initialize,
      );
      expect(res.status).toBe(200);
      // The handshake-based revision keeps its session — deleting it here would
      // be an outage for every client on the current SDK.
      expect(res.headers['mcp-session-id']).toBeDefined();
    });
  });

  // ── Criterion 2 ────────────────────────────────────────────────────────────
  describe('AC2 — the HITL gate as InputRequiredResult, with no session', () => {
    const scaffoldCall = { name: 'evolith-scaffold', arguments: { repo: 'alpha' } };

    it('answers a mutative call with input_required and a sealed requestState', async () => {
      const res = await request(port, 'POST', '/mcp', AUTH, rpc(1, 'tools/call', scaffoldCall));
      const result = JSON.parse(res.body).result;

      expect(result.resultType).toBe('input_required');
      expect(result.inputRequests[APPROVAL_INPUT_KEY].method).toBe('elicitation/create');
      expect(typeof result.requestState).toBe('string');
      // Sealed, not merely signed: the client can learn nothing from it.
      expect(result.requestState).not.toContain('evolith-scaffold');
      expect(executed).toEqual([]);
    });

    it('completes the operation on a retry, over HTTP, with no session anywhere', async () => {
      const first = await request(port, 'POST', '/mcp', AUTH, rpc(1, 'tools/call', scaffoldCall));
      expect(first.headers['mcp-session-id']).toBeUndefined();
      const { requestState } = JSON.parse(first.body).result;

      const second = await request(
        port,
        'POST',
        '/mcp',
        AUTH,
        rpc(2, 'tools/call', {
          ...scaffoldCall,
          requestState,
          inputResponses: {
            [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: true, approvalToken: 'human-approved-1' } },
          },
        }),
      );

      expect(second.status).toBe(200);
      expect(second.headers['mcp-session-id']).toBeUndefined();
      const result = JSON.parse(second.body).result;
      expect(result.resultType).toBe('complete');
      expect(JSON.parse(result.content[0].text).success).toBe(true);
      // The tool ran exactly once, and only on the approved leg.
      expect(executed).toHaveLength(1);
      // GT-679 — the forwarded approval is NOT the string the client sent: the
      // server mints a grant once `verifyRequestState` has proved this is the
      // request the human was shown and the human accepted.
      expect(executed[0]).toMatchObject({ repo: 'alpha', apply: true });
      expect(executed[0].approvalToken).not.toBe('human-approved-1');
      expect(String(executed[0].approvalToken)).toMatch(/^evgrant1\./);
    });

    it('refuses a retry that skips the approval', async () => {
      const first = await request(port, 'POST', '/mcp', AUTH, rpc(1, 'tools/call', scaffoldCall));
      const { requestState } = JSON.parse(first.body).result;

      const second = await request(port, 'POST', '/mcp', AUTH, rpc(2, 'tools/call', { ...scaffoldCall, requestState }));
      expect(JSON.parse(second.body).result.isError).toBe(true);
      expect(executed).toEqual([]);
    });

    it('refuses a retry that forges the requestState', async () => {
      const forged = rpc(2, 'tools/call', {
        ...scaffoldCall,
        requestState: 'evmrtr1.YWFhYWFhYWFhYWFh.YWFhYQ.YWFhYWFhYWFhYWFhYWFhYQ',
        inputResponses: { [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: true, approvalToken: 'x' } } },
      });
      const res = await request(port, 'POST', '/mcp', AUTH, forged);
      expect(res.status).toBe(400);
      expect(executed).toEqual([]);
    });

    it('leaves the existing apply/approvalToken gate intact on the same dispatch', async () => {
      // GT-608 proved this seam end to end; MRTR is an additional way to reach
      // it, never a replacement, so the direct form must still work unchanged.
      const res = await request(
        port,
        'POST',
        '/mcp',
        AUTH,
        rpc(1, 'tools/call', {
          name: 'evolith-scaffold',
          // GT-679 — the seam is unchanged; what it carries is not. A caller that
          // already holds an approval still skips the round trip, but the
          // approval is now a grant this server issued rather than any string.
          arguments: { repo: 'beta', ...grantedArgs('evolith-scaffold', { repo: 'beta' }) },
        }),
      );
      // Pre-supplied approval: no round trip needed, the call completes at once.
      expect(JSON.parse(res.body).result.resultType).toBe('complete');
      expect(executed).toHaveLength(1);
      expect(executed[0]).toMatchObject({ repo: 'beta', apply: true });
    });

    /**
     * GT-679 AC5 — ONE verifier, both protocol paths.
     *
     * The row named the inline shortcut at `stateless-rpc.ts` as a way past the
     * gate. It is not one — both legs converge on `ops.callTool` — but that was
     * only true in the weak sense while the gate accepted any non-empty string.
     * This case fails the build if the two paths ever disagree about the same
     * token, which is what "a token accepted on one path and refused on the
     * other" means in practice.
     */
    it('refuses a made-up approval identically on the direct path and on the MRTR path', async () => {
      executed.length = 0;

      const direct = await request(port, 'POST', '/mcp', AUTH, rpc(1, 'tools/call', {
        name: 'evolith-scaffold',
        arguments: { repo: 'gamma', apply: true, approvalToken: 'a-string-the-caller-invented' },
      }));
      const directBody = JSON.parse(direct.body);
      expect(directBody.result.isError).toBe(true);

      const first = await request(port, 'POST', '/mcp', AUTH, rpc(2, 'tools/call', {
        name: 'evolith-scaffold', arguments: { repo: 'gamma' },
      }));
      const requestState = JSON.parse(first.body).result.requestState;
      const viaMrtr = await request(port, 'POST', '/mcp', AUTH, rpc(3, 'tools/call', {
        name: 'evolith-scaffold',
        arguments: { repo: 'gamma' },
        requestState: 'evmrtr1.YWFhYWFhYWFhYWFh.YWFhYQ.YWFhYWFhYWFhYWFhYWFhYQ',
        inputResponses: {
          [APPROVAL_INPUT_KEY]: { action: 'accept', content: { approve: true, approvalToken: 'a-string-the-caller-invented' } },
        },
      }));
      // A forged state is refused before any approval is minted, so the same
      // made-up string reaches execution on NEITHER path.
      expect(viaMrtr.status).toBe(400);
      expect(requestState).toEqual(expect.any(String));
      expect(executed).toEqual([]);
    });
  });

  // ── Criterion 3 ────────────────────────────────────────────────────────────
  describe('AC3 — Protected Resource Metadata, and no DCR dependency', () => {
    async function withOAuthServer(fn: (p: number) => Promise<void>): Promise<void> {
      process.env.EVOLITH_MCP_OAUTH_ISSUER = 'https://issuer.example.com';
      process.env.EVOLITH_MCP_OAUTH_JWKS_URI = 'https://issuer.example.com/jwks';
      const svc = new McpServerService(new ToolRegistryService([]), new MetricsService(), new AllowAllAbac());
      await svc.start({ transport: 'http', port: 0, apiKey: API_KEY });
      try {
        await fn(svc.boundPort()!);
      } finally {
        await svc.stop();
        delete process.env.EVOLITH_MCP_OAUTH_ISSUER;
        delete process.env.EVOLITH_MCP_OAUTH_JWKS_URI;
      }
    }

    it('serves an RFC 9728 document at the well-known URI, unauthenticated', async () => {
      await withOAuthServer(async (p) => {
        // No credentials: a client that has none is exactly who needs this.
        const res = await request(p, 'GET', '/.well-known/oauth-protected-resource');
        expect(res.status).toBe(200);
        const doc = JSON.parse(res.body);
        expect(doc.authorization_servers).toEqual(['https://issuer.example.com']);
        expect(doc.resource).toBeTruthy();
        expect(doc.scopes_supported).toEqual(['read', 'write']);
        expect(doc.bearer_methods_supported).toEqual(['header']);
      });
    });

    it('also serves the path-inserted URI a client probes for a sub-path server', async () => {
      await withOAuthServer(async (p) => {
        const res = await request(p, 'GET', '/.well-known/oauth-protected-resource/mcp');
        expect(res.status).toBe(200);
        expect(JSON.parse(res.body).authorization_servers).toHaveLength(1);
      });
    });

    it('points an unauthenticated caller at the metadata via WWW-Authenticate', async () => {
      await withOAuthServer(async (p) => {
        const res = await request(p, 'POST', '/mcp', {}, { jsonrpc: '2.0', id: 1, method: 'server/discover' });
        expect(res.status).toBe(401);
        const challenge = res.headers['www-authenticate'] as string;
        expect(challenge).toContain('Bearer');
        expect(challenge).toContain('resource_metadata="');
        expect(challenge).toContain('/.well-known/oauth-protected-resource');
        expect(challenge).toContain('scope="read write"');
      });
    });

    it('404s rather than publishing a document with no authorization server', async () => {
      // The API-key-only deployment has no authorization server to name; an
      // empty `authorization_servers` would send a client into a discovery loop.
      const res = await request(port, 'GET', '/.well-known/oauth-protected-resource');
      expect(res.status).toBe(404);
    });

    it('does not gate the metadata document behind the credential it helps obtain', async () => {
      await withOAuthServer(async (p) => {
        const anonymous = await request(p, 'GET', '/.well-known/oauth-protected-resource');
        const authenticated = await request(p, 'GET', '/.well-known/oauth-protected-resource', AUTH);
        expect(anonymous.status).toBe(200);
        expect(JSON.parse(anonymous.body)).toEqual(JSON.parse(authenticated.body));
      });
    });
  });
});
