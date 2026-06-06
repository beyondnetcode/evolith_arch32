import * as path from 'path';
import { getContainer, ILogger, IFileSystem, IConfigParser } from '../abstractions';

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

  constructor(options?: RulesetValidatorOptions) {
    const container = getContainer();

    this.logger = options?.logger || container.createLogger('RulesetValidatorService');
    this.fs = options?.fileSystem || container.createFileSystem();
    this.configParser = options?.configParser || container.createConfigParser('yaml');
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
    };

    const relativePath = mapping[rulesetId.toLowerCase()];
    if (!relativePath) {
      issues.push({
        ruleId: 'UNKNOWN',
        severity: 'SHOULD',
        category: 'governance',
        title: `Unknown ruleset ID: ${rulesetId}`,
        description: 'Available ruleset IDs: adr-0002, adr-0005, adr-0010, adr-0018, adr-0032, adr-0040, adr-0050, acl, open-core, inheritance',
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
}