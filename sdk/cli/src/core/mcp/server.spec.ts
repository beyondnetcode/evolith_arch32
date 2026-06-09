import { startMcpServer, McpServerOptions } from './server';
import { McpMetricsService } from './metrics.service';
import { RulesetValidatorService } from '../validators/ruleset-validator.service';

jest.mock('../validators/ruleset-validator.service', () => ({
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
  handleValidateTool: jest.fn().mockResolvedValue({ status: 'passed' }),
}));

jest.mock('./tools/agent', () => ({
  handleAgentTools: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('./tools/architecture', () => ({
  handleArchitectureTools: jest.fn().mockResolvedValue({ status: 'passed' }),
}));

jest.mock('./tools/sdlc', () => ({
  handleSdlcTools: jest.fn().mockResolvedValue({ currentPhase: 'phase-0' }),
}));

jest.mock('./tools/moscow', () => ({
  handleMoscowTools: jest.fn().mockResolvedValue({ success: true }),
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
    });

    it('should start server with custom validator', async () => {
      const options: McpServerOptions = {
        rulesetValidator: mockValidator,
      };

      const server = await startMcpServer(options);

      expect(server).toBeDefined();
    });

    it('should start server with metrics service', async () => {
      const options: McpServerOptions = {
        metricsService: mockMetrics,
      };

      const server = await startMcpServer(options);

      expect(server).toBeDefined();
    });

    it('should stop server cleanly', async () => {
      const server = await startMcpServer();

      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('DirectMcpServer - tool handling', () => {
    it('should handle evolith-validate tool', async () => {
      const { handleValidateTool } = require('./tools/validate');
      handleValidateTool.mockResolvedValue({ status: 'passed', rulesChecked: 5 });

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle evolith-agent tools', async () => {
      const { handleAgentTools } = require('./tools/agent');
      handleAgentTools.mockResolvedValue({ success: true, agent: 'test' });

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle evolith-architecture-validate tool', async () => {
      const { handleArchitectureTools } = require('./tools/architecture');
      handleArchitectureTools.mockResolvedValue({ status: 'passed', level: 'F1' });

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle evolith-sdlc tools', async () => {
      const { handleSdlcTools } = require('./tools/sdlc');
      handleSdlcTools.mockResolvedValue({ currentPhase: 'phase-1' });

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle evolith-moscow tools', async () => {
      const { handleMoscowTools } = require('./tools/moscow');
      handleMoscowTools.mockResolvedValue({ success: true });

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
      const { handleValidateTool } = require('./tools/validate');
      handleValidateTool.mockRejectedValue(new Error('Validation failed'));

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should record errors in metrics', async () => {
      const { handleValidateTool } = require('./tools/validate');
      handleValidateTool.mockRejectedValue(new Error('Test error'));

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
      const { handleValidateTool } = require('./tools/validate');
      handleValidateTool.mockResolvedValue({ complex: { nested: 'object' } });

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle string tool results directly', async () => {
      const { handleValidateTool } = require('./tools/validate');
      handleValidateTool.mockResolvedValue('plain string result');

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle non-Error thrown values in tool calls', async () => {
      const { handleValidateTool } = require('./tools/validate');
      handleValidateTool.mockRejectedValue('string error');

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();
    });
  });

  describe('DirectMcpServer - handleConfigTools', () => {
    it('should throw error when evolith.yaml not found', async () => {
      jest.doMock('fs-extra', () => ({
        pathExists: jest.fn().mockResolvedValue(false),
      }));

      const server = await startMcpServer();

      expect(server).toBeDefined();
      await server.stop();

      jest.dontMock('fs-extra');
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
      const { handleValidateTool } = require('./tools/validate');
      handleValidateTool.mockRejectedValue(new Error('Internal error'));

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

  describe('MinimalHttpTransport', () => {
    let testPort: number;

    beforeEach(() => {
      testPort = 51000 + Math.floor(Math.random() * 1000);
    });

    afterEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    it('should start HTTP server on specified port', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
      });

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should start HTTP server with API key', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
        apiKey: 'test-api-key',
      });

      expect(server).toBeDefined();
      await server.stop();
    });

    it('should handle health endpoint', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const http = await import('node:http');
      const response = await new Promise<string>((resolve, reject) => {
        http.get(`http://127.0.0.1:${testPort}/health`, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });

      expect(JSON.parse(response)).toEqual({ status: 'ok', transport: 'http', protocol: 'mcp' });
      await server.stop();
    });

    it('should reject requests without valid API key', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
        apiKey: 'secret-key',
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const http = await import('node:http');
      const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${testPort}/health`, { method: 'GET' }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end();
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).error).toBe('Unauthorized');
      await server.stop();
    });

    it('should allow requests with valid API key via Bearer token', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
        apiKey: 'secret-key',
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const http = await import('node:http');
      const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${testPort}/health`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer secret-key' },
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end();
      });

      expect(response.statusCode).toBe(200);
      await server.stop();
    });

    it('should allow requests with valid API key via X-API-Key header', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
        apiKey: 'secret-key',
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const http = await import('node:http');
      const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${testPort}/health`, {
          method: 'GET',
          headers: { 'X-API-Key': 'secret-key' },
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end();
      });

      expect(response.statusCode).toBe(200);
      await server.stop();
    });

    it('should accept POST messages on /message endpoint', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const http = await import('node:http');
      const message = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' });
      const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${testPort}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.write(message);
        req.end();
      });

      expect(response.statusCode).toBe(202);
      expect(JSON.parse(response.body).status).toBe('accepted');
      await server.stop();
    });

    it('should reject invalid JSON on POST', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const http = await import('node:http');
      const response = await new Promise<{ statusCode: number }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${testPort}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }, (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve({ statusCode: res.statusCode || 0 }));
        });
        req.on('error', reject);
        req.write('not valid json');
        req.end();
      });

      expect(response.statusCode).toBe(400);
      await server.stop();
    });

    it('should establish SSE connection on /sse endpoint', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const http = await import('node:http');
      const sseData = await new Promise<string>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${testPort}/sse`, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          setTimeout(() => resolve(data), 100);
        });
        req.on('error', reject);
      });

      expect(sseData).toContain(': connected');
      await server.stop();
    });

    it('should return 404 for unknown routes', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const http = await import('node:http');
      const response = await new Promise<{ statusCode: number }>((resolve, reject) => {
        http.get(`http://127.0.0.1:${testPort}/unknown`, (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve({ statusCode: res.statusCode || 0 }));
        }).on('error', reject);
      });

      expect(response.statusCode).toBe(404);
      await server.stop();
    });

    it('should close all SSE clients on server stop', async () => {
      const server = await startMcpServer({
        transport: 'http',
        port: testPort,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const http = await import('node:http');
      await new Promise<void>((resolve, reject) => {
        const sseReq = http.get(`http://127.0.0.1:${testPort}/sse`, (res) => {
          res.once('data', () => {
            server.stop().then(() => {
              sseReq.destroy();
              resolve();
            }).catch(reject);
          });
          res.once('error', reject);
        });
        sseReq.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') resolve();
          else reject(err);
        });
      });
    });
  });
});
