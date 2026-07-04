import type { ITrackerTracePort } from '../../domain/ports/tracker-trace.port';
import type { TraceEvent } from '../../domain/contracts/trace';

// We define a lightweight interface for the OTel Tracer so we don't force a hard dependency
// on @opentelemetry/api in this domain package, preserving the agnostic architecture.
export interface OTelSpan {
  setAttribute(key: string, value: string | number | boolean): this;
  end(): void;
}

export interface OTelTracer {
  startSpan(name: string): OTelSpan;
}

export interface OpenTelemetryTrackerOptions {
  readonly tracer: OTelTracer;
}

/**
 * OpenTelemetryTrackerTraceAdapter — Maps semantic TraceEvents to OpenTelemetry Spans
 * and metrics for native integration with Grafana / Jaeger / Prometheus.
 */
export class OpenTelemetryTrackerTraceAdapter implements ITrackerTracePort {
  private readonly tracer: OTelTracer;

  constructor(options: OpenTelemetryTrackerOptions) {
    this.tracer = options.tracer;
  }

  async publish(event: TraceEvent): Promise<void> {
    const span = this.tracer.startSpan(`agent_runtime.${event.type}`);
    
    span.setAttribute('evolith.event_id', event.id);
    span.setAttribute('evolith.event_type', event.type);
    
    if (event.intent) span.setAttribute('evolith.intent', event.intent);
    if (event.capability) span.setAttribute('evolith.capability', event.capability);
    if (event.status) span.setAttribute('evolith.status', event.status);
    if (event.tenantId) span.setAttribute('evolith.tenant_id', event.tenantId);
    if (event.productId) span.setAttribute('evolith.product_id', event.productId);
    if (event.initiativeId) span.setAttribute('evolith.initiative_id', event.initiativeId);
    if (event.correlationId) span.setAttribute('evolith.correlation_id', event.correlationId);

    // If payload is present, we stringify it to attach as an attribute
    if (event.payload) {
      span.setAttribute('evolith.payload', JSON.stringify(event.payload));
    }
    
    span.end();
  }

  async publishMany(events: readonly TraceEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
