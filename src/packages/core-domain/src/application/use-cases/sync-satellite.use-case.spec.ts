import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SyncSatelliteUseCase, SyncSatelliteInput, SyncSatelliteOutput } from './sync-satellite.use-case';
import { IGitHubApiClient } from '../../domain/github-api-client.interface';
import { SatelliteRecord } from '../../domain/satellite-record';
import { ILogger } from '../../domain/interfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSatellite(overrides: Partial<SatelliteRecord> = {}): SatelliteRecord {
  return {
    id: 'sat-001',
    name: 'my-satellite',
    owner: 'acme',
    repoUrl: 'https://github.com/acme/my-satellite',
    cloneUrl: 'https://github.com/acme/my-satellite.git',
    sshUrl: 'git@github.com:acme/my-satellite.git',
    topology: 'monolith',
    phase: 'discovery',
    status: 'active',
    mode: 'create',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMockClient(overrides: Partial<IGitHubApiClient> = {}): jest.Mocked<IGitHubApiClient> {
  return {
    validateToken: jest.fn(),
    createRepository: jest.fn(),
    getRepository: jest.fn(),
    applyBranchProtection: jest.fn(),
    pushFile: jest.fn().mockResolvedValue(undefined),
    createWebhook: jest.fn(),
    addTopics: jest.fn(),
    ...overrides,
  } as jest.Mocked<IGitHubApiClient>;
}

function makeLogger(): jest.Mocked<ILogger> {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

/**
 * Create a temporary core directory with some standard files:
 *   rulesets/ruleset-base.yaml
 *   reference/core/ADR-001-architecture.md
 *   reference/core/ADR-002-testing.md
 *   .evolith.yaml
 */
function createTempCoreDir(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-core-'));

  // rulesets/
  fs.mkdirSync(path.join(tmpDir, 'rulesets'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'rulesets', 'ruleset-base.yaml'), 'version: 1\nrules: []');

  // reference/core/
  fs.mkdirSync(path.join(tmpDir, 'reference', 'core'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'reference', 'core', 'ADR-001-architecture.md'), '# ADR-001');
  fs.writeFileSync(path.join(tmpDir, 'reference', 'core', 'ADR-002-testing.md'), '# ADR-002');

  // .evolith.yaml
  fs.writeFileSync(path.join(tmpDir, '.evolith.yaml'), 'version: 1.0.0');

  return tmpDir;
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SyncSatelliteUseCase', () => {
  let corePath: string;

  beforeEach(() => {
    corePath = createTempCoreDir();
  });

  afterEach(() => {
    removeTempDir(corePath);
  });

  describe('dry-run mode', () => {
    it('reports all resolved files as would-sync without calling pushFile', async () => {
      const client = makeMockClient();
      const logger = makeLogger();
      const useCase = new SyncSatelliteUseCase(client, logger);

      const input: SyncSatelliteInput = {
        satellite: makeSatellite(),
        corePath,
        dryRun: true,
      };

      const output: SyncSatelliteOutput = await useCase.execute(input);

      expect(output.dryRun).toBe(true);
      expect(output.success).toBe(true);
      expect(client.pushFile).not.toHaveBeenCalled();

      // All resolved files should appear in syncedFiles
      expect(output.syncedFiles.length).toBeGreaterThan(0);
      expect(output.skippedFiles.length).toBe(0);

      // Envelope mirrors top-level
      expect(output.outputEnvelope.data.dryRun).toBe(true);
      expect(output.outputEnvelope.data.syncedFiles).toEqual(output.syncedFiles);
      expect(output.outputEnvelope.success).toBe(true);
    });

    it('accepts custom filesToSync patterns in dry-run mode', async () => {
      const client = makeMockClient();
      const useCase = new SyncSatelliteUseCase(client);

      const output = await useCase.execute({
        satellite: makeSatellite(),
        corePath,
        dryRun: true,
        filesToSync: ['.evolith.yaml'],
      });

      expect(output.dryRun).toBe(true);
      expect(output.syncedFiles).toHaveLength(1);
      expect(output.syncedFiles[0].path).toBe('.evolith.yaml');
      expect(client.pushFile).not.toHaveBeenCalled();
    });

    it('returns empty syncedFiles when no files match the pattern', async () => {
      const client = makeMockClient();
      const useCase = new SyncSatelliteUseCase(client);

      const output = await useCase.execute({
        satellite: makeSatellite(),
        corePath,
        dryRun: true,
        filesToSync: ['nonexistent-dir/'],
      });

      expect(output.dryRun).toBe(true);
      expect(output.syncedFiles).toHaveLength(0);
      expect(output.skippedFiles).toHaveLength(0);
    });
  });

  describe('full sync mode', () => {
    it('pushes all default standard files to the satellite repo', async () => {
      const client = makeMockClient();
      const logger = makeLogger();
      const useCase = new SyncSatelliteUseCase(client, logger);

      const satellite = makeSatellite();
      const output = await useCase.execute({ satellite, corePath });

      expect(output.success).toBe(true);
      expect(output.dryRun).toBe(false);
      expect(output.syncedFiles.length).toBeGreaterThan(0);

      // pushFile called once per synced file
      expect(client.pushFile).toHaveBeenCalledTimes(output.syncedFiles.length);

      // Each call uses the correct owner/repo and the sync commit message
      for (const call of (client.pushFile as jest.Mock).mock.calls) {
        const [owner, repo, params] = call;
        expect(owner).toBe('acme');
        expect(repo).toBe('my-satellite');
        expect(params.message).toBe('chore(evolith-sync): propagate standard');
        expect(typeof params.content).toBe('string');
        // content must be valid base64
        expect(() => Buffer.from(params.content, 'base64')).not.toThrow();
      }

      // Output envelope is correctly populated
      expect(output.outputEnvelope.success).toBe(true);
      expect(output.outputEnvelope.meta.requestId).toBeTruthy();
      expect(output.outputEnvelope.meta.timestamp).toBeTruthy();
      expect(output.outputEnvelope.meta.version).toBe('1.0.0');
    });

    it('resolves owner/repo from repoUrl when available', async () => {
      const client = makeMockClient();
      const useCase = new SyncSatelliteUseCase(client);
      const satellite = makeSatellite({
        repoUrl: 'https://github.com/myorg/my-sat',
        owner: 'wrong-owner',
        name: 'wrong-name',
      });

      await useCase.execute({ satellite, corePath, filesToSync: ['.evolith.yaml'] });

      expect(client.pushFile).toHaveBeenCalledWith('myorg', 'my-sat', expect.any(Object));
    });

    it('falls back to satellite.owner and satellite.name when repoUrl is unparseable', async () => {
      const client = makeMockClient();
      const useCase = new SyncSatelliteUseCase(client);
      const satellite = makeSatellite({
        repoUrl: 'not-a-valid-url',
        owner: 'fallback-owner',
        name: 'fallback-repo',
      });

      await useCase.execute({ satellite, corePath, filesToSync: ['.evolith.yaml'] });

      expect(client.pushFile).toHaveBeenCalledWith('fallback-owner', 'fallback-repo', expect.any(Object));
    });

    it('marks success=false and populates skippedFiles when pushFile throws', async () => {
      const client = makeMockClient({
        pushFile: jest.fn().mockRejectedValue(new Error('GitHub 403')),
      });
      const logger = makeLogger();
      const useCase = new SyncSatelliteUseCase(client, logger);

      const output = await useCase.execute({
        satellite: makeSatellite(),
        corePath,
        filesToSync: ['.evolith.yaml'],
      });

      expect(output.success).toBe(false);
      expect(output.skippedFiles.length).toBeGreaterThan(0);
      expect(output.skippedFiles[0].action).toBe('skipped');
      expect(logger.error).toHaveBeenCalled();
    });

    it('skips files gracefully when no githubClient is provided', async () => {
      const logger = makeLogger();
      const useCase = new SyncSatelliteUseCase(undefined, logger);

      const output = await useCase.execute({
        satellite: makeSatellite(),
        corePath,
        filesToSync: ['.evolith.yaml'],
      });

      // success stays true (no error thrown), but file is skipped
      expect(output.success).toBe(true);
      expect(output.skippedFiles.length).toBeGreaterThan(0);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('output envelope', () => {
    it('always includes requestId, timestamp, and version=1.0.0 in meta', async () => {
      const useCase = new SyncSatelliteUseCase(undefined);
      const output = await useCase.execute({
        satellite: makeSatellite(),
        corePath,
        dryRun: true,
      });

      const { meta } = output.outputEnvelope;
      expect(meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(new Date(meta.timestamp).toISOString()).toBe(meta.timestamp);
      expect(meta.version).toBe('1.0.0');
    });
  });
});
