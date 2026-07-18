import { DiskRulesetRepository } from '@beyondnet/evolith-infra-providers';
import { IFileSystem, ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';

describe('DiskRulesetRepository', () => {
  let repo: DiskRulesetRepository;
  let mockFs: jest.Mocked<IFileSystem>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockFs = {
      exists: jest.fn().mockResolvedValue(false),
      readFile: jest.fn().mockResolvedValue('{}'),
      readdirNames: jest.fn().mockResolvedValue([]),
      stat: jest.fn(),
      existsSync: jest.fn(),
      readFileBuffer: jest.fn(),
      readJson: jest.fn(),
      writeFile: jest.fn(),
      writeJson: jest.fn(),
      readdir: jest.fn(),
      remove: jest.fn(),
      ensureDir: jest.fn(),
      mkdir: jest.fn(),
      copy: jest.fn(),
      ensureFile: jest.fn(),
    } as any;
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;
    repo = new DiskRulesetRepository(mockFs, mockLogger);
  });

  describe('loadAllRulesets', () => {
    // GT-474: zero rulesets is a hard error — never an empty, passable result.
    it('should throw when rulesets dir does not exist', async () => {
      mockFs.exists.mockResolvedValue(false);
      // GT-566 reworded this into a per-candidate probe trail; the invariant is
      // unchanged — an unresolvable corpus is a hard, self-explaining error.
      await expect(repo.loadAllRulesets('/test')).rejects.toThrow(
        'Could not locate the Evolith ruleset corpus',
      );
      await expect(repo.loadAllRulesets('/test')).rejects.toThrow('/test/src/rulesets');
    });

    // GT-566: a directory that exists but holds no canonical ruleset family is
    // NOT a corpus (this is the `<repo>/rulesets/agents` case that shadowed the
    // real corpus). It must be skipped during resolution, not accepted and then
    // reported as an empty corpus.
    it('should not accept a non-corpus directory as the rulesets root', async () => {
      mockFs.exists.mockResolvedValue(true);
      mockFs.readdirNames.mockResolvedValue(['other.txt']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, isFile: () => true } as any);
      await expect(repo.loadAllRulesets('/test')).rejects.toThrow(
        'EXISTS but is not a ruleset corpus',
      );
    });

    it('should throw when a real corpus root yields zero rules', async () => {
      // `schema/` marks this as a genuine corpus root, so resolution succeeds
      // and we exercise the DISTINCT zero-rules guard.
      mockFs.exists.mockResolvedValue(true);
      mockFs.readdirNames.mockResolvedValue(['schema', 'other.txt']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, isFile: () => true } as any);
      await expect(repo.loadAllRulesets('/test')).rejects.toThrow('0 rules normalized');
    });

    it('should log error on malformed ruleset', async () => {
      mockFs.exists.mockResolvedValue(true);
      mockFs.readdirNames.mockResolvedValue(['bad.rules.json']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, isFile: () => true });
      mockFs.readFile.mockResolvedValue('not-json');
      await expect(repo.loadAllRulesets('/test')).rejects.toThrow();
    });

    it('should load and normalize valid ruleset', async () => {
      const validRuleset = JSON.stringify({
        rules: [
          { id: 'TEST-01', severity: 'MUST', title: 'Test Rule', description: 'A test rule', blocking: true },
          { id: 'TEST-02', severity: 'SHOULD', title: 'Test Rule 2', description: 'Another rule' },
        ],
      });
      const validSchema = JSON.stringify({
        type: 'object',
        properties: { rules: { type: 'array' } },
      });
      mockFs.exists.mockResolvedValue(true);
      mockFs.readdirNames.mockResolvedValue(['test.rules.json']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, isFile: () => true });
      mockFs.readFile.mockImplementation(async (p: string) => {
        if (p.includes('ruleset-standard.schema.json')) return validSchema;
        return validRuleset;
      });
      const result = await repo.loadAllRulesets('/test');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBeDefined();
    });
  });
});
