import { ingestSarif, sarifLevelToSeverity, type SarifLog } from './sarif-ingester';

function sarif(driver: string, results: unknown[]): SarifLog {
  return { version: '2.1.0', runs: [{ tool: { driver: { name: driver } }, results: results as any }] };
}

const result = (ruleId: string, level: string, uri: string, startLine?: number, startColumn?: number) => ({
  ruleId,
  level,
  message: { text: `${ruleId} at ${uri}` },
  locations: [{ physicalLocation: { artifactLocation: { uri }, region: { startLine, startColumn } } }],
});

describe('ingestSarif (GT-515 AC2 — generic SARIF 2.1.0 → Violation)', () => {
  it('maps results with file:line:column, tool from driver, and mapped severity', () => {
    const out = ingestSarif(sarif('semgrep', [result('rules.no-eval', 'error', 'src/a.ts', 10, 4)]));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ tool: 'semgrep', ruleId: 'rules.no-eval', file: 'src/a.ts', line: 10, column: 4, severity: 'error' });
    expect(out[0].fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(out[0].message).toBe('rules.no-eval at src/a.ts');
  });

  it('is generic — the SAME ingester serves a different tool with the same shape', () => {
    const a = ingestSarif(sarif('eslint', [result('no-unused', 'warning', 'src/b.ts', 1)]));
    const b = ingestSarif(sarif('trivy', [result('CVE-2026-1', 'error', 'go.mod', 2)]));
    expect(a[0].tool).toBe('eslint');
    expect(b[0].tool).toBe('trivy');
  });

  it('maps SARIF levels error/warning/note/none and defaults missing level to warning', () => {
    expect(sarifLevelToSeverity('error')).toBe('error');
    expect(sarifLevelToSeverity('warning')).toBe('warning');
    expect(sarifLevelToSeverity('note')).toBe('info');
    expect(sarifLevelToSeverity('none')).toBe('info');
    expect(sarifLevelToSeverity(undefined)).toBe('warning');
    const out = ingestSarif(sarif('x', [{ ruleId: 'r1', message: { text: 'm' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'f' } } }] }]));
    expect(out[0].severity).toBe('warning');
  });

  it('accepts a raw JSON string and handles multiple runs', () => {
    const log = { version: '2.1.0', runs: [
      { tool: { driver: { name: 't1' } }, results: [result('r1', 'error', 'a', 1)] },
      { tool: { driver: { name: 't2' } }, results: [result('r2', 'note', 'b', 2)] },
    ] };
    const out = ingestSarif(JSON.stringify(log));
    expect(out.map((v) => v.tool)).toEqual(['t1', 't2']);
    expect(out.map((v) => v.severity)).toEqual(['error', 'info']);
  });

  it('returns [] on empty/malformed input and skips results without a ruleId', () => {
    expect(ingestSarif('')).toEqual([]);
    expect(ingestSarif('not json')).toEqual([]);
    expect(ingestSarif({ runs: [] })).toEqual([]);
    expect(ingestSarif(sarif('x', [{ level: 'error', message: { text: 'no rule id' } }]))).toEqual([]);
  });
});
