import { CrossCuttingRuleHandler } from './cross-cutting-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import * as path from 'path';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[]; dirs?: Record<string, string[]>; files?: Record<string, string>; json?: Record<string, unknown> } = {}) {
  const existing = new Set(cfg.existing ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
    readJson: jest.fn(async (p: string) => cfg.json?.[p] ?? {}),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    stat: jest.fn(async (p: string) => ({ isDirectory: () => false, isFile: () => true })),
  } as unknown;
}

function rule(id: string, cat?: string): NormalizedRule {
  return { id, severity: 'MUST', category: cat ?? 'cross-cutting', title: 't', description: 'd', blocking: true, sourceFile: 's' };
}

describe('CrossCuttingRuleHandler', () => {
  it('canHandle matches DOD-*, EM-*, CB-*, and TAX-01/02/03/04/09/10/11', () => {
    const h = new CrossCuttingRuleHandler(fsMock());
    expect(h.canHandle(rule('DOD-01'))).toBe(true);
    expect(h.canHandle(rule('EM-S-01'))).toBe(true);
    expect(h.canHandle(rule('CB-01'))).toBe(true);
    expect(h.canHandle(rule('TAX-01'))).toBe(true);
    expect(h.canHandle(rule('TAX-11'))).toBe(true);
    expect(h.canHandle(rule('TAX-05'))).toBe(false);
    expect(h.canHandle(rule('QT-01'))).toBe(false);
  });

  it('DOD-10 passes when CI config exists', async () => {
    const h = new CrossCuttingRuleHandler(fsMock({ existing: [path.join(SAT, '.github', 'workflows')] }));
    expect((await h.evaluate(rule('DOD-10'), ctx)).result).toBe('passed');
  });

  it('CB-01 passes when evolith.yaml exists', async () => {
    const h = new CrossCuttingRuleHandler(fsMock({ existing: [path.join(SAT, 'evolith.yaml')] }));
    expect((await h.evaluate(rule('CB-01'), ctx)).result).toBe('passed');
  });

  it('CB-01 fails for satellite without evolith.yaml', async () => {
    const h = new CrossCuttingRuleHandler(fsMock());
    expect((await h.evaluate(rule('CB-01'), ctx)).result).toBe('failed');
  });

  it('CB-01 passes for core itself', async () => {
    const h = new CrossCuttingRuleHandler(fsMock());
    expect((await h.evaluate(rule('CB-01'), { satellitePath: CORE, corePath: CORE })).result).toBe('passed');
  });

  it('TAX-11 fails when root topologies/ exists', async () => {
    const h = new CrossCuttingRuleHandler(fsMock({ existing: [path.join(CORE, 'topologies')] }));
    expect((await h.evaluate(rule('TAX-11'), ctx)).result).toBe('failed');
  });

  it('TAX-11 passes when no root topologies/', async () => {
    const h = new CrossCuttingRuleHandler(fsMock());
    expect((await h.evaluate(rule('TAX-11'), ctx)).result).toBe('passed');
  });

  it('CB-VAL-01 checks compliance section in evolith.yaml', async () => {
    const yaml = path.join(SAT, 'evolith.yaml');
    const fail = new CrossCuttingRuleHandler(fsMock({ existing: [yaml], files: { [yaml]: 'metadata:\n  name: test\n' } }));
    expect((await fail.evaluate(rule('CB-VAL-01'), ctx)).result).toBe('failed');

    const pass = new CrossCuttingRuleHandler(fsMock({ existing: [yaml], files: { [yaml]: 'compliance:\n  baseline: true\n' } }));
    expect((await pass.evaluate(rule('CB-VAL-01'), ctx)).result).toBe('passed');
  });

  it('EM-S-03 passes (lint-level verification)', async () => {
    const h = new CrossCuttingRuleHandler(fsMock({ existing: [path.join(SAT, '.eslintrc.js')] }));
    expect((await h.evaluate(rule('EM-S-03'), ctx)).result).toBe('passed');
  });
});
