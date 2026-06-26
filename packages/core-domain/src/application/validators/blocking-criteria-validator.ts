import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { PhaseGateDefinition, BlockingCriterion, EvidenceValidationResult, BlockingCheckResult } from './phase-gate-validator.service';
import { EvidenceValidator } from './evidence-validator';

type CriterionHandler = (projectPath: string, evidenceResults: EvidenceValidationResult[]) => Promise<boolean>;

interface CriterionEntry {
  keywords: string[];
  handler: CriterionHandler;
}

export class BlockingCriteriaValidator {
  private readonly criterionHandlers: CriterionEntry[];

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
    private readonly evidenceValidator: EvidenceValidator
  ) {
    this.criterionHandlers = [
      { keywords: ['mandatory quality metric'],           handler: (p) => this.checkMandatoryQualityMetric(p) },
      { keywords: ['acceptance criteria remain'],         handler: (_, ev) => this.checkAcceptanceCriteria(ev) },
      { keywords: ['technical debt'],                     handler: (p) => this.checkTechnicalDebt(p) },
      { keywords: ['scope is ambiguous', 'funding'],      handler: (_, ev) => this.checkScopeAmbiguity(ev) },
      { keywords: ['technical constraints', 'cloud quotas'], handler: (_, ev) => this.checkTechnicalConstraints(ev) },
      { keywords: ['architecture constraints are ignored'], handler: (_, ev) => this.checkArchitectureConstraints(ev) },
      { keywords: ['architecture decisions are undocumented'], handler: (p, ev) => this.checkArchitectureDecisions(p, ev) },
      { keywords: ['bounded context'],                    handler: (_, ev) => this.checkBoundedContext(ev) },
      { keywords: ['functional stories lack'],            handler: (_, ev) => this.checkFunctionalStories(ev) },
      { keywords: ['code review approval'],               handler: (p, ev) => this.checkCodeReviewApproval(p, ev) },
      { keywords: ['ci fails'],                           handler: (p) => this.checkCiFailure(p) },
      { keywords: ['coverage below'],                     handler: (p) => this.checkCoverageBelow(p) },
      { keywords: ['cve'],                                handler: (p) => this.checkCveVulnerabilities(p) },
      { keywords: ['monitoring'],                         handler: (p) => this.checkMonitoring(p) },
      { keywords: ['rollback'],                           handler: (p, ev) => this.checkRollback(p, ev) },
      { keywords: ['traceable'],                          handler: (_, ev) => this.checkTraceability(ev) },
    ];
  }

  async checkBlockingCriteria(
    gate: PhaseGateDefinition,
    projectPath: string,
    evidenceResults: EvidenceValidationResult[],
  ): Promise<BlockingCheckResult[]> {
    const results: BlockingCheckResult[] = [];
    for (const criterion of gate.blockingCriteria) {
      const triggered = await this.isCriterionTriggered(criterion, projectPath, evidenceResults);
      results.push({ criterion: criterion.criterion, triggered, action: criterion.action });
    }
    return results;
  }

  private async isCriterionTriggered(
    criterion: BlockingCriterion,
    projectPath: string,
    evidenceResults: EvidenceValidationResult[],
  ): Promise<boolean> {
    const text = criterion.criterion.toLowerCase();
    const entry = this.criterionHandlers.find(e => e.keywords.some(kw => text.includes(kw)));
    return entry ? entry.handler(projectPath, evidenceResults) : false;
  }

  private async checkMandatoryQualityMetric(projectPath: string): Promise<boolean> {
    const summaryPath = path.join(projectPath, 'coverage', 'coverage-summary.json');
    if (!await this.fs.exists(summaryPath)) return true;
    try {
      const content = await this.fs.readFile(summaryPath);
      const summary = JSON.parse(content) as { total?: { statements?: { pct?: number } } };
      const pct = summary.total?.statements?.pct;
      return typeof pct !== 'number' || pct < 80;
    } catch {
      return true;
    }
  }

  private async checkAcceptanceCriteria(evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
    return !evidenceResults.find(e => e.artifact === 'Acceptance Validation')?.found;
  }

  private async checkTechnicalDebt(projectPath: string): Promise<boolean> {
    const debtPath = path.join(projectPath, '.evolith', 'tech-debt-report.json');
    if (!await this.fs.exists(debtPath)) return false;
    try {
      const content = await this.fs.readFile(debtPath);
      const report = JSON.parse(content) as { debtRatioPct?: number };
      return typeof report.debtRatioPct === 'number' && report.debtRatioPct > 5;
    } catch {
      return false;
    }
  }

  private async checkScopeAmbiguity(evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
    const prd = evidenceResults.find(e => e.artifact === 'PRD');
    const moscow = evidenceResults.find(e => e.artifact === 'MoSCoW Prioritization Matrix');
    return !prd?.found || (moscow !== undefined && !moscow.found);
  }

  private async checkTechnicalConstraints(evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
    return !evidenceResults.find(e => e.artifact === 'Technical Feasibility Canvas')?.found;
  }

  private async checkArchitectureConstraints(evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
    const prd = evidenceResults.find(e => e.artifact === 'PRD');
    const canvas = evidenceResults.find(e => e.artifact === 'Discovery Canvas');
    return !prd?.found && !canvas?.found;
  }

  private async checkArchitectureDecisions(projectPath: string, evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
    const adrEvidence = evidenceResults.find(e => e.artifact === 'ADR Registry');
    if (!adrEvidence?.found) return true;
    try {
      const adrPath = path.join(projectPath, 'reference', 'architecture', 'adrs', 'adr-matrix.json');
      if (await this.fs.exists(adrPath)) {
        const content = await this.fs.readFile(adrPath);
        const matrix = JSON.parse(content) as { adrs?: unknown[] };
        if (!matrix.adrs || matrix.adrs.length === 0) return true;
      }
    } catch (err: unknown) {
      this.logger.warn(`Failed to validate ADR registry: ${err instanceof Error ? err.message : String(err)}`);
      return true;
    }
    return false;
  }

  private async checkBoundedContext(evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
    return !evidenceResults.find(e => e.artifact === 'Bounded Context Map')?.found;
  }

  private async checkFunctionalStories(evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
    return !evidenceResults.find(e => e.artifact === 'Functional Stories')?.found;
  }

  private async checkCodeReviewApproval(projectPath: string, _evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
    const reviewEvidencePath = path.join(projectPath, '.evolith', 'review-evidence.json');
    if (await this.fs.exists(reviewEvidencePath)) {
      try {
        const content = await this.fs.readFile(reviewEvidencePath);
        const evidence = JSON.parse(content) as { approved?: boolean; approvers?: unknown[] };
        if (evidence.approved === true || (Array.isArray(evidence.approvers) && evidence.approvers.length > 0)) {
          return false;
        }
      } catch {
        return true;
      }
    }
    return !await this.fs.exists(path.join(projectPath, '.github', 'CODEOWNERS'));
  }

  private async checkCiFailure(projectPath: string): Promise<boolean> {
    return !await this.fs.exists(path.join(projectPath, '.github', 'workflows'));
  }

  private async checkCoverageBelow(projectPath: string): Promise<boolean> {
    const summaryPath = path.join(projectPath, 'coverage', 'coverage-summary.json');
    if (!await this.fs.exists(summaryPath)) return true;
    try {
      const content = await this.fs.readFile(summaryPath);
      const summary = JSON.parse(content) as { total?: { statements?: { pct?: number } } };
      const pct = summary.total?.statements?.pct;
      return typeof pct !== 'number' || pct < 80;
    } catch (err: unknown) {
      this.logger.warn(`Failed to parse coverage-summary.json: ${err instanceof Error ? err.message : String(err)}`);
      return true;
    }
  }

  private async checkCveVulnerabilities(projectPath: string): Promise<boolean> {
    const securityPath = path.join(projectPath, 'security-scan.json');
    if (!await this.fs.exists(securityPath)) return true;
    try {
      const content = await this.fs.readFile(securityPath);
      const scan = JSON.parse(content) as { status?: string; vulnerabilities?: unknown; exceptions?: unknown[] };
      if (scan.status === 'failed' || scan.status === 'error') return true;
      const { critical, high } = this.countVulnerabilities(scan.vulnerabilities);
      const exceptions = Array.isArray(scan.exceptions) ? scan.exceptions.length : 0;
      return critical + high > exceptions;
    } catch (err: unknown) {
      this.logger.warn(`Failed to parse security-scan.json: ${err instanceof Error ? err.message : String(err)}`);
      return true;
    }
  }

  private countVulnerabilities(vulnerabilities: unknown): { critical: number; high: number } {
    if (!vulnerabilities || typeof vulnerabilities !== 'object') return { critical: 0, high: 0 };
    if (Array.isArray(vulnerabilities)) {
      const vuln = vulnerabilities as Record<string, unknown>[];
      return {
        critical: vuln.filter(v => v.severity === 'critical' || v.severity === 'CRITICAL').length,
        high: vuln.filter(v => v.severity === 'high' || v.severity === 'HIGH').length,
      };
    }
    const obj = vulnerabilities as Record<string, unknown>;
    return { critical: (obj.critical as number) || 0, high: (obj.high as number) || 0 };
  }

  private async checkMonitoring(projectPath: string): Promise<boolean> {
    const observabilityPath = path.join(projectPath, 'observability');
    if (!await this.fs.exists(observabilityPath)) return true;
    try {
      const files = await this.fs.readdir(observabilityPath);
      const checks = await Promise.all(
        files
          .filter(f => /\.(md|json|ya?ml)$/.test(f.name))
          .map(async f => {
            const lower = (await this.fs.readFile(path.join(observabilityPath, f.name))).toLowerCase();
            const hasMetrics = lower.includes('health') || lower.includes('indicator') || lower.includes('slo') || lower.includes('sli');
            const hasOwner = lower.includes('alert') || lower.includes('owner') || lower.includes('pager');
            return hasMetrics && hasOwner;
          }),
      );
      return !checks.some(Boolean);
    } catch (err: unknown) {
      this.logger.warn(`Failed to read observability directory: ${err instanceof Error ? err.message : String(err)}`);
      return true;
    }
  }

  private async checkRollback(projectPath: string, evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
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
        return !hasRollbackData && !hasRehearsal && !hasRollbackSection;
      }
    } catch (err: unknown) {
      this.logger.warn(`Failed to read Release Notes: ${err instanceof Error ? err.message : String(err)}`);
      return true;
    }
    return false;
  }

  private async checkTraceability(evidenceResults: EvidenceValidationResult[]): Promise<boolean> {
    return !evidenceResults.find(e => e.artifact === 'Release Notes')?.found;
  }
}
