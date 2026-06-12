import * as path from 'path';
import { getContainer, IFileSystem, ILogger } from '../abstractions';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface PhaseGateDefinition {
  phase: number;
  name: string;
  description: string;
  mandatoryEvidence: EvidenceRequirement[];
  blockingCriteria: BlockingCriterion[];
  accountableRole: string;
  waiverAuthority: string;
  waiverRequiredFields: string[];
}

export interface EvidenceRequirement {
  artifact: string;
  schemaRef?: string;
  status?: string;
  validation: string;
}

export interface BlockingCriterion {
  criterion: string;
  action: string;
}

export interface GateValidationResult {
  gateId: string;
  phase: number;
  name: string;
  passed: boolean;
  evidenceResults: EvidenceValidationResult[];
  blockingChecks: BlockingCheckResult[];
  waiverAvailable: boolean;
  accountableRole: string;
  waiverAuthority: string;
}

export interface EvidenceValidationResult {
  artifact: string;
  passed: boolean;
  found: boolean;
  schemaValid: boolean;
  validationMessage: string;
  required: boolean;
}

export interface BlockingCheckResult {
  criterion: string;
  triggered: boolean;
  action: string;
}

export interface PhaseGatesRuleset {
  version?: string;
  gates: PhaseGateDefinition[];
}

export class PhaseGateValidatorService {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;
  private readonly rulesetPath: string;
  private cachedRuleset: PhaseGatesRuleset | null = null;
  private readonly ajv: Ajv;
  private schemaValidator: any;

  constructor(corePath?: string) {
    const container = getContainer();
    this.fs = container.createFileSystem();
    this.logger = container.createLogger('PhaseGateValidatorService');

    const resolvedCorePath = corePath || this.findCorePath(process.cwd());
    this.rulesetPath = path.join(resolvedCorePath, 'rulesets', 'sdlc', 'phase-gates.rules.json');
    
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    
    // We load the schema synchronously for instantiation, or we could load it in loadRuleset.
    // It's better to load the schema from file dynamically.
  }

  async loadRuleset(): Promise<PhaseGatesRuleset> {
    if (this.cachedRuleset) {
      return this.cachedRuleset;
    }

    try {
      const content = await this.fs.readFile(this.rulesetPath);
      const parsed = JSON.parse(content);
      
      // Load schema and validate
      if (!this.schemaValidator) {
        const schemaPath = path.join(path.dirname(this.rulesetPath), '../schema/ruleset-sdlc.schema.json');
        const schemaContent = await this.fs.readFile(schemaPath);
        this.schemaValidator = this.ajv.compile(JSON.parse(schemaContent));
      }
      
      const valid = this.schemaValidator(parsed);
      if (!valid) {
        throw new Error(`Ruleset validation failed: ${this.ajv.errorsText(this.schemaValidator.errors)}`);
      }

      this.cachedRuleset = parsed as PhaseGatesRuleset;
      return this.cachedRuleset;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load phase gates ruleset: ${message}`);
      throw new Error(`Cannot load phase gates ruleset from ${this.rulesetPath}: ${message}`);
    }
  }

  /** Version of the loaded phase-gates ruleset, required by the ADR-0073 GateEvidence contract. */
  async getRulesetVersion(): Promise<string> {
    const ruleset = await this.loadRuleset();
    return ruleset.version ?? '0.0.0';
  }

  async validateGate(phaseNumber: number, projectPath: string): Promise<GateValidationResult> {
    const ruleset = await this.loadRuleset();
    const gate = ruleset.gates.find(g => g.phase === phaseNumber);

    if (!gate) {
      throw new Error(`Phase gate ${phaseNumber} not defined in ruleset`);
    }

    const evidenceResults = await this.validateEvidence(gate, projectPath);
    const blockingChecks = await this.checkBlockingCriteria(gate, projectPath, evidenceResults);

    const allEvidencePassed = evidenceResults.every(e => e.passed || !e.required);
    const noBlocking = blockingChecks.every(b => !b.triggered);

    return {
      gateId: `PG-${gate.phase}`,
      phase: gate.phase,
      name: gate.name,
      passed: allEvidencePassed && noBlocking,
      evidenceResults,
      blockingChecks,
      waiverAvailable: true,
      accountableRole: gate.accountableRole,
      waiverAuthority: gate.waiverAuthority,
    };
  }

  async validateAllGates(projectPath: string): Promise<GateValidationResult[]> {
    const ruleset = await this.loadRuleset();
    const results: GateValidationResult[] = [];

    for (const gate of ruleset.gates) {
      const result = await this.validateGate(gate.phase, projectPath);
      results.push(result);
    }

    return results;
  }

  async getGateStatus(projectPath: string): Promise<{
    currentPhase: number;
    gatesPassed: number;
    gatesFailed: number;
    gatesPending: number;
    results: GateValidationResult[];
  }> {
    const results = await this.validateAllGates(projectPath);

    let currentPhase = 0;
    let gatesPassed = 0;
    let gatesFailed = 0;
    let gatesPending = 0;

    for (const result of results) {
      if (result.passed) {
        gatesPassed++;
        currentPhase = result.phase;
      } else {
        const hasRequiredFailures = result.evidenceResults.some(e => !e.passed && e.required);
        if (hasRequiredFailures) {
          gatesFailed++;
          if (currentPhase === result.phase - 1) {
            break;
          }
        } else {
          gatesPending++;
        }
      }
    }

    return {
      currentPhase,
      gatesPassed,
      gatesFailed,
      gatesPending: results.length - gatesPassed - gatesFailed,
      results,
    };
  }

  private async validateEvidence(gate: PhaseGateDefinition, projectPath: string): Promise<EvidenceValidationResult[]> {
    const results: EvidenceValidationResult[] = [];

    for (const evidence of gate.mandatoryEvidence) {
      const result = await this.validateSingleEvidence(evidence, projectPath);
      results.push(result);
    }

    return results;
  }

  private async validateSingleEvidence(evidence: EvidenceRequirement, projectPath: string): Promise<EvidenceValidationResult> {
    const artifactPath = this.resolveArtifactPath(evidence.artifact, projectPath);
    const exists = await this.fs.exists(artifactPath);

    if (!exists) {
      return {
        artifact: evidence.artifact,
        passed: false,
        found: false,
        schemaValid: false,
        validationMessage: `Artifact not found: ${artifactPath}`,
        required: true,
      };
    }

    let schemaValid = true;
    if (evidence.schemaRef) {
      schemaValid = await this.validateSchema(evidence.schemaRef, artifactPath, projectPath);
    }

    const validationMessage = schemaValid
      ? `Artifact found and valid: ${artifactPath}`
      : `Artifact found but schema validation failed: ${artifactPath}`;

    return {
      artifact: evidence.artifact,
      passed: exists && schemaValid,
      found: true,
      schemaValid,
      validationMessage,
      required: true,
    };
  }

  private resolveArtifactPath(artifact: string, projectPath: string): string {
    const artifactPaths: Record<string, string> = {
      'PRD': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'prd-template.md'),
      'Discovery Canvas': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'discovery-canvas-template.md'),
      'Business Case ROI': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'business-case-roi-template.md'),
      'Ballpark Estimation': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'ballpark-estimation-template.md'),
      'MoSCoW Prioritization Matrix': path.join(projectPath, '.evolith', 'moscow', 'phase-0.json'),
      'ADR Registry': path.join(projectPath, 'reference', 'architecture', 'adrs', 'adr-matrix.json'),
      'Functional Stories': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'functional-story-template.md'),
      'Bounded Context Map': path.join(projectPath, 'reference', 'architecture', 'contexts', 'bounded-context-map.md'),
      'Technical Stories': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'technical-story-template.md'),
      'Test Summary Report': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'test-summary-report-template.md'),
      'Release Notes': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'release-notes-template.md'),
      'evolith.yaml': path.join(projectPath, 'evolith.yaml'),
      'package.json': path.join(projectPath, 'package.json'),
      'rulesets': path.join(projectPath, 'rulesets'),
      '.harness': path.join(projectPath, '.harness'),
      'src': path.join(projectPath, 'src'),
      'contracts': path.join(projectPath, 'contracts'),
      'Dockerfile': path.join(projectPath, 'Dockerfile'),
    };

    return artifactPaths[artifact] || path.join(projectPath, artifact);
  }

  private async validateSchema(schemaRef: string, artifactPath: string, _projectPath: string): Promise<boolean> {
    try {
      const schemaPath = path.join(path.dirname(this.rulesetPath), schemaRef);
      if (!await this.fs.exists(schemaPath)) {
        this.logger.warn(`Schema file not found: ${schemaPath}`);
        return false;
      }

      const schemaContent = await this.fs.readFile(schemaPath);
      const artifactContent = await this.fs.readFile(artifactPath);
      if (!artifactContent || artifactContent.trim().length === 0) return false;

      const schema = JSON.parse(schemaContent) as object;
      const artifact = JSON.parse(artifactContent) as object;

      const { default: Ajv } = await import('ajv');
      const { default: addFormats } = await import('ajv-formats');
      const ajv = new Ajv({ strict: false, allErrors: true });
      addFormats(ajv);
      const validate = ajv.compile(schema);
      const valid = validate(artifact);

      if (!valid && validate.errors) {
        const summary = validate.errors.slice(0, 3).map(e => `${e.instancePath} ${e.message}`).join('; ');
        this.logger.warn(`Schema validation failed for ${artifactPath}: ${summary}`);
      }

      return Boolean(valid);
    } catch (err: unknown) {
      this.logger.warn(`Schema validation error: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  private async checkBlockingCriteria(
    gate: PhaseGateDefinition,
    projectPath: string,
    evidenceResults: EvidenceValidationResult[],
  ): Promise<BlockingCheckResult[]> {
    const results: BlockingCheckResult[] = [];

    for (const criterion of gate.blockingCriteria) {
      const triggered = await this.isCriterionTriggered(criterion, projectPath, evidenceResults);
      results.push({
        criterion: criterion.criterion,
        triggered,
        action: criterion.action,
      });
    }

    return results;
  }

  private async isCriterionTriggered(
    criterion: BlockingCriterion,
    projectPath: string,
    evidenceResults: EvidenceValidationResult[],
  ): Promise<boolean> {
    const criterionText = criterion.criterion.toLowerCase();

    if (criterionText.includes('scope is ambiguous') || criterionText.includes('funding')) {
      const prdEvidence = evidenceResults.find(e => e.artifact === 'PRD');
      const moscowEvidence = evidenceResults.find(e => e.artifact === 'MoSCoW Prioritization Matrix');
      return !prdEvidence?.found || (moscowEvidence !== undefined && !moscowEvidence.found);
    }

    if (criterionText.includes('architecture decisions are undocumented')) {
      const adrEvidence = evidenceResults.find(e => e.artifact === 'ADR Registry');
      if (!adrEvidence?.found) return true;

      try {
        const adrPath = path.join(projectPath, 'reference', 'architecture', 'adrs', 'adr-matrix.json');
        if (await this.fs.exists(adrPath)) {
          const content = await this.fs.readFile(adrPath);
          const matrix = JSON.parse(content) as { adrs?: unknown[] };
          if (!matrix.adrs || matrix.adrs.length === 0) {
            return true;
          }
        }
      } catch (err: unknown) {
        this.logger.warn(`Failed to validate ADR registry content: ${err instanceof Error ? err.message : String(err)}`);
        return true;
      }

      return false;
    }

    if (criterionText.includes('bounded context')) {
      const contextEvidence = evidenceResults.find(e => e.artifact === 'Bounded Context Map');
      return !contextEvidence?.found;
    }

    if (criterionText.includes('functional stories lack acceptance criteria')) {
      const storyEvidence = evidenceResults.find(e => e.artifact === 'Functional Stories');
      return !storyEvidence?.found;
    }

    if (criterionText.includes('ci fails')) {
      const ciPath = path.join(projectPath, '.github', 'workflows');
      return !await this.fs.exists(ciPath);
    }

    if (criterionText.includes('coverage below')) {
      const summaryPath = path.join(projectPath, 'coverage', 'coverage-summary.json');
      if (!await this.fs.exists(summaryPath)) {
        return true;
      }
      try {
        const content = await this.fs.readFile(summaryPath);
        const summary = JSON.parse(content) as { total?: { statements?: { pct?: number } } };
        const pct = summary.total?.statements?.pct;
        if (typeof pct !== 'number' || pct < 80) {
          return true;
        }
      } catch (err: unknown) {
        this.logger.warn(`Failed to parse coverage-summary.json: ${err instanceof Error ? err.message : String(err)}`);
        return true;
      }
      return false;
    }

    if (criterionText.includes('cve')) {
      const securityPath = path.join(projectPath, 'security-scan.json');
      if (!await this.fs.exists(securityPath)) return true;

      try {
        const content = await this.fs.readFile(securityPath);
        const scan = JSON.parse(content) as {
          status?: string;
          vulnerabilities?: any;
          exceptions?: any[];
        };

        if (scan.status === 'failed' || scan.status === 'error') return true;

        let critical = 0;
        let high = 0;
        let exceptions = 0;

        if (scan.vulnerabilities && typeof scan.vulnerabilities === 'object') {
          if (Array.isArray(scan.vulnerabilities)) {
            critical = scan.vulnerabilities.filter((v: any) => v.severity === 'critical' || v.severity === 'CRITICAL').length;
            high = scan.vulnerabilities.filter((v: any) => v.severity === 'high' || v.severity === 'HIGH').length;
          } else {
            critical = scan.vulnerabilities.critical || 0;
            high = scan.vulnerabilities.high || 0;
          }
        }

        if (Array.isArray(scan.exceptions)) {
          exceptions = scan.exceptions.length;
        }

        if (critical + high > exceptions) return true;
      } catch (err: unknown) {
        this.logger.warn(`Failed to parse security-scan.json: ${err instanceof Error ? err.message : String(err)}`);
        return true;
      }
      return false;
    }

    if (criterionText.includes('monitoring')) {
      const observabilityPath = path.join(projectPath, 'observability');
      if (!await this.fs.exists(observabilityPath)) return true;

      let hasReadiness = false;
      try {
        const files = await this.fs.readDirectory(observabilityPath);
        const contentChecks = await Promise.all(files.map(async file => {
          if (file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.yml') || file.name.endsWith('.yaml')) {
            const content = await this.fs.readFile(path.join(observabilityPath, file.name));
            const lower = content.toLowerCase();
            return (lower.includes('health') || lower.includes('indicator') || lower.includes('slo') || lower.includes('sli')) && 
                   (lower.includes('alert') || lower.includes('owner') || lower.includes('pager'));
          }
          return false;
        }));
        hasReadiness = contentChecks.some(Boolean);
      } catch (err) {
        this.logger.warn(`Failed to read observability directory: ${err instanceof Error ? err.message : String(err)}`);
      }
      return !hasReadiness;
    }

    if (criterionText.includes('rollback')) {
      const releaseEvidence = evidenceResults.find(e => e.artifact === 'Release Notes');
      if (!releaseEvidence?.found) return true;

      try {
        const releasePath = this.resolveArtifactPath(releaseEvidence.artifact, projectPath);
        if (await this.fs.exists(releasePath)) {
          const content = await this.fs.readFile(releasePath);
          const lower = content.toLowerCase();
          
          const hasRollbackData = lower.includes('rollback action') && !lower.includes('[action]');
          const hasRehearsal = lower.includes('rehearsal') || lower.includes('trigger');
          const hasRollbackSection = lower.includes('rollback plan') && content.length > 200;
          
          if (!hasRollbackData && !hasRehearsal && !hasRollbackSection) {
            return true;
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to read Release Notes: ${err instanceof Error ? err.message : String(err)}`);
        return true;
      }
      return false;
    }

    if (criterionText.includes('traceable')) {
      const releaseEvidence = evidenceResults.find(e => e.artifact === 'Release Notes');
      return !releaseEvidence?.found;
    }

    return false;
  }

  private findCorePath(projectPath: string): string {
    const parts = projectPath.split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      const candidate = path.join(parts.join(path.sep), 'rulesets');
      if (this.fs.existsSync(candidate)) {
        return parts.join(path.sep);
      }
    }
    return path.join(projectPath, '..', 'evolith');
  }
}
