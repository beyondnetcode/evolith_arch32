/**
 * GT-673 -- `upgrade` against the real file system, through the real `init`.
 *
 * The unit spec mocks the service and asserts the wiring; this one asserts the
 * outcome the gap is about on the CLI surface: a satellite scaffolded by
 * `evolith init`, a scaffolded file edited by the tenant, the Core moves, and
 * `evolith upgrade --format json` (a) reports the three classes in the ADR-0073
 * envelope, (b) leaves the edit on disk, and (c) overwrites it only under
 * `--overwrite-local`, naming the file.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
import { InitCommand } from '../init/init.command';
import { UpgradeCommand } from './upgrade.command';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

function writeCore(corePath: string, version: string, rulesets: Record<string, unknown>): void {
  fs.mkdirSync(corePath, { recursive: true });
  fs.writeFileSync(path.join(corePath, 'package.json'), JSON.stringify({ name: 'core', version }));
  for (const [relative, content] of Object.entries(rulesets)) {
    const target = path.join(corePath, 'src', 'rulesets', relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(content, null, 2));
  }
}

describe('upgrade on a real file system (GT-673)', () => {
  let workdir: string;
  let originalCwd: string;
  let corePath: string;
  let satellitePath: string;
  let logSpy: jest.SpyInstance;

  const lastEnvelope = () => {
    const line = [...logSpy.mock.calls].reverse().map(c => String(c[0])).find(l => l.trim().startsWith('{'));
    return JSON.parse(line!);
  };

  const upgrade = async (opts: Record<string, unknown>) => {
    logSpy.mockClear();
    const command = new UpgradeCommand(new PromptService());
    await command.executeCommand([], { satellite: satellitePath, core: corePath, format: 'json', ...opts } as never);
    return lastEnvelope();
  };

  beforeEach(async () => {
    originalCwd = process.cwd();
    workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-upgrade-real-')));
    process.chdir(workdir);
    corePath = path.join(workdir, 'core');
    satellitePath = path.join(workdir, 'sat');
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const init = new InitCommand(
      new CatalogLoader(),
      new NodeFileSystemProvider().createFileSystem() as never,
      new PromptService(),
    );
    await init.executeCommand(['sat'], { name: 'sat', yes: true, format: 'json' } as never);
    expect(fs.existsSync(path.join(satellitePath, 'evolith.yaml'))).toBe(true);
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workdir, { recursive: true, force: true });
  });

  it('init leaves a scaffold manifest, and upgrade reports the three classes in the envelope', async () => {
    const manifestPath = path.join(satellitePath, '.evolith', 'scaffold-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.files['evolith.yaml']).toBeDefined();

    writeCore(corePath, '1.4.0', {
      'sdlc/review-thresholds.rules.json': { minReviewers: 1 },
      'sdlc/naming.rules.json': { pattern: 'kebab' },
    });

    // First upgrade: two adds, both upstream-only.
    const first = await upgrade({});
    expect(first.success).toBe(true);
    expect(first.meta.command).toBe('evolith upgrade');
    expect(first.data.divergence.upstreamOnly.sort()).toEqual(['rulesets/sdlc/naming.rules.json', 'rulesets/sdlc/review-thresholds.rules.json']);
    expect(first.data.divergence.localOnly).toEqual([]);
    expect(first.data.divergence.conflicts).toEqual([]);
    expect(first.data.changesApplied).toBe(2);

    // The tenant tightens one file; the Core moves both.
    const thresholdsFile = path.join(satellitePath, 'rulesets', 'sdlc', 'review-thresholds.rules.json');
    const tenantEdit = JSON.stringify({ minReviewers: 3 });
    fs.writeFileSync(thresholdsFile, tenantEdit);
    writeCore(corePath, '1.5.0', {
      'sdlc/review-thresholds.rules.json': { minReviewers: 2 },
      'sdlc/naming.rules.json': { pattern: 'kebab-case' },
    });

    // --dry-run is the divergence report: the three classes, nothing written.
    const dry = await upgrade({ dryRun: true });
    expect(dry.data.dryRun).toBe(true);
    expect(dry.data.divergence).toEqual({
      manifestPresent: true,
      upstreamOnly: ['rulesets/sdlc/naming.rules.json'],
      localOnly: [],
      conflicts: [{ path: 'rulesets/sdlc/review-thresholds.rules.json', reason: 'both-changed' }],
    });
    expect(dry.data.plan.conflicts[0].classification).toBe('conflict');
    expect(fs.readFileSync(thresholdsFile, 'utf8')).toBe(tenantEdit);

    // A plain upgrade applies the upstream-only file and keeps the edit.
    const second = await upgrade({});
    expect(second.data.changesApplied).toBe(1);
    expect(second.data.overwrittenFiles).toEqual([]);
    expect(fs.readFileSync(thresholdsFile, 'utf8')).toBe(tenantEdit);
    expect(JSON.parse(fs.readFileSync(path.join(satellitePath, 'rulesets', 'sdlc', 'naming.rules.json'), 'utf8'))).toEqual({ pattern: 'kebab-case' });

    // Only --overwrite-local takes the Core's version, and it says which file.
    const third = await upgrade({ overwriteLocal: true });
    expect(third.data.overwrittenFiles).toEqual(['rulesets/sdlc/review-thresholds.rules.json']);
    expect(JSON.parse(fs.readFileSync(thresholdsFile, 'utf8'))).toEqual({ minReviewers: 2 });
  });

  it('--accept-local records the baseline for a legacy satellite and copies nothing', async () => {
    // Simulate a satellite scaffolded before the manifest existed.
    fs.rmSync(path.join(satellitePath, '.evolith'), { recursive: true, force: true });
    fs.mkdirSync(path.join(satellitePath, 'rulesets', 'sdlc'), { recursive: true });
    const thresholdsFile = path.join(satellitePath, 'rulesets', 'sdlc', 'review-thresholds.rules.json');
    const legacy = JSON.stringify({ minReviewers: 3 });
    fs.writeFileSync(thresholdsFile, legacy);
    writeCore(corePath, '1.5.0', { 'sdlc/review-thresholds.rules.json': { minReviewers: 2 } });

    const dry = await upgrade({ dryRun: true });
    expect(dry.data.divergence.manifestPresent).toBe(false);
    expect(dry.data.divergence.conflicts).toEqual([{ path: 'rulesets/sdlc/review-thresholds.rules.json', reason: 'no-fingerprint' }]);

    const plain = await upgrade({});
    expect(plain.data.changesApplied).toBe(0);
    expect(fs.readFileSync(thresholdsFile, 'utf8')).toBe(legacy);

    const baselined = await upgrade({ acceptLocal: true });
    expect(baselined.data.baselinedFiles).toEqual(['rulesets/sdlc/review-thresholds.rules.json']);
    expect(fs.readFileSync(thresholdsFile, 'utf8')).toBe(legacy);
    expect(fs.existsSync(path.join(satellitePath, '.evolith', 'scaffold-manifest.json'))).toBe(true);

    const after = await upgrade({ dryRun: true });
    expect(after.data.divergence.conflicts).toEqual([]);
    expect(after.data.divergence.localOnly).toEqual(['rulesets/sdlc/review-thresholds.rules.json']);
  });
});
