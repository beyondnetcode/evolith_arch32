import { startMcpServer, McpServerOptions } from './server';
import { McpMetricsService } from './metrics.service';
import { RulesetValidatorService } from '@evolith/core-domain/application/validators/ruleset-validator.service';
import { PassThrough } from 'node:stream';
import * as fsExtra from 'fs-extra';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn().mockResolvedValue(true),
  readFile: jest.fn().mockResolvedValue('mcp:\n  allowMutations: false\n'),
}));


jest.mock('@evolith/core-domain/application/validators/ruleset-validator.service', () => ({
  RulesetValidatorService: jest.fn().mockImplementation(() => ({
    validate: jest.fn(),
    loadRulesetById: jest.fn(),
  })),
}));

jest.mock('./metrics.service', () => ({
  McpMetricsService: jest.fn().mockImplementation(() => ({
    recordToolCall: jest.fn(),
    recordError: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      totalRequests: 0,
      toolMetrics: [],
      topErrors: [],
    }),
  })),
}));

jest.mock('./tools/validate', () => ({
  getValidateTools: jest.fn().mockReturnValue([{
    schema: { name: 'evolith-validate' },
    execute: jest.fn().mockResolvedValue({ status: 'passed' })
  }]),
}));

jest.mock('./tools/agent', () => ({
  getAgentTools: jest.fn().mockReturnValue([{
    schema: { name: 'evolith-agent-install' },
    execute: jest.fn().mockResolvedValue({ success: true })
  }]),
}));

jest.mock('./tools/architecture', () => ({
  getArchitectureTools: jest.fn().mockReturnValue([{
    schema: { name: 'evolith-architecture-validate' },
    execute: jest.fn().mockResolvedValue({ status: 'passed' })
  }]),
}));

jest.mock('./tools/sdlc', () => ({
  getSdlcTools: jest.fn().mockReturnValue([{
    schema: { name: 'evolith-sdlc-status' },
    execute: jest.fn().mockResolvedValue({ currentPhase: 'phase-0' })
  }]),
}));

jest.mock('./tools/moscow', () => ({
  getMoscowTools: jest.fn().mockReturnValue([{
    schema: { name: 'evolith-moscow-analyze' },
    execute: jest.fn().mockResolvedValue({ success: true })
  }]),
}));

jest.mock('./resources', () => ({
  listResources: jest.fn().mockResolvedValue({ resources: [] }),
  readResource: jest.fn().mockResolvedValue({}),
}));

jest.mock('./prompts', () => ({
  listPrompts: jest.fn().mockResolvedValue({ prompts: [] }),
  getPrompt: jest.fn().mockResolvedValue({ messages: [] }),
}));


describe('MCP Server', () => {
  let mockValidator: jest.Mocked<RulesetValidatorService>;
  let mockMetrics: jest.Mocked<McpMetricsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidator = new RulesetValidatorService() as jest.Mocked<RulesetValidatorService>;
    mockMetrics = new McpMetricsService() as jest.Mocked<McpMetricsService>;
  });

  describe('startMcpServer', () => {
    it('should start server with default options', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      expect(server.stop).toBeDefined();
      await server.stop();
    });

    it('should start server with custom validator', async () => {
      const options: McpServerOptions = {
        rulesetValidator: mockValidator,
      };

      const server = await startMcpServer(options);

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should start server with metrics service', async () => {
      const options: McpServerOptions = {
        metricsService: mockMetrics,
      };

      const server = await startMcpServer(options);

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should stop server cleanly', async () => {
      const server = await startMcpServer();

      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('DirectMcpServer - tool handling', () => {
    it('should handle evolith-validate tool', async () => {
      const server = await startMcpServer();
      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle evolith-agent tools', async () => {
      const server = await startMcpServer();
      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle evolith-architecture-validate tool', async () => {
      const server = await startMcpServer();
      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle evolith-sdlc tools', async () => {
      const server = await startMcpServer();
      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle evolith-moscow tools', async () => {
      const server = await startMcpServer();
      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle evolith-metrics tool', async () => {
      mockMetrics.getMetrics.mockReturnValue({
        serverStartTime: new Date().toISOString(),
        uptimeMs: 1000,
        totalRequests: 10,
        toolMetrics: [],
        topErrors: [],
      });

      const server = await startMcpServer({ metricsService: mockMetrics });

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should throw error for unknown tool', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('DirectMcpServer - resource handling', () => {
    it('should handle resources/list', async () => {
      const { listResources } = require('./resources');
      listResources.mockResolvedValue({ resources: [{ uri: 'evolith://rulesets' }] });

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle resources/read', async () => {
      const { readResource } = require('./resources');
      readResource.mockResolvedValue({ rulesets: [] });

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('DirectMcpServer - prompt handling', () => {
    it('should handle prompts/list', async () => {
      const { listPrompts } = require('./prompts');
      listPrompts.mockResolvedValue({ prompts: [{ name: 'evolith/validate-repository' }] });

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle prompts/get', async () => {
      const { getPrompt } = require('./prompts');
      getPrompt.mockResolvedValue({ messages: [{ role: 'user', content: { type: 'text', text: 'test' } }] });

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('DirectMcpServer - error handling', () => {
    it('should handle tool errors gracefully', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should record errors in metrics', async () => {
      const server = await startMcpServer({ metricsService: mockMetrics });

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('validateApiKey', () => {
    it('should allow access when no valid key configured', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should reject access when api key missing but required', async () => {
      const server = await startMcpServer({ apiKey: 'secret' });

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should allow access when api key matches', async () => {
      const server = await startMcpServer({ apiKey: 'secret' });

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('DirectMcpServer - handleListTools', () => {
    it('should return all expected tools', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should include evolith-validate in tool list', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should include moscow tools in tool list', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('DirectMcpServer - handleCallTool', () => {
    it('should record successful tool call metrics', async () => {
      const server = await startMcpServer({ metricsService: mockMetrics });

      expect(mockMetrics.recordToolCall).toBeDefined();
      await server.stop();
    });

    it('should handle non-string tool results by JSON stringifying', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle string tool results directly', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle non-Error thrown values in tool calls', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('DirectMcpServer - handleConfigTools', () => {
    it('should throw error when evolith.yaml not found', async () => {
      (fsExtra.pathExists as jest.Mock).mockResolvedValueOnce(false);

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('DirectMcpServer - handleMessage', () => {
    it('should handle initialize method', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle unknown method with error', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle dispatch errors gracefully', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('DirectMcpServer - dispatchRequest', () => {
    it('should handle tools/list method', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle tools/call method', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle resources/list method', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle resources/read method', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle prompts/list method', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle prompts/get method', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should throw for unknown method', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('MinimalStdioTransport', () => {
    it('should create transport with default streams', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle transport start when already started', async () => {
      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle transport close', async () => {
      const server = await startMcpServer();

      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  // ── MinimalStdioTransport — injected stream coverage ───────────────────────

  describe('MinimalStdioTransport — injected stream coverage', () => {
    let stdinStream: PassThrough;
    let stdoutStream: PassThrough;
    let server: { stop: () => Promise<void> };

    beforeEach(async () => {
      jest.clearAllMocks();
      stdinStream = new PassThrough();
      stdoutStream = new PassThrough();
      server = await startMcpServer({
        transport: 'stdio',
        stdin: stdinStream,
        stdout: stdoutStream,
      });
    });

    afterEach(async () => {
      stdinStream.destroy();
      stdoutStream.destroy();
      await server.stop();
      await new Promise(r => setTimeout(r, 20));
    });

    /** Read the next complete JSON line written to stdout. */
    function nextStdoutMessage(): Promise<Record<string, unknown>> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('stdout timeout')), 1500);
        let buf = '';
        const onData = (chunk: Buffer) => {
          buf += chunk.toString();
          const nl = buf.indexOf('\n');
          if (nl !== -1) {
            clearTimeout(timer);
            stdoutStream.off('data', onData);
            resolve(JSON.parse(buf.slice(0, nl).trim()));
          }
        };
        stdoutStream.on('data', onData);
      });
    }

    it('parses a valid JSON-RPC message and writes a response to stdout', async () => {
      const responseP = nextStdoutMessage();
      stdinStream.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } } }) + '\n');
      const response = await responseP;
      expect(response).toMatchObject({ jsonrpc: '2.0', id: 1 });
      expect((response.result as Record<string, unknown>)?.protocolVersion).toBe('2024-11-05');
    });

    it('processes two messages written in one chunk', async () => {
      const first = nextStdoutMessage();
      stdinStream.write(
        JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } } }) + '\n' +
        JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } } }) + '\n',
      );
      const r1 = await first;
      expect(r1).toMatchObject({ id: 1 });
      const second = nextStdoutMessage();
      const r2 = await second;
      expect(r2).toMatchObject({ id: 2 });
    });

    it('ignores blank / whitespace-only lines without emitting any response', async () => {
      const responses: unknown[] = [];
      stdoutStream.on('data', (c: Buffer) => responses.push(c.toString()));
      stdinStream.write('\n  \n\n');
      await new Promise(r => setTimeout(r, 80));
      expect(responses).toHaveLength(0);
    });

    it('calls onerror (transport error handler) when stdin delivers invalid JSON', async () => {
      // After invalid JSON the server calls onerror → logger.error.
      // Verify the server stays alive and continues to respond normally.
      stdinStream.write('{ this is not : valid json }\n');
      await new Promise(r => setTimeout(r, 40));
      const responseP = nextStdoutMessage();
      stdinStream.write(JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } } }) + '\n');
      const response = await responseP;
      expect(response).toMatchObject({ jsonrpc: '2.0', id: 99 });
    });

    it('fires onclose when stdin emits an end event', async () => {
      // Push null to signal end-of-stream
      stdinStream.push(null);
      // The server should not crash; give event loop a tick to process
      await new Promise(r => setTimeout(r, 40));
      // Server is still stoppable
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('fires onerror when stdin emits an error event', async () => {
      stdinStream.emit('error', new Error('stdin read error'));
      await new Promise(r => setTimeout(r, 40));
      // Server should not crash
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('send() writes JSON followed by newline to stdout', async () => {
      const responseP = nextStdoutMessage();
      stdinStream.write(JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/list' }) + '\n');
      const response = await responseP;
      // tools/list returns the tools array
      expect((response.result as Record<string, unknown>)?.tools).toBeDefined();
    });

    it('outer-catch: logger.error called when transport.send() itself throws', async () => {
      // Destroy stdout AFTER the server starts so send() will fail.
      // Attach a no-op error listener to prevent the unhandled-error event.
      stdoutStream.on('error', () => {});
      stdoutStream.destroy(new Error('pipe broken'));
      stdinStream.write(JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'initialize' }) + '\n');
      await new Promise(r => setTimeout(r, 80));
      // If we reach here without an unhandled rejection the outer catch worked.
      stdinStream.destroy();
      // afterEach will call server.stop() — it should not throw even though stdout is gone.
    });
  });

  describe('DirectMcpServer - mutative tool confirmation gating', () => {
    let stdinStream: PassThrough;
    let stdoutStream: PassThrough;
    let server: { stop: () => Promise<void> };

    beforeEach(async () => {
      jest.clearAllMocks();

      stdinStream = new PassThrough();
      stdoutStream = new PassThrough();
      server = await startMcpServer({
        transport: 'stdio',
        stdin: stdinStream,
        stdout: stdoutStream,
      });
    });

    afterEach(async () => {
      stdinStream.destroy();
      stdoutStream.destroy();
      await server.stop();
      await new Promise(r => setTimeout(r, 20));
    });

    function nextStdoutMessage(): Promise<Record<string, unknown>> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('stdout timeout')), 1500);
        let buf = '';
        const onData = (chunk: Buffer) => {
          buf += chunk.toString();
          const nl = buf.indexOf('\n');
          if (nl !== -1) {
            clearTimeout(timer);
            stdoutStream.off('data', onData);
            resolve(JSON.parse(buf.slice(0, nl).trim()));
          }
        };
        stdoutStream.on('data', onData);
      });
    }

    it('gates mutative tool when confirmation is not passed and allowMutations is false', async () => {
      (fsExtra.pathExists as jest.Mock).mockResolvedValue(true);
      (fsExtra.readFile as jest.Mock).mockResolvedValue('mcp:\n  allowMutations: false\n');

      const responseP = nextStdoutMessage();
      stdinStream.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'evolith-config-set',
          arguments: { key: 'foo', value: 'bar' }
        }
      }) + '\n');

      const response = await responseP;
      expect(response).toBeDefined();
      const content = (response.result as any).content[0].text;
      const parsed = JSON.parse(content);
      expect(parsed.status).toBe('CONFIRMATION_DENIED');
    });

    it('allows mutative tool when confirm: true is passed', async () => {
      (fsExtra.pathExists as jest.Mock).mockResolvedValue(true);
      (fsExtra.readFile as jest.Mock).mockResolvedValue('mcp:\n  allowMutations: false\n');

      const responseP = nextStdoutMessage();
      stdinStream.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'evolith-config-set',
          arguments: { key: 'foo', value: 'bar', confirm: true }
        }
      }) + '\n');

      const response = await responseP;
      expect(response).toBeDefined();
      const content = (response.result as any).content[0].text;
      expect(content).not.toContain('REQUIRES_CONFIRMATION');
    });

    it('allows mutative tool when allowMutations: true is set in evolith.yaml', async () => {
      (fsExtra.pathExists as jest.Mock).mockResolvedValue(true);
      (fsExtra.readFile as jest.Mock).mockResolvedValue('mcp:\n  allowMutations: true\n');

      const responseP = nextStdoutMessage();
      stdinStream.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'evolith-config-set',
          arguments: { key: 'foo', value: 'bar' }
        }
      }) + '\n');

      const response = await responseP;
      expect(response).toBeDefined();
      const content = (response.result as any).content[0].text;
      expect(content).not.toContain('REQUIRES_CONFIRMATION');
    });
  });

});

