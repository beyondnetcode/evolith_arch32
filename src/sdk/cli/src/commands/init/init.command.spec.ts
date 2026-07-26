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

jest.mock('@beyondnet/evolith-core-domain/application/services', () => ({
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
import { InitializeProjectUseCase } from '@beyondnet/evolith-core-domain/application/services';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

const mockExecute = jest.fn();
const mockAskInitOptions = jest.fn();

(InitializeProjectUseCase as jest.Mock).mockImplementation(() => ({
  execute: mockExecute,
}));

/**
 * GT-571: stdin drives interactivity. Jest runs with a non-TTY stdin, which is
 * exactly the shape of a CI/agent invocation, so the interactive expectations
 * below have to opt into a TTY explicitly.
 */
const originalStdinTTY = process.stdin.isTTY;
const setStdinTTY = (value: boolean | undefined): void => {
  Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true });
};

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
    command = new InitCommand(catalogLoader, {} as never, new PromptService());
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
    setStdinTTY(originalStdinTTY);
  });

  describe('run', () => {
    beforeEach(() => setStdinTTY(true));

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

  // El camino NO interactivo (`--config` / `--name --yes`) no tenia ninguna
  // prueba: resolveBatchInput y readSetupFile eran ramas muertas para la suite,
  // y son justo las que usa un agente o un script -- el modo en que este comando
  // se invoca fuera de una terminal.
  describe('batch (no interactivo)', () => {
    const os = require('os');
    const nodeFs = require('fs');
    const nodePath = require('path');
    let tmp: string;

    beforeEach(() => {
      tmp = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'evolith-init-batch-'));
    });

    afterEach(() => {
      nodeFs.rmSync(tmp, { recursive: true, force: true });
    });

    const writeConfig = (data: unknown, name = 'setup.json') => {
      const file = nodePath.join(tmp, name);
      nodeFs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
      return file;
    };

    it('no pregunta nada cuando se pasa --name con --yes', async () => {
      await command.executeCommand([], { name: 'batch-proj', yes: true } as never);
      expect(mockAskInitOptions).not.toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'batch-proj' }),
        expect.any(String),
      );
    });

    it('aplica defaults seguros para que un --name --yes minimo no requiera mas flags', async () => {
      await command.executeCommand([], { name: 'defaults-proj', yes: true } as never);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: 'nodejs',
          monorepo: 'none',
          architecture: 'clean',
          database: 'postgresql',
          apiProtocol: 'rest',
          ciCd: 'github-actions',
          observability: 'opentelemetry',
          features: [],
          agents: [],
        }),
        expect.any(String),
      );
    });

    it('cada flag sobreescribe su campo canonico', async () => {
      await command.executeCommand([], {
        name: 'flagged', yes: true,
        runtime: 'dotnet', monorepo: 'nx', arch: 'hexagonal', db: 'mongodb',
      } as never);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'flagged', runtime: 'dotnet', monorepo: 'nx',
          architecture: 'hexagonal', database: 'mongodb',
        }),
        expect.any(String),
      );
    });

    it('lee el proyecto desde un --config sin necesidad de --yes', async () => {
      const file = writeConfig({ name: 'from-file', runtime: 'dotnet' });
      await command.executeCommand([], { config: file } as never);
      expect(mockAskInitOptions).not.toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'from-file', runtime: 'dotnet' }),
        expect.any(String),
      );
    });

    it('los flags ganan sobre el --config cuando ambos definen el mismo campo', async () => {
      const file = writeConfig({ name: 'del-fichero', runtime: 'dotnet' });
      await command.executeCommand([], { config: file, name: 'del-flag' } as never);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'del-flag', runtime: 'dotnet' }),
        expect.any(String),
      );
    });

    it('falla con una ruta accionable si el --config no existe', async () => {
      const missing = nodePath.join(tmp, 'no-existe.json');
      await expect(
        command.executeCommand([], { config: missing } as never),
      ).rejects.toThrow(/Config file not found/);
    });

    it('nombra el fichero y el motivo cuando el --config trae JSON invalido', async () => {
      const file = writeConfig('{ esto no es json', 'roto.json');
      await expect(
        command.executeCommand([], { config: file } as never),
      ).rejects.toThrow(/Invalid JSON in config file/);
    });

    // GT-571: `--yes` sin `--name` ya no es un error; el nombre del proyecto
    // toma por defecto el del directorio destino, como cualquier scaffolder.
    it('sin --name usa el nombre del directorio destino', async () => {
      await command.executeCommand([], { yes: true } as never);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: nodePath.basename(process.cwd()) }),
        expect.any(String),
      );
    });

    it('sin --config ni --yes, y con stdin interactivo, cae al wizard', async () => {
      setStdinTTY(true);
      mockAskInitOptions.mockResolvedValue(null);
      await command.executeCommand([], {} as never);
      expect(mockAskInitOptions).toHaveBeenCalled();
    });

    it('en --format json emite el envelope y calla la salida humana', async () => {
      await command.executeCommand([], {
        name: 'json-proj', yes: true, format: 'json',
      } as never);
      const printed = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).filter((s: string) => s.trim().startsWith('{'));
      expect(printed.length).toBeGreaterThan(0);
      const env = JSON.parse(printed[printed.length - 1]);
      expect(env.success).toBe(true);
      expect(env.meta.command).toBe('evolith init');
    });
  });

  // GT-571: los primeros 60 segundos del producto. `init` escribia en un
  // subdirectorio (el `validate` siguiente apuntaba al padre y disparaba
  // GOV-000), salia 0 al fallar, y en `--format json` con stdin cerrado
  // preguntaba en vez de emitir un envelope.
  describe('quickstart (GT-571)', () => {
    const nodePath = require('path');
    const makeFakeFs = () => ({
      readFile: jest.fn(),
      readFileBuffer: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn(),
      existsSync: jest.fn(),
      readJson: jest.fn(),
      writeJson: jest.fn(),
      mkdir: jest.fn(),
      readdir: jest.fn(),
      readdirNames: jest.fn(),
      copy: jest.fn(),
      ensureDir: jest.fn(),
      ensureFile: jest.fn(),
      stat: jest.fn(),
      remove: jest.fn(),
    });

    const scaffoldFsOf = () =>
      (InitializeProjectUseCase as jest.Mock).mock.calls[
        (InitializeProjectUseCase as jest.Mock).mock.calls.length - 1
      ][0];

    const commandWith = (fs: ReturnType<typeof makeFakeFs>) => {
      const { CatalogLoader } = require('../../infrastructure/catalog/catalog-loader');
      return new InitCommand(new CatalogLoader(), fs as never, new PromptService());
    };

    it('sin destino explicito escribe en el directorio actual, no en un subdirectorio', async () => {
      const fs = makeFakeFs();
      await commandWith(fs).executeCommand([], { name: 'my-sat', yes: true } as never);

      // El caso de uso del dominio siempre compone `${cwd}/${name}`; el CLI lo
      // remapea al destino real antes de que llegue al file system.
      await scaffoldFsOf().writeJson(`${process.cwd()}/my-sat/evolith.yaml`, { a: 1 });
      expect(fs.writeJson).toHaveBeenCalledWith(`${process.cwd()}/evolith.yaml`, { a: 1 });
      expect(fs.writeJson).not.toHaveBeenCalledWith(
        `${process.cwd()}/my-sat/evolith.yaml`,
        expect.anything(),
      );
    });

    it('con un directorio posicional escribe dentro de ese directorio', async () => {
      const fs = makeFakeFs();
      await commandWith(fs).executeCommand(['sub-dir'], { name: 'my-sat', yes: true } as never);

      await scaffoldFsOf().ensureDir(`${process.cwd()}/my-sat`);
      expect(fs.ensureDir).toHaveBeenCalledWith(nodePath.resolve(process.cwd(), 'sub-dir'));
    });

    it('--dir es equivalente al argumento posicional', async () => {
      const fs = makeFakeFs();
      await commandWith(fs).executeCommand([], { dir: 'otro', name: 'my-sat', yes: true } as never);

      await scaffoldFsOf().writeFile(`${process.cwd()}/my-sat/README.md`, 'x');
      expect(fs.writeFile).toHaveBeenCalledWith(
        `${nodePath.resolve(process.cwd(), 'otro')}/README.md`,
        'x',
      );
    });

    it('el nombre del proyecto por defecto es el del directorio destino', async () => {
      await command.executeCommand(['un-satelite'], { yes: true } as never);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'un-satelite' }),
        expect.any(String),
      );
    });

    it('con stdin no interactivo no pregunta nada aunque falte --yes', async () => {
      setStdinTTY(false);
      await command.executeCommand([], {} as never);
      expect(mockAskInitOptions).not.toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('--format json nunca pregunta, ni siquiera con TTY', async () => {
      setStdinTTY(true);
      await command.executeCommand([], { format: 'json' } as never);
      expect(mockAskInitOptions).not.toHaveBeenCalled();
    });

    it('--format json emite exactamente un envelope y nada mas en stdout', async () => {
      setStdinTTY(false);
      const writeSpy = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
      try {
        await command.executeCommand([], { name: 'json-only', yes: true, format: 'json' } as never);
        expect(writeSpy).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledTimes(1);
        const env = JSON.parse(String(logSpy.mock.calls[0][0]));
        expect(env.success).toBe(true);
        expect(env.data.targetDir).toBe(process.cwd());
        expect(env.data.nextSteps).toContain('evolith validate');
      } finally {
        writeSpy.mockRestore();
      }
    });

    it('un fallo de inicializacion sale con codigo distinto de cero', async () => {
      mockExecute.mockResolvedValue({
        success: false, artifacts: [], warnings: [], errors: ['Runtime nope not found'],
      });

      await command.executeCommand([], { name: 'boom', yes: true } as never);

      expect(process.exitCode).toBe(1);
    });

    it('un fallo en --format json emite un envelope de error, no uno de exito', async () => {
      mockExecute.mockResolvedValue({
        success: false, artifacts: [], warnings: [], errors: ['Runtime nope not found'],
      });

      await command.executeCommand([], { name: 'boom', yes: true, format: 'json' } as never);

      expect(process.exitCode).toBe(1);
      const env = JSON.parse(String(logSpy.mock.calls[0][0]));
      expect(env.success).toBe(false);
      expect(env.error.code).toBe('INTERNAL_ERROR');
      expect(env.error.details.errors).toEqual(['Runtime nope not found']);
    });

    it('dice donde inicializo y cual es el siguiente comando', async () => {
      mockExecute.mockResolvedValue({
        success: true, artifacts: ['my-sat/evolith.yaml'], warnings: [], errors: [],
      });

      await command.executeCommand([], { name: 'my-sat', yes: true } as never);

      expect(p.log.info).toHaveBeenCalledWith(expect.stringContaining(process.cwd()));
      // Los artefactos se reportan relativos al destino real, sin el prefijo
      // `my-sat/` que asume un subdirectorio inexistente.
      expect(p.log.info).toHaveBeenCalledWith(expect.stringContaining('    - evolith.yaml'));
      expect(p.log.info).not.toHaveBeenCalledWith(expect.stringContaining('my-sat/evolith.yaml'));
      const printed = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(printed).toContain('evolith validate');
      expect(printed).not.toContain('cd my-sat');
    });

    it('--dry-run no escribe nada pero sigue reportando los artefactos', async () => {
      const fs = makeFakeFs();
      await commandWith(fs).executeCommand([], { name: 'my-sat', yes: true, dryRun: true } as never);

      // El caso de uso recibe un sumidero que no escribe: ni siquiera crea el
      // directorio destino, que ahora es el directorio del usuario.
      const scaffoldFs = scaffoldFsOf();
      await scaffoldFs.ensureDir(`${process.cwd()}/my-sat`);
      await scaffoldFs.writeJson(`${process.cwd()}/my-sat/evolith.yaml`, {});
      expect(fs.ensureDir).not.toHaveBeenCalled();
      expect(fs.writeJson).not.toHaveBeenCalled();
    });

    it('cuando hay subdirectorio, el siguiente paso incluye el cd', async () => {
      await command.executeCommand(['sub-dir'], { yes: true } as never);
      const printed = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(printed).toContain('cd sub-dir');
      expect(printed).toContain('evolith validate');
    });
  });
});
