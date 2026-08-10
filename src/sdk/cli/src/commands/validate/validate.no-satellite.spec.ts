/**
 * GT-664 — `evolith validate` with no satellite must stop before it scans.
 *
 * ADR-0109 ends its resolution order at `cwd`: "a command that then finds no
 * evolith.yaml reports that itself". `validate` did not report it — it validated
 * the working directory anyway and reported ~400 rules failing against a
 * directory that is not a satellite, which reads as a governance finding and is
 * not one.
 *
 * That was merely useless while every `enforce:` rule was inert. Once the
 * enforcer subsystem was reconnected (same gap), the same path spawns external
 * analysers over whatever tree it landed on — so a wrong invocation became a
 * repository-wide scan. Measured on this repository: 28 s on two CPUs, against
 * 1.2 s with the analysers unreachable.
 *
 * Two things are pinned here: nothing is spawned, and nothing is even resolved —
 * the corpus resolver is never reached, so the operator is told what is actually
 * wrong instead of being told to pass `--core`.
 */

const resolveSatelliteDetailedMock = jest.fn();
const resolveRulesetsMock = jest.fn();

jest.mock('../../infrastructure/paths/satellite-resolver', () => ({
  resolveSatelliteDetailed: (...args: unknown[]) => resolveSatelliteDetailedMock(...args),
}));

jest.mock('../../infrastructure/paths/rulesets-resolver', () => ({
  resolveRulesets: (...args: unknown[]) => resolveRulesetsMock(...args),
}));

jest.mock('@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case', () => ({
  ValidateSatelliteUseCase: jest.fn().mockImplementation(() => ({ execute: jest.fn() })),
}));

jest.mock('@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service', () => ({
  RulesetValidatorService: jest.fn().mockImplementation(() => ({
    validate: jest.fn(),
    validateArchitecture: jest.fn(),
    loadRulesetById: jest.fn(),
  })),
}));

jest.mock('../../infrastructure/prompts/prompt.service', () => ({
  PromptService: jest.fn().mockImplementation(() => ({
    showIntro: jest.fn(),
    showOutro: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    startSpinner: jest.fn(),
    stopSpinner: jest.fn(),
  })),
}));

jest.mock('../../infrastructure/observability', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { ValidateCommand } from './validate.command';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { CLI_EXIT_CODES } from '../../infrastructure/cli/exit-codes';

const mockExecute = jest.fn();
(ValidateSatelliteUseCase as jest.Mock).mockImplementation(() => ({ execute: mockExecute }));

/** What `process.exit` does for real: it does not come back. */
class ProcessExited extends Error {
  constructor(readonly code: number) {
    super(`process.exit(${code})`);
    this.name = 'ProcessExited';
  }
}

/** Run the command, absorbing the simulated exit so the assertions can run. */
async function runExpectingExit(fn: () => Promise<void>): Promise<number> {
  try {
    await fn();
  } catch (error: unknown) {
    if (error instanceof ProcessExited) return error.code;
    throw error;
  }
  throw new Error('expected the command to exit, but it returned normally');
}

describe('ValidateCommand — no satellite (GT-664)', () => {
  let command: ValidateCommand;
  let prompt: jest.Mocked<PromptService>;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    prompt = new PromptService() as jest.Mocked<PromptService>;
    command = new ValidateCommand(
      new ValidateSatelliteUseCase() as never,
      new RulesetValidatorService() as never,
      prompt,
    );
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    // The stub THROWS rather than returning, because "nothing downstream ran"
    // is the assertion that matters here and a stub that simply returns lets
    // execution fall through into exactly the work the guard exists to prevent.
    // A stub that returns would make this suite pass while the guard did
    // nothing.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ProcessExited(Number(code ?? 0));
    }) as never);
    resolveRulesetsMock.mockReturnValue({
      coreRoot: '/bundled-core',
      rulesetsRoot: '/bundled-core/rulesets',
      source: 'bundled',
    });
    mockExecute.mockResolvedValue({
      result: {
        status: 'passed', rulesChecked: 5, issues: [],
        coreRef: { version: '1.0.0', path: null }, timestamp: new Date().toISOString(),
      },
    });
  });

  afterEach(() => jest.restoreAllMocks());

  describe('when resolution fell through to the terminal cwd fallback', () => {
    beforeEach(() => {
      resolveSatelliteDetailedMock.mockReturnValue({ path: '/some/where', source: 'cwd' });
    });

    it('exits 1 (NOT_A_SATELLITE) without resolving a corpus or evaluating anything', async () => {
      const code = await runExpectingExit(() => command.executeCommand([], {}));

      expect(code).toBe(CLI_EXIT_CODES.TOOL_FAILURE);
      expect(exitSpy).toHaveBeenCalledWith(CLI_EXIT_CODES.TOOL_FAILURE);
      // Nothing downstream ran: no corpus resolution, no evaluation, no spawn.
      expect(resolveRulesetsMock).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('names the missing satellite rather than blaming the Core path', async () => {
      await runExpectingExit(() => command.executeCommand([], {}));

      const message = String((prompt.showError as jest.Mock).mock.calls[0][0]);
      expect(message).toMatch(/No satellite to validate/);
      expect(message).toMatch(/--satellite/);
      // GT-662's lesson, applied to the sibling case: a red pointing at the
      // wrong file is worse than no red. This one must not send the operator
      // after `--core`.
      expect(message).not.toMatch(/--core/);
    });

    it('emits an ADR-0073 error envelope in --format json instead of an empty stdout', async () => {
      await runExpectingExit(() => command.executeCommand([], { format: 'json' }));

      const envelope = JSON.parse(String(logSpy.mock.calls[0][0]));
      expect(envelope.success).toBe(false);
      expect(envelope.error.code).toBe('NOT_A_SATELLITE');
      expect(exitSpy).toHaveBeenCalledWith(CLI_EXIT_CODES.TOOL_FAILURE);
    });
  });

  describe.each(['explicit', 'ancestor', 'profile'] as const)(
    'when the satellite WAS named (source: %s)',
    (source) => {
      it('proceeds to validation — the guard only fires on the cwd fallback', async () => {
        resolveSatelliteDetailedMock.mockReturnValue({ path: '/named/satellite', source });

        await command.executeCommand([], {});

        expect(resolveRulesetsMock).toHaveBeenCalled();
        expect(mockExecute).toHaveBeenCalledWith(
          expect.objectContaining({ satellitePath: '/named/satellite' }),
        );
      });
    },
  );
});
