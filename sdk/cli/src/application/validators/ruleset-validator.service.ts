/* eslint-disable boundaries/element-types */
import { Injectable, Optional, Inject } from '@nestjs/common';
import * as path from 'path';
import { ILogger, IFileSystem, IConfigParser } from '../../domain/interfaces';
import { NodeFileSystemProvider } from '../../infrastructure/providers/node-filesystem.provider';
import { NestLoggerProvider } from '../../infrastructure/providers/logger.provider';
import { YamlConfigParserProvider } from '../../infrastructure/providers/config-parser.provider';
import { RuleEvaluationEngine } from './rule-evaluation-engine';
import { NativeEvaluator } from './evaluators/native-evaluator';
import { OpaEvaluator } from './evaluators/opa-evaluator';

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
  engineType?: 'native' | 'opa';
}

export const RULESET_VALIDATOR_OPTIONS = 'RULESET_VALIDATOR_OPTIONS';

@Injectable()
export class RulesetValidatorService {
  private readonly logger: ILogger;
  private readonly fs: IFileSystem;
  private readonly configParser: IConfigParser;
  private readonly engine: RuleEvaluationEngine;

  constructor(@Optional() @Inject(RULESET_VALIDATOR_OPTIONS) options?: RulesetValidatorOptions) {
    this.logger = options?.logger ?? new NestLoggerProvider().createLogger('RulesetValidatorService');
    this.fs = options?.fileSystem ?? new NodeFileSystemProvider().createFileSystem();
    this.configParser = options?.configParser ?? new YamlConfigParserProvider().createConfigParser('yaml');
    
    const strategy = options?.engineType === 'opa' 
      ? new OpaEvaluator(this.fs, this.logger) 
      : new NativeEvaluator(this.fs, this.logger);
      
    this.engine = new RuleEvaluationEngine({ 
      fileSystem: this.fs, 
      logger: this.logger,
      strategy 
    });
  }

  async validate(satellitePath: string, corePath?: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let rulesChecked = 0;

    const resolvedCorePath = corePath || this.findCorePath(satellitePath);
    const evolithYamlPath = path.join(satellitePath, 'evolith.yaml');

    let coreRefVersion: string | null = null;
    let coreRefPath: string | null = null;

    if (await this.fs.exists(evolithYamlPath)) {
      const evolithYaml = await this.loadEvolithYaml(evolithYamlPath);
      coreRefVersion = evolithYaml.coreRef?.version || null;
      coreRefPath = evolithYaml.coreRef?.path || null;
    } else {
      issues.push({
        ruleId: 'GOV-000',
        severity: 'MUST',
        category: 'governance',
        title: 'Missing evolith.yaml',
        description: 'Every satellite repository must have an evolith.yaml file at the root.',
        blocking: true,
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
      
      const ctx = { satellitePath, corePath: resolvedCorePath };
      // Manually map rules to NormalizedRule and evaluate through strategy
      for (const rule of rules) {
        const normalized: any = {
          ...rule,
          sourceFile: rulesetPath
        };
        const results = await this.engine['strategy'].evaluateAll([normalized], ctx);
        issues.push(...this.engine.toValidationIssues(results));
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
}

export interface ArchitectureValidationResult {
  status: 'passed' | 'failed' | 'warning';
  levels: string[];
  rulesChecked: number;
  issues: ValidationIssue[];
  timestamp: string;
}
