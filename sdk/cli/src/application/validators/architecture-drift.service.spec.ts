import { ArchitectureDriftService } from './architecture-drift.service';
import { ArchitectureValidationResult, ValidationIssue } from './ruleset-validator.service';

function createMockFs(overrides: Record<string, unknown> = {}) {
  return {
    exists: jest.fn().mockResolvedValue(false),
    existsSync: jest.fn().mockReturnValue(false),
    readFile: jest.fn().mockResolvedValue(''),
    writeJson: jest.fn().mockResolvedValue(undefined),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

function issue(over: Partial<ValidationIssue> = {}): ValidationIssue {
  return {
    ruleId: 'ARCH-001',
    severity: 'MUST',
    category: 'architecture',
    title: 'Hexagonal boundary',
    description: 'desc',
    blocking: true,
    ...over,
  } as ValidationIssue;
}

function result(over: Partial<ArchitectureValidationResult> = {}): ArchitectureValidationResult {
  return { status: 'passed', rulesChecked: 8, issues: [], ...over } as ArchitectureValidationResult;
}

function makeService(opts: { fs?: unknown; validatorResult?: ArchitectureValidationResult } = {}) {
  const fs = opts.fs ?? createMockFs();
  const validator = { validateArchitecture: jest.fn().mockResolvedValue(opts.validatorResult ?? result()) };
  const service = new ArchitectureDriftService(undefined, { fileSystem: fs, logger: mockLogger, validator });
  return { service, fs, validator };
}

describe('ArchitectureDriftService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('detectDrift', () => {
    it('reports no drift for a clean validation', async () => {
      const { service } = makeService();
      const report = await service.detectDrift({ projectPath: '/p/app', declaredLevel: 'F1', storeHistory: false });

      expect(report.driftDetected).toBe(false);
      expect(report.driftSeverity).toBe('none');
      expect(report.overallScore).toBe(100);
      expect(report.projectId).toBe('app');
    });

    it('flags critical drift on a new blocking violation', async () => {
      const { service } = makeService({
        validatorResult: result({ status: 'failed', issues: [issue({ ruleId: 'ARCH-NEW', blocking: true })] }),
      });
      const report = await service.detectDrift({ projectPath: '/p/app', declaredLevel: 'F1', storeHistory: false });

      expect(report.driftDetected).toBe(true);
      expect(report.driftSeverity).toBe('critical');
      expect(report.newViolations).toHaveLength(1);
      expect(report.overallScore).toBeLessThan(100);
    });

    it('persists history when storeHistory is enabled', async () => {
      const fs = createMockFs();
      const { service } = makeService({ fs });
      await service.detectDrift({ projectPath: '/p/app', declaredLevel: 'F1', storeHistory: true });

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.writeJson).toHaveBeenCalledWith(expect.stringContaining('drift-history.json'), expect.any(Array));
    });

    it('classifies persistent (non-new) violations from prior history', async () => {
      const prior = [{
        timestamp: 't', declaredLevel: 'F1', detectedLevel: 'F1', violationsCount: 1,
        blockingViolationsCount: 1, overallScore: 85,
        violations: [{ ruleId: 'ARCH-001', severity: 'MUST', category: 'architecture', title: 't', description: 'd', blocking: true, firstDetected: 't', status: 'persistent' }],
      }];
      const fs = createMockFs({
        exists: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(prior)),
      });
      const { service } = makeService({ fs, validatorResult: result({ status: 'failed', issues: [issue({ ruleId: 'ARCH-001' })] }) });
      const report = await service.detectDrift({ projectPath: '/p/app', declaredLevel: 'F1', storeHistory: true });

      expect(report.newViolations).toHaveLength(0);
      expect(report.persistentViolations).toHaveLength(1);
    });
  });

  describe('detectActualLevel via detectLevelDrift', () => {
    it('detects F3 when Dockerfile, contracts, and events exist', async () => {
      const fs = createMockFs({ existsSync: jest.fn().mockReturnValue(true) });
      const { service } = makeService({ fs });
      const res = await service.detectLevelDrift('/p/app', '/core');
      expect(res.detected).toBe('F3');
    });

    it('detects F1 and flags drift against a declared F2', async () => {
      const fs = createMockFs({
        existsSync: jest.fn().mockReturnValue(false),
        exists: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify({ product: { architecture: 'F2' } })),
      });
      const { service } = makeService({ fs });
      const res = await service.detectLevelDrift('/p/app', '/core');
      expect(res.declared).toBe('F2');
      expect(res.detected).toBe('F1');
      expect(res.drifted).toBe(true);
    });
  });

  describe('getDriftHistory', () => {
    it('returns an empty array when no history file exists', async () => {
      const { service } = makeService();
      expect(await service.getDriftHistory('/p/app')).toEqual([]);
    });

    it('returns [] when the history file is corrupt', async () => {
      const fs = createMockFs({
        exists: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue('not-json'),
      });
      const { service } = makeService({ fs });
      expect(await service.getDriftHistory('/p/app')).toEqual([]);
    });
  });

  describe('getDriftTrend', () => {
    const entry = (score: number): unknown => ({
      timestamp: 't', declaredLevel: 'F1', detectedLevel: 'F1',
      violationsCount: 0, blockingViolationsCount: 0, overallScore: score, violations: [],
    });

    it('returns stable with fewer than two entries', async () => {
      const fs = createMockFs({
        exists: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify([entry(80)])),
      });
      const { service } = makeService({ fs });
      expect((await service.getDriftTrend('/p/app')).trend).toBe('stable');
    });

    it('detects an improving trend', async () => {
      const fs = createMockFs({
        exists: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify([entry(70), entry(90)])),
      });
      const { service } = makeService({ fs });
      expect((await service.getDriftTrend('/p/app')).trend).toBe('improving');
    });

    it('detects a degrading trend', async () => {
      const fs = createMockFs({
        exists: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify([entry(90), entry(70)])),
      });
      const { service } = makeService({ fs });
      expect((await service.getDriftTrend('/p/app')).trend).toBe('degrading');
    });
  });
});
