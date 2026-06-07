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
  stat: jest.fn(),
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

  describe('validateArchitecture', () => {
    it('should return passed when no ruleset files exist', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.validateArchitecture('/satellite');

      expect(result.status).toBe('passed');
      expect(result.levels).toContain('F1');
      expect(result.levels).toContain('F2');
      expect(result.levels).toContain('F3');
    });

    it('should validate F1 level only', async () => {
      mockFileSystem.exists
        .mockResolvedValueOnce(true) // ruleset exists
        .mockResolvedValueOnce(false); // no more files
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify({
        rules: [
          { id: 'F1-R01', severity: 'SHOULD', category: 'topology', title: 'Monorepo', description: 'Check', blocking: false }
        ]
      }));

      const result = await service.validateArchitecture('/satellite', '/core', 'F1');

      expect(result.levels).toEqual(['F1']);
    });

    it('should validate ALL levels when specified', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.validateArchitecture('/satellite', '/core', 'ALL');

      expect(result.levels).toEqual(['F1', 'F2', 'F3']);
    });

    it('should report missing ruleset as SHOULD issue', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.validateArchitecture('/satellite', '/core', 'F1');

      const missingIssue = result.issues.find(i => i.ruleId === 'ARCH-F1-MISSING');
      expect(missingIssue).toBeDefined();
      expect(missingIssue?.severity).toBe('SHOULD');
    });
  });

  describe('validateArchitectureRule - F1 rules', () => {
    it('should detect monorepo workspace (F1-R01)', async () => {
      mockFileSystem.exists.mockImplementation(async (p: string) => p.includes('package.json'));
      mockFileSystem.readJson.mockResolvedValue({ workspaces: ['packages/*'] });

      const rule = { id: 'F1-R01', severity: 'SHOULD', category: 'topology', title: 'Monorepo', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).not.toBeNull();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].ruleId).toBe('F1-R01');
    });

    it('should pass when no workspaces (F1-R01)', async () => {
      mockFileSystem.exists.mockImplementation(async (p: string) => p.includes('package.json'));
      mockFileSystem.readJson.mockResolvedValue({ name: 'test' });

      const rule = { id: 'F1-R01', severity: 'SHOULD', category: 'topology', title: 'Monorepo', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).toBeNull();
    });

    it('should detect single module (F1-R02)', async () => {
      mockFileSystem.exists.mockImplementation(async (p: string) => p.includes('src'));
      mockFileSystem.readdirNames.mockResolvedValue(['main.ts']);

      const rule = { id: 'F1-R02', severity: 'SHOULD', category: 'bounded-contexts', title: 'Contexts', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).not.toBeNull();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should pass when multiple modules (F1-R02)', async () => {
      mockFileSystem.exists.mockImplementation(async (p: string) => p.includes('src'));
      mockFileSystem.readdirNames.mockResolvedValue(['module1', 'module2', 'module3']);

      const rule = { id: 'F1-R02', severity: 'SHOULD', category: 'bounded-contexts', title: 'Contexts', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).toBeNull();
    });

    it('should detect missing ports directory (F1-R03)', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const rule = { id: 'F1-R03', severity: 'SHOULD', category: 'hexagonal-architecture', title: 'Ports', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).not.toBeNull();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect missing contracts directory (F1-R04)', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const rule = { id: 'F1-R04', severity: 'SHOULD', category: 'communication', title: 'Contracts', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).not.toBeNull();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect missing acl directory (F1-R05)', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const rule = { id: 'F1-R05', severity: 'SHOULD', category: 'persistence', title: 'ACL', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).not.toBeNull();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect single bounded context in acl (F1-R05)', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['context1']);

      const rule = { id: 'F1-R05', severity: 'SHOULD', category: 'persistence', title: 'ACL', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).not.toBeNull();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect missing events directory (F1-R06)', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const rule = { id: 'F1-R06', severity: 'SHOULD', category: 'async-boundaries', title: 'Events', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).not.toBeNull();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('validateArchitectureRule - F2 rules', () => {
    it('should detect missing independent module package.json (F2-R01)', async () => {
      mockFileSystem.exists
        .mockResolvedValueOnce(true) // src exists
        .mockResolvedValueOnce(false); // no package.json in module
      mockFileSystem.readdirNames.mockResolvedValue(['module1', 'module2']);

      const rule = { id: 'F2-R01', severity: 'MUST', category: 'module-autonomy', title: 'Autonomy', description: 'Check', blocking: true };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F2');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should pass when modules have package.json (F2-R01)', async () => {
      mockFileSystem.exists
        .mockResolvedValueOnce(true) // src exists
        .mockResolvedValueOnce(true); // package.json exists
      mockFileSystem.readdirNames.mockResolvedValue(['module1', 'module2']);

      const rule = { id: 'F2-R01', severity: 'MUST', category: 'module-autonomy', title: 'Autonomy', description: 'Check', blocking: true };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F2');

      expect(issues).toBeNull();
    });

    it('should detect missing contracts directory (F2-R02)', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const rule = { id: 'F2-R02', severity: 'MUST', category: 'contract-stability', title: 'Contracts', description: 'Check', blocking: true };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F2');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect empty contracts directory (F2-R02)', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['readme.txt']);

      const rule = { id: 'F2-R02', severity: 'MUST', category: 'contract-stability', title: 'Contracts', description: 'Check', blocking: true };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F2');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should pass when contracts have valid files (F2-R02)', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['service.proto', 'events.avsc']);

      const rule = { id: 'F2-R02', severity: 'MUST', category: 'contract-stability', title: 'Contracts', description: 'Check', blocking: true };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F2');

      expect(issues).toBeNull();
    });

    it('should detect missing acl directory (F2-R03)', async () => {
      mockFileSystem.existsSync.mockReturnValue(false);

      const rule = { id: 'F2-R03', severity: 'MUST', category: 'data-ownership', title: 'Data', description: 'Check', blocking: true };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F2');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect missing event schema files (F2-R04)', async () => {
      mockFileSystem.exists
        .mockResolvedValueOnce(true) // events dir exists
        .mockResolvedValueOnce(false); // more checks
      mockFileSystem.readdirNames.mockResolvedValue(['readme.txt']);

      const rule = { id: 'F2-R04', severity: 'SHOULD', category: 'async-communication', title: 'Events', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F2');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('validateArchitectureRule - F3 rules', () => {
    it('should detect missing Dockerfile (F3-R01)', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const rule = { id: 'F3-R01', severity: 'MUST', category: 'containerization', title: 'Docker', description: 'Check', blocking: true };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F3');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should pass when Dockerfile exists (F3-R01)', async () => {
      mockFileSystem.exists.mockResolvedValue(true);

      const rule = { id: 'F3-R01', severity: 'MUST', category: 'containerization', title: 'Docker', description: 'Check', blocking: true };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F3');

      expect(issues).toBeNull();
    });

    it('should detect single service (F3-R02)', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['service1']);
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });

      const rule = { id: 'F3-R02', severity: 'SHOULD', category: 'service-boundaries', title: 'Services', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F3');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should pass when multiple services (F3-R02)', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['service1', 'service2']);
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });

      const rule = { id: 'F3-R02', severity: 'SHOULD', category: 'service-boundaries', title: 'Services', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F3');

      expect(issues).toBeNull();
    });
  });

  describe('validateArchitectureRule - cross-cutting', () => {
    it('should detect missing extraction readiness (extraction-readiness)', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const rule = { id: 'F3-R03', severity: 'SHOULD', category: 'extraction-readiness', title: 'Readiness', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F3');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect missing observability setup (observability)', async () => {
      mockFileSystem.exists
        .mockResolvedValueOnce(true) // package.json
        .mockResolvedValueOnce(false); // no otel config

      const rule = { id: 'F3-R04', severity: 'SHOULD', category: 'observability', title: 'OTEL', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F3');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should pass when otel config exists (observability)', async () => {
      mockFileSystem.exists.mockResolvedValue(true);

      const rule = { id: 'F3-R04', severity: 'SHOULD', category: 'observability', title: 'OTEL', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F3');

      expect(issues).toBeNull();
    });

    it('should detect missing distributed tracing (distributed-tracing)', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const rule = { id: 'F3-R05', severity: 'SHOULD', category: 'distributed-tracing', title: 'Tracing', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F3');

      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should return null for unknown rule category', async () => {
      const rule = { id: 'X-R01', severity: 'SHOULD', category: 'unknown-category', title: 'Unknown', description: 'Check', blocking: false };
      const issues = await (service as any).validateArchitectureRule('/satellite', rule, 'F1');

      expect(issues).toBeNull();
    });
  });

  describe('validate - ACL and Open Core rules', () => {
    it('should detect empty ACL directory', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile
        .mockResolvedValueOnce('coreRef:\n  version: "1.0.0"')
        .mockResolvedValueOnce(JSON.stringify({ principles: [{ id: 'INH-01' }] }))
        .mockResolvedValueOnce(JSON.stringify({ principles: [{ id: 'ACL-01' }] }))
        .mockResolvedValueOnce(JSON.stringify({ principles: [] }));
      mockConfigParser.parse.mockReturnValue({ coreRef: { version: '1.0.0' } });
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readdirNames.mockResolvedValue([]);

      const result = await service.validate('/satellite');

      const aclIssue = result.issues.find(i => i.ruleId === 'ACL-01');
      expect(aclIssue).toBeDefined();
      expect(aclIssue?.title).toBe('ACL directory is empty');
    });

    it('should detect enterprise-only license in core', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile
        .mockResolvedValueOnce('coreRef:\n  version: "1.0.0"')
        .mockResolvedValueOnce(JSON.stringify({ principles: [] }))
        .mockResolvedValueOnce(JSON.stringify({ principles: [] }))
        .mockResolvedValueOnce(JSON.stringify({ principles: [] }));
      mockConfigParser.parse.mockReturnValue({ coreRef: { version: '1.0.0' } });
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['file.ts']);
      mockFileSystem.readJson.mockResolvedValue({ license: 'Enterprise' });

      const result = await service.validate('/satellite');

      const ocbIssue = result.issues.find(i => i.ruleId === 'OCB-01');
      expect(ocbIssue).toBeDefined();
    });

    it('should detect UNLICENSED package', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile
        .mockResolvedValueOnce('coreRef:\n  version: "1.0.0"')
        .mockResolvedValueOnce(JSON.stringify({ principles: [] }))
        .mockResolvedValueOnce(JSON.stringify({ principles: [] }))
        .mockResolvedValueOnce(JSON.stringify({ principles: [] }));
      mockConfigParser.parse.mockReturnValue({ coreRef: { version: '1.0.0' } });
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['file.ts']);
      mockFileSystem.readJson.mockResolvedValue({ license: 'UNLICENSED' });

      const result = await service.validate('/satellite');

      const ocbIssue = result.issues.find(i => i.ruleId === 'OCB-01');
      expect(ocbIssue).toBeDefined();
    });

    it('should pass with valid open license', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile
        .mockResolvedValueOnce('coreRef:\n  version: "1.0.0"\ngovernance:\n  version: "1.0.0"')
        .mockResolvedValueOnce(JSON.stringify({ principles: [] }))
        .mockResolvedValueOnce(JSON.stringify({ principles: [] }));
      mockConfigParser.parse.mockReturnValue({ coreRef: { version: '1.0.0' }, governance: { version: '1.0.0' } });
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['file.ts']);
      mockFileSystem.readJson.mockResolvedValue({ license: 'MIT' });

      const result = await service.validate('/satellite');

      const ocbIssue = result.issues.find(i => i.ruleId === 'OCB-01');
      expect(ocbIssue).toBeUndefined();
    });
  });

  describe('validate - invalid semver', () => {
    it('should detect invalid semver format', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile
        .mockResolvedValueOnce('coreRef:\n  version: "latest"')
        .mockResolvedValueOnce(JSON.stringify({ principles: [{ id: 'INH-02', severity: 'MUST', principle: 'Test', statement: 'Test', blocking: true }] }));
      mockConfigParser.parse.mockReturnValue({ coreRef: { version: 'latest' } });
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['file.ts']);

      const result = await service.validate('/satellite');

      const semverIssue = result.issues.find(i => i.ruleId === 'INH-02' && i.title === 'Invalid semver format');
      expect(semverIssue).toBeDefined();
    });
  });

  describe('loadRulesetById - additional coverage', () => {
    it('should load acl ruleset', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify({
        principles: [{ id: 'ACL-01', severity: 'MUST', principle: 'ACL', statement: 'Test', blocking: true }]
      }));

      const issues = await service.loadRulesetById('/core', 'acl');

      expect(issues).toHaveLength(0);
    });

    it('should load open-core ruleset', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify({
        rules: [{ id: 'OCB-01', severity: 'MUST', title: 'Open Core', description: 'Test', blocking: true }]
      }));

      const issues = await service.loadRulesetById('/core', 'open-core');

      expect(issues).toHaveLength(0);
    });

    it('should load inheritance ruleset', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify({
        principles: [{ id: 'INH-01', severity: 'MUST', principle: 'Inherit', statement: 'Test', blocking: true }]
      }));

      const issues = await service.loadRulesetById('/core', 'inheritance');

      expect(issues).toHaveLength(0);
    });

    it('should handle ruleset with rules array', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify({
        rules: [{ id: 'R-01', severity: 'MUST', title: 'Rule', description: 'Test', blocking: true }]
      }));

      const issues = await service.loadRulesetById('/core', 'acl');

      expect(issues).toHaveLength(0);
    });

    it('should handle failed ruleset parsing', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue('invalid json');

      const issues = await service.loadRulesetById('/core', 'acl');

      expect(issues.some(i => i.ruleId === 'MISSING')).toBe(true);
    });
  });
});