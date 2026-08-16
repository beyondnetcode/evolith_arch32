import { ValidateSatelliteUseCase } from './validate-satellite.use-case';
import { RulesetValidatorService, ValidationResult } from '../../application/validators/ruleset-validator.service';

jest.mock('../../application/validators/ruleset-validator.service');

describe('ValidateSatelliteUseCase', () => {
  let mockValidator: jest.Mocked<RulesetValidatorService>;
  let useCase: ValidateSatelliteUseCase;

  const mockResult: ValidationResult = {
    status: 'passed',
    rulesChecked: 5,
    issues: [],
    coreRef: { version: '1.0.0', path: '/core' },
    timestamp: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockValidator = {
      validate: jest.fn().mockResolvedValue(mockResult),
      loadRulesetById: jest.fn().mockResolvedValue([]),
    } as unknown;

    useCase = new ValidateSatelliteUseCase(mockValidator);
  });

  describe('execute', () => {
    it('should validate satellite with default options', async () => {
      const { result } = await useCase.execute({
        satellitePath: '/satellite',
      });

      expect(result).toBe(mockResult);
      // GT-659 — the third argument is the ruleset SELECTION, and `undefined` is
      // the additive guarantee this assertion now pins: a caller that names no
      // ruleset is evaluated against the whole corpus, exactly as before.
      expect(mockValidator.validate).toHaveBeenCalledWith('/satellite', undefined, undefined);
    });

    it('should validate with custom core path', async () => {
      const { result: _result } = await useCase.execute({
        satellitePath: '/satellite',
        corePath: '/custom-core',
      });

      expect(mockValidator.validate).toHaveBeenCalledWith('/satellite', '/custom-core', undefined);
    });

    it('should load specific ruleset when rulesetId provided', async () => {
      const resultWithRuleset = {
        ...mockResult,
        issues: [{ ruleId: 'TEST', severity: 'MUST' as const, category: 'test', title: 'Test', description: 'Test issue', blocking: true }],
      };
      mockValidator.loadRulesetById.mockResolvedValue(resultWithRuleset.issues);

      const { result } = await useCase.execute({
        satellitePath: '/satellite',
        rulesetId: 'acl',
      });

      expect(mockValidator.loadRulesetById).toHaveBeenCalledWith(expect.any(String), 'acl');
      expect(result.status).toBe('failed');
    });

    it('should return warning status when non-blocking issues exist', async () => {
      const warningResult = {
        ...mockResult,
        status: 'warning' as const,
        issues: [{ ruleId: 'WARN', severity: 'SHOULD' as const, category: 'test', title: 'Warning', description: 'Warning issue', blocking: false }],
      };
      mockValidator.validate.mockResolvedValue(warningResult);

      const { result } = await useCase.execute({
        satellitePath: '/satellite',
      });

      expect(result.status).toBe('warning');
    });
  });

  describe('executeWithFormat', () => {
    it('should return markdown formatted output', async () => {
      const { result, formattedOutput } = await useCase.executeWithFormat(
        { satellitePath: '/satellite' },
        'markdown',
      );

      expect(result).toBe(mockResult);
      expect(formattedOutput).toContain('# Validation Report');
      expect(formattedOutput).toContain('**Status:** PASSED');
      expect(formattedOutput).toContain('**Rules Checked:** 5');
    });

    it('should include blocking issues in markdown', async () => {
      const resultWithIssues: ValidationResult = {
        status: 'failed',
        rulesChecked: 3,
        issues: [
          {
            ruleId: 'GOV-01',
            severity: 'MUST',
            category: 'governance',
            title: 'Missing file',
            description: 'evolith.yaml is missing',
            file: '/satellite/evolith.yaml',
            blocking: true,
          },
        ],
        coreRef: { version: null, path: null },
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      mockValidator.validate.mockResolvedValue(resultWithIssues);

      const { formattedOutput } = await useCase.executeWithFormat(
        { satellitePath: '/satellite' },
        'markdown',
      );

      expect(formattedOutput).toContain('## Blocking Issues');
      expect(formattedOutput).toContain('**GOV-01**');
      expect(formattedOutput).toContain('Missing file');
    });

    it('should return json format without formatted output', async () => {
      const { result, formattedOutput } = await useCase.executeWithFormat(
        { satellitePath: '/satellite' },
        'json',
      );

      expect(result).toBe(mockResult);
      expect(formattedOutput).toBeUndefined();
    });
  });

  /**
   * GT-664 — the rebuild must not quietly drop the enforcer subsystem.
   *
   * `RulesetValidatorService` only builds the composite enforcer strategy when a
   * `processRunner` is present. This use case reconstructs the validator whenever
   * an engine is named, and the CLI names one on EVERY run
   * (`options.engine === 'opa' ? 'opa' : 'native'`) — so the runner
   * `app.module.ts` injects for "GT-519 parity" was created, handed over, and
   * discarded one call later.
   *
   * Measured before the fix: `evolith validate --select
   * src/rulesets/standards/iso-5055.rules.json` returned in 1.5s with all four
   * rules skipped, and an instrumented build showed `EnforcerEvaluator.evaluateAll`
   * was never entered. Every `enforce:` rule in the corpus was affected — the six
   * ADR-0002 dependency-cruiser rules are `blocking: true` and had been degrading
   * to the native engine on this surface for their whole life.
   */
  describe('the engine rebuild · GT-664', () => {
    it('CARRIES THE ENFORCER SUBSYSTEM ACROSS: the rebuilt validator keeps the process runner', async () => {
      const processRunner = { run: jest.fn() };
      const metrics = { recordDuration: jest.fn() };
      // GT-676 — the source is shaped the way the rebuild now READS it: the
      // options object the service retains, rather than the private fields the
      // rebuild used to reach through. The guarantee under test is unchanged and
      // is the one GT-664 recorded — a runner that does not survive the copy is a
      // validator that cannot run a single `enforce:` rule while reporting
      // `passed` over the ones it skipped.
      const source = {
        validate: jest.fn().mockResolvedValue(mockResult),
        loadRulesetById: jest.fn().mockResolvedValue([]),
        options: {
          fileSystem: { name: 'fs' },
          logger: { name: 'logger' },
          configParser: { name: 'configParser' },
          rulesetRepo: { name: 'repo' },
          processRunner,
          metrics,
        },
      } as unknown as jest.Mocked<RulesetValidatorService>;

      const Ctor = RulesetValidatorService as unknown as jest.Mock;
      Ctor.mockClear();
      await new ValidateSatelliteUseCase(source).execute({
        satellitePath: '/satellite',
        engine: 'native',
      });

      expect(Ctor).toHaveBeenCalledTimes(1);
      const options = Ctor.mock.calls[0][0];
      // A runner that does not survive the copy is a validator that cannot run a
      // single `enforce:` rule, while reporting `passed` over the ones it skipped.
      expect(options.processRunner).toBe(processRunner);
      expect(options.metrics).toBe(metrics);
      // The collaborators that were already carried must still be.
      expect(options.engineType).toBe('native');
      expect(options.rulesetRepo).toBe((source as any).options.rulesetRepo);
    });
  });

  /**
   * GT-688 item 1 — the PIPELINE path had the same defect the block above fixes
   * for the standard path, and it was invisible because `execute` returns into
   * `executeWithPipeline` BEFORE it ever looks at `engine`.
   *
   * The consequence a user sees: `evolith validate --engine opa -t <topology>`
   * accepts the flag, documents it in `--help`, and evaluates natively anyway.
   * A verifier drove the product surfaces with a recording OPA sidecar and
   * measured ZERO requests. Silently answering with a different engine than the
   * one asked for is worse than refusing, because the verdict looks legitimate.
   */
  describe('the pipeline path honours the engine it was given · GT-688', () => {
    const manifest = { satellitePath: '/satellite', corePath: '/core', kinds: [] } as any;

    function sourceValidator() {
      return {
        validate: jest.fn().mockResolvedValue(mockResult),
        loadRulesetById: jest.fn().mockResolvedValue([]),
        // GT-676 — see the note on the GT-664 stub above: same guarantee, shaped
        // the way the rebuild reads it now.
        options: {
          fileSystem: { name: 'fs' },
          logger: { name: 'logger', debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
          configParser: { name: 'configParser' },
          rulesetRepo: { name: 'repo' },
          processRunner: { run: jest.fn() },
          metrics: { recordDuration: jest.fn() },
        },
      } as unknown as jest.Mocked<RulesetValidatorService>;
    }

    it('BUILDS AN OPA VALIDATOR when the caller asked for OPA', async () => {
      const source = sourceValidator();
      const Ctor = RulesetValidatorService as unknown as jest.Mock;
      Ctor.mockClear();

      await new ValidateSatelliteUseCase(source)
        .execute({ satellitePath: '/satellite', manifest, engine: 'opa' })
        .catch(() => undefined); // the pipeline itself needs a real disk; the construction is what is asserted

      expect(Ctor).toHaveBeenCalledTimes(1);
      expect(Ctor.mock.calls[0][0].engineType).toBe('opa');
    });

    it('still defaults to native when no engine was named', async () => {
      const source = sourceValidator();
      const Ctor = RulesetValidatorService as unknown as jest.Mock;
      Ctor.mockClear();

      await new ValidateSatelliteUseCase(source)
        .execute({ satellitePath: '/satellite', manifest })
        .catch(() => undefined);

      expect(Ctor.mock.calls[0][0].engineType).toBe('native');
    });

    it('CARRIES THE ENFORCER SUBSYSTEM on this path too', async () => {
      const source = sourceValidator();
      const Ctor = RulesetValidatorService as unknown as jest.Mock;
      Ctor.mockClear();

      await new ValidateSatelliteUseCase(source)
        .execute({ satellitePath: '/satellite', manifest, engine: 'opa' })
        .catch(() => undefined);

      const options = Ctor.mock.calls[0][0];
      // Same GT-664 loss, on the path that documented block never covered.
      expect(options.processRunner).toBe((source as any).options.processRunner);
      expect(options.metrics).toBe((source as any).options.metrics);
    });
  });
});