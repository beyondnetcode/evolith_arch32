import { DiskRulesetRepository } from '@evolith/infra-providers';
import { IFileSystem, ILogger } from '@evolith/core-domain/domain/interfaces';

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
    it('should return empty array when rulesets dir does not exist', async () => {
      mockFs.exists.mockResolvedValue(false);
      const result = await repo.loadAllRulesets('/test');
      expect(result).toEqual([]);
    });

    it('should return empty array when no ruleset files found', async () => {
      mockFs.exists.mockResolvedValue(true);
      mockFs.readdirNames.mockResolvedValue(['other.txt']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, isFile: () => true });
      const result = await repo.loadAllRulesets('/test');
      expect(result).toEqual([]);
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
