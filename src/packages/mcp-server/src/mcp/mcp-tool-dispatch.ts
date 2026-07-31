import { Injectable, Logger } from '@nestjs/common';
import { context as otelContext, propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { ToolRegistryService } from './tool-registry.service';
import { MetricsService } from './metrics.service';
import { AbacEvaluator, AbacInput } from './abac-evaluator';
import { ErrorCodes } from '../common/errors';
import { failure, generateCorrelationId, success, toErrorEnvelope } from '../common/envelopes';
import { runWithContext } from '@beyondnet/evolith-core-domain/common/request-context';
import {
  ATTR_MCP_METHOD_NAME,
  ATTR_MCP_SESSION_ID,
  ATTR_MCP_TOOL_NAME,
  MCP_METHOD_NAME_VALUE_TOOLS_CALL,
} from '@beyondnet/evolith-core-domain/evaluation';
import { mcpContextStorage, McpUserContext } from './mcp-user-context';
import { describeAbacDenial } from './abac-denial-remediation';
import {
  baseShaIsRequired,
  readHeadSha,
  verifyBaseSha,
  type HeadShaReader,
} from './workspace-concurrency';

/** Keys whose values must never reach the log sink in cleartext. */
const SENSITIVE_ARG_KEYS = new Set(['approvalToken', 'apiKey', 'api_key', 'token', 'secret', 'password', 'authorization']);

/** Reduce an approval token to a non-reversible fingerprint (algo + last 4). */
function fingerprintToken(token: string | undefined): string {
  if (!token || typeof token !== 'string') return 'none';
  const digest = createHash('sha256').update(token).digest('hex').slice(0, 12);
  return `sha256:${digest}…${token.slice(-4)}`;
}

/** Shallow-redact secret-bearing keys before logging tool arguments. */
export function redactArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    out[key] = SENSITIVE_ARG_KEYS.has(key) ? '[redacted]' : value;
  }
  return out;
}

export interface ToolCallResult {
  content: Array<{ type: 'text'; text: string }>;
  /**
   * GT-581 — the same envelope as `content[0].text`, as an object rather than a
   * string. Every tool declares an `outputSchema` (see `tool-output-schema.ts`),
   * and the MCP SDK requires a tool that declares one to return
   * `structuredContent`, so a consumer no longer parses prose to reach the
   * verdict. Emitted on failures too: an ABAC denial is exactly the result a
   * caller most needs to read mechanically.
   */
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/**
 * Per-call transport facts a tool's ARGUMENTS cannot carry (GT-587).
 *
 * `_meta` is the MCP request's out-of-band metadata field, and it is where the protocol
 * documents trace-context propagation (`traceparent`/`tracestate`/`baggage`, SEP-414).
 * That distinction matters: before this, the only way to join an MCP tool span to the
 * caller's trace was a `traceparent` smuggled into the tool's own arguments — which
 * every tool schema had to tolerate, which showed up in audit logs as if it were input,
 * and which no standard client would ever send. Reading `_meta` means a conformant
 * client's trace context works with no cooperation from the tool.
 */
export interface ToolCallOptions {
  /** `request.params._meta` verbatim. Unknown keys are ignored. */
  readonly meta?: Record<string, unknown>;
  /** Transport session id (`RequestHandlerExtra.sessionId`), when the transport has one. */
  readonly sessionId?: string;
}

/**
 * W3C trace-context keys, lower-cased as the propagator expects them. Only these three
 * are lifted out of `_meta`: `_meta` is an open map and copying it wholesale into a
 * propagation carrier would let a caller inject arbitrary keys into the trace context.
 */
const TRACE_CONTEXT_KEYS = ['traceparent', 'tracestate', 'baggage'] as const;

/** Build a propagation carrier from `_meta`, keeping only string-valued W3C keys. */
export function traceCarrierFromMeta(meta: Record<string, unknown> | undefined): Record<string, string> {
  const carrier: Record<string, string> = {};
  if (!meta) return carrier;
  for (const key of TRACE_CONTEXT_KEYS) {
    const value = meta[key];
    if (typeof value === 'string' && value.length > 0) carrier[key] = value;
  }
  return carrier;
}

/** Dependencies for listing tools — only needs the registry. */
export interface ListToolsDeps {
  registry: ToolRegistryService;
}

/** Dependencies for calling tools — needs all dispatch concerns. */
export interface CallToolDeps {
  registry: ToolRegistryService;
  metrics: MetricsService;
  abacEvaluator: AbacEvaluator;
  logger: Logger;
  tracer: ReturnType<typeof trace.getTracer>;
  /** GT-606 — override the HEAD reader (tests only); defaults to `git rev-parse HEAD`. */
  headShaReader?: HeadShaReader;
}

/** Backward-compatible aggregate. */
export type DispatchDeps = CallToolDeps;

/**
 * Tool Dispatch Service — encapsulates MCP tool listing and calling logic.
 * Converted from procedural module to class for testability (SRP + encapsulation).
 */
@Injectable()
export class ToolDispatchService {
  constructor(
    private readonly registry: ToolRegistryService,
    private readonly metrics: MetricsService,
    private readonly abacEvaluator: AbacEvaluator,
    private readonly logger: Logger,
    private readonly tracer: ReturnType<typeof trace.getTracer>,
    /**
     * GT-606 — how the dispatch learns the workspace HEAD (ADR-0093 §1).
     * Injectable purely so a test can interleave a real commit with an in-flight
     * call; production always uses `git rev-parse HEAD`.
     */
    private readonly headShaReader: HeadShaReader = readHeadSha,
  ) {}

  /** List tools allowed for the current user context. */
  listTools(): { tools: ReturnType<ToolRegistryService['listSchemas']> } {
    return handleListTools({ registry: this.registry });
  }

  /** Execute a tool by name with ABAC, approval, and tracing. */
  async callTool(
    name: string,
    args: Record<string, unknown> = {},
    options: ToolCallOptions = {},
  ): Promise<ToolCallResult> {
    const argContext = (args.context as Record<string, unknown> | undefined) || {};
    const correlationId = (args.correlationId as string) || (argContext.correlationId as string) || generateCorrelationId();
    const initiative = (args.initiative as string | undefined) ?? (argContext.initiative as string | undefined);
    const tenant = (args.tenant as string | undefined) ?? (argContext.tenant as string | undefined);
    const phase = (args.phase as string | undefined) ?? (argContext.phase as string | undefined);

    const contextObj = {
      ...(initiative ? { initiative } : {}),
      ...(tenant ? { tenant } : {}),
      ...(phase ? { phase } : {}),
    };
    const startTime = Date.now();
    const meta = (durationMs: number) => ({
      correlationId,
      tool: name,
      durationMs,
      ...(Object.keys(contextObj).length > 0 ? { context: contextObj } : {}),
    });
    const errorEnvelope = (env: unknown, durationMs: number): ToolCallResult => {
      this.metrics.recordToolCall(name, durationMs, false);
      return {
        content: [{ type: 'text', text: JSON.stringify(env, null, 2) }],
        structuredContent: env as Record<string, unknown>,
        isError: true,
      };
    };

    const tool = this.registry.get(name);
    if (!tool) {
      this.metrics.recordError(`Unknown tool: ${name}`);
      return errorEnvelope(failure(ErrorCodes.NOT_IMPLEMENTED, `Unknown tool: ${name}`, meta(0)), 0);
    }

    const context = mcpContextStorage.getStore();
    const userContext: McpUserContext = context || {
      id: 'anonymous',
      role: 'anonymous',
      roles: [],
      tenant: tenant || 'default',
      environment: process.env.NODE_ENV || 'development',
      scopes: [],
    };

    const requiredScope = tool.scope || (tool.mutative ? 'write' : 'read');
    if (context && !context.scopes.includes(requiredScope)) {
      return errorEnvelope(
        failure(ErrorCodes.FORBIDDEN, `Access denied. Requires '${requiredScope}' scope.`, meta(Date.now() - startTime)),
        Date.now() - startTime,
      );
    }

    const abacInput: AbacInput = {
      user: { id: userContext.id, roles: userContext.roles, tenant: tenant || userContext.tenant },
      tool_name: name,
      resource_domain: 'mcp-server',
      environment: userContext.environment,
    };

    let corePath = process.cwd();
    if (corePath.endsWith('packages/mcp-server')) {
      corePath = path.resolve(corePath, '../..');
    }

    const nativeDecision = this.abacEvaluator.evaluateNative(abacInput);
    const opaDecision = await this.abacEvaluator.evaluateOpa(abacInput, corePath);

    if (!nativeDecision.allowed || !opaDecision.allowed) {
      const nativeMsgs = nativeDecision.violations.map(v => `${v.id}: ${v.message}`).join('; ');
      const opaMsgs = opaDecision.violations.map(v => `${v.id}: ${v.message}`).join('; ');
      // GT-572: a denial has to say WHY and WHAT TO DO. The raw violation ids stay
      // (tests, dashboards and the audit trail key off them); the remediation is
      // appended after them and cannot change the decision.
      const remediation = describeAbacDenial([
        ...(nativeDecision.allowed ? [] : nativeDecision.violations),
        ...(opaDecision.allowed ? [] : opaDecision.violations),
      ]);
      return errorEnvelope(
        failure(
          ErrorCodes.FORBIDDEN,
          `Access denied. ABAC check failed. Native: [${nativeMsgs}]. OPA: [${opaMsgs}].${remediation}`,
          meta(Date.now() - startTime),
        ),
        Date.now() - startTime,
      );
    }

    if (tool.mutative) {
      if (args.apply !== true || !args.approvalToken || typeof args.approvalToken !== 'string' || args.approvalToken.trim() === '') {
        return errorEnvelope(
          failure(
            ErrorCodes.FORBIDDEN,
            `Mutative operation '${name}' requires approval. Pass { "apply": true, "approvalToken": "..." }`,
            meta(Date.now() - startTime),
          ),
          Date.now() - startTime,
        );
      }
      // GT-606 / ADR-0093 §1 — Optimistic State Verification. This runs BEFORE
      // `tool.execute`, so a rejected call has written nothing. It is enforced
      // here, on `tool.mutative`, rather than in each tool, so that the set of
      // protected tools is exactly the set of mutative tools by construction —
      // a tool added later cannot arrive unprotected.
      const conflict = await verifyBaseSha({
        args,
        readHead: this.headShaReader,
        requireBaseSha: baseShaIsRequired(),
      });
      if (conflict) {
        const { message, ...details } = conflict;
        return errorEnvelope(
          failure(
            ErrorCodes.CONCURRENCY_CONFLICT,
            `Mutative operation '${name}' rejected. ${message}`,
            meta(Date.now() - startTime),
            details,
          ),
          Date.now() - startTime,
        );
      }

      this.logger.log(JSON.stringify({
        event: 'MUTATIVE_TOOL_EXECUTION',
        user: { id: userContext.id, roles: userContext.roles, tenant: tenant || userContext.tenant },
        scopes: userContext.scopes,
        tool: name,
        approvalTokenFingerprint: fingerprintToken(args.approvalToken as string),
        arguments: redactArgs(args),
        timestamp: new Date().toISOString(),
      }));
    }

    // GT-587: `_meta` first — that is where the protocol puts trace context. The
    // `args.traceparent` path stays as a FALLBACK rather than being deleted: clients
    // already using it would otherwise silently lose their trace linkage, and a
    // telemetry regression is invisible until someone goes looking for a trace.
    const metaCarrier = traceCarrierFromMeta(options.meta);
    const legacyTraceparent = args.traceparent as string | undefined;
    const carrier =
      Object.keys(metaCarrier).length > 0
        ? metaCarrier
        : legacyTraceparent
          ? { traceparent: legacyTraceparent }
          : undefined;
    const otelGetter = {
      get: (c: Record<string, string>, k: string) => c[k],
      keys: (c: Record<string, string>) => Object.keys(c),
    };
    const otelCtx = carrier
      ? propagation.extract(otelContext.active(), carrier, otelGetter)
      : otelContext.active();

    const span = this.tracer.startSpan(
      `mcp.tool.${name}`,
      {
        attributes: {
          // GT-587 — standard MCP vocabulary, emitted ALONGSIDE the private names
          // below (which are already collected and must not move).
          [ATTR_MCP_METHOD_NAME]: MCP_METHOD_NAME_VALUE_TOOLS_CALL,
          [ATTR_MCP_TOOL_NAME]: name,
          ...(options.sessionId ? { [ATTR_MCP_SESSION_ID]: options.sessionId } : {}),
          'correlation.id': correlationId,
          'tool.name': name,
          'tool.mutative': !!tool.mutative,
          ...(initiative ? { 'evolith.initiative': initiative } : {}),
          ...(tenant ? { 'evolith.tenant': tenant } : {}),
          ...(phase ? { 'evolith.phase': phase } : {}),
        },
      },
      otelCtx,
    );

    try {
      const data = await otelContext.with(trace.setSpan(otelCtx, span), () =>
        runWithContext({ correlationId, initiative, tenant, phase }, () => tool.execute(args)),
      );
      const durationMs = Date.now() - startTime;
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('tool.duration_ms', durationMs);
      span.end();
      this.metrics.recordToolCall(name, durationMs, true);
      const env = success(data, meta(durationMs));
      return {
        content: [{ type: 'text', text: JSON.stringify(env, null, 2) }],
        structuredContent: env as unknown as Record<string, unknown>,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message });
      span.setAttribute('tool.duration_ms', durationMs);
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      span.end();
      const env = toErrorEnvelope(err, meta(durationMs));
      this.metrics.recordError(env.error.message.substring(0, 80));
      return errorEnvelope(env, durationMs);
    }
  }
}

// ─── Backward-compatible standalone functions ──────────────────────────

/**
 * @deprecated Use ToolDispatchService.listTools() instead.
 * Kept for backward compatibility with existing callers.
 *
 * GT-581: `registry.list()` is already sorted by name, and the schemas go through
 * `registry.describe()` so every advertised tool carries its derived
 * `outputSchema` and annotations. Scope filtering is order-preserving, so the
 * response is deterministic for a given principal.
 */
export function handleListTools(deps: ListToolsDeps): {
  tools: ReturnType<ToolRegistryService['listSchemas']>;
} {
  const context = mcpContextStorage.getStore();
  const allowedTools = deps.registry.list().filter((tool) => {
    if (!context) return true;
    const requiredScope = tool.scope || (tool.mutative ? 'write' : 'read');
    return context.scopes.includes(requiredScope);
  });
  return { tools: allowedTools.map((t) => deps.registry.describe(t)) };
}

/**
 * @deprecated Use ToolDispatchService.callTool() instead.
 * Kept for backward compatibility with existing callers.
 */
export async function handleCallTool(
  name: string,
  args: Record<string, unknown> = {},
  deps: DispatchDeps,
  options: ToolCallOptions = {},
): Promise<ToolCallResult> {
  const service = new ToolDispatchService(
    deps.registry, deps.metrics, deps.abacEvaluator, deps.logger, deps.tracer,
    deps.headShaReader ?? readHeadSha,
  );
  return service.callTool(name, args, options);
}
