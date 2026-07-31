/**
 * GT-587 criterion 2 — MCP spans carry `mcp.*` attributes and take their trace
 * context from `_meta`.
 *
 * Both halves fail against the pre-GT-587 dispatch: it set no `mcp.*` attribute at
 * all, and it read `traceparent` only out of the tool's own ARGUMENTS, so a `_meta`
 * carrier produced an unlinked root span.
 *
 * The tracer here is a hand-rolled double rather than the OTel SDK on purpose: the
 * assertion is about which attribute NAMES and which carrier the dispatcher uses, and
 * an in-memory span exporter would let a wrong name pass as long as some span existed.
 */

import { ToolDispatchService, traceCarrierFromMeta } from './mcp-tool-dispatch';
import { MetricsService } from './metrics.service';
import { ToolRegistryService } from './tool-registry.service';
import { AbacEvaluator } from './abac-evaluator';
import { McpTool } from './tool.interface';
import { Logger } from '@nestjs/common';

class MockAbacEvaluator extends AbacEvaluator {
  override evaluateNative() {
    return { allowed: true, violations: [] };
  }
  override async evaluateOpa() {
    return { allowed: true, violations: [] };
  }
}

interface RecordedSpan {
  name: string;
  attributes: Record<string, unknown>;
  /** Whatever context object was handed to `startSpan` as the parent. */
  parentContext: unknown;
}

function recordingTracer(): { tracer: any; spans: RecordedSpan[] } {
  const spans: RecordedSpan[] = [];
  const tracer = {
    startSpan(name: string, options: any, ctx: unknown) {
      const recorded: RecordedSpan = { name, attributes: { ...(options?.attributes ?? {}) }, parentContext: ctx };
      spans.push(recorded);
      return {
        setStatus() {},
        setAttribute(key: string, value: unknown) {
          recorded.attributes[key] = value;
        },
        recordException() {},
        end() {},
        spanContext: () => ({ traceId: '0'.repeat(32), spanId: '0'.repeat(16), traceFlags: 0 }),
      };
    },
  };
  return { tracer, spans };
}

function dispatcher(tool: McpTool) {
  const registry = new ToolRegistryService([tool]);
  const { tracer, spans } = recordingTracer();
  const service = new ToolDispatchService(
    registry,
    new MetricsService(),
    new MockAbacEvaluator(),
    new Logger('test'),
    tracer,
  );
  return { service, spans };
}

const OK_TOOL: McpTool = {
  schema: { name: 'evolith-noop', description: 'd', inputSchema: { type: 'object', properties: {} } },
  execute: async () => ({ ok: true }),
};

/** A syntactically valid W3C traceparent with a non-zero trace id. */
const TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

describe('traceCarrierFromMeta', () => {
  it('lifts the three W3C keys out of _meta', () => {
    expect(traceCarrierFromMeta({ traceparent: TRACEPARENT, tracestate: 'a=1', baggage: 'k=v' })).toEqual({
      traceparent: TRACEPARENT,
      tracestate: 'a=1',
      baggage: 'k=v',
    });
  });

  it('drops everything else — _meta is an open map and must not become a carrier', () => {
    const carrier = traceCarrierFromMeta({
      traceparent: TRACEPARENT,
      'progressToken': 7,
      'x-injected': 'nope',
      tracestate: 42, // wrong type
    });
    expect(carrier).toEqual({ traceparent: TRACEPARENT });
  });

  it('is empty (not undefined) for an absent _meta', () => {
    expect(traceCarrierFromMeta(undefined)).toEqual({});
  });
});

describe('tools/call span — standard MCP attributes', () => {
  it('carries mcp.method.name and mcp.tool.name', async () => {
    const { service, spans } = dispatcher(OK_TOOL);
    await service.callTool('evolith-noop', {});

    expect(spans).toHaveLength(1);
    expect(spans[0].attributes['mcp.method.name']).toBe('tools/call');
    expect(spans[0].attributes['mcp.tool.name']).toBe('evolith-noop');
  });

  it('carries mcp.session.id when the transport supplied one', async () => {
    const { service, spans } = dispatcher(OK_TOOL);
    await service.callTool('evolith-noop', {}, { sessionId: 'sess-42' });

    expect(spans[0].attributes['mcp.session.id']).toBe('sess-42');
  });

  it('OMITS mcp.session.id for a transport without sessions (stdio)', async () => {
    const { service, spans } = dispatcher(OK_TOOL);
    await service.callTool('evolith-noop', {});

    expect(spans[0].attributes).not.toHaveProperty('mcp.session.id');
  });

  it('keeps the private evolith.* attributes alongside the standard ones', async () => {
    const { service, spans } = dispatcher(OK_TOOL);
    await service.callTool('evolith-noop', { tenant: 't1', initiative: 'i1', phase: 'design' });

    expect(spans[0].attributes['evolith.tenant']).toBe('t1');
    expect(spans[0].attributes['evolith.initiative']).toBe('i1');
    expect(spans[0].attributes['evolith.phase']).toBe('design');
    expect(spans[0].attributes['tool.name']).toBe('evolith-noop');
  });
});

describe('trace-context propagation', () => {
  // `propagation.extract` is a no-op until a propagator is registered. The NodeSDK
  // registers the W3C one at startup (`tracing.ts`); this reproduces that, because
  // without it every assertion below would report "no parent" and pass for the wrong
  // reason on a dispatcher that reads nothing at all.
  beforeAll(() => {
    const { propagation } = require('@opentelemetry/api');
    const { W3CTraceContextPropagator } = require('@opentelemetry/core');
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  });
  afterAll(() => {
    const { propagation } = require('@opentelemetry/api');
    propagation.disable();
  });

  /** Read the remote span context the dispatcher extracted into the parent context. */
  function extractedTraceId(parentContext: unknown): string | undefined {
    const { trace } = require('@opentelemetry/api');
    return trace.getSpanContext(parentContext)?.traceId;
  }

  it('adopts the trace context carried in _meta', async () => {
    const { service, spans } = dispatcher(OK_TOOL);
    await service.callTool('evolith-noop', {}, { meta: { traceparent: TRACEPARENT } });

    expect(extractedTraceId(spans[0].parentContext)).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('still honours the legacy traceparent ARGUMENT when _meta carries none', async () => {
    const { service, spans } = dispatcher(OK_TOOL);
    await service.callTool('evolith-noop', { traceparent: TRACEPARENT });

    expect(extractedTraceId(spans[0].parentContext)).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('prefers _meta over the legacy argument when both are present', async () => {
    const other = '00-11111111111111111111111111111111-2222222222222222-01';
    const { service, spans } = dispatcher(OK_TOOL);
    await service.callTool('evolith-noop', { traceparent: other }, { meta: { traceparent: TRACEPARENT } });

    expect(extractedTraceId(spans[0].parentContext)).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('starts a root span when neither source carries context', async () => {
    const { service, spans } = dispatcher(OK_TOOL);
    await service.callTool('evolith-noop', {});

    expect(extractedTraceId(spans[0].parentContext)).toBeUndefined();
  });
});
