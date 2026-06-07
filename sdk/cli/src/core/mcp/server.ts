import { Logger } from '@nestjs/common';
import { RulesetValidatorService } from '../validators/ruleset-validator.service';
import { handleValidateTool } from './tools/validate';
import { handleAgentTools } from './tools/agent';
import { handleArchitectureTools } from './tools/architecture';
import { handleSdlcTools } from './tools/sdlc';
import { handleMoscoTools } from './tools/moscow';
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

  constructor(stdin?: import('node:stream').Readable, stdout?: import('node:stream').Writable) {
    this.stdin = stdin || process.stdin;
    this.stdout = stdout || process.stdout;
    this.readBuffer = '';
    this.started = false;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.stdin.on('data', (chunk: Buffer) => {
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
          } catch (e) {
            if (this.onerror) {
              this.onerror(new Error(`Invalid JSON: ${line}`));
            }
          }
        }
      }
    });

    this.stdin.on('end', () => {
      if (this.onclose) {
        this.onclose();
      }
    });

    this.stdin.on('error', (err: Error) => {
      if (this.onerror) {
        this.onerror(err);
      }
    });
  }

  async close(): Promise<void> {
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

  constructor(rulesetValidator?: RulesetValidatorService, metricsService?: McpMetricsService) {
    this.transport = new MinimalStdioTransport();
    this.rulesetValidator = rulesetValidator || new RulesetValidatorService();
    this.metricsService = metricsService || new McpMetricsService();
  }

  async start(): Promise<void> {
    const transport = this.transport as MinimalStdioTransport;
    transport.onmessage = async (message: unknown) => {
      await this.handleMessage(message);
    };

    transport.onerror = (error: Error) => {
      this.logger.error(`Transport error: ${error.message}`);
    };

    await transport.start();
    this.logger.log('Evolith MCP Server started on stdio');
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
          description: 'Validate repository architecture against F1/F2/F3 rules',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              level: { type: 'string', description: 'F1, F2, or F3' },
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
        result = await handleMoscoTools(name, args);
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
  const server = new DirectMcpServer(options.rulesetValidator, options.metricsService);
  await server.start();
  return server;
}