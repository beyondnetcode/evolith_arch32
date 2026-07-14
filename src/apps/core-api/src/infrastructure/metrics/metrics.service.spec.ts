import { MetricsService } from './metrics.service';

describe('MetricsService (GT-542 gate signal / GT-543 HTTP latency)', () => {
  let metrics: MetricsService;
  beforeEach(() => {
    metrics = new MetricsService();
  });
  afterEach(() => metrics.onModuleDestroy());

  it('records a gate/architecture evaluation by verdict, gate and phase (GT-542)', async () => {
    metrics.recordGateEvaluation('PG1-01', 'PASS', 'discovery', 0.3);
    const text = await metrics.getMetrics();
    // Label order is registry-defined; assert order-independently.
    expect(text).toMatch(
      /evolith_gate_evaluations_total\{(?=[^}]*status="PASS")(?=[^}]*gateId="PG1-01")(?=[^}]*phase="discovery")[^}]*\}\s+1/,
    );
    expect(text).toContain('evolith_gate_evaluation_duration_seconds_bucket');
  });

  it('records the HTTP request-duration histogram alongside the counter (GT-543)', async () => {
    metrics.recordHttpRequest('GET', '/health', 200, 0.05);
    const text = await metrics.getMetrics();
    expect(text).toMatch(/evolith_http_requests_total\{[^}]*status="200"[^}]*\}\s+1/);
    // The histogram the HighLatency alert / latency SLO depend on must now exist.
    expect(text).toContain('evolith_http_request_duration_seconds_bucket');
    expect(text).toMatch(/evolith_http_request_duration_seconds_count\{[^}]*\}\s+1/);
  });

  it('counts the request but records no duration observation when none is supplied', async () => {
    metrics.recordHttpRequest('GET', '/health', 200);
    const text = await metrics.getMetrics();
    expect(text).toMatch(/evolith_http_requests_total\{[^}]*\}\s+1/);
    // An unobserved histogram emits no series → the count line is absent (never > 0).
    expect(text).not.toMatch(/evolith_http_request_duration_seconds_count\{[^}]*\}\s+[1-9]/);
  });
});
