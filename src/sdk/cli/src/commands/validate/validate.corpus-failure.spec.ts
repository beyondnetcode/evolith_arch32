/**
 * GT-562 — the corpus-failure paths of `evolith validate`.
 *
 * This is the single most consequential uncovered branch family in the CLI, and
 * it is precisely the defect class this repository keeps rediscovering (GT-452,
 * GT-474, GT-485): validation that resolves NO rules and reports that as a
 * verdict. The failure is silent by construction — the command prints a clean
 * report, exits 0, and CI records a pass for a satellite nothing was checked
 * against.
 *
 * Four rules are pinned here:
 *   1. an unresolvable corpus aborts with a non-zero exit, in BOTH formats;
 *   2. in `--format json` the abort still writes an ADR-0073 error envelope to
 *      stdout (GT-485: it used to exit 1 with empty stdout);
 *   3. a `RulesetsNotFoundError` raised DURING validation is fatal, not a warning;
 *   4. any other error is re-thrown rather than swallowed into a pass.
 *
 * The sibling `validate.command.spec.ts` mocks `resolveRulesets` to always
 * succeed, so none of this was reachable there.
 */

const resolveRulesetsMock = jest.fn();

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
import { RulesetsNotFoundError } from '@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { CLI_EXIT_CODES } from '../../infrastructure/cli/exit-codes';

const mockExecute = jest.fn();
(ValidateSatelliteUseCase as jest.Mock).mockImplementation(() => ({ execute: mockExecute }));
(RulesetValidatorService as jest.Mock).mockImplementation(() => ({ validateArchitecture: jest.fn() }));

describe('ValidateCommand — corpus resolution failures', () => {
  let command: ValidateCommand;
  let prompt: jest.Mocked<PromptService>;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  function stdout(): string {
    return logSpy.mock.calls.map((c) => String(c[0])).join('\n');
  }

  /** The FIRST thing written to stdout. In production `process.exit(1)` ends the
   *  run right after it; the stub lets execution continue, so later writes are a
   *  test artifact and only this one reflects what a consumer would read. */
  function firstStdoutEnvelope(): { error: { code: string; message: string } } {
    return JSON.parse(String(logSpy.mock.calls[0][0]));
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prompt = new PromptService() as jest.Mocked<PromptService>;
    command = new ValidateCommand(
      new ValidateSatelliteUseCase() as never,
      new RulesetValidatorService() as never,
      prompt,
    );
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    // `process.exit` is stubbed, so execution CONTINUES past the call; the
    // assertions below therefore check that exit(1) happened, not that control
    // stopped there.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    resolveRulesetsMock.mockReturnValue({
      coreRoot: '/bundled-core',
      rulesetsRoot: '/bundled-core/rulesets',
      source: 'bundled',
    });
    // The use case returns an envelope: `{ result, evaluationVerdict? }`.
    mockExecute.mockResolvedValue({
      result: {
        status: 'passed',
        rulesChecked: 5,
        issues: [],
        coreRef: { version: '1.0.0', path: null },
        timestamp: new Date().toISOString(),
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when the ruleset corpus cannot be resolved at all', () => {
    beforeEach(() => {
      resolveRulesetsMock.mockImplementation(() => {
        throw new Error('Rulesets not found: probed /bad/core/rulesets and /bad/core/src/rulesets');
      });
    });

    it('exits non-zero in human mode instead of validating against nothing', async () => {
      await command.executeCommand([], { core: '/bad/core' });

      // GT-474: returning silently exited 0, so CI read "resolved no rulesets"
      // as a passing gate.
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(prompt.showError).toHaveBeenCalledWith(expect.stringContaining('Rulesets not found'));
      expect(prompt.showOutro).toHaveBeenCalledWith(expect.stringContaining('aborted'));
    });

    it('writes a RULESET_NOT_FOUND envelope to stdout in JSON mode rather than exiting on empty output', async () => {
      await command.executeCommand([], { core: '/bad/core', format: 'json' });

      // GT-485: an aborted validation used to leave stdout EMPTY, which broke
      // every machine consumer that parses it.
      const envelope = firstStdoutEnvelope();
      expect(envelope.error.code).toBe('RULESET_NOT_FOUND');
      expect(envelope.error.message).toContain('/bad/core');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('reports the failing core path so the operator can see WHICH corpus was missing', async () => {
      await command.executeCommand([], { core: '/bad/core', format: 'json' });

      expect(resolveRulesetsMock).toHaveBeenCalledWith('/bad/core');
      expect(stdout()).toContain('/bad/core/src/rulesets');
    });
  });

  describe('when validation itself reports a missing corpus', () => {
    beforeEach(() => {
      mockExecute.mockRejectedValue(new RulesetsNotFoundError('No rulesets resolved under /bundled-core'));
    });

    it('treats it as fatal and exits non-zero in human mode', async () => {
      // In production `process.exit(1)` ends the run here; with exit stubbed the
      // trailing `throw` is reached, so BOTH signals are asserted.
      await expect(command.executeCommand([], {})).rejects.toBeInstanceOf(RulesetsNotFoundError);

      // GT-452 first degraded this to `warning`; an operator reads "warning" as
      // "it checked and mostly passed", so it is a BLOCKING failure.
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(prompt.showError).toHaveBeenCalledWith(expect.stringContaining('No rulesets resolved'));
      expect(prompt.showOutro).toHaveBeenCalledWith(expect.stringContaining('aborted'));
    });

    it('emits the ADR-0073 error envelope in JSON mode and exits non-zero', async () => {
      await expect(command.executeCommand([], { format: 'json' })).rejects.toBeInstanceOf(
        RulesetsNotFoundError,
      );

      const envelope = firstStdoutEnvelope();
      expect(envelope.error.code).toBe('RULESET_NOT_FOUND');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('when validation fails for an unrelated reason', () => {
    it('re-throws instead of swallowing the error into a passing run', async () => {
      mockExecute.mockRejectedValue(new Error('disk exploded'));

      await expect(command.executeCommand([], {})).rejects.toThrow('disk exploded');
      // No exit(1) here: the base command renders and sets the exit code.
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('provenance of the resolved corpus', () => {
    it('records the resolved Core root in coreRef.path so the report says where rules came from', async () => {
      // GT-456: this was always null even with a valid --core, which made it
      // impossible to tell WHICH corpus produced a verdict.
      mockExecute.mockResolvedValue({
        result: {
          status: 'passed',
          rulesChecked: 3,
          issues: [],
          coreRef: { version: '1.0.0', path: null },
          timestamp: new Date().toISOString(),
        },
      });
      resolveRulesetsMock.mockReturnValue({
        coreRoot: '/explicit-core',
        rulesetsRoot: '/explicit-core/rulesets',
        source: 'override',
      });

      await command.executeCommand([], { core: '/explicit-core', format: 'json' });

      const envelope = JSON.parse(stdout());
      expect(envelope.data.coreRef.path).toBe('/explicit-core');
    });
  });
  describe('verdict-to-exit-code mapping in JSON mode', () => {
    it('exits non-zero on a FAILED verdict, so CI can gate on the envelope', async () => {
      // ADR-0073 splits the two signals: the envelope reports that the command
      // RAN (success=true), the exit code reports the VERDICT. Collapsing them
      // would make every failed validation look like a pass to CI.
      mockExecute.mockResolvedValue({
        result: {
          status: 'failed',
          rulesChecked: 12,
          issues: [{ ruleId: 'R1', severity: 'MUST', blocking: true, title: 'boom' }],
          coreRef: { version: '1.0.0', path: '/bundled-core' },
          timestamp: new Date().toISOString(),
        },
      });

      await command.executeCommand([], { format: 'json' });

      const envelope = firstStdoutEnvelope() as unknown as { success: boolean; data: { status: string } };
      expect(envelope.success).toBe(true); // the command ran
      expect(envelope.data.status).toBe('failed'); // the verdict is negative
      // GT-580: BLOCKED (2), not the catch-all 1 — a failed gate and an
      // unresolvable corpus (RULESET_NOT_FOUND, still 1 above) are different
      // events and a consumer must be able to branch on which one happened.
      expect(exitSpy).toHaveBeenCalledWith(CLI_EXIT_CODES.BLOCKED); // and CI sees it
    });

    it('leaves the exit code clean on a PASSED verdict', async () => {
      await command.executeCommand([], { format: 'json' });

      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('fails a full run that checked zero rules rather than signing off on nothing', async () => {
      // GT-452/GT-474: a satellite must not receive a compliance verdict when
      // nothing was executed. Reported as a BLOCKING failure, not a warning.
      mockExecute.mockResolvedValue({
        result: {
          status: 'passed',
          rulesChecked: 0,
          issues: [],
          coreRef: { version: '1.0.0', path: '/bundled-core' },
          timestamp: new Date().toISOString(),
        },
      });

      await command.executeCommand([], { format: 'json' });

      const envelope = firstStdoutEnvelope() as unknown as {
        data: { status: string; issues: Array<{ blocking: boolean; title: string }> };
      };
      expect(envelope.data.status).toBe('failed');
      expect(envelope.data.issues.some((i) => i.blocking && /No Core rulesets/i.test(i.title))).toBe(true);
      // A zero-rule run is reported as a BLOCKING verdict, so it exits 2.
      expect(exitSpy).toHaveBeenCalledWith(CLI_EXIT_CODES.BLOCKED);
    });
  });
});
