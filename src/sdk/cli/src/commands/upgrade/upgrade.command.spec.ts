import { UpgradeCommand } from './upgrade.command';
import { getChangeIcon, printUpgradePlan } from './upgrade.render';
import type { UpgradePlan } from '@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service';

jest.mock('@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service', () => ({
  // GT-673: the command also imports NO_FINGERPRINT_HINT from this module; keep
  // the real exports and replace only the service.
  ...jest.requireActual('@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service'),
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

// GT-673: plans carry the three classes; derive them from `changes` so the
// pre-existing fixtures keep their shape and gain the new fields in one place.
type Change = {
  type: string; sourcePath: string; targetPath: string; description: string; breaking: boolean;
  classification?: 'upstream-only' | 'local-only' | 'conflict'; reason?: 'no-fingerprint' | 'both-changed'; relativePath?: string;
};
function makePlan(partial: { changes?: Change[]; currentVersion?: string; targetVersion?: string; estimatedRisk?: string; manifestPresent?: boolean; breakingChanges?: Change[] }) {
  const changes = (partial.changes ?? []).map((c, i) => ({
    classification: 'upstream-only' as const,
    relativePath: `rulesets/file-${i}.json`,
    ...c,
  }));
  const upstreamOnly = changes.filter(c => c.classification === 'upstream-only');
  const localOnly = changes.filter(c => c.classification === 'local-only');
  const conflicts = changes.filter(c => c.classification === 'conflict');
  return {
    currentVersion: partial.currentVersion ?? '1.0.0',
    targetVersion: partial.targetVersion ?? '1.1.0',
    estimatedRisk: partial.estimatedRisk ?? 'low',
    changes,
    breakingChanges: partial.breakingChanges ?? [...upstreamOnly, ...conflicts].filter(c => c.breaking),
    backupRequired: upstreamOnly.length + conflicts.length > 0,
    upstreamOnly,
    localOnly,
    conflicts,
    manifestPresent: partial.manifestPresent ?? true,
  };
}
function makeResult(plan: ReturnType<typeof makePlan>, partial: Record<string, unknown> = {}) {
  return {
    success: true, changesApplied: 0, changesSkipped: 0, errors: [], warnings: [], backupPath: null,
    overwrittenFiles: [], baselinedFiles: [], plan, ...partial,
  };
}

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
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.0.0',
        estimatedRisk: 'low',
      }));

      await command.run([], {});

      expect(promptServiceMock.showIntro).toHaveBeenCalled();
      expect(mockPlanUpgrade).toHaveBeenCalled();
    });

    it('should show already up to date when no changes', async () => {
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.0.0',
        estimatedRisk: 'low',
      }));

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
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.0.0',
        estimatedRisk: 'low',
      }));

      await expect(command.run([], { dryRun: true })).resolves.not.toThrow();

      expect(SatelliteUpgradeService).toHaveBeenCalledWith(
        expect.objectContaining({
          fileSystem: expect.anything(),
          logger: expect.anything(),
        }),
      );
    });

    it('should run dry run when dryRun option is set', async () => {
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'test', breaking: false }],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
      }));
      mockExecuteUpgrade.mockResolvedValue({
        success: true,
        changesApplied: 0,
        changesSkipped: 1,
        errors: [],
        warnings: [],
        plan: { changes: [], breakingChanges: [], currentVersion: '1.0.0', targetVersion: '1.1.0', estimatedRisk: 'low', backupRequired: false },
        backupPath: null,
        overwrittenFiles: [],
        baselinedFiles: [],
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
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        breakingChanges: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'medium',
      }));

      await command.run([], {});

      expect(promptServiceMock.showWarning).toHaveBeenCalled();
      expect(promptServiceMock.showOutro).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade cancelled')
      );
    });

    it('should proceed with breaking changes when force is set', async () => {
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        breakingChanges: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'medium',
      }));
      promptServiceMock.confirm.mockResolvedValue(true);
      mockExecuteUpgrade.mockResolvedValue({
        success: true,
        changesApplied: 1,
        changesSkipped: 0,
        errors: [],
        warnings: [],
        plan: { changes: [], breakingChanges: [], currentVersion: '1.0.0', targetVersion: '1.1.0', estimatedRisk: 'medium', backupRequired: true },
        backupPath: '/backup',
        overwrittenFiles: [],
        baselinedFiles: [],
      });
      mockGetUpgradeReport.mockResolvedValue('report');

      await command.run([], { force: true });

      expect(mockExecuteUpgrade).toHaveBeenCalledWith(
        expect.objectContaining({ force: true })
      );
    });

    it('should cancel upgrade when user declines confirmation', async () => {
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'test', breaking: false }],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
      }));
      promptServiceMock.confirm.mockResolvedValue(false);

      await command.run([], {});

      expect(promptServiceMock.showOutro).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade cancelled')
      );
    });

    it('should show success message on successful upgrade', async () => {
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'test', breaking: false }],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
      }));
      promptServiceMock.confirm.mockResolvedValue(true);
      mockExecuteUpgrade.mockResolvedValue({
        success: true,
        changesApplied: 1,
        changesSkipped: 0,
        errors: [],
        warnings: [],
        plan: { changes: [], breakingChanges: [], currentVersion: '1.0.0', targetVersion: '1.1.0', estimatedRisk: 'low', backupRequired: false },
        backupPath: null,
        overwrittenFiles: [],
        baselinedFiles: [],
      });
      mockGetUpgradeReport.mockResolvedValue('report');

      await command.run([], {});

      expect(promptServiceMock.showSuccess).toHaveBeenCalled();
      expect(promptServiceMock.showOutro).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade finished')
      );
    });

    it('should show error message on failed upgrade', async () => {
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'test', breaking: false }],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
      }));
      promptServiceMock.confirm.mockResolvedValue(true);
      mockExecuteUpgrade.mockResolvedValue({
        success: false,
        changesApplied: 0,
        changesSkipped: 1,
        errors: ['Some error'],
        warnings: [],
        plan: { changes: [], breakingChanges: [], currentVersion: '1.0.0', targetVersion: '1.1.0', estimatedRisk: 'low', backupRequired: false },
        backupPath: null,
        overwrittenFiles: [],
        baselinedFiles: [],
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
      mockPlanUpgrade.mockResolvedValue(makePlan({
        changes: [],
        breakingChanges: [],
        currentVersion: '1.0.0',
        targetVersion: '1.0.0',
        estimatedRisk: 'low',
      }));

      await command.run([], { core: '/custom/core' });

      expect(mockPlanUpgrade).toHaveBeenCalledWith(
        expect.objectContaining({ corePath: '/custom/core' })
      );
    });
  });

  describe('printUpgradePlan', () => {
    it('should print upgrade plan with changes', () => {
      const plan = makePlan({
        currentVersion: '1.0.0',
        targetVersion: '1.1.0',
        estimatedRisk: 'low',
        changes: [
          { type: 'add', sourcePath: '/s', targetPath: '/t', description: 'Add feature', breaking: false },
          { type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'Modify feature', breaking: false },
        ],
        breakingChanges: [],
      });

      printUpgradePlan(plan as unknown as UpgradePlan);

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
      const plan = makePlan({
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
        estimatedRisk: 'high',
        changes: [],
        breakingChanges: [],
      });

      printUpgradePlan(plan as unknown as UpgradePlan);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('HIGH')
      );
    });

    it('should print medium risk level', () => {
      const plan = makePlan({
        currentVersion: '1.0.0',
        targetVersion: '1.5.0',
        estimatedRisk: 'medium',
        changes: [],
        breakingChanges: [],
      });

      printUpgradePlan(plan as unknown as UpgradePlan);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('MEDIUM')
      );
    });

    it('should show breaking changes count', () => {
      const plan = makePlan({
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
        estimatedRisk: 'high',
        changes: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
        breakingChanges: [{ type: 'modify', sourcePath: '/s', targetPath: '/t', description: 'breaking', breaking: true }],
      });

      printUpgradePlan(plan as unknown as UpgradePlan);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Breaking Changes:')
      );
    });

    it('should show breaking indicator on changes', () => {
      const plan = makePlan({
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
        estimatedRisk: 'high',
        changes: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'breaking change', breaking: true }],
        breakingChanges: [{ type: 'add', sourcePath: '/s', targetPath: '/t', description: 'breaking change', breaking: true }],
      });

      printUpgradePlan(plan as unknown as UpgradePlan);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BREAKING]')
      );
    });
  });

  describe('getChangeIcon', () => {
    it('should return + for add', () => {
      expect(getChangeIcon('add')).toBe('+');
    });

    it('should return ~ for modify', () => {
      expect(getChangeIcon('modify')).toBe('~');
    });

    it('should return - for remove', () => {
      expect(getChangeIcon('remove')).toBe('-');
    });

    it('should return » for migrate', () => {
      expect(getChangeIcon('migrate')).toBe('»');
    });

    it('should return ? for unknown type', () => {
      expect(getChangeIcon('unknown')).toBe('?');
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

  // GT-673: the upgrade tells a tenant edit from an upstream change and reports
  // the three classes on both surfaces; conflicts need --overwrite-local.
  describe('GT-673: classification, --overwrite-local, --accept-local', () => {
    const upstream: Change = { type: 'modify', sourcePath: '/c/a', targetPath: '/s/a', relativePath: 'rulesets/a.json', description: 'Update ruleset: a.json', breaking: false, classification: 'upstream-only' };
    const local: Change = { type: 'modify', sourcePath: '/c/b', targetPath: '/s/b', relativePath: 'rulesets/b.json', description: 'Local edit kept: b.json', breaking: false, classification: 'local-only' };
    const conflict: Change = { type: 'modify', sourcePath: '/c/c', targetPath: '/s/c', relativePath: 'rulesets/c.json', description: 'Conflict (both changed): c.json', breaking: false, classification: 'conflict', reason: 'both-changed' };

    const envelopeFromLog = () => JSON.parse(logSpy.mock.calls.map(c => String(c[0])).find(l => l.trim().startsWith('{'))!);

    it('--dry-run --format json is the divergence report: plan plus the three classes, nothing executed for real', async () => {
      const plan = makePlan({ changes: [upstream, local, conflict] });
      mockPlanUpgrade.mockResolvedValue(plan);
      mockExecuteUpgrade.mockResolvedValue(makeResult(plan, { changesSkipped: 3, warnings: ['Dry run mode - no changes were applied'] }));

      await command.run([], { dryRun: true, format: 'json' });

      expect(mockExecuteUpgrade).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
      const envelope = envelopeFromLog();
      expect(envelope.success).toBe(true);
      expect(envelope.data.dryRun).toBe(true);
      expect(envelope.data.divergence).toEqual({
        manifestPresent: true,
        upstreamOnly: ['rulesets/a.json'],
        localOnly: ['rulesets/b.json'],
        conflicts: [{ path: 'rulesets/c.json', reason: 'both-changed' }],
      });
      expect(envelope.data.plan.conflicts).toHaveLength(1);
      expect(envelope.data.plan.localOnly).toHaveLength(1);
      expect(envelope.data.plan.upstreamOnly).toHaveLength(1);
    });

    it('without --overwrite-local a plan with only local/conflict changes prompts for nothing and applies nothing', async () => {
      const plan = makePlan({ changes: [local, conflict] });
      mockPlanUpgrade.mockResolvedValue(plan);
      mockExecuteUpgrade.mockResolvedValue(makeResult(plan, { changesSkipped: 2 }));
      mockGetUpgradeReport.mockResolvedValue('report');

      await command.run([], {});

      expect(promptServiceMock.confirm).not.toHaveBeenCalled();
      expect(promptServiceMock.showInfo).toHaveBeenCalledWith(expect.stringContaining('Nothing to apply'));
      expect(mockExecuteUpgrade).toHaveBeenCalledWith(expect.objectContaining({ overwriteLocal: undefined }));
    });

    it('--overwrite-local names every file it will overwrite before asking, and forwards the flag', async () => {
      const plan = makePlan({ changes: [upstream, conflict] });
      mockPlanUpgrade.mockResolvedValue(plan);
      promptServiceMock.confirm.mockResolvedValue(true);
      mockExecuteUpgrade.mockResolvedValue(makeResult(plan, { changesApplied: 2, overwrittenFiles: ['rulesets/c.json'], backupPath: '/b' }));
      mockGetUpgradeReport.mockResolvedValue('report');

      await command.run([], { overwriteLocal: true });

      expect(promptServiceMock.showWarning).toHaveBeenCalledWith(expect.stringContaining('OVERWRITE 1 local file(s)'));
      expect(promptServiceMock.showWarning).toHaveBeenCalledWith(expect.stringContaining('rulesets/c.json'));
      expect(promptServiceMock.confirm).toHaveBeenCalledWith('Apply 2 change(s)?', true);
      expect(mockExecuteUpgrade).toHaveBeenCalledWith(expect.objectContaining({ overwriteLocal: true }));
    });

    it('--overwrite-local --format json: the envelope names the overwritten files', async () => {
      const plan = makePlan({ changes: [conflict] });
      mockPlanUpgrade.mockResolvedValue(plan);
      mockExecuteUpgrade.mockResolvedValue(makeResult(plan, { changesApplied: 1, overwrittenFiles: ['rulesets/c.json'] }));

      await command.run([], { overwriteLocal: true, format: 'json' });

      const envelope = envelopeFromLog();
      expect(envelope.data.overwrittenFiles).toEqual(['rulesets/c.json']);
      expect(envelope.data.divergence.conflicts).toEqual([{ path: 'rulesets/c.json', reason: 'both-changed' }]);
    });

    it('a breaking conflict does not block a run that will not apply it (no --overwrite-local, no --force)', async () => {
      const breakingConflict: Change = { ...conflict, breaking: true };
      const plan = makePlan({ changes: [upstream, breakingConflict] });
      mockPlanUpgrade.mockResolvedValue(plan);
      promptServiceMock.confirm.mockResolvedValue(true);
      mockExecuteUpgrade.mockResolvedValue(makeResult(plan, { changesApplied: 1, changesSkipped: 1 }));
      mockGetUpgradeReport.mockResolvedValue('report');

      await command.run([], {});

      expect(promptServiceMock.showOutro).not.toHaveBeenCalledWith(expect.stringContaining('Upgrade cancelled'));
      expect(mockExecuteUpgrade).toHaveBeenCalled();
    });

    it('--accept-local records the baseline through the service and copies nothing', async () => {
      const plan = makePlan({ changes: [{ ...conflict, reason: 'no-fingerprint' }], manifestPresent: false });
      mockPlanUpgrade.mockResolvedValue(plan);
      promptServiceMock.confirm.mockResolvedValue(true);
      mockExecuteUpgrade.mockResolvedValue(makeResult(plan, { baselinedFiles: ['rulesets/c.json'] }));

      await command.run([], { acceptLocal: true });

      expect(mockExecuteUpgrade).toHaveBeenCalledTimes(1);
      expect(mockExecuteUpgrade).toHaveBeenCalledWith(expect.objectContaining({ acceptLocal: true }));
      expect(promptServiceMock.showSuccess).toHaveBeenCalledWith(expect.stringContaining('Baseline recorded for 1 file(s)'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--accept-local'));
    });

    it('--accept-local --format json carries baselinedFiles in the envelope', async () => {
      const plan = makePlan({ changes: [{ ...conflict, reason: 'no-fingerprint' }], manifestPresent: false });
      mockPlanUpgrade.mockResolvedValue(plan);
      mockExecuteUpgrade.mockResolvedValue(makeResult(plan, { baselinedFiles: ['rulesets/c.json'] }));

      await command.run([], { acceptLocal: true, format: 'json' });

      const envelope = envelopeFromLog();
      expect(envelope.data.baselinedFiles).toEqual(['rulesets/c.json']);
      expect(envelope.data.divergence.manifestPresent).toBe(false);
      expect(promptServiceMock.confirm).not.toHaveBeenCalled();
    });

    it('printUpgradePlan prints the three classes and the no-fingerprint hint', () => {
      const plan = makePlan({ changes: [upstream, local, { ...conflict, reason: 'no-fingerprint' }], manifestPresent: false });

      printUpgradePlan(plan as unknown as UpgradePlan);

      const printed = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(printed).toContain('Upstream-only (applied): 1');
      expect(printed).toContain('Local-only (kept, never applied): 1');
      expect(printed).toContain('Conflicts (not applied without --overwrite-local): 1');
      expect(printed).toContain('[no fingerprint]');
      expect(printed).toContain('evolith upgrade --accept-local');
    });

    it('parseOverwriteLocal / parseAcceptLocal return true', () => {
      expect(command.parseOverwriteLocal()).toBe(true);
      expect(command.parseAcceptLocal()).toBe(true);
    });
  });
});
