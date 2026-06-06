import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

const CLI_PATH = path.join(__dirname, '../../dist/main.js');

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

class McpTestClient {
  private proc: ChildProcess;
  private messageId = 1;
  private pendingRequests = new Map<number | string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private responses: JsonRpcResponse[] = [];

  constructor() {
    this.proc = spawn('node', [CLI_PATH, 'mcp', 'serve'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buffer = '';
    this.proc.stdout.on('data', (data) => {
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

    this.proc.stderr.on('data', (data) => {
      console.error('MCP stderr:', data.toString());
    });
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = this.messageId++;
    const message: JsonRpcMessage = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.proc.stdin.write(JSON.stringify(message) + '\n');

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${id} timed out`));
        }
      }, 5000);
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

  async listPrompts() {
    return this.send('prompts/list');
  }

  getResponses() {
    return this.responses;
  }

  kill() {
    this.proc.kill();
  }
}

describe('MCP E2E Tests', () => {
  let client: McpTestClient;

  beforeAll(() => {
    client = new McpTestClient();
  });

  afterAll(() => {
    client.kill();
  });

  describe('tools/list', () => {
    it('should return list of available tools', async () => {
      const result = await client.listTools() as { tools: Array<{ name: string; description: string }> };

      expect(result).toBeDefined();
      expect(result.tools).toBeInstanceOf(Array);
      expect(result.tools.length).toBeGreaterThan(0);

      const toolNames = result.tools.map(t => t.name);
      expect(toolNames).toContain('evolith-validate');
      expect(toolNames).toContain('evolith-agent-list');
    });
  });

  describe('tools/call', () => {
    it('should call evolith-validate tool', async () => {
      const result = await client.callTool('evolith-validate', {
        path: process.cwd(),
        format: 'summary',
      }) as { content: Array<{ type: string; text: string }> };

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('text');
    });

    it('should return error for unknown tool', async () => {
      await expect(
        client.callTool('unknown-tool', {})
      ).rejects.toThrow();
    });
  });

  describe('resources/list', () => {
    it('should return list of resources', async () => {
      const result = await client.listResources() as { resources: Array<{ uri: string }> };

      expect(result).toBeDefined();
      expect(result.resources).toBeInstanceOf(Array);
    });
  });

  describe('prompts/list', () => {
    it('should return list of prompts', async () => {
      const result = await client.listPrompts() as { prompts: Array<{ name: string }> };

      expect(result).toBeDefined();
      expect(result.prompts).toBeInstanceOf(Array);
    });
  });
});