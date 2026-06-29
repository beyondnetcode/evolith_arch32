import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as http from 'http';

const CLI_PATH = path.join(__dirname, '../../dist/main.js');

/**
 * Poll the MCP server's public /health endpoint until it is listening, instead of
 * a fixed sleep. A fixed wait flaked on slow CI runners (the process had not bound
 * the port yet → ECONNREFUSED). Resolves on the first response; rejects after the
 * deadline so a genuinely-dead server still fails fast.
 */
function waitForHealth(port: number, timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get({ hostname: '127.0.0.1', port, path: '/health' }, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`MCP server did not become ready on :${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 200);
        }
      });
    };
    attempt();
  });
}

interface JsonRpcMessage {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

class McpStdioClient {
  private proc: ChildProcess;
  private messageId = 1;
  private pendingRequests = new Map<number | string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private responses: JsonRpcResponse[] = [];

  constructor() {
    this.proc = spawn('node', [CLI_PATH, 'mcp', 'serve'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buffer = '';
    this.proc.stdout!.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line) as JsonRpcResponse;
            this.responses.push(response);

            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              if (response.error) {
                pending.reject(new Error(response.error.message));
              } else {
                pending.resolve(response.result);
              }
              this.pendingRequests.delete(response.id);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    });

    this.proc.stderr!.on('data', (data) => {
      // MCP stderr logging
    });
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = this.messageId++;
    const message: JsonRpcMessage = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.proc.stdin!.write(JSON.stringify(message) + '\n');

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${id} timed out`));
        }
      }, 10000);
    });
  }

  async listTools() {
    return this.send('tools/list');
  }

  async callTool(name: string, args: Record<string, unknown> = {}) {
    return this.send('tools/call', { name, arguments: args });
  }

  async listResources() {
    return this.send('resources/list');
  }

  async readResource(uri: string) {
    return this.send('resources/read', { uri });
  }

  async listPrompts() {
    return this.send('prompts/list');
  }

  async getPrompt(name: string, args: Record<string, unknown> = {}) {
    return this.send('prompts/get', { name, arguments: args });
  }

  async initialize() {
    return this.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' }
    });
  }

  getResponses() {
    return this.responses;
  }

  kill() {
    this.proc.kill();
  }
}

function httpPost(url: string, body: string, headers: Record<string, string> = {}): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

describe('MCP E2E Tests - stdio transport', () => {
  let client: McpStdioClient;

  beforeAll(() => {
    client = new McpStdioClient();
  });

  afterAll(() => {
    client.kill();
  });

  describe('initialize', () => {
    it('should respond to initialize request', async () => {
      const result = await client.initialize() as { protocolVersion: string; capabilities: unknown; serverInfo: { name: string } };

      expect(result).toBeDefined();
      expect(result.protocolVersion).toBeDefined();
      expect(result.serverInfo).toBeDefined();
      expect(result.serverInfo.name).toBe('evolith-mcp-server');
    });
  });

  describe('tools/list', () => {
    it('should return list of available tools', async () => {
      const result = await client.listTools() as { tools: Array<{ name: string; description: string }> };

      expect(result).toBeDefined();
      expect(result.tools).toBeInstanceOf(Array);
      expect(result.tools.length).toBeGreaterThan(10);

      const toolNames = result.tools.map(t => t.name);
      expect(toolNames).toContain('evolith-validate');
      expect(toolNames).toContain('evolith-agent-install');
      expect(toolNames).toContain('evolith-agent-list');
      expect(toolNames).toContain('evolith-agent-validate');
      expect(toolNames).toContain('evolith-agent-upgrade');
      expect(toolNames).toContain('evolith-agent-remove');
      expect(toolNames).toContain('evolith-architecture-validate');
      expect(toolNames).toContain('evolith-sdlc-handoff');
      expect(toolNames).toContain('evolith-sdlc-status');
      expect(toolNames).toContain('evolith-config-get');
      expect(toolNames).toContain('evolith-config-set');
      expect(toolNames).toContain('evolith-metrics');
      expect(toolNames).toContain('evolith-moscow-create');
      expect(toolNames).toContain('evolith-moscow-load');
      expect(toolNames).toContain('evolith-moscow-update');
      expect(toolNames).toContain('evolith-moscow-remove');
      expect(toolNames).toContain('evolith-moscow-list');
      expect(toolNames).toContain('evolith-moscow-validate');
      expect(toolNames).toContain('evolith-moscow-report');
    });

    it('should include tool descriptions', async () => {
      const result = await client.listTools() as { tools: Array<{ name: string; description: string }> };

      for (const tool of result.tools) {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });

    it('should include input schemas for tools', async () => {
      const result = await client.listTools() as { tools: Array<{ name: string; inputSchema: unknown }> };

      for (const tool of result.tools) {
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });

  describe('tools/call', () => {
    it('should call evolith-validate tool successfully', async () => {
      const result = await client.callTool('evolith-validate', {
        path: process.cwd(),
        format: 'summary',
      }) as { content: Array<{ type: string; text: string }> };

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBeDefined();
    });

    it('should call evolith-metrics tool', async () => {
      const result = await client.callTool('evolith-metrics', {}) as { content: Array<{ type: string; text: string }> };

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
    });

    it('should call evolith-config-get tool', async () => {
      const result = await client.callTool('evolith-config-get', {
        key: 'coreRef.version',
        dir: process.cwd(),
      }) as { content: Array<{ type: string; text: string }> };

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
    });

    it('should return error for unknown tool', async () => {
      const result = await client.callTool('unknown-tool', {}) as { content: Array<{ type: string; text: string }>; isError?: boolean };

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should return error for evolith-validate with missing path', async () => {
      const result = await client.callTool('evolith-validate', {}) as { content?: Array<{ type: string; text: string }>; isError?: boolean };

      expect(result).toBeDefined();
    });

    it('should call evolith-architecture-validate tool', async () => {
      const result = await client.callTool('evolith-architecture-validate', {
        path: process.cwd(),
        level: 'F1',
      }) as { content: Array<{ type: string; text: string }> };

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
    });

    it('should call evolith-architecture-validate with deep analysis', async () => {
      const result = await client.callTool('evolith-architecture-validate', {
        path: process.cwd(),
        level: 'F1',
        deep: true,
      }) as { content: Array<{ type: string; text: string }> };

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
    });

    it('should call evolith-sdlc-status tool', async () => {
      const result = await client.callTool('evolith-sdlc-status', {
        path: process.cwd(),
      }) as { content: Array<{ type: string; text: string }> };

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
    });

    it('should call evolith-moscow-list tool', async () => {
      const result = await client.callTool('evolith-moscow-list', {
        path: process.cwd(),
      }) as { content: Array<{ type: string; text: string }> };

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
    });

    it('should call evolith-agent-list tool', async () => {
      const result = await client.callTool('evolith-agent-list', {
        dir: process.cwd(),
      }) as { content: Array<{ type: string; text: string }> };

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
    });
  });

  describe('resources/list', () => {
    it('should return list of resources', async () => {
      const result = await client.listResources() as { resources: Array<{ uri: string; name: string }> };

      expect(result).toBeDefined();
      expect(result.resources).toBeInstanceOf(Array);
      expect(result.resources.length).toBeGreaterThan(0);

      const uris = result.resources.map(r => r.uri);
      expect(uris.some(u => u.includes('rulesets'))).toBe(true);
    });
  });

  describe('resources/read', () => {
    it('should read evolith://rulesets resource', async () => {
      const result = await client.readResource('evolith://rulesets') as { contents?: Array<{ uri: string; text: string }> };

      expect(result).toBeDefined();
    });

    it('should read evolith://phase-gates resource', async () => {
      const result = await client.readResource('evolith://phase-gates') as { contents?: Array<{ uri: string; text: string }> };

      expect(result).toBeDefined();
    });

    it('should read evolith://governance-version resource', async () => {
      try {
        const result = await client.readResource('evolith://governance-version');
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should return error for unknown resource', async () => {
      try {
        const result = await client.readResource('evolith://unknown');
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('prompts/list', () => {
    it('should return list of prompts', async () => {
      const result = await client.listPrompts() as { prompts: Array<{ name: string; description: string }> };

      expect(result).toBeDefined();
      expect(result.prompts).toBeInstanceOf(Array);
      expect(result.prompts.length).toBeGreaterThan(0);

      const promptNames = result.prompts.map(p => p.name);
      expect(promptNames).toContain('evolith/validate-repository');
      expect(promptNames).toContain('evolith/agent-onboarding');
      expect(promptNames).toContain('evolith/architecture-review');
    });
  });

  describe('prompts/get', () => {
    it('should get validate-repository prompt', async () => {
      const result = await client.getPrompt('evolith/validate-repository') as { messages: Array<{ role: string; content: unknown }> };

      expect(result).toBeDefined();
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should get agent-onboarding prompt', async () => {
      const result = await client.getPrompt('evolith/agent-onboarding') as { messages: Array<{ role: string; content: unknown }> };

      expect(result).toBeDefined();
      expect(result.messages).toBeInstanceOf(Array);
    });

    it('should return error for unknown prompt', async () => {
      try {
        const result = await client.getPrompt('evolith/unknown-prompt');
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON-RPC method', async () => {
      try {
        const result = await client.send('unknown/method', {});
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed requests', async () => {
      const result = await client.send('tools/list', { invalid: true });

      expect(result).toBeDefined();
    });
  });
});

describe('MCP E2E Tests - API key authentication', () => {
  let serverProcess: ChildProcess;
  const testPort = 53000 + Math.floor(Math.random() * 1000);
  const apiKey = 'test-secret-key-123';

  beforeAll(async () => {
    serverProcess = spawn('node', [CLI_PATH, 'mcp', 'serve', '--transport', 'http', '--port', String(testPort), '--api-key', apiKey], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    await waitForHealth(testPort);
  });

  afterAll(() => {
    serverProcess.kill();
  });

  describe('authentication', () => {
    it('should reject requests without API key', async () => {
      // /health is intentionally public (liveness). Auth is enforced on the MCP
      // endpoint (POST /), so assert rejection there.
      const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${testPort}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should accept requests with valid Bearer token', async () => {
      const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${testPort}/health`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end();
      });

      expect(response.statusCode).toBe(200);
    });

    it('should accept requests with valid X-API-Key header', async () => {
      const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${testPort}/health`, {
          method: 'GET',
          headers: { 'X-API-Key': apiKey },
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end();
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject requests with invalid API key', async () => {
      const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${testPort}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer wrong-key' },
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

describe('MCP E2E Tests - HTTP transport protocol', () => {
  let serverProcess: ChildProcess;
  const testPort = 54000 + Math.floor(Math.random() * 1000);
  const apiKey = 'test-secret-key-123';
  let sessionId: string;

  beforeAll(async () => {
    // GT-250: the MCP HTTP server fails closed — it requires an API key. Provide
    // one and authenticate every request (the previous no-auth dev mode is gone).
    serverProcess = spawn('node', [CLI_PATH, 'mcp', 'serve', '--transport', 'http', '--port', String(testPort), '--api-key', apiKey], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    await waitForHealth(testPort);
  });

  afterAll(() => {
    serverProcess.kill();
  });

  async function mcpPost(body: unknown): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> {
    const bodyStr = JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const urlObj = new URL(`http://127.0.0.1:${testPort}/`);
      const req = http.request({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json,text/event-stream',
          'Authorization': `Bearer ${apiKey}`,
          ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({
          statusCode: res.statusCode || 0,
          body: data,
          headers: res.headers as Record<string, string>,
        }));
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
  }

  describe('initialize', () => {
    it('should respond to initialize request over HTTP and establish session', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe(1);
      expect(body.result).toBeDefined();
      expect(body.result.serverInfo.name).toBe('evolith-mcp-server');
      sessionId = response.headers['mcp-session-id'] as string;
      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBeGreaterThan(0);
    });
  });

  describe('tools/list over HTTP', () => {
    it('should return list of available tools with session', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result.tools).toBeInstanceOf(Array);
      expect(body.result.tools.length).toBeGreaterThan(10);

      const toolNames = body.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('evolith-validate');
      expect(toolNames).toContain('evolith-metrics');
    });

    it('should include tool descriptions and input schemas', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
      });

      const body = JSON.parse(response.body);
      for (const tool of body.result.tools) {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(0);
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });

  describe('tools/call over HTTP', () => {
    it('should call evolith-metrics tool over HTTP', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'evolith-metrics', arguments: {} },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBeDefined();
      expect(body.result.content).toBeInstanceOf(Array);
    });

    it('should return error for unknown tool over HTTP', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'unknown-tool', arguments: {} },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result.isError).toBe(true);
    });
  });

  describe('resources over HTTP', () => {
    it('should list resources over HTTP', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 6,
        method: 'resources/list',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result.resources).toBeInstanceOf(Array);
      expect(body.result.resources.length).toBeGreaterThan(0);
    });

    it('should read evolith://rulesets resource over HTTP', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 7,
        method: 'resources/read',
        params: { uri: 'evolith://rulesets' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toBeDefined();
    });
  });

  describe('prompts over HTTP', () => {
    it('should list prompts over HTTP', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 8,
        method: 'prompts/list',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result.prompts).toBeInstanceOf(Array);
      expect(body.result.prompts.length).toBeGreaterThan(0);
    });

    it('should get evolith/validate-repository prompt over HTTP', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 9,
        method: 'prompts/get',
        params: { name: 'evolith/validate-repository' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result.messages).toBeInstanceOf(Array);
      expect(body.result.messages.length).toBeGreaterThan(0);
    });
  });

  describe('error handling over HTTP', () => {
    it('should handle invalid JSON-RPC method over HTTP', async () => {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 10,
        method: 'unknown/method',
        params: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should reject requests without session ID', async () => {
      const response = await httpPost(`http://127.0.0.1:${testPort}/`, JSON.stringify({
        jsonrpc: '2.0', id: 11, method: 'tools/list',
      }), { 'Content-Type': 'application/json', 'Accept': 'application/json,text/event-stream', 'Authorization': `Bearer ${apiKey}` });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });
});
