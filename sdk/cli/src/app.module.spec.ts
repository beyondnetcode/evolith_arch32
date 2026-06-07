import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { InitCommand } from './commands/init/init.command';
import { AgentsCommand } from './commands/init/agents.command';
import { ValidateCommand } from './commands/validate/validate.command';
import { DocsCommand } from './commands/docs/docs.command';
import { UpgradeCommand } from './commands/init/upgrade.command';
import { McpServeCommand } from './commands/mcp/mcp-serve.command';
import { ConfigService } from './core/config/config.service';
import { FileManagerService } from './core/filesystem/file-manager.service';
import { SyncService } from './core/sync/sync.service';
import { WatcherService } from './core/mcp/watcher.service';
import { McpServerService } from './core/mcp/mcp-server.service';
import { SdlcCommand } from './commands/sdlc/sdlc.command';
import { HandoffCommand } from './commands/sdlc/handoff.command';
import { GenerateDomainCommand } from './commands/sdlc/generate-domain.command';
import { ScaffoldCommand } from './commands/architecture/scaffold.command';
import { ADRCommand } from './commands/adr/adr.command';
import { StandardsCommand } from './commands/standards/standards.command';
import { CompletionCommand } from './commands/completion/completion.command';
import { HistoryCommand } from './commands/history/history.command';
import { DriftCommand } from './commands/drift/drift.command';

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
  chalkFn.bgGreen = { white: { bold: (str: string) => str } };
  chalkFn.bgBlue = { white: { bold: (str: string) => str } };
  chalkFn.bgYellow = { white: { bold: (str: string) => str } };
  chalkFn.bgRed = { white: { bold: (str: string) => str } };
  chalkFn.bgMagenta = { white: { bold: (str: string) => str } };
  chalkFn.gray = (str: string) => str;
  return chalkFn;
});

jest.mock('./core/mcp/tools/tool-utils', () => ({
  getFileSystem: jest.fn(() => ({
    exists: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readJson: jest.fn(),
    writeJson: jest.fn(),
    ensureDir: jest.fn(),
    readdirNames: jest.fn(),
    remove: jest.fn(),
  })),
  getContainer: jest.fn(() => ({
    createFileSystem: jest.fn(),
  })),
}));

jest.mock('./core/di/container', () => ({
  getContainer: jest.fn(() => ({
    createFileSystem: jest.fn(() => ({
      exists: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      readJson: jest.fn(),
      writeJson: jest.fn(),
      ensureDir: jest.fn(),
      readdirNames: jest.fn(),
      remove: jest.fn(),
    })),
    createLogger: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
    createConfigParser: jest.fn(() => ({
      parse: jest.fn(),
      stringify: jest.fn(),
    })),
    resolve: jest.fn(),
    registerInstance: jest.fn(),
    registerSingleton: jest.fn(),
    registerTransient: jest.fn(),
  })),
  resetContainer: jest.fn(),
  createChildContainer: jest.fn(),
}));

jest.mock('./infrastructure/catalog/catalog-loader', () => ({
  catalogLoader: {
    loadRuntimeCatalog: jest.fn(() => []),
    getMonorepoOptions: jest.fn(() => []),
    getArchitecturePatterns: jest.fn(() => []),
    getDefaultDatabase: jest.fn(() => 'postgresql'),
    getApiProtocols: jest.fn(() => []),
  },
}));

jest.mock('./application/services', () => ({
  InitializeProjectUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

jest.mock('./core/observability', () => ({
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

describe('AppModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should provide InitCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(InitCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(InitCommand);
  });

  it('should provide AgentsCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(AgentsCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(AgentsCommand);
  });

  it('should provide ValidateCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(ValidateCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(ValidateCommand);
  });

  it('should provide DocsCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(DocsCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(DocsCommand);
  });

  it('should provide UpgradeCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(UpgradeCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(UpgradeCommand);
  });

  it('should provide McpServeCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(McpServeCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(McpServeCommand);
  });

  it('should provide ConfigService', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = module.get(ConfigService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ConfigService);
  });

  it('should provide FileManagerService', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = module.get(FileManagerService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(FileManagerService);
  });

  it('should provide SyncService', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = module.get(SyncService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(SyncService);
  });

  it('should provide WatcherService', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = module.get(WatcherService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(WatcherService);
  });

  it('should provide McpServerService', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = module.get(McpServerService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(McpServerService);
  });

  it('should provide SdlcCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(SdlcCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(SdlcCommand);
  });

  it('should provide HandoffCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(HandoffCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(HandoffCommand);
  });

  it('should provide GenerateDomainCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(GenerateDomainCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(GenerateDomainCommand);
  });

  it('should provide ScaffoldCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(ScaffoldCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(ScaffoldCommand);
  });

  it('should provide ADRCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(ADRCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(ADRCommand);
  });

  it('should provide StandardsCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(StandardsCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(StandardsCommand);
  });

  it('should provide CompletionCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(CompletionCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(CompletionCommand);
  });

  it('should provide HistoryCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(HistoryCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(HistoryCommand);
  });

  it('should provide DriftCommand', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const command = module.get(DriftCommand);
    expect(command).toBeDefined();
    expect(command).toBeInstanceOf(DriftCommand);
  });

  it('should be a valid NestJS module', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
    expect(module.get(InitCommand)).toBeDefined();
  });
});
