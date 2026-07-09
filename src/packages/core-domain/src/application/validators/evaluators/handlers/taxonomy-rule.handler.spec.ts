import * as path from 'path';
import { TaxonomyRuleHandler } from './taxonomy-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[]; dirs?: Record<string, string[]>; directories?: string[] } = {}) {
  const existing = new Set(cfg.existing ?? []);
  const directories = new Set(cfg.directories ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    stat: jest.fn(async (p: string) => ({ isDirectory: () => directories.has(p), isFile: () => !directories.has(p) })),
  } as unknown;
}

function rule(over: Partial<NormalizedRule>): NormalizedRule {
  return { id: 'TAX-05', severity: 'MUST', category: 'taxonomy', title: 't', description: 'd', blocking: true, sourceFile: 's', ...over };
}

describe('TaxonomyRuleHandler', () => {
  it('canHandle matches TAX-05..08 only', () => {
    const h = new TaxonomyRuleHandler(fsMock());
    expect(h.canHandle(rule({ id: 'TAX-05' }))).toBe(true);
    expect(h.canHandle(rule({ id: 'TAX-01' }))).toBe(false);
  });

  it('TAX-05 fails when top-level dirs are missing, passes when present', async () => {
    const fail = new TaxonomyRuleHandler(fsMock({ existing: [path.join(CORE, 'reference')] }));
    expect((await fail.evaluate(rule({ id: 'TAX-05' }), ctx)).result).toBe('failed');

    const all = ['reference', 'rulesets', 'sdk', '.harness'].map(d => path.join(CORE, d));
    const pass = new TaxonomyRuleHandler(fsMock({ existing: all }));
    expect((await pass.evaluate(rule({ id: 'TAX-05' }), ctx)).result).toBe('passed');
  });

  it('TAX-06 skips Core itself and satellites without package.json', async () => {
    const coreSelf = new TaxonomyRuleHandler(fsMock());
    expect((await coreSelf.evaluate(rule({ id: 'TAX-06' }), { satellitePath: CORE, corePath: CORE })).result).toBe('skipped');

    const noPkg = new TaxonomyRuleHandler(fsMock());
    expect((await noPkg.evaluate(rule({ id: 'TAX-06' }), ctx)).result).toBe('skipped');
  });

  it('TAX-06 fails when a satellite misses required dirs', async () => {
    const h = new TaxonomyRuleHandler(fsMock({ existing: [path.join(SAT, 'package.json'), path.join(SAT, 'src')] }));
    expect((await h.evaluate(rule({ id: 'TAX-06' }), ctx)).result).toBe('failed');
  });

  it('TAX-07 skips without ADR dir and flags bad ADR filenames', async () => {
    const adrDir = path.join(CORE, 'reference', 'core', 'architecture', 'adrs');
    const skip = new TaxonomyRuleHandler(fsMock());
    expect((await skip.evaluate(rule({ id: 'TAX-07' }), ctx)).result).toBe('skipped');

    const bad = path.join(adrDir, '01_BadName.md');
    const h = new TaxonomyRuleHandler(fsMock({ existing: [adrDir], dirs: { [adrDir]: ['01_BadName.md'] } }));
    expect((await h.evaluate(rule({ id: 'TAX-07' }), ctx)).result).toBe('failed');
    expect(bad).toContain('adrs');
  });

  it('TAX-08 flags ADRs missing a bilingual pair', async () => {
    const adrDir = path.join(CORE, 'reference', 'core', 'architecture', 'adrs');
    const h = new TaxonomyRuleHandler(fsMock({ existing: [adrDir], dirs: { [adrDir]: ['0001-foo.md'] } }));
    expect((await h.evaluate(rule({ id: 'TAX-08' }), ctx)).result).toBe('failed');
  });

  it('TAX-08 passes when every ADR has its .es.md pair', async () => {
    const adrDir = path.join(CORE, 'reference', 'core', 'architecture', 'adrs');
    const h = new TaxonomyRuleHandler(fsMock({ existing: [adrDir], dirs: { [adrDir]: ['0001-foo.md', '0001-foo.es.md'] } }));
    expect((await h.evaluate(rule({ id: 'TAX-08' }), ctx)).result).toBe('passed');
  });
});
