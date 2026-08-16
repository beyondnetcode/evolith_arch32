import * as path from 'path';
import { findCoreFromSatellite } from '../paths/rulesets-location';
import { IFileSystem, ILogger, IConfigParser } from '../../domain/interfaces';
import { RulesetValidatorService, ArchitectureValidationResult, ValidationIssue } from './ruleset-validator.service';

export interface DriftReport {
  projectId: string;
  declaredLevel: string;
  detectedLevel: string;
  driftDetected: boolean;
  driftSeverity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  newViolations: DriftViolation[];
  resolvedViolations: DriftViolation[];
  persistentViolations: DriftViolation[];
  overallScore: number;
  timestamp: string;
  historyPath: string;
}

export interface DriftViolation {
  ruleId: string;
  severity: 'MUST' | 'SHOULD' | 'COULD';
  category: string;
  title: string;
  description: string;
  blocking: boolean;
  firstDetected: string;
  status: 'new' | 'persistent' | 'resolved';
}

export interface DriftHistoryEntry {
  timestamp: string;
  declaredLevel: string;
  detectedLevel: string;
  violationsCount: number;
  blockingViolationsCount: number;
  overallScore: number;
  violations: DriftViolation[];
}

export interface DriftDetectionOptions {
  projectPath: string;
  corePath?: string;
  declaredLevel?: 'F1' | 'F2' | 'F3';
  storeHistory?: boolean;
  historyPath?: string;
}

export class ArchitectureDriftService {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;
  private readonly validator: RulesetValidatorService;

  constructor(corePath?: string, options?: { fileSystem?: IFileSystem; logger?: ILogger; configParser?: IConfigParser; validator?: RulesetValidatorService }) {
    if (!options?.fileSystem) throw new Error('IFileSystem is required');
    if (!options?.logger) throw new Error('ILogger is required');
    this.fs = options.fileSystem;
    this.logger = options.logger;
    // The default RulesetValidatorService requires a configParser; when no
    // explicit validator is supplied, forward the configParser so the drift
    // service is usable from the shared evaluator composition root.
    this.validator = options?.validator ?? new RulesetValidatorService({
      fileSystem: this.fs,
      logger: this.logger,
      configParser: options.configParser,
    });
  }

  async detectDrift(options: DriftDetectionOptions): Promise<DriftReport> {
    const declaredLevel = options.declaredLevel || await this.getDeclaredLevel(options.projectPath, options.corePath);
    const resolvedCorePath = options.corePath || this.findCorePath(options.projectPath);

    this.logger.info('Starting architecture drift detection', JSON.stringify({ declaredLevel, projectPath: options.projectPath }));

    const validationResult = await this.validator.validateArchitecture(
      options.projectPath,
      resolvedCorePath,
      { level: declaredLevel },
    );

    // La lectura sigue la misma regla que la escritura: sin opt-in el Core no
    // toca el workspace ni para leer. Dejarla en `!== false` hacia que leyera
    // un historial que nunca escribia, y que la clasificacion new/persistent
    // dependiera de si el filesystem resultaba ser escribible -- distinta en
    // local y en contenedor para la misma entrada.
    const history = options.storeHistory === true
      ? await this.loadHistory(options.projectPath, options.historyPath)
      : [];

    const previousViolations = history.length > 0
      ? history[history.length - 1].violations
      : [];

    const currentViolations = this.mapIssuesToViolations(validationResult.issues);
    const newViolations = this.findNewViolations(currentViolations, previousViolations);
    const resolvedViolations = this.findResolvedViolations(currentViolations, previousViolations);
    const persistentViolations = currentViolations.filter(
      v => !newViolations.some(nv => nv.ruleId === v.ruleId)
    );

    const driftDetected = newViolations.length > 0 || this.hasLevelDrift(declaredLevel, validationResult);
    const driftSeverity = this.calculateDriftSeverity(newViolations, persistentViolations, validationResult);
    const overallScore = this.calculateOverallScore(validationResult);

    const report: DriftReport = {
      projectId: this.getProjectId(options.projectPath),
      declaredLevel,
      detectedLevel: this.detectActualLevel(options.projectPath, resolvedCorePath),
      driftDetected,
      driftSeverity,
      newViolations,
      resolvedViolations,
      persistentViolations,
      overallScore,
      timestamp: new Date().toISOString(),
      historyPath: options.historyPath || path.join(options.projectPath, '.evolith', 'drift-history.json'),
    };

    // OPT-IN, no opt-out (ADR-0101). Con `!== false` cualquier llamador que no
    // lo pasara --incluida la ruta de evaluacion del Core-- escribia
    // `.evolith/drift-history.json` en el workspace, y el fallo se tragaba en
    // silencio. En un Core contenerizado de solo lectura eso significa que la
    // clasificacion new/persistent depende de estado que nunca llega a
    // guardarse: TODO se reclasifica como "nuevo" para siempre, sin senal.
    // El unico llamador de produccion que quiere historial es la CLI, que corre
    // en el workspace del usuario y ya lo pide de forma explicita.
    if (options.storeHistory === true) {
      await this.storeHistory(options.projectPath, report, history, options.historyPath);
    }

    if (driftDetected) {
      this.logger.warn('Architecture drift detected', JSON.stringify({
        newViolations: newViolations.length,
        persistentViolations: persistentViolations.length,
        resolvedViolations: resolvedViolations.length,
      }));
    } else {
      this.logger.info('No architecture drift detected');
    }

    return report;
  }

  async detectLevelDrift(projectPath: string, corePath?: string): Promise<{
    declared: string;
    detected: string;
    drifted: boolean;
  }> {
    const declaredLevel = await this.getDeclaredLevel(projectPath, corePath);
    const resolvedCorePath = corePath || this.findCorePath(projectPath);
    const detectedLevel = this.detectActualLevel(projectPath, resolvedCorePath);

    return {
      declared: declaredLevel,
      detected: detectedLevel,
      drifted: declaredLevel !== detectedLevel,
    };
  }

  async getDriftHistory(projectPath: string, historyPath?: string): Promise<DriftHistoryEntry[]> {
    return this.loadHistory(projectPath, historyPath);
  }

  async getDriftTrend(projectPath: string, historyPath?: string): Promise<{
    trend: 'improving' | 'stable' | 'degrading';
    entries: DriftHistoryEntry[];
  }> {
    const history = await this.loadHistory(projectPath, historyPath);

    if (history.length < 2) {
      return { trend: 'stable', entries: history };
    }

    const recent = history.slice(-5);
    const firstScore = recent[0].overallScore;
    const lastScore = recent[recent.length - 1].overallScore;

    let trend: 'improving' | 'stable' | 'degrading';
    if (lastScore > firstScore + 5) {
      trend = 'improving';
    } else if (lastScore < firstScore - 5) {
      trend = 'degrading';
    } else {
      trend = 'stable';
    }

    return { trend, entries: recent };
  }

  private async getDeclaredLevel(projectPath: string, corePath?: string): Promise<'F1' | 'F2' | 'F3'> {
    const resolvedCorePath = corePath || this.findCorePath(projectPath);
    const evolithYamlPath = path.join(projectPath, 'evolith.yaml');

    if (await this.fs.exists(evolithYamlPath)) {
      try {
        const content = await this.fs.readFile(evolithYamlPath);
        const config = JSON.parse(content) as { product?: { architecture?: string } };
        const arch = config.product?.architecture;
        if (arch === 'F1' || arch === 'F2' || arch === 'F3') {
          return arch;
        }
      } catch {
        // Fall through to detection
      }
    }

    return this.detectActualLevel(projectPath, resolvedCorePath) as 'F1' | 'F2' | 'F3';
  }

  private detectActualLevel(projectPath: string, corePath: string): string {
    const _srcPath = path.join(projectPath, 'src');
    const hasDockerfile = this.fs.existsSync(path.join(projectPath, 'Dockerfile'));
    const hasContracts = this.fs.existsSync(path.join(projectPath, 'contracts'));
    const hasEvents = this.fs.existsSync(path.join(projectPath, 'events')) ||
                      this.fs.existsSync(path.join(projectPath, 'src', 'events'));

    if (hasDockerfile && hasContracts && hasEvents) {
      return 'F3';
    }

    if (hasContracts && hasEvents) {
      return 'F2';
    }

    return 'F1';
  }

  private mapIssuesToViolations(issues: ValidationIssue[]): DriftViolation[] {
    return issues.map(issue => ({
      ruleId: issue.ruleId,
      severity: issue.severity,
      category: issue.category,
      title: issue.title,
      description: issue.description,
      blocking: issue.blocking,
      firstDetected: new Date().toISOString(),
      status: 'new' as const,
    }));
  }

  private findNewViolations(current: DriftViolation[], previous: DriftViolation[]): DriftViolation[] {
    const previousRuleIds = new Set(previous.map(v => v.ruleId));
    return current
      .filter(v => !previousRuleIds.has(v.ruleId))
      .map(v => ({ ...v, status: 'new' as const }));
  }

  private findResolvedViolations(current: DriftViolation[], previous: DriftViolation[]): DriftViolation[] {
    const currentRuleIds = new Set(current.map(v => v.ruleId));
    return previous
      .filter(v => !currentRuleIds.has(v.ruleId))
      .map(v => ({ ...v, status: 'resolved' as const }));
  }

  private hasLevelDrift(declaredLevel: string, validationResult: ArchitectureValidationResult): boolean {
    if (validationResult.status === 'failed') {
      const blockingIssues = validationResult.issues.filter(i => i.blocking);
      return blockingIssues.length > 0;
    }
    return false;
  }

  private calculateDriftSeverity(
    newViolations: DriftViolation[],
    persistentViolations: DriftViolation[],
    validationResult: ArchitectureValidationResult,
  ): 'critical' | 'high' | 'medium' | 'low' | 'none' {
    const blockingNew = newViolations.filter(v => v.blocking);
    const blockingPersistent = persistentViolations.filter(v => v.blocking);

    if (blockingNew.length > 0) {
      return 'critical';
    }

    if (blockingPersistent.length > 2) {
      return 'high';
    }

    if (newViolations.length > 0) {
      return 'medium';
    }

    if (persistentViolations.length > 0) {
      return 'low';
    }

    return 'none';
  }

  private calculateOverallScore(validationResult: ArchitectureValidationResult): number {
    if (validationResult.rulesChecked === 0) {
      return 100;
    }

    const blockingIssues = validationResult.issues.filter(i => i.blocking).length;
    const nonBlockingIssues = validationResult.issues.filter(i => !i.blocking).length;

    const blockingPenalty = blockingIssues * 15;
    const nonBlockingPenalty = nonBlockingIssues * 5;

    const score = Math.max(0, 100 - blockingPenalty - nonBlockingPenalty);
    return Math.min(100, score);
  }

  private async loadHistory(projectPath: string, historyPath?: string): Promise<DriftHistoryEntry[]> {
    const historyFile = historyPath || path.join(projectPath, '.evolith', 'drift-history.json');

    if (!await this.fs.exists(historyFile)) {
      return [];
    }

    try {
      const content = await this.fs.readFile(historyFile);
      return JSON.parse(content) as DriftHistoryEntry[];
    } catch {
      return [];
    }
  }

  private async storeHistory(
    projectPath: string,
    report: DriftReport,
    history: DriftHistoryEntry[],
    historyPath?: string,
  ): Promise<void> {
    const historyFile = historyPath || path.join(projectPath, '.evolith', 'drift-history.json');

    const entry: DriftHistoryEntry = {
      timestamp: report.timestamp,
      declaredLevel: report.declaredLevel,
      detectedLevel: report.detectedLevel,
      violationsCount: report.newViolations.length + report.persistentViolations.length,
      blockingViolationsCount: [...report.newViolations, ...report.persistentViolations].filter(v => v.blocking).length,
      overallScore: report.overallScore,
      violations: [...report.newViolations, ...report.persistentViolations],
    };

    history.push(entry);

    const maxHistoryEntries = 50;
    if (history.length > maxHistoryEntries) {
      history = history.slice(-maxHistoryEntries);
    }

    const historyDir = path.dirname(historyFile);

    // Best-effort persistence, mirroring loadHistory's existing tolerance.
    // Drift history is AUXILIARY telemetry — it never contributes to the verdict —
    // so a non-writable workspace must not fail the evaluation. Before this guard,
    // an unwritable path propagated (e.g. `ENOENT: mkdir '/app/corpus/rulesets/.evolith'`
    // in the containerised Core) and the whole `architecture` evaluation kind
    // returned HTTP 500, breaking the agent-runtime governed chain end-to-end.
    // It also kept a stateless Core (ADR-0101) from evaluating a read-only corpus.
    try {
      await this.fs.ensureDir(historyDir);
      await this.fs.writeJson(historyFile, history);
    } catch {
      // Swallow: the report is already complete and returned to the caller.
    }
  }

  private getProjectId(projectPath: string): string {
    const parts = projectPath.split(path.sep);
    return parts[parts.length - 1] || 'unknown';
  }

  /**
   * GT-705 — no name-shaped fallback, and content-qualified.
   *
   * This ended `return path.join(projectPath, '..', 'evolith')` — a sibling directory
   * named after the vendor's own monorepo. Measured on the published MCP server:
   * 50 tools announced, RULESET_NOT_FOUND on every corpus-dependent one, because
   * nobody looked where the corpus lives. The walk also qualified by EXISTENCE,
   * which is GT-566's defect: `rulesets/agents` shares the name and holds no rules.
   *
   * Returning the satellite itself when nothing is found is deliberate: the
   * repository then reports "no corpus under <a real path>" instead of naming a
   * directory that never existed.
   */
  private findCorePath(projectPath: string): string {
    return findCoreFromSatellite(projectPath, { existsSync: (p) => this.fs.existsSync(p) }, path.sep) ?? projectPath;
  }
}
