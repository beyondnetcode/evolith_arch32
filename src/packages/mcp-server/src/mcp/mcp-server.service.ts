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
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { context as otelContext, propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import promClient from 'prom-client';
import { ToolRegistryService } from './tool-registry.service';
import { MetricsService } from './metrics.service';
import { AuditLogger } from './audit-logger';
import { ResourcesService } from './resources.service';
import { PromptsService } from './prompts.service';
import { generateCorrelationId } from '../common/envelopes';
import { ErrorCodes } from '../common/errors';
import { AbacEvaluator } from './abac-evaluator';
import { mcpContextStorage, McpUserContext } from './mcp-user-context';
import { authenticateHttpRequest } from './mcp-server-auth';
import { loadOAuthConfig, createJwksResolver, type OAuthConfig, type JwksKeyResolver } from './oauth-resource-server';
import { handleCallTool, handleListTools, ToolCallResult, redactArgs } from './mcp-tool-dispatch';
import { McpCacheService } from './mcp-cache.service';

export { McpUserContext, mcpContextStorage } from './mcp-user-context';
export { ToolCallResult } from './mcp-tool-dispatch';

// Prometheus default process/runtime metrics, registered once at module load
// (calling collectDefaultMetrics twice on the default registry throws).
let defaultMetricsRegistered = false;
function ensureDefaultMetrics(): void {
  if (!defaultMetricsRegistered) {
    promClient.collectDefaultMetrics({ prefix: 'evolith_mcp_' });
    defaultMetricsRegistered = true;
  }
}

import { RateLimitService } from './rate-limit.service';

// --- Body size limit (H2) — configurable via env vars ---
const MAX_BODY_BYTES = Number(process.env.MCP_MAX_BODY_BYTES) || 1024 * 1024;

export type McpTransport = 'stdio' | 'http';

export interface McpStartOptions {
  transport?: McpTransport;
  port?: number;
  apiKey?: string;
  allowNoAuth?: boolean;
  stdin?: Readable;
  stdout?: Writable;
}

const SERVER_NAME = 'evolith-mcp';
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
  // GT-520 · EAG-15 / AC1 — OAuth 2.1 resource-server config, derived from env at
  // start(). When present, remote Streamable HTTP requests are authenticated
  // against the configured issuer's JWKS/secret before ABAC. `null` = OAuth off
  // (the API-key / local-JWT / dev path applies). The resolver is a field so
  // tests can inject a pre-warmed JWKS key without a network round-trip.
  private oauthConfig: OAuthConfig | null = null;
  private oauthKeyResolver?: JwksKeyResolver;
  // StreamableHTTP is multi-client: one transport + Server per MCP session.
  // Keyed by the `mcp-session-id` the transport assigns on initialize. A single
  // shared transport (the old bug) rejected every second client with HTTP 400
  // "Server already initialized".
  private readonly httpSessions = new Map<string, { transport: StreamableHTTPServerTransport; server: Server }>();
  private readonly rateLimit = new RateLimitService();

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
      // Verdict resolution (GT-520 · EAG-15). EVERY tools/call is audited with an
      // explicit verdict AND the calling identity (userId/role/tenant). Because
      // dispatch runs the per-identity ABAC check (native + OPA), scope gate and
      // mutative-approval gate BEFORE the tool executes, an authorization refusal
      // surfaces as a FORBIDDEN envelope. Those are recorded as 'denied' — kept
      // distinct from downstream execution 'error's — so an auditor can query who
      // was refused which tool separately from tools that ran but then failed.
      let status: 'success' | 'error' | 'denied' = 'success';
      let errorMessage: string | undefined;
      if (result.isError) {
        let code: string | undefined;
        try {
          const env = JSON.parse(result.content[0].text);
          code = env?.error?.code;
          errorMessage = env?.error?.message;
        } catch {
          // Non-envelope error text: fall through as a generic execution error.
        }
        status = code === ErrorCodes.FORBIDDEN ? 'denied' : 'error';
      }
      this.auditLogger.logToolCall({
        tool: name,
        args: redactArgs(args),
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
        errorMessage,
      });
    }

    return result;
  }

  /** Whether mutations are pre-authorized via `mcp.allowMutations` in evolith.yaml. */
  async isMutationAllowed(dir?: string): Promise<boolean> {
    try {
      // fs-extra is CommonJS; under the runtime's ESM build its members live on
      // the `.default` export, so `(await import('fs-extra')).default` is required
      // (a bare `await import('fs-extra')` would leave fs.pathExists undefined).
      // Both fs-extra and yaml are CommonJS. Under the runtime's dynamic import
      // their exports surface on `.default` (a bare namespace access such as
      // `mod.parse` resolves to undefined for `yaml`), so normalize via `.default`
      // with a fallback to the namespace for defensiveness across Node versions.
      const fsMod = await import('fs-extra');
      const fs = fsMod.default ?? fsMod;
      const path = await import('node:path');
      const yamlMod = await import('yaml');
      const yaml = yamlMod.default ?? yamlMod;
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
    // Derive the OAuth resource-server config from env once at startup. When the
    // IdP-agnostic OAuth env is set (issuer + JWKS/secret), remote HTTP requests
    // are validated as OAuth 2.1 access tokens; otherwise this stays null and the
    // existing API-key/local-JWT/dev path is used unchanged.
    this.oauthConfig = loadOAuthConfig(process.env);
    if (this.oauthConfig && !this.oauthKeyResolver && this.oauthConfig.jwksUri) {
      this.oauthKeyResolver = createJwksResolver(this.oauthConfig.jwksUri);
    }
    this.server = this.buildServer();

    if (transport === 'http') {
      const isProduction = (process.env.NODE_ENV || 'development') === 'production';
      if (this.oauthConfig) {
        this.logger.log(`MCP HTTP OAuth resource-server enabled (issuer=${this.oauthConfig.issuer}${this.oauthConfig.jwksUri ? ', JWKS' : ', HS-secret'}). Remote requests require a valid Bearer access token.`);
      }
      if (!this.apiKey && !this.oauthConfig) {
        if (isProduction) {
          // validateAuth() ignores allowNoAuth in production for safety: every
          // request is rejected with 401 until EVOLITH_API_KEY / --api-key is set.
          this.logger.warn('MCP HTTP started without an API key in production — all requests will be rejected (401). Set EVOLITH_API_KEY or --api-key.');
        } else if (this.allowNoAuth) {
          this.logger.warn('MCP HTTP started without API key (--allow-no-auth) — every request gets ADMIN scope. Not honored in production.');
        }
      }
      await this.startHttp(options.port ?? 3000);
    } else {
      const stdioTransport = new StdioServerTransport(options.stdin, options.stdout);
      await this.server.connect(stdioTransport);
      this.logger.log('Evolith MCP server started on stdio');
    }
  }

  /**
   * Create a fresh Server + StreamableHTTPServerTransport pair for a new MCP
   * session and wire cleanup so the pair is dropped from {@link httpSessions}
   * when the transport closes (client DELETE or disconnect). Each session gets
   * its own Server so per-session request handlers/state never collide.
   */
  private createHttpSessionTransport(): StreamableHTTPServerTransport {
    const server = this.buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => generateCorrelationId(),
      enableJsonResponse: true,
      onsessioninitialized: (sessionId: string) => {
        this.httpSessions.set(sessionId, { transport, server });
      },
    });
    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid && this.httpSessions.get(sid)?.transport === transport) {
        this.httpSessions.delete(sid);
      }
    };
    // Fire-and-forget connect; handleRequest awaits transport readiness itself.
    void server.connect(transport);
    return transport;
  }

  /** Buffer a request body so we can inspect it (e.g. for `initialize`). */
  private static readBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      req.on('data', (c) => {
        totalBytes += c.length;
        if (totalBytes > MAX_BODY_BYTES) {
          req.destroy();
          reject(new Error('Request body exceeds 1 MB limit'));
          return;
        }
        chunks.push(Buffer.from(c));
      });
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        if (!raw) return resolve(undefined);
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(undefined);
        }
      });
      req.on('error', () => resolve(undefined));
    });
  }

  private async startHttp(port: number): Promise<void> {
    ensureDefaultMetrics();

    this.httpServer = http.createServer((req, res) => {
      // Auth (below) may be async (OAuth JWKS lookup), so run the request handler
      // in an async IIFE. authenticateHttpRequest / verifyOAuthToken never throw,
      // but guard defensively so a rejection can't take down the HTTP server.
      void this.handleHttpRequest(req, res, port).catch((err: unknown) => {
        this.logger.error(`MCP HTTP handler error: ${err instanceof Error ? err.message : String(err)}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null }));
        } else if (!res.writableEnded) {
          res.end();
        }
      });
    });

    // Bind 0.0.0.0 by default so reverse proxies (Traefik/Coolify/k8s) can route
    // to the container. Override with MCP_HTTP_HOST=127.0.0.1 for local-only use.
    const host = process.env.MCP_HTTP_HOST ?? '0.0.0.0';
    await new Promise<void>((resolve, reject) => {
      this.httpServer!.timeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS) || 30_000;
      this.httpServer!.keepAliveTimeout = Number(process.env.HTTP_KEEPALIVE_TIMEOUT_MS) || 65_000;
      this.httpServer!.listen(port, host, () => {
        this.logger.log(`Evolith MCP HTTP server listening on http://${host}:${port}`);
        resolve();
      });
      this.httpServer!.on('error', reject);
    });
  }

  /** Per-request handler for the Streamable HTTP transport. */
  private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse, port: number): Promise<void> {
      // Rate limiting (H1) — reject requests that exceed the per-IP limit
      const clientIp = req.socket.remoteAddress || 'unknown';
      if (this.rateLimit.isRateLimited(clientIp)) {
        const retryAfter = this.rateLimit.getRetryAfter();
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) });
        res.end(JSON.stringify({ error: 'Too many requests', retryAfter }));
        return;
      }

      res.setHeader('Content-Security-Policy', "default-src 'none'");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-XSS-Protection', '0');

      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

      // Health checks are public — orchestrators (Coolify/k8s) must reach the
      // liveness/readiness probes without credentials. They expose no MCP data.
      // /health is kept for back-compat; /health/live (liveness) and /health/ready
      // (readiness) are the split probes.
      if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/health/live')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', transport: 'http', protocol: 'mcp', probe: url.pathname === '/health/live' ? 'live' : 'health' }));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/health/ready') {
        // Ready once the HTTP server is accepting connections and the registry is built.
        const ready = this.httpServer !== null;
        res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: ready ? 'ok' : 'starting', probe: 'ready' }));
        return;
      }

      // Prometheus metrics (default process/runtime metrics under the evolith_mcp_
      // prefix). GT-549: authenticated for parity with core-api's guarded /metrics —
      // `/metrics` leaks operational shape (routes, volumes) and must not be readable
      // by anonymous callers. Uses the SAME credential path as MCP requests (shared
      // API key / OAuth / local JWT), so the dev `allowNoAuth` bypass still applies.
      if (req.method === 'GET' && url.pathname === '/metrics') {
        const metricsCtx = await authenticateHttpRequest(
          req,
          res,
          this.apiKey,
          this.allowNoAuth,
          this.oauthConfig,
          this.oauthKeyResolver,
        );
        if (!metricsCtx) return; // authenticateHttpRequest already wrote 401
        promClient.register.metrics().then((body) => {
          res.writeHead(200, { 'Content-Type': promClient.register.contentType });
          res.end(body);
        }).catch(() => {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('metrics unavailable');
        });
        return;
      }

      const context = await authenticateHttpRequest(
        req,
        res,
        this.apiKey,
        this.allowNoAuth,
        this.oauthConfig,
        this.oauthKeyResolver,
      );
      if (!context) return;

      const headerCorrelationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();

      const span = tracer.startSpan('mcp.http.request', {
        attributes: {
          'http.method': req.method || 'UNKNOWN',
          'http.url': url.pathname,
          'correlation.id': headerCorrelationId,
        },
      });

      const dispatch = (
        transport: StreamableHTTPServerTransport,
        parsedBody?: unknown,
      ): void => {
        mcpContextStorage.run(context as McpUserContext, () => {
          const otelGetter = {
            get: (c: Record<string, string>, k: string) => c[k],
            keys: (c: Record<string, string>) => Object.keys(c),
          };
          const extractedCtx = propagation.extract(otelContext.active(), req.headers as Record<string, string>, otelGetter);
          const spanCtx = trace.setSpan(extractedCtx, span);

          otelContext.with(spanCtx, () => {
            transport
              .handleRequest(req as Parameters<typeof transport.handleRequest>[0], res, parsedBody)
              .catch((err: Error) => {
                span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
                this.logger.error(`MCP transport error: ${err.message}`);
              })
              .finally(() => {
                span.end();
              });
          });
        });
      };

      const sendError = (status: number, message: string): void => {
        span.setStatus({ code: SpanStatusCode.ERROR, message });
        span.end();
        if (!res.headersSent) {
          res.writeHead(status, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32600, message: `Invalid Request: ${message}` },
          id: null,
        }));
      };

      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const existing = sessionId ? this.httpSessions.get(sessionId) : undefined;

      // Route requests that carry a known session id to their own transport.
      if (existing) {
        dispatch(existing.transport);
        return;
      }

      // A session id was supplied but is unknown/expired → 404 (not 401; auth passed).
      if (sessionId) {
        sendError(404, 'Session not found');
        return;
      }

      // No session id. A POST may be an `initialize` that mints a new session;
      // anything else without a session is a protocol error.
      if (req.method === 'POST') {
        McpServerService.readBody(req).then((body) => {
          if (isInitializeRequest(body)) {
            const transport = this.createHttpSessionTransport();
            dispatch(transport, body);
          } else {
            sendError(400, 'Server not initialized: missing mcp-session-id');
          }
        });
        return;
      }

      // GET (SSE stream) / DELETE without a session id have nothing to attach to.
      sendError(400, 'Missing mcp-session-id');
  }

  /** The actual bound TCP port for the HTTP transport (useful for tests). */
  boundPort(): number | undefined {
    const addr = this.httpServer?.address();
    return addr && typeof addr === 'object' ? addr.port : undefined;
  }

  async stop(): Promise<void> {
    await this.server?.close();
    // Tear down every live HTTP session transport/server pair.
    const sessions = Array.from(this.httpSessions.values());
    this.httpSessions.clear();
    await Promise.allSettled(
      sessions.flatMap(({ transport, server }) => [transport.close(), server.close()]),
    );
    if (this.httpServer) {
      await new Promise<void>((resolve) => this.httpServer!.close(() => resolve()));
      this.httpServer = null;
    }
  }
}
