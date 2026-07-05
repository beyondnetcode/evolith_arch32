import { EvidenceValidator } from './evidence-validator';
import { PhaseGateDefinition } from './phase-gate-validator.service';

const SATELLITE_ROOT = '/satellite/my-project';
const CORE_PATH = '/core/evolith';
const RULESET_PATH = `${CORE_PATH}/rulesets/sdlc/phase-gates.rules.json`;

const mockLogger = {
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

const createMockFs = (overrides) => ({
  exists: jest.fn().mockResolvedValue(true),
  existsSync: jest.fn().mockReturnValue(true),
  readFile: jest.fn().mockResolvedValue('{}'),
  readJson: jest.fn().mockResolvedValue({}),
  readdir: jest.fn().mockResolvedValue([]),
  readdirNames: jest.fn().mockResolvedValue([]),
  writeFile: jest.fn().mockResolvedValue(undefined),
  writeJson: jest.fn().mockResolvedValue(undefined),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ isDirectory: () => false, isFile: () => true }),
  ...overrides,
} as unknown as IFileSystem);

describe('EvidenceValidator — GT-314', () => {
  let validator: EvidenceValidator;
  let mockFs: IFileSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = createMockFs();
    validator = new EvidenceValidator(mockFs, mockLogger, RULESET_PATH, CORE_PATH);
  });

  // ------------------------------------------------------------------ //
  // resolveArtifactPath — satellite path resolution                      //
  // ------------------------------------------------------------------ //

  describe('resolveArtifactPath — satellite paths', () => {
    it('resolves PRD to satellite docs/prd.md, not Core template', () => {
      const resolved = validator.resolveArtifactPath('PRD', SATELLITE_ROOT);
      expect(resolved).toBe(`${SATELLITE_ROOT}/docs/prd.md`);
      expect(resolved).not.toContain('prd-template.md');
    });

    it('resolves Discovery Canvas to satellite docs/discovery-canvas.md', () => {
      const resolved = validator.resolveArtifactPath('Discovery Canvas', SATELLITE_ROOT);
      expect(resolved).toBe(`${SATELLITE_ROOT}/docs/discovery-canvas.md`);
    });

    it('resolves Technical Feasibility Canvas to satellite docs path', () => {
      const resolved = validator.resolveArtifactPath('Technical Feasibility Canvas', SATELLITE_ROOT);
      expect(resolved).toBe(`${SATELLITE_ROOT}/docs/technical-feasibility.md`);
    });

    it('resolves Bounded Context Map to satellite docs/architecture path', () => {
      const resolved = validator.resolveArtifactPath('Bounded Context Map', SATELLITE_ROOT);
      expect(resolved).toBe(`${SATELLITE_ROOT}/docs/architecture/bounded-context-map.md`);
    });

    it('resolves ADR Registry to satellite docs/architecture path', () => {
      const resolved = validator.resolveArtifactPath('ADR Registry', SATELLITE_ROOT);
      expect(resolved).toBe(`${SATELLITE_ROOT}/docs/architecture/adr-matrix.json`);
    });

    it('resolves Coverage Report to satellite coverage/coverage-summary.json', () => {
      const resolved = validator.resolveArtifactPath('Coverage Report', SATELLITE_ROOT);
      expect(resolved).toBe(`${SATELLITE_ROOT}/coverage/coverage-summary.json`);
    });

    it('resolves CI Pipeline to satellite .github/workflows', () => {
      const resolved = validator.resolveArtifactPath('CI Pipeline', SATELLITE_ROOT);
      expect(resolved).toBe(`${SATELLITE_ROOT}/.github/workflows`);
    });

    it('resolves Deployment Evidence to satellite .evolith dir', () => {
      const resolved = validator.resolveArtifactPath('Deployment Evidence', SATELLITE_ROOT);
      expect(resolved).toBe(`${SATELLITE_ROOT}/.evolith/deployment-evidence.json`);
    });

    it('falls back to bare path join for unknown artifact names', () => {
      const resolved = validator.resolveArtifactPath('custom-artifact.json', SATELLITE_ROOT);
      expect(resolved).toBe(`${SATELLITE_ROOT}/custom-artifact.json`);
    });
  });

  // ------------------------------------------------------------------ //
  // resolveArtifactPath — Core template fallback (no satellite mapping)  //
  // ------------------------------------------------------------------ //

  describe('resolveArtifactPath — Core template fallback', () => {
    it('does not fall back to Core template for artifacts that have a satellite mapping', () => {
      const resolved = validator.resolveArtifactPath('PRD', SATELLITE_ROOT);
      expect(resolved).not.toContain(CORE_PATH);
    });
  });

  // ------------------------------------------------------------------ //
  // Artifact existence check                                             //
  // ------------------------------------------------------------------ //

  describe('validateEvidence — existence check', () => {
    const gate: PhaseGateDefinition = {
      phase: 1,
      name: 'Business Sign-Off',
      description: 'Test gate',
      mandatoryEvidence: [{ artifact: 'PRD', validation: 'PRD exists' }],
      blockingCriteria: [],
      accountableRole: 'PO',
      waiverAuthority: 'Exec',
      waiverRequiredFields: [],
    };

    it('passes when satellite artifact exists', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);

      const results = await validator.validateEvidence(gate, SATELLITE_ROOT);

      expect(results).toHaveLength(1);
      expect(results[0].found).toBe(true);
      expect(results[0].passed).toBe(true);
      // GT-314: must check satellite path, not Core template
      expect(mockFs.exists).toHaveBeenCalledWith(`${SATELLITE_ROOT}/docs/prd.md`);
    });

    it('fails with artifact-not-found when satellite artifact is absent', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p === `${SATELLITE_ROOT}/docs/prd.md`) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const results = await validator.validateEvidence(gate, SATELLITE_ROOT);

      expect(results[0].found).toBe(false);
      expect(results[0].passed).toBe(false);
      expect(results[0].validationMessage).toContain('Artifact not found');
      expect(results[0].validationMessage).toContain(`${SATELLITE_ROOT}/docs/prd.md`);
    });
  });

  // ------------------------------------------------------------------ //
  // AJV structural validation                                            //
  // ------------------------------------------------------------------ //

  describe('validateEvidence — AJV structural validation', () => {
    const schemaRef = '../schema/prd.schema.json';
    const gate: PhaseGateDefinition = {
      phase: 1,
      name: 'Business Sign-Off',
      description: 'Test gate',
      mandatoryEvidence: [{ artifact: 'ADR Registry', schemaRef, validation: 'schema valid' }],
      blockingCriteria: [],
      accountableRole: 'PO',
      waiverAuthority: 'Exec',
      waiverRequiredFields: [],
    };

    const validArtifact = JSON.stringify({ title: 'My PRD', status: 'Approved' });
    const validSchema = JSON.stringify({
      type: 'object',
      required: ['title', 'status'],
      properties: {
        title: { type: 'string' },
        status: { type: 'string' },
      },
    });

    it('passes AJV validation when artifact conforms to schema', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('.schema.json')) return Promise.resolve(validSchema);
        return Promise.resolve(validArtifact);
      });

      const results = await validator.validateEvidence(gate, SATELLITE_ROOT);

      expect(results[0].found).toBe(true);
      expect(results[0].schemaValid).toBe(true);
      expect(results[0].passed).toBe(true);
    });

    it('fails AJV validation when artifact is missing required fields', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('.schema.json')) return Promise.resolve(validSchema);
        // artifact missing 'status' field
        return Promise.resolve(JSON.stringify({ title: 'My PRD' }));
      });

      const results = await validator.validateEvidence(gate, SATELLITE_ROOT);

      expect(results[0].found).toBe(true);
      expect(results[0].schemaValid).toBe(false);
      expect(results[0].passed).toBe(false);
      expect(results[0].validationMessage).toContain('schema validation failed');
    });

    it('fails schema validation when artifact content is empty', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('.schema.json')) return Promise.resolve(validSchema);
        return Promise.resolve('');
      });

      const results = await validator.validateEvidence(gate, SATELLITE_ROOT);

      expect(results[0].schemaValid).toBe(false);
      expect(results[0].passed).toBe(false);
    });

    it('fails schema validation when schema file is missing', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('.schema.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const results = await validator.validateEvidence(gate, SATELLITE_ROOT);

      expect(results[0].found).toBe(true);
      expect(results[0].schemaValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Schema file not found'));
    });

    it('skips AJV when no schemaRef is defined (completeness-only artifact)', async () => {
      const gateNoSchema: PhaseGateDefinition = {
        ...gate,
        mandatoryEvidence: [{ artifact: 'CI Pipeline', validation: 'CI green' }],
      };
      (mockFs.exists as jest.Mock).mockResolvedValue(true);

      const results = await validator.validateEvidence(gateNoSchema, SATELLITE_ROOT);

      expect(results[0].schemaValid).toBe(true); // default true when no schema
      expect(results[0].passed).toBe(true);
    });
  });

  // ------------------------------------------------------------------ //
  // Completeness check                                                   //
  // ------------------------------------------------------------------ //

  describe('validateEvidence — completeness (multi-artifact gate)', () => {
    const gate: PhaseGateDefinition = {
      phase: 1,
      name: 'Business Sign-Off',
      description: 'Test gate',
      mandatoryEvidence: [
        { artifact: 'PRD', validation: 'PRD exists' },
        { artifact: 'Discovery Canvas', validation: 'Canvas exists' },
        { artifact: 'Ballpark Estimation', validation: 'Estimation exists' },
      ],
      blockingCriteria: [],
      accountableRole: 'PO',
      waiverAuthority: 'Exec',
      waiverRequiredFields: [],
    };

    it('returns one result per evidence artifact', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(true);

      const results = await validator.validateEvidence(gate, SATELLITE_ROOT);

      expect(results).toHaveLength(3);
      const artifacts = results.map(r => r.artifact);
      expect(artifacts).toContain('PRD');
      expect(artifacts).toContain('Discovery Canvas');
      expect(artifacts).toContain('Ballpark Estimation');
    });

    it('partial completeness: only missing artifacts fail', async () => {
      (mockFs.exists as jest.Mock).mockImplementation((p: string) => {
        if (p.endsWith('/docs/prd.md')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const results = await validator.validateEvidence(gate, SATELLITE_ROOT);

      const prd = results.find(r => r.artifact === 'PRD');
      const canvas = results.find(r => r.artifact === 'Discovery Canvas');
      const estimation = results.find(r => r.artifact === 'Ballpark Estimation');

      expect(prd?.passed).toBe(false);
      expect(canvas?.passed).toBe(true);
      expect(estimation?.passed).toBe(true);
    });
  });
});
