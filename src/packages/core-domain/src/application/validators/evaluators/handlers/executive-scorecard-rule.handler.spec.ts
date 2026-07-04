import { ExecutiveScorecardRuleHandler } from './executive-scorecard-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
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

function rule(id: string): NormalizedRule {
  return { id, severity: 'MUST', category: 'executive-metrics', title: 't', description: 'd', blocking: false, sourceFile: 's' };
}

describe('ExecutiveScorecardRuleHandler', () => {
  it('canHandle matches DORA-*, SPACE-*, DRIFT-*', () => {
    const h = new ExecutiveScorecardRuleHandler(fsMock());
    expect(h.canHandle(rule('DORA-01'))).toBe(true);
    expect(h.canHandle(rule('SPACE-01'))).toBe(true);
    expect(h.canHandle(rule('DRIFT-01'))).toBe(true);
    expect(h.canHandle(rule('QT-01'))).toBe(false);
  });

  it('DORA-01 passes when CI exists', async () => {
    const h = new ExecutiveScorecardRuleHandler(fsMock({ existing: [path.join(SAT, '.github', 'workflows')] }));
    expect((await h.evaluate(rule('DORA-01'), ctx)).result).toBe('passed');
  });

  it('DORA-01 skips when no CI', async () => {
    const h = new ExecutiveScorecardRuleHandler(fsMock());
    expect((await h.evaluate(rule('DORA-01'), ctx)).result).toBe('skipped');
  });

  it('DORA-02 skips (requires git history)', async () => {
    const h = new ExecutiveScorecardRuleHandler(fsMock());
    expect((await h.evaluate(rule('DORA-02'), ctx)).result).toBe('skipped');
  });

  it('SPACE-01 passes with otel config', async () => {
    const h = new ExecutiveScorecardRuleHandler(fsMock({ existing: [path.join(SAT, 'otel.config.js')] }));
    expect((await h.evaluate(rule('SPACE-01'), ctx)).result).toBe('passed');
  });

  it('SPACE-04 passes when evolith.yaml has sdlc', async () => {
    const yaml = path.join(SAT, 'evolith.yaml');
    const h = new ExecutiveScorecardRuleHandler(fsMock({
      existing: [yaml],
      files: { [yaml]: 'sdlc:\n  currentPhase: 3\n' },
    }));
    expect((await h.evaluate(rule('SPACE-04'), ctx)).result).toBe('passed');
  });

  it('DRIFT-01 passes when evidence dir exists', async () => {
    const h = new ExecutiveScorecardRuleHandler(fsMock({ existing: [path.join(CORE, '.harness', 'evidence')] }));
    expect((await h.evaluate(rule('DRIFT-01'), ctx)).result).toBe('passed');
  });
});
