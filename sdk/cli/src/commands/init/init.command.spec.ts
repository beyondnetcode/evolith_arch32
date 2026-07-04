import { InitCommand } from './init.command';
import { AdoptRepoResult } from '@evolith/core-domain/application/use-cases/adopt-repo.use-case';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  note: jest.fn(),
  select: jest.fn(),
  text: jest.fn(),
  confirm: jest.fn(),
  multiselect: jest.fn(),
  group: jest.fn(),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  cancel: jest.fn(),
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
  chalkFn.bgCyan = { white: { bold: (str: string) => str } };
  return chalkFn;
});

jest.mock('../../infrastructure/catalog/catalog-loader', () => ({
  CatalogLoader: jest.fn().mockImplementation(() => ({
    loadRuntimeCatalog: jest.fn(() => []),
    getMonorepoOptions: jest.fn(() => [
      { id: 'none', name: 'None', description: 'No monorepo' },
    ]),
    getArchitecturePatterns: jest.fn(() => []),
    getDefaultDatabase: jest.fn(() => 'postgresql'),
    getApiProtocols: jest.fn(() => []),
  })),
}));

jest.mock('@evolith/core-domain/application/use-cases/adopt-repo.use-case', () => ({
  AdoptRepoUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

jest.mock('@evolith/core-domain/application/services/repo-detector.service', () => ({
  RepoDetectorService: jest.fn().mockImplementation(() => ({
    detect: jest.fn(),
  })),
}));

jest.mock('../../infrastructure/observability', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  errorReporter: {
    report: jest.fn(),
    printSummary: jest.fn(),
  },
  OperationTimer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    end: jest.fn().mockReturnValue(500),
  })),
  commandWatcher: {
    start: jest.fn(),
    end: jest.fn(),
  },
}));

import * as p from '@clack/prompts';
import { AdoptRepoUseCase } from '@evolith/core-domain/application/use-cases/adopt-repo.use-case';
import { RepoDetectorService } from '@evolith/core-domain/application/services/repo-detector.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

const mockExecute = jest.fn();
const mockAskAdoptOptions = jest.fn();
const mockDetect = jest.fn();

(AdoptRepoUseCase as jest.Mock).mockImplementation(() => ({
  execute: mockExecute,
}));

(RepoDetectorService as jest.Mock).mockImplementation(() => ({
  detect: mockDetect,
}));

describe('InitCommand', () => {
  let command: InitCommand;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  const defaultDetection = {
    repoName: 'my-repo',
    remoteUrl: 'https://github.com/test/my-repo.git',
    remoteOwner: 'test',
    runtime: 'nodejs',
    packageManager: 'npm',
    framework: 'nestjs',
    ciPlatform: 'github',
    hasDocs: false,
    hasGovernance: false,
    hasEvolithYaml: false,
    hasAgentsMd: false,
  };

  const defaultAdoptInput = {
    name: 'my-repo',
    monorepo: 'none',
    features: ['adr', 'hooks'],
    agents: ['bmad'],
    hooks: true,
    detection: defaultDetection,
  };

  const defaultResult: AdoptRepoResult = {
    success: true,
    created: ['evolith.yaml', 'AGENTS.md', 'README.md'],
    skipped: [],
    merged: [],
    warnings: [],
    errors: [],
  };

  const mockCommandExecutor = {
    execute: jest.fn(),
    executeOrThrow: jest.fn().mockResolvedValue('true'),
    checkTool: jest.fn(),
  };

  beforeEach(() => {
    mockDetect.mockResolvedValue(defaultDetection);
    jest.spyOn(PromptService.prototype, 'askAdoptOptions').mockImplementation(mockAskAdoptOptions);
    const { CatalogLoader } = require('../../infrastructure/catalog/catalog-loader');
    const catalogLoader = new CatalogLoader();
    command = new InitCommand(catalogLoader, {} as never, mockCommandExecutor as never, new PromptService());
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
    mockExecute.mockReset();
    mockExecute.mockResolvedValue(defaultResult);
    mockAskAdoptOptions.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe('run', () => {
    it('should detect repository properties before prompting', async () => {
      mockAskAdoptOptions.mockResolvedValue(defaultAdoptInput);

      await command.run([], {});

      expect(mockDetect).toHaveBeenCalled();
      expect(mockAskAdoptOptions).toHaveBeenCalledWith(defaultDetection, expect.anything());
    });

    it('should show intro and prompt for adopt configuration', async () => {
      mockAskAdoptOptions.mockResolvedValue(defaultAdoptInput);

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
      expect(mockAskAdoptOptions).toHaveBeenCalled();
    });

    it('should call AdoptRepoUseCase with correct input', async () => {
      mockAskAdoptOptions.mockResolvedValue(defaultAdoptInput);

      await command.run([], {});

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-repo',
          monorepo: 'none',
          features: ['adr', 'hooks'],
          agents: ['bmad'],
          hooks: true,
        }),
        expect.any(String)
      );
    });

    it('should show success message when adoption succeeds', async () => {
      mockAskAdoptOptions.mockResolvedValue(defaultAdoptInput);

      await command.run([], {});

      expect(p.log.success).toHaveBeenCalled();
      expect(p.log.info).toHaveBeenCalled();
    });

    it('should show created files in success output', async () => {
      mockAskAdoptOptions.mockResolvedValue(defaultAdoptInput);

      await command.run([], {});

      expect(p.log.info).toHaveBeenCalledWith(
        expect.stringContaining('evolith.yaml')
      );
    });

    it('should show warnings when adoption has warnings', async () => {
      mockAskAdoptOptions.mockResolvedValue(defaultAdoptInput);
      mockExecute.mockResolvedValue({
        success: true,
        created: ['evolith.yaml'],
        skipped: [],
        merged: [],
        warnings: ['Some warning'],
        errors: [],
      });

      await command.run([], {});

      expect(p.log.warn).toHaveBeenCalled();
    });

    it('should show error message when adoption fails', async () => {
      mockAskAdoptOptions.mockResolvedValue(defaultAdoptInput);
      mockExecute.mockResolvedValue({
        success: false,
        created: [],
        skipped: [],
        merged: [],
        warnings: [],
        errors: ['Something went wrong'],
      });

      await command.run([], {});

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should cancel adoption when confirmAdopt is false', async () => {
      mockAskAdoptOptions.mockResolvedValue(null);

      await command.run([], {});

      expect(mockExecute).not.toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalled();
    });

    it('should detect git repository before proceeding', async () => {
      mockCommandExecutor.executeOrThrow.mockRejectedValue(new Error('not a git repo'));

      await command.run([], {});

      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('Not inside a Git repository'));
      expect(mockAskAdoptOptions).not.toHaveBeenCalled();
    });
  });

  describe('option parsers', () => {
    it('should parse dry-run option', () => {
      expect(command.parseDryRun()).toBe(true);
    });

    it('should parse monorepo option', () => {
      expect(command.parseMonorepo('nx')).toBe('nx');
    });

    it('should parse features option', () => {
      expect(command.parseFeatures('adr,hooks')).toBe('adr,hooks');
    });

    it('should parse agents option', () => {
      expect(command.parseAgents('bmad,qa')).toBe('bmad,qa');
    });
  });
});
