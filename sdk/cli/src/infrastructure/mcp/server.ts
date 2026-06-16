// @ts-nocheck
import { Logger } from '@nestjs/common';
import * as http from 'node:http';
import type { IFileSystem, IConfigParser } from '@evolith/core-domain/domain/interfaces';
import { RulesetValidatorService } from '@evolith/core-domain/application/validators/ruleset-validator.service';
import { NodeFileSystemProvider } from '../providers/node-filesystem.provider';
import { YamlConfigParserProvider } from '../providers/config-parser.provider';
import { McpMetricsService } from './metrics.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export type McpTransport = 'stdio' | 'http';

export interface McpServerOptions {
  fileSystem?: IFileSystem;
  configParser?: IConfigParser;
  rulesetValidator?: RulesetValidatorService;
  metricsService?: McpMetricsService;
  apiKey?: string;
  port?: number;
  transport?: McpTransport;
  stdin?: import('node:stream').Readable;
  stdout?: import('node:stream').Writable;
}

export class EvolithMcpServer {
  private server: Server;
  private readonly logger = new Logger(EvolithMcpServer.name);
  private rulesetValidator: RulesetValidatorService;
  private metricsService: McpMetricsService;
  private registry: import('./mcp-tool.registry').McpToolRegistry;
  private httpServer: http.Server | null = null;
  private readonly transportType: McpTransport;
  private readonly port: number;
  private readonly apiKey?: string;
  private readonly stdin?: import('node:stream').Readable;
  private readonly stdout?: import('node:stream').Writable;

  constructor(
    transportType: McpTransport = 'stdio',
    port: number = 49100,
    apiKey?: string,
    rulesetValidator?: RulesetValidatorService,
    metricsService?: McpMetricsService,
    stdin?: import('node:stream').Readable,
    stdout?: import('node:stream').Writable,
    private readonly fileSystem?: IFileSystem,
    private readonly configParser?: IConfigParser,
  ) {
    this.transportType = transportType;
    this.port = port;
    this.apiKey = apiKey;
    this.stdin = stdin;
    this.stdout = stdout;
    if (!rulesetValidator) {
      const fs = this.fileSystem || new NodeFileSystemProvider().createFileSystem();
      const cp = this.configParser || new YamlConfigParserProvider().createConfigParser('yaml');
      const { DiskRulesetRepository } = require('../adapters/disk-ruleset.repository');
      const repo = new DiskRulesetRepository(fs, new Logger('DiskRulesetRepository'));
      this.rulesetValidator = new RulesetValidatorService({
        fileSystem: fs,
        configParser: cp,
        logger: new Logger('RulesetValidatorService'),
        rulesetRepo: repo,
      });
    } else {
      this.rulesetValidator = rulesetValidator;
    }
    this.metricsService = metricsService || new McpMetricsService();

    this.server = new Server({
      name: 'evolith-mcp-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      }
    });

    this.registry = this.initializeRegistry();
    this.registerHandlers();
  }

  private initializeRegistry() {
    const { McpToolRegistry } = require('./mcp-tool.registry');
    const { getAllTools } = require('./tools');
    const registry = new McpToolRegistry();

    const fileSystem = this.fileSystem || new NodeFileSystemProvider().createFileSystem();
    const configParser = this.configParser || new YamlConfigParserProvider().createConfigParser('yaml');
    const tools = getAllTools(fileSystem, configParser);
    for (const tool of tools) {
      registry.register(tool);
    }

    registry.register({
      schema: {
        name: 'evolith-metrics',
        description: 'Get MCP server metrics',
        inputSchema: { type: 'object', properties: {} },
      },
      execute: async () => this.metricsService.getMetrics(),
    });

    registry.register({
      schema: {
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
      execute: async (args: Record<string, unknown>) => this.handleConfigGet(args),
    });

    registry.register({
      schema: {
        name: 'evolith-config-set',
        description: 'Set Evolith configuration value',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: { type: 'string' },
            dir: { type: 'string' },
            confirm: { type: 'boolean', description: 'Confirm mutative operation' },
          },
          required: ['key', 'value'],
        },
      },
      mutative: true,
      execute: async (args: Record<string, unknown>) => this.handleConfigSet(args),
    });

    return registry;
  }

  private async isMutationAllowed(dir?: string): Promise<boolean> {
    try {
      const fs = await import('fs-extra');
      const path = await import('path');
      const yaml = await import('yaml');
      const configPath = path.join(dir || process.cwd(), 'evolith.yaml');
      if (await fs.pathExists(configPath)) {
        const config = yaml.parse(await fs.readFile(configPath, 'utf-8'));
        return !!config?.mcp?.allowMutations;
      }
    } catch {
      // Ignore and return false
    }
    return false;
  }

  private registerHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.registry.listTools() };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();

      try {
        const tool = this.registry.getTool(name);
        if (!tool) {
          throw new Error(`Unknown tool: ${name}`);
        }

        if (tool.mutative) {
          const dir = (args?.dir || args?.path || args?.projectPath) as string | undefined;
          const mutationsAllowed = await this.isMutationAllowed(dir);
          const confirmed = args?.confirm === true;
          if (!mutationsAllowed && !confirmed) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: true,
                    status: 'REQUIRES_CONFIRMATION',
                    message: `La operación '${name}' es mutativa y requiere confirmación. Vuelve a ejecutar especificando 'confirm: true' o configura 'mcp.allowMutations: true' en evolith.yaml.`,
                  }, null, 2),
                },
              ],
            };
          }
        }

        const deps = {
          validator: this.rulesetValidator,
          metricsService: this.metricsService
        };

        const result = await tool.execute(args as Record<string, unknown>, deps);
        const latencyMs = Date.now() - startTime;
        this.metricsService.recordToolCall(name, latencyMs, true);

        return {
          content: [
            {
              type: 'text',
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
              type: 'text',
              text: JSON.stringify({ error: true, message }),
            },
          ],
          isError: true,
        };
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const { listResources } = await import('./resources');
      const result = await listResources() as unknown;
      return result;
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { readResource } = await import('./resources');
      const result = await readResource(request.params) as unknown;
      return result;
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const { listPrompts } = await import('./prompts');
      const result = await listPrompts() as unknown;
      return result;
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { getPrompt } = await import('./prompts');
      const result = await getPrompt(request.params) as unknown;
      return result;
    });
  }

  private async handleConfigGet(args: Record<string, unknown>) {
    const fs = await import('fs-extra');
    const path = await import('path');
    const yaml = await import('yaml');

    const dir = (args.dir as string) || process.cwd();
    const configPath = path.join(dir, 'evolith.yaml');

    if (!(await fs.pathExists(configPath))) {
      throw new Error('evolith.yaml not found');
    }

    const config = yaml.parse(await fs.readFile(configPath, 'utf-8'));
    const key = args.key as string;
    const keys = key.split('.');
    let value: unknown = config;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return { key, value: value ?? null };
  }

  private async handleConfigSet(args: Record<string, unknown>) {
    const fs = await import('fs-extra');
    const path = await import('path');
    const yaml = await import('yaml');

    const dir = (args.dir as string) || process.cwd();
    const configPath = path.join(dir, 'evolith.yaml');

    if (!(await fs.pathExists(configPath))) {
      throw new Error('evolith.yaml not found');
    }

    const config = yaml.parse(await fs.readFile(configPath, 'utf-8'));
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

  async start(): Promise<void> {
    if (this.transportType === 'http') {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => Math.random().toString(36).substring(2, 10)
      });
      
      this.httpServer = http.createServer((req, res) => {
        if (!this.validateAuth(req, res)) return;

        const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
        if (req.method === 'GET' && url.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', transport: 'http', protocol: 'mcp' }));
          return;
        }

        transport.handleRequest(req as Parameters<typeof transport.handleRequest>[0], res).catch((err) => {
           this.logger.error(`MCP Transport error: ${err.message}`);
        });
      });

      this.httpServer.on('error', (error: Error) => {
        this.logger.error(`HTTP server error: ${error.message}`);
      });

      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.port, '127.0.0.1', () => {
          this.logger.log(`Evolith MCP HTTP server listening on http://127.0.0.1:${this.port}`);
          resolve();
        });
        this.httpServer!.on('error', reject);
      });

      await this.server.connect(transport);
    } else {
      const transport = new StdioServerTransport(
        this.stdin,
        this.stdout
      );
      await this.server.connect(transport);
      this.logger.log(`Evolith MCP Server started on stdio`);
    }
  }

  async stop(): Promise<void> {
    await this.server.close();
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }
  }
}

export async function startMcpServer(options: McpServerOptions = {}) {
  const transport = options.transport || 'stdio';
  const port = options.port || 49100;

  const server = new EvolithMcpServer(
    transport,
    port,
    options.apiKey,
    options.rulesetValidator,
    options.metricsService,
    options.stdin,
    options.stdout,
    options.fileSystem,
    options.configParser,
  );
  await server.start();
  return server; // Actually returning the EvolithMcpServer instance, but we can return it.
}
