import * as path from 'path';
import { getContainer, IFileSystem, ILogger } from '../abstractions';

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
  gates: PhaseGateDefinition[];
}

export class PhaseGateValidatorService {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;
  private readonly rulesetPath: string;
  private cachedRuleset: PhaseGatesRuleset | null = null;

  constructor(corePath?: string) {
    const container = getContainer();
    this.fs = container.createFileSystem();
    this.logger = container.createLogger('PhaseGateValidatorService');

    const resolvedCorePath = corePath || this.findCorePath(process.cwd());
    this.rulesetPath = path.join(resolvedCorePath, 'rulesets', 'sdlc', 'phase-gates.rules.json');
  }

  async loadRuleset(): Promise<PhaseGatesRuleset> {
    if (this.cachedRuleset) {
      return this.cachedRuleset;
    }

    try {
      const content = await this.fs.readFile(this.rulesetPath);
      this.cachedRuleset = JSON.parse(content) as PhaseGatesRuleset;
      return this.cachedRuleset;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load phase gates ruleset: ${message}`);
      throw new Error(`Cannot load phase gates ruleset from ${this.rulesetPath}: ${message}`);
    }
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

  private async validateSchema(schemaRef: string, artifactPath: string, projectPath: string): Promise<boolean> {
    try {
      const schemaPath = path.join(path.dirname(this.rulesetPath), schemaRef);
      if (!await this.fs.exists(schemaPath)) {
        this.logger.warn(`Schema file not found: ${schemaPath}`);
        return false;
      }

      const artifactContent = await this.fs.readFile(artifactPath);
      if (!artifactContent || artifactContent.trim().length === 0) {
        return false;
      }

      return true;
    } catch {
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
      return !prdEvidence?.found || !moscowEvidence?.found;
    }

    if (criterionText.includes('architecture decisions are undocumented')) {
      const adrEvidence = evidenceResults.find(e => e.artifact === 'ADR Registry');
      return !adrEvidence?.found;
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
      const coveragePath = path.join(projectPath, 'coverage');
      return !await this.fs.exists(coveragePath);
    }

    if (criterionText.includes('cve')) {
      const securityPath = path.join(projectPath, 'security-scan.json');
      return !await this.fs.exists(securityPath);
    }

    if (criterionText.includes('monitoring')) {
      const observabilityPath = path.join(projectPath, 'observability');
      return !await this.fs.exists(observabilityPath);
    }

    if (criterionText.includes('rollback')) {
      const releaseEvidence = evidenceResults.find(e => e.artifact === 'Release Notes');
      return !releaseEvidence?.found;
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
