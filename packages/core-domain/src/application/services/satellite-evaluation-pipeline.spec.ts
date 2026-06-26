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

describe('SatelliteEvaluationPipeline (GT-281)', () => {
  let mockFs: jest.Mocked<IFileSystem>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockValidator: any;
  let pipeline: SatelliteEvaluationPipeline;

  beforeEach(() => {
    mockLoadGatesForPhase.mockReset();

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
});
