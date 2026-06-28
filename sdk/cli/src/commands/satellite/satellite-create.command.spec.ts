import { SatelliteCreateCommand } from './satellite-create.command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';

// Mock infra-providers so the command can be instantiated without a real GitHub token
jest.mock('@evolith/infra-providers', () => ({
  GitHubApiAdapter: jest.fn().mockImplementation(() => ({
    createRepository: jest.fn().mockResolvedValue({
      id: 1,
      name: 'my-satellite',
      fullName: 'my-org/my-satellite',
      cloneUrl: 'https://github.com/my-org/my-satellite.git',
      sshUrl: 'git@github.com:my-org/my-satellite.git',
      htmlUrl: 'https://github.com/my-org/my-satellite',
      private: false,
      defaultBranch: 'main',
      topics: [],
    }),
    addTopics: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn().mockResolvedValue(null),
  })),
}));

function buildPromptService(): PromptService {
  const svc = new PromptService();
  jest.spyOn(svc, 'showIntro').mockReturnValue(undefined);
  jest.spyOn(svc, 'showOutro').mockReturnValue(undefined);
  jest.spyOn(svc, 'showSuccess').mockReturnValue(undefined);
  jest.spyOn(svc, 'showError').mockReturnValue(undefined);
  jest.spyOn(svc, 'startSpinner').mockReturnValue(undefined);
  jest.spyOn(svc, 'stopSpinner').mockReturnValue(undefined);
  return svc;
}

describe('SatelliteCreateCommand', () => {
  let command: SatelliteCreateCommand;
  let promptService: PromptService;

  beforeEach(() => {
    promptService = buildPromptService();
    command = new SatelliteCreateCommand(promptService, new ConfigService());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(command).toBeDefined();
  });

  it('should show an error when no token is available', async () => {
    const originalToken = process.env['GITHUB_TOKEN'];
    delete process.env['GITHUB_TOKEN'];

    await command.executeCommand([], {
      name: 'my-satellite',
      owner: 'my-org',
      topology: 'modular',
      phase: 'discovery',
    });

    expect(promptService.showError).toHaveBeenCalledWith(
      expect.stringContaining('GitHub token not found'),
    );

    if (originalToken !== undefined) {
      process.env['GITHUB_TOKEN'] = originalToken;
    }
  });

  it('should create a satellite repository when all options and token are provided', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    process.env['GITHUB_TOKEN'] = 'ghp_fake_token';

    await command.executeCommand([], {
      name: 'my-satellite',
      owner: 'my-org',
      topology: 'modular',
      phase: 'discovery',
      description: 'Test satellite',
    });

    expect(promptService.showSuccess).toHaveBeenCalledWith(
      expect.stringContaining('my-satellite'),
    );

    delete process.env['GITHUB_TOKEN'];
    jest.restoreAllMocks();
  });

  describe('option parsers', () => {
    it('parseName returns the value as-is', () => {
      expect(command['parseName']('repo-name')).toBe('repo-name');
    });

    it('parseOwner returns the value as-is', () => {
      expect(command['parseOwner']('my-org')).toBe('my-org');
    });

    it('parseTopology returns the value cast to topology type', () => {
      expect(command['parseTopology']('micro')).toBe('micro');
    });

    it('parsePhase returns the value cast to phase type', () => {
      expect(command['parsePhase']('construction')).toBe('construction');
    });

    it('parsePrivate always returns true', () => {
      expect(command['parsePrivate']()).toBe(true);
    });

    it('parseDescription returns the value as-is', () => {
      expect(command['parseDescription']('A description')).toBe('A description');
    });

    it('parseToken returns the value as-is', () => {
      expect(command['parseToken']('ghp_abc')).toBe('ghp_abc');
    });
  });
});
