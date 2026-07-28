import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ScaffoldCommand } from './scaffold.command';
import * as p from '@clack/prompts';
import { NxWorkspaceStrategy } from '@beyondnet/evolith-infra-providers';
import { commandExecutor } from '../../infrastructure/cli/command-executor';

jest.mock('@clack/prompts');
// NxWorkspaceStrategy was relocated to @beyondnet/evolith-infra-providers; the
// scaffold command imports only that symbol from the package, so a factory mock
// providing just NxWorkspaceStrategy is sufficient and avoids auto-mocking the
// whole package.
jest.mock('@beyondnet/evolith-infra-providers', () => ({ NxWorkspaceStrategy: jest.fn() }));

const mockStrategy = {
  installDependencies: jest.fn().mockResolvedValue(undefined),
  generateApiApp: jest.fn().mockResolvedValue(undefined),
  generateStandardWebApp: jest.fn().mockResolvedValue(undefined),
  generateHostApp: jest.fn().mockResolvedValue(undefined),
  generateLibrary: jest.fn().mockResolvedValue(undefined),
};

const mockSelect = p.select as jest.Mock;
const mockText = p.text as jest.Mock;
const mockMultiselect = p.multiselect as jest.Mock;
const mockSpinner = p.spinner as jest.Mock;
const mockIntro = p.intro as jest.Mock;
const mockOutro = p.outro as jest.Mock;

const mockSpinnerInstance = {
  start: jest.fn(),
  message: jest.fn(),
  stop: jest.fn(),
};

describe('ScaffoldCommand', () => {
  let command: ScaffoldCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    (NxWorkspaceStrategy as jest.Mock).mockImplementation(() => mockStrategy);
    mockSpinner.mockReturnValue(mockSpinnerInstance);
    command = new ScaffoldCommand();
    // By default assume a valid Nx workspace so the pre-spawn guard passes; the
    // dedicated guard test below overrides this to exercise the failure path.
    jest.spyOn(command as any, 'checkWorkspace').mockReturnValue(undefined);
  });

  describe('run', () => {
    it('should scaffold phase 1 architecture with react and prisma', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('1');
      mockText
        .mockResolvedValueOnce('tracker-api')
        .mockResolvedValueOnce('tracker-web');
      mockMultiselect.mockResolvedValue(['discovery', 'design']);

      await command.run([], {});

      expect(mockIntro).toHaveBeenCalled();
      expect(mockStrategy.installDependencies).toHaveBeenCalledWith('react', 'prisma');
      expect(mockStrategy.generateApiApp).toHaveBeenCalledWith('tracker-api');
      expect(mockStrategy.generateStandardWebApp).toHaveBeenCalledWith('tracker-web', 'react');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('workflow-engine', 'shell');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('integration-fabric', 'shell');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('tenant-config', 'shell');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('discovery', 'domain');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('design', 'domain');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('db-schema', 'shared');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('mocks', 'shared');
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith('Andamiaje arquitectónico completado exitosamente.');
      expect(mockOutro).toHaveBeenCalled();
    });

    it('should scaffold phase 3 architecture with angular and typeorm', async () => {
      mockSelect
        .mockResolvedValueOnce('angular')
        .mockResolvedValueOnce('typeorm')
        .mockResolvedValueOnce('3');
      mockText
        .mockResolvedValueOnce('my-api')
        .mockResolvedValueOnce('my-host')
        .mockResolvedValueOnce('remote1, remote2');
      mockMultiselect.mockResolvedValue(['qa', 'release']);

      await command.run([], {});

      expect(mockStrategy.installDependencies).toHaveBeenCalledWith('angular', 'typeorm');
      expect(mockStrategy.generateApiApp).toHaveBeenCalledWith('my-api');
      expect(mockStrategy.generateHostApp).toHaveBeenCalledWith('my-host', ['remote1', 'remote2'], 'angular');
      expect(mockStrategy.generateStandardWebApp).not.toHaveBeenCalled();
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('qa', 'domain');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('release', 'domain');
    });

    it('should use provided options instead of prompting', async () => {
      mockSelect.mockResolvedValueOnce('2');
      mockText
        .mockResolvedValueOnce('opt-api')
        .mockResolvedValueOnce('opt-host')
        .mockResolvedValueOnce('remoteA');
      mockMultiselect.mockResolvedValue(['construction']);

      await command.run([], { frontend: 'react', orm: 'prisma' });

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockStrategy.installDependencies).toHaveBeenCalledWith('react', 'prisma');
    });

    it('should handle phase 2 with host app and remotes', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('2');
      mockText
        .mockResolvedValueOnce('api-v2')
        .mockResolvedValueOnce('host-app')
        .mockResolvedValueOnce('remote-x, remote-y, remote-z');
      mockMultiselect.mockResolvedValue(['design', 'construction', 'qa']);

      await command.run([], {});

      expect(mockStrategy.generateHostApp).toHaveBeenCalledWith(
        'host-app',
        ['remote-x', 'remote-y', 'remote-z'],
        'react',
      );
      expect(mockStrategy.generateStandardWebApp).not.toHaveBeenCalled();
    });

    it('should handle error during scaffolding', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('1');
      mockText
        .mockResolvedValueOnce('error-api')
        .mockResolvedValueOnce('error-web');
      mockMultiselect.mockResolvedValue(['discovery']);
      mockStrategy.installDependencies.mockRejectedValueOnce(new Error('Install failed'));

      await expect(command.run([], {})).rejects.toThrow('Install failed');

      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith('Command failed.');
      expect(mockOutro).toHaveBeenCalled();
    });

    it('should filter empty remote names', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('3');
      mockText
        .mockResolvedValueOnce('api')
        .mockResolvedValueOnce('host')
        .mockResolvedValueOnce(', remote1, , remote2, ');
      mockMultiselect.mockResolvedValue(['discovery']);

      await command.run([], {});

      expect(mockStrategy.generateHostApp).toHaveBeenCalledWith(
        'host',
        ['remote1', 'remote2'],
        'react',
      );
    });

    it('should generate all shell libraries', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('1');
      mockText
        .mockResolvedValueOnce('api')
        .mockResolvedValueOnce('web');
      mockMultiselect.mockResolvedValue(['discovery']);

      await command.run([], {});

      const shellCalls = mockStrategy.generateLibrary.mock.calls.filter(
        (call: string[]) => call[1] === 'shell',
      );
      expect(shellCalls).toHaveLength(3);
      expect(shellCalls.map((c: string[]) => c[0])).toContain('workflow-engine');
      expect(shellCalls.map((c: string[]) => c[0])).toContain('integration-fabric');
      expect(shellCalls.map((c: string[]) => c[0])).toContain('tenant-config');
    });

    it('should generate shared libraries', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('1');
      mockText
        .mockResolvedValueOnce('api')
        .mockResolvedValueOnce('web');
      mockMultiselect.mockResolvedValue(['discovery']);

      await command.run([], {});

      const sharedCalls = mockStrategy.generateLibrary.mock.calls.filter(
        (call: string[]) => call[1] === 'shared',
      );
      expect(sharedCalls).toHaveLength(2);
      expect(sharedCalls.map((c: string[]) => c[0])).toContain('db-schema');
      expect(sharedCalls.map((c: string[]) => c[0])).toContain('mocks');
    });
  });

  describe('parseFrontend', () => {
    it('should return the provided value', () => {
      expect(command.parseFrontend('react')).toBe('react');
      expect(command.parseFrontend('angular')).toBe('angular');
    });
  });

  describe('parseOrm', () => {
    it('should return the provided value', () => {
      expect(command.parseOrm('prisma')).toBe('prisma');
      expect(command.parseOrm('typeorm')).toBe('typeorm');
    });
  });

  describe('parseFormat', () => {
    it('should return the provided value', () => {
      expect(command.parseFormat('json')).toBe('json');
      expect(command.parseFormat('human')).toBe('human');
    });
  });

  describe('parsePhase', () => {
    it('should return the provided value', () => {
      expect(command.parsePhase('1')).toBe('1');
      expect(command.parsePhase('3')).toBe('3');
    });
  });

  describe('--format json (ADR-0073 envelope)', () => {
    let logSpy: jest.SpyInstance;
    let exitSpy: jest.SpyInstance;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
      logSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should emit success envelope with scaffold config', async () => {
      await command.run([], {
        format: 'json',
        frontend: 'react',
        orm: 'prisma',
        phase: '1',
        apiName: 'my-api',
        webAppName: 'my-web',
        domains: ['discovery'],
      });

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === true; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual(expect.objectContaining({
        frontendFramework: 'react',
        orm: 'prisma',
        phase: '1',
        apiName: 'my-api',
      }));
      expect(envelope.meta.command).toBe('evolith architecture scaffold');
      expect(envelope.meta.schemaVersion).toBe('1.0.0');
    });

    it('should emit error envelope when required options are missing', async () => {
      await command.run([], { format: 'json' });

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === false; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(false);
      expect(envelope.error.code).toBe('VALIDATION_FAILED');
      expect(envelope.error.message).toContain('--frontend');
    });

    it('should emit an actionable NOT_A_SATELLITE envelope when no workspace exists', async () => {
      (command as any).checkWorkspace.mockReturnValue(
        'No workspace found at /x/src. Run `evolith-cli init` first.',
      );

      await command.run([], { format: 'json', frontend: 'react', orm: 'prisma', phase: '1' });

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === false; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(false);
      expect(envelope.error.code).toBe('NOT_A_SATELLITE');
      expect(envelope.error.message).toContain('evolith-cli init');
      // The guard must short-circuit before any strategy work.
      expect(mockStrategy.installDependencies).not.toHaveBeenCalled();
    });

    it('should emit error envelope on strategy failure', async () => {
      mockStrategy.installDependencies.mockRejectedValueOnce(new Error('npm failed'));

      await command.run([], {
        format: 'json',
        frontend: 'angular',
        orm: 'typeorm',
        phase: '1',
      });

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === false; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(false);
      expect(envelope.error.code).toBe('INTERNAL_ERROR');
      expect(envelope.error.message).toBe('npm failed');
    });
  });

  // GT-455: the .NET runtime path is Node-independent (no Nx strategy). These
  // tests exercise the generation logic in --dry-run so they never require the
  // .NET SDK on PATH — dry-run short-circuits `ensureAvailable()` and every
  // `dotnet` shell-out, and skips the `mkdirSync`.
  describe('--runtime dotnet (GT-455)', () => {
    let logSpy: jest.SpyInstance;
    let execSpy: jest.SpyInstance;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      execSpy = jest.spyOn(commandExecutor, 'executeOrThrow').mockResolvedValue('');
    });

    afterEach(() => {
      logSpy.mockRestore();
      execSpy.mockRestore();
    });

    const findEnvelope = (predicate: (e: any) => boolean) =>
      JSON.parse(
        logSpy.mock.calls.find((c: any[]) => {
          try { return predicate(JSON.parse(c[0])); } catch { return false; }
        })![0],
      );

    it('parseRuntime returns the provided value', () => {
      expect(command.parseRuntime('dotnet')).toBe('dotnet');
      expect(command.parseRuntime('nodejs')).toBe('nodejs');
    });

    it('emits a .NET success envelope with the hexagonal projects and bounded contexts', async () => {
      await command.run([], {
        runtime: 'dotnet',
        dryRun: true,
        format: 'json',
        apiName: 'mms-api',
        phase: '1',
        domains: 'billing,catalog',
      });

      const envelope = findEnvelope((e) => e.success === true);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual(
        expect.objectContaining({
          status: 'dry-run',
          runtime: 'dotnet',
          apiName: 'mms-api',
          base: 'Mms',
          phase: '1',
          path: 'src/apps/mms-api',
          projects: ['Domain', 'Application', 'Infrastructure', 'Presentation'],
          contexts: ['Mms.Billing', 'Mms.Catalog'],
        }),
      );
      expect(envelope.meta.command).toBe('evolith architecture scaffold');

      // Dry-run must not shell out to `dotnet` (so it needs no .NET SDK).
      expect(execSpy).not.toHaveBeenCalled();
    });

    it('accepts the progressive-axis id alias for --phase', async () => {
      await command.run([], {
        runtime: 'dotnet',
        dryRun: true,
        format: 'json',
        apiName: 'tracker-api',
        phase: 'microservices',
      });

      const envelope = findEnvelope((e) => e.success === true);
      expect(envelope.data.phase).toBe('3');
      expect(envelope.data.contexts).toEqual([]);
    });

    it('emits an error envelope for an unknown --phase', async () => {
      await command.run([], {
        runtime: 'dotnet',
        dryRun: true,
        format: 'json',
        apiName: 'mms-api',
        phase: 'bogus',
      });

      const envelope = findEnvelope((e) => e.success === false);
      expect(envelope.success).toBe(false);
      expect(envelope.error.code).toBe('INTERNAL_ERROR');
      expect(envelope.error.message).toContain('Unknown --phase');
    });
  });

  // El camino `--format json` concentraba la mayoria de las ramas sin cubrir:
  // validacion de flags obligatorios, normalizacion de --phase, la bifurcacion
  // phase 1 (web standard) frente a 2/3 (host + remotes), los dominios opcionales
  // y el guard de workspace. Es el modo por el que un agente scaffoldea.
  describe('--format json', () => {
    let logSpy: jest.SpyInstance;
    let exitSpy: jest.SpyInstance;

    const envelopes = () =>
      logSpy.mock.calls
        .map((c: unknown[]) => String(c[0]))
        .filter((s: string) => s.trim().startsWith('{'))
        .map((s: string) => JSON.parse(s));

    const env = () => {
      const all = envelopes();
      expect(all.length).toBeGreaterThan(0);
      return all[all.length - 1];
    };

    // Con `process.exit` stubeado la ejecucion NO se detiene: el comando sigue y
    // puede emitir un segundo envelope (normalmente el INTERNAL_ERROR del catch,
    // al operar sobre los datos que la validacion acababa de rechazar). Los tests
    // de camino de error deben mirar el PRIMER envelope, que es el que el proceso
    // real habria emitido antes de morir.
    const firstEnv = () => {
      const all = envelopes();
      expect(all.length).toBeGreaterThan(0);
      return all[0];
    };

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      // El comando llama process.exit(1) en sus caminos de error; sin stub, jest
      // matarian el worker.
      exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
      logSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('exige --frontend, --orm y --phase, y dice cuales', async () => {
      await command.executeCommand([], { format: 'json', dryRun: true } as never);
      const e = firstEnv();
      expect(e.success).toBe(false);
      expect(e.error.message).toMatch(/--frontend, --orm, and --phase are required/);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('rechaza un --phase desconocido enumerando los validos', async () => {
      await command.executeCommand([], {
        format: 'json', dryRun: true, frontend: 'react', orm: 'prisma', phase: 'inventada',
      } as never);
      const e = firstEnv();
      expect(e.success).toBe(false);
      expect(e.error.message).toMatch(/modular-monolith, distributed-modules, microservices/);
    });

    it('phase 1 genera la web app standard, no el host', async () => {
      await command.executeCommand([], {
        format: 'json', dryRun: true, frontend: 'react', orm: 'prisma', phase: '1',
      } as never);
      expect(mockStrategy.generateStandardWebApp).toHaveBeenCalled();
      expect(mockStrategy.generateHostApp).not.toHaveBeenCalled();
      expect(env().data.status).toBe('dry-run');
    });

    it('phase 2 genera el host y parsea los remotes separados por coma', async () => {
      await command.executeCommand([], {
        format: 'json', dryRun: true, frontend: 'react', orm: 'prisma', phase: '2',
        remotes: 'uno, dos ,, tres',
      } as never);
      expect(mockStrategy.generateHostApp).toHaveBeenCalledWith(
        'tracker-host', ['uno', 'dos', 'tres'], 'react',
      );
      expect(mockStrategy.generateStandardWebApp).not.toHaveBeenCalled();
    });

    it('acepta el id del eje progresivo ademas del numero', async () => {
      await command.executeCommand([], {
        format: 'json', dryRun: true, frontend: 'react', orm: 'prisma',
        phase: 'modular-monolith',
      } as never);
      expect(env().data.phase).toBe('1');
    });

    it('genera una libreria de dominio por cada --domains', async () => {
      await command.executeCommand([], {
        format: 'json', dryRun: true, frontend: 'react', orm: 'prisma', phase: '1',
        domains: ['billing', 'identity'],
      } as never);
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('billing', 'domain');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('identity', 'domain');
      expect(env().data.domains).toEqual(['billing', 'identity']);
    });

    it('un fallo de la estrategia sale como INTERNAL_ERROR, no como crash', async () => {
      mockStrategy.generateApiApp.mockRejectedValueOnce(new Error('nx no disponible'));
      await command.executeCommand([], {
        format: 'json', dryRun: true, frontend: 'react', orm: 'prisma', phase: '1',
      } as never);
      const e = env();
      expect(e.success).toBe(false);
      expect(e.error.code).toBe('INTERNAL_ERROR');
      expect(e.error.message).toMatch(/nx no disponible/);
    });

    it('sin workspace Nx falla como NOT_A_SATELLITE en vez de un spawn ENOENT', async () => {
      jest.spyOn(command as never as { checkWorkspace: () => string }, 'checkWorkspace')
        .mockReturnValue('No Nx workspace found at <cwd>/src');
      await command.executeCommand([], {
        format: 'json', frontend: 'react', orm: 'prisma', phase: '1',
      } as never);
      const e = env();
      expect(e.success).toBe(false);
      expect(e.error.code).toBe('NOT_A_SATELLITE');
    });
  });

  // ---------------------------------------------------------------------------
  // GT-626 — the precondition must be TRUE and its advice must be ACTIONABLE.
  //
  // These run against a REAL temporary directory and deliberately do NOT mock
  // `checkWorkspace`: mocking it everywhere else in this file is what let the
  // guard drift from what the Nx strategy actually needs.
  // ---------------------------------------------------------------------------
  describe('checkWorkspace (GT-626)', () => {
    let tmp: string;
    let previousCwd: string;

    const call = (): string | undefined =>
      (new ScaffoldCommand() as unknown as { checkWorkspace(): string | undefined }).checkWorkspace();

    beforeEach(() => {
      previousCwd = process.cwd();
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gt626-'));
    });

    afterEach(() => {
      process.chdir(previousCwd);
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('rejects a bare package.json in src/, which is NOT an Nx workspace', () => {
      // The false accept. `nx` needs `nx.json`; with only a package.json the
      // generator died inside Nx with "Cannot read properties of null (reading
      // 'useInferencePlugins')" AFTER a minutes-long dependency install.
      fs.mkdirSync(path.join(tmp, 'src'));
      fs.writeFileSync(path.join(tmp, 'src', 'package.json'), '{"name":"x"}');
      process.chdir(tmp);

      expect(call()).toContain('is not an Nx workspace');
    });

    it('rejects the tree `init` leaves behind, and does not tell the user to re-run init', () => {
      // Exactly what the README quickstart produces at step 2: manifest at the
      // project root, `src/` empty. Step 5 cannot work here — but the message
      // must say something the user can act on, not name the command they just ran.
      fs.writeFileSync(path.join(tmp, 'package.json'), '{"name":"my-sat"}');
      fs.mkdirSync(path.join(tmp, 'src'));
      process.chdir(tmp);

      const message = call();
      expect(message).toContain('is not an Nx workspace');
      expect(message).toContain('create-nx-workspace');
      expect(message).toContain('does not create one');
    });

    it('accepts a real Nx workspace in src/', () => {
      fs.mkdirSync(path.join(tmp, 'src'));
      fs.writeFileSync(path.join(tmp, 'src', 'nx.json'), '{}');
      process.chdir(tmp);

      expect(call()).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // GT-626 — every declared flag must be authoritative.
  //
  // `--phase` was declared, documented and prompted for UNCONDITIONALLY, so the
  // flag was silently discarded while `--frontend` and `--orm` right above it
  // were honoured. On a non-TTY that turned every scripted run into exit 3.
  // ---------------------------------------------------------------------------
  describe('flag precedence (GT-626)', () => {
    const resolve = (provided: unknown, interactive: boolean) => {
      const cmd = new ScaffoldCommand() as unknown as {
        promptService: { isInteractive(): boolean; text(o: unknown): Promise<string> };
        resolveWithDefault(p: unknown, o: { message: string; defaultValue: string }): Promise<string>;
      };
      cmd.promptService.isInteractive = () => interactive;
      cmd.promptService.text = jest.fn().mockResolvedValue('FROM-PROMPT') as never;
      return cmd.resolveWithDefault(provided, { message: 'm', defaultValue: 'tracker-api' });
    };

    it('an explicit flag wins over both the prompt and the default', async () => {
      await expect(resolve('my-api', true)).resolves.toBe('my-api');
    });

    it('falls back to the DOCUMENTED default instead of refusing on a non-TTY', async () => {
      // The friction this removes: exit 3 must mean "this run needs a decision",
      // never "you did not retype a value we would have defaulted to".
      await expect(resolve(undefined, false)).resolves.toBe('tracker-api');
    });

    it('still asks a human when there is one', async () => {
      await expect(resolve(undefined, true)).resolves.toBe('FROM-PROMPT');
    });
  });
});
