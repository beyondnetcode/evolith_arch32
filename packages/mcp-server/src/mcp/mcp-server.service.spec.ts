import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'fs-extra';
import * as crypto from 'node:crypto';
import { McpServerService, ToolCallResult, mcpContextStorage } from './mcp-server.service';
import { MetricsService } from './metrics.service';
import { ToolRegistryService } from './tool-registry.service';
import { AuditLogger } from './audit-logger';
import { McpTool } from './tool.interface';
import { DomainException, ErrorCodes } from '../common/errors';
import { AbacEvaluator } from './abac-evaluator';
import { requestContextStorage } from '@evolith/core-domain/common/request-context';
import { WebhookAdapter } from '@evolith/infra-providers';

class MockAbacEvaluator extends AbacEvaluator {
  override evaluateNative() {
    return { allowed: true, violations: [] };
  }
  override async evaluateOpa() {
    return { allowed: true, violations: [] };
  }
}

function generateTestJwt(payload: any, secret: string, expiresMs?: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  
  const payloadData = { ...payload };
  if (expiresMs !== undefined) {
    payloadData.exp = Math.floor((Date.now() + expiresMs) / 1000);
  }
  const payloadB64 = Buffer.from(JSON.stringify(payloadData)).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = hmac.digest('base64url');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

function parseEnvelope(result: ToolCallResult): any {
  return JSON.parse(result.content[0].text);
}

function tool(name: string, execute: McpTool['execute'], mutative = false): McpTool {
  return {
    schema: { name, description: 'd', inputSchema: { type: 'object', properties: {} } },
    mutative,
    execute,
  };
}

describe('McpServerService — dispatch', () => {
  let metrics: MetricsService;
  let registry: ToolRegistryService;
  let service: McpServerService;

  function build(tools: McpTool[]): void {
    metrics = new MetricsService();
    registry = new ToolRegistryService(tools);
    service = new McpServerService(registry, metrics, new MockAbacEvaluator());
  }

  it('lists registered tool schemas', async () => {
    build([tool('evolith-validate', async () => ({}))]);
    expect((await service.handleListTools()).tools).toEqual([
      expect.objectContaining({ name: 'evolith-validate' }),
    ]);
  });

  it('wraps a successful tool result in a success envelope and records metrics', async () => {
    build([tool('evolith-validate', async () => ({ status: 'passed' }))]);
    const env = parseEnvelope(await service.handleCallTool('evolith-validate', { path: '/r' }));

    expect(env.success).toBe(true);
    expect(env.data).toEqual({ status: 'passed' });
    expect(env.meta.tool).toBe('evolith-validate');
    expect(env.meta.correlationId).toMatch(/^evl-/);
    expect(metrics.getMetrics().tools['evolith-validate'].calls).toBe(1);
  });

  it('returns NOT_IMPLEMENTED for an unknown tool and flags isError', async () => {
    build([]);
    const result = await service.handleCallTool('nope');
    const env = parseEnvelope(result);
    expect(result.isError).toBe(true);
    expect(env.error.code).toBe(ErrorCodes.NOT_IMPLEMENTED);
    expect(metrics.getMetrics().totalFailures).toBe(1);
  });

  it('maps a thrown Error to an INTERNAL_ERROR envelope', async () => {
    build([
      tool('boom', async () => {
        throw new Error('exploded');
      }),
    ]);
    const result = await service.handleCallTool('boom');
    const env = parseEnvelope(result);
    expect(result.isError).toBe(true);
    expect(env.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(env.error.message).toBe('exploded');
  });

  it('preserves a DomainException code', async () => {
    build([
      tool('domain', async () => {
        throw new DomainException(ErrorCodes.REPO_NOT_FOUND, 'no repo');
      }),
    ]);
    const env = parseEnvelope(await service.handleCallTool('domain'));
    expect(env.error.code).toBe(ErrorCodes.REPO_NOT_FOUND);
  });

  describe('mutative gate & ABAC', () => {
    it('blocks a mutative tool without apply: true and approvalToken', async () => {
      build([tool('evolith-write-file', async () => ({ done: true }), true)]);
      const result = await service.handleCallTool('evolith-write-file', {});
      const env = parseEnvelope(result);
      expect(result.isError).toBe(true);
      expect(env.error.code).toBe(ErrorCodes.FORBIDDEN);
      expect(env.error.message).toContain('requires approval');
    });

    it('allows a mutative tool with apply: true and approvalToken, and logs audit trail', async () => {
      const execute = jest.fn(async () => ({ done: true }));
      build([tool('evolith-write-file', execute, true)]);

      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      const result = await service.handleCallTool('evolith-write-file', {
        apply: true,
        approvalToken: 'test-token-123',
      });
      const env = parseEnvelope(result);
      expect(env.success).toBe(true);
      expect(execute).toHaveBeenCalled();

      expect(loggerSpy).toHaveBeenCalled();
      const logArg = loggerSpy.mock.calls.find(call => call[0].includes('MUTATIVE_TOOL_EXECUTION'));
      expect(logArg).toBeDefined();
      const parsedLog = JSON.parse(logArg[0]);
      expect(parsedLog.event).toBe('MUTATIVE_TOOL_EXECUTION');
      expect(parsedLog.approvalToken).toBe('test-token-123');
    });
  });

  describe('isMutationAllowed', () => {
    let dir: string;

    beforeEach(async () => {
      build([]);
      dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-mcp-'));
    });

    afterEach(async () => {
      await fs.remove(dir);
    });

    it('returns false when evolith.yaml is absent', async () => {
      expect(await service.isMutationAllowed(dir)).toBe(false);
    });

    it('returns true when mcp.allowMutations is true', async () => {
      await fs.writeFile(path.join(dir, 'evolith.yaml'), 'mcp:\n  allowMutations: true\n');
      expect(await service.isMutationAllowed(dir)).toBe(true);
    });

    it('returns false when mcp.allowMutations is false', async () => {
      await fs.writeFile(path.join(dir, 'evolith.yaml'), 'mcp:\n  allowMutations: false\n');
      expect(await service.isMutationAllowed(dir)).toBe(false);
    });
  });
});

describe('McpServerService — HTTP transport', () => {
  function httpGet(
    port: number,
    urlPath: string,
    headers: Record<string, string> = {},
  ): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { host: '127.0.0.1', port, path: urlPath, method: 'GET', headers },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers }));
        },
      );
      req.on('error', reject);
      req.end();
    });
  }

  it('serves /health publicly and enforces the API key on MCP endpoints', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService(), new MockAbacEvaluator());
    await service.start({ transport: 'http', port: 0, apiKey: 'secret' });
    const port = service.boundPort()!;

    try {
      // /health is a public liveness probe — reachable without credentials.
      const health = await httpGet(port, '/health');
      expect(health.status).toBe(200);
      expect(JSON.parse(health.body)).toMatchObject({ status: 'ok', transport: 'http' });

      // MCP endpoints require the API key.
      const unauthorized = await httpGet(port, '/mcp');
      expect(unauthorized.status).toBe(401);

      const authorized = await httpGet(port, '/mcp', { 'x-api-key': 'secret' });
      expect(authorized.status).not.toBe(401);
    } finally {
      await service.stop();
    }
  });

  it('allows /health without auth when --allow-no-auth is set', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService(), new MockAbacEvaluator());
    await service.start({ transport: 'http', port: 0, allowNoAuth: true });
    const port = service.boundPort()!;

    try {
      const ok = await httpGet(port, '/health');
      expect(ok.status).toBe(200);
    } finally {
      await service.stop();
    }
  });

  it('rejects MCP requests without auth when no API key and allowNoAuth is false', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService(), new MockAbacEvaluator());
    await service.start({ transport: 'http', port: 0 });
    const port = service.boundPort()!;

    try {
      const res = await httpGet(port, '/mcp');
      expect(res.status).toBe(401);
    } finally {
      await service.stop();
    }
  });

  it('accepts a valid API key via Authorization header on MCP endpoints', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService(), new MockAbacEvaluator());
    await service.start({ transport: 'http', port: 0, apiKey: 'secret' });
    const port = service.boundPort()!;

    try {
      const ok = await httpGet(port, '/mcp', { 'authorization': 'Bearer secret' });
      expect(ok.status).not.toBe(401);
    } finally {
      await service.stop();
    }
  });

  it('sets security headers on HTTP responses', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService(), new MockAbacEvaluator());
    await service.start({ transport: 'http', port: 0, allowNoAuth: true });
    const port = service.boundPort()!;

    try {
      const res = await httpGet(port, '/health');
      expect(res.headers['content-security-policy']).toBe("default-src 'none'");
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['strict-transport-security']).toContain('max-age=');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
      expect(res.headers['x-xss-protection']).toBe('0');
    } finally {
      await service.stop();
    }
  });

  it('rejects MCP requests with invalid JWT signature or format', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService(), new MockAbacEvaluator());
    process.env.JWT_SECRET = 'secret_key';
    await service.start({ transport: 'http', port: 0, apiKey: 'secret' });
    const port = service.boundPort()!;

    try {
      const res = await httpGet(port, '/mcp', { 'authorization': 'Bearer bad.token.here' });
      expect(res.status).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
    } finally {
      await service.stop();
      delete process.env.JWT_SECRET;
    }
  });

  it('verifies valid JWT and extracts scopes/role', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService(), new MockAbacEvaluator());
    process.env.JWT_SECRET = 'secret_key';
    await service.start({ transport: 'http', port: 0, apiKey: 'secret' });
    const port = service.boundPort()!;

    try {
      const token = generateTestJwt({ role: 'operator', scope: 'read write' }, 'secret_key', 60000);
      const ok = await httpGet(port, '/mcp', { 'authorization': `Bearer ${token}` });
      expect(ok.status).not.toBe(401);
    } finally {
      await service.stop();
      delete process.env.JWT_SECRET;
    }
  });

  it('rejects expired JWT token', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService(), new MockAbacEvaluator());
    process.env.JWT_SECRET = 'secret_key';
    await service.start({ transport: 'http', port: 0, apiKey: 'secret' });
    const port = service.boundPort()!;

    try {
      const token = generateTestJwt({ role: 'operator', scope: 'read write' }, 'secret_key', -10000);
      const res = await httpGet(port, '/mcp', { 'authorization': `Bearer ${token}` });
      expect(res.status).toBe(401);
    } finally {
      await service.stop();
      delete process.env.JWT_SECRET;
    }
  });

  it('filters tool list and checks tool execute permissions based on scope context', async () => {
    const readTool = tool('read-tool', async () => ({ val: 1 }));
    // @ts-ignore
    readTool.scope = 'read';

    const writeTool = tool('write-tool', async () => ({ val: 2 }));
    // @ts-ignore
    writeTool.scope = 'write';

    const adminTool = tool('admin-tool', async () => ({ val: 3 }));
    // @ts-ignore
    adminTool.scope = 'admin';

    const registry = new ToolRegistryService([readTool, writeTool, adminTool]);
    const service = new McpServerService(registry, new MetricsService(), new MockAbacEvaluator());

    // Reader context
    await mcpContextStorage.run({
      id: 'reader-1',
      role: 'reader',
      roles: ['reader'],
      tenant: 'default',
      environment: 'development',
      scopes: ['read'],
    }, async () => {
      const list = await service.handleListTools();
      expect(list.tools.map(t => t.name)).toEqual(['read-tool']);

      const readResult = await service.handleCallTool('read-tool');
      expect(parseEnvelope(readResult).success).toBe(true);

      const writeResult = await service.handleCallTool('write-tool');
      expect(parseEnvelope(writeResult).success).toBe(false);
      expect(parseEnvelope(writeResult).error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    // Operator/Writer context
    await mcpContextStorage.run({
      id: 'operator-1',
      role: 'operator',
      roles: ['operator'],
      tenant: 'default',
      environment: 'development',
      scopes: ['read', 'write'],
    }, async () => {
      const list = await service.handleListTools();
      expect(list.tools.map(t => t.name)).toEqual(['read-tool', 'write-tool']);

      const writeResult = await service.handleCallTool('write-tool');
      expect(parseEnvelope(writeResult).success).toBe(true);

      const adminResult = await service.handleCallTool('admin-tool');
      expect(parseEnvelope(adminResult).success).toBe(false);
    });
  });
});

describe('ABAC dual-engine evaluation', () => {
  let realService: McpServerService;
  let realEvaluator: AbacEvaluator;
  let metrics: MetricsService;
  let registry: ToolRegistryService;

  beforeEach(() => {
    realEvaluator = new AbacEvaluator();
    metrics = new MetricsService();
    registry = new ToolRegistryService([
      tool('evolith-ping', async () => ({ status: 'pong' })),
      tool('evolith-write-file', async () => ({ written: true }), true),
      tool('evolith-deploy', async () => ({ deployed: true }), true),
    ]);
    realService = new McpServerService(registry, metrics, realEvaluator);
  });

  it('denies read tools for unauthenticated users (empty roles)', async () => {
    // Empty context / no roles
    await mcpContextStorage.run({ id: 'anonymous', role: 'anonymous', roles: [], tenant: 'default', environment: 'development', scopes: ['read'] }, async () => {
      const result = await realService.handleCallTool('evolith-ping');
      const env = parseEnvelope(result);
      expect(result.isError).toBe(true);
      expect(env.error.code).toBe(ErrorCodes.FORBIDDEN);
      expect(env.error.message).toContain('No roles present');
    });
  });

  it('allows read tools for developer in production environment', async () => {
    await mcpContextStorage.run({
      id: 'dev-1',
      role: 'developer',
      roles: ['developer'],
      tenant: 'default',
      environment: 'production',
      scopes: ['read'],
    }, async () => {
      const result = await realService.handleCallTool('evolith-ping');
      const env = parseEnvelope(result);
      expect(env.success).toBe(true);
    });
  });

  it('allows write tools for developer in development environment', async () => {
    await mcpContextStorage.run({
      id: 'dev-1',
      role: 'developer',
      roles: ['developer'],
      tenant: 'default',
      environment: 'development',
      scopes: ['read', 'write'],
    }, async () => {
      const result = await realService.handleCallTool('evolith-write-file', {
        apply: true,
        approvalToken: 'dev-token',
      });
      const env = parseEnvelope(result);
      expect(env.success).toBe(true);
    });
  });

  it('blocks write tools for developer in production environment', async () => {
    await mcpContextStorage.run({
      id: 'dev-1',
      role: 'developer',
      roles: ['developer'],
      tenant: 'default',
      environment: 'production',
      scopes: ['read', 'write'],
    }, async () => {
      const result = await realService.handleCallTool('evolith-write-file', {
        apply: true,
        approvalToken: 'dev-token',
      });
      const env = parseEnvelope(result);
      expect(result.isError).toBe(true);
      expect(env.error.code).toBe(ErrorCodes.FORBIDDEN);
      expect(env.error.message).toContain('not allowed');
    });
  });

  describe('context and correlation ID propagation', () => {
    it('propagates and echoes correlation ID and context passed as top-level arguments', async () => {
      await mcpContextStorage.run({
        id: 'dev-1',
        role: 'developer',
        roles: ['developer'],
        tenant: 'default',
        environment: 'development',
        scopes: ['read'],
      }, async () => {
        const result = await realService.handleCallTool('evolith-ping', {
          correlationId: 'test-corr-id-789',
          initiative: 'test-init',
          tenant: 'test-tenant',
          phase: 'discovery',
        });
        const env = parseEnvelope(result);
        expect(env.success).toBe(true);
        expect(env.meta.correlationId).toBe('test-corr-id-789');
        expect(env.meta.context).toEqual({
          initiative: 'test-init',
          tenant: 'test-tenant',
          phase: 'discovery',
        });
      });
    });

    it('propagates and echoes correlation ID and context passed in structured context object', async () => {
      await mcpContextStorage.run({
        id: 'dev-1',
        role: 'developer',
        roles: ['developer'],
        tenant: 'default',
        environment: 'development',
        scopes: ['read'],
      }, async () => {
        const result = await realService.handleCallTool('evolith-ping', {
          context: {
            correlationId: 'test-corr-id-xyz',
            initiative: 'test-init-nested',
            tenant: 'test-tenant-nested',
            phase: 'design',
          }
        });
        const env = parseEnvelope(result);
        expect(env.success).toBe(true);
        expect(env.meta.correlationId).toBe('test-corr-id-xyz');
        expect(env.meta.context).toEqual({
          initiative: 'test-init-nested',
          tenant: 'test-tenant-nested',
          phase: 'design',
        });
      });
    });
  });
});

describe('WebhookAdapter propagation', () => {
  let originalFetch: any;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('propagates requestContextStorage headers to outgoing fetch request', async () => {
    const globalFetchSpy = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = globalFetchSpy as any;

    const adapter = new WebhookAdapter();
    const mockEvidence = {
      gateId: 'gate-1',
      phase: 'discovery',
      verdict: 'passed',
      rulesetRef: 'ref',
      rulesetVersion: '1.0',
      violations: [],
      evaluatedAt: 'time',
      evaluatedBy: 'human',
    } as any;

    await requestContextStorage.run({
      correlationId: 'webhook-corr-id',
      initiative: 'webhook-init',
      tenant: 'webhook-tenant',
      phase: 'discovery',
    }, async () => {
      await adapter.notify('https://example.com/webhook', mockEvidence);
    });

    expect(globalFetchSpy).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-correlation-id': 'webhook-corr-id',
          'x-evolith-initiative': 'webhook-init',
          'x-evolith-tenant': 'webhook-tenant',
          'x-evolith-phase': 'discovery',
        }),
      })
    );
  });
});

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  it('should record audit events with structured fields', () => {
    auditLogger.logToolCall({
      tool: 'evolith-validate',
      args: { path: '/test' },
      context: { initiative: 'test', tenant: 'default', phase: 'discovery', userId: 'user-1', role: 'developer' },
      durationMs: 42,
      status: 'success',
      correlationId: 'evl-test-123',
    });

    const events = auditLogger.getRecentEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      tool: 'evolith-validate',
      args: { path: '/test' },
      context: { initiative: 'test', tenant: 'default', phase: 'discovery', userId: 'user-1', role: 'developer' },
      durationMs: 42,
      status: 'success',
      correlationId: 'evl-test-123',
    });
    expect(events[0].timestamp).toBeDefined();
  });

  it('should record error events with errorMessage', () => {
    auditLogger.logToolCall({
      tool: 'evolith-deploy',
      args: {},
      context: {},
      durationMs: 100,
      status: 'error',
      correlationId: 'evl-err-1',
      errorMessage: 'Deployment failed',
    });

    const events = auditLogger.getRecentEvents();
    expect(events[0].status).toBe('error');
    expect(events[0].errorMessage).toBe('Deployment failed');
  });

  it('should record denied events', () => {
    auditLogger.logToolCall({
      tool: 'evolith-write-file',
      args: {},
      context: {},
      durationMs: 5,
      status: 'denied',
      correlationId: 'evl-deny-1',
    });

    expect(auditLogger.getRecentEvents()[0].status).toBe('denied');
  });

  it('should cap event buffer at 1000', () => {
    for (let i = 0; i < 1100; i++) {
      auditLogger.logToolCall({
        tool: `tool-${i}`,
        args: {},
        context: {},
        durationMs: 1,
        status: 'success',
        correlationId: `evl-${i}`,
      });
    }

    expect(auditLogger.getEventCount()).toBe(1000);
    expect(auditLogger.getRecentEvents()[0].tool).toBe('tool-1099');
  });

  it('should log resource access events', () => {
    auditLogger.logResourceAccess({
      tool: 'read-resource',
      args: { uri: 'file:///test' },
      context: {},
      durationMs: 10,
      status: 'success',
      correlationId: 'evl-res-1',
    });

    const events = auditLogger.getRecentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].tool).toBe('read-resource');
  });

  it('should log prompt access events', () => {
    auditLogger.logPromptAccess({
      tool: 'get-prompt',
      args: { name: 'test-prompt' },
      context: {},
      durationMs: 5,
      status: 'success',
      correlationId: 'evl-prom-1',
    });

    const events = auditLogger.getRecentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].tool).toBe('get-prompt');
  });
});

describe('McpServerService — Audit integration', () => {
  it('logs audit events when AuditLogger is provided', async () => {
    const metrics = new MetricsService();
    const registry = new ToolRegistryService([
      tool('evolith-ping', async () => ({ status: 'pong' })),
    ]);
    const auditLogger = new AuditLogger();
    const service = new McpServerService(registry, metrics, new MockAbacEvaluator(), auditLogger);

    await service.handleCallTool('evolith-ping', { correlationId: 'audit-test-1' });

    const events = auditLogger.getRecentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].tool).toBe('evolith-ping');
    expect(events[0].status).toBe('success');
    expect(events[0].correlationId).toBe('audit-test-1');
    expect(events[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('logs error audit events on tool failure', async () => {
    const metrics = new MetricsService();
    const registry = new ToolRegistryService([
      tool('boom', async () => { throw new Error('kaboom'); }),
    ]);
    const auditLogger = new AuditLogger();
    const service = new McpServerService(registry, metrics, new MockAbacEvaluator(), auditLogger);

    await service.handleCallTool('boom', { correlationId: 'audit-test-err' });

    const events = auditLogger.getRecentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].tool).toBe('boom');
    expect(events[0].status).toBe('error');
    expect(events[0].errorMessage).toBe('kaboom');
  });

  it('does not crash when AuditLogger is not provided', async () => {
    const metrics = new MetricsService();
    const registry = new ToolRegistryService([
      tool('evolith-ping', async () => ({ status: 'pong' })),
    ]);
    const service = new McpServerService(registry, metrics, new MockAbacEvaluator());

    const result = await service.handleCallTool('evolith-ping');
    const env = parseEnvelope(result);
    expect(env.success).toBe(true);
  });
});
