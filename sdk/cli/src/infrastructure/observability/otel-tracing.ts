import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { trace } from '@opentelemetry/api';

const g = globalThis as { __otelSdk?: NodeSDK; __otelInitialized?: boolean };

export function initCliOtel(): void {
  if (g.__otelInitialized) return;
  if (process.env.OTEL_ENABLED !== 'true') return;

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    serviceName: 'evolith-cli',
  });

  sdk.start();
  g.__otelSdk = sdk;
  g.__otelInitialized = true;
}

export async function shutdownCliOtel(): Promise<void> {
  if (g.__otelSdk) {
    await g.__otelSdk.shutdown();
    g.__otelSdk = undefined;
  }
}

export function isOtelEnabled(): boolean {
  return g.__otelInitialized ?? false;
}

export const cliTracer = trace.getTracer('evolith-cli');
