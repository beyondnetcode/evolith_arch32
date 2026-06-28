import { InitializeSatelliteUseCase } from './initialize-satellite.use-case';
import { IGitHubApiClient, GitHubRepo } from '../../domain/github-api-client.interface';
import { InitializeSatelliteInput } from '../../domain/satellite-record';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeGitHubRepo = (overrides: Partial<GitHubRepo> = {}): GitHubRepo => ({
  id: 1,
  name: 'my-satellite',
  fullName: 'acme/my-satellite',
  cloneUrl: 'https://github.com/acme/my-satellite.git',
  sshUrl: 'git@github.com:acme/my-satellite.git',
  htmlUrl: 'https://github.com/acme/my-satellite',
  private: false,
  defaultBranch: 'main',
  topics: [],
  ...overrides,
});

const makeInput = (overrides: Partial<InitializeSatelliteInput> = {}): InitializeSatelliteInput => ({
  mode: 'create',
  name: 'my-satellite',
  owner: 'acme',
  topology: 'monolith',
  phase: 'discovery',
  description: 'Test satellite',
  private: false,
  ...overrides,
});

const makeMockClient = (overrides: Partial<IGitHubApiClient> = {}): jest.Mocked<IGitHubApiClient> =>
  ({
    validateToken: jest.fn(),
    createRepository: jest.fn().mockResolvedValue(makeGitHubRepo()),
    getRepository: jest.fn().mockResolvedValue(makeGitHubRepo()),
    applyBranchProtection: jest.fn().mockResolvedValue(undefined),
    pushFile: jest.fn().mockResolvedValue(undefined),
    createWebhook: jest.fn().mockResolvedValue({ id: 1, url: 'https://hooks.example.com/1' }),
    addTopics: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as jest.Mocked<IGitHubApiClient>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InitializeSatelliteUseCase', () => {
  describe('mode=create (success)', () => {
    it('creates a repo, adds the evolith-satellite topic, and returns a SatelliteRecord', async () => {
      const client = makeMockClient();
      const useCase = new InitializeSatelliteUseCase(client);
      const input = makeInput({ mode: 'create' });

      const output = await useCase.execute(input);

      // createRepository was called with the right params
      expect(client.createRepository).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'acme', name: 'my-satellite', autoInit: true }),
      );

      // topic was applied
      expect(client.addTopics).toHaveBeenCalledWith('acme', 'my-satellite', ['evolith-satellite']);

      // satellite record shape
      const { satellite, outputEnvelope } = output;
      expect(satellite.mode).toBe('create');
      expect(satellite.status).toBe('provisioning');
      expect(satellite.name).toBe('my-satellite');
      expect(satellite.owner).toBe('acme');
      expect(satellite.repoUrl).toBe('https://github.com/acme/my-satellite');
      expect(satellite.cloneUrl).toBe('https://github.com/acme/my-satellite.git');
      expect(satellite.sshUrl).toBe('git@github.com:acme/my-satellite.git');
      expect(satellite.topology).toBe('monolith');
      expect(satellite.phase).toBe('discovery');
      expect(satellite.id).toBeTruthy();
      expect(satellite.createdAt).toBeTruthy();

      // envelope
      expect(outputEnvelope.success).toBe(true);
      expect(outputEnvelope.data.satellite).toBe(satellite);
      expect(outputEnvelope.meta.requestId).toBe(satellite.id);
      expect(outputEnvelope.meta.version).toBe('1');
      expect(outputEnvelope.meta.timestamp).toBeTruthy();
    });

    it('sets linkedAt to undefined for created repos', async () => {
      const useCase = new InitializeSatelliteUseCase(makeMockClient());
      const output = await useCase.execute(makeInput({ mode: 'create' }));
      expect(output.satellite.linkedAt).toBeUndefined();
    });
  });

  describe('mode=adopt (success)', () => {
    it('fetches the repo, does NOT call createRepository, and returns a linked SatelliteRecord', async () => {
      const client = makeMockClient();
      const useCase = new InitializeSatelliteUseCase(client);
      const input = makeInput({ mode: 'adopt' });

      const output = await useCase.execute(input);

      expect(client.createRepository).not.toHaveBeenCalled();
      expect(client.getRepository).toHaveBeenCalledWith('acme', 'my-satellite');

      const { satellite } = output;
      expect(satellite.mode).toBe('adopt');
      expect(satellite.status).toBe('linked');
      expect(satellite.linkedAt).toBeTruthy();
      expect(satellite.repoUrl).toBe('https://github.com/acme/my-satellite');
    });

    it('sets coreVersion when provided in input', async () => {
      const useCase = new InitializeSatelliteUseCase(makeMockClient());
      const output = await useCase.execute(makeInput({ mode: 'adopt', coreVersion: '2.1.0' }));
      expect(output.satellite.coreVersion).toBe('2.1.0');
    });
  });

  describe('mode=adopt (repo not found)', () => {
    it('throws an error when the repository does not exist', async () => {
      const client = makeMockClient({ getRepository: jest.fn().mockResolvedValue(null) });
      const useCase = new InitializeSatelliteUseCase(client);

      await expect(useCase.execute(makeInput({ mode: 'adopt' }))).rejects.toThrow(
        /Repository acme\/my-satellite not found/,
      );
    });
  });

  describe('no client configured', () => {
    it('throws when githubClient is not provided', async () => {
      const useCase = new InitializeSatelliteUseCase(undefined);

      await expect(useCase.execute(makeInput())).rejects.toThrow(
        /GitHub client not configured/,
      );
    });
  });
});
