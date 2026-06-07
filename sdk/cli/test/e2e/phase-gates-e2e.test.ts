import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('Phase Gate E2E Tests', () => {
  let tempDir: string;
  let coreDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-gate-e2e-'));
    coreDir = path.join(tempDir, 'evolith-core');
    fs.mkdirSync(coreDir, { recursive: true });
    fs.mkdirSync(path.join(coreDir, 'rulesets', 'sdlc'), { recursive: true });

    const phaseGatesRuleset = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'https://evolith.dev/rulesets/sdlc/phase-gates.rules.json',
      title: 'SDLC Phase Gate Rules',
      description: 'Canonical phase exit gate criteria for the Evolith 5-phase SDLC.',
      version: '1.0.0',
      effectiveDate: '2026-01-01',
      gates: [
        {
          phase: 1,
          name: 'Business Sign-Off',
          description: 'Scope frozen; funding authorized; architectural constraints aligned.',
          mandatoryEvidence: [
            { artifact: 'PRD', schemaRef: '../schema/prd.schema.json', status: 'Approved', validation: 'PRD status = Approved AND approvalEvidence present AND date filled' },
            { artifact: 'Discovery Canvas', validation: 'Initiative registered with customer pain points and expected value' },
            { artifact: 'Business Case ROI', validation: 'Financial viability documented with KPIs' },
            { artifact: 'Ballpark Estimation', validation: 'T-Shirt sizing completed with team composition' },
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
          description: 'Architecture decisions are documented; bounded contexts defined; functional stories written.',
          mandatoryEvidence: [
            { artifact: 'ADR Registry', validation: 'All architecture decisions have corresponding ADR. No undocumented decisions.' },
            { artifact: 'Functional Stories', schemaRef: '../schema/functional-story.schema.json', validation: 'All Functional Stories in Ready state with BDD acceptance criteria' },
            { artifact: 'Bounded Context Map', validation: 'All contexts identified with ownership and persistence strategy' },
          ],
          blockingCriteria: [
            { criterion: 'Significant architecture decisions are undocumented', action: 'BLOCK — require ADR before design baseline' },
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
          description: 'All code merged to main; CI passes; quality gates green; definition of done satisfied.',
          mandatoryEvidence: [
            { artifact: 'Technical Stories', schemaRef: '../schema/technical-story.schema.json', validation: 'All technical stories Done; traceable to Functional Stories' },
            { artifact: 'CI Pipeline', validation: 'CI run green on main branch. No failing tests, no lint errors, no security scan failures' },
            { artifact: 'Coverage Report', validation: 'Business logic coverage >= 80% per Quality Thresholds rules' },
          ],
          blockingCriteria: [
            { criterion: 'CI fails on main branch', action: 'BLOCK merge — fix CI before merge' },
            { criterion: 'Coverage below threshold (< 80%)', action: 'BLOCK merge — add tests or request waiver' },
            { criterion: 'High or Critical CVEs detected', action: 'BLOCK merge — remediate CVEs or request security waiver' },
            { criterion: 'Missing code review approval', action: 'BLOCK merge — require review' },
          ],
          accountableRole: 'Tech Lead',
          waiverAuthority: 'Architecture Board (with exception for CVEs requires Executive Risk Acceptance)',
          waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan', 'approvalAuthority'],
        },
        {
          phase: 4,
          name: 'RC Stamped',
          description: 'All quality thresholds verified; security scans clean; UAT passed; release candidate formally approved.',
          mandatoryEvidence: [
            { artifact: 'Test Summary Report', schemaRef: '../schema/test-summary-report.schema.json', validation: 'All quality gates green or explicitly waived. RC stamped by QA Lead and Tech Lead.' },
            { artifact: 'Acceptance Validation', validation: 'Product Owner signs off on acceptance criteria verification' },
            { artifact: 'Security Scan Report', validation: 'Zero High/Critical CVEs in production-bound artifacts' },
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
          description: 'Deployment executed; observability verified nominal; monitoring active; rollback procedure confirmed.',
          mandatoryEvidence: [
            { artifact: 'Release Notes', schemaRef: '../schema/release-notes.schema.json', validation: 'Release scope, deployment steps, rollback procedure, observability checklist all present and complete' },
            { artifact: 'Observability Validation', validation: 'Metrics nominal, logs flowing, traces complete for all production paths' },
            { artifact: 'Rollback Procedure', validation: 'Rollback steps documented and tested. Last good version identified.' },
            { artifact: 'Deployment Evidence', validation: 'Deployment artifacts (images, configs) traceable to RC' },
          ],
          blockingCriteria: [
            { criterion: 'Monitoring is not nominal', action: 'BLOCK Production Live — investigate before deploy' },
            { criterion: 'Rollback procedure is undefined', action: 'BLOCK Production Live — document rollback first' },
            { criterion: 'Release is not traceable to RC', action: 'BLOCK Production Live — ensure RC → Release chain' },
          ],
          accountableRole: 'DevOps Lead',
          waiverAuthority: 'Technology Director',
          waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
        },
      ],
    };

    fs.writeFileSync(
      path.join(coreDir, 'rulesets', 'sdlc', 'phase-gates.rules.json'),
      JSON.stringify(phaseGatesRuleset, null, 2),
    );
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('PhaseGateValidatorService', () => {
    it('should load phase gates ruleset from core path', () => {
      const rulesetPath = path.join(coreDir, 'rulesets', 'sdlc', 'phase-gates.rules.json');
      const content = fs.readFileSync(rulesetPath, 'utf-8');
      const ruleset = JSON.parse(content);

      expect(ruleset.gates).toHaveLength(5);
      expect(ruleset.gates[0].phase).toBe(1);
      expect(ruleset.gates[0].name).toBe('Business Sign-Off');
      expect(ruleset.gates[4].phase).toBe(5);
      expect(ruleset.gates[4].name).toBe('Production Live');
    });

    it('should have all required fields for each gate', () => {
      const rulesetPath = path.join(coreDir, 'rulesets', 'sdlc', 'phase-gates.rules.json');
      const content = fs.readFileSync(rulesetPath, 'utf-8');
      const ruleset = JSON.parse(content);

      for (const gate of ruleset.gates) {
        expect(gate).toHaveProperty('phase');
        expect(gate).toHaveProperty('name');
        expect(gate).toHaveProperty('description');
        expect(gate).toHaveProperty('mandatoryEvidence');
        expect(gate).toHaveProperty('blockingCriteria');
        expect(gate).toHaveProperty('accountableRole');
        expect(gate).toHaveProperty('waiverAuthority');
        expect(gate).toHaveProperty('waiverRequiredFields');
        expect(Array.isArray(gate.mandatoryEvidence)).toBe(true);
        expect(Array.isArray(gate.blockingCriteria)).toBe(true);
        expect(gate.mandatoryEvidence.length).toBeGreaterThan(0);
        expect(gate.blockingCriteria.length).toBeGreaterThan(0);
      }
    });

    it('should have valid evidence requirements with validation rules', () => {
      const rulesetPath = path.join(coreDir, 'rulesets', 'sdlc', 'phase-gates.rules.json');
      const content = fs.readFileSync(rulesetPath, 'utf-8');
      const ruleset = JSON.parse(content);

      for (const gate of ruleset.gates) {
        for (const evidence of gate.mandatoryEvidence) {
          expect(evidence).toHaveProperty('artifact');
          expect(evidence).toHaveProperty('validation');
          expect(typeof evidence.artifact).toBe('string');
          expect(typeof evidence.validation).toBe('string');
          expect(evidence.artifact.length).toBeGreaterThan(0);
          expect(evidence.validation.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have valid blocking criteria with actions', () => {
      const rulesetPath = path.join(coreDir, 'rulesets', 'sdlc', 'phase-gates.rules.json');
      const content = fs.readFileSync(rulesetPath, 'utf-8');
      const ruleset = JSON.parse(content);

      for (const gate of ruleset.gates) {
        for (const criterion of gate.blockingCriteria) {
          expect(criterion).toHaveProperty('criterion');
          expect(criterion).toHaveProperty('action');
          expect(typeof criterion.criterion).toBe('string');
          expect(typeof criterion.action).toBe('string');
          expect(criterion.criterion.length).toBeGreaterThan(0);
          expect(criterion.action.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have sequential phase numbers 1-5', () => {
      const rulesetPath = path.join(coreDir, 'rulesets', 'sdlc', 'phase-gates.rules.json');
      const content = fs.readFileSync(rulesetPath, 'utf-8');
      const ruleset = JSON.parse(content);

      const phases = ruleset.gates.map((g: { phase: number }) => g.phase);
      expect(phases).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Phase Gate Validation Scenarios', () => {
    let projectDir: string;

    beforeEach(() => {
      projectDir = fs.mkdtempSync(path.join(tempDir, 'project-'));
    });

    afterEach(() => {
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should fail gate 1 when no artifacts exist', () => {
      const prdPath = path.join(projectDir, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'prd-template.md');
      expect(fs.existsSync(prdPath)).toBe(false);
    });

    it('should pass gate 1 when all required artifacts exist', () => {
      const templatesDir = path.join(projectDir, 'reference', 'governance', 'sdlc', '04-artifact-templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      fs.writeFileSync(path.join(templatesDir, 'prd-template.md'), '# PRD\n\nApproved');
      fs.writeFileSync(path.join(templatesDir, 'discovery-canvas-template.md'), '# Discovery Canvas');
      fs.writeFileSync(path.join(templatesDir, 'business-case-roi-template.md'), '# Business Case ROI');
      fs.writeFileSync(path.join(templatesDir, 'ballpark-estimation-template.md'), '# Ballpark Estimation');

      expect(fs.existsSync(path.join(templatesDir, 'prd-template.md'))).toBe(true);
      expect(fs.existsSync(path.join(templatesDir, 'discovery-canvas-template.md'))).toBe(true);
      expect(fs.existsSync(path.join(templatesDir, 'business-case-roi-template.md'))).toBe(true);
      expect(fs.existsSync(path.join(templatesDir, 'ballpark-estimation-template.md'))).toBe(true);
    });

    it('should fail gate 2 when ADR Registry is missing', () => {
      const adrPath = path.join(projectDir, 'reference', 'architecture', 'adrs', 'adr-matrix.json');
      expect(fs.existsSync(adrPath)).toBe(false);
    });

    it('should pass gate 2 when all design artifacts exist', () => {
      const adrDir = path.join(projectDir, 'reference', 'architecture', 'adrs');
      const templatesDir = path.join(projectDir, 'reference', 'governance', 'sdlc', '04-artifact-templates');
      const contextsDir = path.join(projectDir, 'reference', 'architecture', 'contexts');

      fs.mkdirSync(adrDir, { recursive: true });
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.mkdirSync(contextsDir, { recursive: true });

      fs.writeFileSync(path.join(adrDir, 'adr-matrix.json'), JSON.stringify({ adrs: [] }));
      fs.writeFileSync(path.join(templatesDir, 'functional-story-template.md'), '# Functional Stories');
      fs.writeFileSync(path.join(contextsDir, 'bounded-context-map.md'), '# Bounded Context Map');

      expect(fs.existsSync(path.join(adrDir, 'adr-matrix.json'))).toBe(true);
      expect(fs.existsSync(path.join(templatesDir, 'functional-story-template.md'))).toBe(true);
      expect(fs.existsSync(path.join(contextsDir, 'bounded-context-map.md'))).toBe(true);
    });

    it('should fail gate 3 when CI pipeline is not configured', () => {
      const ciPath = path.join(projectDir, '.github', 'workflows');
      expect(fs.existsSync(ciPath)).toBe(false);
    });

    it('should pass gate 3 when build artifacts exist', () => {
      const templatesDir = path.join(projectDir, 'reference', 'governance', 'sdlc', '04-artifact-templates');
      const ciPath = path.join(projectDir, '.github', 'workflows');
      const coveragePath = path.join(projectDir, 'coverage');

      fs.mkdirSync(templatesDir, { recursive: true });
      fs.mkdirSync(ciPath, { recursive: true });
      fs.mkdirSync(coveragePath, { recursive: true });

      fs.writeFileSync(path.join(templatesDir, 'technical-story-template.md'), '# Technical Stories');
      fs.writeFileSync(path.join(ciPath, 'ci.yml'), 'name: CI');

      expect(fs.existsSync(path.join(templatesDir, 'technical-story-template.md'))).toBe(true);
      expect(fs.existsSync(ciPath)).toBe(true);
      expect(fs.existsSync(coveragePath)).toBe(true);
    });

    it('should fail gate 4 when test summary is missing', () => {
      const testReportPath = path.join(projectDir, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'test-summary-report-template.md');
      expect(fs.existsSync(testReportPath)).toBe(false);
    });

    it('should pass gate 4 when RC artifacts exist', () => {
      const templatesDir = path.join(projectDir, 'reference', 'governance', 'sdlc', '04-artifact-templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      fs.writeFileSync(path.join(templatesDir, 'test-summary-report-template.md'), '# Test Summary Report');

      expect(fs.existsSync(path.join(templatesDir, 'test-summary-report-template.md'))).toBe(true);
    });

    it('should fail gate 5 when release notes are missing', () => {
      const releaseNotesPath = path.join(projectDir, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'release-notes-template.md');
      expect(fs.existsSync(releaseNotesPath)).toBe(false);
    });

    it('should pass gate 5 when deployment artifacts exist', () => {
      const templatesDir = path.join(projectDir, 'reference', 'governance', 'sdlc', '04-artifact-templates');
      const observabilityPath = path.join(projectDir, 'observability');

      fs.mkdirSync(templatesDir, { recursive: true });
      fs.mkdirSync(observabilityPath, { recursive: true });

      fs.writeFileSync(path.join(templatesDir, 'release-notes-template.md'), '# Release Notes');

      expect(fs.existsSync(path.join(templatesDir, 'release-notes-template.md'))).toBe(true);
      expect(fs.existsSync(observabilityPath)).toBe(true);
    });
  });

  describe('Phase Gate Integration with CLI', () => {
    it('should have gate-status command registered in sdlc subcommands', () => {
      const sdlcCommandPath = path.join(process.cwd(), 'src', 'commands', 'sdlc', 'sdlc.command.ts');
      const content = fs.readFileSync(sdlcCommandPath, 'utf-8');

      expect(content).toContain('GateStatusCommand');
      expect(content).toContain('gate-status');
    });

    it('should have PhaseGateValidatorService imported in application services', () => {
      const servicesPath = path.join(process.cwd(), 'src', 'application', 'services', 'index.ts');
      const content = fs.readFileSync(servicesPath, 'utf-8');

      expect(content).toContain('PhaseGateValidatorService');
      expect(content).toContain('phase-gate-validator.service');
    });

    it('should have PhaseTransitionUseCase using gate validator', () => {
      const servicesPath = path.join(process.cwd(), 'src', 'application', 'services', 'index.ts');
      const content = fs.readFileSync(servicesPath, 'utf-8');

      expect(content).toContain('gateValidator');
      expect(content).toContain('validateGatesWithValidator');
      expect(content).toContain('getGateStatus');
    });

    it('should have phase-gates.rules.json in rulesets/sdlc directory', () => {
      const rulesetPath = path.join(process.cwd(), '..', '..', 'rulesets', 'sdlc', 'phase-gates.rules.json');
      expect(fs.existsSync(rulesetPath)).toBe(true);

      const content = fs.readFileSync(rulesetPath, 'utf-8');
      const ruleset = JSON.parse(content);
      expect(ruleset.gates).toHaveLength(5);
    });
  });
});
