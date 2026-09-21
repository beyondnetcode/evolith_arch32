import { TelemetryEvidenceRuleHandler } from './telemetry-evidence-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

const ctx = { satellitePath: '/sat', corePath: '/core' };

function fsMock(pkg?: Record<string, unknown>, broken = false) {
  return {
    exists: jest.fn(async (p: string) => p === '/sat/package.json' && pkg !== undefined),
    readJson: jest.fn(async () => { if (broken) throw new Error('bad json'); return pkg; }),
  } as unknown as ConstructorParameters<typeof TelemetryEvidenceRuleHandler>[0];
}

const rule = (id: string): NormalizedRule =>
  ({ id, severity: 'MUST', category: 'observability', title: id, description: '', blocking: true, sourceFile: 's' });

const outcome = async (id: string, pkg?: Record<string, unknown>, broken = false) =>
  (await new TelemetryEvidenceRuleHandler(fsMock(pkg, broken)).evaluate(rule(id), ctx)).result;

describe('TelemetryEvidenceRuleHandler · GT-716 AC4 (the native twin of telemetry-evidence.rego)', () => {
  it('claims exactly OBS-EVD-01..03', () => {
    const h = new TelemetryEvidenceRuleHandler(fsMock());
    expect(['OBS-EVD-01', 'OBS-EVD-02', 'OBS-EVD-03'].every((id) => h.canHandle(rule(id)))).toBe(true);
    expect(h.canHandle(rule('OBS-EVD-04'))).toBe(false);
  });

  it('OBS-EVD-01: a tracing package passes — any @opentelemetry/*, dd-trace or elastic-apm-node', async () => {
    expect(await outcome('OBS-EVD-01', { dependencies: { '@opentelemetry/api': '1' } })).toBe('passed');
    expect(await outcome('OBS-EVD-01', { devDependencies: { 'dd-trace': '5' } })).toBe('passed');
    expect(await outcome('OBS-EVD-01', { dependencies: { express: '4' } })).toBe('failed');
  });

  it('OBS-EVD-02: pino, winston, bunyan or @nestjs/common passes', async () => {
    expect(await outcome('OBS-EVD-02', { dependencies: { pino: '9' } })).toBe('passed');
    expect(await outcome('OBS-EVD-02', { dependencies: { '@nestjs/common': '11' } })).toBe('passed');
    expect(await outcome('OBS-EVD-02', { dependencies: { debug: '4' } })).toBe('failed');
  });

  it('OBS-EVD-03: prom-client or any @opentelemetry/* passes', async () => {
    expect(await outcome('OBS-EVD-03', { dependencies: { 'prom-client': '15' } })).toBe('passed');
    expect(await outcome('OBS-EVD-03', { dependencies: { '@opentelemetry/sdk-metrics': '1' } })).toBe('passed');
    expect(await outcome('OBS-EVD-03', { dependencies: { pino: '9' } })).toBe('failed');
  });

  it('no manifest, or an unreadable one, is "no packages" — a verdict, not a skip, exactly as the policy reads it', async () => {
    expect(await outcome('OBS-EVD-01')).toBe('failed');
    expect(await outcome('OBS-EVD-02', {}, true)).toBe('failed');
  });

  it('every failure names the packages that would have satisfied it', async () => {
    const r = await new TelemetryEvidenceRuleHandler(fsMock({})).evaluate(rule('OBS-EVD-03'), ctx);
    expect(r.result).toBe('failed');
    expect(r.message).toMatch(/prom-client, @opentelemetry\/\*/);
  });
});
