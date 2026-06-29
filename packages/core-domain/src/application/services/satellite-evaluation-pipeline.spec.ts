import { SatelliteEvaluationPipeline } from './satellite-evaluation-pipeline.service';
import { IFileSystem, ILogger } from '../../domain/interfaces';

jest.mock('../../domain/interfaces');
jest.mock('./topology-catalog.service');
jest.mock('../validators/ruleset-validator.service');

// Mock SdlcDataLoaderService to return controlled gate data
const mockLoadGatesForPhase = jest.fn();
jest.mock('./sdlc-data-loader.service', () => ({
  SdlcDataLoaderService: jest.fn().mockImplementation(() => ({
    loadGatesForPhase: mockLoadGatesForPhase,
    loadPhase: jest.fn(),
    loadAllPhases: jest.fn(),
    loadAllGates: jest.fn(),
  })),
}));

// Mock OpaEvaluator so pipeline tests don't depend on wasm being present.
// GT-362: individual OpaEvaluator behaviour is tested in opa-evaluator.spec.ts.
const mockEvaluateAll = jest.fn();
jest.mock('../validators/evaluators/opa-evaluator', () => ({
  OpaEvaluator: jest.fn().mockImplementation(() => ({
    evaluateAll: mockEvaluateAll,
  })),
}));

describe('SatelliteEvaluationPipeline (GT-281)', () => {
  let mockFs: jest.Mocked<IFileSystem>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockValidator: any;
  let pipeline: SatelliteEvaluationPipeline;

  beforeEach(() => {
    mockLoadGatesForPhase.mockReset();
    // Default: OPA evaluates all rules as passed
    mockEvaluateAll.mockReset();
    mockEvaluateAll.mockResolvedValue([{ rule: {} as any, result: 'passed' }]);

    mockFs = {
      exists: jest.fn(),
      existsSync: jest.fn(),
      readFile: jest.fn(),
      readdir: jest.fn(),
    } as unknown as jest.Mocked<IFileSystem>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockValidator = {
      validate: jest.fn().mockResolvedValue({
        status: 'passed',
        rulesChecked: 10,
        issues: [],
        coreRef: { version: null, path: '/core' },
        timestamp: new Date().toISOString(),
      }),
    };

    pipeline = new SatelliteEvaluationPipeline(mockFs, mockLogger, mockValidator, '/core');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluate with manifest', () => {
    it('should return passed verdict when all gates pass', async () => {
      const gateData = {
        id: 'gate-f1', name: 'Business Sign-Off', phase: 'f1',
        description: 'Scope frozen',
        requiredArtifacts: [
          { artifact: 'docs/prd.md', validation: 'PRD must exist', rules: ['rulesets/opa/governance.rego'] },
        ],
        blockingCriteria: [{ criterion: 'Scope ambiguous', action: 'BLOCK' }],
      };

      mockLoadGatesForPhase.mockResolvedValue([gateData]);
      mockFs.exists.mockResolvedValue(true); // artifact exists

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        topology: 'modular-monolith',
        phase: 'f1',
      });

      expect(result.passed).toBe(true);
      expect(result.resolvedTopology).toBe('modular-monolith');
      expect(result.gates).toHaveLength(1);
      expect(result.gates[0].verdict).toBe('passed');
      expect(result.summary.totalGates).toBe(1);
      expect(result.summary.passedGates).toBe(1);
    });

    it('should fail when required artifact is missing', async () => {
      const gateData = {
        id: 'gate-f1', name: 'Business Sign-Off', phase: 'f1',
        description: 'Scope frozen',
        requiredArtifacts: [
          { artifact: 'docs/prd.md', validation: 'PRD must exist', rules: ['rulesets/opa/governance.rego'] },
        ],
        blockingCriteria: [{ criterion: 'Scope ambiguous', action: 'BLOCK' }],
      };

      mockLoadGatesForPhase.mockResolvedValue([gateData]);
      mockFs.exists.mockResolvedValue(false); // artifact MISSING

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
      });

      expect(result.passed).toBe(false);
      expect(result.gates[0].verdict).toBe('failed');
      expect(result.gates[0].artifactEvaluations[0].passed).toBe(false);
      expect(result.gates[0].artifactEvaluations[0].message).toContain('Missing required artifact');
    });

    it('should resolve topology from manifest', async () => {
      const gateData = {
        id: 'gate-f1', name: 'Business Sign-Off', phase: 'f1',
        description: 'Scope frozen',
        requiredArtifacts: [
          { artifact: 'docs/prd.md', validation: 'PRD must exist', rules: ['rulesets/opa/governance.rego'] },
        ],
        blockingCriteria: [],
      };

      mockLoadGatesForPhase.mockResolvedValue([gateData]);
      mockFs.exists.mockResolvedValue(true);

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        topology: 'serverless',
      });

      expect(result.resolvedTopology).toBe('serverless');
    });
  });

  describe('GT-282: detailed actionable evidence', () => {
    const gateData = {
      id: 'gate-f1', name: 'Business Sign-Off', phase: 'f1',
      description: 'Scope frozen',
      requiredArtifacts: [
        { artifact: 'docs/prd.md', validation: 'PRD must exist', rules: ['rulesets/opa/governance.rego'] },
        { artifact: 'docs/decision-log.md', validation: 'Decision log must exist', rules: ['rulesets/opa/governance.rego'] },
      ],
      blockingCriteria: [
        { criterion: 'PRD missing', action: 'BLOCK' },
      ],
    };

    beforeEach(() => {
      mockLoadGatesForPhase.mockReset();
      mockLoadGatesForPhase.mockResolvedValue([gateData]);
      mockEvaluateAll.mockReset();
      mockEvaluateAll.mockResolvedValue([{ rule: {} as any, result: 'passed' }]);
    });

    it('should include severity, remediation, and gateRef in failed evaluations', async () => {
      mockFs.exists.mockResolvedValue(false); // everything missing

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        topology: 'modular-monolith',
        phase: 'f1',
      });

      const evals = result.gates[0].artifactEvaluations;
      expect(evals).toHaveLength(2);

      for (const ev of evals) {
        expect(ev.passed).toBe(false);
        expect(ev.severity).toBeDefined();
        expect(ev.remediation).toBeDefined();
        expect(ev.remediation.length).toBeGreaterThan(0);
        expect(ev.gateRef).toBe('gate-f1');
        expect(ev.rulePath).toBeDefined();
      }
    });

    it('should derive error severity for artifacts with blocking criteria', async () => {
      mockFs.exists.mockResolvedValue(false);

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        topology: 'modular-monolith',
        phase: 'f1',
      });

      const evals = result.gates[0].artifactEvaluations;
      // docs/prd.md has blocking criterion → error
      expect(evals[0].severity).toBe('error');
    });

    it('should include severity and gateRef in passing evaluations', async () => {
      mockFs.exists.mockResolvedValue(true); // everything present

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        topology: 'modular-monolith',
        phase: 'f1',
      });

      const evals = result.gates[0].artifactEvaluations;
      for (const ev of evals) {
        expect(ev.passed).toBe(true);
        expect(ev.severity).toBeDefined();
        expect(ev.gateRef).toBe('gate-f1');
      }
    });

    it('should include ADR-0073 outputEnvelope in verdict', async () => {
      mockFs.exists.mockResolvedValue(true);

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        topology: 'modular-monolith',
        phase: 'f1',
      });

      expect(result.outputEnvelope).toBeDefined();
      expect(result.outputEnvelope!.success).toBe(true);
      expect(result.outputEnvelope!.meta).toBeDefined();
      expect(result.outputEnvelope!.meta.command).toBe('evolith validate');
      expect(result.outputEnvelope!.meta.schemaVersion).toBe('1.0.0');
      expect(result.outputEnvelope!.data.gates).toHaveLength(1);
    });

    it('should provide actionable remediation for missing prd.md', async () => {
      mockFs.exists
        .mockResolvedValueOnce(false)  // docs/prd.md missing
        .mockResolvedValueOnce(true);  // docs/decision-log.md present for file check

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        topology: 'modular-monolith',
        phase: 'f1',
      });

      const prdEval = result.gates[0].artifactEvaluations[0];
      expect(prdEval.artifact).toBe('docs/prd.md');
      expect(prdEval.remediation).toContain('Ensure');
      expect(prdEval.remediation).toContain('docs/prd.md');
    });
  });

  describe('GT-362: Rego runtime enforcement', () => {
    const gateData = {
      id: 'gate-f1', name: 'Business Sign-Off', phase: 'f1',
      description: 'Scope frozen',
      requiredArtifacts: [
        { artifact: 'docs/prd.md', validation: 'PRD must exist', rules: ['rulesets/opa/governance.rego'] },
      ],
      blockingCriteria: [{ criterion: 'PRD missing', action: 'BLOCK' }],
    };

    beforeEach(() => {
      mockLoadGatesForPhase.mockReset();
      mockLoadGatesForPhase.mockResolvedValue([gateData]);
      mockEvaluateAll.mockReset();
    });

    it('blocks the gate when OPA returns failed (policy violation)', async () => {
      mockFs.exists.mockResolvedValue(true); // artifact and rule exist
      mockEvaluateAll.mockResolvedValue([{
        rule: {} as any,
        result: 'failed',
        message: 'PRD is missing required section: executive-summary',
      }]);

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        phase: 'f1',
      });

      expect(result.passed).toBe(false);
      expect(result.gates[0].verdict).toBe('failed');
      const ev = result.gates[0].artifactEvaluations[0];
      expect(ev.passed).toBe(false);
      expect(ev.message).toContain('PRD is missing required section');
    });

    it('blocks the gate when OPA returns failed due to missing wasm (enforcement required)', async () => {
      mockFs.exists.mockResolvedValue(true);
      mockEvaluateAll.mockResolvedValue([{
        rule: {} as any,
        result: 'failed',
        message: 'OPA policy not compiled — enforcement blocked. Expected wasm at: /core/rulesets/opa/policy.wasm',
      }]);

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        phase: 'f1',
      });

      expect(result.passed).toBe(false);
      expect(result.gates[0].artifactEvaluations[0].passed).toBe(false);
      expect(result.gates[0].artifactEvaluations[0].message).toContain('enforcement blocked');
    });

    it('blocks the gate when OPA returns skipped (defense-in-depth)', async () => {
      mockFs.exists.mockResolvedValue(true);
      mockEvaluateAll.mockResolvedValue([{
        rule: {} as any,
        result: 'skipped',
        message: 'OPA evaluation skipped',
      }]);

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        phase: 'f1',
      });

      expect(result.passed).toBe(false);
      expect(result.gates[0].artifactEvaluations[0].passed).toBe(false);
    });

    it('passes the gate only when OPA explicitly returns passed', async () => {
      mockFs.exists.mockResolvedValue(true);
      mockEvaluateAll.mockResolvedValue([{ rule: {} as any, result: 'passed' }]);

      const result = await pipeline.evaluate({
        satellitePath: '/satellite',
        corePath: '/core',
        phase: 'f1',
      });

      expect(result.passed).toBe(true);
      expect(result.gates[0].artifactEvaluations[0].passed).toBe(true);
    });
  });

  describe('GT-382 — EvaluationContext facts threading + verdict propagation', () => {
    const dodGate = {
      id: 'gate-f3', name: 'Successful Build', phase: 'f3', description: '',
      requiredArtifacts: [
        { artifact: 'docs/definition-of-done.md', validation: 'DoD satisfied', rules: ['rulesets/opa/dod.rego'] },
      ],
      blockingCriteria: [],
    };

    it('threads manifest.facts into the OpaEvaluator context (so input.context reaches OPA)', async () => {
      mockLoadGatesForPhase.mockResolvedValue([dodGate]);
      mockFs.exists.mockResolvedValue(true);
      let capturedCtx: any;
      mockEvaluateAll.mockImplementation(async (_rules: any, ctx: any) => {
        capturedCtx = ctx;
        return [{ rule: {} as any, result: 'passed' }];
      });

      await pipeline.evaluate({
        satellitePath: '/satellite', corePath: '/core', topology: 'modular-monolith', phase: 'f3',
        facts: { context: { dod: { coveragePercent: 60 } } } as any,
      });

      expect(capturedCtx).toBeDefined();
      expect(capturedCtx.facts?.context?.dod?.coveragePercent).toBe(60);
    });

    it('flips the gate verdict to failed when the dod policy reports a violation', async () => {
      mockLoadGatesForPhase.mockResolvedValue([dodGate]);
      mockFs.exists.mockResolvedValue(true);
      // OpaEvaluator (tested in opa-evaluator.spec.ts) maps a DOD-* violation for the
      // 'opa-dod' rule to result:'failed'; here we assert the pipeline propagates it.
      mockEvaluateAll.mockResolvedValue([{ rule: {} as any, result: 'failed', message: 'Test coverage must be >= 80%' }]);

      const result = await pipeline.evaluate({
        satellitePath: '/satellite', corePath: '/core', topology: 'modular-monolith', phase: 'f3',
        facts: { context: { dod: { coveragePercent: 60 } } } as any,
      });

      expect(result.passed).toBe(false);
      expect(result.gates[0].verdict).toBe('failed');
      expect(result.gates[0].artifactEvaluations[0].passed).toBe(false);
      expect(result.gates[0].artifactEvaluations[0].message).toContain('coverage');
    });
  });
});
