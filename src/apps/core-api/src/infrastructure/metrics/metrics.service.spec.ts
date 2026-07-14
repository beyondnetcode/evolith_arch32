import { MetricsService } from './metrics.service';

describe('MetricsService (GT-542 gate signal / GT-543 HTTP latency)', () => {
  let metrics: MetricsService;
  beforeEach(() => {
    metrics = new MetricsService();
  });
  afterEach(() => metrics.onModuleDestroy());

  it('records a gate/architecture evaluation by verdict, gate and phase (GT-542)', async () => {
    metrics.recordGateEvaluation('PG1-01', 'PASS', 'discovery', undefined, 0.3);
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

describe('MetricsService — bounded tenant label (GT-548)', () => {
  const saved = process.env.EVOLITH_METRICS_TENANT_ALLOWLIST;
  afterEach(() => {
    if (saved === undefined) delete process.env.EVOLITH_METRICS_TENANT_ALLOWLIST;
    else process.env.EVOLITH_METRICS_TENANT_ALLOWLIST = saved;
  });

  it('labels an allowlisted tenant with its own series and collapses the rest to "other"', async () => {
    process.env.EVOLITH_METRICS_TENANT_ALLOWLIST = 't-acme, t-globex';
    const m = new MetricsService();
    m.recordGateEvaluation('evaluate', 'PASS', 'design', 't-acme'); // allowlisted → own series
    m.recordGateEvaluation('evaluate', 'PASS', 'design', 't-unknown'); // not listed → other
    m.recordGateEvaluation('evaluate', 'PASS', 'design', undefined); // unset → other
    const text = await m.getMetrics();
    expect(text).toMatch(/evolith_gate_evaluations_total\{[^}]*tenant="t-acme"[^}]*\}\s+1/);
    expect(text).toMatch(/evolith_gate_evaluations_total\{[^}]*tenant="other"[^}]*\}\s+2/);
    expect(text).not.toContain('tenant="t-unknown"'); // never leaks an unbounded id
    m.onModuleDestroy();
  });

  it('exposes boundedTenant: allowlisted passes through, everything else is "other"', () => {
    process.env.EVOLITH_METRICS_TENANT_ALLOWLIST = 't-acme';
    const m = new MetricsService();
    expect(m.boundedTenant('t-acme')).toBe('t-acme');
    expect(m.boundedTenant('t-other')).toBe('other');
    expect(m.boundedTenant(undefined)).toBe('other');
    m.onModuleDestroy();
  });
});
