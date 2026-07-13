import type { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import type { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import type { PromptService } from '../../infrastructure/prompts/prompt.service';
import type { ConfigService } from '../../infrastructure/config/config.service';

jest.mock('chalk', () => {
  const id = (s: string) => s;
  const proxy: any = new Proxy(id, { get: () => id });
  return { __esModule: true, default: proxy, green: id, red: id, yellow: id, blue: id, bold: id, cyan: id, gray: id, magenta: id, white: id };
});

jest.mock('../../infrastructure/paths/core-resolver', () => ({
  resolveCoreOverride: jest.fn(() => undefined),
}));
jest.mock('../../infrastructure/paths/rulesets-resolver', () => ({
  resolveRulesets: jest.fn(() => ({ coreRoot: '/resolved/core' })),
}));

// Canned EvaluationResult returned by the (mocked) orchestrator. Only the fields
// the envelope and the SARIF exporter read matter.
const RESULT = {
  overallVerdict: 'PASS',
  outcome: 'approved',
  results: {},
  rulesExecuted: [],
  policiesApplied: [],
  gaps: [
    { id: 'g1', requirementRef: 'ADR-0002', severity: 'error', message: 'boundary violated', location: 'src/a.ts:12:3' },
  ],
  risks: [],
  missingEvidence: [],
  incompleteArtifacts: [],
  recommendations: [],
  requiredActions: [],
  confidence: 0.9,
  rationale: 'test',
  versions: { core: '1.2.3' },
  evaluatedAt: '2026-07-12T00:00:00.000Z',
  correlationId: 'corr-1',
  schemaVersion: '1.0.0',
};

const evaluateMock = jest.fn().mockResolvedValue(RESULT);
jest.mock('@beyondnet/evolith-core-domain/evaluation', () => {
  const actual = jest.requireActual('@beyondnet/evolith-core-domain/evaluation');
  return {
    ...actual,
    createDefaultKindEvaluators: jest.fn(() => []),
    EvaluationOrchestrator: jest.fn().mockImplementation(() => ({ evaluate: evaluateMock })),
  };
});

// Imported after the mocks so the command binds to the mocked module.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EvaluateCommand } = require('./evaluate.command');

function setup() {
  const useCase = { execute: jest.fn() } as unknown as ValidateSatelliteUseCase;
  const fileSystem = {} as any;
  const logger = {} as any;
  const configParser = {} as any;
  const rulesetValidator = {} as unknown as RulesetValidatorService;
  const prompt = {
    showIntro: jest.fn(),
    showInfo: jest.fn(),
    showWarning: jest.fn(),
    showSuccess: jest.fn(),
    showOutro: jest.fn(),
    showError: jest.fn(),
    stopSpinner: jest.fn(),
  } as unknown as PromptService;
  const config = { getProfile: () => ({ satellite: '/sat', core: undefined }) } as unknown as ConfigService;
  const command = new EvaluateCommand(useCase, fileSystem, logger, configParser, rulesetValidator, prompt, config);
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  return { command, prompt, log, exit };
}

describe('EvaluateCommand --format sarif (GT-518)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('prints a valid SARIF 2.1.0 log (single-line JSON) when --format sarif', async () => {
    const { command, log } = setup();
    await command.executeCommand([], { format: 'sarif' });
    // The last console.log call carries the SARIF payload.
    const raw = log.mock.calls[log.mock.calls.length - 1][0] as string;
    // Single-line (no pretty-print).
    expect(raw).not.toContain('\n');
    const sarif = JSON.parse(raw);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toBe('https://json.schemastore.org/sarif-2.1.0.json');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('evolith-core');
    expect(sarif.runs[0].tool.driver.version).toBe('1.2.3');
    // The single gap becomes one SARIF result with a mapped level + location.
    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].level).toBe('error');
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('src/a.ts');
  });

  it('does not emit the ADR-0073 envelope in sarif mode', async () => {
    const { command, log } = setup();
    await command.executeCommand([], { format: 'sarif' });
    const raw = log.mock.calls[log.mock.calls.length - 1][0] as string;
    const parsed = JSON.parse(raw);
    // Envelope would have `success`/`meta`; the SARIF log has neither.
    expect(parsed.success).toBeUndefined();
    expect(parsed.meta).toBeUndefined();
  });

  it('still emits the JSON envelope when --format json (default behaviour preserved)', async () => {
    const { command, log } = setup();
    await command.executeCommand([], { format: 'json' });
    const raw = log.mock.calls[log.mock.calls.length - 1][0] as string;
    const body = JSON.parse(raw);
    expect(body.success).toBe(true);
    expect(body.data.overallVerdict).toBe('PASS');
  });

  it('parseFormat returns its input verbatim', () => {
    const { command } = setup();
    expect(command.parseFormat('sarif')).toBe('sarif');
  });
});
