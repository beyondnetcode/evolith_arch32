import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationController } from './evaluation.controller';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { EvaluationOrchestrator } from '@beyondnet/evolith-core-domain/evaluation';
import type { DirEntry, IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { EvaluateSatelliteDto, EvaluationContextDto } from '../dtos/evaluation.dto';

const SAMPLE_GATE_EVAL = {
  artifactEvaluations: [
    {
      ruleId: 'GATE-F1-PRD',
      artifact: 'docs/prd.md',
      passed: false,
      message: 'Missing required artifact: docs/prd.md',
      severity: 'error' as const,
      remediation: 'Ensure docs/prd.md exists and defines scope boundaries',
      gateRef: 'gate-f1',
      rulePath: 'rulesets/opa/governance.rego',
    },
  ],
  gateId: 'gate-f1',
  gateName: 'Business Sign-Off',
  verdict: 'failed' as const,
};

const SAMPLE_ENVELOPE = {
  success: true as const,
  data: {
    topology: 'modular-monolith',
    gates: [SAMPLE_GATE_EVAL],
    summary: {
      totalGates: 1,
      passedGates: 0,
      failedGates: 1,
      totalRules: 1,
      passedRules: 0,
      failedRules: 1,
    },
  },
  meta: {
    command: 'evolith validate',
    executedAt: '2026-06-28T00:00:00.000Z',
    durationMs: 12,
    correlationId: 'ev-abc123',
    schemaVersion: '1.0.0',
  },
};

describe('EvaluationController (GT-361)', () => {
  let controller: EvaluationController;
  let useCase: jest.Mocked<ValidateSatelliteUseCase>;
  let orchestrator: { evaluate: jest.Mock };

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };
    orchestrator = { evaluate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluationController],
      providers: [
        { provide: EvaluationOrchestrator, useValue: orchestrator },
        { provide: ValidateSatelliteUseCase, useValue: mockUseCase },
      ],
    }).compile();

    controller = module.get<EvaluationController>(EvaluationController);
    useCase = module.get(ValidateSatelliteUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  const body: EvaluateSatelliteDto = {
    satellitePath: '/satellite',
    corePath: '/core',
    topology: 'modular-monolith',
    phase: 'f1',
  };

  describe('ADR-0073 envelope shape', () => {
    it('returns the outputEnvelope from the pipeline (success:true, data, meta)', async () => {
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: SAMPLE_ENVELOPE },
      });

      const response = await controller.evaluate(body);

      expect(response).toBe(SAMPLE_ENVELOPE);
      expect((response as typeof SAMPLE_ENVELOPE).success).toBe(true);
      expect((response as typeof SAMPLE_ENVELOPE).meta.command).toBe('evolith validate');
      expect((response as typeof SAMPLE_ENVELOPE).meta.schemaVersion).toBe('1.0.0');
    });

    it('propagates severity, remediation, and gateRef in gate evaluations', async () => {
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: SAMPLE_ENVELOPE },
      });

      const response = await controller.evaluate(body) as typeof SAMPLE_ENVELOPE;
      const ev = response.data.gates[0].artifactEvaluations[0];

      expect(ev.severity).toBe('error');
      expect(ev.remediation).toBeTruthy();
      expect(ev.remediation.length).toBeGreaterThan(0);
      expect(ev.gateRef).toBe('gate-f1');
    });

    it('propagates topology and summary in the data envelope', async () => {
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: SAMPLE_ENVELOPE },
      });

      const response = await controller.evaluate(body) as typeof SAMPLE_ENVELOPE;

      expect(response.data.topology).toBe('modular-monolith');
      expect(response.data.summary.totalGates).toBe(1);
      expect(response.data.summary.failedGates).toBe(1);
    });
  });

  describe('use case delegation', () => {
    it('forwards satellitePath, corePath, topology and phase as manifest', async () => {
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: SAMPLE_ENVELOPE },
      });

      await controller.evaluate(body);

      expect(useCase.execute).toHaveBeenCalledWith({
        satellitePath: '/satellite',
        corePath: '/core',
        manifest: {
          satellitePath: '/satellite',
          corePath: '/core',
          topology: 'modular-monolith',
          phase: 'f1',
        },
      });
    });

    it('works with minimal body (only satellitePath)', async () => {
      const minimalEnvelope = { ...SAMPLE_ENVELOPE };
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: minimalEnvelope },
      });

      const minimalBody: EvaluateSatelliteDto = { satellitePath: '/satellite' };
      const response = await controller.evaluate(minimalBody);

      expect(useCase.execute).toHaveBeenCalledWith({
        satellitePath: '/satellite',
        corePath: undefined,
        manifest: {
          satellitePath: '/satellite',
          corePath: undefined,
          topology: undefined,
          phase: undefined,
        },
      });
      expect(response).toBe(minimalEnvelope);
    });
  });

  describe('canonical EvaluationContext path (GT-378)', () => {
    const CANONICAL_RESULT = {
      overallVerdict: 'PASS',
      outcome: 'approved',
      results: {},
      rulesExecuted: [],
      policiesApplied: [],
      gaps: [],
      risks: [],
      missingEvidence: [],
      incompleteArtifacts: [],
      recommendations: [],
      requiredActions: [],
      confidence: 1,
      rationale: 'ok',
      versions: { core: '1.0.5' },
      evaluatedAt: '2026-06-28T12:00:00.000Z',
      schemaVersion: '1.0.0',
    };

    it('delegates to the orchestrator and returns the raw EvaluationResult', async () => {
      orchestrator.evaluate.mockResolvedValue(CANONICAL_RESULT);
      const ctx: EvaluationContextDto = { kinds: ['gate', 'compliance'], workspaceRef: 'ws-3f9a', phaseId: 'design', gateId: 'gate-f2' };

      const response = await controller.evaluate(ctx) as any;

      expect(orchestrator.evaluate).toHaveBeenCalledWith(ctx);
      expect(useCase.execute).not.toHaveBeenCalled();
      expect(response.success).toBe(true);
      expect(response.data).toBe(CANONICAL_RESULT);
      expect(response.meta.command).toBe('evolith evaluate');
    });

    it('rejects a body with neither workspaceRef nor satellitePath', async () => {
      await expect(controller.evaluate({ kinds: ['gate'] } as EvaluationContextDto)).rejects.toThrow(/workspaceRef.*satellitePath/);
      expect(orchestrator.evaluate).not.toHaveBeenCalled();
      expect(useCase.execute).not.toHaveBeenCalled();
    });
  });
});

/**
 * Inline evaluation path (additive): `evaluationInput.files` is evaluated in
 * memory. The Core reads its OWN rulesets from disk (fallback fs), but NEVER
 * reads the satellite subtree from disk and never writes the incoming content.
 *
 * GT-573: this branch now answers with the canonical `EvaluationResult` (the
 * same shape the `workspaceRef` branch produces), so GOV-000 surfaces as a
 * `results.gate[].gaps[].requirementRef` rather than as a legacy
 * `data.gates[].artifactEvaluations[].ruleId`.
 */
describe('EvaluationController — inline evaluationInput path', () => {
  const CORE_PATH = '/core';
  const SATELLITE_ROOT = '/inmem/satellite';

  const VALID_EVOLITH_YAML = JSON.stringify({
    coreRef: { version: '1.0.0', path: '../evolith' },
    governance: { version: '1.0.0' },
    product: { name: 'inline-project', type: 'enterprise-application' },
  });

  /**
   * Fake real-disk fs. The Core corpus (`/core/...`) does not exist here, so
   * gate loading and rule discovery are skipped — the only rule that fires is
   * GOV-000 from RulesetValidatorService (evolith.yaml presence). Any read of a
   * satellite path would mean the overlay leaked to disk, so we record calls.
   */
  function makeFallback(): IFileSystem & { satelliteReads: string[]; writes: string[] } {
    const satelliteReads: string[] = [];
    const writes: string[] = [];
    const guardSat = (p: string) => {
      if (p.startsWith(SATELLITE_ROOT)) satelliteReads.push(p);
    };
    return {
      satelliteReads,
      writes,
      async readFile(p: string) { guardSat(p); throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
      async readFileBuffer(p: string) { guardSat(p); throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
      async writeFile(p: string) { writes.push(p); },
      async exists(p: string) { guardSat(p); return false; },
      existsSync(p: string) { guardSat(p); return false; },
      async readJson<T>(p: string) { guardSat(p); throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
      async writeJson(p: string) { writes.push(p); },
      async mkdir() { /* noop */ },
      async readdir(p: string): Promise<DirEntry[]> { guardSat(p); return []; },
      async readdirNames(p: string) { guardSat(p); return []; },
      async copy() { /* noop */ },
      async ensureDir() { /* noop */ },
      async ensureFile() { /* noop */ },
      async stat(p: string) { guardSat(p); return { isDirectory: () => false, isFile: () => false }; },
      async remove() { /* noop */ },
    };
  }

  // Minimal real collaborators so the pipeline runs against the overlay fs.
  const logger = { info() {}, warn() {}, error() {}, debug() {} };
  const configParser = {
    parse: <T,>(content: string): T => JSON.parse(content) as T,
    stringify: (data: unknown) => JSON.stringify(data),
  };
  const rulesetRepo = { getRuleset: async () => null, listRulesets: async () => [] } as any;
  const workspaceResolver = { corePath: () => CORE_PATH } as any;

  function buildController(fallback: IFileSystem) {
    return new EvaluationController(
      { evaluate: jest.fn() } as any,
      // real ValidateSatelliteUseCase is created per-request inside the controller,
      // so the injected one is never used on the inline path:
      { execute: jest.fn() } as any,
      fallback,
      logger as any,
      configParser as any,
      rulesetRepo,
      undefined,
      workspaceResolver,
    );
  }

  /** GOV-000 findings, read from the canonical result's gate sub-results. */
  const govGaps = (res: any): any[] =>
    (res.data.results?.gate ?? [])
      .flatMap((g: any) => g.gaps ?? [])
      .filter((gap: any) => gap.requirementRef === 'GOV-000');

  it('evaluates inline content; GOV-000 is NOT raised when evolith.yaml is present', async () => {
    const fallback = makeFallback();
    const controller = buildController(fallback);

    const body: EvaluationContextDto = {
      evaluationInput: { files: { 'evolith.yaml': VALID_EVOLITH_YAML, 'docs/prd.md': '# PRD' } },
    };
    const res = (await controller.evaluate(body)) as any;

    expect(res.success).toBe(true);
    expect(govGaps(res)).toHaveLength(0);

    // Satellite content came from memory — never from disk — and nothing written.
    expect(fallback.satelliteReads).toHaveLength(0);
    expect(fallback.writes).toHaveLength(0);
  });

  it('raises GOV-000 when evolith.yaml is missing from the inline files', async () => {
    const fallback = makeFallback();
    const controller = buildController(fallback);

    const body: EvaluationContextDto = {
      evaluationInput: { files: { 'docs/prd.md': '# PRD' } },
    };
    const res = (await controller.evaluate(body)) as any;

    expect(govGaps(res).length).toBeGreaterThan(0);
    expect(fallback.satelliteReads).toHaveLength(0);
  });

  // GT-573 regression: the inline branch must never fall back to the legacy
  // `{ topology, gates, summary }` envelope, whose absent `overallVerdict` made
  // the consumer persist every FAIL as SKIPPED.
  it('returns the canonical EvaluationResult, with a real verdict on a violation', async () => {
    const controller = buildController(makeFallback());

    const res = (await controller.evaluate({
      evaluationInput: { files: { 'docs/prd.md': '# PRD' } },
    })) as any;

    expect(res.data.overallVerdict).toBe('FAIL');
    expect(res.data.outcome).toBe('rejected');
    expect(res.data.evaluatedAt).toEqual(expect.any(String));
    expect(Array.isArray(res.data.results.gate)).toBe(true);
    expect(res.data).not.toHaveProperty('summary');
  });
});
