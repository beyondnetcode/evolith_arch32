import { Logger } from '@nestjs/common';
import * as http from 'node:http';
import { RulesetValidatorService } from '../validators/ruleset-validator.service';
import { handleValidateTool } from './tools/validate';
import { handleAgentTools } from './tools/agent';
import { handleArchitectureTools } from './tools/architecture';
import { handleSdlcTools } from './tools/sdlc';
import { handleMoscowTools } from './tools/moscow';
import { listResources, readResource } from './resources';
import { listPrompts, getPrompt } from './prompts';
import { McpMetricsService } from './metrics.service';

export type McpTransport = 'stdio' | 'http';

export interface McpServerOptions {
  rulesetValidator?: RulesetValidatorService;
  metricsService?: McpMetricsService;
  apiKey?: string;
  port?: number;
  transport?: McpTransport;
  /** For testing only: inject custom streams into the stdio transport. */
  stdin?: import('node:stream').Readable;
  stdout?: import('node:stream').Writable;
}

interface McpServerInstance {
  setRequestHandler(schema: unknown, handler: (request: unknown) => Promise<unknown>): void;
  connect(transport: unknown): Promise<void>;
  start(): Promise<void>;
}

interface McpTransportInstance {
}

interface Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: unknown) => void;
  start(): Promise<void>;
  close(): Promise<void>;
  send(message: unknown): Promise<void>;
}

class MinimalStdioTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: unknown) => void;

  private readonly stdin: import('node:stream').Readable;
  private readonly stdout: import('node:stream').Writable;
  private readBuffer: string = '';
  private started: boolean;
  private readonly handleData: (chunk: Buffer) => void;
  private readonly handleEnd: () => void;
  private readonly handleError: (err: Error) => void;

  constructor(stdin?: import('node:stream').Readable, stdout?: import('node:stream').Writable) {
    this.stdin = stdin || process.stdin;
    this.stdout = stdout || process.stdout;
    this.readBuffer = '';
    this.started = false;
    this.handleData = (chunk: Buffer) => {
      this.readBuffer += chunk.toString();
      let newlineIndex: number;
      while ((newlineIndex = this.readBuffer.indexOf('\n')) !== -1) {
        const line = this.readBuffer.slice(0, newlineIndex).trim();
        this.readBuffer = this.readBuffer.slice(newlineIndex + 1);
        if (line) {
          try {
            const message = JSON.parse(line);
            if (this.onmessage) {
              this.onmessage(message);
            }
          } catch {
            if (this.onerror) {
              this.onerror(new Error(`Invalid JSON: ${line}`));
            }
          }
        }
      }
    };
    this.handleEnd = () => {
      if (this.onclose) {
        this.onclose();
      }
    };
    this.handleError = (err: Error) => {
      if (this.onerror) {
        this.onerror(err);
      }
    };
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.stdin.on('data', this.handleData);
    this.stdin.on('end', this.handleEnd);
    this.stdin.on('error', this.handleError);
  }

  async close(): Promise<void> {
    if (!this.started) return;
    this.stdin.off('data', this.handleData);
    this.stdin.off('end', this.handleEnd);
    this.stdin.off('error', this.handleError);
    this.onmessage = undefined;
    this.onerror = undefined;
    this.onclose = undefined;
    this.readBuffer = '';
    this.started = false;
  }

  async send(message: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const json = JSON.stringify(message) + '\n';
      this.stdout.write(json, (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

class MinimalHttpTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: unknown) => void;

  private server: http.Server | null = null;
  private readonly port: number;
  private readonly apiKey?: string;
  private readonly logger = new Logger(MinimalHttpTransport.name);
  private sseClients: Array<{ id: string; res: http.ServerResponse }> = [];
  private started: boolean = false;

  constructor(port: number, apiKey?: string) {
    this.port = port;
    this.apiKey = apiKey;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.on('error', (error: Error) => {
      this.logger.error(`HTTP server error: ${error.message}`);
      if (this.onerror) {
        this.onerror(error);
      }
    });

    this.server.on('close', () => {
      if (this.onclose) {
        this.onclose();
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.listen(this.port, '127.0.0.1', () => {
        this.logger.log(`Evolith MCP HTTP server listening on http://127.0.0.1:${this.port}`);
        resolve();
      });
      this.server!.on('error', reject);
    });
  }

  async close(): Promise<void> {
    this.started = false;

    for (const client of this.sseClients) {
      client.res.end();
    }
    this.sseClients = [];

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
  }

  async send(message: unknown): Promise<void> {
    const data = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
    const clientsToRemove: typeof this.sseClients = [];

    for (const client of this.sseClients) {
      try {
        client.res.write(data);
      } catch {
        clientsToRemove.push(client);
      }
    }

    for (const client of clientsToRemove) {
      const index = this.sseClients.indexOf(client);
      if (index > -1) {
        this.sseClients.splice(index, 1);
      }
    }
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);

    if (!this.validateAuth(req, res)) {
      return;
    }

    if (req.method === 'POST' && url.pathname === '/message') {
      this.handlePostMessage(req, res);
    } else if (req.method === 'GET' && url.pathname === '/sse') {
      this.handleSseConnection(req, res);
    } else if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', transport: 'http', protocol: 'mcp' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  private validateAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
    if (!this.apiKey) return true;

    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

    if (bearerToken !== this.apiKey && apiKeyHeader !== this.apiKey) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing API key' }));
      return false;
    }

    return true;
  }

  private async handlePostMessage(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body = '';

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const message = JSON.parse(body);
        if (this.onmessage) {
          await this.onmessage(message);
        }
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'accepted' }));
      } catch (error) {
        this.logger.error(`Invalid POST message: ${error}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });

    req.on('error', (error: Error) => {
      this.logger.error(`Request error: ${error.message}`);
      if (this.onerror) {
        this.onerror(error);
      }
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }

  private handleSseConnection(req: http.IncomingMessage, res: http.ServerResponse): void {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(': connected\n\n');

    this.sseClients.push({ id: clientId, res });

    req.on('close', () => {
      const index = this.sseClients.findIndex(c => c.id === clientId);
      if (index > -1) {
        this.sseClients.splice(index, 1);
      }
      this.logger.debug(`SSE client disconnected: ${clientId}`);
    });

    this.logger.debug(`SSE client connected: ${clientId}`);
  }
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

class DirectMcpServer {
  private transport: Transport;
  private readonly logger = new Logger(DirectMcpServer.name);
  private rulesetValidator: RulesetValidatorService;
  private metricsService: McpMetricsService;
  private readonly transportType: McpTransport;

  constructor(
    transportType: McpTransport = 'stdio',
    port: number = 49100,
    apiKey?: string,
    rulesetValidator?: RulesetValidatorService,
    metricsService?: McpMetricsService,
    stdin?: import('node:stream').Readable,
    stdout?: import('node:stream').Writable,
  ) {
    this.transportType = transportType;
    this.rulesetValidator = rulesetValidator || new RulesetValidatorService();
    this.metricsService = metricsService || new McpMetricsService();

    if (transportType === 'http') {
      this.transport = new MinimalHttpTransport(port, apiKey);
    } else {
      this.transport = new MinimalStdioTransport(stdin, stdout);
    }
  }

  async start(): Promise<void> {
    const transport = this.transport;
    transport.onmessage = async (message: unknown) => {
      await this.handleMessage(message);
    };

    transport.onerror = (error: Error) => {
      this.logger.error(`Transport error: ${error.message}`);
    };

    await transport.start();
    this.logger.log(`Evolith MCP Server started on ${this.transportType}`);
  }

  async stop(): Promise<void> {
    await this.transport.close();
  }

  private async handleMessage(rawMessage: unknown): Promise<void> {
    try {
      const request = rawMessage as JsonRpcRequest;
      this.logger.debug(`Received: ${JSON.stringify(request)}`);

      if (request.method === 'initialize') {
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
            },
            serverInfo: {
              name: 'evolith-mcp-server',
              version: '1.0.0',
            },
          },
        };
        await this.transport.send(response);
        return;
      }

      let result: unknown;
      try {
        result = await this.dispatchRequest(request.method, request.params || {});
      } catch (error) {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : String(error),
          },
        };
        await this.transport.send(errorResponse);
        return;
      }

      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
      await this.transport.send(response);
    } catch (error) {
      this.logger.error(`Error handling message: ${error}`);
      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      };
      await this.transport.send(errorResponse);
    }
  }

  private async dispatchRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'tools/list':
        return this.handleListTools();
      case 'tools/call':
        return this.handleCallTool(params);
      case 'resources/list':
        return this.handleListResources();
      case 'resources/read':
        return this.handleReadResource(params);
      case 'prompts/list':
        return this.handleListPrompts();
      case 'prompts/get':
        return this.handleGetPrompt(params);
      default:
        throw new Error(`Method not found: ${method}`);
    }
  }

  private handleListTools() {
    return {
      tools: [
        {
          name: 'evolith-validate',
          description: 'Validate a repository against Evolith governance rules',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the repository to validate' },
              format: { type: 'string', description: 'Output format: json, summary, table', default: 'json' },
              ruleset: { type: 'string', description: 'Specific ruleset to validate' },
              corePath: { type: 'string', description: 'Path to Evolith Core' },
            },
            required: ['path'],
          },
        },
        {
          name: 'evolith-agent-install',
          description: 'Install a new Evolith agent',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the agent to install' },
              template: { type: 'string', description: 'Template: standard, minimal, enterprise', default: 'standard' },
              dir: { type: 'string', description: 'Directory to install into' },
            },
            required: ['name'],
          },
        },
        {
          name: 'evolith-agent-list',
          description: 'List all installed Evolith agents',
          inputSchema: {
            type: 'object',
            properties: {
              dir: { type: 'string', description: 'Directory to search' },
            },
          },
        },
        {
          name: 'evolith-agent-validate',
          description: 'Validate a specific agent ruleset',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              dir: { type: 'string' },
            },
            required: ['name'],
          },
        },
        {
          name: 'evolith-agent-upgrade',
          description: 'Upgrade an existing Evolith agent',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              dir: { type: 'string' },
            },
            required: ['name'],
          },
        },
        {
          name: 'evolith-agent-remove',
          description: 'Remove an Evolith agent',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              dir: { type: 'string' },
            },
            required: ['name'],
          },
        },
        {
          name: 'evolith-architecture-validate',
          description: 'Validate repository architecture against F1/F2/F3 rules. Use deep=true for import graph analysis, layer violations, and coupling metrics.',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              level: { type: 'string', description: 'F1, F2, or F3' },
              deep: { type: 'boolean', description: 'Enable deep static analysis (import graph, layer violations, coupling metrics)', default: false },
            },
            required: ['path'],
          },
        },
        {
          name: 'evolith-sdlc-handoff',
          description: 'Generate SDLC phase handoff artifact manifest',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              fromPhase: { type: 'string' },
              toPhase: { type: 'string' },
            },
            required: ['path', 'fromPhase', 'toPhase'],
          },
        },
        {
          name: 'evolith-sdlc-status',
          description: 'Show current SDLC phase gate status',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
            },
            required: ['path'],
          },
        },
        {
          name: 'evolith-config-get',
          description: 'Get Evolith configuration value',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              dir: { type: 'string' },
            },
            required: ['key'],
          },
        },
        {
          name: 'evolith-config-set',
          description: 'Set Evolith configuration value',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
              dir: { type: 'string' },
            },
            required: ['key', 'value'],
          },
        },
        {
          name: 'evolith-metrics',
          description: 'Get MCP server metrics',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'evolith-moscow-create',
          description: 'Create a new MoSCoW prioritization analysis for a phase',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the repository' },
              phase: { type: 'string', description: 'Phase identifier (e.g., phase-0)', default: 'phase-0' },
              items: { type: 'array', description: 'Array of MoSCoW items with description, priority, category, rationale' },
            },
            required: ['path', 'items'],
          },
        },
        {
          name: 'evolith-moscow-load',
          description: 'Load an existing MoSCoW analysis for a phase',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              phase: { type: 'string', default: 'phase-0' },
            },
            required: ['path'],
          },
        },
        {
          name: 'evolith-moscow-update',
          description: 'Update an item in a MoSCoW analysis',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              phase: { type: 'string', default: 'phase-0' },
              itemId: { type: 'string' },
              updates: { type: 'object' },
            },
            required: ['path', 'itemId'],
          },
        },
        {
          name: 'evolith-moscow-remove',
          description: 'Remove an item from a MoSCoW analysis',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              phase: { type: 'string', default: 'phase-0' },
              itemId: { type: 'string' },
            },
            required: ['path', 'itemId'],
          },
        },
        {
          name: 'evolith-moscow-list',
          description: 'List all MoSCoW analyses for a repository',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
            },
            required: ['path'],
          },
        },
        {
          name: 'evolith-moscow-validate',
          description: 'Validate a MoSCoW analysis for correctness',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              phase: { type: 'string', default: 'phase-0' },
            },
            required: ['path'],
          },
        },
        {
          name: 'evolith-moscow-report',
          description: 'Generate a markdown report from a MoSCoW analysis',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              phase: { type: 'string', default: 'phase-0' },
            },
            required: ['path'],
          },
        },
      ],
    };
  }

  private async handleCallTool(params: Record<string, unknown>): Promise<unknown> {
    const name = params.name as string;
    const args = params.arguments as Record<string, unknown> || {};
    const startTime = Date.now();

    try {
      let result: unknown;

      if (name === 'evolith-validate') {
        result = await handleValidateTool(args, this.rulesetValidator);
      } else if (name.startsWith('evolith-agent')) {
        result = await handleAgentTools(name, args);
      } else if (name === 'evolith-architecture-validate') {
        result = await handleArchitectureTools(args);
      } else if (name.startsWith('evolith-sdlc')) {
        result = await handleSdlcTools(name, args);
      } else if (name === 'evolith-config-get' || name === 'evolith-config-set') {
        result = await this.handleConfigTools(name, args);
      } else if (name === 'evolith-metrics') {
        result = this.metricsService.getMetrics();
      } else if (name.startsWith('evolith-moscow')) {
        result = await handleMoscowTools(name, args);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      const latencyMs = Date.now() - startTime;
      this.metricsService.recordToolCall(name, latencyMs, true);

      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.metricsService.recordToolCall(name, latencyMs, false);
      this.metricsService.recordError(message.substring(0, 50));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: true, message }),
          },
        ],
        isError: true,
      };
    }
  }

  private async handleConfigTools(name: string, args: Record<string, unknown>) {
    const fs = await import('fs-extra');
    const path = await import('path');
    const yaml = await import('yaml');

    const dir = (args.dir as string) || process.cwd();
    const configPath = path.join(dir, 'evolith.yaml');

    if (!(await fs.pathExists(configPath))) {
      throw new Error('evolith.yaml not found');
    }

    const config = yaml.parse(await fs.readFile(configPath, 'utf-8'));

    if (name === 'evolith-config-get') {
      const key = args.key as string;
      const keys = key.split('.');
      let value: unknown = config;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      return { key, value: value ?? null };
    } else {
      const key = args.key as string;
      const value = args.value as string;
      const keys = key.split('.');
      let target: Record<string, unknown> = config;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
          target[keys[i]] = {};
        }
        target = target[keys[i]] as Record<string, unknown>;
      }
      target[keys[keys.length - 1]] = value;
      await fs.writeFile(configPath, yaml.stringify(config));
      return { key, value, updated: true };
    }
  }

  private async handleListResources(): Promise<unknown> {
    const { listResources } = await import('./resources');
    return listResources();
  }

  private async handleReadResource(params: Record<string, unknown>): Promise<unknown> {
    const { readResource } = await import('./resources');
    return readResource(params);
  }

  private async handleListPrompts(): Promise<unknown> {
    const { listPrompts } = await import('./prompts');
    return listPrompts();
  }

  private async handleGetPrompt(params: Record<string, unknown>): Promise<unknown> {
    const { getPrompt } = await import('./prompts');
    return getPrompt(params);
  }
}

function validateApiKey(apiKey: string | undefined, validKey: string | undefined): boolean {
  if (!validKey) return true;
  if (!apiKey) return false;
  return apiKey === validKey;
}

export async function startMcpServer(options: McpServerOptions = {}) {
  const transport = options.transport || 'stdio';
  const port = options.port || 49100;

  const server = new DirectMcpServer(
    transport,
    port,
    options.apiKey,
    options.rulesetValidator,
    options.metricsService,
    options.stdin,
    options.stdout,
  );
  await server.start();
  return server;
}
