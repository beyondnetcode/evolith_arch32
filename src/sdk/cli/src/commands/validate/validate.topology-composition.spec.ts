/**
 * GT-688 · `-t` must mean the SAME thing on `validate` as on `evaluate`.
 *
 * Both commands expose `-t, --topology` as a repeatable flag, and both
 * accumulate it into a `string[]`. `evaluate` sends the whole array on as the
 * confirmed composition; `validate` took `options.topology[0]` and dropped the
 * rest, in silence. From one identical command line —
 * `-t modular-monolith -t agentic-ai` — `evaluate` put the nine AAI-R rules in
 * scope and `validate` did not. Measured on this repository before the fix:
 * `evaluate` 105 blocking findings, `validate` 96.
 *
 * A silently discarded flag is the worst of the three possible behaviours: the
 * user gets a verdict that looks tailored to what they asked for and is not.
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
  OutputFormatterService: jest.fn().mockImplementation(() => ({ format: jest.fn(() => 'out') })),
}));

import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

const mockExecute = jest.fn();
const mockValidateArchitecture = jest.fn();

(ValidateSatelliteUseCase as jest.Mock).mockImplementation(() => ({ execute: mockExecute }));
(RulesetValidatorService as jest.Mock).mockImplementation(() => ({
  validate: jest.fn(),
  validateArchitecture: mockValidateArchitecture,
  loadRulesetById: jest.fn(),
}));

const PASSING = {
  status: 'passed' as const,
  rulesChecked: 5,
  issues: [],
  coreRef: { version: '1.0.0', path: '/core' },
  timestamp: '2024-01-01T00:00:00.000Z',
};

describe('GT-688 · validate honours the whole -t composition', () => {
  let command: ValidateCommand;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  let prompts: jest.Mocked<PromptService>;

  beforeEach(() => {
    prompts = new PromptService() as jest.Mocked<PromptService>;
    command = new ValidateCommand(new ValidateSatelliteUseCase(), new RulesetValidatorService(), prompts);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
    mockExecute.mockReset();
    mockValidateArchitecture.mockReset();
    mockValidateArchitecture.mockResolvedValue({
      status: 'passed', levels: [], rulesChecked: 0, issues: [], timestamp: '2024-01-01T00:00:00.000Z',
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  /** The manifest this run handed the pipeline. */
  const manifestOf = (): Record<string, unknown> =>
    (mockExecute.mock.calls[0][0] as { manifest: Record<string, unknown> }).manifest;

  it('forwards EVERY -t as the confirmed composition, not just the first', async () => {
    mockExecute.mockResolvedValue({ result: PASSING });

    await command.run([], { topology: ['modular-monolith', 'agentic-ai'], format: 'json' } as any);

    // `topologies` is the field the applicability filter reads
    // (satellite-evaluation-pipeline → RulesetValidatorService.validate →
    // resolveApplicabilityContext). Dropping the tail here is the defect.
    expect(manifestOf().topologies).toEqual(['modular-monolith', 'agentic-ai']);
  });

  it('keeps the scalar display envelope on its first member', async () => {
    mockExecute.mockResolvedValue({ result: PASSING });

    await command.run([], { topology: ['modular-monolith', 'agentic-ai'], format: 'json' } as any);

    // `resolvedTopology` in the verdict is rendered from this; a composition
    // must not blank it out for a caller that reads the scalar.
    expect(manifestOf().topology).toBe('modular-monolith');
  });

  it('sends no composition at all when no -t was passed', async () => {
    mockExecute.mockResolvedValue({ result: PASSING });

    await command.run([], { phase: 'design', format: 'json' } as any);

    expect(manifestOf()).not.toHaveProperty('topologies');
  });

  it('refuses a composition on the single-topology composable path instead of collapsing it', async () => {
    // --composable/--adr/--file resolve exactly ONE topology.manifest.json
    // (architecture-validation.mode.ts). The difference from `evaluate` is real
    // and is therefore stated out loud rather than absorbed by an index [0].
    await command.run([], {
      topology: ['modular-monolith', 'agentic-ai'],
      composable: true,
      format: 'json',
    } as any);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('VALIDATION_FAILED');
    expect(printed).toContain('ONE topology at a time');
  });

  it('still accepts a single -t on the composable path', async () => {
    await command.run([], { topology: ['modular-monolith'], composable: true, format: 'json' } as any);

    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).not.toContain('ONE topology at a time');
  });
});
