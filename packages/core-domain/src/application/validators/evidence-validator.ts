import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { PhaseGateDefinition, EvidenceRequirement, EvidenceValidationResult } from './phase-gate-validator.service';

export class EvidenceValidator {
  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
    private readonly rulesetPath: string
  ) {}

  async validateEvidence(gate: PhaseGateDefinition, projectPath: string): Promise<EvidenceValidationResult[]> {
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

  resolveArtifactPath(artifact: string, projectPath: string): string {
    const artifactPaths: Record<string, string> = {
      // Template-existence check: validates the reference template exists in core.
      // Actual satellite-produced PRD location should be declared in evolith.yaml
      // (tracked as tech debt — see phase-gate-validator redesign backlog).
      'PRD': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'prd-template.md'),
      'Discovery Canvas': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'discovery-canvas-template.md'),
      'Technical Feasibility Canvas': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'technical-feasibility-template.md'),
      'Ballpark Estimation': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'ballpark-estimation-template.md'),
      'MoSCoW Prioritization Matrix': path.join(projectPath, '.evolith', 'moscow', 'phase-0.json'),
      'Build-versus-Compose Analysis': path.join(projectPath, '.evolith', 'build-vs-compose.json'),
      'ADR Registry': path.join(projectPath, 'reference', 'architecture', 'adrs', 'adr-matrix.json'),
      'Functional Stories': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'functional-story-template.md'),
      'Bounded Context Map': path.join(projectPath, 'reference', 'architecture', 'contexts', 'bounded-context-map.md'),
      'Reference Blueprint Alignment': path.join(projectPath, 'reference', 'architecture', 'blueprints', 'reference-blueprint.md'),
      'Simplicity Checklist Phase 1': path.join(projectPath, 'reference', 'architecture', 'blueprints', 'simplicity-checklist-phase-01.md'),
      'Technical Stories': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'technical-story-template.md'),
      'Test Summary Report': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'test-summary-report-template.md'),
      'Release Notes': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'release-notes-template.md'),
      'Engineering Manifesto': path.join(projectPath, 'reference', 'governance', 'standards', 'engineering', 'engineering-manifesto.md'),
      'SDLC Quality Gates': path.join(projectPath, 'reference', 'governance', 'sdlc', 'quality-gates.md'),
      'Canonical Patterns': path.join(projectPath, 'reference', 'architecture', 'canonical-patterns'),
      'Construction-Focused SDLC Framework': path.join(projectPath, 'reference', 'governance', 'sdlc', '02-engineering', 'construction-focused-sdlc-framework.md'),
      'Security Scan Report': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'security-scan-report-template.md'),
      'Integration Evidence': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'integration-evidence-template.md'),
      'Acceptance Validation': path.join(projectPath, '.evolith', 'acceptance-validation.json'),
      'Pyramid Distribution': path.join(projectPath, 'coverage', 'coverage-summary.json'),
      'Observability Validation': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'observability-validation-template.md'),
      'Rollback Procedure': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'rollback-rehearsal-template.md'),
      'On-Call Handoff': path.join(projectPath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'on-call-handoff-template.md'),
      'Deployment Evidence': path.join(projectPath, '.evolith', 'deployment-evidence.json'),
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
        const summary = validate.errors.slice(0, 3).map((e: any) => `${e.instancePath} ${e.message}`).join('; ');
        this.logger.warn(`Schema validation failed for ${artifactPath}: ${summary}`);
      }

      return Boolean(valid);
    } catch (err: unknown) {
      this.logger.warn(`Schema validation error: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}
