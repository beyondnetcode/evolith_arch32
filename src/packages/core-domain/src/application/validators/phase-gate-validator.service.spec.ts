import { PhaseGateValidatorService, PhaseGatesRuleset } from './phase-gate-validator.service';
import { IFileSystem } from '../../domain/interfaces';

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
        jest.clearAllMocks();

    mockFs = createMockFileSystem({
      readFile: jest.fn().mockImplementation((p: string) => {
        if (p.includes('.schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object', properties: { gates: { type: 'array' } } }));
        }
        if (p.includes('adr-matrix.json')) return Promise.resolve(JSON.stringify({ adrs: [{ id: 'ADR-0001' }] }));
        if (p.includes('phase-gates.rules.json')) return Promise.resolve(JSON.stringify(mockRuleset));
        return Promise.resolve(JSON.stringify({})); // default valid JSON
      }),
    });
        
    service = new PhaseGateValidatorService('/core', { fileSystem: mockFs, logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() } });
  });

  afterEach(() => {
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

      // 2 -> 3 with GT-650: the gate corpus no longer stores each artifact's schemaRef, so the
      // artifact registry is read once and cached alongside the gates. The point of this test
      // is unchanged - a second loadRuleset() must not re-read anything - and it still holds.
      expect(mockFs.readFile).toHaveBeenCalledTimes(3); // ruleset, schema, artifact registry
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
        if (p.endsWith('/docs/prd.md')) return Promise.resolve(false);
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
        if (p.endsWith('/docs/prd.md')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const result = await service.validateGate(1, '/project');

      const triggeredBlocks = result.blockingChecks.filter(b => b.triggered);
      expect(triggeredBlocks.length).toBeGreaterThan(0);
    });

    it('should throw for undefined phase gate', async () => {
      await expect(service.validateGate(99, '/project')).rejects.toThrow('Phase gate 99 not defined');
    });

    it('should pass gate 3 when coverage is 80% or higher', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => Promise.resolve(true));
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('coverage-summary.json')) {
          return Promise.resolve(JSON.stringify({ total: { statements: { pct: 85 } } }));
        }
        if (p.includes('adr-matrix.json')) {
          return Promise.resolve(JSON.stringify({ adrs: [{ id: '1' }] }));
        }
        if (p.includes('phase-gates.rules.json')) {
          return Promise.resolve(JSON.stringify(mockRuleset));
        }
        return Promise.resolve('{}');
      });

      const result = await service.validateGate(3, '/project');
      const coverageBlock = result.blockingChecks.find(b => b.criterion.includes('Coverage below threshold'));
      
      expect(coverageBlock?.triggered).toBe(false);
    });

    it('should fail gate 3 when coverage is below 80%', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => Promise.resolve(true));
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('coverage-summary.json')) {
          return Promise.resolve(JSON.stringify({ total: { statements: { pct: 79 } } }));
        }
        if (p.includes('adr-matrix.json')) {
          return Promise.resolve(JSON.stringify({ adrs: [{ id: '1' }] }));
        }
        if (p.includes('phase-gates.rules.json')) {
          return Promise.resolve(JSON.stringify(mockRuleset));
        }
        return Promise.resolve('{}');
      });

      const result = await service.validateGate(3, '/project');
      const coverageBlock = result.blockingChecks.find(b => b.criterion.includes('Coverage below threshold'));
      
      expect(coverageBlock?.triggered).toBe(true);
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
        if (p.includes('.schema.json')) return Promise.resolve(JSON.stringify({ type: 'object', properties: { gates: { type: 'array' } } }));
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
        if (p.includes('.schema.json')) return Promise.resolve(JSON.stringify({ type: 'object', properties: { gates: { type: 'array' } } }));
        return Promise.resolve('');
      });

      const result = await service.validateGate(1, '/project');

      const prdEvidence = result.evidenceResults.find(e => e.artifact === 'PRD');
      expect(prdEvidence?.schemaValid).toBe(false);
    });
  });

  describe('resolveArtifactPath', () => {
    it('should resolve PRD to the satellite docs/prd.md path', async () => {
      await service.validateGate(1, '/satellite');

      // GT-314: must resolve to satellite-native path, not Core template
      expect(mockFs.exists).toHaveBeenCalledWith('/satellite/docs/prd.md');
      expect(mockFs.exists).not.toHaveBeenCalledWith(
        expect.stringContaining('prd-template.md'),
      );
    });

    it('should resolve ADR Registry to satellite docs/architecture/adr-matrix.json', async () => {
      await service.validateGate(2, '/satellite');

      expect(mockFs.exists).toHaveBeenCalledWith(
        '/satellite/docs/architecture/adr-matrix.json',
      );
    });

    it('should resolve CI Pipeline to satellite .github/workflows', async () => {
      await service.validateGate(3, '/satellite');

      expect(mockFs.exists).toHaveBeenCalledWith('/satellite/.github/workflows');
    });

    it('should resolve Coverage Report to satellite coverage/coverage-summary.json', async () => {
      await service.validateGate(3, '/satellite');

      expect(mockFs.exists).toHaveBeenCalledWith(
        '/satellite/coverage/coverage-summary.json',
      );
    });

    it('should resolve Deployment Evidence to satellite .evolith/deployment-evidence.json', async () => {
      await service.validateGate(5, '/satellite');

      expect(mockFs.exists).toHaveBeenCalledWith(
        '/satellite/.evolith/deployment-evidence.json',
      );
    });
  });

  describe('GT-318: GateRegistryService integration', () => {
    const canonicalGateF1 = {
      id: 'gate-f1',
      name: 'Business Sign-Off',
      phase: 'f1',
      description: 'Scope frozen.',
      accountableRole: 'Product Owner',
      waiverAuthority: 'Executive Sponsor',
      requiredArtifacts: [
        { artifact: 'PRD', validation: 'PRD approved', rules: ['rulesets/opa/governance.rego'] },
        { artifact: 'Discovery Canvas', validation: 'Canvas complete', rules: ['rulesets/opa/governance.rego'] },
        { artifact: 'Business Case ROI', validation: 'Financial viability documented', rules: [] },
        { artifact: 'Ballpark Estimation', validation: 'T-Shirt sizing completed', rules: ['rulesets/opa/version-pinning.rego'] },
      ],
      blockingCriteria: [
        { criterion: 'Scope is ambiguous', action: 'BLOCK' },
        { criterion: 'Funding outcome is unclear', action: 'BLOCK' },
        { criterion: 'Architecture constraints are ignored', action: 'BLOCK' },
      ],
    };

    it('uses canonical gate source when gate-f*.json files are present', async () => {
      const registryFs = createMockFileSystem({
        readdirNames: jest.fn().mockResolvedValue(['gate-f1.json']),
        readFile: jest.fn().mockImplementation((p: string) => {
          if (p.includes('gate-f1.json')) return Promise.resolve(JSON.stringify(canonicalGateF1));
          if (p.includes('.schema.json')) return Promise.resolve(JSON.stringify({ type: 'object', properties: {} }));
          if (p.includes('phase-gates.rules.json')) return Promise.resolve(JSON.stringify(mockRuleset));
          return Promise.resolve('{}');
        }),
      });
      const svc = new PhaseGateValidatorService('/core', { fileSystem: registryFs, logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() } });

      const ruleset = await svc.loadRuleset();

      expect(ruleset.gates).toHaveLength(1);
      expect(ruleset.gates[0].name).toBe('Business Sign-Off');
      expect(ruleset.version).toBe('2.0.0');
    });

    it('validateGate populates canonicalGateId with stable ID, not substring', async () => {
      const registryFs = createMockFileSystem({
        readdirNames: jest.fn().mockResolvedValue(['gate-f1.json']),
        readFile: jest.fn().mockImplementation((p: string) => {
          if (p.includes('gate-f1.json')) return Promise.resolve(JSON.stringify(canonicalGateF1));
          if (p.includes('.schema.json')) return Promise.resolve(JSON.stringify({ type: 'object', properties: {} }));
          if (p.includes('phase-gates.rules.json')) return Promise.resolve(JSON.stringify(mockRuleset));
          return Promise.resolve('{}');
        }),
      });
      const svc = new PhaseGateValidatorService('/core', { fileSystem: registryFs, logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() } });

      const result = await svc.validateGate(1, '/project');

      expect(result.canonicalGateId).toBe('gate-f1');
    });

    it('validateGate exposes opaRules from the canonical gate definition', async () => {
      const registryFs = createMockFileSystem({
        readdirNames: jest.fn().mockResolvedValue(['gate-f1.json']),
        readFile: jest.fn().mockImplementation((p: string) => {
          if (p.includes('gate-f1.json')) return Promise.resolve(JSON.stringify(canonicalGateF1));
          if (p.includes('.schema.json')) return Promise.resolve(JSON.stringify({ type: 'object', properties: {} }));
          if (p.includes('phase-gates.rules.json')) return Promise.resolve(JSON.stringify(mockRuleset));
          return Promise.resolve('{}');
        }),
      });
      const svc = new PhaseGateValidatorService('/core', { fileSystem: registryFs, logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() } });

      const result = await svc.validateGate(1, '/project');

      expect(result.opaRules).toContain('rulesets/opa/governance.rego');
      expect(result.opaRules).toContain('rulesets/opa/version-pinning.rego');
    });

    it('falls back to legacy source when no gate-f*.json files exist', async () => {
      const legacyFs = createMockFileSystem({
        readdirNames: jest.fn().mockResolvedValue([]),
        readFile: jest.fn().mockImplementation((p: string) => {
          if (p.includes('.schema.json')) return Promise.resolve(JSON.stringify({ type: 'object', properties: { gates: { type: 'array' } } }));
          if (p.includes('phase-gates.rules.json')) return Promise.resolve(JSON.stringify(mockRuleset));
          return Promise.resolve('{}');
        }),
      });
      const svc = new PhaseGateValidatorService('/core', { fileSystem: legacyFs, logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() } });

      const ruleset = await svc.loadRuleset();

      expect(ruleset.gates).toHaveLength(5);
    });
  });

  describe('blocking criteria checks', () => {
    it('should detect scope ambiguity when PRD is missing', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.endsWith('/docs/prd.md')) return Promise.resolve(false);
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
        if (p.includes('.schema.json')) return Promise.resolve(JSON.stringify({ type: 'object', properties: { gates: { type: 'array' } } }));
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

// ---------------------------------------------------------------------------
// GT-572 — corePath discovery
// ---------------------------------------------------------------------------

describe('PhaseGateValidatorService.findCorePath (GT-572)', () => {
  /**
   * An fs that answers `existsSync` only for a fixed set of absolute paths, so a
   * test states a repository LAYOUT rather than a boolean.
   */
  const fsWith = (present: string[]): IFileSystem =>
    createMockFileSystem({
      existsSync: jest.fn((p: string) => present.includes(p)) as unknown as IFileSystem['existsSync'],
    });

  const resolve = (fs: IFileSystem, from: string): string =>
    (new PhaseGateValidatorService(undefined, {
      fileSystem: fs,
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as never,
    }) as unknown as { findCorePath(p: string): string }).findCorePath(from);

  it('resolves the REPOSITORY ROOT, not <root>/src, in the post-refactor layout', () => {
    // The layout this repository actually has: `rulesets/` lives under `src/`,
    // the gate definitions live at the root. Probing for `rulesets` alone stopped
    // at `/repo/src` and every gate evaluation failed with RULESET_NOT_FOUND.
    //
    // GT-705 — the fixture now states a CORPUS rather than a directory, because
    // that is what qualification asks: a ruleset family inside the candidate.
    const fs = fsWith([
      '/repo/src/rulesets/governance',
      '/repo/reference/governance/sdlc/gates',
    ]);

    expect(resolve(fs, '/repo/src/packages/mcp-server')).toBe('/repo');
  });

  it('still resolves a legacy layout that has rulesets/ but no reference/ tree', () => {
    const fs = fsWith(['/legacy/rulesets/sdlc']);

    expect(resolve(fs, '/legacy/packages/thing')).toBe('/legacy');
  });

  /**
   * GT-566's defect, asserted rather than described: the Core repo carries a
   * satellite-side `rulesets/agents` directory that shares the name and holds no
   * rules. An existence check latches onto it and reports emptiness as an answer.
   */
  it('does NOT accept a rulesets/ directory that holds no ruleset family', () => {
    const fs = fsWith(['/repo/rulesets', '/repo/rulesets/agents']);

    expect(resolve(fs, '/repo/satellite')).not.toBe('/repo');
  });

  /**
   * GT-705 — this case asserted the DEFECT, and its own name said so: "falls back
   * to the sibling ../evolith convention". That convention is the vendor's
   * monorepo layout treated as a property of the filesystem, and it is why the
   * published MCP server answered RULESET_NOT_FOUND for every corpus-dependent
   * tool from a clean npm install.
   *
   * There is no name-shaped fallback now. The satellite comes back, so the
   * refusal downstream names a path that really exists.
   */
  it('returns the satellite itself when no corpus is anywhere above it', () => {
    const fs = fsWith([]);

    expect(resolve(fs, '/somewhere/satellite')).toBe('/somewhere/satellite');
  });
});
