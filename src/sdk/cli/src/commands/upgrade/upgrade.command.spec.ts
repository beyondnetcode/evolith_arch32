import { UpgradeCommand } from './upgrade.command';

jest.mock('@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service', () => ({
  SatelliteUpgradeService: jest.fn().mockImplementation(() => ({
    planUpgrade: jest.fn(),
    executeUpgrade: jest.fn(),
    getUpgradeReport: jest.fn(),
  })),
}));

jest.mock('../../infrastructure/prompts/prompt.service', () => ({
  PromptService: jest.fn().mockImplementation(() => ({
    showIntro: jest.fn(),
    showOutro: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    startSpinner: jest.fn(),
    stopSpinner: jest.fn(),
    confirm: jest.fn(),
  })),
}));

import { SatelliteUpgradeService } from '@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

const mockPlanUpgrade = jest.fn();
const mockExecuteUpgrade = jest.fn();
const mockGetUpgradeReport = jest.fn();

(SatelliteUpgradeService as jest.Mock).mockImplementation(() => ({
  planUpgrade: mockPlanUpgrade,
  executeUpgrade: mockExecuteUpgrade,
  getUpgradeReport: mockGetUpgradeReport,
}));

describe('UpgradeCommand', () => {
  let command: UpgradeCommand;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  let promptServiceMock: jest.Mocked<PromptService>;

  beforeEach(() => {
    promptServiceMock = new PromptService() as jest.Mocked<PromptService>;
    command = new UpgradeCommand(promptServiceMock);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
    mockPlanUpgrade.mockReset();
    mockExecuteUpgrade.mockReset();
    mockGetUpgradeReport.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe('run', () => {
    it('should show intro and plan upgrade', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.0.0',
        estimatedRisk: 'low',
      });

      await command.run([], {});

      expect(promptServiceMock.showIntro).toHaveBeenCalled();
      expect(mockPlanUpgrade).toHaveBeenCalled();
    });

    it('should show already up to date when no changes', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.0.0',
        estimatedRisk: 'low',
      });

      await command.run([], {});

      expect(promptServiceMock.showSuccess).toHaveBeenCalledWith(
        expect.stringContaining('already up to date')
      );
      expect(promptServiceMock.showOutro).toHaveBeenCalled();
    });

    // GT-459: the command used to do `new SatelliteUpgradeService()` with no
    // args, leaving `this.fs`/`this.logger` undefined so the first `fs.exists`
    // threw a raw stack trace. The service must be built with an injected
    // filesystem + logger, and the command must reach a plan without crashing.
    it('GT-459: constructs the upgrade service with an injected filesystem and logger', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.0.0',
        estimatedRisk: 'low',
      });

      await expect(command.run([], { dryRun: true })).resolves.not.toThrow();

      expect(SatelliteUpgradeService).toHaveBeenCalledWith(
        expect.objectContaining({
          fileSystem: expect.anything(),
          logger: expect.anything(),
        }),
      );
    });

    it('should run dry run when dryRun option is set', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'test', breaking: false }],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
      });
      mockExecuteUpgrade.mockResolvedValue({
        success: true,
        changesApplied: 0,
        changesSkipped: 1,
        errors: [],
        warnings: [],
        plan: { changes: [], breakingChanges: [], currentVersion: '1.0.0', targetVersion: '1.1.0', estimatedRisk: 'low', backupRequired: false },
        backupPath: null,
      });
      mockGetUpgradeReport.mockResolvedValue('report');

      await command.run([], { dryRun: true });

      expect(mockExecuteUpgrade).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true })
      );
      expect(promptServiceMock.showInfo).toHaveBeenCalledWith(
        expect.stringContaining('Dry run complete')
      );
    });

    it('should cancel upgrade on breaking changes without force', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        breakingChanges: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'medium',
      });

      await command.run([], {});

      expect(promptServiceMock.showWarning).toHaveBeenCalled();
      expect(promptServiceMock.showOutro).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade cancelled')
      );
    });

    it('should proceed with breaking changes when force is set', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        breakingChanges: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'medium',
      });
      promptServiceMock.confirm.mockResolvedValue(true);
      mockExecuteUpgrade.mockResolvedValue({
        success: true,
        changesApplied: 1,
        changesSkipped: 0,
        errors: [],
        warnings: [],
        plan: { changes: [], breakingChanges: [], currentVersion: '1.0.0', targetVersion: '1.1.0', estimatedRisk: 'medium', backupRequired: true },
        backupPath: '/backup',
      });
      mockGetUpgradeReport.mockResolvedValue('report');

      await command.run([], { force: true });

      expect(mockExecuteUpgrade).toHaveBeenCalledWith(
        expect.objectContaining({ force: true })
      );
    });

    it('should cancel upgrade when user declines confirmation', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'test', breaking: false }],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
      });
      promptServiceMock.confirm.mockResolvedValue(false);

      await command.run([], {});

      expect(promptServiceMock.showOutro).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade cancelled')
      );
    });

    it('should show success message on successful upgrade', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'test', breaking: false }],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
      });
      promptServiceMock.confirm.mockResolvedValue(true);
      mockExecuteUpgrade.mockResolvedValue({
        success: true,
        changesApplied: 1,
        changesSkipped: 0,
        errors: [],
        warnings: [],
        plan: { changes: [], breakingChanges: [], currentVersion: '1.0.0', targetVersion: '1.1.0', estimatedRisk: 'low', backupRequired: false },
        backupPath: null,
      });
      mockGetUpgradeReport.mockResolvedValue('report');

      await command.run([], {});

      expect(promptServiceMock.showSuccess).toHaveBeenCalled();
      expect(promptServiceMock.showOutro).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade finished')
      );
    });

    it('should show error message on failed upgrade', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'test', breaking: false }],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
      });
      promptServiceMock.confirm.mockResolvedValue(true);
      mockExecuteUpgrade.mockResolvedValue({
        success: false,
        changesApplied: 0,
        changesSkipped: 1,
        errors: ['Some error'],
        warnings: [],
        plan: { changes: [], breakingChanges: [], currentVersion: '1.0.0', targetVersion: '1.1.0', estimatedRisk: 'low', backupRequired: false },
        backupPath: null,
      });
      mockGetUpgradeReport.mockResolvedValue('report');

      await command.run([], {});

      expect(promptServiceMock.showError).toHaveBeenCalled();
    });

    it('should handle upgrade errors and exit', async () => {
      mockPlanUpgrade.mockRejectedValue(new Error('Upgrade failed'));

      await expect(command.run([], {})).rejects.toThrow('Upgrade failed');

      expect(promptServiceMock.showError).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade failed')
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockPlanUpgrade.mockRejectedValue('string error');

      await expect(command.run([], {})).rejects.toThrow('string error');

      expect(promptServiceMock.showError).toHaveBeenCalledWith(
        expect.stringContaining('string error')
      );
    });

    it('should use custom core path when provided', async () => {
      mockPlanUpgrade.mockResolvedValue({
        changes: [],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.0.0',
        estimatedRisk: 'low',
      });

      await command.run([], { core: '/custom/core' });

      expect(mockPlanUpgrade).toHaveBeenCalledWith(
        expect.objectContaining({ corePath: '/custom/core' })
      );
    });
  });

  describe('printUpgradePlan', () => {
    it('should print upgrade plan with changes', () => {
      const plan = {
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
        changes: [
          { type: 'add', sourcePath: '/s', targetPath: '/t', description: 'Add feature', breaking: false },
          { type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'Modify feature', breaking: false },
        ],
        breakingChanges: [],
      };

      (command as any).printUpgradePlan(plan);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade Plan')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Current Version:')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Target Version:')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Risk Level:')
      );
    });

    it('should print high risk level', () => {
      const plan = {
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
        estimatedRisk: 'high',
        changes: [],
        breakingChanges: [],
      };

      (command as any).printUpgradePlan(plan);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('HIGH')
      );
    });

    it('should print medium risk level', () => {
      const plan = {
        currentVersion: '1.0.0',
        targetVersion: '1.5.0',
        estimatedRisk: 'medium',
        changes: [],
        breakingChanges: [],
      };

      (command as any).printUpgradePlan(plan);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('MEDIUM')
      );
    });

    it('should show breaking changes count', () => {
      const plan = {
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
        estimatedRisk: 'high',
        changes: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        breakingChanges: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
      };

      (command as any).printUpgradePlan(plan);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Breaking Changes:')
      );
    });

    it('should show breaking indicator on changes', () => {
      const plan = {
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
        estimatedRisk: 'high',
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'breaking change', breaking: true }],
        breakingChanges: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'breaking change', breaking: true }],
      };

      (command as any).printUpgradePlan(plan);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BREAKING]')
      );
    });
  });

  describe('getChangeIcon', () => {
    it('should return + for add', () => {
      expect((command as any).getChangeIcon('add')).toBe('+');
    });

    it('should return ~ for modify', () => {
      expect((command as any).getChangeIcon('modify')).toBe('~');
    });

    it('should return - for remove', () => {
      expect((command as any).getChangeIcon('remove')).toBe('-');
    });

    it('should return » for migrate', () => {
      expect((command as any).getChangeIcon('migrate')).toBe('»');
    });

    it('should return ? for unknown type', () => {
      expect((command as any).getChangeIcon('unknown')).toBe('?');
    });
  });

  describe('getRiskColor', () => {
    it('should return high for high risk', () => {
      expect((command as any).getRiskColor('high')).toBe('high');
    });

    it('should return medium for medium risk', () => {
      expect((command as any).getRiskColor('medium')).toBe('medium');
    });

    it('should return low for unknown risk', () => {
      expect((command as any).getRiskColor('unknown')).toBe('low');
    });

    it('should return low for empty string', () => {
      expect((command as any).getRiskColor('')).toBe('low');
    });
  });

  describe('findCorePath', () => {
    it('should return satellite path', () => {
      expect((command as any).findCorePath('/some/path')).toBe('/some/path');
    });
  });

  describe('parseDryRun', () => {
    it('should return true', () => {
      expect(command.parseDryRun()).toBe(true);
    });
  });

  describe('parseForce', () => {
    it('should return true', () => {
      expect(command.parseForce()).toBe(true);
    });
  });

  describe('parseCore', () => {
    it('should return the value', () => {
      expect(command.parseCore('/custom/path')).toBe('/custom/path');
    });
  });

  describe('parseReport', () => {
    it('should return true', () => {
      expect(command.parseReport()).toBe(true);
    });
  });
});
