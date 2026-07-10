import { IFileSystem, ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { DiskRulesetRepository, RulesetsNotFoundError } from './disk-ruleset.repository';

interface FakeFsConfig {
  files: Record<string, string>;
  dirs?: Set<string>;
}

/** In-memory IFileSystem tailored to DiskRulesetRepository's access pattern. */
function makeFs(config: FakeFsConfig): IFileSystem {
  const files = config.files;
  const dirs = config.dirs ?? new Set<string>();
  const has = (p: string) => p in files || dirs.has(p);
  return {
    async readFile(p: string) {
      if (!(p in files)) throw new Error(`ENOENT: ${p}`);
      return files[p];
    },
    async readFileBuffer(p: string) {
      return Buffer.from(await this.readFile(p), 'utf-8');
    },
    async writeFile() {},
    async exists(p: string) {
      return has(p);
    },
    existsSync(p: string) {
      return has(p);
    },
    async readJson<T = unknown>(p: string) {
      return JSON.parse(await this.readFile(p)) as T;
    },
    async writeJson() {},
    async mkdir() {},
    async readdir(p: string) {
      return (await this.readdirNames(p)).map((name) => ({
        name,
        isDirectory: () => dirs.has(`${p}/${name}`),
        isFile: () => `${p}/${name}` in files,
      }));
    },
    async readdirNames(p: string) {
      const prefix = `${p}/`;
      const direct = new Set<string>();
      for (const key of [...Object.keys(files), ...dirs]) {
        if (key.startsWith(prefix)) {
          direct.add(key.slice(prefix.length).split('/')[0]);
        }
      }
      return [...direct];
    },
    async copy() {},
    async ensureDir() {},
    async ensureFile() {},
    async stat(p: string) {
      return { isDirectory: () => dirs.has(p), isFile: () => p in files };
    },
    async remove() {},
  };
}

function makeLogger(): ILogger & { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  return {
    debug() {},
    info() {},
    warn(msg: string) {
      warnings.push(msg);
    },
    error(msg: string) {
      errors.push(msg);
    },
    errors,
    warnings,
  };
}

const SCHEMA = JSON.stringify({
  type: 'object',
  properties: { rules: { type: 'array' } },
  required: ['rules'],
});

describe('DiskRulesetRepository', () => {
  // GT-474: zero rulesets must ABORT, never resolve to [] — a governance run
  // that silently checks nothing is worse than one that crashes.
  it('throws when no rulesets directory exists, naming both probed paths', async () => {
    const fs = makeFs({ files: {} });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    await expect(repo.loadAllRulesets('/core')).rejects.toThrow(
      RulesetsNotFoundError,
    );
    await expect(repo.loadAllRulesets('/core')).rejects.toThrow(
      /"\/core\/rulesets" or "\/core\/src\/rulesets"/,
    );
  });

  // GT-474 regression: the Evolith Core monorepo keeps rulesets at
  // `<core>/src/rulesets` (post apps/→src/ migration). Joining only
  // `<core>/rulesets` made `validate --core <checkout>` load 0 rules.
  it('resolves rulesets under <core>/src/rulesets (Core monorepo layout)', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/src/rulesets', '/core/src/rulesets/schema']),
      files: {
        '/core/src/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/src/rulesets/governance.rules.json': JSON.stringify({
          rules: [{ id: 'GOV-1', severity: 'MUST', title: 'T', description: 'D' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('GOV-1');
  });

  it('throws when the rulesets directory exists but yields zero rules', async () => {
    const fs = makeFs({ dirs: new Set(['/core/rulesets']), files: {} });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    await expect(repo.loadAllRulesets('/core')).rejects.toThrow(
      /0 rules normalized/,
    );
  });

  it('loads, validates and normalizes a ruleset file', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/governance.rules.json': JSON.stringify({
          rules: [
            {
              id: 'GOV-1',
              severity: 'MUST',
              title: 'Title',
              description: 'Desc',
              category: 'governance',
            },
          ],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      id: 'GOV-1',
      severity: 'MUST',
      category: 'governance',
      title: 'Title',
      description: 'Desc',
      blocking: true,
      sourceFile: 'rulesets/governance.rules.json',
    });
  });

  it('skips schema validation for phase-gates rulesets', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets']),
      files: {
        '/core/rulesets/phase-gates.rules.json': JSON.stringify({
          rules: [{ id: 'GATE-1', severity: 'MUST', title: 'Gate' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules.map((r) => r.id)).toEqual(['GATE-1']);
  });

  it('skips (does not abort on) a ruleset that fails schema validation and still loads the valid ones (GT-456)', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/broken.rules.json': JSON.stringify({ notRules: [] }),
        '/core/rulesets/good.rules.json': JSON.stringify({
          rules: [{ id: 'OK-1', severity: 'MUST', title: 'Good' }],
        }),
      },
    });
    const logger = makeLogger();
    const repo = new DiskRulesetRepository(fs, logger);
    // A single non-standard/malformed file must NOT throw and zero out ALL
    // validation — it is skipped with a warning; valid rulesets still load.
    const rules = await repo.loadAllRulesets('/core');
    expect(rules.map((r) => r.id)).toEqual(['OK-1']);
    expect(logger.warnings.some((w) => w.includes('broken.rules.json'))).toBe(true);
  });

  it('derives categories from canonical progressive-axis topology id prefixes', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/topology.rules.json': JSON.stringify({
          rules: [
            { id: 'modular-monolith-1', severity: 'MUST', title: 'mm' },
            { id: 'distributed-modules-1', severity: 'MUST', title: 'dm' },
            { id: 'microservices-1', severity: 'MUST', title: 'ms' },
          ],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    const byId = Object.fromEntries(rules.map((r) => [r.id, r.category]));
    expect(byId['modular-monolith-1']).toBe('topology');
    expect(byId['distributed-modules-1']).toBe('module-autonomy');
    expect(byId['microservices-1']).toBe('autonomous-deployment');
  });

  it('no longer maps the stale f1/f2/f3 prefixes (falls back to general)', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/legacy.rules.json': JSON.stringify({
          rules: [{ id: 'f1-1', severity: 'MUST', title: 'legacy' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules[0].category).toBe('general');
  });

  it('normalizes severity aliases and explicit category overrides', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/mixed.rules.json': JSON.stringify({
          rules: [
            { id: 'A-1', severity: 'must not', title: 'a' },
            { id: 'B-1', severity: 'MAY', title: 'b' },
            { id: 'C-1', title: 'c', enforcement: true },
            { id: 'D-1', title: 'd' },
            { id: 'gov-99', severity: 'SHOULD', title: 'e', category: 'explicit' },
          ],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    const byId = Object.fromEntries(rules.map((r) => [r.id, r]));
    expect(byId['A-1'].severity).toBe('MUST NOT');
    expect(byId['B-1'].severity).toBe('COULD');
    expect(byId['C-1'].severity).toBe('MUST');
    expect(byId['D-1'].severity).toBe('SHOULD');
    expect(byId['gov-99'].category).toBe('explicit');
    // gov-99 has an explicit category, so the prefix map is bypassed
    expect(byId['D-1'].category).toBe('general');
  });

  it('supports principle-style rulesets via the principles/statement aliases', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': JSON.stringify({ type: 'object' }),
        '/core/rulesets/principles.rules.json': JSON.stringify({
          principles: [{ id: 'P-1', principle: 'Be clear', statement: 'Clarity wins' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules[0]).toMatchObject({ id: 'P-1', title: 'Be clear', description: 'Clarity wins' });
  });

  it('recurses into nested ruleset directories', async () => {
    const fs = makeFs({
      dirs: new Set([
        '/core/rulesets',
        '/core/rulesets/schema',
        '/core/rulesets/sub',
      ]),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/sub/nested.rules.json': JSON.stringify({
          rules: [{ id: 'N-1', severity: 'MUST', title: 'nested' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules.map((r) => r.id)).toEqual(['N-1']);
  });
});
