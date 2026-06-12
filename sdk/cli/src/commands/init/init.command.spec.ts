import { InitCommand } from './init.command';

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

jest.mock('../../core/di/container', () => ({
  getContainer: jest.fn(() => ({
    createFileSystem: jest.fn(() => ({
      exists: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      readJson: jest.fn(),
      writeJson: jest.fn(),
      ensureDir: jest.fn(),
      readdirNames: jest.fn(),
      existsSync: jest.fn(),
    })),
  })),
}));

jest.mock('../../infrastructure/catalog/catalog-loader', () => ({
  CatalogLoader: jest.fn().mockImplementation(() => ({
    loadRuntimeCatalog: jest.fn(() => [
      { id: 'nodejs', name: 'Node.js', defaultVersion: '20.x', language: 'JavaScript', databases: [{ id: 'postgresql', name: 'PostgreSQL', type: 'relational' }] },
      { id: 'dotnet', name: '.NET', defaultVersion: '8.0', language: 'C#', databases: [{ id: 'sqlserver', name: 'SQL Server', type: 'relational' }] },
    ]),
    getMonorepoOptions: jest.fn(() => [
      { id: 'none', name: 'None', description: 'No monorepo' },
      { id: 'nx', name: 'Nx', description: 'Nx monorepo' },
    ]),
    getArchitecturePatterns: jest.fn(() => [
      { id: 'clean', name: 'Clean Architecture', description: 'Clean architecture pattern' },
      { id: 'hexagonal', name: 'Hexagonal', description: 'Hexagonal architecture' },
    ]),
    getDefaultDatabase: jest.fn(() => 'postgresql'),
    getApiProtocols: jest.fn(() => [
      { id: 'rest', name: 'REST', description: 'RESTful API' },
      { id: 'graphql', name: 'GraphQL', description: 'GraphQL API' },
    ]),
  })),
}));

jest.mock('../../application/services', () => ({
  InitializeProjectUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
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
import { InitializeProjectUseCase } from '../../application/services';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

const mockExecute = jest.fn();
const mockAskInitOptions = jest.fn();

(InitializeProjectUseCase as jest.Mock).mockImplementation(() => ({
  execute: mockExecute,
}));

describe('InitCommand', () => {
  let command: InitCommand;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  const defaultSelection = {
    projectName: 'my-project',
    runtime: 'nodejs',
    monorepo: 'none',
    architecture: 'clean',
    database: 'postgresql',
    apiProtocol: 'rest',
    ciCd: 'github',
    observability: 'otel',
    features: ['adr', 'hooks'],
    agents: ['bmad'],
  };

  const defaultResult = {
    success: true,
    artifacts: ['my-project/evolith.yaml', 'my-project/README.md'],
    warnings: [],
    errors: [],
  };

  beforeEach(() => {
    jest.spyOn(PromptService.prototype, 'askInitOptions').mockImplementation(mockAskInitOptions);
    const { CatalogLoader } = require('../../infrastructure/catalog/catalog-loader');
    const catalogLoader = new CatalogLoader();
    command = new InitCommand(catalogLoader);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
    mockExecute.mockReset();
    mockExecute.mockResolvedValue(defaultResult);
    mockAskInitOptions.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe('run', () => {
    it('should show intro and prompt for project configuration', async () => {
      mockAskInitOptions.mockResolvedValue(defaultSelection);

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
      expect(mockAskInitOptions).toHaveBeenCalled();
    });

    it('should call InitializeProjectUseCase with correct input', async () => {
      mockAskInitOptions.mockResolvedValue(defaultSelection);

      await command.run([], {});

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-project',
          runtime: 'nodejs',
          monorepo: 'none',
          architecture: 'clean',
          database: 'postgresql',
          apiProtocol: 'rest',
          ciCd: 'github',
          observability: 'otel',
          features: ['adr', 'hooks'],
          agents: ['bmad'],
        }),
        expect.any(String)
      );
    });

    it('should show success message when initialization succeeds', async () => {
      mockAskInitOptions.mockResolvedValue(defaultSelection);

      await command.run([], {});

      expect(p.log.success).toHaveBeenCalled();
      expect(p.log.info).toHaveBeenCalled();
    });

    it('should show artifacts created in success output', async () => {
      mockAskInitOptions.mockResolvedValue(defaultSelection);

      await command.run([], {});

      expect(p.log.info).toHaveBeenCalledWith(
        expect.stringContaining('evolith.yaml')
      );
    });

    it('should show warnings when initialization has warnings', async () => {
      mockAskInitOptions.mockResolvedValue(defaultSelection);
      mockExecute.mockResolvedValue({
        success: true,
        artifacts: ['my-project/evolith.yaml'],
        warnings: ['Platform nodejs not detected'],
        errors: [],
      });

      await command.run([], {});

      expect(p.log.warn).toHaveBeenCalled();
    });

    it('should show error message when initialization fails', async () => {
      mockAskInitOptions.mockResolvedValue(defaultSelection);
      mockExecute.mockResolvedValue({
        success: false,
        artifacts: [],
        warnings: [],
        errors: ['Runtime not found'],
      });

      await command.run([], {});

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should cancel initialization when confirmInit is false', async () => {
      mockAskInitOptions.mockResolvedValue(null);

      await command.run([], {});

      expect(mockExecute).not.toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalled();
    });

    it('should log operation start', async () => {
      mockAskInitOptions.mockResolvedValue(defaultSelection);

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
    });
  });

  describe('option parsers', () => {
    it('should parse dry-run option', () => {
      expect(command.parseDryRun()).toBe(true);
    });

    it('should parse config option', () => {
      expect(command.parseConfig('/path/to/config.json')).toBe('/path/to/config.json');
    });

    it('should parse runtime option', () => {
      expect(command.parseRuntime('nodejs')).toBe('nodejs');
    });

    it('should parse monorepo option', () => {
      expect(command.parseMonorepo('nx')).toBe('nx');
    });

    it('should parse arch option', () => {
      expect(command.parseArch('hexagonal')).toBe('hexagonal');
    });

    it('should parse db option', () => {
      expect(command.parseDb('mongodb')).toBe('mongodb');
    });
  });
});
