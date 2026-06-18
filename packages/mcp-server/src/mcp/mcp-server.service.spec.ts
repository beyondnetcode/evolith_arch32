import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'fs-extra';
import { McpServerService, ToolCallResult } from './mcp-server.service';
import { MetricsService } from './metrics.service';
import { ToolRegistryService } from './tool-registry.service';
import { McpTool } from './tool.interface';
import { DomainException, ErrorCodes } from '../common/errors';

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
    service = new McpServerService(registry, metrics);
  }

  it('lists registered tool schemas', () => {
    build([tool('evolith-validate', async () => ({}))]);
    expect(service.handleListTools().tools).toEqual([
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

  describe('mutative gate', () => {
    it('blocks a mutative tool without confirmation', async () => {
      build([tool('mutate', async () => ({ done: true }), true)]);
      jest.spyOn(service, 'isMutationAllowed').mockResolvedValue(false);

      const result = await service.handleCallTool('mutate', {});
      const env = parseEnvelope(result);
      expect(result.isError).toBe(true);
      expect(env.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('allows a mutative tool when confirm=true', async () => {
      const execute = jest.fn(async () => ({ done: true }));
      build([tool('mutate', execute, true)]);

      const env = parseEnvelope(await service.handleCallTool('mutate', { confirm: true }));
      expect(env.success).toBe(true);
      expect(execute).toHaveBeenCalled();
    });

    it('allows a mutative tool when mcp.allowMutations is set in evolith.yaml', async () => {
      const execute = jest.fn(async () => ({ done: true }));
      build([tool('mutate', execute, true)]);
      jest.spyOn(service, 'isMutationAllowed').mockResolvedValue(true);

      const env = parseEnvelope(await service.handleCallTool('mutate', { dir: '/x' }));
      expect(env.success).toBe(true);
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
  ): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { host: '127.0.0.1', port, path: urlPath, method: 'GET', headers },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
        },
      );
      req.on('error', reject);
      req.end();
    });
  }

  it('serves /health and enforces the API key', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService());
    await service.start({ transport: 'http', port: 0, apiKey: 'secret' });
    const port = service.boundPort()!;

    try {
      const unauthorized = await httpGet(port, '/health');
      expect(unauthorized.status).toBe(401);

      const ok = await httpGet(port, '/health', { 'x-api-key': 'secret' });
      expect(ok.status).toBe(200);
      expect(JSON.parse(ok.body)).toMatchObject({ status: 'ok', transport: 'http' });
    } finally {
      await service.stop();
    }
  });

  it('allows /health without auth when no API key is configured', async () => {
    const service = new McpServerService(new ToolRegistryService([]), new MetricsService());
    await service.start({ transport: 'http', port: 0 });
    const port = service.boundPort()!;

    try {
      const ok = await httpGet(port, '/health');
      expect(ok.status).toBe(200);
    } finally {
      await service.stop();
    }
  });
});
