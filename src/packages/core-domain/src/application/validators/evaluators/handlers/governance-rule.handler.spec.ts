import * as path from 'path';
import * as yamlLib from 'yaml';
import { GovernanceRuleHandler } from './governance-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[]; files?: Record<string, string>; json?: Record<string, unknown>; dirs?: Record<string, string[]>; directories?: string[] } = {}) {
  const existing = new Set(cfg.existing ?? []);
  const directories = new Set(cfg.directories ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
    readJson: jest.fn(async (p: string) => cfg.json?.[p] ?? {}),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    stat: jest.fn(async (p: string) => ({ isDirectory: () => directories.has(p), isFile: () => !directories.has(p) })),
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

  // ---------------------------------------------------------------------------
  // GT-595 — the config-shaped assertions that used to come back `skipped`
  // while declaring `blocking: true`.
  // ---------------------------------------------------------------------------
  describe('GT-595 · MTN-05 — the persistence strategy must be declared', () => {
    const yamlWith = (body: string) => newHandler(fsMock({ existing: [yaml], files: { [yaml]: body } }));

    it('is claimed by the handler', () => {
      const h = newHandler(fsMock());
      for (const id of ['MTN-05', 'GIT-08', 'SEC-RL-01', 'SEC-RL-02']) expect(h.canHandle(rule(id))).toBe(true);
    });

    it('FAILS when evolith.yaml is absent', async () => {
      const res = await newHandler(fsMock()).evaluate(rule('MTN-05'), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('evolith.yaml is missing');
    });

    it('FAILS when no bounded context is declared at all', async () => {
      const res = await yamlWith('spec:\n  coreRef:\n    version: 1.0.0\n').evaluate(rule('MTN-05'), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('no spec.boundedContexts');
    });

    it('FAILS and names the bounded contexts missing a persistence declaration', async () => {
      const res = await yamlWith(
        'spec:\n  boundedContexts:\n'
        + '    - name: billing\n      phase: F1\n      persistence: PostgreSQL\n'
        + '    - name: catalog\n      phase: F1\n',
      ).evaluate(rule('MTN-05'), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('catalog');
      expect(res.message).not.toContain('billing');
    });

    it('FAILS on an empty-string persistence value (declared but not decided)', async () => {
      const res = await yamlWith('spec:\n  boundedContexts:\n    - name: billing\n      persistence: "  "\n')
        .evaluate(rule('MTN-05'), ctx);
      expect(res.result).toBe('failed');
    });

    it('passes when every bounded context declares one — and says the enum clause is unenforced', async () => {
      const res = await yamlWith(
        'spec:\n  boundedContexts:\n'
        + '    - name: billing\n      phase: F1\n      persistence: PostgreSQL\n'
        + '    - name: catalog\n      phase: F1\n      persistence: MongoDB\n',
      ).evaluate(rule('MTN-05'), ctx);
      expect(res.result).toBe('passed');
      expect(res.message).toContain('NOT enforced');
      expect(res.message).toContain('schema-per-tenant');
    });
  });

  describe('GT-595 · GIT-08 — Conventional Commits must be enforceable, not merely mandated', () => {
    const pkg = path.join(SAT, 'package.json');
    const config = path.join(SAT, 'commitlint.config.mjs');
    const withCommitlint = { [pkg]: { devDependencies: { '@commitlint/cli': '20.5.3' } } };

    it('FAILS when no commitlint configuration exists anywhere', async () => {
      const res = await newHandler(fsMock({ existing: [pkg], json: withCommitlint })).evaluate(rule('GIT-08'), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('no commitlint configuration found');
    });

    it('FAILS when a config exists but the package is not installed (GT-623: the hook fails open)', async () => {
      const res = await newHandler(fsMock({ existing: [config, pkg], json: { [pkg]: { devDependencies: { jest: '30' } } } }))
        .evaluate(rule('GIT-08'), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('fails open');
    });

    it('passes on a config file plus an installed @commitlint package', async () => {
      const res = await newHandler(fsMock({ existing: [config, pkg], json: withCommitlint })).evaluate(rule('GIT-08'), ctx);
      expect(res.result).toBe('passed');
      expect(res.message).toContain('commitlint.config.mjs');
    });

    it('accepts the package.json#commitlint form', async () => {
      const res = await newHandler(fsMock({ existing: [pkg], json: { [pkg]: { commitlint: { extends: ['@commitlint/config-conventional'] }, devDependencies: { commitlint: '20' } } } }))
        .evaluate(rule('GIT-08'), ctx);
      expect(res.result).toBe('passed');
    });
  });

  describe('GT-595 · SEC-RL-01 / SEC-RL-02 — rate limit and body limit come from the environment', () => {
    const src = path.join(SAT, 'src');
    const main = path.join(src, 'main.ts');

    const workspace = (body: string) => newHandler(fsMock({
      existing: [src, main],
      directories: [src],
      dirs: { [src]: ['main.ts'] },
      files: { [main]: body },
    }));

    const SERVER = 'const app = await NestFactory.create(AppModule);\nawait app.listen(3000);\n';

    it('SEC-RL-01 FAILS when an HTTP surface exists with no env-driven rate limit', async () => {
      const res = await workspace(SERVER).evaluate(rule('SEC-RL-01'), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('no rate limit is read from an environment variable');
    });

    it('SEC-RL-01 FAILS on a HARD-CODED limit — the rule asks for configurability', async () => {
      const res = await workspace(`${SERVER}const RATE_LIMIT_MAX = 100;\n`).evaluate(rule('SEC-RL-01'), ctx);
      expect(res.result).toBe('failed');
    });

    it('SEC-RL-01 passes when the window and limit are read from process.env', async () => {
      const res = await workspace(`${SERVER}const w = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000;\n`)
        .evaluate(rule('SEC-RL-01'), ctx);
      expect(res.result).toBe('passed');
    });

    it('SEC-RL-02 FAILS when an HTTP surface exists with no env-driven body size limit', async () => {
      const res = await workspace(`${SERVER}const w = Number(process.env.RATE_LIMIT_WINDOW_MS);\n`)
        .evaluate(rule('SEC-RL-02'), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('MCP_MAX_BODY_BYTES or equivalent');
    });

    it('SEC-RL-02 passes on MCP_MAX_BODY_BYTES', async () => {
      const res = await workspace(`${SERVER}const max = Number(process.env.MCP_MAX_BODY_BYTES) || 1048576;\n`)
        .evaluate(rule('SEC-RL-02'), ctx);
      expect(res.result).toBe('passed');
    });

    it('does not scan test files for the signal (a spec fixture must not satisfy the rule)', async () => {
      const spec = path.join(src, 'main.spec.ts');
      const h = newHandler(fsMock({
        existing: [src, main, spec],
        directories: [src],
        dirs: { [src]: ['main.ts', 'main.spec.ts'] },
        files: { [main]: SERVER, [spec]: 'process.env.RATE_LIMIT_MAX_REQUESTS = "1";' },
      }));
      expect((await h.evaluate(rule('SEC-RL-01'), ctx)).result).toBe('failed');
    });

    it('passes with an explicit "no endpoint exposed" verdict when nothing stands a server up', async () => {
      const res = await workspace('export const add = (a: number, b: number) => a + b;\n').evaluate(rule('SEC-RL-01'), ctx);
      expect(res.result).toBe('passed');
      expect(res.message).toContain('no HTTP surface');
    });
  });
});
