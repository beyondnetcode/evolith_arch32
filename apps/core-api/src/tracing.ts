import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: otlpEndpoint }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
    }),
  ],
  serviceName: 'evolith-core-api',
});

if (process.env.NODE_ENV === 'production' || process.env.OTEL_ENABLED === 'true') {
  sdk.start();
  console.log('OpenTelemetry tracing initialized');
}

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => console.log('OpenTelemetry shut down'));
});
