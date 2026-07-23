import { BlockingCriteriaValidator } from './blocking-criteria-validator';
import type { IFileSystem, ILogger } from '../../domain/interfaces';
import type { PhaseGateDefinition, BlockingCriterion, EvidenceValidationResult } from './phase-gate-validator.service';

function mockFs(overrides: Partial<IFileSystem> = {}): IFileSystem {
  return {
    readFile: async () => '',
    readFileBuffer: async () => Buffer.alloc(0),
    writeFile: async () => {},
    exists: async () => false,
    existsSync: () => false,
    readJson: async () => ({}),
    writeJson: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
    readdirNames: async () => [],
    copy: async () => {},
    ensureDir: async () => {},
    ensureFile: async () => {},
    stat: async () => ({ isDirectory: () => false, isFile: () => true }),
    remove: async () => {},
    ...overrides,
  };
}

function mockLogger(): ILogger {
  return { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
}

function mockEvidenceValidator() {
  return { validate: async () => [] } as any;
}

function makeCriterion(criterion: string, action: string = 'block'): BlockingCriterion {
  return { criterion, action } as BlockingCriterion;
}

function makeGate(blockingCriteria: BlockingCriterion[]): PhaseGateDefinition {
  return { blockingCriteria } as PhaseGateDefinition;
}

describe('BlockingCriteriaValidator', () => {
  const fs = mockFs();
  const logger = mockLogger();
  const evidenceValidator = mockEvidenceValidator();
  const validator = new BlockingCriteriaValidator(fs, logger, evidenceValidator);

  describe('checkBlockingCriteria', () => {
    it('returns empty array when no criteria', async () => {
      const results = await validator.checkBlockingCriteria(makeGate([]), '/project', []);
      expect(results).toEqual([]);
    });

    it('triggers criterion when keyword matches', async () => {
      const criteria = [makeCriterion('mandatory quality metric must be met')];
      // fs.exists returns false, so checkMandatoryQualityMetric returns true (triggered)
      const results = await validator.checkBlockingCriteria(makeGate(criteria), '/project', []);
      expect(results).toHaveLength(1);
      expect(results[0].triggered).toBe(true);
    });

    it('does not trigger when no keyword matches', async () => {
      const criteria = [makeCriterion('unknown criterion with no matching keywords')];
      const results = await validator.checkBlockingCriteria(makeGate(criteria), '/project', []);
      expect(results).toHaveLength(1);
      expect(results[0].triggered).toBe(false);
    });

    it('handles multiple criteria', async () => {
      const criteria = [
        makeCriterion('mandatory quality metric'),
        makeCriterion('unknown criterion'),
        makeCriterion('cve vulnerability found'),
      ];
      const results = await validator.checkBlockingCriteria(makeGate(criteria), '/project', []);
      expect(results).toHaveLength(3);
      expect(results[0].triggered).toBe(true);  // mandatory quality metric
      expect(results[1].triggered).toBe(false); // unknown
      expect(results[2].triggered).toBe(true);  // cve
    });
  });

  describe('checkAcceptanceCriteria', () => {
    it('triggers when acceptance validation is missing', async () => {
      const criteria = [makeCriterion('acceptance criteria remain unchecked')];
      const results = await validator.checkBlockingCriteria(makeGate(criteria), '/project', []);
      expect(results[0].triggered).toBe(true);
    });

    it('does not trigger when acceptance validation is found', async () => {
      const evidence: EvidenceValidationResult[] = [
        { artifact: 'Acceptance Validation', found: true } as EvidenceValidationResult,
      ];
      const criteria = [makeCriterion('acceptance criteria remain unchecked')];
      const results = await validator.checkBlockingCriteria(makeGate(criteria), '/project', evidence);
      expect(results[0].triggered).toBe(false);
    });
  });

  describe('checkTechnicalDebt', () => {
    it('does not trigger when tech-debt report is missing', async () => {
      const criteria = [makeCriterion('technical debt exceeds threshold')];
      const results = await validator.checkBlockingCriteria(makeGate(criteria), '/project', []);
      expect(results[0].triggered).toBe(false);
    });

    it('triggers when debt ratio exceeds 5%', async () => {
      const fsWithDebt = mockFs({
        exists: async (p) => String(p).includes('tech-debt'),
        readFile: async () => JSON.stringify({ debtRatioPct: 7.5 }),
      });
      const validatorWithDebt = new BlockingCriteriaValidator(fsWithDebt, logger, evidenceValidator);
      const criteria = [makeCriterion('technical debt exceeds threshold')];
      const results = await validatorWithDebt.checkBlockingCriteria(makeGate(criteria), '/project', []);
      expect(results[0].triggered).toBe(true);
    });

    it('does not trigger when debt ratio is below 5%', async () => {
      const fsLowDebt = mockFs({
        exists: async (p) => String(p).includes('tech-debt'),
        readFile: async () => JSON.stringify({ debtRatioPct: 3.2 }),
      });
      const validatorLowDebt = new BlockingCriteriaValidator(fsLowDebt, logger, evidenceValidator);
      const criteria = [makeCriterion('technical debt exceeds threshold')];
      const results = await validatorLowDebt.checkBlockingCriteria(makeGate(criteria), '/project', []);
      expect(results[0].triggered).toBe(false);
    });
  });

  describe('checkScopeAmbiguity', () => {
    it('triggers when PRD is missing', async () => {
      const criteria = [makeCriterion('scope is ambiguous or funding unclear')];
      const results = await validator.checkBlockingCriteria(makeGate(criteria), '/project', []);
      expect(results[0].triggered).toBe(true);
    });

    it('does not trigger when PRD is found and no MoSCoW', async () => {
      const evidence: EvidenceValidationResult[] = [
        { artifact: 'PRD', found: true } as EvidenceValidationResult,
      ];
      const criteria = [makeCriterion('scope is ambiguous or funding unclear')];
      const results = await validator.checkBlockingCriteria(makeGate(criteria), '/project', evidence);
      expect(results[0].triggered).toBe(false);
    });
  });

  describe('checkArchitectureDecisions', () => {
    it('triggers when architecture decisions are undocumented', async () => {
      const fsNoAde = mockFs({
        exists: async (p) => !String(p).includes('adrs'),
      });
      const validatorNoAde = new BlockingCriteriaValidator(fsNoAde, logger, evidenceValidator);
      const criteria = [makeCriterion('architecture decisions are undocumented')];
      const results = await validatorNoAde.checkBlockingCriteria(makeGate(criteria), '/project', []);
      expect(results[0].triggered).toBe(true);
    });
  });
});
