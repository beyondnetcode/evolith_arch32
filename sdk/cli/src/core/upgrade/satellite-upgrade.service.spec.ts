import { SatelliteUpgradeService, UpgradeOptions, UpgradeChange } from './satellite-upgrade.service';

// ── mocks ──────────────────────────────────────────────────────────────────────

const mockFs = {
  exists:       jest.fn(),
  readFile:     jest.fn(),
  readJson:     jest.fn(),
  writeFile:    jest.fn(),
  writeJson:    jest.fn(),
  ensureDir:    jest.fn(),
  readdirNames: jest.fn(),
  stat:         jest.fn(),
  existsSync:   jest.fn(),
};

const mockLogger = {
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../abstractions', () => ({
  getContainer: jest.fn(() => ({
    createFileSystem: () => mockFs,
    createLogger:     () => mockLogger,
  })),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function makeOpts(overrides: Partial<UpgradeOptions> = {}): UpgradeOptions {
  return {
    satellitePath: '/satellite',
    corePath:      '/core',
    ...overrides,
  };
}

function svc() { return new SatelliteUpgradeService({ fileSystem: mockFs }); }

beforeEach(() => {
  jest.clearAllMocks();
  mockFs.exists.mockResolvedValue(false);
  mockFs.ensureDir.mockResolvedValue(undefined);
  mockFs.writeFile.mockResolvedValue(undefined);
  mockFs.writeJson.mockResolvedValue(undefined);
  mockFs.readdirNames.mockResolvedValue([]);
  mockFs.stat.mockResolvedValue({ isDirectory: () => false });
});

// ── planUpgrade ───────────────────────────────────────────────────────────────

describe('planUpgrade', () => {
  it('returns unknown versions when version files do not exist', async () => {
    const plan = await svc().planUpgrade(makeOpts());
    expect(plan.currentVersion).toBe('unknown');
    expect(plan.targetVersion).toBe('unknown');
  });

  it('reads satellite version from evolith.yaml', async () => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p.includes('evolith.yaml')));
    mockFs.readFile.mockResolvedValue(JSON.stringify({ coreRef: { version: '1.2.3' } }));
    const plan = await svc().planUpgrade(makeOpts());
    expect(plan.currentVersion).toBe('1.2.3');
  });

  it('reads core version from package.json', async () => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p.includes('package.json')));
    mockFs.readJson.mockResolvedValue({ version: '2.0.0' });
    const plan = await svc().planUpgrade(makeOpts());
    expect(plan.targetVersion).toBe('2.0.0');
  });

  it('returns estimatedRisk=low when no breaking changes', async () => {
    const plan = await svc().planUpgrade(makeOpts());
    expect(plan.estimatedRisk).toBe('low');
  });

  it('returns backupRequired=false when no changes found', async () => {
    const plan = await svc().planUpgrade(makeOpts());
    expect(plan.backupRequired).toBe(false);
  });

  it('sets backupRequired=true when changes exist', async () => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets'));
    mockFs.readdirNames.mockResolvedValue(['new-ruleset.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    const plan = await svc().planUpgrade(makeOpts());
    expect(plan.backupRequired).toBe(true);
  });

  it('detects add change when file exists in core but not satellite', async () => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets'));
    mockFs.readdirNames.mockResolvedValue(['custom.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    const plan = await svc().planUpgrade(makeOpts());
    expect(plan.changes[0].type).toBe('add');
  });

  it('detects modify change when file content differs', async () => {
    mockFs.exists.mockImplementation(() => Promise.resolve(true));
    mockFs.readdirNames.mockResolvedValue(['existing.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    mockFs.readFile.mockImplementation((p: string) =>
      Promise.resolve(p.includes('/core/') ? '{"v":2}' : '{"v":1}'));
    const plan = await svc().planUpgrade(makeOpts());
    const modifyChange = plan.changes.find(c => c.type === 'modify');
    expect(modifyChange).toBeDefined();
  });
});

// ── executeUpgrade ────────────────────────────────────────────────────────────

describe('executeUpgrade', () => {
  it('returns up-to-date result when no changes', async () => {
    const result = await svc().executeUpgrade(makeOpts());
    expect(result.success).toBe(true);
    expect(result.changesApplied).toBe(0);
    expect(result.warnings).toContain('Satellite is already up to date');
  });

  it('blocks on breaking changes without --force', async () => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets'));
    mockFs.readdirNames.mockResolvedValue(['governance.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    const result = await svc().executeUpgrade(makeOpts());
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Breaking changes detected');
  });

  it('proceeds with breaking changes when --force is set', async () => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets' || p.endsWith('governance.json')));
    mockFs.readdirNames.mockResolvedValue(['governance.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    mockFs.readFile.mockResolvedValue('{"rules":[]}');
    const result = await svc().executeUpgrade(makeOpts({ force: true, skipBackup: true }));
    expect(result.errors).toHaveLength(0);
  });

  it('returns dry-run result without writing files', async () => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets'));
    mockFs.readdirNames.mockResolvedValue(['new-rule.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    const result = await svc().executeUpgrade(makeOpts({ dryRun: true }));
    expect(result.success).toBe(true);
    expect(result.changesApplied).toBe(0);
    expect(result.warnings).toContain('Dry run mode - no changes were applied');
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it('creates a backup before applying changes', async () => {
    // core/rulesets exists, file exists only in core (not satellite)
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets' || p === '/core/rulesets/new-rule.json'));
    mockFs.readdirNames.mockResolvedValue(['new-rule.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    mockFs.readFile.mockResolvedValue('{}');
    const result = await svc().executeUpgrade(makeOpts());
    expect(result.backupPath).not.toBeNull();
    expect(mockFs.ensureDir).toHaveBeenCalledWith(
      expect.stringContaining('.evolith-backup-'),
    );
  });

  it('skips backup when skipBackup=true', async () => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets' || p === '/core/rulesets/new-rule.json'));
    mockFs.readdirNames.mockResolvedValue(['new-rule.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    mockFs.readFile.mockResolvedValue('{}');
    const result = await svc().executeUpgrade(makeOpts({ skipBackup: true }));
    expect(result.backupPath).toBeNull();
  });

  it('records errors for failed changes and hints to backup', async () => {
    // File exists only in core; readFile throws to simulate apply failure
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets' || p === '/core/rulesets/new-rule.json'));
    mockFs.readdirNames.mockResolvedValue(['new-rule.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    mockFs.readFile.mockRejectedValue(new Error('disk full'));
    const result = await svc().executeUpgrade(makeOpts());
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('disk full');
    expect(result.warnings.some(w => w.includes('Backup available'))).toBe(true);
  });
});

// ── getUpgradeReport ──────────────────────────────────────────────────────────

describe('getUpgradeReport', () => {
  const base = {
    success: true,
    changesApplied: 3,
    changesSkipped: 0,
    backupPath: null as string | null,
    errors: [] as string[],
    warnings: [] as string[],
    plan: {
      currentVersion: '1.0.0',
      targetVersion: '1.1.0',
      estimatedRisk: 'low' as const,
      changes: [] as UpgradeChange[],
      breakingChanges: [] as UpgradeChange[],
      backupRequired: false,
    },
  };

  it('includes version info and change counts', async () => {
    const report = await svc().getUpgradeReport(base);
    expect(report).toContain('1.0.0');
    expect(report).toContain('1.1.0');
    expect(report).toContain('Changes Applied: 3');
  });

  it('includes success message when success=true', async () => {
    expect(await svc().getUpgradeReport(base)).toContain('✓ Upgrade completed successfully');
  });

  it('includes failure message when success=false', async () => {
    expect(await svc().getUpgradeReport({ ...base, success: false }))
      .toContain('✗ Upgrade completed with errors');
  });

  it('includes backup path when present', async () => {
    const report = await svc().getUpgradeReport({ ...base, backupPath: '/bkp' });
    expect(report).toContain('/bkp');
  });

  it('lists warnings with ⚠ prefix', async () => {
    const report = await svc().getUpgradeReport({ ...base, warnings: ['be careful'] });
    expect(report).toContain('⚠ be careful');
  });

  it('lists errors with ✗ prefix', async () => {
    const report = await svc().getUpgradeReport({
      ...base, success: false, errors: ['something broke'],
    });
    expect(report).toContain('✗ something broke');
  });
});

// ── isBreakingChange patterns ─────────────────────────────────────────────────

describe('breaking change detection', () => {
  const breakingFiles = [
    'inheritance.json',
    'anti-corruption.json',
    'open-core-boundary.json',
    'governance.json',
  ];
  const nonBreakingFiles = ['custom-rule.json', 'linting.json'];

  it.each(breakingFiles)('marks %s as breaking', async (file) => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets'));
    mockFs.readdirNames.mockResolvedValue([file]);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    const plan = await svc().planUpgrade(makeOpts());
    expect(plan.breakingChanges).toHaveLength(1);
  });

  it.each(nonBreakingFiles)('marks %s as non-breaking', async (file) => {
    mockFs.exists.mockImplementation((p: string) =>
      Promise.resolve(p === '/core/rulesets'));
    mockFs.readdirNames.mockResolvedValue([file]);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
    const plan = await svc().planUpgrade(makeOpts());
    expect(plan.breakingChanges).toHaveLength(0);
  });
});
