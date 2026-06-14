import * as path from 'path';
import { CliReleaseRuleHandler } from './cli-release-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

const CORE = '/core';
const ctx = { satellitePath: '/sat', corePath: CORE };

function fsMock(cfg: { existing?: string[]; dirs?: Record<string, string[]>; directories?: string[] } = {}) {
  const existing = new Set(cfg.existing ?? []);
  const directories = new Set(cfg.directories ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    stat: jest.fn(async (p: string) => ({ isDirectory: () => directories.has(p), isFile: () => !directories.has(p) })),
  } as unknown;
}

function rule(id: string): NormalizedRule {
  return { id, severity: 'MUST', category: 'cli-release', title: 't', description: 'd', blocking: true, sourceFile: 's' };
}

const cli = path.join(CORE, 'sdk', 'cli');

describe('CliReleaseRuleHandler', () => {
  it('canHandle matches CLI-RR- prefix', () => {
    const h = new CliReleaseRuleHandler(fsMock());
    expect(h.canHandle(rule('CLI-RR-01'))).toBe(true);
    expect(h.canHandle(rule('DEP-01'))).toBe(false);
  });

  it('CLI-RR-01 build artifact present/absent', async () => {
    const distMain = path.join(cli, 'dist', 'main.js');
    expect((await new CliReleaseRuleHandler(fsMock({ existing: [distMain] })).evaluate(rule('CLI-RR-01'), ctx)).result).toBe('passed');
    expect((await new CliReleaseRuleHandler(fsMock()).evaluate(rule('CLI-RR-01'), ctx)).result).toBe('failed');
  });

  it('CLI-RR-02 fails without dist, skips without compiled specs, passes with specs', async () => {
    const distDir = path.join(cli, 'dist');
    expect((await new CliReleaseRuleHandler(fsMock()).evaluate(rule('CLI-RR-02'), ctx)).result).toBe('failed');

    const skip = new CliReleaseRuleHandler(fsMock({ existing: [distDir], dirs: { [distDir]: ['main.js'] } }));
    expect((await skip.evaluate(rule('CLI-RR-02'), ctx)).result).toBe('skipped');

    const pass = new CliReleaseRuleHandler(fsMock({ existing: [distDir], dirs: { [distDir]: ['x.spec.js'] } }));
    expect((await pass.evaluate(rule('CLI-RR-02'), ctx)).result).toBe('passed');
  });

  it('CLI-RR-03 dependency lock present/absent', async () => {
    const lock = path.join(cli, 'package-lock.json');
    expect((await new CliReleaseRuleHandler(fsMock({ existing: [lock] })).evaluate(rule('CLI-RR-03'), ctx)).result).toBe('passed');
    expect((await new CliReleaseRuleHandler(fsMock()).evaluate(rule('CLI-RR-03'), ctx)).result).toBe('failed');
  });

  it('CLI-RR-04 fails without evidence dir', async () => {
    expect((await new CliReleaseRuleHandler(fsMock()).evaluate(rule('CLI-RR-04'), ctx)).result).toBe('failed');
  });

  it('CLI-RR-05 docs present/absent', async () => {
    const readme = path.join(cli, 'README.md');
    expect((await new CliReleaseRuleHandler(fsMock({ existing: [readme] })).evaluate(rule('CLI-RR-05'), ctx)).result).toBe('passed');
    expect((await new CliReleaseRuleHandler(fsMock()).evaluate(rule('CLI-RR-05'), ctx)).result).toBe('failed');
  });

  it('skips unhandled CLI-RR rules', async () => {
    expect((await new CliReleaseRuleHandler(fsMock()).evaluate(rule('CLI-RR-99'), ctx)).result).toBe('skipped');
  });
});
