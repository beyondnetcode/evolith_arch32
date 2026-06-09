import * as path from 'path';
import { getContainer, ILogger, IFileSystem, IConfigParser } from '../abstractions';
import { RuleEvaluationEngine } from './rule-evaluation-engine';

export interface ValidationResult {
  status: 'passed' | 'failed' | 'warning';
  rulesChecked: number;
  issues: ValidationIssue[];
  coreRef: {
    version: string | null;
    path: string | null;
  };
  timestamp: string;
}

export interface ValidationIssue {
  ruleId: string;
  severity: 'MUST' | 'SHOULD' | 'COULD';
  category: string;
  title: string;
  description: string;
  file?: string;
  expected?: string;
  actual?: string;
  blocking: boolean;
}

export interface EvolithYaml {
  coreRef?: {
    version?: string;
    path?: string;
  };
  governance?: {
    version?: string;
    adrRegistry?: Array<{ id: string; status: string }>;
  };
  product?: {
    name?: string;
    type?: string;
  };
}

export interface RulesetValidatorOptions {
  fileSystem?: IFileSystem;
  configParser?: IConfigParser;
  logger?: ILogger;
}

export class RulesetValidatorService {
  private readonly logger: ILogger;
  private readonly fs: IFileSystem;
  private readonly configParser: IConfigParser;
  private readonly engine: RuleEvaluationEngine;

  constructor(options?: RulesetValidatorOptions) {
    const container = getContainer();

    this.logger = options?.logger ?? container.createLogger('RulesetValidatorService');
    this.fs = options?.fileSystem ?? container.createFileSystem();
    this.configParser = options?.configParser ?? container.createConfigParser('yaml');
    this.engine = new RuleEvaluationEngine({ fileSystem: this.fs, logger: this.logger });
  }

  async validate(satellitePath: string, corePath?: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let rulesChecked = 0;

    const resolvedCorePath = corePath || this.findCorePath(satellitePath);
    const evolithYamlPath = path.join(satellitePath, 'evolith.yaml');

    let coreRefVersion: string | null = null;
    let coreRefPath: string | null = null;

    if (!await this.fs.exists(evolithYamlPath)) {
      issues.push({
        ruleId: 'GOV-01',
        severity: 'MUST',
        category: 'governance',
        title: 'evolith.yaml missing',
        description: 'Satellite repository must have evolith.yaml at root',
        file: evolithYamlPath,
        blocking: true,
      });
      return {
        status: 'failed',
        rulesChecked: 0,
        issues,
        coreRef: { version: null, path: null },
        timestamp: new Date().toISOString(),
      };
    }

    const evolithYaml = await this.loadEvolithYaml(evolithYamlPath);
    coreRefVersion = evolithYaml.coreRef?.version || null;
    coreRefPath = evolithYaml.coreRef?.path || null;

    if (!coreRefVersion) {
      issues.push({
        ruleId: 'INH-02',
        severity: 'MUST',
        category: 'inheritance',
        title: 'Core version not pinned',
        description: 'evolith.yaml must specify coreRef.version (semver). Unpinned references are prohibited.',
        file: 'evolith.yaml',
        expected: 'coreRef.version: "1.0.0"',
        actual: 'coreRef.version not defined',
        blocking: true,
      });
    }

    const inheritanceRules = await this.loadRuleset(
      resolvedCorePath,
      'governance/inheritance.rules.json',
    );
    if (inheritanceRules) {
      rulesChecked += inheritanceRules.length;
      for (const rule of inheritanceRules) {
        if (rule.id === 'INH-02' && coreRefVersion && !this.isValidSemver(coreRefVersion)) {
          issues.push({
            ruleId: 'INH-02',
            severity: 'MUST',
            category: 'inheritance',
            title: 'Invalid semver format',
            description: `coreRef.version "${coreRefVersion}" is not valid semver`,
            file: 'evolith.yaml',
            expected: 'x.y.z format',
            actual: coreRefVersion,
            blocking: true,
          });
        }
      }
    }

    const aclRules = await this.loadRuleset(
      resolvedCorePath,
      'acl/anti-corruption-layer.rules.json',
    );
    const satelliteAclPath = path.join(satellitePath, 'acl');
    if (aclRules && await this.fs.exists(satelliteAclPath)) {
      rulesChecked += aclRules.length;
      const aclDir = await this.fs.readdirNames(satelliteAclPath);
      if (aclDir.length === 0) {
        issues.push({
          ruleId: 'ACL-01',
          severity: 'MUST',
          category: 'anti-corruption',
          title: 'ACL directory is empty',
          description: 'ACL implementation exists but contains no files. External data ingestion will fail.',
          file: 'acl/',
          blocking: true,
        });
      }
    }

    const openCoreRules = await this.loadRuleset(
      resolvedCorePath,
      'governance/open-core-boundary.rules.json',
    );
    if (openCoreRules) {
      rulesChecked += openCoreRules.length;
      const packageJsonPath = path.join(satellitePath, 'package.json');
      if (await this.fs.exists(packageJsonPath)) {
        const packageJson = await this.fs.readJson(packageJsonPath) as { license?: string };
        if (packageJson.license?.startsWith('Enterprise') || packageJson.license === 'UNLICENSED') {
          issues.push({
            ruleId: 'OCB-01',
            severity: 'MUST',
            category: 'open-core',
            title: 'Core contains enterprise-only license',
            description: 'Core artifacts cannot reference commercial or enterprise-only licenses.',
            file: 'package.json',
            expected: 'MIT, Apache-2.0, or open license',
            actual: packageJson.license,
            blocking: true,
          });
        }
      }
    }

    const governanceVersion = evolithYaml.governance?.version;
    if (!governanceVersion) {
      issues.push({
        ruleId: 'GOV-02',
        severity: 'SHOULD',
        category: 'governance',
        title: 'Governance version not declared',
        description: 'evolith.yaml should specify governance.version for change tracking',
        file: 'evolith.yaml',
        blocking: false,
      });
    }

    // Run declarative rule evaluation engine over all discovered rulesets
    try {
      const engineResults = await this.engine.discoverAndEvaluate(satellitePath, resolvedCorePath);
      const evaluated = engineResults.filter(r => r.result !== 'skipped');
      rulesChecked += evaluated.length;
      issues.push(...this.engine.toValidationIssues(engineResults));
    } catch (err: unknown) {
      this.logger.warn(`Rule engine error: ${err instanceof Error ? err.message : String(err)}`);
    }

    const status = issues.some(i => i.blocking) ? 'failed' : issues.length > 0 ? 'warning' : 'passed';

    return {
      status,
      rulesChecked,
      issues,
      coreRef: { version: coreRefVersion, path: coreRefPath },
      timestamp: new Date().toISOString(),
    };
  }

  private async loadEvolithYaml(filePath: string): Promise<EvolithYaml> {
    const content = await this.fs.readFile(filePath);
    return this.configParser.parse(content) as EvolithYaml;
  }

  private async loadRuleset(
    corePath: string,
    relativePath: string,
  ): Promise<Array<{ id: string; severity: string; title: string; description: string; blocking: boolean }> | null> {
    const fullPath = path.join(corePath, 'rulesets', relativePath);
    if (!await this.fs.exists(fullPath)) {
      return null;
    }
    try {
      const content = await this.fs.readFile(fullPath);
      const parsed = JSON.parse(content);
      const rules: Array<{ id: string; severity: string; title: string; description: string; blocking: boolean }> = [];

      if (parsed.principles) {
        for (const p of parsed.principles) {
          rules.push({
            id: p.id,
            severity: p.severity,
            title: p.principle,
            description: p.statement,
            blocking: p.blocking,
          });
        }
      }
      if (parsed.rules) {
        for (const r of parsed.rules) {
          rules.push({
            id: r.id,
            severity: r.severity,
            title: r.title,
            description: r.description,
            blocking: r.blocking,
          });
        }
      }
      return rules;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to load ruleset ${relativePath}: ${message}`);
      return null;
    }
  }

  private findCorePath(satellitePath: string): string {
    const parts = satellitePath.split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      const candidate = path.join(parts.join(path.sep), 'rulesets');
      if (this.fs.existsSync(candidate)) {
        return parts.join(path.sep);
      }
    }
    return path.join(satellitePath, '..', 'evolith');
  }

  private isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version);
  }

  async loadRulesetById(corePath: string, rulesetId: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const mapping: Record<string, string> = {
      'adr-0002': 'adr/adr-0002-hexagonal-architecture.rules.json',
      'adr-0005': 'adr/adr-0005-cicd-quality-gates.rules.json',
      'adr-0010': 'adr/adr-0010-multi-tenancy.rules.json',
      'adr-0018': 'adr/adr-0018-testing-pyramid.rules.json',
      'adr-0032': 'adr/adr-0032-protocol-selection.rules.json',
      'adr-0040': 'adr/adr-0040-multi-runtime.rules.json',
      'adr-0050': 'adr/adr-0050-gitflow-branching.rules.json',
      'acl': 'acl/anti-corruption-layer.rules.json',
      'open-core': 'governance/open-core-boundary.rules.json',
      'inheritance': 'governance/inheritance.rules.json',
      'cli-release': 'cli/release-readiness.rules.json',
      'cli-parity': 'cli/core-parity.rules.json',
      'evidence': 'evidence/evidence-manifest.rules.json',
      'mcp': 'mcp/protocol-compliance.rules.json',
      'observability': 'observability/telemetry-evidence.rules.json',
    };

    const relativePath = mapping[rulesetId.toLowerCase()];
    if (!relativePath) {
      issues.push({
        ruleId: 'UNKNOWN',
        severity: 'SHOULD',
        category: 'governance',
        title: `Unknown ruleset ID: ${rulesetId}`,
        description: 'Available ruleset IDs: adr-0002, adr-0005, adr-0010, adr-0018, adr-0032, adr-0040, adr-0050, acl, open-core, inheritance, cli-release, cli-parity, evidence, mcp, observability',
        blocking: false,
      });
      return issues;
    }

    const rules = await this.loadRuleset(corePath, relativePath);
    if (!rules || rules.length === 0) {
      issues.push({
        ruleId: 'MISSING',
        severity: 'MUST',
        category: 'governance',
        title: `Ruleset not found: ${rulesetId}`,
        description: `Could not load ruleset at ${relativePath}`,
        blocking: true,
      });
    }
    return issues;
  }

  async validateArchitecture(satellitePath: string, corePath?: string, level?: 'F1' | 'F2' | 'F3' | 'ALL'): Promise<ArchitectureValidationResult> {
    const resolvedCorePath = corePath || this.findCorePath(satellitePath);
    const issues: ValidationIssue[] = [];
    let rulesChecked = 0;

    const levels = level === 'ALL' || !level
      ? ['F1', 'F2', 'F3']
      : [level];

    for (const lvl of levels) {
      const rulesetPath = path.join(resolvedCorePath, 'rulesets', 'architecture', `f${lvl.toLowerCase()}-${lvl === 'F1' ? 'modular-monolith' : lvl === 'F2' ? 'distributed-modules' : 'microservices'}.rules.json`);

      if (!await this.fs.exists(rulesetPath)) {
        issues.push({
          ruleId: `ARCH-${lvl}-MISSING`,
          severity: 'SHOULD',
          category: 'architecture',
          title: `${lvl} ruleset not found`,
          description: `Could not find ${lvl} architecture rules at ${rulesetPath}`,
          blocking: false,
        });
        continue;
      }

      const content = await this.fs.readFile(rulesetPath);
      const ruleset = JSON.parse(content);
      const rules = ruleset.rules || [];

      rulesChecked += rules.length;

      for (const rule of rules) {
        const validationResult = await this.validateArchitectureRule(satellitePath, rule, lvl);
        if (validationResult) {
          issues.push(...validationResult);
        }
      }
    }

    const blockingCount = issues.filter(i => i.blocking).length;

    return {
      status: blockingCount > 0 ? 'failed' : 'passed',
      levels: levels as string[],
      rulesChecked,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  private async validateArchitectureRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean; validationQuery?: string }, level: string): Promise<ValidationIssue[] | null> {
    const issues: ValidationIssue[] = [];

    switch (rule.category) {
      case 'topology':
        await this.validateTopologyRule(satellitePath, rule, issues);
        break;
      case 'bounded-contexts':
        await this.validateBoundedContextsRule(satellitePath, rule, issues);
        break;
      case 'hexagonal-architecture':
        await this.validateHexagonalRule(satellitePath, rule, issues);
        break;
      case 'communication':
        await this.validateCommunicationRule(satellitePath, rule, issues);
        break;
      case 'persistence':
        await this.validatePersistenceRule(satellitePath, rule, issues);
        break;
      case 'async-boundaries':
        await this.validateAsyncRule(satellitePath, rule, issues);
        break;
      case 'extraction-readiness':
        await this.validateExtractionReadinessRule(satellitePath, rule, issues);
        break;
      case 'observability':
        await this.validateObservabilityRule(satellitePath, rule, issues);
        break;
      case 'module-autonomy':
        await this.validateModuleAutonomyRule(satellitePath, rule, issues);
        break;
      case 'contract-stability':
        await this.validateContractStabilityRule(satellitePath, rule, issues);
        break;
      case 'data-ownership':
        this.validateDataOwnershipRule(satellitePath, rule, issues);
        break;
      case 'async-communication':
        await this.validateAsyncCommunicationRule(satellitePath, rule, issues);
        break;
      case 'distributed-tracing':
        await this.validateDistributedTracingRule(satellitePath, rule, issues);
        break;
      case 'containerization':
        await this.validateContainerizationRule(satellitePath, rule, issues);
        break;
      case 'service-boundaries':
        await this.validateServiceBoundariesRule(satellitePath, rule, issues);
        break;
      default:
        break;
    }

    return issues.length > 0 ? issues : null;
  }

  private async validateTopologyRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    const packageJsonPath = path.join(satellitePath, 'package.json');

    if (rule.id === 'F1-R01') {
      if (await this.fs.exists(packageJsonPath)) {
        const pkg = await this.fs.readJson(packageJsonPath) as { workspaces?: unknown };
        if (pkg.workspaces) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
            category: rule.category,
            title: rule.title,
            description: `${rule.description} - Monorepo workspace detected`,
            blocking: rule.blocking,
          });
        }
      }
    }
  }

  private async validateBoundedContextsRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    const srcPath = path.join(satellitePath, 'src');
    if (await this.fs.exists(srcPath)) {
      const entries = await this.fs.readdirNames(srcPath);
      const moduleCount = entries.filter(e => !e.startsWith('.')).length;

      if (rule.id === 'F1-R02') {
        if (moduleCount < 2) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
            category: rule.category,
            title: rule.title,
            description: `${rule.description} - Found only ${moduleCount} module(s) in src/`,
            blocking: rule.blocking,
          });
        }
      }
    }
  }

  private async validateHexagonalRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    if (rule.id === 'F1-R03') {
      const srcPath = path.join(satellitePath, 'src');
      const hasPorts = await this.fs.exists(path.join(srcPath, 'ports')) ||
                       await this.fs.exists(path.join(srcPath, 'Ports')) ||
                       await this.fs.exists(path.join(srcPath, 'application/ports'));

      if (!hasPorts) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
          category: rule.category,
          title: rule.title,
          description: `${rule.description} - No ports directory found (expected: src/ports or src/application/ports)`,
          blocking: rule.blocking,
        });
      }
    }
  }

  private async validateCommunicationRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    if (rule.id === 'F1-R04' || rule.id === 'F2-R03') {
      const contractsPath = path.join(satellitePath, 'contracts');
      const hasContracts = await this.fs.exists(contractsPath);
      if (!hasContracts) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
          category: rule.category,
          title: rule.title,
          description: `${rule.description} - No contracts/ directory found for inter-module contracts`,
          blocking: rule.blocking,
        });
      }
    }
  }

  private async validatePersistenceRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    if (rule.id === 'F1-R05') {
      const aclPath = path.join(satellitePath, 'acl');
      if (!await this.fs.exists(aclPath)) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
          category: rule.category,
          title: rule.title,
          description: `${rule.description} - No acl/ directory found (should contain one subdirectory per bounded context)`,
          blocking: rule.blocking,
        });
      } else {
        const entries = await this.fs.readdirNames(aclPath);
        if (entries.length < 2) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
            category: rule.category,
            title: rule.title,
            description: `${rule.description} - Found ${entries.length} bounded context(s) in acl/ (expected multiple)`,
            blocking: rule.blocking,
          });
        }
      }
    }
  }

  private async validateAsyncRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    if (rule.id === 'F1-R06') {
      const eventsPath = path.join(satellitePath, 'events') ||
                         path.join(satellitePath, 'src', 'events') ||
                         path.join(satellitePath, 'src', 'domain', 'events');
      const hasEvents = await this.fs.exists(eventsPath);
      if (!hasEvents) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
          category: rule.category,
          title: rule.title,
          description: `${rule.description} - No events directory found`,
          blocking: rule.blocking,
        });
      }
    }
  }

  private async validateExtractionReadinessRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    const extractionReadinessPath = path.join(satellitePath, 'docs', 'extraction-readiness.md');
    const hasExtractionReadiness = await this.fs.exists(extractionReadinessPath);
    if (!hasExtractionReadiness) {
      issues.push({
        ruleId: rule.id,
        severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
        category: rule.category,
        title: rule.title,
        description: `${rule.description} - No extraction-readiness.md found in docs/`,
        blocking: rule.blocking,
      });
    }
  }

  private async validateObservabilityRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    const hasPkgJson = await this.fs.exists(path.join(satellitePath, 'package.json'));
    if (hasPkgJson) {
      const otelConfigPath = path.join(satellitePath, 'otel.config.js') ||
                            path.join(satellitePath, 'opentelemetry.config.js') ||
                            path.join(satellitePath, 'src', 'instrumentation.ts');
      let hasOtel = false;
      for (const p of [otelConfigPath]) {
        if (await this.fs.exists(p)) {
          hasOtel = true;
          break;
        }
      }
      if (!hasOtel) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
          category: rule.category,
          title: rule.title,
          description: `${rule.description} - No OpenTelemetry instrumentation found`,
          blocking: rule.blocking,
        });
      }
    }
  }

  private async validateModuleAutonomyRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    if (rule.id === 'F2-R01') {
      const srcPath = path.join(satellitePath, 'src');
      if (await this.fs.exists(srcPath)) {
        const entries = await this.fs.readdirNames(srcPath);
        let hasIndependentModules = false;
        for (const entry of entries) {
          if (await this.fs.exists(path.join(srcPath, entry, 'package.json'))) {
            hasIndependentModules = true;
            break;
          }
        }
        if (!hasIndependentModules && entries.length > 1) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
            category: rule.category,
            title: rule.title,
            description: `${rule.description} - No independent module package.json files found`,
            blocking: rule.blocking,
          });
        }
      }
    }
  }

  private async validateContractStabilityRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    if (rule.id === 'F2-R02') {
      const contractsPath = path.join(satellitePath, 'contracts');
      const hasContracts = await this.fs.exists(contractsPath);
      if (!hasContracts) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
          category: rule.category,
          title: rule.title,
          description: `${rule.description} - No contracts directory found`,
          blocking: rule.blocking,
        });
      } else {
        const contractFiles = (await this.fs.readdirNames(contractsPath)).filter(f =>
          f.endsWith('.proto') || f.endsWith('.avsc') || f.endsWith('.json')
        );
        if (contractFiles.length === 0) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
            category: rule.category,
            title: rule.title,
            description: `${rule.description} - No contract definition files (.proto, .avsc, .json schema) found`,
            blocking: rule.blocking,
          });
        }
      }
    }
  }

  private validateDataOwnershipRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    if (rule.id === 'F2-R03') {
      const aclPath = path.join(satellitePath, 'acl');
      if (!this.fs.existsSync(aclPath)) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
          category: rule.category,
          title: rule.title,
          description: `${rule.description} - No acl directory for data ownership enforcement`,
          blocking: rule.blocking,
        });
      }
    }
  }

  private async validateAsyncCommunicationRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    if (rule.id === 'F2-R04') {
      const eventsPath = path.join(satellitePath, 'events') || path.join(satellitePath, 'src', 'events');
      const hasEvents = await this.fs.exists(eventsPath);
      if (hasEvents) {
        const eventFiles = (await this.fs.readdirNames(eventsPath)).filter(f => f.endsWith('.json') || f.endsWith('.schema.json'));
        if (eventFiles.length === 0) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
            category: rule.category,
            title: rule.title,
            description: `${rule.description} - No schema-validated event files found`,
            blocking: rule.blocking,
          });
        }
      }
    }
  }

  private async validateDistributedTracingRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    const tracerSetupFiles = [
      path.join(satellitePath, 'src', 'tracing.ts'),
      path.join(satellitePath, 'src', 'instrumentation.ts'),
      path.join(satellitePath, 'opentelemetry.config.js'),
    ];

    const existsResults = await Promise.all(tracerSetupFiles.map(f => this.fs.exists(f)));
    const hasTracerSetup = existsResults.some(Boolean);
    if (!hasTracerSetup) {
      issues.push({
        ruleId: rule.id,
        severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
        category: rule.category,
        title: rule.title,
        description: `${rule.description} - No distributed tracing setup found`,
        blocking: rule.blocking,
      });
    }
  }

  private async validateContainerizationRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    const dockerfilePath = path.join(satellitePath, 'Dockerfile');
    const dockerfileExists = await this.fs.exists(dockerfilePath);

    if (rule.id === 'F3-R01' && !dockerfileExists) {
      issues.push({
        ruleId: rule.id,
        severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
        category: rule.category,
        title: rule.title,
        description: `${rule.description} - No Dockerfile found at repository root`,
        blocking: rule.blocking,
      });
    }
  }

  private async validateServiceBoundariesRule(satellitePath: string, rule: { id: string; severity: string; category: string; title: string; description: string; blocking: boolean }, issues: ValidationIssue[]) {
    const srcPath = path.join(satellitePath, 'src');
    if (await this.fs.exists(srcPath)) {
      const entries = await this.fs.readdirNames(srcPath);
      const dirEntries: string[] = [];

      for (const entry of entries) {
        const entryPath = path.join(srcPath, entry);
        const stat = await this.fs.stat(entryPath);
        if (stat.isDirectory && stat.isDirectory()) {
          dirEntries.push(entry);
        }
      }

      if (rule.id === 'F3-R02' && dirEntries.length < 2) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity as 'MUST' | 'SHOULD' | 'COULD',
          category: rule.category,
          title: rule.title,
          description: `${rule.description} - Only ${dirEntries.length} service(s) found (expected multiple independent services)`,
          blocking: rule.blocking,
        });
      }
    }
  }
}

export interface ArchitectureValidationResult {
  status: 'passed' | 'failed' | 'warning';
  levels: string[];
  rulesChecked: number;
  issues: ValidationIssue[];
  timestamp: string;
}
