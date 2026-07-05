import { SdlcRuleHandler } from './sdlc-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import * as path from 'path';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[] } = {}) {
  const existing = new Set(cfg.existing ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
  } as unknown;
}

function rule(id: string): NormalizedRule {
  return { id, severity: 'MUST', category: 'testing', title: 't', description: 'd', blocking: true, sourceFile: 's' };
}

describe('SdlcRuleHandler', () => {
  it('canHandle matches QT-* rule ids', () => {
    const h = new SdlcRuleHandler(fsMock());
    expect(h.canHandle(rule('QT-01'))).toBe(true);
    expect(h.canHandle(rule('QT-08'))).toBe(true);
    expect(h.canHandle(rule('DOD-01'))).toBe(false);
  });

  it('QT-01 passes when coverage evidence exists', async () => {
    const h = new SdlcRuleHandler(fsMock({ existing: [path.join(SAT, 'coverage')] }));
    expect((await h.evaluate(rule('QT-01'), ctx)).result).toBe('passed');
  });

  it('QT-01 skips when no coverage evidence', async () => {
    const h = new SdlcRuleHandler(fsMock());
    expect((await h.evaluate(rule('QT-01'), ctx)).result).toBe('skipped');
  });

  it('QT-03 passes when security scan exists in core', async () => {
    const h = new SdlcRuleHandler(fsMock({ existing: [path.join(CORE, 'security-scan.json')] }));
    expect((await h.evaluate(rule('QT-03'), ctx)).result).toBe('passed');
  });

  it('QT-05 always passes (runtime analysis)', async () => {
    const h = new SdlcRuleHandler(fsMock());
    expect((await h.evaluate(rule('QT-05'), ctx)).result).toBe('passed');
  });

  it('QT-06 passes when docs exist', async () => {
    const h = new SdlcRuleHandler(fsMock({ existing: [path.join(SAT, 'docs')] }));
    expect((await h.evaluate(rule('QT-06'), ctx)).result).toBe('passed');
  });

  it('skips unhandled QT rule', async () => {
    const h = new SdlcRuleHandler(fsMock());
    expect((await h.evaluate(rule('QT-99'), ctx)).result).toBe('skipped');
  });
});
