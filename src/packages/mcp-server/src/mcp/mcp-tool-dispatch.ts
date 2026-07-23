import { Logger } from '@nestjs/common';
import { context as otelContext, propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { ToolRegistryService } from './tool-registry.service';
import { MetricsService } from './metrics.service';
import { AbacEvaluator, AbacInput } from './abac-evaluator';
import { ErrorCodes } from '../common/errors';
import { failure, generateCorrelationId, success, toErrorEnvelope } from '../common/envelopes';
import { runWithContext } from '@beyondnet/evolith-core-domain/common/request-context';
import { mcpContextStorage, McpUserContext } from './mcp-user-context';

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
  isError?: boolean;
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
}

/** Backward-compatible aggregate. */
export type DispatchDeps = CallToolDeps;

export function handleListTools(deps: ListToolsDeps): {
  tools: ReturnType<ToolRegistryService['listSchemas']>;
} {
  const context = mcpContextStorage.getStore();
  const allowedTools = deps.registry.list().filter((tool) => {
    if (!context) return true;
    const requiredScope = tool.scope || (tool.mutative ? 'write' : 'read');
    return context.scopes.includes(requiredScope);
  });
  return { tools: allowedTools.map((t) => t.schema) };
}

export async function handleCallTool(
  name: string,
  args: Record<string, unknown> = {},
  deps: DispatchDeps,
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
    deps.metrics.recordToolCall(name, durationMs, false);
    return { content: [{ type: 'text', text: JSON.stringify(env, null, 2) }], isError: true };
  };

  const tool = deps.registry.get(name);
  if (!tool) {
    deps.metrics.recordError(`Unknown tool: ${name}`);
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

  const nativeDecision = deps.abacEvaluator.evaluateNative(abacInput);
  const opaDecision = await deps.abacEvaluator.evaluateOpa(abacInput, corePath);

  if (!nativeDecision.allowed || !opaDecision.allowed) {
    const nativeMsgs = nativeDecision.violations.map(v => `${v.id}: ${v.message}`).join('; ');
    const opaMsgs = opaDecision.violations.map(v => `${v.id}: ${v.message}`).join('; ');
    return errorEnvelope(
      failure(
        ErrorCodes.FORBIDDEN,
        `Access denied. ABAC check failed. Native: [${nativeMsgs}]. OPA: [${opaMsgs}].`,
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
    // GAP MCP-SECLOG: never log the raw approval token or raw arguments; redact
    // the token to a short fingerprint and strip secret-bearing arg keys.
    deps.logger.log(JSON.stringify({
      event: 'MUTATIVE_TOOL_EXECUTION',
      user: { id: userContext.id, roles: userContext.roles, tenant: tenant || userContext.tenant },
      scopes: userContext.scopes,
      tool: name,
      approvalTokenFingerprint: fingerprintToken(args.approvalToken as string),
      arguments: redactArgs(args),
      timestamp: new Date().toISOString(),
    }));
  }

  const traceparent = args.traceparent as string | undefined;
  const otelGetter = {
    get: (c: Record<string, string>, k: string) => c[k],
    keys: (c: Record<string, string>) => Object.keys(c),
  };
  const otelCtx = traceparent
    ? propagation.extract(otelContext.active(), { traceparent }, otelGetter)
    : otelContext.active();

  const span = deps.tracer.startSpan(
    `mcp.tool.${name}`,
    {
      attributes: {
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
    deps.metrics.recordToolCall(name, durationMs, true);
    const env = success(data, meta(durationMs));
    return { content: [{ type: 'text', text: JSON.stringify(env, null, 2) }] };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message });
    span.setAttribute('tool.duration_ms', durationMs);
    span.recordException(err instanceof Error ? err : new Error(String(err)));
    span.end();
    const env = toErrorEnvelope(err, meta(durationMs));
    deps.metrics.recordError(env.error.message.substring(0, 80));
    return errorEnvelope(env, durationMs);
  }
}
