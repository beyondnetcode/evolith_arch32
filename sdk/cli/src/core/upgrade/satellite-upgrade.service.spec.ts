import { SatelliteUpgradeService, UpgradeOptions, UpgradePlan } from './satellite-upgrade.service';
import { getContainer, resetContainer, IFileSystemProvider, IFileSystem } from '../abstractions';

const createMockFileSystem = (overrides?: Partial<IFileSystem>): IFileSystem => {
  const mock = {
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(true),
    readFile: jest.fn().mockResolvedValue(''),
    readJson: jest.fn().mockResolvedValue({}),
    readdirNames: jest.fn().mockResolvedValue([]),
    writeFile: jest.fn().mockResolvedValue(undefined),
    writeJson: jest.fn().mockResolvedValue(undefined),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => false }),
    ...overrides,
  };
  return mock as unknown as IFileSystem;
};

describe('SatelliteUpgradeService', () => {
  let service: SatelliteUpgradeService;
  let mockFs: IFileSystem;

  beforeEach(() => {
    resetContainer();
    jest.clearAllMocks();

    mockFs = createMockFileSystem();
    const mockProvider: IFileSystemProvider = {
      createFileSystem: () => mockFs,
    };
    getContainer().setFileSystemProvider(mockProvider);

    service = new SatelliteUpgradeService();
  });

  afterEach(() => {
    resetContainer();
  });

  describe('planUpgrade', () => {
    it('should return upgrade plan with all required fields', async () => {
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '1.0.0' });
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ coreRef: { version: '0.9.0' } }));
      (mockFs.readdirNames as jest.Mock).mockResolvedValue([]);

      const plan = await service.planUpgrade({
        satellitePath: '/satellite',
        corePath: '/core',
      });

      expect(plan).toHaveProperty('currentVersion');
      expect(plan).toHaveProperty('targetVersion');
      expect(plan).toHaveProperty('changes');
      expect(plan).toHaveProperty('breakingChanges');
      expect(plan).toHaveProperty('backupRequired');
      expect(plan).toHaveProperty('estimatedRisk');
    });

    it('should detect version difference', async () => {
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '1.1.0' });
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ coreRef: { version: '1.0.0' } }));
      (mockFs.readdirNames as jest.Mock).mockResolvedValue([]);

      const plan = await service.planUpgrade({
        satellitePath: '/satellite',
        corePath: '/core',
      });

      expect(plan.currentVersion).toBe('1.0.0');
      expect(plan.targetVersion).toBe('1.1.0');
    });

    it('should return low risk when no breaking changes', async () => {
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '1.0.0' });
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ coreRef: { version: '1.0.0' } }));
      (mockFs.readdirNames as jest.Mock).mockResolvedValue([]);

      const plan = await service.planUpgrade({
        satellitePath: '/satellite',
        corePath: '/core',
      });

      expect(plan.estimatedRisk).toBe('low');
    });
  });

  describe('executeUpgrade', () => {
    it('should return success when no changes needed', async () => {
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '1.0.0' });
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ coreRef: { version: '1.0.0' } }));
      (mockFs.readdirNames as jest.Mock).mockResolvedValue([]);

      const result = await service.executeUpgrade({
        satellitePath: '/satellite',
        corePath: '/core',
      });

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(0);
      expect(result.warnings).toContain('Satellite is already up to date');
    });

    it('should return dry run result without applying changes', async () => {
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '1.1.0' });
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('evolith.yaml')) return Promise.resolve(JSON.stringify({ coreRef: { version: '1.0.0' } }));
        return Promise.resolve('');
      });
      (mockFs.readdirNames as jest.Mock).mockResolvedValue([]);
      (mockFs.exists as jest.Mock).mockResolvedValue(false);

      const result = await service.executeUpgrade({
        satellitePath: '/satellite',
        corePath: '/core',
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(0);
    });
  });

  describe('getUpgradeReport', () => {
    it('should generate report string with all sections', async () => {
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '1.0.0' });
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ coreRef: { version: '1.0.0' } }));
      (mockFs.readdirNames as jest.Mock).mockResolvedValue([]);

      const result = await service.executeUpgrade({
        satellitePath: '/satellite',
        corePath: '/core',
      });

      const report = await service.getUpgradeReport(result);

      expect(report).toContain('Satellite Upgrade Report');
      expect(report).toContain('Current Version');
      expect(report).toContain('Target Version');
    });

    it('should include errors in report when present', async () => {
      const mockResult = {
        success: false,
        plan: {
          currentVersion: '1.0.0',
          targetVersion: '1.1.0',
          changes: [],
          breakingChanges: [],
          backupRequired: false,
          estimatedRisk: 'low' as const,
        },
        changesApplied: 0,
        changesSkipped: 0,
        backupPath: null,
        errors: ['Test error'],
        warnings: [],
      };

      const report = await service.getUpgradeReport(mockResult);

      expect(report).toContain('Errors');
      expect(report).toContain('Test error');
    });
  });
});
