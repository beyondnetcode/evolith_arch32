/**
 * #628 — `evolith validate` with no flag runs the native evaluator, which decides
 * materially fewer rules than `--engine opa` over the same corpus. Both totals
 * were honest and every skip was published; what was missing was the line telling
 * the reader WHICH engine produced them, so the missing coverage read as a fact
 * about their repository.
 *
 * GT-569 (see `validate.coverage-report.spec.ts`) pinned that the denominator is
 * always reported. These pin the other half: the denominator is attributed, and
 * the redirect to the wider engine stays quiet on every shape a reader would not
 * misread.
 */

import { ValidateCommand } from './validate.command';

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

jest.mock('../../infrastructure/paths/rulesets-resolver', () => ({
  resolveRulesets: (override?: string) => ({
    coreRoot: override ?? '/bundled-core',
    rulesetsRoot: `${override ?? '/bundled-core'}/rulesets`,
    source: override ? 'override' : 'bundled',
  }),
}));

jest.mock('../../infrastructure/prompts/prompt.service', () => ({
  PromptService: jest.fn().mockImplementation(() => ({
    showIntro: jest.fn(), showOutro: jest.fn(), showSuccess: jest.fn(),
    showError: jest.fn(), showWarning: jest.fn(), showInfo: jest.fn(),
    startSpinner: jest.fn(), stopSpinner: jest.fn(), confirm: jest.fn(),
  })),
}));

jest.mock('../../infrastructure/observability', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../infrastructure/formatters/output-formatter.service', () => ({
  OutputFormatterService: jest.fn().mockImplementation(() => ({
    format: jest.fn(() => 'formatted output'),
  })),
}));

import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import { OutputFormatterService } from '../../infrastructure/formatters/output-formatter.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

const mockExecute = jest.fn();
const mockValidateArchitecture = jest.fn();
const mockFormat = jest.fn();

(ValidateSatelliteUseCase as jest.Mock).mockImplementation(() => ({ execute: mockExecute }));
(RulesetValidatorService as jest.Mock).mockImplementation(() => ({ validateArchitecture: mockValidateArchitecture }));
(OutputFormatterService as jest.Mock).mockImplementation(() => ({ format: mockFormat }));

/** A run in which only 2 of 6 rules actually executed. */
const partiallyCoveredResult = {
  status: 'passed' as const,
  rulesChecked: 2,
  rulesSkipped: 3,
  rulesErrored: 1,
  rulesTotal: 6,
  skippedRuleIds: ['SKIP-01', 'SKIP-02', 'SKIP-03'],
  erroredRuleIds: ['CRASH-01'],
  issues: [],
  coreRef: { version: '1.0.0', path: '/core' },
  timestamp: '2024-01-01T00:00:00.000Z',
};

describe('#628 · validate names the engine that produced the coverage', () => {
  let command: ValidateCommand;
  let prompts: jest.Mocked<PromptService>;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    const useCase = new ValidateSatelliteUseCase();
    const validator = new RulesetValidatorService();
    prompts = new PromptService() as jest.Mocked<PromptService>;
    command = new ValidateCommand(useCase, validator, prompts);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
    mockExecute.mockReset();
    mockValidateArchitecture.mockReset();
    mockFormat.mockReset().mockReturnValue('formatted output');
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  const jsonEnvelope = (): any => {
    const calls = logSpy.mock.calls;
    return JSON.parse(calls[calls.length - 1][0] as string);
  };
  const infoLines = (): string[] => prompts.showInfo.mock.calls.map(c => String(c[0]));
  const warnLines = (): string[] => prompts.showWarning.mock.calls.map(c => String(c[0]));

    it('names the engine on the same line as the counts', async () => {
      mockExecute.mockResolvedValue({ result: { ...partiallyCoveredResult, engine: 'native' } });

      await command.run([], { format: 'unknown' });

      expect(infoLines().some(l => /2 checked.*6 total.*engine: native/.test(l))).toBe(true);
    });

    it('redirects to --engine opa when the default engine skipped more than it checked', async () => {
      mockExecute.mockResolvedValue({
        result: { ...partiallyCoveredResult, engine: 'native', rulesChecked: 41, rulesSkipped: 118, rulesErrored: 0, rulesTotal: 159 },
      });

      await command.run([], { format: 'unknown' });

      const hint = warnLines().find(l => l.includes('--engine opa'));
      expect(hint).toBeDefined();
      // The attribution is the whole point: a reader who sees only this line
      // must learn the skips are the evaluator's, not their repository's.
      expect(hint).toContain('not to your repository');
    });

    it('stays quiet about the other engine when the native run decided most of its scope', async () => {
      mockExecute.mockResolvedValue({
        result: { ...partiallyCoveredResult, engine: 'native', rulesChecked: 133, rulesSkipped: 26, rulesErrored: 0, rulesTotal: 159 },
      });

      await command.run([], { format: 'unknown' });

      expect(warnLines().some(l => l.includes('--engine opa'))).toBe(false);
    });

    it('never redirects an opa run to itself, however little it decided', async () => {
      mockExecute.mockResolvedValue({
        result: { ...partiallyCoveredResult, engine: 'opa', rulesChecked: 2, rulesSkipped: 157, rulesErrored: 0, rulesTotal: 159 },
      });

      await command.run([], { format: 'unknown' });

      expect(infoLines().some(l => l.includes('engine: opa'))).toBe(true);
      expect(warnLines().some(l => l.includes('--engine opa'))).toBe(false);
    });

    it('omits the engine rather than guessing when the producer did not report one', async () => {
      mockExecute.mockResolvedValue({ result: partiallyCoveredResult });

      await command.run([], { format: 'unknown' });

      expect(infoLines().some(l => l.includes('engine:'))).toBe(false);
    });

    it('carries the engine on the wire, so a captured envelope can be compared to another (#628)', async () => {
      mockExecute.mockResolvedValue({ result: { ...partiallyCoveredResult, engine: 'native' } });

      await command.run([], { format: 'json' });

      expect(jsonEnvelope().data).toHaveProperty('engine', 'native');
    });

});
