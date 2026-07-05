import * as path from 'path';
import * as yamlLib from 'yaml';
import { GovernanceRuleHandler } from './governance-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[]; files?: Record<string, string>; json?: Record<string, unknown>; dirs?: Record<string, string[]> } = {}) {
  const existing = new Set(cfg.existing ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
    readJson: jest.fn(async (p: string) => cfg.json?.[p] ?? {}),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
  } as unknown;
}

const yamlParser = { parse: (content: string) => yamlLib.parse(content), stringify: (data: unknown) => yamlLib.stringify(data) } as unknown;

function newHandler(fs: unknown) {
  return new GovernanceRuleHandler(fs as never, yamlParser as never);
}

function rule(id: string): NormalizedRule {
  return { id, severity: 'MUST', category: 'governance', title: 't', description: 'd', blocking: true, sourceFile: 's' };
}

const yaml = path.join(SAT, 'evolith.yaml');

describe('GovernanceRuleHandler', () => {
  it('canHandle matches the governance rule ids', () => {
    const h = newHandler(fsMock());
    expect(h.canHandle(rule('GOV-01'))).toBe(true);
    expect(h.canHandle(rule('TAX-05'))).toBe(false);
  });

  it('INH-01 fails when a satellite ships its own rulesets', async () => {
    const h = newHandler(fsMock({ existing: [path.join(SAT, 'rulesets')] }));
    expect((await h.evaluate(rule('INH-01'), ctx)).result).toBe('failed');
    const pass = newHandler(fsMock());
    expect((await pass.evaluate(rule('INH-01'), ctx)).result).toBe('passed');
  });

  it('INH-06 requires DECISIONS.md in satellites', async () => {
    expect((await newHandler(fsMock()).evaluate(rule('INH-06'), ctx)).result).toBe('failed');
    const pass = newHandler(fsMock({ existing: [path.join(SAT, 'DECISIONS.md')] }));
    expect((await pass.evaluate(rule('INH-06'), ctx)).result).toBe('passed');
  });

  it('GOV-01 requires evolith.yaml', async () => {
    expect((await newHandler(fsMock()).evaluate(rule('GOV-01'), ctx)).result).toBe('failed');
    expect((await newHandler(fsMock({ existing: [yaml] })).evaluate(rule('GOV-01'), ctx)).result).toBe('passed');
  });

  it('GOV-02 requires governance.version', async () => {
    const fail = newHandler(fsMock({ existing: [yaml], files: { [yaml]: 'governance:\n  owner: team\n' } }));
    expect((await fail.evaluate(rule('GOV-02'), ctx)).result).toBe('failed');
    const pass = newHandler(fsMock({ existing: [yaml], files: { [yaml]: 'governance:\n  version: 1.0.0\n' } }));
    expect((await pass.evaluate(rule('GOV-02'), ctx)).result).toBe('passed');
  });

  it('INH-02 requires a valid semver coreRef.version', async () => {
    const missing = newHandler(fsMock({ existing: [yaml], files: { [yaml]: 'coreRef:\n  name: core\n' } }));
    expect((await missing.evaluate(rule('INH-02'), ctx)).result).toBe('failed');
    const bad = newHandler(fsMock({ existing: [yaml], files: { [yaml]: 'coreRef:\n  version: notsemver\n' } }));
    expect((await bad.evaluate(rule('INH-02'), ctx)).result).toBe('failed');
    const ok = newHandler(fsMock({ existing: [yaml], files: { [yaml]: 'coreRef:\n  version: 1.2.3\n' } }));
    expect((await ok.evaluate(rule('INH-02'), ctx)).result).toBe('passed');
  });

  it('OCB-01 rejects enterprise/unlicensed packages', async () => {
    const pkg = path.join(SAT, 'package.json');
    const fail = newHandler(fsMock({ existing: [pkg], json: { [pkg]: { license: 'UNLICENSED' } } }));
    expect((await fail.evaluate(rule('OCB-01'), ctx)).result).toBe('failed');
    const pass = newHandler(fsMock({ existing: [pkg], json: { [pkg]: { license: 'MIT' } } }));
    expect((await pass.evaluate(rule('OCB-01'), ctx)).result).toBe('passed');
  });

  it('ACL-01 fails on an empty acl directory', async () => {
    const acl = path.join(SAT, 'acl');
    const fail = newHandler(fsMock({ existing: [acl], dirs: { [acl]: [] } }));
    expect((await fail.evaluate(rule('ACL-01'), ctx)).result).toBe('failed');
    const pass = newHandler(fsMock({ existing: [acl], dirs: { [acl]: ['orders'] } }));
    expect((await pass.evaluate(rule('ACL-01'), ctx)).result).toBe('passed');
  });

  it('skips unhandled governance rules', async () => {
    expect((await newHandler(fsMock()).evaluate(rule('GOV-99'), ctx)).result).toBe('skipped');
  });
});
