import { SatelliteUpgradeService } from './satellite-upgrade.service';
import { getContainer, resetContainer, IFileSystemProvider, IFileSystem } from '../abstractions';

const createMockFs = (overrides?: Partial<IFileSystem>): IFileSystem => ({
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
} as unknown as IFileSystem);

describe('SatelliteUpgradeService', () => {
  let service: SatelliteUpgradeService;
  let mockFs: IFileSystem;

  beforeEach(() => {
    resetContainer();
    jest.clearAllMocks();
    mockFs = createMockFs();
    getContainer().setFileSystemProvider({ createFileSystem: () => mockFs });
    service = new SatelliteUpgradeService();
  });

  afterEach(() => resetContainer());

  describe('planUpgrade', () => {
    it('should return plan with versions', async () => {
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '1.1.0' });
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ coreRef: { version: '1.0.0' } }));
      (mockFs.readdirNames as jest.Mock).mockResolvedValue([]);

      const plan = await service.planUpgrade({ satellitePath: '/s', corePath: '/c' });
      expect(plan.currentVersion).toBe('1.0.0');
      expect(plan.targetVersion).toBe('1.1.0');
      expect(plan.estimatedRisk).toBe('low');
    });
  });

  describe('executeUpgrade', () => {
    it('should succeed when no changes needed', async () => {
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '1.0.0' });
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ coreRef: { version: '1.0.0' } }));
      (mockFs.readdirNames as jest.Mock).mockResolvedValue([]);

      const result = await service.executeUpgrade({ satellitePath: '/s', corePath: '/c' });
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Satellite is already up to date');
    });

    it('should return dry run result', async () => {
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '1.1.0' });
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) =>
        p.includes('evolith.yaml') ? Promise.resolve(JSON.stringify({ coreRef: { version: '1.0.0' } })) : Promise.resolve('')
      );
      (mockFs.readdirNames as jest.Mock).mockResolvedValue([]);
      (mockFs.exists as jest.Mock).mockResolvedValue(false);

      const result = await service.executeUpgrade({ satellitePath: '/s', corePath: '/c', dryRun: true });
      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(0);
    });
  });

  describe('getUpgradeReport', () => {
    it('should generate report with errors', async () => {
      const report = await service.getUpgradeReport({
        success: false, plan: { currentVersion: '1.0.0', targetVersion: '1.1.0', changes: [], breakingChanges: [], backupRequired: false, estimatedRisk: 'low' },
        changesApplied: 0, changesSkipped: 0, backupPath: null, errors: ['Err'], warnings: [],
      });
      expect(report).toContain('Errors');
      expect(report).toContain('Err');
    });

    it('should generate report with backup', async () => {
      const report = await service.getUpgradeReport({
        success: true, plan: { currentVersion: '1.0.0', targetVersion: '1.1.0', changes: [], breakingChanges: [], backupRequired: true, estimatedRisk: 'medium' },
        changesApplied: 0, changesSkipped: 0, backupPath: '/backup', errors: [], warnings: [],
      });
      expect(report).toContain('Backup');
    });
  });

  describe('isBreakingChange', () => {
    it('should identify breaking patterns', () => {
      expect((service as any).isBreakingChange('inheritance.json')).toBe(true);
      expect((service as any).isBreakingChange('governance.json')).toBe(true);
      expect((service as any).isBreakingChange('adr.json')).toBe(false);
    });
  });

  describe('getSatelliteVersion', () => {
    it('should return unknown when file missing', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(false);
      expect(await (service as any).getSatelliteVersion('/s')).toBe('unknown');
    });

    it('should return version from file', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ coreRef: { version: '2.0.0' } }));
      expect(await (service as any).getSatelliteVersion('/s')).toBe('2.0.0');
    });
  });

  describe('getCoreVersion', () => {
    it('should return version from package.json', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readJson as jest.Mock).mockResolvedValue({ version: '3.0.0' });
      expect(await (service as any).getCoreVersion('/c')).toBe('3.0.0');
    });
  });

  describe('findJsonFiles', () => {
    it('should return empty when dir missing', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValueOnce(false);
      expect(await (service as any).findJsonFiles('/x')).toEqual([]);
    });
  });

  describe('applyChange', () => {
    it('should apply add change', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockResolvedValue('{}');
      await (service as any).applyChange({ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'x', breaking: false }, '/sat', '/core');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should warn on migrate', async () => {
      const spy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
      await (service as any).applyChange({ type: 'migrate', sourcePath: '/s', targetPath: '/t', description: 'x', breaking: false }, '/sat', '/core');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('diffSatelliteVsCore', () => {
    it('should detect new rulesets', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p === '/c/rulesets') return Promise.resolve(true);
        if (p === '/s/rulesets/new.json') return Promise.resolve(false);
        return Promise.resolve(false);
      });
      (mockFs.readdirNames as jest.Mock).mockResolvedValue(['new.json']);
      (mockFs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => false, isFile: () => true });
      (mockFs.readFile as jest.Mock).mockResolvedValue('{}');

      const changes = await (service as any).diffSatelliteVsCore('/s', '/c');
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].type).toBe('add');
    });
  });

  describe('createBackup', () => {
    it('should create backup directory', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      const path = await (service as any).createBackup('/s');
      expect(path).toContain('.evolith-backup');
    });
  });

  describe('copyDirectory', () => {
    it('should copy files', async () => {
      (mockFs.readdirNames as jest.Mock).mockResolvedValue(['f.json']);
      (mockFs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => false, isFile: () => true });
      (mockFs.readFile as jest.Mock).mockResolvedValue('c');
      await (service as any).copyDirectory('/s', '/t');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('updateSatelliteVersion', () => {
    it('should update version', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ coreRef: { version: '1.0.0' } }));
      await (service as any).updateSatelliteVersion('/s', '2.0.0');
      expect(mockFs.writeJson).toHaveBeenCalled();
    });
  });
});
