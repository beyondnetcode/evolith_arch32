import * as path from 'node:path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { PhaseGateDefinition, EvidenceRequirement, EvidenceValidationResult } from './phase-gate-validator.service';

/**
 * Satellite-native paths for each artifact, relative to the satellite project root.
 * These are the real locations where a satellite is expected to produce evidence.
 * Defined as a function so the satelliteRoot is applied at resolution time.
 */
function buildSatelliteArtifactPaths(satelliteRoot: string): Record<string, string> {
  return {
    'PRD': path.join(satelliteRoot, 'docs', 'prd.md'),
    'Discovery Canvas': path.join(satelliteRoot, 'docs', 'discovery-canvas.md'),
    'Technical Feasibility Canvas': path.join(satelliteRoot, 'docs', 'technical-feasibility.md'),
    'Ballpark Estimation': path.join(satelliteRoot, 'docs', 'ballpark-estimation.md'),
    'MoSCoW Prioritization Matrix': path.join(satelliteRoot, '.evolith', 'moscow', 'phase-0.json'),
    'Build-versus-Compose Analysis': path.join(satelliteRoot, '.evolith', 'build-vs-compose.json'),
    'ADR Registry': path.join(satelliteRoot, 'docs', 'architecture', 'adr-matrix.json'),
    'Functional Stories': path.join(satelliteRoot, 'docs', 'stories', 'functional-stories.md'),
    'Bounded Context Map': path.join(satelliteRoot, 'docs', 'architecture', 'bounded-context-map.md'),
    'Reference Blueprint Alignment': path.join(satelliteRoot, 'docs', 'architecture', 'reference-blueprint.md'),
    'Simplicity Checklist Phase 1': path.join(satelliteRoot, 'docs', 'architecture', 'simplicity-checklist-phase-01.md'),
    'Technical Stories': path.join(satelliteRoot, 'docs', 'stories', 'technical-stories.md'),
    'Test Summary Report': path.join(satelliteRoot, 'docs', 'quality', 'test-summary-report.md'),
    'Release Notes': path.join(satelliteRoot, 'docs', 'releases', 'release-notes.md'),
    'Engineering Manifesto': path.join(satelliteRoot, 'docs', 'engineering-manifesto.md'),
    'SDLC Quality Gates': path.join(satelliteRoot, 'docs', 'quality-gates.md'),
    'Canonical Patterns': path.join(satelliteRoot, 'docs', 'architecture', 'canonical-patterns'),
    'Construction-Focused SDLC Framework': path.join(satelliteRoot, 'docs', 'sdlc-framework.md'),
    'CI Pipeline': path.join(satelliteRoot, '.github', 'workflows'),
    'Definition of Done Checklist': path.join(satelliteRoot, 'docs', 'definition-of-done.md'),
    'Documentation Delta': path.join(satelliteRoot, 'docs', 'documentation-delta'),
    'Coverage Report': path.join(satelliteRoot, 'coverage', 'coverage-summary.json'),
    'Security Scan Report': path.join(satelliteRoot, 'security-scan.json'),
    'Integration Evidence': path.join(satelliteRoot, '.evolith', 'integration-evidence.json'),
    'Acceptance Validation': path.join(satelliteRoot, '.evolith', 'acceptance-validation.json'),
    'Pyramid Distribution': path.join(satelliteRoot, 'coverage', 'coverage-summary.json'),
    'Observability Validation': path.join(satelliteRoot, 'observability'),
    'Rollback Procedure': path.join(satelliteRoot, 'docs', 'releases', 'rollback-procedure.md'),
    'On-Call Handoff': path.join(satelliteRoot, 'docs', 'releases', 'on-call-handoff.md'),
    'Deployment Evidence': path.join(satelliteRoot, '.evolith', 'deployment-evidence.json'),
    'evolith.yaml': path.join(satelliteRoot, 'evolith.yaml'),
    'package.json': path.join(satelliteRoot, 'package.json'),
    'rulesets': path.join(satelliteRoot, 'rulesets'),
    '.harness': path.join(satelliteRoot, '.harness'),
    'src': path.join(satelliteRoot, 'src'),
    'contracts': path.join(satelliteRoot, 'contracts'),
    'Dockerfile': path.join(satelliteRoot, 'Dockerfile'),
  };
}

/**
 * Core template fallback paths for each artifact.
 * Used when no satellite-native path is found and a corePath is available.
 */
function buildCoreTemplatePaths(corePath: string): Record<string, string> {
  return {
    'PRD': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'prd-template.md'),
    'Discovery Canvas': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'discovery-canvas-template.md'),
    'Technical Feasibility Canvas': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'technical-feasibility-template.md'),
    'Ballpark Estimation': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'ballpark-estimation-template.md'),
    'ADR Registry': path.join(corePath, 'reference', 'architecture', 'adrs', 'adr-matrix.json'),
    'Functional Stories': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'functional-story-template.md'),
    'Bounded Context Map': path.join(corePath, 'reference', 'architecture', 'contexts', 'bounded-context-map.md'),
    'Reference Blueprint Alignment': path.join(corePath, 'reference', 'architecture', 'blueprints', 'reference-blueprint.md'),
    'Simplicity Checklist Phase 1': path.join(corePath, 'reference', 'architecture', 'blueprints', 'simplicity-checklist-phase-01.md'),
    'Technical Stories': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'technical-story-template.md'),
    'Test Summary Report': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'test-summary-report-template.md'),
    'Release Notes': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'release-notes-template.md'),
    'Engineering Manifesto': path.join(corePath, 'reference', 'governance', 'standards', 'engineering', 'engineering-manifesto.md'),
    'SDLC Quality Gates': path.join(corePath, 'reference', 'governance', 'sdlc', 'quality-gates.md'),
    'Canonical Patterns': path.join(corePath, 'reference', 'architecture', 'canonical-patterns'),
    'Construction-Focused SDLC Framework': path.join(corePath, 'reference', 'governance', 'sdlc', '02-engineering', 'construction-focused-sdlc-framework.md'),
    'Definition of Done Checklist': path.join(corePath, 'reference', 'governance', 'sdlc', '02-engineering', 'construction-focused-sdlc-framework.md'),
    'Documentation Delta': path.join(corePath, 'reference', 'governance', 'sdlc', '03-documentation'),
    'Security Scan Report': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'security-scan-report-template.md'),
    'Integration Evidence': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'integration-evidence-template.md'),
    'Observability Validation': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'observability-validation-template.md'),
    'Rollback Procedure': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'rollback-rehearsal-template.md'),
    'On-Call Handoff': path.join(corePath, 'reference', 'governance', 'sdlc', '04-artifact-templates', 'on-call-handoff-template.md'),
  };
}

export class EvidenceValidator {
  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
    private readonly rulesetPath: string,
    /** Optional path to the Evolith Core repository, used as template fallback */
    private readonly corePath?: string
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

  /**
   * Resolves the filesystem path for an artifact.
   *
   * Resolution order:
   * 1. Satellite-native path (relative to `satelliteBasePath`). This is the
   *    real artifact the satellite is expected to produce.
   * 2. Core template fallback (relative to `this.corePath`), used only when
   *    the satellite path is not configured for that artifact.
   * 3. Bare join of `satelliteBasePath` + artifact name as a last resort.
   *
   * @param artifact       Logical artifact name (e.g. "PRD", "ADR Registry").
   * @param satelliteBasePath  Root of the satellite project being validated.
   */
  resolveArtifactPath(artifact: string, satelliteBasePath: string): string {
    const satellitePaths = buildSatelliteArtifactPaths(satelliteBasePath);
    if (satellitePaths[artifact] !== undefined) {
      return satellitePaths[artifact];
    }

    if (this.corePath) {
      const corePaths = buildCoreTemplatePaths(this.corePath);
      if (corePaths[artifact] !== undefined) {
        return corePaths[artifact];
      }
    }

    return path.join(satelliteBasePath, artifact);
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
