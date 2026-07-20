import { SatelliteAdoptCommand } from './satellite-adopt.command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';

const executeMock = jest.fn();

// The use case reaches GitHub; stub it so the command's own branching is what
// gets exercised rather than the network.
jest.mock('@beyondnet/evolith-core-domain/application/use-cases/initialize-satellite.use-case', () => ({
  InitializeSatelliteUseCase: jest.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

jest.mock('@beyondnet/evolith-infra-providers', () => ({
  GitHubApiAdapter: jest.fn().mockImplementation(() => ({})),
}));

function satellite(overrides: Record<string, unknown> = {}) {
  return {
    satellite: {
      id: 'sat-1',
      name: 'myrepo',
      owner: 'myorg',
      repoUrl: 'https://github.com/myorg/myrepo',
      topology: 'monolith',
      phase: 'alpha',
      status: 'linked',
      ...overrides,
    },
  };
}

function buildPromptService(): PromptService {
  const svc = new PromptService();
  jest.spyOn(svc, 'showIntro').mockReturnValue(undefined);
  jest.spyOn(svc, 'showOutro').mockReturnValue(undefined);
  jest.spyOn(svc, 'showSuccess').mockReturnValue(undefined);
  jest.spyOn(svc, 'showWarning').mockReturnValue(undefined);
  jest.spyOn(svc, 'showError').mockReturnValue(undefined);
  jest.spyOn(svc, 'startSpinner').mockReturnValue(undefined);
  jest.spyOn(svc, 'stopSpinner').mockReturnValue(undefined);
  return svc;
}

describe('SatelliteAdoptCommand', () => {
  let command: SatelliteAdoptCommand;
  let promptService: PromptService;
  let logSpy: jest.SpyInstance;
  const originalToken = process.env['GITHUB_TOKEN'];

  beforeEach(() => {
    promptService = buildPromptService();
    command = new SatelliteAdoptCommand(promptService, new ConfigService());
    executeMock.mockReset().mockResolvedValue(satellite());
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env['GITHUB_TOKEN'] = 'token-from-env';
  });

  afterEach(() => {
    jest.clearAllMocks();
    logSpy.mockRestore();
    if (originalToken === undefined) delete process.env['GITHUB_TOKEN'];
    else process.env['GITHUB_TOKEN'] = originalToken;
  });

  it('is defined', () => {
    expect(command).toBeDefined();
  });

  // --- json mode: every prompt must be skipped -------------------------------

  it('adopts non-interactively in json mode without prompting', async () => {
    const textSpy = jest.spyOn(promptService, 'text');
    const selectSpy = jest.spyOn(promptService, 'select');

    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo',
      format: 'json',
    });

    expect(textSpy).not.toHaveBeenCalled();
    expect(selectSpy).not.toHaveBeenCalled();
    expect(promptService.showIntro).not.toHaveBeenCalled();
  });

  it('emits an ADR-0073 success envelope in json mode', async () => {
    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo',
      format: 'json',
    });

    const calls = logSpy.mock.calls;
    const payload = JSON.parse(calls[calls.length - 1][0] as string);
    expect(payload.success).toBe(true);
    expect(payload.data.satellite.name).toBe('myrepo');
    expect(payload.meta.command).toBe('evolith satellite adopt');
    expect(payload.meta.correlationId).toEqual(expect.any(String));
  });

  it('defaults topology to monolith and phase to alpha in json mode', async () => {
    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo',
      format: 'json',
    });

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'adopt', topology: 'monolith', phase: 'alpha' }),
    );
  });

  it('honours explicit topology and phase over the defaults', async () => {
    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo',
      topology: 'micro',
      phase: 'ga',
      format: 'json',
    });

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ topology: 'micro', phase: 'ga' }),
    );
  });

  // --- owner resolution ------------------------------------------------------

  it('parses the owner and name out of the repo URL', async () => {
    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo',
      format: 'json',
    });

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'myorg', name: 'myrepo' }),
    );
  });

  it('strips a trailing .git from the repo name', async () => {
    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo.git',
      format: 'json',
    });

    expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'myrepo' }));
  });

  it('lets an explicit --owner override the one parsed from the URL', async () => {
    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo',
      owner: 'other-org',
      format: 'json',
    });

    expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({ owner: 'other-org' }));
  });

  it('yields empty owner and name when the URL does not match the expected shape', async () => {
    await command.executeCommand([], { repo: 'not-a-github-url', format: 'json' });

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ owner: '', name: '' }),
    );
  });

  // --- token resolution ------------------------------------------------------

  it('prefers an explicit --token over the environment', async () => {
    const { GitHubApiAdapter } = jest.requireMock('@beyondnet/evolith-infra-providers');
    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo',
      token: 'explicit-token',
      format: 'json',
    });

    expect(GitHubApiAdapter).toHaveBeenCalledWith('explicit-token');
  });

  it('falls back to GITHUB_TOKEN when no --token is given', async () => {
    const { GitHubApiAdapter } = jest.requireMock('@beyondnet/evolith-infra-providers');
    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo',
      format: 'json',
    });

    expect(GitHubApiAdapter).toHaveBeenCalledWith('token-from-env');
  });

  it('warns about a missing token in human mode but still attempts the adoption', async () => {
    delete process.env['GITHUB_TOKEN'];
    jest.spyOn(promptService, 'text').mockResolvedValue('https://github.com/myorg/myrepo');
    jest.spyOn(promptService, 'select').mockResolvedValue('monolith' as never);

    await command.executeCommand([], { repo: 'https://github.com/myorg/myrepo' });

    expect(promptService.showWarning).toHaveBeenCalledWith(
      expect.stringContaining('No GitHub token found'),
    );
    expect(executeMock).toHaveBeenCalled();
  });

  it('does not warn about a missing token in json mode', async () => {
    delete process.env['GITHUB_TOKEN'];

    await command.executeCommand([], {
      repo: 'https://github.com/myorg/myrepo',
      format: 'json',
    });

    expect(promptService.showWarning).not.toHaveBeenCalled();
  });

  // --- human mode ------------------------------------------------------------

  it('prompts for the repo URL when --repo is absent', async () => {
    const textSpy = jest
      .spyOn(promptService, 'text')
      .mockResolvedValue('https://github.com/prompted/repo');
    jest.spyOn(promptService, 'select').mockResolvedValue('modular' as never);

    await command.executeCommand([], {});

    expect(textSpy).toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ existingRepoUrl: 'https://github.com/prompted/repo' }),
    );
  });

  it('prompts for topology and phase when neither flag is given', async () => {
    jest.spyOn(promptService, 'text').mockResolvedValue('https://github.com/myorg/myrepo');
    const selectSpy = jest
      .spyOn(promptService, 'select')
      .mockResolvedValueOnce('distributed' as never)
      .mockResolvedValueOnce('beta' as never);

    await command.executeCommand([], { repo: 'https://github.com/myorg/myrepo' });

    expect(selectSpy).toHaveBeenCalledTimes(2);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ topology: 'distributed', phase: 'beta' }),
    );
  });

  it('renders the human summary and closes the spinner on success', async () => {
    jest.spyOn(promptService, 'text').mockResolvedValue('https://github.com/myorg/myrepo');
    jest.spyOn(promptService, 'select').mockResolvedValue('monolith' as never);

    await command.executeCommand([], { repo: 'https://github.com/myorg/myrepo' });

    expect(promptService.showIntro).toHaveBeenCalled();
    expect(promptService.startSpinner).toHaveBeenCalled();
    expect(promptService.stopSpinner).toHaveBeenCalled();
    expect(promptService.showSuccess).toHaveBeenCalledWith(expect.stringContaining('myrepo'));
    expect(promptService.showOutro).toHaveBeenCalledWith('Done.');
  });

  // --- validation of the interactive URL prompt ------------------------------

  it('rejects a URL that is not on github.com and accepts one that is', async () => {
    let validate: ((v: string) => string | undefined) | undefined;
    jest.spyOn(promptService, 'text').mockImplementation(async (opts) => {
      validate = opts.validate;
      return 'https://github.com/myorg/myrepo';
    });
    jest.spyOn(promptService, 'select').mockResolvedValue('monolith' as never);

    await command.executeCommand([], {});

    expect(validate?.('https://gitlab.com/a/b')).toMatch(/must start with/);
    expect(validate?.('https://github.com/incomplete')).toMatch(/owner\/repo/);
    expect(validate?.('https://github.com/myorg/myrepo')).toBeUndefined();
  });

  // --- failure ---------------------------------------------------------------

  it('stops the spinner and rethrows when the use case fails in human mode', async () => {
    executeMock.mockRejectedValue(new Error('adoption failed'));
    jest.spyOn(promptService, 'text').mockResolvedValue('https://github.com/myorg/myrepo');
    jest.spyOn(promptService, 'select').mockResolvedValue('monolith' as never);

    await expect(
      command.executeCommand([], { repo: 'https://github.com/myorg/myrepo' }),
    ).rejects.toThrow('adoption failed');

    expect(promptService.stopSpinner).toHaveBeenCalled();
  });

  it('rethrows in json mode without touching the spinner', async () => {
    executeMock.mockRejectedValue(new Error('adoption failed'));

    await expect(
      command.executeCommand([], {
        repo: 'https://github.com/myorg/myrepo',
        format: 'json',
      }),
    ).rejects.toThrow('adoption failed');

    expect(promptService.stopSpinner).not.toHaveBeenCalled();
  });

  // --- option parsers --------------------------------------------------------

  it('option parsers return their argument unchanged', () => {
    expect(command.parseRepo('https://github.com/a/b')).toBe('https://github.com/a/b');
    expect(command.parseTopology('micro')).toBe('micro');
    expect(command.parsePhase('ga')).toBe('ga');
    expect(command.parseToken('tok')).toBe('tok');
    expect(command.parseOwner('org')).toBe('org');
    expect(command.parseFormat('json')).toBe('json');
  });
});
