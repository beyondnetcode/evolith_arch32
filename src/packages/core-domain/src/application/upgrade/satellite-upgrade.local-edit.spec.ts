/**
 * GT-673 — `evolith upgrade` cannot tell a tenant's edit from an upstream
 * change, and overwrites it.
 *
 * These tests drive the REAL scaffold path (`InitializeProjectUseCase`) and the
 * REAL upgrade service against a temporary directory, with no mocks in between:
 * a satellite is scaffolded, a scaffolded file is edited by the tenant, the Core
 * moves, and the upgrade runs. The one thing that matters is the last line of
 * each test — the tenant's edit is still on disk afterwards.
 *
 * Before the fix every content difference was a `modify` and `applyChange`
 * copied the Core file over the satellite's unconditionally; nothing recorded
 * what had been scaffolded, so there was nothing to compare against. Run against
 * that code, both survival assertions go RED.
 */
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { DirEntry, IFileSystem, ILogger } from '../../domain/interfaces';
import { InitializeProjectUseCase } from '../use-cases/initialize-project.use-case';
import { SatelliteUpgradeService } from './satellite-upgrade.service';
import { SCAFFOLD_MANIFEST_RELATIVE_PATH, sha256Of } from './scaffold-manifest';

/** Minimal real-filesystem adapter so the scaffold and the upgrade touch actual files. */
class NodeFileSystem implements IFileSystem {
  readFile(p: string): Promise<string> {
    return fsp.readFile(p, 'utf8');
  }
  readFileBuffer(p: string): Promise<Buffer> {
    return fsp.readFile(p);
  }
  writeFile(p: string, content: string): Promise<void> {
    return fsp.writeFile(p, content);
  }
  async exists(p: string): Promise<boolean> {
    return fs.existsSync(p);
  }
  existsSync(p: string): boolean {
    return fs.existsSync(p);
  }
  async readJson<T = unknown>(p: string): Promise<T> {
    return JSON.parse(await fsp.readFile(p, 'utf8')) as T;
  }
  async writeJson(p: string, content: unknown): Promise<void> {
    await fsp.writeFile(p, JSON.stringify(content, null, 2));
  }
  async mkdir(p: string): Promise<void> {
    await fsp.mkdir(p, { recursive: true });
  }
  async readdir(p: string): Promise<DirEntry[]> {
    const entries = await fsp.readdir(p, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      isDirectory: () => e.isDirectory(),
      isFile: () => e.isFile(),
    }));
  }
  readdirNames(p: string): Promise<string[]> {
    return fsp.readdir(p);
  }
  async copy(src: string, dest: string): Promise<void> {
    await fsp.copyFile(src, dest);
  }
  async ensureDir(p: string): Promise<void> {
    await fsp.mkdir(p, { recursive: true });
  }
  async ensureFile(p: string): Promise<void> {
    await fsp.writeFile(p, '', { flag: 'a' });
  }
  async stat(p: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    const s = await fsp.stat(p);
    return { isDirectory: () => s.isDirectory(), isFile: () => s.isFile() };
  }
  async remove(p: string): Promise<void> {
    await fsp.rm(p, { recursive: true, force: true });
  }
}

const silentLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

const catalogLoader = {
  loadRuntimeCatalog: () => [{ id: 'typescript' }],
  getMonorepoOptions: () => [{ id: 'nx' }],
  getArchitecturePatterns: () => [{ id: 'clean' }],
} as any;

function initInput(features: string[]) {
  return {
    name: 'sat',
    runtime: 'typescript',
    monorepo: 'nx',
    architecture: 'clean',
    database: 'postgres',
    apiProtocol: 'rest',
    ciCd: 'github-actions',
    observability: 'otel',
    features,
    agents: [],
  } as any;
}

/** A Core checkout with a package.json version and a `src/rulesets` corpus. */
async function writeCore(corePath: string, version: string, rulesets: Record<string, unknown>): Promise<void> {
  await fsp.mkdir(corePath, { recursive: true });
  await fsp.writeFile(path.join(corePath, 'package.json'), JSON.stringify({ name: 'core', version }));
  for (const [relative, content] of Object.entries(rulesets)) {
    const target = path.join(corePath, 'src', 'rulesets', relative);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, JSON.stringify(content, null, 2));
  }
}

describe('GT-673: a tenant edit to a scaffolded file survives `evolith upgrade`', () => {
  let workdir: string;
  let corePath: string;
  let satellitePath: string;
  let fileSystem: NodeFileSystem;
  let service: SatelliteUpgradeService;

  beforeEach(async () => {
    workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-gt-673-')));
    corePath = path.join(workdir, 'core');
    satellitePath = path.join(workdir, 'sat');
    fileSystem = new NodeFileSystem();
    service = new SatelliteUpgradeService({ fileSystem, logger: silentLogger });
  });

  afterEach(() => {
    fs.rmSync(workdir, { recursive: true, force: true });
  });

  it('init-scaffolded ruleset: the tenant tightens it, the Core moves, the edit is still there after upgrade', async () => {
    // Scaffold — `acl` makes init write rulesets/acl/anti-corruption-layer.rules.json.
    const init = new InitializeProjectUseCase(fileSystem, catalogLoader);
    const initResult = await init.execute(initInput(['acl']), workdir);
    expect(initResult.success).toBe(true);

    const aclRelative = path.join('rulesets', 'acl', 'anti-corruption-layer.rules.json');
    const aclFile = path.join(satellitePath, aclRelative);
    // Read, not exists-then-write: init must have scaffolded the Core's content here.
    expect(JSON.parse(await fsp.readFile(aclFile, 'utf8'))).toMatchObject({ version: '1.0.0' });

    // The tenant tightens the scaffolded ruleset.
    const tenantEdit = JSON.stringify({ version: '1.0.0', principles: ['no-shared-db'], maxCoupling: 2 }, null, 2);
    await fsp.writeFile(aclFile, tenantEdit);

    // Upstream moves the same file.
    await writeCore(corePath, '1.5.0', {
      'acl/anti-corruption-layer.rules.json': { version: '1.5.0', principles: ['upstream-principle'] },
    });

    // `anti-corruption` is a breaking path, so --force is needed to get past the
    // breaking gate. --force is NOT --overwrite-local: it must not cost the edit.
    const result = await service.executeUpgrade({ satellitePath, corePath, force: true });

    // THE assertion of the gap: the tenant's edit is still on disk.
    expect(await fsp.readFile(aclFile, 'utf8')).toBe(tenantEdit);

    // And the upgrade said why it did not touch it.
    const conflict = result.plan.conflicts.find((c) => c.relativePath === 'rulesets/acl/anti-corruption-layer.rules.json');
    expect(conflict).toBeDefined();
    expect(conflict!.classification).toBe('conflict');
    expect(conflict!.reason).toBe('both-changed');
    expect(result.overwrittenFiles).toEqual([]);
    expect(result.changesApplied).toBe(0);
  });

  it('upgrade-scaffolded ruleset: the first upgrade copies it, the tenant edits it, the second upgrade preserves it and still applies the untouched file', async () => {
    const init = new InitializeProjectUseCase(fileSystem, catalogLoader);
    expect((await init.execute(initInput([]), workdir)).success).toBe(true);

    // Core 1.4.0 ships two non-breaking rulesets; the first upgrade adds both.
    await writeCore(corePath, '1.4.0', {
      'sdlc/review-thresholds.rules.json': { version: '1.4.0', minReviewers: 1 },
      'sdlc/naming.rules.json': { version: '1.4.0', pattern: 'kebab' },
    });
    const first = await service.executeUpgrade({ satellitePath, corePath });
    expect(first.success).toBe(true);
    expect(first.changesApplied).toBe(2);

    const thresholdsFile = path.join(satellitePath, 'rulesets', 'sdlc', 'review-thresholds.rules.json');
    const namingFile = path.join(satellitePath, 'rulesets', 'sdlc', 'naming.rules.json');

    // The tenant tightens the threshold.
    const tenantEdit = JSON.stringify({ version: '1.4.0', minReviewers: 3 }, null, 2);
    await fsp.writeFile(thresholdsFile, tenantEdit);

    // Core 1.5.0 moves both files.
    await writeCore(corePath, '1.5.0', {
      'sdlc/review-thresholds.rules.json': { version: '1.5.0', minReviewers: 2 },
      'sdlc/naming.rules.json': { version: '1.5.0', pattern: 'kebab-case' },
    });
    const second = await service.executeUpgrade({ satellitePath, corePath });

    // THE assertion of the gap: the tenant's edit is still on disk...
    expect(await fsp.readFile(thresholdsFile, 'utf8')).toBe(tenantEdit);
    // ...while the file the tenant never touched did move with upstream.
    expect(JSON.parse(await fsp.readFile(namingFile, 'utf8'))).toEqual({ version: '1.5.0', pattern: 'kebab-case' });

    expect(second.plan.upstreamOnly.map((c) => c.relativePath)).toEqual(['rulesets/sdlc/naming.rules.json']);
    expect(second.plan.conflicts.map((c) => c.relativePath)).toEqual(['rulesets/sdlc/review-thresholds.rules.json']);
    expect(second.plan.localOnly).toEqual([]);
    expect(second.changesApplied).toBe(1);
    expect(second.changesSkipped).toBe(1);
    expect(second.overwrittenFiles).toEqual([]);
  });

  it('every scaffold path leaves a fingerprint: init writes the manifest and upgrade keeps it current', async () => {
    const init = new InitializeProjectUseCase(fileSystem, catalogLoader);
    expect((await init.execute(initInput(['acl']), workdir)).success).toBe(true);

    const manifestPath = path.join(satellitePath, SCAFFOLD_MANIFEST_RELATIVE_PATH);
    expect(fs.existsSync(manifestPath)).toBe(true);
    const afterInit = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
    expect(afterInit.schemaVersion).toBe(1);
    expect(typeof afterInit.coreVersion).toBe('string');
    expect(typeof afterInit.generatedAt).toBe('string');
    const aclEntry = afterInit.files['rulesets/acl/anti-corruption-layer.rules.json'];
    expect(aclEntry).toBeDefined();
    expect(aclEntry.sha256).toBe(sha256Of(await fsp.readFile(path.join(satellitePath, 'rulesets/acl/anti-corruption-layer.rules.json'), 'utf8')));
    expect(afterInit.files['evolith.yaml']).toBeDefined();

    await writeCore(corePath, '1.5.0', {
      'sdlc/naming.rules.json': { version: '1.5.0', pattern: 'kebab-case' },
    });
    const result = await service.executeUpgrade({ satellitePath, corePath });
    expect(result.changesApplied).toBe(1);

    const afterUpgrade = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
    expect(afterUpgrade.coreVersion).toBe('1.5.0');
    expect(afterUpgrade.files['rulesets/sdlc/naming.rules.json']).toEqual({
      sha256: sha256Of(await fsp.readFile(path.join(corePath, 'src/rulesets/sdlc/naming.rules.json'), 'utf8')),
      coreVersion: '1.5.0',
    });
    // Entries init wrote are kept — upgrade merges, it does not replace.
    expect(afterUpgrade.files['rulesets/acl/anti-corruption-layer.rules.json']).toEqual(aclEntry);
  });

  it('--overwrite-local is the only way a conflict is applied, and the result names the file', async () => {
    const init = new InitializeProjectUseCase(fileSystem, catalogLoader);
    expect((await init.execute(initInput([]), workdir)).success).toBe(true);

    await writeCore(corePath, '1.4.0', { 'sdlc/review-thresholds.rules.json': { minReviewers: 1 } });
    await service.executeUpgrade({ satellitePath, corePath });

    const thresholdsFile = path.join(satellitePath, 'rulesets', 'sdlc', 'review-thresholds.rules.json');
    await fsp.writeFile(thresholdsFile, JSON.stringify({ minReviewers: 3 }));
    await writeCore(corePath, '1.5.0', { 'sdlc/review-thresholds.rules.json': { minReviewers: 2 } });

    const result = await service.executeUpgrade({ satellitePath, corePath, overwriteLocal: true });

    expect(JSON.parse(await fsp.readFile(thresholdsFile, 'utf8'))).toEqual({ minReviewers: 2 });
    expect(result.overwrittenFiles).toEqual(['rulesets/sdlc/review-thresholds.rules.json']);
    expect(result.changesApplied).toBe(1);
    // A backup was taken before the overwrite (createBackup behaviour is kept).
    expect(result.backupPath).not.toBeNull();
  });

  it('a legacy satellite with no manifest is fail-closed (conflict/no-fingerprint), and --accept-local baselines it without copying', async () => {
    // A satellite that predates the manifest: evolith.yaml plus a ruleset that
    // differs from the Core's, and no `.evolith/scaffold-manifest.json`.
    await fsp.mkdir(path.join(satellitePath, 'rulesets', 'sdlc'), { recursive: true });
    await fsp.writeFile(path.join(satellitePath, 'evolith.yaml'), JSON.stringify({ coreRef: { version: '1.3.0' } }));
    const legacyContent = JSON.stringify({ minReviewers: 3 });
    const thresholdsFile = path.join(satellitePath, 'rulesets', 'sdlc', 'review-thresholds.rules.json');
    await fsp.writeFile(thresholdsFile, legacyContent);
    await writeCore(corePath, '1.5.0', { 'sdlc/review-thresholds.rules.json': { minReviewers: 2 } });

    const plan = await service.planUpgrade({ satellitePath, corePath });
    expect(plan.manifestPresent).toBe(false);
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0].reason).toBe('no-fingerprint');

    const result = await service.executeUpgrade({ satellitePath, corePath });
    expect(await fsp.readFile(thresholdsFile, 'utf8')).toBe(legacyContent);
    expect(result.changesApplied).toBe(0);

    // --accept-local: record the baseline, copy nothing.
    const baselined = await service.executeUpgrade({ satellitePath, corePath, acceptLocal: true });
    expect(baselined.baselinedFiles).toEqual(['rulesets/sdlc/review-thresholds.rules.json']);
    expect(await fsp.readFile(thresholdsFile, 'utf8')).toBe(legacyContent);
    expect(fs.existsSync(path.join(satellitePath, SCAFFOLD_MANIFEST_RELATIVE_PATH))).toBe(true);

    // With a baseline the divergence is now a known local-only change, so a
    // plain upgrade reports it and still does not touch it.
    const afterBaseline = await service.planUpgrade({ satellitePath, corePath });
    expect(afterBaseline.manifestPresent).toBe(true);
    expect(afterBaseline.conflicts).toEqual([]);
    expect(afterBaseline.localOnly.map((c) => c.relativePath)).toEqual(['rulesets/sdlc/review-thresholds.rules.json']);
  });
});
