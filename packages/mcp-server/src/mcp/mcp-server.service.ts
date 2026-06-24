import { Injectable, Logger, Optional } from '@nestjs/common';
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
import { context as otelContext, propagation, trace } from '@opentelemetry/api';
import { ToolRegistryService } from './tool-registry.service';
import { MetricsService } from './metrics.service';
import { AuditLogger } from './audit-logger';
import { ResourcesService } from './resources.service';
import { PromptsService } from './prompts.service';
import { generateCorrelationId } from '../common/envelopes';
import { AbacEvaluator } from './abac-evaluator';
import { mcpContextStorage, McpUserContext } from './mcp-user-context';
import { validateAuth } from './mcp-server-auth';
import { handleCallTool, handleListTools, ToolCallResult } from './mcp-tool-dispatch';
import { McpCacheService } from './mcp-cache.service';

export { McpUserContext, mcpContextStorage } from './mcp-user-context';
export { ToolCallResult } from './mcp-tool-dispatch';

export type McpTransport = 'stdio' | 'http';

export interface McpStartOptions {
  transport?: McpTransport;
  port?: number;
  apiKey?: string;
  allowNoAuth?: boolean;
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
  private allowNoAuth = false;

  constructor(
    private readonly registry: ToolRegistryService,
    private readonly metrics: MetricsService,
    private readonly abacEvaluator: AbacEvaluator,
    private readonly auditLogger?: AuditLogger,
    private readonly resources?: ResourcesService,
    private readonly prompts?: PromptsService,
    @Optional() private readonly cache?: McpCacheService,
  ) {}

  async handleListTools(): Promise<{ tools: ReturnType<ToolRegistryService['listSchemas']> }> {
    if (this.cache) {
      const cached = await this.cache.getToolsList();
      if (cached) return cached as { tools: ReturnType<ToolRegistryService['listSchemas']> };
    }
    const result = handleListTools({ registry: this.registry });
    if (this.cache) {
      await this.cache.setToolsList(result);
    }
    return result;
  }

  async handleCallTool(name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
    const correlationId = (args.correlationId as string) || generateCorrelationId();
    const startTime = Date.now();

    const result = await handleCallTool(name, args, {
      registry: this.registry,
      metrics: this.metrics,
      abacEvaluator: this.abacEvaluator,
      logger: this.logger,
      tracer,
    });

    if (this.auditLogger) {
      const durationMs = Date.now() - startTime;
      const context = mcpContextStorage.getStore();
      const status = result.isError ? 'error' : 'success';
      this.auditLogger.logToolCall({
        tool: name,
        args,
        context: {
          initiative: (args.initiative as string) || undefined,
          tenant: (args.tenant as string) || context?.tenant,
          phase: (args.phase as string) || undefined,
          userId: context?.id,
          role: context?.role,
        },
        durationMs,
        status,
        correlationId,
        errorMessage: result.isError ? JSON.parse(result.content[0].text).error?.message : undefined,
      });
    }

    return result;
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
      this.logger.warn('Failed to read evolith.yaml for mutation check, defaulting to not allowed');
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
    this.allowNoAuth = options.allowNoAuth ?? false;
    this.server = this.buildServer();

    if (transport === 'http') {
      if (!this.apiKey && this.allowNoAuth) {
        this.logger.warn('MCP HTTP started without API key (--allow-no-auth) — every request gets ADMIN scope');
      }
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
      const context = validateAuth(req, res, this.apiKey, this.allowNoAuth);
      if (!context) return;

      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', transport: 'http', protocol: 'mcp' }));
        return;
      }

      const headerCorrelationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();

      const span = tracer.startSpan('mcp.http.request', {
        attributes: {
          'http.method': req.method || 'UNKNOWN',
          'http.url': url.pathname,
          'correlation.id': headerCorrelationId,
        },
      });

      mcpContextStorage.run(context as McpUserContext, () => {
        const otelGetter = {
          get: (c: Record<string, string>, k: string) => c[k],
          keys: (c: Record<string, string>) => Object.keys(c),
        };
        const extractedCtx = propagation.extract(otelContext.active(), req.headers as Record<string, string>, otelGetter);
        const spanCtx = trace.setSpan(extractedCtx, span);

        otelContext.with(spanCtx, () => {
          transport
            .handleRequest(req as Parameters<typeof transport.handleRequest>[0], res)
            .catch((err: Error) => {
              span.setStatus({ code: trace.SpanStatusCode.ERROR, message: err.message });
              this.logger.error(`MCP transport error: ${err.message}`);
            })
            .finally(() => {
              span.end();
            });
        });
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
