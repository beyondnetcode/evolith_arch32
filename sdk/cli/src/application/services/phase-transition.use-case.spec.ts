import { PhaseTransitionUseCase, GateResult, PhaseTransitionResult } from '../../application/services';
import { getContainer, resetContainer, IFileSystemProvider, IFileSystem } from '../../core/abstractions';

const mockRulesetContent = JSON.stringify({
  gates: [
    {
      phase: 1,
      name: 'Business Sign-Off',
      description: 'Scope frozen; funding authorized.',
      mandatoryEvidence: [
        { artifact: 'PRD', schemaRef: '../schema/prd.schema.json', validation: 'PRD approved' },
        { artifact: 'Discovery Canvas', validation: 'Initiative registered' },
        { artifact: 'Business Case ROI', validation: 'Financial viability documented' },
        { artifact: 'Ballpark Estimation', validation: 'T-Shirt sizing completed' },
      ],
      blockingCriteria: [
        { criterion: 'Scope is ambiguous', action: 'BLOCK — return to Phase 1' },
        { criterion: 'Funding outcome is unclear', action: 'BLOCK — return to Phase 1' },
      ],
      accountableRole: 'Product Owner',
      waiverAuthority: 'Executive Sponsor',
      waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
    },
    {
      phase: 2,
      name: 'Design Baseline Approved',
      description: 'Architecture decisions documented.',
      mandatoryEvidence: [
        { artifact: 'ADR Registry', validation: 'All architecture decisions have ADR' },
        { artifact: 'Functional Stories', validation: 'All stories in Ready state' },
        { artifact: 'Bounded Context Map', validation: 'All contexts identified' },
      ],
      blockingCriteria: [
        { criterion: 'Significant architecture decisions are undocumented', action: 'BLOCK — require ADR' },
        { criterion: 'Functional stories Lack acceptance criteria', action: 'BLOCK — return to story writing' },
      ],
      accountableRole: 'Software Architect',
      waiverAuthority: 'Architecture Board',
      waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
    },
  ],
});

const createMockFileSystem = (overrides?: Partial<IFileSystem>): IFileSystem => {
  const mock = {
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(true),
    readFile: jest.fn().mockImplementation((p: string) => {
      if (p.includes('.schema.json')) {
        return Promise.resolve(JSON.stringify({ type: 'object', properties: { gates: { type: 'array' } } }));
      }
      if (p.includes('phase-gates.rules.json')) return Promise.resolve(mockRulesetContent);
      return Promise.resolve(JSON.stringify({}));
    }),
    readJson: jest.fn().mockResolvedValue({}),
    readdirNames: jest.fn().mockResolvedValue([]),
    writeFile: jest.fn().mockResolvedValue(undefined),
    writeJson: jest.fn().mockResolvedValue(undefined),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => false }),
    ...overrides,
  };
  return mock as unknown as IFileSystem;
};

const mockRuleset = {
  gates: [
    {
      phase: 1,
      name: 'Business Sign-Off',
      description: 'Scope frozen; funding authorized.',
      mandatoryEvidence: [
        { artifact: 'PRD', schemaRef: '../schema/prd.schema.json', validation: 'PRD approved' },
        { artifact: 'Discovery Canvas', validation: 'Initiative registered' },
        { artifact: 'Business Case ROI', validation: 'Financial viability documented' },
        { artifact: 'Ballpark Estimation', validation: 'T-Shirt sizing completed' },
      ],
      blockingCriteria: [
        { criterion: 'Scope is ambiguous', action: 'BLOCK — return to Phase 1' },
        { criterion: 'Funding outcome is unclear', action: 'BLOCK — return to Phase 1' },
      ],
      accountableRole: 'Product Owner',
      waiverAuthority: 'Executive Sponsor',
      waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
    },
    {
      phase: 2,
      name: 'Design Baseline Approved',
      description: 'Architecture decisions documented.',
      mandatoryEvidence: [
        { artifact: 'ADR Registry', validation: 'All architecture decisions have ADR' },
        { artifact: 'Functional Stories', validation: 'All stories in Ready state' },
        { artifact: 'Bounded Context Map', validation: 'All contexts identified' },
      ],
      blockingCriteria: [
        { criterion: 'Significant architecture decisions are undocumented', action: 'BLOCK — require ADR' },
        { criterion: 'Functional stories Lack acceptance criteria', action: 'BLOCK — return to story writing' },
      ],
      accountableRole: 'Software Architect',
      waiverAuthority: 'Architecture Board',
      waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
    },
  ],
};

describe.skip('PhaseTransitionUseCase', () => {
  let useCase: PhaseTransitionUseCase;
  let mockFs: IFileSystem;

  beforeEach(() => {
    resetContainer();
    jest.clearAllMocks();

    mockFs = createMockFileSystem();
    const mockProvider: IFileSystemProvider = {
      createFileSystem: () => mockFs,
    };
    getContainer().setFileSystemProvider(mockProvider);

    useCase = new PhaseTransitionUseCase(mockFs, '/core');
  });

  afterEach(() => {
    resetContainer();
  });

  describe('execute', () => {
    it('should fail when transitioning between non-consecutive phases', async () => {
      const result = await useCase.execute('phase-0', 'phase-2', [], '/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid phase transition');
    });

    it('should fail for invalid phase values', async () => {
      const result = await useCase.execute('invalid', 'phase-1', [], '/project');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Invalid phase transition');
    });

    it('should track executed tools', async () => {
      const tools = ['package-json', 'typescript', 'eslint'];
      const result = await useCase.execute('phase-0', 'phase-1', tools, '/project');

      expect(result.executedTools).toEqual(tools);
    });

    it('should succeed with empty tools array', async () => {
      const result = await useCase.execute('phase-0', 'phase-1', [], '/project');

      expect(result.executedTools).toEqual([]);
    });

    it('should transition from phase-1 to phase-2', async () => {
      const result = await useCase.execute('phase-1', 'phase-2', [], '/project');

      expect(result.from).toBe('phase-1');
      expect(result.to).toBe('phase-2');
    });
  });

  describe('getGateStatus', () => {
    it('should return gate status summary', async () => {
      const status = await useCase.getGateStatus('/project');

      expect(status).toHaveProperty('currentPhase');
      expect(status).toHaveProperty('gatesPassed');
      expect(status).toHaveProperty('gatesFailed');
      expect(status).toHaveProperty('gatesPending');
      expect(status).toHaveProperty('results');
    });

    it('should return results array with gate details', async () => {
      const status = await useCase.getGateStatus('/project');

      expect(Array.isArray(status.results)).toBe(true);
      expect(status.results.length).toBeGreaterThan(0);
    });
  });

  describe('validateGatesWithValidator', () => {
    it('should return gate results with proper structure', async () => {
      const result = await useCase.execute('phase-0', 'phase-1', [], '/project');

      result.gateResults.forEach((gate: GateResult) => {
        expect(gate).toHaveProperty('id');
        expect(gate).toHaveProperty('passed');
        expect(typeof gate.passed).toBe('boolean');
        expect(gate).toHaveProperty('description');
        expect(gate).toHaveProperty('required');
        expect(typeof gate.required).toBe('boolean');
      });
    });

    it('should mark gates as failed when evidence is missing', async () => {
      resetContainer();
      const failingExistsMockFs = createMockFileSystem({
        exists: jest.fn().mockImplementation((p: string) => {
          if (p.includes('prd-template.md')) return Promise.resolve(false);
          if (p.includes('discovery-canvas-template.md')) return Promise.resolve(false);
          if (p.includes('phase-gates.rules.json')) return Promise.resolve(true);
          return Promise.resolve(true);
        }),
        readFile: jest.fn().mockImplementation((p: string) => {
          if (p.includes('.schema.json')) {
            return Promise.resolve(JSON.stringify({ type: 'object', properties: { gates: { type: 'array' } } }));
          }
          if (p.includes('phase-gates.rules.json')) return Promise.resolve(JSON.stringify({
            gates: [{
              phase: 1,
              name: 'Business Sign-Off',
              description: 'Scope frozen.',
              mandatoryEvidence: [
                { artifact: 'PRD', schemaRef: '../schema/prd.schema.json', validation: 'PRD approved' },
                { artifact: 'Discovery Canvas', validation: 'Initiative registered' },
                { artifact: 'Business Case ROI', validation: 'Financial viability documented' },
                { artifact: 'Ballpark Estimation', validation: 'T-Shirt sizing completed' },
              ],
              blockingCriteria: [],
              accountableRole: 'Product Owner',
              waiverAuthority: 'Executive Sponsor',
              waiverRequiredFields: [],
            }],
          }));
          return Promise.resolve('');
        }),
      });
      const failingExistsProvider: IFileSystemProvider = {
        createFileSystem: () => failingExistsMockFs,
      };
      getContainer().setFileSystemProvider(failingExistsProvider);
      const failingExistsUseCase = new PhaseTransitionUseCase(failingExistsMockFs, '/core');
      const result = await failingExistsUseCase.execute('phase-0', 'phase-1', [], '/project');

      const failedGates = result.gateResults.filter((g: GateResult) => !g.passed);
      expect(failedGates.length).toBeGreaterThan(0);
    });
  });

  describe('validateGatesLegacy fallback', () => {
    it('should fall back to legacy validation when validator fails', async () => {
      resetContainer();
      const failingMockFs = createMockFileSystem({
        readFile: jest.fn().mockImplementation((p: string) => {
          if (p.includes('phase-gates.rules.json')) return Promise.reject(new Error('Ruleset not found'));
          return Promise.resolve('');
        }),
      });
      const failingProvider: IFileSystemProvider = {
        createFileSystem: () => failingMockFs,
      };
      getContainer().setFileSystemProvider(failingProvider);

      const failingUseCase = new PhaseTransitionUseCase(failingMockFs, '/core');
      const result = await failingUseCase.execute('phase-0', 'phase-1', [], '/project');

      expect(result).toHaveProperty('gateResults');
      expect(Array.isArray(result.gateResults)).toBe(true);
    });

    it('legacy validation should check evolith.yaml for phase-0', async () => {
      resetContainer();
      const failingMockFs = createMockFileSystem({
        readFile: jest.fn().mockImplementation((p: string) => {
          if (p.includes('phase-gates.rules.json')) return Promise.reject(new Error('Ruleset not found'));
          return Promise.resolve('');
        }),
        exists: jest.fn().mockResolvedValue(true),
        readJson: jest.fn().mockResolvedValue({ coreRef: { version: '1.0.0' } }),
      });
      const failingProvider: IFileSystemProvider = {
        createFileSystem: () => failingMockFs,
      };
      getContainer().setFileSystemProvider(failingProvider);

      const failingUseCase = new PhaseTransitionUseCase(failingMockFs, '/core');
      const result = await failingUseCase.execute('phase-0', 'phase-1', [], '/project');

      expect(result.gateResults.length).toBeGreaterThan(0);
      expect(result.gateResults[0].id).toMatch(/PG1/);
    });

    it('legacy validation should check package.json and src for phase-1', async () => {
      resetContainer();
      const failingMockFs = createMockFileSystem({
        readFile: jest.fn().mockImplementation((p: string) => {
          if (p.includes('phase-gates.rules.json')) return Promise.reject(new Error('Ruleset not found'));
          return Promise.resolve('');
        }),
        exists: jest.fn().mockResolvedValue(true),
      });
      const failingProvider: IFileSystemProvider = {
        createFileSystem: () => failingMockFs,
      };
      getContainer().setFileSystemProvider(failingProvider);

      const failingUseCase = new PhaseTransitionUseCase(failingMockFs, '/core');
      const result = await failingUseCase.execute('phase-1', 'phase-2', [], '/project');

      expect(result.gateResults.length).toBeGreaterThan(0);
      expect(result.gateResults[0].id).toMatch(/PG2/);
    });
  });

  describe('PhaseTransitionResult', () => {
    it('should return complete result structure', async () => {
      const result = await useCase.execute('phase-0', 'phase-1', ['tool-1'], '/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('from');
      expect(result).toHaveProperty('to');
      expect(result).toHaveProperty('gateResults');
      expect(result).toHaveProperty('executedTools');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('errors');
    });

    it('should include warnings array', async () => {
      const result = await useCase.execute('phase-0', 'phase-1', [], '/project');

      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should include errors array', async () => {
      const result = await useCase.execute('phase-0', 'phase-1', [], '/project');

      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
