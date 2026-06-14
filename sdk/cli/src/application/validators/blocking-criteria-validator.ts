import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { PhaseGateDefinition, BlockingCriterion, EvidenceValidationResult, BlockingCheckResult } from './phase-gate-validator.service';
import { EvidenceValidator } from './evidence-validator';

export class BlockingCriteriaValidator {
  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
    private readonly evidenceValidator: EvidenceValidator
  ) {}

  async checkBlockingCriteria(
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
          vulnerabilities?: unknown;
          exceptions?: unknown[];
        };

        if (scan.status === 'failed' || scan.status === 'error') return true;

        let critical = 0;
        let high = 0;
        let exceptions = 0;

        if (scan.vulnerabilities && typeof scan.vulnerabilities === 'object') {
          if (Array.isArray(scan.vulnerabilities)) {
            critical = scan.vulnerabilities.filter((v: unknown) => v.severity === 'critical' || v.severity === 'CRITICAL').length;
            high = scan.vulnerabilities.filter((v: unknown) => v.severity === 'high' || v.severity === 'HIGH').length;
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
        const files = await this.fs.readdir(observabilityPath);
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
        const releasePath = this.evidenceValidator.resolveArtifactPath(releaseEvidence.artifact, projectPath);
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
}
