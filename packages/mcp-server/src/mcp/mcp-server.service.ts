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
import { ToolRegistryService } from './tool-registry.service';
import { MetricsService } from './metrics.service';
import { ResourcesService } from './resources.service';
import { PromptsService } from './prompts.service';
import { ErrorCodes } from '../common/errors';
import {
  failure,
  generateCorrelationId,
  success,
  toErrorEnvelope,
} from '../common/envelopes';

export type McpTransport = 'stdio' | 'http';

export interface McpStartOptions {
  transport?: McpTransport;
  port?: number;
  apiKey?: string;
  stdin?: Readable;
  stdout?: Writable;
}

/** MCP `tools/call` result shape (a text envelope, optionally flagged as error). */
export interface ToolCallResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

const SERVER_NAME = 'evolith-mcp-server';
const SERVER_VERSION = '1.0.0';

/**
 * Owns the MCP SDK {@link Server}, wires JSON-RPC handlers to the
 * {@link ToolRegistryService}, and binds either the stdio or HTTP/SSE transport.
 *
 * Dispatch logic ({@link handleListTools}, {@link handleCallTool}) is kept
 * transport-agnostic and side-effect-light so it can be unit tested directly.
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
    private readonly resources?: ResourcesService,
    private readonly prompts?: PromptsService,
  ) {}

  handleListTools(): { tools: ReturnType<ToolRegistryService['listSchemas']> } {
    return { tools: this.registry.listSchemas() };
  }

  async handleCallTool(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<ToolCallResult> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();
    const meta = (durationMs: number) => ({ correlationId, tool: name, durationMs });

    const tool = this.registry.get(name);
    if (!tool) {
      const env = failure(ErrorCodes.NOT_IMPLEMENTED, `Unknown tool: ${name}`, meta(0));
      this.metrics.recordToolCall(name, 0, false);
      this.metrics.recordError(`Unknown tool: ${name}`);
      return { content: [{ type: 'text', text: JSON.stringify(env, null, 2) }], isError: true };
    }

    if (tool.mutative) {
      const dir = (args.dir ?? args.path ?? args.projectPath) as string | undefined;
      const confirmedViaFlag = args.confirm === true;
      const mutationsAllowed = confirmedViaFlag || (await this.isMutationAllowed(dir));
      if (!mutationsAllowed) {
        const env = failure(
          ErrorCodes.FORBIDDEN,
          `Mutative operation '${name}' requires confirmation. Pass { "confirm": true } or set mcp.allowMutations in evolith.yaml.`,
          meta(Date.now() - startTime),
        );
        this.metrics.recordToolCall(name, Date.now() - startTime, false);
        return { content: [{ type: 'text', text: JSON.stringify(env, null, 2) }], isError: true };
      }
    }

    try {
      const data = await tool.execute(args);
      const durationMs = Date.now() - startTime;
      this.metrics.recordToolCall(name, durationMs, true);
      const env = success(data, meta(durationMs));
      return { content: [{ type: 'text', text: JSON.stringify(env, null, 2) }] };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const env = toErrorEnvelope(err, meta(durationMs));
      this.metrics.recordToolCall(name, durationMs, false);
      this.metrics.recordError(env.error.message.substring(0, 80));
      return { content: [{ type: 'text', text: JSON.stringify(env, null, 2) }], isError: true };
    }
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
      // ToolCallResult is a structurally-valid CallToolResult; cast over the
      // SDK's experimental task-augmented union at this single boundary.
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
    });

    this.httpServer = http.createServer((req, res) => {
      if (!this.validateAuth(req, res)) return;

      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', transport: 'http', protocol: 'mcp' }));
        return;
      }

      transport
        .handleRequest(req as Parameters<typeof transport.handleRequest>[0], res)
        .catch((err: Error) => this.logger.error(`MCP transport error: ${err.message}`));
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
