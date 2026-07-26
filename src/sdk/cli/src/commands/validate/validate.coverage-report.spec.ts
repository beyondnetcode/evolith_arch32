/**
 * GT-569 — `evolith validate` must report its own denominator on every surface.
 *
 * `rulesChecked` alone is unreadable: the engine silently redefines the
 * denominator underneath it. These tests pin that the human report, the
 * table/yaml/markdown payload and the `--format json` envelope all carry
 * checked / skipped / errored / total, and that `rulesChecked` itself is
 * neither renamed nor removed (wire back-compat).
 *
 * Every assertion here fails against the pre-GT-569 command, which emitted only
 * `Reglas verificadas: <n>` and an envelope with no coverage fields at all.
 */

import { ValidateCommand, withCoverageDenominator } from './validate.command';

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

describe('GT-569 · validate reports checked / skipped / errored / total', () => {
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
  const errorLines = (): string[] => prompts.showError.mock.calls.map(c => String(c[0]));

  describe('--format json', () => {
    it('emits the denominator alongside rulesChecked', async () => {
      mockExecute.mockResolvedValue({ result: partiallyCoveredResult });

      await command.run([], { format: 'json' });

      expect(jsonEnvelope().data).toEqual(
        expect.objectContaining({
          rulesChecked: 2,
          rulesSkipped: 3,
          rulesErrored: 1,
          rulesTotal: 6,
          skippedRuleIds: ['SKIP-01', 'SKIP-02', 'SKIP-03'],
          erroredRuleIds: ['CRASH-01'],
        }),
      );
    });

    it('keeps `rulesChecked` on the wire — the field is ADDED to, never renamed', async () => {
      mockExecute.mockResolvedValue({ result: partiallyCoveredResult });

      await command.run([], { format: 'json' });

      expect(jsonEnvelope().data).toHaveProperty('rulesChecked', 2);
    });

    it('fills the denominator in when the producer omitted it, instead of emitting a bare number', async () => {
      // A producer that predates GT-569 (e.g. the `--ruleset` branch of the use
      // case) reports only `rulesChecked`. The CLI must still emit a complete,
      // honest coverage block rather than a coverage number with no denominator.
      mockExecute.mockResolvedValue({
        result: { status: 'passed', rulesChecked: 4, issues: [], coreRef: { version: null, path: '/core' }, timestamp: 'x' },
      });

      await command.run([], { format: 'json', ruleset: 'acl' });

      expect(jsonEnvelope().data).toEqual(
        expect.objectContaining({
          rulesChecked: 4, rulesSkipped: 0, rulesErrored: 0, rulesTotal: 4,
          skippedRuleIds: [], erroredRuleIds: [],
        }),
      );
    });
  });

  describe('human report', () => {
    it('prints checked / skipped / errored / total on one line', async () => {
      mockExecute.mockResolvedValue({ result: partiallyCoveredResult });

      await command.run([], { format: 'unknown' });

      expect(infoLines().some(l => /2 verificadas.*3 omitidas.*1 con error.*6 en total/.test(l))).toBe(true);
    });

    it('prints the denominator even on the clean path, so a green cannot hide 0/N', async () => {
      mockExecute.mockResolvedValue({
        result: {
          ...partiallyCoveredResult,
          issues: [], rulesChecked: 0, rulesSkipped: 6, rulesErrored: 0, rulesTotal: 6, erroredRuleIds: [],
        },
      });

      // A targeted run, so the `rulesChecked === 0` guard does not add its own
      // issue and the "no problems found" path is genuinely exercised.
      await command.run([], { format: 'unknown', ruleset: 'acl' });

      expect(prompts.showSuccess).toHaveBeenCalledWith('No se encontraron problemas.');
      expect(infoLines().some(l => /0 verificadas.*6 omitidas/.test(l))).toBe(true);
    });

    it('says out loud that a skipped rule has an UNKNOWN outcome, not a passing one', async () => {
      mockExecute.mockResolvedValue({ result: partiallyCoveredResult });

      await command.run([], { format: 'unknown' });

      expect(warnLines().some(l => l.includes('DESCONOCIDO'))).toBe(true);
    });

    it('names the rules whose evaluator crashed', async () => {
      mockExecute.mockResolvedValue({ result: partiallyCoveredResult });

      await command.run([], { format: 'unknown' });

      expect(errorLines().some(l => l.includes('CRASH-01'))).toBe(true);
    });

    it('stays silent about errors when nothing errored', async () => {
      mockExecute.mockResolvedValue({
        result: { ...partiallyCoveredResult, rulesErrored: 0, erroredRuleIds: [], rulesTotal: 5 },
      });

      await command.run([], { format: 'unknown' });

      expect(errorLines().some(l => l.includes('error del evaluador'))).toBe(false);
    });
  });

  describe('table / yaml / markdown payload', () => {
    it('hands the formatter the denominator, not just rulesChecked', async () => {
      mockExecute.mockResolvedValue({ result: partiallyCoveredResult });

      await command.run([], { format: 'table' });

      expect(mockFormat).toHaveBeenCalledWith(
        expect.objectContaining({ rulesChecked: 2, rulesSkipped: 3, rulesErrored: 1, rulesTotal: 6 }),
        expect.anything(),
      );
    });
  });

  describe('merging the architecture run', () => {
    it('sums the denominators, not only the coverage numbers', async () => {
      mockExecute.mockResolvedValue({ result: partiallyCoveredResult });
      mockValidateArchitecture.mockResolvedValue({
        status: 'passed', levels: ['F1'],
        rulesChecked: 1, rulesSkipped: 4, rulesErrored: 0, rulesTotal: 5,
        skippedRuleIds: ['ARCH-01', 'ARCH-02', 'ARCH-03', 'ARCH-04'], erroredRuleIds: [],
        issues: [], timestamp: '2024-01-01T00:00:00.000Z',
      });

      await command.run([], { format: 'json', architecture: true });

      expect(jsonEnvelope().data).toEqual(
        expect.objectContaining({ rulesChecked: 3, rulesSkipped: 7, rulesErrored: 1, rulesTotal: 11 }),
      );
    });
  });
});

describe('GT-569 · withCoverageDenominator', () => {
  const base: Record<string, unknown> = {
    status: 'passed',
    rulesChecked: 7,
    issues: [],
    coreRef: { version: null, path: null },
    timestamp: '2024-01-01T00:00:00.000Z',
  };

  const normalize = (r: Record<string, unknown>): Record<string, unknown> =>
    withCoverageDenominator(r as never) as unknown as Record<string, unknown>;

  it('never guesses a corpus size: total falls back to what was actually checked', () => {
    expect(normalize(base)).toEqual(
      expect.objectContaining({ rulesChecked: 7, rulesSkipped: 0, rulesErrored: 0, rulesTotal: 7 }),
    );
  });

  it('leaves a producer-supplied denominator untouched', () => {
    const supplied = { ...base, rulesSkipped: 2, rulesErrored: 1, rulesTotal: 10, skippedRuleIds: ['a', 'b'], erroredRuleIds: ['c'] };
    expect(normalize(supplied)).toEqual(supplied);
  });

  it('derives the total from a partial breakdown rather than dropping it', () => {
    expect(normalize({ ...base, rulesSkipped: 3 }).rulesTotal).toBe(10);
  });
});
