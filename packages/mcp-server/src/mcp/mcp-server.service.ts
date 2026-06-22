import { Injectable, Logger } from '@nestjs/common';
import * as http from 'node:http';
import type { Readable, Writable } from 'node:stream';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { trace } from '@opentelemetry/api';
import { ToolRegistryService } from './tool-registry.service';
import { MetricsService } from './metrics.service';
import { ResourcesService } from './resources.service';
import { PromptsService } from './prompts.service';
import { generateCorrelationId } from '../common/envelopes';
import { AbacEvaluator } from './abac-evaluator';
import { mcpContextStorage, McpUserContext } from './mcp-user-context';
import { validateAuth } from './mcp-server-auth';
import { handleCallTool, handleListTools, ToolCallResult } from './mcp-tool-dispatch';

export { McpUserContext, mcpContextStorage } from './mcp-user-context';
export { ToolCallResult } from './mcp-tool-dispatch';

export type McpTransport = 'stdio' | 'http';

export interface McpStartOptions {
  transport?: McpTransport;
  port?: number;
  apiKey?: string;
  stdin?: Readable;
  stdout?: Writable;
}

const SERVER_NAME = 'evolith-mcp-server';
const SERVER_VERSION = '1.0.0';
const tracer = trace.getTracer(SERVER_NAME);

/**
 * Owns the MCP SDK {@link Server}, wires JSON-RPC handlers to the
 * {@link ToolRegistryService}, and binds either the stdio or HTTP/SSE transport.
 *
 * Dispatch logic is delegated to {@link handleCallTool} / {@link handleListTools}
 * in `mcp-tool-dispatch.ts`, kept transport-agnostic for unit testing.
 */
@Injectable()
export class McpServerService {
  private readonly logger = new Logger(McpServerService.name);
  private server?: Server;
  private httpServer: http.Server | null = null;
  private apiKey?: string;

  constructor(
    private readonly registry: ToolRegistryService,
    private readonly metrics: MetricsService,
    private readonly abacEvaluator: AbacEvaluator,
    private readonly resources?: ResourcesService,
    private readonly prompts?: PromptsService,
  ) {}

  handleListTools(): { tools: ReturnType<ToolRegistryService['listSchemas']> } {
    return handleListTools({ registry: this.registry });
  }

  async handleCallTool(name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
    return handleCallTool(name, args, {
      registry: this.registry,
      metrics: this.metrics,
      abacEvaluator: this.abacEvaluator,
      logger: this.logger,
      tracer,
    });
  }

  /** Whether mutations are pre-authorized via `mcp.allowMutations` in evolith.yaml. */
  async isMutationAllowed(dir?: string): Promise<boolean> {
    try {
      const fs = await import('fs-extra');
      const path = await import('node:path');
      const yaml = await import('yaml');
      const configPath = path.join(dir || process.cwd(), 'evolith.yaml');
      if (await fs.pathExists(configPath)) {
        const config = yaml.parse(await fs.readFile(configPath, 'utf-8'));
        return !!config?.mcp?.allowMutations;
      }
    } catch {
      // Treat any failure as "not allowed".
    }
    return false;
  }

  private buildServer(): Server {
    const capabilities: Record<string, unknown> = { tools: {} };
    if (this.resources) capabilities.resources = {};
    if (this.prompts) capabilities.prompts = {};

    const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, { capabilities });

    server.setRequestHandler(ListToolsRequestSchema, async () => this.handleListTools());
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return this.handleCallTool(name, (args ?? {}) as Record<string, unknown>) as unknown as Promise<
        Record<string, unknown>
      >;
    });

    if (this.resources) {
      const resources = this.resources;
      server.setRequestHandler(ListResourcesRequestSchema, async () => resources.list());
      server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.params.uri;
        const data = await resources.read(uri);
        return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] };
      });
    }

    if (this.prompts) {
      const prompts = this.prompts;
      server.setRequestHandler(ListPromptsRequestSchema, async () => prompts.list());
      server.setRequestHandler(GetPromptRequestSchema, async (request) =>
        prompts.get(request.params.name, (request.params.arguments ?? {}) as Record<string, string>),
      );
    }

    return server;
  }

  async start(options: McpStartOptions = {}): Promise<void> {
    const transport = options.transport ?? 'stdio';
    this.apiKey = options.apiKey;
    this.server = this.buildServer();

    if (transport === 'http') {
      await this.startHttp(options.port ?? 3000);
    } else {
      const stdioTransport = new StdioServerTransport(options.stdin, options.stdout);
      await this.server.connect(stdioTransport);
      this.logger.log('Evolith MCP server started on stdio');
    }
  }

  private async startHttp(port: number): Promise<void> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => generateCorrelationId(),
      enableJsonResponse: true,
    });

    this.httpServer = http.createServer((req, res) => {
      const context = validateAuth(req, res, this.apiKey);
      if (!context) return;

      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', transport: 'http', protocol: 'mcp' }));
        return;
      }

      mcpContextStorage.run(context as McpUserContext, () => {
        transport
          .handleRequest(req as Parameters<typeof transport.handleRequest>[0], res)
          .catch((err: Error) => this.logger.error(`MCP transport error: ${err.message}`));
      });
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer!.listen(port, '127.0.0.1', () => {
        this.logger.log(`Evolith MCP HTTP server listening on http://127.0.0.1:${port}`);
        resolve();
      });
      this.httpServer!.on('error', reject);
    });

    await this.server!.connect(transport);
  }

  /** The actual bound TCP port for the HTTP transport (useful for tests). */
  boundPort(): number | undefined {
    const addr = this.httpServer?.address();
    return addr && typeof addr === 'object' ? addr.port : undefined;
  }

  async stop(): Promise<void> {
    await this.server?.close();
    if (this.httpServer) {
      await new Promise<void>((resolve) => this.httpServer!.close(() => resolve()));
      this.httpServer = null;
    }
  }
}
