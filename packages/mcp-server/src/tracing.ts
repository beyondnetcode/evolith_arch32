import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { trace } from '@opentelemetry/api';

const g = globalThis as { __otelSdk?: NodeSDK; __otelInitialized?: boolean };

if (!g.__otelInitialized && process.env.OTEL_ENABLED === 'true') {
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': { enabled: true },
      }),
    ],
    serviceName: 'evolith-mcp-server',
  });

  sdk.start();
  g.__otelSdk = sdk;
  g.__otelInitialized = true;
}

export async function shutdownOtel(): Promise<void> {
  if (g.__otelSdk) {
    await g.__otelSdk.shutdown();
    g.__otelSdk = undefined;
  }
}
