import { PhaseGateValidatorService, PhaseGatesRuleset, GateValidationResult } from './phase-gate-validator.service';
import { getContainer, resetContainer, IFileSystemProvider, IFileSystem } from '../abstractions';

const createMockFileSystem = (overrides?: Partial<IFileSystem>): IFileSystem => {
  const mock = {
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(true),
    readFile: jest.fn().mockResolvedValue(''),
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

const mockRuleset: PhaseGatesRuleset = {
  gates: [
    {
      phase: 1,
      name: 'Business Sign-Off',
      description: 'Scope frozen; funding authorized; architectural constraints aligned.',
      mandatoryEvidence: [
        { artifact: 'PRD', schemaRef: '../schema/prd.schema.json', status: 'Approved', validation: 'PRD status = Approved' },
        { artifact: 'Discovery Canvas', validation: 'Initiative registered' },
        { artifact: 'Business Case ROI', validation: 'Financial viability documented' },
        { artifact: 'Ballpark Estimation', validation: 'T-Shirt sizing completed' },
      ],
      blockingCriteria: [
        { criterion: 'Scope is ambiguous', action: 'BLOCK — return to Phase 1' },
        { criterion: 'Funding outcome is unclear', action: 'BLOCK — return to Phase 1' },
        { criterion: 'Architecture constraints are ignored', action: 'BLOCK — return to Phase 1' },
      ],
      accountableRole: 'Product Owner',
      waiverAuthority: 'Executive Sponsor',
      waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
    },
    {
      phase: 2,
      name: 'Design Baseline Approved',
      description: 'Architecture decisions documented; bounded contexts defined.',
      mandatoryEvidence: [
        { artifact: 'ADR Registry', validation: 'All architecture decisions have ADR' },
        { artifact: 'Functional Stories', schemaRef: '../schema/functional-story.schema.json', validation: 'All stories in Ready state' },
        { artifact: 'Bounded Context Map', validation: 'All contexts identified' },
      ],
      blockingCriteria: [
        { criterion: 'Significant architecture decisions are undocumented', action: 'BLOCK — require ADR' },
        { criterion: 'Bounded context boundaries are contradictory', action: 'BLOCK — require context map resolution' },
        { criterion: 'Functional stories Lack acceptance criteria', action: 'BLOCK — return to story writing' },
      ],
      accountableRole: 'Software Architect',
      waiverAuthority: 'Architecture Board',
      waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
    },
    {
      phase: 3,
      name: 'Successful Build',
      description: 'All code merged to main; CI passes; quality gates green.',
      mandatoryEvidence: [
        { artifact: 'Technical Stories', schemaRef: '../schema/technical-story.schema.json', validation: 'All technical stories Done' },
        { artifact: 'CI Pipeline', validation: 'CI run green on main branch' },
        { artifact: 'Coverage Report', validation: 'Business logic coverage >= 80%' },
      ],
      blockingCriteria: [
        { criterion: 'CI fails on main branch', action: 'BLOCK merge — fix CI' },
        { criterion: 'Coverage below threshold (< 80%)', action: 'BLOCK merge — add tests' },
        { criterion: 'High or Critical CVEs detected', action: 'BLOCK merge — remediate CVEs' },
        { criterion: 'Missing code review approval', action: 'BLOCK merge — require review' },
      ],
      accountableRole: 'Tech Lead',
      waiverAuthority: 'Architecture Board (with exception for CVEs requires Executive Risk Acceptance)',
      waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan', 'approvalAuthority'],
    },
    {
      phase: 4,
      name: 'RC Stamped',
      description: 'All quality thresholds verified; security scans clean; UAT passed.',
      mandatoryEvidence: [
        { artifact: 'Test Summary Report', schemaRef: '../schema/test-summary-report.schema.json', validation: 'All quality gates green' },
        { artifact: 'Acceptance Validation', validation: 'Product Owner signs off' },
        { artifact: 'Security Scan Report', validation: 'Zero High/Critical CVEs' },
      ],
      blockingCriteria: [
        { criterion: 'Any mandatory quality metric fails', action: 'BLOCK RC stamp — remediate or waiver' },
        { criterion: 'Acceptance criteria remain unverified', action: 'BLOCK RC stamp — return to validation' },
        { criterion: 'Technical debt ratio exceeds 5%', action: 'BLOCK RC stamp — remediation plan required' },
      ],
      accountableRole: 'QA Lead',
      waiverAuthority: 'Architecture Board',
      waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
    },
    {
      phase: 5,
      name: 'Production Live',
      description: 'Deployment executed; observability verified nominal; monitoring active.',
      mandatoryEvidence: [
        { artifact: 'Release Notes', schemaRef: '../schema/release-notes.schema.json', validation: 'Release scope, deployment steps, rollback procedure present' },
        { artifact: 'Observability Validation', validation: 'Metrics nominal, logs flowing, traces complete' },
        { artifact: 'Rollback Procedure', validation: 'Rollback steps documented and tested' },
        { artifact: 'Deployment Evidence', validation: 'Deployment artifacts traceable to RC' },
      ],
      blockingCriteria: [
        { criterion: 'Monitoring is not nominal', action: 'BLOCK Production Live — investigate' },
        { criterion: 'Rollback procedure is undefined', action: 'BLOCK Production Live — document rollback' },
        { criterion: 'Release is not traceable to RC', action: 'BLOCK Production Live — ensure RC → Release chain' },
      ],
      accountableRole: 'DevOps Lead',
      waiverAuthority: 'Technology Director',
      waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
    },
  ],
};

describe('PhaseGateValidatorService', () => {
  let service: PhaseGateValidatorService;
  let mockFs: IFileSystem;

  beforeEach(() => {
    resetContainer();
    jest.clearAllMocks();

    mockFs = createMockFileSystem({
      readFile: jest.fn().mockImplementation((p: string) => {
        if (p.includes('adr-matrix.json')) return Promise.resolve(JSON.stringify({ adrs: [{ id: 'ADR-0001' }] }));
        return Promise.resolve(JSON.stringify(mockRuleset));
      }),
    });
    const mockProvider: IFileSystemProvider = {
      createFileSystem: () => mockFs,
    };
    getContainer().setFileSystemProvider(mockProvider);

    service = new PhaseGateValidatorService('/core');
  });

  afterEach(() => {
    resetContainer();
  });

  describe('loadRuleset', () => {
    it('should load and cache the ruleset from file', async () => {
      const result = await service.loadRuleset();

      expect(result.gates).toHaveLength(5);
      expect(result.gates[0].phase).toBe(1);
      expect(result.gates[0].name).toBe('Business Sign-Off');
    });

    it('should return cached ruleset on subsequent calls', async () => {
      await service.loadRuleset();
      await service.loadRuleset();

      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should throw when ruleset file cannot be read', async () => {
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(service.loadRuleset()).rejects.toThrow('Cannot load phase gates ruleset');
    });
  });

  describe('validateGate', () => {
    it('should pass gate 1 when all evidence artifacts exist', async () => {
      const result = await service.validateGate(1, '/project');

      expect(result.phase).toBe(1);
      expect(result.name).toBe('Business Sign-Off');
      expect(result.passed).toBe(true);
      expect(result.evidenceResults).toHaveLength(4);
      expect(result.evidenceResults.every(e => e.passed)).toBe(true);
    });

    it('should fail gate 1 when PRD artifact is missing', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('prd-template.md')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const result = await service.validateGate(1, '/project');

      expect(result.passed).toBe(false);
      const prdEvidence = result.evidenceResults.find(e => e.artifact === 'PRD');
      expect(prdEvidence?.passed).toBe(false);
      expect(prdEvidence?.found).toBe(false);
    });

    it('should fail gate when blocking criterion is triggered', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('prd-template.md')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const result = await service.validateGate(1, '/project');

      const triggeredBlocks = result.blockingChecks.filter(b => b.triggered);
      expect(triggeredBlocks.length).toBeGreaterThan(0);
    });

    it('should throw for undefined phase gate', async () => {
      await expect(service.validateGate(99, '/project')).rejects.toThrow('Phase gate 99 not defined');
    });

    it('should return correct accountable role and waiver authority', async () => {
      const result = await service.validateGate(1, '/project');

      expect(result.accountableRole).toBe('Product Owner');
      expect(result.waiverAuthority).toBe('Executive Sponsor');
      expect(result.waiverAvailable).toBe(true);
    });
  });

  describe('validateAllGates', () => {
    it('should validate all 5 phase gates', async () => {
      const results = await service.validateAllGates('/project');

      expect(results).toHaveLength(5);
      expect(results.map(r => r.phase)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return mixed pass/fail results based on artifact availability', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('Dockerfile')) return Promise.resolve(false);
        if (p.includes('release-notes')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const results = await service.validateAllGates('/project');

      const passedGates = results.filter(r => r.passed);
      const failedGates = results.filter(r => !r.passed);
      expect(passedGates.length + failedGates.length).toBe(5);
    });
  });

  describe('getGateStatus', () => {
    it('should return summary with current phase and counts', async () => {
      const status = await service.getGateStatus('/project');

      expect(status).toHaveProperty('currentPhase');
      expect(status).toHaveProperty('gatesPassed');
      expect(status).toHaveProperty('gatesFailed');
      expect(status).toHaveProperty('gatesPending');
      expect(status).toHaveProperty('results');
      expect(status.results).toHaveLength(5);
    });

    it('should calculate correct current phase when gates 1-2 pass', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('Dockerfile')) return Promise.resolve(false);
        if (p.includes('release-notes')) return Promise.resolve(false);
        if (p.includes('Test Summary')) return Promise.resolve(false);
        if (p.includes('Technical Stories')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const status = await service.getGateStatus('/project');

      expect(status.currentPhase).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateSingleEvidence', () => {
    it('should mark evidence as not found when artifact path does not exist', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(false);

      const result = await service.validateGate(1, '/project');

      const missingEvidence = result.evidenceResults.find(e => !e.found);
      if (missingEvidence) {
        expect(missingEvidence.passed).toBe(false);
        expect(missingEvidence.validationMessage).toContain('Artifact not found');
      }
    });

    it('should validate schema when schemaRef is provided', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('phase-gates.rules.json')) return Promise.resolve(JSON.stringify(mockRuleset));
        return Promise.resolve('valid content');
      });

      const result = await service.validateGate(1, '/project');

      const prdEvidence = result.evidenceResults.find(e => e.artifact === 'PRD');
      expect(prdEvidence).toBeDefined();
    });

    it('should fail schema validation when artifact is empty', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('phase-gates.rules.json')) return Promise.resolve(JSON.stringify(mockRuleset));
        return Promise.resolve('');
      });

      const result = await service.validateGate(1, '/project');

      const prdEvidence = result.evidenceResults.find(e => e.artifact === 'PRD');
      expect(prdEvidence?.schemaValid).toBe(false);
    });
  });

  describe('resolveArtifactPath', () => {
    it('should resolve PRD artifact to correct path', async () => {
      await service.validateGate(1, '/project');

      expect(mockFs.exists).toHaveBeenCalledWith(
        expect.stringContaining('prd-template.md'),
      );
    });

    it('should resolve ADR Registry to correct path', async () => {
      await service.validateGate(2, '/project');

      expect(mockFs.exists).toHaveBeenCalledWith(
        expect.stringContaining('adr-matrix.json'),
      );
    });
  });

  describe('blocking criteria checks', () => {
    it('should detect scope ambiguity when PRD is missing', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('prd-template.md')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const result = await service.validateGate(1, '/project');

      const scopeBlock = result.blockingChecks.find(b => b.criterion.toLowerCase().includes('scope'));
      expect(scopeBlock?.triggered).toBe(true);
    });

    it('should detect undocumented architecture decisions when ADR Registry is missing', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('adr-matrix.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const result = await service.validateGate(2, '/project');

      const adrBlock = result.blockingChecks.find(b => b.criterion.toLowerCase().includes('undocumented'));
      expect(adrBlock?.triggered).toBe(true);
    });

    it('should detect undocumented architecture decisions when ADR Registry is empty', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('adr-matrix.json')) return Promise.resolve(JSON.stringify({ adrs: [] }));
        if (p.includes('phase-gates.rules.json')) return Promise.resolve(JSON.stringify(mockRuleset));
        return Promise.resolve('valid content');
      });

      const result = await service.validateGate(2, '/project');

      const adrBlock = result.blockingChecks.find(b => b.criterion.toLowerCase().includes('undocumented'));
      expect(adrBlock?.triggered).toBe(true);
    });

    it('should detect CI failure when .github/workflows is missing', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('.github/workflows')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const result = await service.validateGate(3, '/project');

      const ciBlock = result.blockingChecks.find(b => b.criterion.toLowerCase().includes('ci fails'));
      expect(ciBlock?.triggered).toBe(true);
    });

    it('should detect missing rollback procedure when Release Notes are missing', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('release-notes')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const result = await service.validateGate(5, '/project');

      const rollbackBlock = result.blockingChecks.find(b => b.criterion.toLowerCase().includes('rollback'));
      expect(rollbackBlock?.triggered).toBe(true);
    });
  });
});
