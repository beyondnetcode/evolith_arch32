import { ArchitectureDriftService, DriftReport, DriftViolation, DriftHistoryEntry } from './architecture-drift.service';
import { getContainer, resetContainer, IFileSystemProvider, IFileSystem } from '../../domain/interfaces';
import { RulesetValidatorService, ArchitectureValidationResult } from './ruleset-validator.service';

const createMockFileSystem = (overrides?: Partial<IFileSystem>): IFileSystem => {
  const mock = {
    exists: jest.fn().mockResolvedValue(false),
    existsSync: jest.fn().mockReturnValue(false),
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

const mockArchitectureResult: ArchitectureValidationResult = {
  status: 'passed',
  levels: ['F1'],
  rulesChecked: 8,
  issues: [],
  timestamp: new Date().toISOString(),
};

jest.mock('./ruleset-validator.service', () => {
  return {
    RulesetValidatorService: jest.fn().mockImplementation(() => ({
      validateArchitecture: jest.fn().mockResolvedValue(mockArchitectureResult),
    })),
  };
});

describe.skip('ArchitectureDriftService', () => {
  let service: ArchitectureDriftService;
  let mockFs: IFileSystem;

  beforeEach(() => {
    resetContainer();
    jest.clearAllMocks();

    mockFs = createMockFileSystem();
    const mockProvider: IFileSystemProvider = {
      createFileSystem: () => mockFs,
    };
    getContainer().setFileSystemProvider(mockProvider);

    service = new ArchitectureDriftService('/core');
  });

  afterEach(() => {
    resetContainer();
  });

  describe('detectDrift', () => {
    it('should return a drift report with all required fields', async () => {
      const report = await service.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: false,
      });

      expect(report).toHaveProperty('projectId');
      expect(report).toHaveProperty('declaredLevel');
      expect(report).toHaveProperty('detectedLevel');
      expect(report).toHaveProperty('driftDetected');
      expect(report).toHaveProperty('driftSeverity');
      expect(report).toHaveProperty('newViolations');
      expect(report).toHaveProperty('resolvedViolations');
      expect(report).toHaveProperty('persistentViolations');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('historyPath');
    });

    it('should detect no drift when validation passes', async () => {
      const report = await service.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: false,
      });

      expect(report.driftDetected).toBe(false);
      expect(report.driftSeverity).toBe('none');
      expect(report.overallScore).toBe(100);
    });

    it('should detect drift when validation fails', async () => {
      (RulesetValidatorService as jest.Mock).mockImplementation(() => ({
        validateArchitecture: jest.fn().mockResolvedValue({
          status: 'failed',
          levels: ['F1'],
          rulesChecked: 8,
          issues: [{
            ruleId: 'F1-R01',
            severity: 'MUST' as const,
            category: 'topology',
            title: 'Single Deployment Unit',
            description: 'Multiple deployment units detected',
            file: 'src/',
            blocking: true,
          }],
          timestamp: new Date().toISOString(),
        }),
      }));

      const driftService = new ArchitectureDriftService('/core');
      const report = await driftService.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: false,
      });

      expect(report.driftDetected).toBe(true);
      expect(report.newViolations.length).toBeGreaterThan(0);
    });

    it('should calculate correct overall score', async () => {
      (RulesetValidatorService as jest.Mock).mockImplementation(() => ({
        validateArchitecture: jest.fn().mockResolvedValue({
          status: 'passed',
          levels: ['F1'],
          rulesChecked: 8,
          issues: [
            { ruleId: 'F1-R01', severity: 'MUST' as const, category: 'topology', title: 'Issue 1', description: 'desc', blocking: true },
            { ruleId: 'F1-R02', severity: 'SHOULD' as const, category: 'bounded-contexts', title: 'Issue 2', description: 'desc', blocking: false },
          ],
          timestamp: new Date().toISOString(),
        }),
      }));
      (mockFs.existsSync as jest.Mock).mockReturnValue(false);

      const driftService = new ArchitectureDriftService('/core');
      const report = await driftService.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: false,
      });

      expect(report.overallScore).toBe(80);
    });

    it('should store history when storeHistory is true', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(false);

      const report = await service.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: true,
      });

      expect(mockFs.writeJson).toHaveBeenCalled();
    });

    it('should not store history when storeHistory is false', async () => {
      await service.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: false,
      });

      expect(mockFs.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('detectLevelDrift', () => {
    it('should return level comparison', async () => {
      const result = await service.detectLevelDrift('/project');

      expect(result).toHaveProperty('declared');
      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('drifted');
    });

    it('should detect drift when declared differs from detected', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('evolith.yaml')) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ product: { architecture: 'F2' } }));

      const result = await service.detectLevelDrift('/project');

      expect(result.drifted).toBe(result.declared !== result.detected);
    });
  });

  describe('getDriftHistory', () => {
    it('should return empty array when no history exists', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(false);

      const history = await service.getDriftHistory('/project');

      expect(history).toEqual([]);
    });

    it('should return history entries when file exists', async () => {
      const mockHistory: DriftHistoryEntry[] = [
        {
          timestamp: '2026-01-01T00:00:00.000Z',
          declaredLevel: 'F1',
          detectedLevel: 'F1',
          violationsCount: 0,
          blockingViolationsCount: 0,
          overallScore: 100,
          violations: [],
        },
      ];
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockHistory));

      const history = await service.getDriftHistory('/project');

      expect(history).toHaveLength(1);
      expect(history[0].overallScore).toBe(100);
    });
  });

  describe('getDriftTrend', () => {
    it('should return stable trend with insufficient history', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(false);

      const { trend, entries } = await service.getDriftTrend('/project');

      expect(trend).toBe('stable');
      expect(entries).toEqual([]);
    });

    it('should detect improving trend', async () => {
      const mockHistory: DriftHistoryEntry[] = [
        { timestamp: '2026-01-01', declaredLevel: 'F1', detectedLevel: 'F1', violationsCount: 5, blockingViolationsCount: 1, overallScore: 60, violations: [] },
        { timestamp: '2026-01-02', declaredLevel: 'F1', detectedLevel: 'F1', violationsCount: 3, blockingViolationsCount: 0, overallScore: 80, violations: [] },
        { timestamp: '2026-01-03', declaredLevel: 'F1', detectedLevel: 'F1', violationsCount: 1, blockingViolationsCount: 0, overallScore: 95, violations: [] },
      ];
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockHistory));

      const { trend } = await service.getDriftTrend('/project');

      expect(trend).toBe('improving');
    });

    it('should detect degrading trend', async () => {
      const mockHistory: DriftHistoryEntry[] = [
        { timestamp: '2026-01-01', declaredLevel: 'F1', detectedLevel: 'F1', violationsCount: 0, blockingViolationsCount: 0, overallScore: 100, violations: [] },
        { timestamp: '2026-01-02', declaredLevel: 'F1', detectedLevel: 'F1', violationsCount: 3, blockingViolationsCount: 1, overallScore: 70, violations: [] },
        { timestamp: '2026-01-03', declaredLevel: 'F1', detectedLevel: 'F1', violationsCount: 5, blockingViolationsCount: 2, overallScore: 50, violations: [] },
      ];
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockHistory));

      const { trend } = await service.getDriftTrend('/project');

      expect(trend).toBe('degrading');
    });
  });

  describe('calculateDriftSeverity', () => {
    it('should return critical for new blocking violations', async () => {
      (RulesetValidatorService as jest.Mock).mockImplementation(() => ({
        validateArchitecture: jest.fn().mockResolvedValue({
          status: 'failed',
          levels: ['F1'],
          rulesChecked: 8,
          issues: [{ ruleId: 'F1-R01', severity: 'MUST' as const, category: 'topology', title: 'Blocking', description: 'desc', blocking: true }],
          timestamp: new Date().toISOString(),
        }),
      }));

      const driftService = new ArchitectureDriftService('/core');
      const report = await driftService.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: false,
      });

      expect(report.driftSeverity).toBe('critical');
    });

    it('should calculate drift severity based on violations', async () => {
      const report = await service.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: false,
      });

      expect(report).toHaveProperty('driftSeverity');
      expect(['critical', 'high', 'medium', 'low', 'none']).toContain(report.driftSeverity);
    });
  });

  describe('findNewViolations', () => {
    it('should identify new violations not in previous list', async () => {
      (RulesetValidatorService as jest.Mock).mockImplementation(() => ({
        validateArchitecture: jest.fn().mockResolvedValue({
          status: 'failed',
          levels: ['F1'],
          rulesChecked: 8,
          issues: [{ ruleId: 'F1-R01', severity: 'MUST' as const, category: 'topology', title: 'New', description: 'desc', blocking: true }],
          timestamp: new Date().toISOString(),
        }),
      }));

      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([
        { timestamp: '2026-01-01', declaredLevel: 'F1', detectedLevel: 'F1', violationsCount: 0, blockingViolationsCount: 0, overallScore: 100, violations: [] },
      ]));

      const driftService = new ArchitectureDriftService('/core');
      const report = await driftService.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: true,
      });

      expect(report.newViolations.length).toBeGreaterThan(0);
      expect(report.newViolations[0].status).toBe('new');
    });
  });

  describe('findResolvedViolations', () => {
    it('should identify resolved violations no longer present', async () => {
      (RulesetValidatorService as jest.Mock).mockImplementation(() => ({
        validateArchitecture: jest.fn().mockResolvedValue({
          status: 'passed',
          levels: ['F1'],
          rulesChecked: 8,
          issues: [],
          timestamp: new Date().toISOString(),
        }),
      }));
      (mockFs.existsSync as jest.Mock).mockReturnValue(false);
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('drift-history')) {
          return Promise.resolve(JSON.stringify([
            {
              timestamp: '2026-01-01',
              declaredLevel: 'F1',
              detectedLevel: 'F1',
              violationsCount: 1,
              blockingViolationsCount: 0,
              overallScore: 95,
              violations: [{ ruleId: 'F1-R01', severity: 'SHOULD' as const, category: 'topology', title: 'Old', description: 'desc', blocking: false, firstDetected: '2026-01-01', status: 'persistent' }],
            },
          ]));
        }
        return Promise.resolve(JSON.stringify({ product: { architecture: 'F1' } }));
      });

      const driftService = new ArchitectureDriftService('/core');
      const report = await driftService.detectDrift({
        projectPath: '/project',
        declaredLevel: 'F1',
        storeHistory: true,
      });

      expect(report.resolvedViolations.length).toBeGreaterThan(0);
      expect(report.resolvedViolations[0].status).toBe('resolved');
    });
  });
});
