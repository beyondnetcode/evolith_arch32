/* eslint-disable boundaries/element-types */
import * as path from 'path';
import { IFileSystem, IConfigParser } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class GovernanceRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem, private configParser: IConfigParser) {
  }

  canHandle(rule: NormalizedRule): boolean {
    return ['INH-01', 'INH-06', 'GOV-01', 'GOV-02', 'INH-02', 'OCB-01', 'ACL-01'].includes(rule.id);
  }

  async evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    if (rule.id === 'INH-01') {
      const satelliteRulesets = path.join(ctx.satellitePath, 'rulesets');
      if (ctx.satellitePath !== ctx.corePath && await this.fs.exists(satelliteRulesets)) {
        return { rule, result: 'failed', message: 'Satellite contains a rulesets/ directory — inheriting from Core only is required' };
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'INH-06') {
      if (ctx.satellitePath !== ctx.corePath) {
        const decisionsFile = path.join(ctx.satellitePath, 'DECISIONS.md');
        if (!await this.fs.exists(decisionsFile)) {
          return { rule, result: 'failed', message: 'Satellite missing DECISIONS.md in root directory' };
        }
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'GOV-01') {
      const evolithYamlPath = path.join(ctx.satellitePath, 'evolith.yaml');
      if (!await this.fs.exists(evolithYamlPath)) {
        return { rule, result: 'failed', message: 'Satellite repository must have evolith.yaml at root' };
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'GOV-02') {
      const evolithYamlPath = path.join(ctx.satellitePath, 'evolith.yaml');
      if (await this.fs.exists(evolithYamlPath)) {
        const content = await this.fs.readFile(evolithYamlPath);
        const yaml = this.configParser.parse(content) as Record<string, unknown>;
        if (!(yaml?.governance as Record<string, unknown>)?.version) {
          return { rule, result: 'failed', message: 'evolith.yaml should specify governance.version for change tracking' };
        }
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'INH-02') {
      const evolithYamlPath = path.join(ctx.satellitePath, 'evolith.yaml');
      if (await this.fs.exists(evolithYamlPath)) {
        const content = await this.fs.readFile(evolithYamlPath);
        const yaml = this.configParser.parse(content) as Record<string, unknown>;
        const version = (yaml?.coreRef as Record<string, unknown>)?.version as string | undefined;
        if (!version) {
          return { rule, result: 'failed', message: 'evolith.yaml must specify coreRef.version (semver). Unpinned references are prohibited.' };
        }
        if (!/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version)) {
          return { rule, result: 'failed', message: `coreRef.version "${version}" is not valid semver` };
        }
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'OCB-01') {
      const packageJsonPath = path.join(ctx.satellitePath, 'package.json');
      if (await this.fs.exists(packageJsonPath)) {
        const packageJson = await this.fs.readJson(packageJsonPath) as { license?: string };
        if (packageJson.license?.startsWith('Enterprise') || packageJson.license === 'UNLICENSED') {
          return { rule, result: 'failed', message: `Core artifacts cannot reference commercial or enterprise-only licenses. Found: ${packageJson.license}` };
        }
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'ACL-01') {
      const satelliteAclPath = path.join(ctx.satellitePath, 'acl');
      if (await this.fs.exists(satelliteAclPath)) {
        const aclDir = await this.fs.readdirNames(satelliteAclPath);
        if (aclDir.length === 0) {
          return { rule, result: 'failed', message: 'ACL directory is empty. External data ingestion will fail.' };
        }
      }
      return { rule, result: 'passed' };
    }

    return { rule, result: 'skipped', message: 'Unhandled governance rule' };
  }
}
