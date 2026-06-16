import { DriftCommand } from './drift.command';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    message: jest.fn(),
  },
}));

jest.mock('chalk', () => {
  const chalkFn = (str: string) => str;
  chalkFn.green = (str: string) => str;
  chalkFn.red = (str: string) => str;
  chalkFn.redBright = (str: string) => str;
  chalkFn.bold = (str: string) => str;
  chalkFn.yellow = (str: string) => str;
  chalkFn.blue = (str: string) => str;
  chalkFn.cyan = (str: string) => str;
  chalkFn.gray = (str: string) => str;
  return chalkFn;
});

jest.mock('@evolith/core-domain/application/validators/architecture-drift.service', () => ({
  ArchitectureDriftService: jest.fn().mockImplementation(() => ({
    detectDrift: jest.fn(),
    getDriftHistory: jest.fn(),
    getDriftTrend: jest.fn(),
  })),
}));

import * as p from '@clack/prompts';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators/architecture-drift.service';

const mockDetectDrift = jest.fn();
const mockGetDriftHistory = jest.fn();
const mockGetDriftTrend = jest.fn();

(ArchitectureDriftService as jest.Mock).mockImplementation(() => ({
  detectDrift: mockDetectDrift,
  getDriftHistory: mockGetDriftHistory,
  getDriftTrend: mockGetDriftTrend,
}));

describe('DriftCommand', () => {
  let command: DriftCommand;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  const defaultReport = {
    projectId: 'test-project',
    declaredLevel: 'F1',
    detectedLevel: 'F1',
    driftDetected: false,
    driftSeverity: 'none' as const,
    newViolations: [],
    resolvedViolations: [],
    persistentViolations: [],
    overallScore: 100,
    timestamp: '2024-01-01T00:00:00.000Z',
    historyPath: '/test/.evolith/drift-history.json',
  };

  beforeEach(() => {
    command = new DriftCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
    mockDetectDrift.mockReset();
    mockGetDriftHistory.mockReset();
    mockGetDriftTrend.mockReset();
    mockDetectDrift.mockResolvedValue(defaultReport);
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe('run', () => {
    it('should run drift detection with default options', async () => {
      await command.run([], {});

      expect(mockDetectDrift).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: expect.any(String),
          storeHistory: true,
        })
      );
    });

    it('should use provided path option', async () => {
      await command.run([], { path: '/custom/path' });

      expect(mockDetectDrift).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: '/custom/path',
        })
      );
    });

    it('should use provided level option', async () => {
      await command.run([], { level: 'F2' });

      expect(mockDetectDrift).toHaveBeenCalledWith(
        expect.objectContaining({
          declaredLevel: 'F2',
        })
      );
    });

    it('should output JSON when --json flag is passed', async () => {
      await command.run([], { json: true });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-project')
      );
    });

    it('should print drift report when no violations', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalled();
    });

    it('should show new violations in report', async () => {
      mockDetectDrift.mockResolvedValue({
        ...defaultReport,
        driftDetected: true,
        driftSeverity: 'medium' as const,
        overallScore: 80,
        newViolations: [{
          ruleId: 'F1-R01',
          severity: 'MUST' as const,
          category: 'architecture',
          title: 'Missing module boundary',
          description: 'Module boundary not enforced',
          blocking: true,
          firstDetected: '2024-01-01T00:00:00.000Z',
          status: 'new' as const,
        }],
      });

      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('New Violations')
      );
    });

    it('should show persistent violations in report', async () => {
      mockDetectDrift.mockResolvedValue({
        ...defaultReport,
        driftDetected: true,
        driftSeverity: 'low' as const,
        overallScore: 85,
        persistentViolations: [{
          ruleId: 'F1-R02',
          severity: 'SHOULD' as const,
          category: 'architecture',
          title: 'Deprecated import',
          description: 'Using deprecated import',
          blocking: false,
          firstDetected: '2024-01-01T00:00:00.000Z',
          status: 'persistent' as const,
        }],
      });

      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Persistent Violations')
      );
    });

    it('should show resolved violations in report', async () => {
      mockDetectDrift.mockResolvedValue({
        ...defaultReport,
        resolvedViolations: [{
          ruleId: 'F1-R03',
          severity: 'COULD' as const,
          category: 'architecture',
          title: 'Resolved issue',
          description: 'This was fixed',
          blocking: false,
          firstDetected: '2024-01-01T00:00:00.000Z',
          status: 'resolved' as const,
        }],
      });

      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Resolved Violations')
      );
    });

    it('should show level drift warning when levels differ', async () => {
      mockDetectDrift.mockResolvedValue({
        ...defaultReport,
        declaredLevel: 'F2',
        detectedLevel: 'F1',
        driftDetected: true,
        driftSeverity: 'high' as const,
        overallScore: 60,
      });

      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('LEVEL DRIFT DETECTED')
      );
    });

    it('should show compliant message when no violations', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('compliant')
      );
    });

    it('should handle detection errors and exit', async () => {
      mockDetectDrift.mockRejectedValue(new Error('Detection failed'));

      await expect(command.run([], {})).rejects.toThrow('Detection failed');

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown objects', async () => {
      mockDetectDrift.mockRejectedValue('Some string error');

      await expect(command.run([], {})).rejects.toThrow('Some string error');

      expect(p.log.error).toHaveBeenCalled();
    });
  });

  describe('run --trend', () => {
    it('should show trend analysis when --trend flag is passed', async () => {
      mockGetDriftTrend.mockResolvedValue({
        trend: 'improving',
        entries: [
          {
            timestamp: '2024-01-01T00:00:00.000Z',
            declaredLevel: 'F1',
            detectedLevel: 'F1',
            violationsCount: 2,
            blockingViolationsCount: 0,
            overallScore: 80,
            violations: [],
          },
          {
            timestamp: '2024-01-02T00:00:00.000Z',
            declaredLevel: 'F1',
            detectedLevel: 'F1',
            violationsCount: 1,
            blockingViolationsCount: 0,
            overallScore: 90,
            violations: [],
          },
        ],
      });

      await command.run([], { trend: true });

      expect(mockGetDriftTrend).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Trend')
      );
    });

    it('should show message when no history available for trend', async () => {
      mockGetDriftTrend.mockResolvedValue({
        trend: 'stable',
        entries: [],
      });

      await command.run([], { trend: true });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No history')
      );
    });
  });

  describe('run --history', () => {
    it('should show drift history when --history flag is passed', async () => {
      mockGetDriftHistory.mockResolvedValue([
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          declaredLevel: 'F1',
          detectedLevel: 'F1',
          violationsCount: 2,
          blockingViolationsCount: 0,
          overallScore: 80,
          violations: [],
        },
      ]);

      await command.run([], { history: true });

      expect(mockGetDriftHistory).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Total scans')
      );
    });

    it('should show message when no history available', async () => {
      mockGetDriftHistory.mockResolvedValue([]);

      await command.run([], { history: true });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No drift history')
      );
    });

    it('should limit history display to last 10 entries', async () => {
      const manyEntries = Array.from({ length: 15 }, (_, i) => ({
        timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        declaredLevel: 'F1',
        detectedLevel: 'F1',
        violationsCount: i,
        blockingViolationsCount: 0,
        overallScore: 100 - i * 5,
        violations: [],
      }));
      mockGetDriftHistory.mockResolvedValue(manyEntries);

      await command.run([], { history: true });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Total scans: 15')
      );
    });
  });

  describe('option parsers', () => {
    it('should parse path option', () => {
      expect(command.parsePath('/some/path')).toBe('/some/path');
    });

    it('should parse level option', () => {
      expect(command.parseLevel('F2')).toBe('F2');
    });

    it('should parse json option', () => {
      expect(command.parseJson()).toBe(true);
    });

    it('should parse history option', () => {
      expect(command.parseHistory()).toBe(true);
    });

    it('should parse trend option', () => {
      expect(command.parseTrend()).toBe(true);
    });
  });

  describe('printDriftReport helper methods', () => {
    it('should display history path in report', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('History stored at')
      );
    });
  });
});
