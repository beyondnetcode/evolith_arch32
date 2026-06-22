import { Injectable, Logger } from '@nestjs/common';
import * as http from 'node:http';
import type { Readable, Writable } from 'node:stream';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as crypto from 'node:crypto';
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
import { AbacEvaluator, AbacInput, AbacDecision } from './abac-evaluator';

export interface McpUserContext {
  id: string;
  role: string;
  roles: string[];
  tenant: string;
  environment: string;
  scopes: string[];
}

export const mcpContextStorage = new AsyncLocalStorage<McpUserContext>();

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
    private readonly abacEvaluator: AbacEvaluator,
    private readonly resources?: ResourcesService,
    private readonly prompts?: PromptsService,
  ) {}

  handleListTools(): { tools: ReturnType<ToolRegistryService['listSchemas']> } {
    const context = mcpContextStorage.getStore();
    const allowedTools = this.registry.list().filter((tool) => {
      if (!context) return true;
      const requiredScope = tool.scope || (tool.mutative ? 'write' : 'read');
      return context.scopes.includes(requiredScope);
    });
    return { tools: allowedTools.map((t) => t.schema) };
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

    const context = mcpContextStorage.getStore();
    const userContext: McpUserContext = context || {
      id: 'anonymous',
      role: 'anonymous',
      roles: [],
      tenant: 'default',
      environment: process.env.NODE_ENV || 'development',
      scopes: [],
    };

    const requiredScope = tool.scope || (tool.mutative ? 'write' : 'read');
    if (context && !context.scopes.includes(requiredScope)) {
      const env = failure(
        ErrorCodes.FORBIDDEN,
        `Access denied. Requires '${requiredScope}' scope.`,
        meta(Date.now() - startTime),
      );
      this.metrics.recordToolCall(name, Date.now() - startTime, false);
      return { content: [{ type: 'text', text: JSON.stringify(env, null, 2) }], isError: true };
    }

    // Perform ABAC checks (Dual-Engine: Native TS and OPA WASM)
    const abacInput: AbacInput = {
      user: {
        id: userContext.id,
        roles: userContext.roles,
        tenant: userContext.tenant,
      },
      tool_name: name,
      resource_domain: 'mcp-server',
      environment: userContext.environment,
    };

    let corePath = process.cwd();
    if (corePath.endsWith('packages/mcp-server')) {
      corePath = require('node:path').resolve(corePath, '../..');
    }

    const nativeDecision = this.abacEvaluator.evaluateNative(abacInput);
    const opaDecision = await this.abacEvaluator.evaluateOpa(abacInput, corePath);

    if (!nativeDecision.allowed || !opaDecision.allowed) {
      const nativeMsgs = nativeDecision.violations.map(v => `${v.id}: ${v.message}`).join('; ');
      const opaMsgs = opaDecision.violations.map(v => `${v.id}: ${v.message}`).join('; ');
      const env = failure(
        ErrorCodes.FORBIDDEN,
        `Access denied. ABAC check failed. Native: [${nativeMsgs}]. OPA: [${opaMsgs}].`,
        meta(Date.now() - startTime),
      );
      this.metrics.recordToolCall(name, Date.now() - startTime, false);
      return { content: [{ type: 'text', text: JSON.stringify(env, null, 2) }], isError: true };
    }

    if (tool.mutative) {
      if (args.apply !== true || !args.approvalToken || typeof args.approvalToken !== 'string' || args.approvalToken.trim() === '') {
        const env = failure(
          ErrorCodes.FORBIDDEN,
          `Mutative operation '${name}' requires approval. Pass { "apply": true, "approvalToken": "..." }`,
          meta(Date.now() - startTime),
        );
        this.metrics.recordToolCall(name, Date.now() - startTime, false);
        return { content: [{ type: 'text', text: JSON.stringify(env, null, 2) }], isError: true };
      }

      // Log structured audit event
      this.logger.log(JSON.stringify({
        event: 'MUTATIVE_TOOL_EXECUTION',
        user: {
          id: userContext.id,
          roles: userContext.roles,
          tenant: userContext.tenant,
        },
        scopes: userContext.scopes,
        tool: name,
        approvalToken: args.approvalToken,
        arguments: args,
        timestamp: new Date().toISOString(),
      }));
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
      const context = this.validateAuth(req, res);
      if (!context) return;

      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', transport: 'http', protocol: 'mcp' }));
        return;
      }

      mcpContextStorage.run(context, () => {
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

  private validateAuth(req: http.IncomingMessage, res: http.ServerResponse): McpUserContext | null {
    if (!this.apiKey) {
      return {
        id: 'admin-api-key',
        role: 'admin',
        roles: ['admin'],
        tenant: 'default',
        environment: process.env.NODE_ENV || 'development',
        scopes: ['read', 'write', 'admin'],
      };
    }

    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

    if (bearerToken === this.apiKey || apiKeyHeader === this.apiKey) {
      return {
        id: 'admin-api-key',
        role: 'admin',
        roles: ['admin'],
        tenant: 'default',
        environment: process.env.NODE_ENV || 'development',
        scopes: ['read', 'write', 'admin'],
      };
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (bearerToken && jwtSecret) {
      const payload = this.verifyJwtToken(bearerToken, jwtSecret);
      if (payload) {
        return this.getContextFromPayload(payload);
      }
    }

    const correlationId = generateCorrelationId();
    const env = failure(
      ErrorCodes.UNAUTHORIZED,
      'Invalid or missing API key or JWT token',
      { correlationId, tool: 'auth', durationMs: 0 }
    );
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(env));
    return null;
  }

  private verifyJwtToken(token: string, secret: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [headerB64, payloadB64, signatureB64] = parts;
      
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(`${headerB64}.${payloadB64}`);
      const expectedSignature = hmac.digest('base64url');
      if (signatureB64 !== expectedSignature) {
        return null;
      }
      
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);
      
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }
      
      return payload;
    } catch {
      return null;
    }
  }

  private getContextFromPayload(payload: any): McpUserContext {
    const role = payload.role || 'reader';
    let roles = payload.roles;
    if (!roles) {
      roles = [role];
    } else if (!Array.isArray(roles)) {
      roles = [roles];
    }
    const id = payload.sub || payload.id || 'unknown';
    const tenant = payload.tenant || 'default';
    const environment = payload.environment || process.env.NODE_ENV || 'development';

    let scopes: string[] = [];
    if (typeof payload.scope === 'string') {
      scopes = payload.scope.split(' ').map((s: string) => s.trim()).filter(Boolean);
    } else if (Array.isArray(payload.scopes)) {
      scopes = payload.scopes;
    } else {
      if (role === 'admin') {
        scopes = ['read', 'write', 'admin'];
      } else if (role === 'operator' || role === 'write') {
        scopes = ['read', 'write'];
      } else {
        scopes = ['read'];
      }
    }
    return { id, role, roles, tenant, environment, scopes };
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
