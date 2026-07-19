import * as path from 'node:path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { PhaseGateDefinition, EvidenceRequirement, EvidenceValidationResult } from './phase-gate-validator.service';
import { resolveArtifactPath } from './artifact-path-resolver';

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
   * Delegates to the shared {@link resolveArtifactPath} cascade in
   * `artifact-path-resolver` — the single source of truth for the
   * satellite-native-first / Core-template-fallback ordering.
   */
  resolveArtifactPath(artifact: string, satelliteBasePath: string): string {
    return resolveArtifactPath(artifact, satelliteBasePath, this.corePath);
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
