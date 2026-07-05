import { IFileSystem } from '../interfaces';
import { evaluateStandardCheck } from './standard-check-evaluator';

export type StandardCategory = 'architecture' | 'governance' | 'operations' | 'infrastructure';

export interface Standard {
  id: string;
  name: string;
  version: string;
  category: StandardCategory;
  description: string;
  rules: StandardRule[];
  metadata?: Record<string, unknown>;
}

export interface StandardRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  check?: string;
  remediation?: string;
}

export class StandardsService {
  private readonly fs: IFileSystem;
  private readonly standardsDir: string;

  constructor(fs: IFileSystem, basePath: string, customDir?: string) {
    this.fs = fs;
    this.standardsDir = customDir || `${basePath}/reference/standards`;
  }

  async initialize(): Promise<void> {
    await this.fs.ensureDir(this.standardsDir);
    await this.fs.ensureDir(`${this.standardsDir}/rulesets`);
    await this.fs.ensureDir(`${this.standardsDir}/templates`);

    const indexExists = await this.fs.exists(`${this.standardsDir}/standards-index.json`);
    if (!indexExists) {
      await this.fs.writeJson(`${this.standardsDir}/standards-index.json`, {
        standards: [],
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  async register(standard: Standard): Promise<void> {
    await this.fs.ensureDir(this.standardsDir);

    const standardFile = `${this.standardsDir}/${standard.category}/${standard.id}.json`;
    await this.fs.ensureDir(`${this.standardsDir}/${standard.category}`);
    await this.fs.writeJson(standardFile, standard);

    await this.updateIndex(standard);
  }

  async list(category?: StandardCategory): Promise<Standard[]> {
    const indexPath = `${this.standardsDir}/standards-index.json`;
    const exists = await this.fs.exists(indexPath);

    if (!exists) return [];

    const index = await this.fs.readJson<{ standards: Standard[] }>(indexPath);
    const standards = index.standards || [];

    if (category) {
      return standards.filter(s => s.category === category);
    }

    return standards;
  }

  async get(id: string): Promise<Standard | undefined> {
    const standards = await this.list();
    return standards.find(s => s.id === id);
  }

  async validate(code: string): Promise<ValidationResult> {
    const standards = await this.list();
    const results: RuleResult[] = [];

    for (const standard of standards) {
      for (const rule of standard.rules) {
        if (rule.check) {
          const passed = this.evaluateRule(rule.check, code);
          results.push({
            standardId: standard.id,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            passed,
            message: passed ? 'OK' : rule.description,
          });
        }
      }
    }

    return {
      totalRules: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
    };
  }

  async export(id: string, format: 'json' | 'markdown'): Promise<string> {
    const standard = await this.get(id);
    if (!standard) throw new Error(`Standard ${id} not found`);

    if (format === 'json') {
      return JSON.stringify(standard, null, 2);
    }

    return this.renderMarkdown(standard);
  }

  private async updateIndex(standard: Standard): Promise<void> {
    const indexPath = `${this.standardsDir}/standards-index.json`;
    let index = { standards: [] as Standard[], lastUpdated: '' };

    if (await this.fs.exists(indexPath)) {
      index = await this.fs.readJson(indexPath);
    }

    const existingIdx = index.standards.findIndex(s => s.id === standard.id);
    if (existingIdx >= 0) {
      index.standards[existingIdx] = standard;
    } else {
      index.standards.push(standard);
    }

    index.lastUpdated = new Date().toISOString();
    await this.fs.writeJson(indexPath, index);
  }

  private evaluateRule(check: string, code: string): boolean {
    // GT-350: no `new Function`/eval — restricted, audited predicate evaluator.
    return evaluateStandardCheck(check, code);
  }

  private renderMarkdown(standard: Standard): string {
    return `# Standard: ${standard.name}

**ID:** ${standard.id}  
**Version:** ${standard.version}  
**Category:** ${standard.category}

## Description

${standard.description}

## Rules

| ID | Name | Severity | Description |
|----|------|----------|-------------|
${standard.rules.map(r =>
  `| ${r.id} | ${r.name} | ${r.severity} | ${r.description} |`
).join('\n')}

${standard.rules.filter(r => r.remediation).length > 0 ? `## Remediation

${standard.rules.filter(r => r.remediation).map(r =>
  `### ${r.id}: ${r.name}

${r.remediation}`
).join('\n\n')}` : ''}
`;
  }
}

export interface ValidationResult {
  totalRules: number;
  passed: number;
  failed: number;
  results: RuleResult[];
}

export interface RuleResult {
  standardId: string;
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  passed: boolean;
  message: string;
}