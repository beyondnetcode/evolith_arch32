import { UpgradeCommand } from './upgrade.command';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  note: jest.fn(),
  confirm: jest.fn(),
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
  chalkFn.bold = (str: string) => str;
  chalkFn.yellow = (str: string) => str;
  chalkFn.blue = (str: string) => str;
  chalkFn.cyan = (str: string) => str;
  chalkFn.bgBlueBright = { white: { bold: (str: string) => str } };
  return chalkFn;
});

jest.mock('../../core/upgrade/satellite-upgrade.service', () => ({
  SatelliteUpgradeService: jest.fn().mockImplementation(() => ({
    planUpgrade: jest.fn(),
    executeUpgrade: jest.fn(),
    getUpgradeReport: jest.fn(),
  })),
}));

import * as p from '@clack/prompts';
import { SatelliteUpgradeService } from '../../core/upgrade/satellite-upgrade.service';

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

  beforeEach(() => {
    command = new UpgradeCommand();
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

      expect(p.intro).toHaveBeenCalled();
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

      expect(p.log.info).toHaveBeenCalledWith(
        expect.stringContaining('already up to date')
      );
      expect(p.outro).toHaveBeenCalled();
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
      expect(p.log.info).toHaveBeenCalledWith(
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

      expect(p.log.warn).toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalledWith(
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
      (p.confirm as jest.Mock).mockResolvedValue(true);
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
      (p.confirm as jest.Mock).mockResolvedValue(false);

      await command.run([], {});

      expect(p.outro).toHaveBeenCalledWith(
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
      (p.confirm as jest.Mock).mockResolvedValue(true);
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

      expect(p.log.success).toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalledWith(
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
      (p.confirm as jest.Mock).mockResolvedValue(true);
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

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should handle upgrade errors and exit', async () => {
      mockPlanUpgrade.mockRejectedValue(new Error('Upgrade failed'));

      await command.run([], {});

      expect(p.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade failed')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error exceptions', async () => {
      mockPlanUpgrade.mockRejectedValue('string error');

      await command.run([], {});

      expect(p.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade failed')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
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
