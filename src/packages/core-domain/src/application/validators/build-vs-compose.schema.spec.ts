import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { PhaseGateValidatorService } from './phase-gate-validator.service';

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const SCHEMA = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'rulesets/schema/build-vs-compose.schema.json'), 'utf-8'),
);
const PHASE_GATES = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'rulesets/sdlc/phase-gates.rules.json'), 'utf-8'),
);

function validator() {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  return ajv.compile(SCHEMA);
}

const validArtifact = {
  initiative: 'payments-ledger',
  alternatives: [
    { name: 'Stripe', kind: 'commercial', functionalCoverage: 'full' },
    { name: 'ledger-oss', kind: 'open-source', functionalCoverage: 'partial — missing reconciliation' },
  ],
  disposition: 'Integrate',
  threeYearCost: { currency: 'USD', totalCost: 120000, operatingBurden: '0.5 FTE ongoing' },
  licensing: { license: 'MIT', redistributionConstraints: 'none' },
  security: { tenantIsolation: 'row-level per tenant', dataOwnership: 'tenant-owned, EU residency' },
  providerReplaceability: 'High — adapter behind an ACL port',
  proofOfConcept: { required: true, notes: 'spike the reconciliation gap' },
};

describe('Build-versus-Compose gate evidence (GT-51)', () => {
  it('is a registered Phase 1 Business Sign-Off evidence with a schema reference', () => {
    const phase1 = PHASE_GATES.gates.find((g: { phase: number }) => g.phase === 1);
    const evidence = phase1.mandatoryEvidence.find(
      (e: { artifact: string }) => e.artifact === 'Build-versus-Compose Analysis',
    );
    expect(evidence).toBeDefined();
    expect(evidence.schemaRef).toBe('../schema/build-vs-compose.schema.json');
  });

  it('accepts a complete analysis', () => {
    const validate = validator();
    expect(validate(validArtifact)).toBe(true);
  });

  it('rejects a missing governed disposition', () => {
    const validate = validator();
    const { disposition, ...withoutDisposition } = validArtifact;
    expect(validate(withoutDisposition)).toBe(false);
    void disposition;
  });

  it('rejects an unknown disposition value', () => {
    const validate = validator();
    expect(validate({ ...validArtifact, disposition: 'Maybe' })).toBe(false);
  });

  it('requires native justification when the disposition is Build', () => {
    const validate = validator();
    expect(validate({ ...validArtifact, disposition: 'Build' })).toBe(false);
    expect(validate({ ...validArtifact, disposition: 'Build', nativeJustification: 'No alternative covers X' })).toBe(true);
  });

  it('rejects missing three-year cost or security evidence', () => {
    const validate = validator();
    const { threeYearCost, ...noCost } = validArtifact;
    expect(validate(noCost)).toBe(false);
    void threeYearCost;
    const { security, ...noSecurity } = validArtifact;
    expect(validate(noSecurity)).toBe(false);
    void security;
  });

  describe('phase-gate validator integration', () => {
    function makeService(artifact: unknown | null) {
      const buildVsComposePath = path.join('/project', '.evolith', 'build-vs-compose.json');
      const fsMock = {
        exists: jest.fn(async (p: string) => {
          if (p.endsWith('build-vs-compose.schema.json')) return true;
          return p === buildVsComposePath && artifact !== null;
        }),
        readFile: jest.fn(async (p: string) => {
          if (p === buildVsComposePath) return JSON.stringify(artifact);
          if (p.endsWith('build-vs-compose.schema.json')) return JSON.stringify(SCHEMA);
          throw new Error(`unexpected read: ${p}`);
        }),
      } as unknown;
      return new PhaseGateValidatorService('/core', { fileSystem: fsMock, logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() } });
    }

    it('passes the evidence content check for a valid artifact', async () => {
      const service = makeService(validArtifact);
      const result = await (service as unknown).evidenceValidator.validateSingleEvidence(
        { artifact: 'Build-versus-Compose Analysis', schemaRef: '../schema/build-vs-compose.schema.json' },
        '/project',
      );
      expect(result.found).toBe(true);
      expect(result.schemaValid).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('fails the content check when the disposition is missing', async () => {
      const { disposition, ...invalid } = validArtifact;
      void disposition;
      const service = makeService(invalid);
      const result = await (service as unknown).evidenceValidator.validateSingleEvidence(
        { artifact: 'Build-versus-Compose Analysis', schemaRef: '../schema/build-vs-compose.schema.json' },
        '/project',
      );
      expect(result.found).toBe(true);
      expect(result.schemaValid).toBe(false);
      expect(result.passed).toBe(false);
    });

    it('fails when the artifact is absent', async () => {
      const service = makeService(null);
      const result = await (service as unknown).evidenceValidator.validateSingleEvidence(
        { artifact: 'Build-versus-Compose Analysis', schemaRef: '../schema/build-vs-compose.schema.json' },
        '/project',
      );
      expect(result.found).toBe(false);
      expect(result.passed).toBe(false);
    });
  });
});
