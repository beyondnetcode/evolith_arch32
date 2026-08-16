import { issueGrantForCall } from './approval-grant';
import { PassThrough } from 'node:stream';
import { McpServerService } from './mcp-server.service';
import { MetricsService } from './metrics.service';
import { ToolRegistryService } from './tool-registry.service';
import { AuditLogger } from './audit-logger';
import { AbacEvaluator } from './abac-evaluator';
import { McpTool } from './tool.interface';
import { ErrorCodes } from '../common/errors';
import { LOCAL_SESSION_ID, LOCAL_SESSION_ROLE } from './mcp-auth-contexts';

/**
 * GT-572 — the stdio transport must establish a principal.
 *
 * The published package announced its tools over stdio and then rejected every
 * one of them with FORBIDDEN (ABAC-02, "No roles present on user context"),
 * because `mcpContextStorage.run` was only entered inside the HTTP dispatch
 * closure. These tests drive a REAL JSON-RPC `tools/call` over the real
 * StdioServerTransport (fed by in-memory streams instead of the process's
 * stdin/stdout) and assert on the VERDICT inside the envelope — not merely that
 * a `success` field exists, which is what made the CI smoke blind to the bug.
 *
 * Native ABAC is the real evaluator here (it is what produces ABAC-02). Only the
 * OPA layer is stubbed to abstain, because `policy.wasm` is a gitignored build
 * artifact whose presence in the tree is nondeterministic; the OPA evaluator has
 * its own deterministic coverage in abac-evaluator.spec.ts.
 */
class NativeOnlyAbac extends AbacEvaluator {
  override async evaluateOpa() {
    return { allowed: true, violations: [] };
  }
}

function tool(name: string, execute: McpTool['execute'], mutative = false): McpTool {
  return {
    schema: { name, description: 'd', inputSchema: { type: 'object', properties: {} } },
    mutative,
    execute,
  };
}

/** Minimal newline-delimited JSON-RPC client over a pair of in-memory streams. */
class StdioClient {
  readonly toServer = new PassThrough();
  readonly fromServer = new PassThrough();
  private buffer = '';
  private readonly pending = new Map<number, (msg: any) => void>();

  constructor() {
    this.fromServer.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf-8');
      let idx: number;
      while ((idx = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        if (!line) continue;
        const msg = JSON.parse(line);
        const resolve = typeof msg.id === 'number' ? this.pending.get(msg.id) : undefined;
        if (resolve) {
          this.pending.delete(msg.id);
          resolve(msg);
        }
      }
    });
  }

  notify(method: string, params?: unknown): void {
    this.toServer.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  request(id: number, method: string, params?: unknown): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 15000);
      this.pending.set(id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      this.toServer.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  /** Perform the MCP handshake so the server accepts subsequent requests. */
  async handshake(): Promise<any> {
    const init = await this.request(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'gt-572-spec', version: '1.0.0' },
    });
    this.notify('notifications/initialized');
    return init;
  }
}


/**
 * GT-679 — the local stdio session is a real principal, and its approval is now a
 * server-issued grant rather than any non-empty string. These cases assert the
 * TRANSPORT and the HITL gate staying closed without one; that is unchanged.
 */
function approvedArgs(tool: string, args: Record<string, unknown> = {}, principal = 'local-stdio-session'): Record<string, unknown> {
  const { token } = issueGrantForCall({
    approver: 'operator@example.com',
    principal,
    tenant: 'default',
    tool,
    args,
  });
  return { ...args, apply: true, approvalToken: token };
}

describe('GT-572 — MCP over stdio', () => {
  let service: McpServerService;
  let auditLogger: AuditLogger;
  let client: StdioClient;

  async function startStdio(tools: McpTool[], apiKey?: string): Promise<void> {
    auditLogger = new AuditLogger();
    service = new McpServerService(
      new ToolRegistryService(tools),
      new MetricsService(),
      new NativeOnlyAbac(),
      auditLogger,
    );
    client = new StdioClient();
    await service.start({ transport: 'stdio', stdin: client.toServer, stdout: client.fromServer, apiKey });
    await client.handshake();
  }

  afterEach(async () => {
    await service?.stop();
  });

  it('a real tools/call over stdio returns a verdict, not FORBIDDEN', async () => {
    // A governance read tool that answers with an actual verdict.
    await startStdio([
      tool('evolith-evaluate', async () => ({ verdict: 'FAIL', violations: [{ id: 'HEX-01' }] })),
    ]);

    const res = await client.request(2, 'tools/call', { name: 'evolith-evaluate', arguments: {} });

    expect(res.error).toBeUndefined();
    const envelope = JSON.parse(res.result.content[0].text);

    // The assertion the CI smoke could not make: a FORBIDDEN envelope also has a
    // `success` field, so the verdict itself has to be inspected.
    expect(envelope.error?.code).not.toBe(ErrorCodes.FORBIDDEN);
    expect(res.result.isError).toBeFalsy();
    expect(envelope.success).toBe(true);
    expect(envelope.data.verdict).toBe('FAIL');
    expect(envelope.meta.tool).toBe('evolith-evaluate');
  }, 20000);

  it('attributes stdio calls to the explicit local-session principal in the audit trail', async () => {
    await startStdio([tool('evolith-evaluate', async () => ({ verdict: 'PASS' }))]);

    await client.request(2, 'tools/call', {
      name: 'evolith-evaluate',
      arguments: { correlationId: 'stdio-audit-1' },
    });

    const event = auditLogger.getRecentEvents().find((e) => e.correlationId === 'stdio-audit-1');
    expect(event).toBeDefined();
    expect(event!.status).toBe('success');
    expect(event!.context.userId).toBe(LOCAL_SESSION_ID);
    expect(event!.context.role).toBe(LOCAL_SESSION_ROLE);
  }, 20000);

  it('lists the tool surface over stdio instead of filtering it away', async () => {
    await startStdio([
      tool('evolith-evaluate', async () => ({ verdict: 'PASS' })),
      tool('evolith-adr-create', async () => ({ created: true }), true),
    ]);

    const res = await client.request(2, 'tools/list');
    // GT-581: the order is lexicographic, not registration order — `tools/list`
    // is deterministic so a reshuffled DI graph cannot invalidate a client cache.
    expect(res.result.tools.map((t: { name: string }) => t.name)).toEqual([
      'evolith-adr-create',
      'evolith-evaluate',
    ]);
  }, 20000);

  it('keeps the mutative HITL gate closed over stdio (no approval token → FORBIDDEN)', async () => {
    const execute = jest.fn(async () => ({ created: true }));
    await startStdio([tool('evolith-adr-create', execute, true)]);

    const denied = await client.request(2, 'tools/call', { name: 'evolith-adr-create', arguments: {} });
    const deniedEnvelope = JSON.parse(denied.result.content[0].text);
    expect(deniedEnvelope.error.code).toBe(ErrorCodes.FORBIDDEN);
    expect(deniedEnvelope.error.message).toContain('requires approval');
    expect(execute).not.toHaveBeenCalled();

    // With the approval token the same call proceeds: the local session is a real
    // principal, so ABAC allows the write class — the gate that stays is HITL.
    const approved = await client.request(3, 'tools/call', {
      name: 'evolith-adr-create',
      arguments: approvedArgs('evolith-adr-create'),
    });
    expect(JSON.parse(approved.result.content[0].text).success).toBe(true);
    expect(execute).toHaveBeenCalled();
  }, 20000);

  it('applies production ABAC rules to the stdio session (deploy-class stays denied)', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const execute = jest.fn(async () => ({ deployed: true }));
      // A production stdio server only boots with the credential configured
      // (GT-572, second pass); the point of this test is the ABAC rule, not the
      // startup gate, so supply it.
      await startStdio([tool('evolith-deploy', execute, true)], 'production-key');

      const res = await client.request(2, 'tools/call', {
        name: 'evolith-deploy',
        arguments: approvedArgs('evolith-deploy'),
      });
      const envelope = JSON.parse(res.result.content[0].text);
      expect(envelope.error.code).toBe(ErrorCodes.FORBIDDEN);
      expect(envelope.error.message).toContain('ABAC check failed');
      expect(execute).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  }, 20000);
});

describe('GT-572 — the local session is bound to stdio only', () => {
  it('does not leak a principal into a service started on HTTP', async () => {
    const service = new McpServerService(
      new ToolRegistryService([tool('evolith-evaluate', async () => ({ verdict: 'PASS' }))]),
      new MetricsService(),
      new NativeOnlyAbac(),
    );
    await service.start({ transport: 'http', port: 0, apiKey: 'secret' });
    try {
      // Dispatch reached without an authenticated context stays fail-closed: the
      // HTTP transport must never inherit the stdio local-session identity.
      const result = await service.handleCallTool('evolith-evaluate', {});
      const envelope = JSON.parse(result.content[0].text);
      expect(result.isError).toBe(true);
      expect(envelope.error.code).toBe(ErrorCodes.FORBIDDEN);
      expect(envelope.error.message).toContain('No roles present');
    } finally {
      await service.stop();
    }
  });

  it('warns instead of silently ignoring --allow-no-auth on stdio', async () => {
    const service = new McpServerService(
      new ToolRegistryService([]),
      new MetricsService(),
      new NativeOnlyAbac(),
    );
    const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    try {
      await service.start({ transport: 'stdio', allowNoAuth: true, stdin, stdout });
      const messages = warn.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes('--allow-no-auth') && m.includes('HTTP transport only'))).toBe(true);
    } finally {
      warn.mockRestore();
      await service.stop();
    }
  });
});
