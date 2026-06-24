import { SatelliteContractRuleHandler } from './satellite-contract-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import * as yamlLib from 'yaml';
import * as path from 'path';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[]; files?: Record<string, string> } = {}) {
  const existing = new Set(cfg.existing ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
  } as unknown;
}

const yamlParser = { parse: (c: string) => yamlLib.parse(c), stringify: (d: unknown) => yamlLib.stringify(d) } as unknown;

function rule(id: string): NormalizedRule {
  return { id, severity: 'MUST', category: 'satellite-contract', title: 't', description: 'd', blocking: true, sourceFile: 's' };
}

const yaml = path.join(SAT, 'evolith.yaml');

describe('SatelliteContractRuleHandler', () => {
  it('canHandle matches SVC-*', () => {
    const h = new SatelliteContractRuleHandler(fsMock(), yamlParser);
    expect(h.canHandle(rule('SVC-01'))).toBe(true);
    expect(h.canHandle(rule('SVC-05'))).toBe(true);
    expect(h.canHandle(rule('DOD-01'))).toBe(false);
  });

  it('SVC-01 fails without evolith.yaml', async () => {
    const h = new SatelliteContractRuleHandler(fsMock(), yamlParser);
    expect((await h.evaluate(rule('SVC-01'), ctx)).result).toBe('failed');
  });

  it('SVC-01 passes with evolith.yaml', async () => {
    const h = new SatelliteContractRuleHandler(fsMock({ existing: [yaml] }), yamlParser);
    expect((await h.evaluate(rule('SVC-01'), ctx)).result).toBe('passed');
  });

  it('SVC-02 always skips (registry check)', async () => {
    const h = new SatelliteContractRuleHandler(fsMock(), yamlParser);
    expect((await h.evaluate(rule('SVC-02'), ctx)).result).toBe('skipped');
  });

  it('SVC-03 checks ADR-0047 for F1 satellites', async () => {
    const compliant = `metadata:\n  phase: F1\nspec:\n  compliance:\n    adrRegistry:\n      - core/ADR-0047\n`;
    const h = new SatelliteContractRuleHandler(fsMock({ existing: [yaml], files: { [yaml]: compliant } }), yamlParser);
    expect((await h.evaluate(rule('SVC-03'), ctx)).result).toBe('passed');

    const missing = `metadata:\n  phase: F1\nspec:\n  compliance:\n    adrRegistry: []\n`;
    const h2 = new SatelliteContractRuleHandler(fsMock({ existing: [yaml], files: { [yaml]: missing } }), yamlParser);
    expect((await h2.evaluate(rule('SVC-03'), ctx)).result).toBe('failed');
  });

  it('SVC-04 checks extraction readiness for F2', async () => {
    const f2yaml = `metadata:\n  phase: F2\n`;
    const h = new SatelliteContractRuleHandler(fsMock({
      existing: [yaml, path.join(SAT, 'docs', 'extraction-readiness.md')],
      files: { [yaml]: f2yaml },
    }), yamlParser);
    expect((await h.evaluate(rule('SVC-04'), ctx)).result).toBe('passed');
  });

  it('SVC-05 always skips (registry check)', async () => {
    const h = new SatelliteContractRuleHandler(fsMock(), yamlParser);
    expect((await h.evaluate(rule('SVC-05'), ctx)).result).toBe('skipped');
  });
});
