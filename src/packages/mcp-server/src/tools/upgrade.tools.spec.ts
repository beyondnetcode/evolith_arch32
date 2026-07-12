import type { McpTool } from '../mcp/tool.interface';
import { createUpgradeTools } from './upgrade.tools';

// The factory constructs a real `SatelliteUpgradeService` from
// `@beyondnet/evolith-core-domain`. We replace it with a double so the tests are
// hermetic (no git, no disk writes) and we can drive plan/apply behaviour and
// assert on the arguments each tool forwards to the service.
const mockPlanUpgrade = jest.fn();
const mockExecuteUpgrade = jest.fn();
const mockGetUpgradeReport = jest.fn();
const mockServiceCtor = jest.fn();

jest.mock(
  '@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service',
  () => ({
    SatelliteUpgradeService: jest.fn().mockImplementation((deps: unknown) => {
      mockServiceCtor(deps);
      return {
        planUpgrade: mockPlanUpgrade,
        executeUpgrade: mockExecuteUpgrade,
        getUpgradeReport: mockGetUpgradeReport,
      };
    }),
  }),
);

describe('createUpgradeTools', () => {
  const fsDouble = { readFile: jest.fn() } as unknown as never;
  const loggerDouble = { info: jest.fn() } as unknown as never;

  let planTool: McpTool;
  let applyTool: McpTool;

  beforeEach(() => {
    jest.clearAllMocks();
    const tools = createUpgradeTools(fsDouble, loggerDouble);
    [planTool, applyTool] = tools;
  });

  it('constructs the upgrade service with the injected file system and logger', () => {
    expect(mockServiceCtor).toHaveBeenCalledWith({ fileSystem: fsDouble, logger: loggerDouble });
  });

  it('returns exactly two tools with the expected schemas and scopes', () => {
    const tools = createUpgradeTools(fsDouble, loggerDouble);
    expect(tools).toHaveLength(2);

    expect(planTool.schema.name).toBe('evolith-upgrade-plan');
    expect(planTool.mutative).toBeFalsy();

    expect(applyTool.schema.name).toBe('evolith-upgrade-apply');
    expect(applyTool.mutative).toBe(true);
    expect(applyTool.scope).toBe('write');
  });

  describe('evolith-upgrade-plan (read)', () => {
    it('reports up-to-date when the plan has no changes (explicit paths)', async () => {
      const plan = { changes: [], breakingChanges: [] };
      mockPlanUpgrade.mockResolvedValue(plan);

      const out = (await planTool.execute({
        satellitePath: '/sat',
        corePath: '/core',
      })) as Record<string, unknown>;

      expect(mockPlanUpgrade).toHaveBeenCalledWith({ satellitePath: '/sat', corePath: '/core' });
      expect(out).toEqual({
        upToDate: true,
        plan,
        message: 'Satellite is already up to date',
      });
    });

    it('returns a dry-run summary when changes are planned (path/core aliases)', async () => {
      const plan = {
        changes: [{ id: 'a' }, { id: 'b' }],
        breakingChanges: [{ id: 'a' }],
      };
      mockPlanUpgrade.mockResolvedValue(plan);

      // `path` and `core` are the fallback aliases for satellitePath/corePath.
      const out = (await planTool.execute({ path: '/p', core: '/c' })) as Record<string, unknown>;

      expect(mockPlanUpgrade).toHaveBeenCalledWith({ satellitePath: '/p', corePath: '/c' });
      expect(out).toEqual({
        upToDate: false,
        dryRun: true,
        plan,
        breakingChanges: 1,
        message: 'Dry run complete — 2 change(s) planned, no changes applied',
      });
    });

    it('defaults satellitePath to cwd and corePath to satellitePath when args are empty', async () => {
      mockPlanUpgrade.mockResolvedValue({ changes: [], breakingChanges: [] });

      await planTool.execute({});

      expect(mockPlanUpgrade).toHaveBeenCalledWith({
        satellitePath: process.cwd(),
        corePath: process.cwd(),
      });
    });

    it('propagates service failures', async () => {
      mockPlanUpgrade.mockRejectedValue(new Error('plan failed'));
      await expect(planTool.execute({ satellitePath: '/sat' })).rejects.toThrow('plan failed');
    });
  });

  describe('evolith-upgrade-apply (mutative)', () => {
    it('applies the upgrade and returns the result and report', async () => {
      const result = { applied: true, files: 3 };
      const report = '# Upgrade report';
      mockExecuteUpgrade.mockResolvedValue(result);
      mockGetUpgradeReport.mockResolvedValue(report);

      const out = (await applyTool.execute({
        satellitePath: '/sat',
        corePath: '/core',
        force: true,
        skipBackup: true,
      })) as Record<string, unknown>;

      expect(mockExecuteUpgrade).toHaveBeenCalledWith({
        satellitePath: '/sat',
        corePath: '/core',
        force: true,
        skipBackup: true,
      });
      expect(mockGetUpgradeReport).toHaveBeenCalledWith(result);
      expect(out).toEqual({ result, report });
    });

    it('coerces missing force/skipBackup to false and defaults paths to cwd', async () => {
      const result = { applied: false };
      mockExecuteUpgrade.mockResolvedValue(result);
      mockGetUpgradeReport.mockResolvedValue('r');

      await applyTool.execute({});

      expect(mockExecuteUpgrade).toHaveBeenCalledWith({
        satellitePath: process.cwd(),
        corePath: process.cwd(),
        force: false,
        skipBackup: false,
      });
    });

    it('propagates service failures', async () => {
      mockExecuteUpgrade.mockRejectedValue(new Error('apply failed'));
      await expect(applyTool.execute({ satellitePath: '/sat' })).rejects.toThrow('apply failed');
    });
  });
});
