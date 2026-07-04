import { AclRuleHandler } from './acl-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import * as path from 'path';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[]; dirs?: Record<string, string[]>; files?: Record<string, string> } = {}) {
  const existing = new Set(cfg.existing ?? []);
  const dirs = cfg.dirs ?? {};
  const files = cfg.files ?? {};
  const dirSet = new Set<string>();
  for (const p of existing) {
    if (p.includes('/') && !p.match(/\.\w+$/)) dirSet.add(p);
  }
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readFile: jest.fn(async (p: string) => files[p] ?? ''),
    readdirNames: jest.fn(async (p: string) => {
      if (dirs[p]) return dirs[p];
      const prefix = p.endsWith('/') ? p : p + '/';
      const entries: string[] = [];
      for (const f of existing) {
        if (f.startsWith(prefix) && f !== p) {
          const remainder = f.slice(prefix.length);
          const firstSlash = remainder.indexOf('/');
          const entry = firstSlash === -1 ? remainder : remainder.slice(0, firstSlash);
          if (!entries.includes(entry)) entries.push(entry);
        }
      }
      return entries;
    }),
    stat: jest.fn(async (p: string) => ({
      isDirectory: () => dirSet.has(p) || existing.has(p + '/') || (p.includes('/') && !p.match(/\.\w+$/)),
      isFile: () => files[p] !== undefined || (existing.has(p) && !dirSet.has(p)),
    })),
  } as unknown;
}

function rule(id: string): NormalizedRule {
  return { id, severity: 'MUST', category: 'anti-corruption', title: 't', description: 'd', blocking: true, sourceFile: 's' };
}

describe('AclRuleHandler', () => {
  it('canHandle matches ACL-02 through ACL-06', () => {
    const h = new AclRuleHandler(fsMock());
    expect(h.canHandle(rule('ACL-02'))).toBe(true);
    expect(h.canHandle(rule('ACL-06'))).toBe(true);
    expect(h.canHandle(rule('ACL-01'))).toBe(false);
    expect(h.canHandle(rule('DOD-01'))).toBe(false);
  });

  it('ACL-02 skips without acl/ directory', async () => {
    const h = new AclRuleHandler(fsMock());
    expect((await h.evaluate(rule('ACL-02'), ctx)).result).toBe('skipped');
  });

  it('ACL-03 passes with acl/ directory present', async () => {
    const h = new AclRuleHandler(fsMock({ existing: [path.join(SAT, 'acl')] }));
    expect((await h.evaluate(rule('ACL-03'), ctx)).result).toBe('passed');
  });

  it('ACL-04 passes when evolith.yaml exists', async () => {
    const h = new AclRuleHandler(fsMock({ existing: [path.join(SAT, 'evolith.yaml')] }));
    expect((await h.evaluate(rule('ACL-04'), ctx)).result).toBe('passed');
  });

  it('ACL-06 passes when domain has no external SDK imports', async () => {
    const domainFile = path.join(SAT, 'src', 'domain', 'entities', 'order.ts');
    const h = new AclRuleHandler(fsMock({
      existing: [path.join(SAT, 'src'), path.join(SAT, 'src', 'domain'), domainFile],
      files: { [domainFile]: 'export class Order { id: string; }' },
      dirs: { [path.join(SAT, 'src')]: ['domain'] },
    }));
    expect((await h.evaluate(rule('ACL-06'), ctx)).result).toBe('passed');
  });

  it('ACL-06 fails when domain imports external SDK', async () => {
    const domainFile = path.join(SAT, 'src', 'domain', 'entities', 'order.ts');
    const h = new AclRuleHandler(fsMock({
      existing: [path.join(SAT, 'src'), path.join(SAT, 'src', 'domain'), domainFile],
      files: { [domainFile]: "import { JiraClient } from 'jira-client';" },
      dirs: { [path.join(SAT, 'src')]: ['domain'] },
    }));
    expect((await h.evaluate(rule('ACL-06'), ctx)).result).toBe('failed');
  });
});
