import { Logger } from '@nestjs/common';
import { BaseEvolithCommand } from './base-command';
import { PromptService } from '../prompts/prompt.service';
import { ConfigService } from '../config/config.service';
import { UserCancelledError } from '@beyondnet/evolith-core-domain/domain/errors';

/**
 * GT-562 — `BaseEvolithCommand.run`/`handleError` is the single place every CLI
 * command's failure passes through. Its branches decide THREE contracts:
 *
 *   1. the process exit code (CI's only signal that a command failed),
 *   2. whether stdout carries a parseable ADR-0073 error envelope in JSON mode,
 *   3. how a missing ruleset corpus is CLASSIFIED (`RULESET_NOT_FOUND` vs the
 *      catch-all `INTERNAL_ERROR`) so CLI/MCP/REST agree.
 *
 * All of it was uncovered. A regression here is silent by construction: the
 * command still "runs", it just stops reporting that it failed.
 */

class ThrowingCommand extends BaseEvolithCommand {
  constructor(
    private readonly error: unknown,
    promptService: PromptService,
    configService: ConfigService,
  ) {
    super('ThrowingCommand', promptService, configService);
  }

  async executeCommand(): Promise<void> {
    throw this.error;
  }
}

class SucceedingCommand extends BaseEvolithCommand {
  public seen: { inputs: string[]; options?: Record<string, unknown> } | undefined;

  constructor(promptService: PromptService, configService: ConfigService) {
    super('SucceedingCommand', promptService, configService);
  }

  async executeCommand(inputs: string[], options?: Record<string, unknown>): Promise<void> {
    this.seen = { inputs, options };
  }
}

function buildPromptService(): PromptService {
  const svc = new PromptService();
  jest.spyOn(svc, 'showError').mockReturnValue(undefined);
  jest.spyOn(svc, 'showOutro').mockReturnValue(undefined);
  jest.spyOn(svc, 'stopSpinner').mockReturnValue(undefined);
  return svc;
}

describe('BaseEvolithCommand', () => {
  let promptService: PromptService;
  let configService: ConfigService;
  let logSpy: jest.SpyInstance;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    promptService = buildPromptService();
    configService = new ConfigService();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    // Silence the Nest logger the base class writes the failure through.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
  });

  it('passes inputs and options through to executeCommand and leaves the exit code clean on success', async () => {
    const command = new SucceedingCommand(promptService, configService);

    await command.run(['alpha'], { format: 'json' });

    expect(command.seen).toEqual({ inputs: ['alpha'], options: { format: 'json' } });
    expect(process.exitCode).toBeUndefined();
  });

  it('treats a user cancellation as a non-failure: no error surface, no non-zero exit code', async () => {
    const command = new ThrowingCommand(new UserCancelledError('aborted'), promptService, configService);

    // Must NOT throw — cancelling an interactive prompt is not a command failure.
    await expect(command.run([], {})).resolves.toBeUndefined();

    expect(process.exitCode).toBeUndefined();
    expect(promptService.showError).not.toHaveBeenCalled();
  });

  describe('human (non-JSON) failure mode', () => {
    it('reports the error, stops the spinner and sets exit code 1 while re-throwing', async () => {
      const command = new ThrowingCommand(new Error('boom'), promptService, configService);

      await expect(command.run([], {})).rejects.toThrow('boom');

      // nest-commander swallows a thrown error and still exits 0, so the
      // explicit exit code is the only thing CI can observe.
      expect(process.exitCode).toBe(1);
      expect(promptService.stopSpinner).toHaveBeenCalledWith('Command failed.');
      expect(promptService.showError).toHaveBeenCalledWith('Error: boom');
      expect(promptService.showOutro).toHaveBeenCalledWith('Failed');
    });

    it('wraps a non-Error throwable in an Error carrying its stringified message', async () => {
      const command = new ThrowingCommand('plain string failure', promptService, configService);

      await expect(command.run([], {})).rejects.toThrow('plain string failure');

      expect(promptService.showError).toHaveBeenCalledWith('Error: plain string failure');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('JSON failure mode (ADR-0073 machine contract)', () => {
    it('emits a single parseable error envelope on stdout and sets exit code 1 without throwing', async () => {
      const command = new ThrowingCommand(new Error('boom'), promptService, configService);

      // JSON mode must NOT re-throw: the envelope IS the report.
      await expect(command.run([], { format: 'json' })).resolves.toBeUndefined();

      expect(logSpy).toHaveBeenCalledTimes(1);
      const envelope = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(envelope.error.code).toBe('INTERNAL_ERROR');
      expect(envelope.error.message).toBe('boom');
      expect(process.exitCode).toBe(1);

      // The human surface must stay silent so stdout remains a lone envelope.
      expect(promptService.showError).not.toHaveBeenCalled();
    });

    it('classifies a missing ruleset corpus as RULESET_NOT_FOUND rather than INTERNAL_ERROR', async () => {
      // Matched by error NAME, so the base class need not import the infra type.
      const notFound = new Error('no rulesets at /nowhere');
      notFound.name = 'RulesetsNotFoundError';
      const command = new ThrowingCommand(notFound, promptService, configService);

      await command.run([], { format: 'json' });

      const envelope = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(envelope.error.code).toBe('RULESET_NOT_FOUND');
      expect(envelope.error.message).toBe('no rulesets at /nowhere');
    });

    it('stamps the envelope with the command name, a correlation id and a schema version', async () => {
      const command = new ThrowingCommand(new Error('boom'), promptService, configService);

      await command.run([], { format: 'json' });

      const envelope = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(envelope.meta.command).toBe('ThrowingCommand');
      expect(envelope.meta.correlationId).toEqual(expect.any(String));
      expect(envelope.meta.schemaVersion).toBeDefined();
      expect(() => new Date(envelope.meta.executedAt).toISOString()).not.toThrow();
    });

    it('does not take the JSON path for a non-json format, so `--format table` still throws', async () => {
      const command = new ThrowingCommand(new Error('boom'), promptService, configService);

      await expect(command.run([], { format: 'table' })).rejects.toThrow('boom');

      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  it('exposes the profile from the injected ConfigService', () => {
    const command = new SucceedingCommand(promptService, configService);
    jest.spyOn(configService, 'getProfile').mockReturnValue({ core: '/some/core' } as never);

    expect(command.profile).toEqual({ core: '/some/core' });
  });

  it('falls back to default collaborators when none are injected', async () => {
    // The zero-arg construction path is what nest-commander uses for commands
    // that declare no dependencies; it must not produce an undefined service.
    class BareCommand extends BaseEvolithCommand {
      constructor() {
        super('BareCommand');
      }
      async executeCommand(): Promise<void> {
        /* no-op */
      }
    }
    const command = new BareCommand();

    expect(command['promptService']).toBeInstanceOf(PromptService);
    expect(command['configService']).toBeInstanceOf(ConfigService);
  });
});
