import * as path from 'path';
import { DependencyRuleHandler } from './dependency-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[]; json?: Record<string, unknown>; dirs?: Record<string, string[]>; files?: Record<string, string> } = {}) {
  const existing = new Set(cfg.existing ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readJson: jest.fn(async (p: string) => cfg.json?.[p] ?? {}),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
  } as unknown;
}

function rule(over: Partial<NormalizedRule>): NormalizedRule {
  return { id: 'DEP-01', severity: 'MUST', category: 'version-pinning', title: 't', description: 'd', blocking: true, sourceFile: 's', ...over };
}

describe('DependencyRuleHandler', () => {
  it('canHandle matches version-pinning and DEP ids', () => {
    const h = new DependencyRuleHandler(fsMock());
    expect(h.canHandle(rule({ category: 'version-pinning' }))).toBe(true);
    expect(h.canHandle(rule({ id: 'DEP-09', category: 'x' }))).toBe(true);
    expect(h.canHandle(rule({ id: 'OTHER', category: 'x' }))).toBe(false);
  });

  describe('version pinning', () => {
    const pkg = path.join(SAT, 'package.json');

    it('DEP-01 fails on caret ranges', async () => {
      const h = new DependencyRuleHandler(fsMock({ existing: [pkg], json: { [pkg]: { dependencies: { a: '^1.0.0' } } } }));
      const res = await h.evaluate(rule({ id: 'DEP-01' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('DEP-03 fails on latest/wildcards', async () => {
      const h = new DependencyRuleHandler(fsMock({ existing: [pkg], json: { [pkg]: { devDependencies: { b: 'latest' } } } }));
      const res = await h.evaluate(rule({ id: 'DEP-03' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('passes when all versions are pinned', async () => {
      const h = new DependencyRuleHandler(fsMock({ existing: [pkg], json: { [pkg]: { dependencies: { a: '1.0.0' } } } }));
      const res = await h.evaluate(rule({ id: 'DEP-01' }), ctx);
      expect(res.result).toBe('passed');
    });

    it('DEP-10 scans workspace package.json files', async () => {
      const root = path.join(SAT, 'package.json');
      const wsBase = path.join(SAT, 'packages');
      const wsPkg = path.join(wsBase, 'a', 'package.json');
      const h = new DependencyRuleHandler(fsMock({
        existing: [root, wsBase, wsPkg],
        dirs: { [wsBase]: ['a'] },
        json: { [root]: { workspaces: ['packages/*'] }, [wsPkg]: { dependencies: { x: '^2.0.0' } } },
      }));
      const res = await h.evaluate(rule({ id: 'DEP-10' }), ctx);
      expect(res.result).toBe('failed');
    });
  });

  it('DEP-04 lock file present passes, absent fails', async () => {
    const lock = path.join(SAT, 'package-lock.json');
    expect((await new DependencyRuleHandler(fsMock({ existing: [lock] })).evaluate(rule({ id: 'DEP-04' }), ctx)).result).toBe('passed');
    expect((await new DependencyRuleHandler(fsMock()).evaluate(rule({ id: 'DEP-04' }), ctx)).result).toBe('failed');
  });

  it('DEP-05 checks CI workflow for npm ci', async () => {
    const dir = path.join(SAT, '.github', 'workflows');
    const wf = path.join(dir, 'ci.yml');
    const pass = new DependencyRuleHandler(fsMock({ existing: [dir], dirs: { [dir]: ['ci.yml'] }, files: { [wf]: 'run: npm ci' } }));
    expect((await pass.evaluate(rule({ id: 'DEP-05' }), ctx)).result).toBe('passed');
    const fail = new DependencyRuleHandler(fsMock({ existing: [dir], dirs: { [dir]: ['ci.yml'] }, files: { [wf]: 'run: npm install' } }));
    expect((await fail.evaluate(rule({ id: 'DEP-05' }), ctx)).result).toBe('failed');
    const skip = new DependencyRuleHandler(fsMock());
    expect((await skip.evaluate(rule({ id: 'DEP-05' }), ctx)).result).toBe('skipped');
  });

  it('DEP-09 dependabot present passes, absent fails', async () => {
    const db = path.join(SAT, '.github', 'dependabot.yml');
    expect((await new DependencyRuleHandler(fsMock({ existing: [db] })).evaluate(rule({ id: 'DEP-09' }), ctx)).result).toBe('passed');
    expect((await new DependencyRuleHandler(fsMock()).evaluate(rule({ id: 'DEP-09' }), ctx)).result).toBe('failed');
  });

  it('skips unhandled DEP rules', async () => {
    const res = await new DependencyRuleHandler(fsMock()).evaluate(rule({ id: 'DEP-99', category: 'x' }), ctx);
    expect(res.result).toBe('skipped');
  });
});
