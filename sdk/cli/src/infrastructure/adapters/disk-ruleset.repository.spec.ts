import * as path from 'path';
import { DiskRulesetRepository } from './disk-ruleset.repository';

const CORE = '/core';
const rulesetsDir = path.join(CORE, 'rulesets');
const schemaPath = path.join(rulesetsDir, 'schema', 'ruleset-standard.schema.json');

const permissiveSchema = JSON.stringify({ type: 'object' });

function fsMock(cfg: { existing?: string[]; dirs?: Record<string, string[]>; directories?: string[]; files?: Record<string, string> } = {}) {
  const existing = new Set([rulesetsDir, ...(cfg.existing ?? [])]);
  const directories = new Set(cfg.directories ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readFile: jest.fn(async (p: string) => {
      if (cfg.files && p in cfg.files) return cfg.files[p];
      if (p === schemaPath) return permissiveSchema;
      throw new Error(`no file: ${p}`);
    }),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    stat: jest.fn(async (p: string) => ({ isDirectory: () => directories.has(p), isFile: () => !directories.has(p) })),
  } as any;
}

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;

describe('DiskRulesetRepository', () => {
  it('returns [] when the rulesets directory is absent', async () => {
    const fs = { exists: jest.fn(async () => false) } as any;
    const repo = new DiskRulesetRepository(fs, logger);
    expect(await repo.loadAllRulesets(CORE)).toEqual([]);
  });

  it('loads and normalizes rules, deriving category and severity', async () => {
    const file = path.join(rulesetsDir, 'governance', 'gov.rules.json');
    const govDir = path.join(rulesetsDir, 'governance');
    const fs = fsMock({
      existing: [file, govDir, schemaPath],
      directories: [govDir],
      dirs: { [rulesetsDir]: ['governance', 'schema'], [govDir]: ['gov.rules.json'] },
      files: {
        [file]: JSON.stringify({
          rules: [
            { id: 'GOV-01', severity: 'MUST', title: 'Has yaml', description: 'd' },
            { id: 'DEP-01', blocking: false },
            { id: 'MAY-RULE', severity: 'MAY' },
            { noId: true },
          ],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, logger);
    const rules = await repo.loadAllRulesets(CORE);

    expect(rules.map(r => r.id).sort()).toEqual(['DEP-01', 'GOV-01', 'MAY-RULE']);
    expect(rules.find(r => r.id === 'GOV-01')?.category).toBe('governance');
    expect(rules.find(r => r.id === 'DEP-01')?.category).toBe('version-pinning');
    expect(rules.find(r => r.id === 'MAY-RULE')?.severity).toBe('COULD');
  });

  it('skips schema validation for phase-gates and reads principles lists', async () => {
    const file = path.join(rulesetsDir, 'phase-gates.rules.json');
    const fs = fsMock({
      existing: [file],
      dirs: { [rulesetsDir]: ['phase-gates.rules.json'] },
      files: {
        [file]: JSON.stringify({ principles: [{ id: 'P1', principle: 'Title', statement: 'Body' }] }),
      },
    });
    const repo = new DiskRulesetRepository(fs, logger);
    const rules = await repo.loadAllRulesets(CORE);
    expect(rules[0]).toMatchObject({ id: 'P1', title: 'Title', description: 'Body' });
  });

  it('throws and logs on malformed JSON', async () => {
    const file = path.join(rulesetsDir, 'bad.rules.json');
    const fs = fsMock({
      existing: [file],
      dirs: { [rulesetsDir]: ['bad.rules.json'] },
      files: { [file]: '{not json' },
    });
    const repo = new DiskRulesetRepository(fs, logger);
    await expect(repo.loadAllRulesets(CORE)).rejects.toThrow('Ruleset validation error');
    expect(logger.error).toHaveBeenCalled();
  });
});
