import {
  buildDependencyCruiserSpec,
  createDependencyCruiserAdapter,
  parseDependencyCruiserReport,
} from './dependency-cruiser-adapter';
import { StubProcessRunner } from '../enforcer.types';

const REPORT = JSON.stringify({
  summary: {
    violations: [
      { type: 'dependency', from: 'src/domain/x.ts', to: 'src/infra/y.ts', rule: { name: 'no-domain-to-infra', severity: 'error' } },
      { type: 'cycle', from: 'src/a.ts', to: 'src/b.ts', rule: { name: 'no-circular', severity: 'warn' }, cycle: [{ name: 'src/b.ts' }, { name: 'src/a.ts' }] },
      { type: 'dependency', from: 'src/c.ts', to: 'src/d.ts', rule: { name: 'not-to-unresolvable', severity: 'info' }, line: 12, column: 3 },
      { type: 'dependency', from: 'src/e.ts', to: 'src/f.ts', rule: { name: 'suppressed', severity: 'ignore' } },
    ],
  },
});

describe('parseDependencyCruiserReport (GT-515 AC1 — TS violations → Violation with file:line)', () => {
  it('normalizes each violation with tool, ruleId, file, severity, fingerprint', () => {
    const out = parseDependencyCruiserReport(REPORT);
    expect(out).toHaveLength(3); // the `ignore`-severity one is dropped
    expect(out[0]).toMatchObject({
      tool: 'dependency-cruiser', ruleId: 'no-domain-to-infra', file: 'src/domain/x.ts', severity: 'error',
    });
    expect(out[0].fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it('maps depcruise severities error/warn/info and keeps line:column when present', () => {
    const out = parseDependencyCruiserReport(REPORT);
    expect(out.map((v) => v.severity)).toEqual(['error', 'warning', 'info']);
    const withLine = out.find((v) => v.ruleId === 'not-to-unresolvable')!;
    expect(withLine.line).toBe(12);
    expect(withLine.column).toBe(3);
  });

  it('includes the cycle path in the message for circular violations', () => {
    const out = parseDependencyCruiserReport(REPORT);
    expect(out.find((v) => v.ruleId === 'no-circular')!.message).toContain('cycle: src/b.ts → src/a.ts');
  });

  it('returns [] for a clean report or malformed input (zero false positives — AC3 parser side)', () => {
    expect(parseDependencyCruiserReport(JSON.stringify({ summary: { violations: [] } }))).toEqual([]);
    expect(parseDependencyCruiserReport('')).toEqual([]);
    expect(parseDependencyCruiserReport('not json')).toEqual([]);
    expect(parseDependencyCruiserReport('{}')).toEqual([]);
  });
});

describe('createDependencyCruiserAdapter (reuses the GT-514 ShellEnforcerAdapter seam)', () => {
  it('builds a `depcruise --output-type json` invocation with config + targets', () => {
    const spec = buildDependencyCruiserSpec({ satellitePath: '/w', corePath: '/c', rules: [] }, { configPath: '.dependency-cruiser.js', targets: ['src', 'apps'] });
    expect(spec.command).toBe('dependency-cruiser');
    expect(spec.args).toEqual(['--output-type', 'json', '--config', '.dependency-cruiser.js', 'src', 'apps']);
    expect(spec.cwd).toBe('/w');
  });

  it('runs through the injected runner and returns parsed violations', async () => {
    const adapter = createDependencyCruiserAdapter(new StubProcessRunner({ exitCode: 1, stdout: REPORT, stderr: '' }));
    const out = await adapter.analyze({ satellitePath: '/w', corePath: '/c', rules: [] });
    expect(adapter.tool).toBe('dependency-cruiser');
    expect(out.map((v) => v.ruleId)).toEqual(['no-domain-to-infra', 'no-circular', 'not-to-unresolvable']);
  });
});
