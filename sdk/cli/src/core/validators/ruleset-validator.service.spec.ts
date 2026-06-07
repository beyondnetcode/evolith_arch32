import { RulesetValidatorService } from './ruleset-validator.service';

const mockFileSystem = {
  exists: jest.fn(),
  existsSync: jest.fn(),
  readFile: jest.fn(),
  readJson: jest.fn(),
  readdirNames: jest.fn(),
  writeFile: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  copy: jest.fn(),
  remove: jest.fn(),
};

const mockConfigParser = {
  parse: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  context: 'RulesetValidatorService',
};

describe('RulesetValidatorService', () => {
  let service: RulesetValidatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RulesetValidatorService({
      fileSystem: mockFileSystem as any,
      configParser: mockConfigParser as any,
      logger: mockLogger as any,
    });
  });

  describe('validate', () => {
    it('should fail when evolith.yaml is missing', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.validate('/satellite');

      expect(result.status).toBe('failed');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].ruleId).toBe('GOV-01');
      expect(result.issues[0].title).toBe('evolith.yaml missing');
    });

    it('should fail when core version is not pinned', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue('coreRef:\n  path: /core');
      mockConfigParser.parse.mockReturnValue({ coreRef: { path: '/core' } });
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['file.ts']);

      const result = await service.validate('/satellite');

      expect(result.status).toBe('failed');
      const pinningIssue = result.issues.find(i => i.ruleId === 'INH-02');
      expect(pinningIssue).toBeDefined();
      expect(pinningIssue?.title).toBe('Core version not pinned');
    });

    it('should pass when valid evolith.yaml exists', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue('coreRef:\n  version: "1.0.0"\n  path: /core\ngovernance:\n  version: "1.0.0"');
      mockConfigParser.parse.mockReturnValue({
        coreRef: { version: '1.0.0', path: '/core' },
        governance: { version: '1.0.0' }
      });
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['file.ts']);

      const result = await service.validate('/satellite');

      expect(result.coreRef.version).toBe('1.0.0');
      expect(result.status).toMatch(/passed|warning/);
    });

    it('should warn when governance version is not declared', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue('coreRef:\n  version: "1.0.0"');
      mockConfigParser.parse.mockReturnValue({
        coreRef: { version: '1.0.0' }
      });
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['file.ts']);

      const result = await service.validate('/satellite');

      expect(result.status).toBe('warning');
      const govIssue = result.issues.find(i => i.ruleId === 'GOV-02');
      expect(govIssue).toBeDefined();
    });
  });

  describe('loadRulesetById', () => {
    it('should return issue for unknown ruleset ID', async () => {
      const issues = await service.loadRulesetById('/core', 'unknown-id');

      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('UNKNOWN');
    });

    it('should load adr-0002 ruleset', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify({
        principles: [
          { id: 'ADR-0002-P1', severity: 'MUST', principle: 'Hexagonal', statement: 'Use ports and adapters', blocking: true }
        ]
      }));

      const issues = await service.loadRulesetById('/core', 'adr-0002');

      expect(issues).toHaveLength(0);
    });

    it('should return error when ruleset file not found', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const issues = await service.loadRulesetById('/core', 'acl');

      expect(issues.some(i => i.ruleId === 'MISSING')).toBe(true);
    });
  });

  describe('isValidSemver', () => {
    it('should validate correct semver versions', () => {
      expect((service as any).isValidSemver('1.0.0')).toBe(true);
      expect((service as any).isValidSemver('1.2.3')).toBe(true);
      expect((service as any).isValidSemver('1.0.0-alpha')).toBe(true);
      expect((service as any).isValidSemver('1.0.0+build')).toBe(true);
      expect((service as any).isValidSemver('1.0.0-alpha+build')).toBe(true);
    });

    it('should reject invalid semver versions', () => {
      expect((service as any).isValidSemver('1.0')).toBe(false);
      expect((service as any).isValidSemver('latest')).toBe(false);
      expect((service as any).isValidSemver('v1.0.0')).toBe(false);
      expect((service as any).isValidSemver('')).toBe(false);
    });
  });
});